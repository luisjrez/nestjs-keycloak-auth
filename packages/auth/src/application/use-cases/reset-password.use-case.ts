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

  async execute(dto: ResetPasswordDto): Promise<{ message: string }> {
    Password.create(dto.newPassword);

    const record = await this.tokenStore.findByToken(dto.token, "RESET_PASSWORD");
    if (!record) {
      throw new TokenInvalidError("Invalid or expired reset token");
    }

    if (record.expiresAt < new Date()) {
      throw new ResetTokenExpiredError("Reset token has expired");
    }

    await this.authProvider.completePasswordReset({
      userId: record.userId,
      newPassword: dto.newPassword,
    });

    await this.tokenStore.markConsumed(record.id);

    return { message: "Password has been reset successfully." };
  }
}
