import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { VerifyMagicLinkDto } from "../dtos/auth.dtos";
import {
  TokenInvalidError,
  MagicLinkExpiredError,
  MagicLinkAlreadyUsedError,
} from "../../domain/errors/auth-errors";

export class VerifyMagicLinkUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly refreshTokenTtlMs: number = 7 * 24 * 60 * 60 * 1000,
  ) {}

  async execute(dto: VerifyMagicLinkDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const record = await this.tokenStore.findByToken(dto.token, "MAGIC_LINK");

    if (!record) {
      throw new TokenInvalidError("Invalid magic link token");
    }

    if (record.consumedAt) {
      throw new MagicLinkAlreadyUsedError("Magic link has already been used");
    }

    if (record.expiresAt < new Date()) {
      throw new MagicLinkExpiredError("Magic link has expired");
    }

    const consumed = await this.tokenStore.markConsumed(record.id);
    if (!consumed) {
      throw new MagicLinkAlreadyUsedError("Magic link has already been used");
    }

    const tokens = await this.authProvider.issueTokens(record.userId);

    await this.tokenStore.save({
      id: crypto.randomUUID(),
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
    };
  }
}
