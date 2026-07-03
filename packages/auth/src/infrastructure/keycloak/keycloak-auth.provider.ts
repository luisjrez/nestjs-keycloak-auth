import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { Logger } from "@nestjs/common";
import type {
  IAuthProvider,
  RegisterRequest,
  AuthenticateRequest,
  AuthenticateResponse,
  RefreshTokenRequest,
  IssueTokensResponse,
  InitiatePasswordResetRequest,
  CompletePasswordResetRequest,
  Setup2FARequest,
  Setup2FAResponse,
  Verify2FARequest,
  User as KcUser,
} from "../../domain/ports/auth-provider.port";
import {
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  TwoFactorAlreadyConfiguredError,
  UserNotFoundError,
} from "../../domain/errors/auth-errors";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import { JwtTokenService } from "../jwt/jwt-token.service";

export interface KeycloakConfig {
  serverUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

export async function loadKeycloakConfigFromPath(
  configPath: string,
  envServerUrl?: string,
): Promise<KeycloakConfig> {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(configPath, "utf-8");
  const parsed: {
    realm: string;
    clients: Array<{ clientId: string; secret: string }>;
  } = JSON.parse(content);

  const firstClient = parsed.clients?.[0];
  if (!firstClient) {
    throw new Error(`No clients found in Keycloak realm config: ${configPath}`);
  }

  return {
    serverUrl: envServerUrl ?? "http://localhost:8080",
    realm: parsed.realm,
    clientId: firstClient.clientId,
    clientSecret: firstClient.secret,
  };
}

interface AdminTokenResponse {
  access_token: string;
  expires_in: number;
}

interface KcUserRepresentation {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
}

interface KcTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface KcErrorResponse {
  error?: string;
  error_description?: string;
  errorMessage?: string;
}

export class KeycloakAuthProvider implements IAuthProvider {
  private readonly logger = new Logger(KeycloakAuthProvider.name);
  private readonly adminApi: AxiosInstance;
  private readonly oidcApi: AxiosInstance;
  private adminTokenCache: { accessToken: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: KeycloakConfig,
    private readonly jwtService: JwtTokenService,
    private readonly tokenStore?: ITokenStore,
  ) {
    this.adminApi = axios.create({
      baseURL: `${config.serverUrl}/admin/realms/${config.realm}`,
    });
    this.oidcApi = axios.create({
      baseURL: `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  // ─── Admin Token ──────────────────────────────────────────

  private async getAdminToken(): Promise<string> {
    if (this.adminTokenCache && this.adminTokenCache.expiresAt > Date.now()) {
      return this.adminTokenCache.accessToken;
    }

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await axios.post<AdminTokenResponse>(
      `${this.config.serverUrl}/realms/${this.config.realm}/protocol/openid-connect/token`,
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const { access_token, expires_in } = response.data;
    this.adminTokenCache = {
      accessToken: access_token,
      expiresAt: Date.now() + (expires_in - 30) * 1000,
    };

    return access_token;
  }

  private async adminRequest<T>(
    method: string,
    path: string,
    dataOrParams?: unknown,
  ): Promise<T> {
    const token = await this.getAdminToken();
    const isGet = method.toLowerCase() === "get";
    const config: AxiosRequestConfig = {
      method,
      url: path,
      headers: { Authorization: `Bearer ${token}` },
    };

    if (isGet) {
      config.params = dataOrParams;
    } else {
      config.data = dataOrParams;
    }

    try {
      const response = await this.adminApi.request<T>(config);
      if (response.status === 204) return undefined as T;
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw this.mapAdminError(error.response.status, error.response.data, path);
      }
      throw error;
    }
  }

  private async oidcTokenRequest(body: Record<string, string>): Promise<KcTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      ...body,
    });

    try {
      const response = await this.oidcApi.post<KcTokenResponse>("token", params.toString());
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw this.mapOidcError(error.response.status, error.response.data);
      }
      throw error;
    }
  }

  private async signUserTokens(user: KcUser): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const accessToken = await this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = await this.jwtService.signRefreshToken({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtService.getAccessTokenExpiresIn(),
    };
  }

  // ─── Error Mapping ────────────────────────────────────────

  private mapAdminError(status: number, data: KcErrorResponse | undefined, _path: string): Error {
    const message =
      data?.errorMessage ?? data?.error_description ?? data?.error ?? "Keycloak admin error";

    if (status === 409) {
      const lower = message.toLowerCase();
      if (lower.includes("username")) {
        return new UsernameAlreadyExistsError(message);
      }
      if (lower.includes("email") || lower.includes("exist")) {
        return new EmailAlreadyExistsError(message);
      }
    }
    if (status === 404) {
      return new UserNotFoundError(message);
    }
    return new Error(message);
  }

  private mapOidcError(status: number, data: KcErrorResponse | undefined): Error {
    const error = data?.error ?? "";
    const description = data?.error_description ?? "Authentication failed";

    if (error === "invalid_grant" && description.toLowerCase().includes("account is not fully set up")) {
      return new EmailNotVerifiedError(
        "Email not verified. Check your inbox for a verification link, or contact support.",
      );
    }

    if (status === 401 || error === "invalid_grant") {
      return new InvalidCredentialsError(description);
    }
    return new Error(description);
  }

  // ─── Mapping ──────────────────────────────────────────────

  private kcUserToUser(kc: KcUserRepresentation): KcUser {
    return {
      id: kc.id ?? "",
      email: kc.email ?? "",
      username: kc.username ?? "",
      emailVerified: kc.emailVerified ?? false,
      enabled: kc.enabled ?? true,
      createdAt: new Date(kc.createdTimestamp ?? Date.now()),
      attributes: kc.attributes,
    };
  }

  // ─── IAuthProvider ────────────────────────────────────────

  async register(req: RegisterRequest): Promise<KcUser> {
    await this.adminRequest("post", "/users", {
      username: req.username,
      email: req.email,
      enabled: true,
      emailVerified: req.emailVerified ?? true,
      credentials: [
        {
          type: "password",
          value: req.password,
          temporary: false,
        },
      ],
    });

    const user = await this.getUserByEmail(req.email);
    this.logger.log(`User registered: ${user.id}`);
    return user;
  }

  async authenticate(req: AuthenticateRequest): Promise<AuthenticateResponse> {
    await this.oidcTokenRequest({
      grant_type: "password",
      username: req.email,
      password: req.password,
    });

    const user = await this.getUserByEmail(req.email);
    const tokens = await this.signUserTokens(user);

    this.logger.log(`User authenticated: ${user.id}`);
    return { ...tokens, user };
  }

  async refreshToken(req: RefreshTokenRequest): Promise<IssueTokensResponse> {
    const payload = await this.jwtService.verifyRefreshToken(req.refreshToken);
    const user = await this.getUserById(payload.sub);
    const tokens = await this.signUserTokens(user);
    this.logger.log(`Token refreshed for user: ${user.id}`);
    return { ...tokens, sub: user.id };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      });
      await this.oidcApi.post("logout", params.toString());
    } catch {
      // Best-effort
    }
  }

  async initiatePasswordReset(_req: InitiatePasswordResetRequest): Promise<void> {
    throw new Error("Use ForgotPasswordUseCase — token creation and email are handled by the use case");
  }

  async completePasswordReset(req: CompletePasswordResetRequest): Promise<void> {
    await this.adminRequest("put", `/users/${req.userId}/reset-password`, {
      type: "password",
      value: req.newPassword,
      temporary: false,
    });
  }

  async getUserById(id: string): Promise<KcUser> {
    const data = await this.adminRequest<KcUserRepresentation>("get", `/users/${id}`);
    return this.kcUserToUser(data);
  }

  async getUserByEmail(email: string): Promise<KcUser> {
    const users = await this.adminRequest<KcUserRepresentation[]>("get", "/users", {
      email,
      exact: true,
    });
    if (!users || users.length === 0) {
      throw new UserNotFoundError(`User with email ${email} not found`);
    }
    return this.kcUserToUser(users[0]!);
  }

  async setup2FA(req: Setup2FARequest): Promise<Setup2FAResponse> {
    // A stolen access token must not silently rotate the victim's TOTP
    // secret; the existing 2FA has to be disabled first.
    if (this.tokenStore) {
      const existing = await this.tokenStore.getUserData(req.userId, "totpSecret");
      if (existing) {
        throw new TwoFactorAlreadyConfiguredError(
          "2FA is already configured for this account — disable it before setting it up again",
        );
      }
    }

    const secret = speakeasy.generateSecret({
      name: `Keycloak Auth (${req.userId})`,
    });

    if (this.tokenStore) {
      await this.tokenStore.saveUserData(req.userId, "totpSecret", secret.base32);
    }

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url ?? "");

    return { secret: secret.base32, qrCodeUrl };
  }

  async verify2FA(req: Verify2FARequest): Promise<boolean> {
    const storedSecret = this.tokenStore
      ? await this.tokenStore.getUserData(req.userId, "totpSecret")
      : null;
    if (!storedSecret) return false;

    return speakeasy.totp.verify({
      secret: storedSecret,
      encoding: "base32",
      token: req.code,
      window: 1,
    });
  }

  async disable2FA(userId: string): Promise<void> {
    if (this.tokenStore) {
      await this.tokenStore.deleteUserData(userId, "totpSecret");
    }
  }

  async sendVerifyEmail(userId: string): Promise<void> {
    try {
      await this.adminRequest("put", `/users/${userId}/send-verify-email`);
    } catch (err) {
      this.logger.warn(
        `Could not send verify email for user ${userId}: ${(err as Error).message}. Ensure SMTP is configured in the Keycloak realm.`,
      );
    }
  }

  async verifyEmail(_token: string): Promise<void> {
    throw new Error("Email verification is handled by Keycloak directly");
  }

  async issueTokens(userId: string): Promise<IssueTokensResponse> {
    const user = await this.getUserById(userId);
    const tokens = await this.signUserTokens(user);
    return { ...tokens, sub: user.id };
  }
}
