import { randomBytes, randomUUID } from "node:crypto";
import type { IAuthProvider, User } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { IEmailSender } from "../../domain/ports/email-sender.port";
import type { IEmailRenderer } from "../../domain/ports/email-renderer.port";
import type { SendMagicLinkDto } from "../dtos/auth.dtos";
import { UserNotFoundError } from "../../domain/errors/auth-errors";
import { EMAIL_TEMPLATES } from "../constants/email-templates";

const RESPONSE_MESSAGE = "Magic link sent if the account exists.";

export class SendMagicLinkUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly emailSender: IEmailSender,
    private readonly emailRenderer: IEmailRenderer,
    private readonly baseUrl: string = "https://example.com",
  ) {}

  async execute(dto: SendMagicLinkDto): Promise<{ message: string; userId?: string }> {
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

    const magicToken = randomBytes(32).toString("hex");

    await this.tokenStore.save({
      id: randomUUID(),
      userId: user.id,
      type: "MAGIC_LINK",
      token: magicToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      createdAt: new Date(),
    });

    const magicLink = `${this.baseUrl}/magic-link?token=${magicToken}`;
    const { html, text, subject } = await this.emailRenderer.render(
      EMAIL_TEMPLATES.MAGIC_LINK,
      { magicLink },
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
