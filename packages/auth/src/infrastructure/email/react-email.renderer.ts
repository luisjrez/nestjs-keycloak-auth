import { renderToStaticMarkup } from "react-dom/server";
import { toPlainText } from "@react-email/components";
import { WelcomeEmail } from "../../email-templates/welcome";
import { ForgotPasswordEmail } from "../../email-templates/forgot-password";
import { MagicLinkEmail } from "../../email-templates/magic-link";
import { VerifyEmail } from "../../email-templates/verify-email";
import { EMAIL_TEMPLATES } from "../../email-templates";
import type { RenderedEmail, IEmailRenderer } from "../../domain/ports/email-renderer.port";

export class ReactEmailRenderer implements IEmailRenderer {
  async render(templateName: string, data: Record<string, string | undefined>): Promise<RenderedEmail> {
    switch (templateName) {
      case EMAIL_TEMPLATES.WELCOME:
        return this.renderWelcome(data);
      case EMAIL_TEMPLATES.FORGOT_PASSWORD:
        return this.renderForgotPassword(data);
      case EMAIL_TEMPLATES.MAGIC_LINK:
        return this.renderMagicLink(data);
      case EMAIL_TEMPLATES.VERIFY_EMAIL:
        return this.renderVerifyEmail(data);
      default:
        throw new Error(`Unknown email template: ${templateName}`);
    }
  }

  private renderWelcome(data: Record<string, string | undefined>): RenderedEmail {
    const component = WelcomeEmail({
      username: data["username"] ?? "User",
      baseUrl: data["baseUrl"],
    });
    const html = renderToStaticMarkup(component);
    const text = toPlainText(html);
    return { html, text, subject: "Welcome to our platform" };
  }

  private renderForgotPassword(data: Record<string, string | undefined>): RenderedEmail {
    const component = ForgotPasswordEmail({
      resetLink: data["resetLink"] ?? "#",
    });
    const html = renderToStaticMarkup(component);
    const text = toPlainText(html);
    return { html, text, subject: "Reset your password" };
  }

  private renderMagicLink(data: Record<string, string | undefined>): RenderedEmail {
    const component = MagicLinkEmail({
      magicLink: data["magicLink"] ?? "#",
    });
    const html = renderToStaticMarkup(component);
    const text = toPlainText(html);
    return { html, text, subject: "Your magic sign-in link" };
  }

  private renderVerifyEmail(data: Record<string, string | undefined>): RenderedEmail {
    const component = VerifyEmail({
      verifyLink: data["verifyLink"] ?? "#",
      username: data["username"] ?? "User",
    });
    const html = renderToStaticMarkup(component);
    const text = toPlainText(html);
    return { html, text, subject: "Verify your email address" };
  }
}
