import nodemailer from "nodemailer";
import type { IEmailSender, SendEmailRequest } from "../../domain/ports/email-sender.port";

export interface EmailConfig {
  from: string;
  transport: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
  };
}

export class MailpitEmailSender implements IEmailSender {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.transport.host,
      port: config.transport.port,
      auth:
        config.transport.user && config.transport.pass
          ? { user: config.transport.user, pass: config.transport.pass }
          : undefined,
      ignoreTLS: true,
    });
  }

  async send(req: SendEmailRequest): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: req.to,
      subject: req.subject,
      html: req.html,
      text: req.text,
    });
  }
}
