import { randomBytes, randomUUID } from "node:crypto";
import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { ILogger } from "../../domain/ports/logger.port";
import { NoopLogger } from "../../domain/ports/logger.port";
import type { LoginDto } from "../dtos/auth.dtos";
import { AccountLockedError, InvalidCredentialsError } from "../../domain/errors/auth-errors";

export interface LoginSuccessResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  /** Single-use token to exchange (with a TOTP code) at POST /auth/2fa/complete */
  preAuthToken: string;
  /** Seconds until the preAuthToken expires */
  expiresIn: number;
}

export type LoginResult = LoginSuccessResponse | TwoFactorRequiredResponse;

export interface LoginUseCaseOptions {
  maxFailedAttempts?: number;
  lockoutDurationMs?: number;
  refreshTokenTtlMs?: number;
  preAuthTokenTtlMs?: number;
  logger?: ILogger;
}

interface FailedAttempts {
  count: number;
  updatedAt: number;
}

export class LoginUseCase {
  private readonly logger: ILogger;
  private readonly maxFailedAttempts: number;
  private readonly lockoutDurationMs: number;
  private readonly refreshTokenTtlMs: number;
  private readonly preAuthTokenTtlMs: number;

  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    options: LoginUseCaseOptions = {},
  ) {
    this.maxFailedAttempts = options.maxFailedAttempts ?? 5;
    this.lockoutDurationMs = options.lockoutDurationMs ?? 15 * 60 * 1000;
    this.refreshTokenTtlMs = options.refreshTokenTtlMs ?? 7 * 24 * 60 * 60 * 1000;
    this.preAuthTokenTtlMs = options.preAuthTokenTtlMs ?? 5 * 60 * 1000;
    this.logger = options.logger ?? new NoopLogger();
  }

  async execute(dto: LoginDto): Promise<LoginResult> {
    // Normalized so "User@x.com" and "user@x.com" share the same counters
    // (Keycloak resolves emails case-insensitively).
    const email = dto.email.trim().toLowerCase();
    const failedKey = `login_failed:${email}`;
    const lockKey = `login_locked:${email}`;

    const lockedUntilStr = await this.tokenStore.getUserData("system", lockKey);
    if (lockedUntilStr) {
      const lockedUntil = new Date(lockedUntilStr).getTime();
      if (Date.now() < lockedUntil) {
        this.logger.warn("Login blocked: account temporarily locked");
        throw new AccountLockedError("Account is temporarily locked due to too many failed attempts");
      }
      await this.tokenStore.deleteUserData("system", lockKey);
      await this.tokenStore.deleteUserData("system", failedKey);
    }

    let result: Awaited<ReturnType<IAuthProvider["authenticate"]>>;

    try {
      result = await this.authProvider.authenticate({
        email,
        password: dto.password,
      });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        await this.recordFailedAttempt(failedKey, lockKey);
      }
      throw err;
    }

    await this.tokenStore.deleteUserData("system", failedKey);
    await this.tokenStore.deleteUserData("system", lockKey);

    // Users with TOTP configured must complete the second factor before
    // any tokens are issued.
    const totpSecret = await this.tokenStore.getUserData(result.user.id, "totpSecret");
    if (totpSecret) {
      const preAuthToken = randomBytes(32).toString("hex");
      await this.tokenStore.save({
        id: randomUUID(),
        userId: result.user.id,
        type: "PRE_AUTH_2FA",
        token: preAuthToken,
        expiresAt: new Date(Date.now() + this.preAuthTokenTtlMs),
        createdAt: new Date(),
      });
      this.logger.log(`Login pending 2FA for user ${result.user.id}`);
      return {
        twoFactorRequired: true,
        preAuthToken,
        expiresIn: Math.floor(this.preAuthTokenTtlMs / 1000),
      };
    }

    await this.tokenStore.save({
      id: randomUUID(),
      userId: result.user.id,
      type: "REFRESH_TOKEN",
      token: result.refreshToken,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      createdAt: new Date(),
    });

    this.logger.log(`User logged in: ${result.user.id}`);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
      },
    };
  }

  private async recordFailedAttempt(failedKey: string, lockKey: string): Promise<void> {
    const attempts = (await this.readFailedAttempts(failedKey)) + 1;
    await this.tokenStore.saveUserData(
      "system",
      failedKey,
      JSON.stringify({ count: attempts, updatedAt: Date.now() } satisfies FailedAttempts),
    );
    this.logger.warn(`Failed login attempt ${attempts}/${this.maxFailedAttempts}`);

    if (attempts >= this.maxFailedAttempts) {
      const lockedUntil = new Date(Date.now() + this.lockoutDurationMs).toISOString();
      await this.tokenStore.saveUserData("system", lockKey, lockedUntil);
      this.logger.warn(`Account locked until ${lockedUntil}`);
    }
  }

  private async readFailedAttempts(failedKey: string): Promise<number> {
    const raw = await this.tokenStore.getUserData("system", failedKey);
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw) as FailedAttempts;
      // Stale counters expire after the lockout window so they don't
      // accumulate forever in the store.
      if (Date.now() - parsed.updatedAt > this.lockoutDurationMs) return 0;
      return parsed.count;
    } catch {
      // Legacy plain-number format
      const legacy = Number(raw);
      return Number.isFinite(legacy) ? legacy : 0;
    }
  }
}
