import { randomUUID } from "node:crypto";
import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import {
  TokenExpiredError,
  TokenInvalidError,
  TokenReuseDetectedError,
} from "../../domain/errors/auth-errors";

const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class RefreshTokenUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly refreshTokenTtlMs: number = DEFAULT_REFRESH_TOKEN_TTL_MS,
  ) {}

  async execute(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const record = await this.tokenStore.findByToken(refreshToken, "REFRESH_TOKEN");

    // A token that was never persisted — or was revoked and purged — must
    // never mint new tokens, even if its JWT signature is still valid.
    if (!record) {
      throw new TokenInvalidError("Refresh token not recognized");
    }

    if (record.consumedAt) {
      await this.tokenStore.deleteAllForUser(record.userId);
      throw new TokenReuseDetectedError(
        "Refresh token reuse detected — all sessions have been revoked",
      );
    }

    if (record.expiresAt < new Date()) {
      throw new TokenExpiredError("Refresh token has expired");
    }

    const consumed = await this.tokenStore.markConsumed(record.id);
    if (!consumed) {
      // Lost the race against a concurrent request using the same token.
      await this.tokenStore.deleteAllForUser(record.userId);
      throw new TokenReuseDetectedError(
        "Refresh token reuse detected — all sessions have been revoked",
      );
    }

    const payload = await this.authProvider.refreshToken({ refreshToken });

    await this.tokenStore.save({
      id: randomUUID(),
      userId: record.userId,
      type: "REFRESH_TOKEN",
      token: payload.refreshToken,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      createdAt: new Date(),
    });

    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
    };
  }
}
