import { randomUUID } from "node:crypto";
import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { Complete2FADto } from "../dtos/auth.dtos";
import {
  TokenExpiredError,
  TokenInvalidError,
  TwoFactorInvalidError,
} from "../../domain/errors/auth-errors";

export interface Complete2FALoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * Second step of the 2FA login flow: exchanges the single-use pre-auth
 * token issued by LoginUseCase plus a valid TOTP code for real tokens.
 */
export class Complete2FALoginUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly refreshTokenTtlMs: number = 7 * 24 * 60 * 60 * 1000,
  ) {}

  async execute(dto: Complete2FADto): Promise<Complete2FALoginResponse> {
    const record = await this.tokenStore.findByToken(dto.preAuthToken, "PRE_AUTH_2FA");

    if (!record || record.consumedAt) {
      throw new TokenInvalidError("Invalid or already used pre-auth token");
    }

    if (record.expiresAt < new Date()) {
      throw new TokenExpiredError("Pre-auth token has expired — log in again");
    }

    // The code is verified before consuming so a typo doesn't force the
    // user back to the password step; brute force is bounded by the
    // endpoint's rate limit and the token's short TTL.
    const valid = await this.authProvider.verify2FA({
      userId: record.userId,
      code: dto.code,
    });
    if (!valid) {
      throw new TwoFactorInvalidError("Invalid 2FA code");
    }

    const consumed = await this.tokenStore.markConsumed(record.id);
    if (!consumed) {
      throw new TokenInvalidError("Invalid or already used pre-auth token");
    }

    const user = await this.authProvider.getUserById(record.userId);
    const tokens = await this.authProvider.issueTokens(record.userId);

    await this.tokenStore.save({
      id: randomUUID(),
      userId: record.userId,
      type: "REFRESH_TOKEN",
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      createdAt: new Date(),
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
