import { randomBytes, randomUUID } from "node:crypto";
import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { IEmailSender } from "../../domain/ports/email-sender.port";
import type { ForgotPasswordDto } from "../dtos/auth.dtos";
import { UserNotFoundError } from "../../domain/errors/auth-errors";

export class ForgotPasswordUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<{ message: string }> {
    let user;
    try {
      user = await this.authProvider.getUserByEmail(dto.email);
    } catch {
      throw new UserNotFoundError(`No user found with email: ${dto.email}`);
    }

    const resetToken = randomBytes(32).toString("hex");

    await this.tokenStore.save({
      id: randomUUID(),
      userId: user.id,
      type: "RESET_PASSWORD",
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      createdAt: new Date(),
    });

    await this.emailSender.send({
      to: user.email,
      subject: "Password Reset",
      html: `<p>Reset your password using this link: <a href="https://example.com/reset-password?token=${resetToken}">Reset Password</a></p>`,
      text: `Reset your password using this link: https://example.com/reset-password?token=${resetToken}`,
    });

    return { message: "Password reset email sent if the account exists." };
  }
}
