import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { ResetPasswordDto } from "../dtos/auth.dtos";
import {
  ResetTokenExpiredError,
  TokenInvalidError,
} from "../../domain/errors/auth-errors";
import { Password } from "../../domain/value-objects/password";

export class ResetPasswordUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<{ message: string; userId: string }> {
    Password.create(dto.newPassword);

    const record = await this.tokenStore.findByToken(dto.token, "RESET_PASSWORD");
    if (!record) {
      throw new TokenInvalidError("Invalid or expired reset token");
    }

    if (record.consumedAt) {
      throw new TokenInvalidError("Reset token has already been used");
    }

    if (record.expiresAt < new Date()) {
      throw new ResetTokenExpiredError("Reset token has expired");
    }

    // Consume BEFORE changing the password so the token can never be
    // replayed, even if two requests race each other.
    const consumed = await this.tokenStore.markConsumed(record.id);
    if (!consumed) {
      throw new TokenInvalidError("Reset token has already been used");
    }

    await this.authProvider.completePasswordReset({
      userId: record.userId,
      newPassword: dto.newPassword,
    });

    // Revoke every existing session — a potential attacker must not stay
    // logged in after the victim rotates their password.
    await this.tokenStore.deleteAllForUser(record.userId);

    return { message: "Password has been reset successfully.", userId: record.userId };
  }
}
