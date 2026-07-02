import { randomBytes, randomUUID } from "node:crypto";
import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";
import type { IEmailSender } from "../../domain/ports/email-sender.port";
import type { SendMagicLinkDto } from "../dtos/auth.dtos";
import { UserNotFoundError } from "../../domain/errors/auth-errors";

export class SendMagicLinkUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(dto: SendMagicLinkDto): Promise<{ message: string }> {
    let user;
    try {
      user = await this.authProvider.getUserByEmail(dto.email);
    } catch {
      throw new UserNotFoundError(`No user found with email: ${dto.email}`);
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

    await this.emailSender.send({
      to: user.email,
      subject: "Your Magic Sign-In Link",
      html: `<p>Sign in using this link: <a href="https://example.com/magic-link?token=${magicToken}">Sign In</a></p>`,
      text: `Sign in using this link: https://example.com/magic-link?token=${magicToken}`,
    });

    return { message: "Magic link sent if the account exists." };
  }
}
