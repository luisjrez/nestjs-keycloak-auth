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

    await this.tokenStore.markConsumed(record.id);

    return this.authProvider.issueTokens(record.userId);
  }
}
