import { randomBytes, randomUUID } from "node:crypto";
import type { IAuthProvider, User } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { IEmailSender } from "../../domain/ports/email-sender.port";
import type { IEmailRenderer } from "../../domain/ports/email-renderer.port";
import type { ForgotPasswordDto } from "../dtos/auth.dtos";
import { UserNotFoundError } from "../../domain/errors/auth-errors";
import { EMAIL_TEMPLATES } from "../constants/email-templates";

const RESPONSE_MESSAGE = "Password reset email sent if the account exists.";

export class ForgotPasswordUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly emailSender: IEmailSender,
    private readonly emailRenderer: IEmailRenderer,
    private readonly baseUrl: string = "https://example.com",
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<{ message: string; userId?: string }> {
    let user: User;
    try {
      user = await this.authProvider.getUserByEmail(dto.email);
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        // Same response as the success path — never reveal whether the
        // email is registered (user-enumeration protection).
        return { message: RESPONSE_MESSAGE };
      }
      throw err;
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

    const resetLink = `${this.baseUrl}/reset-password?token=${resetToken}`;
    const { html, text, subject } = await this.emailRenderer.render(
      EMAIL_TEMPLATES.FORGOT_PASSWORD,
      { resetLink },
    );

    await this.emailSender.send({
      to: user.email,
      subject,
      html,
      text,
    });

    return { message: RESPONSE_MESSAGE, userId: user.id };
  }
}
