export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailSender {
  send(req: SendEmailRequest): Promise<void>;
}
