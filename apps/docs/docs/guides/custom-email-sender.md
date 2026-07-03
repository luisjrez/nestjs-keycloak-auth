# Custom Email Sender

The `IEmailSender` interface allows you to implement any email provider.

## Interface

```typescript
interface IEmailSender {
  send(request: SendEmailRequest): Promise<void>;
}

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
}
```

## Implementations

### Mailpit / SMTP (included)

The package includes `MailpitEmailSender` which uses nodemailer and works with any SMTP server:

```typescript
{
  email: {
    from: "noreply@example.com",
    transport: {
      host: "smtp.sendgrid.net",
      port: 587,
      user: "apikey",
      pass: "SG.xxxxx",
    },
  },
}
```

### Resend

```typescript
import { Resend } from "resend";
import type { IEmailSender } from "@luisjrez/nestjs-keycloak-auth";

export class ResendEmailSender implements IEmailSender {
  private client = new Resend(process.env["RESEND_API_KEY"]!);

  async send(req: SendEmailRequest): Promise<void> {
    await this.client.emails.send({
      from: "noreply@example.com",
      to: req.to,
      subject: req.subject,
      html: req.html,
      text: req.text,
    });
  }
}
```

### AWS SES

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { IEmailSender } from "@luisjrez/nestjs-keycloak-auth";

export class SesEmailSender implements IEmailSender {
  private client = new SESClient({ region: "us-east-1" });

  async send(req: SendEmailRequest): Promise<void> {
    await this.client.send(new SendEmailCommand({
      Source: "noreply@example.com",
      Destination: { ToAddresses: [req.to] },
      Message: {
        Subject: { Data: req.subject },
        Body: {
          Html: { Data: req.html },
          Text: { Data: req.text },
        },
      },
    }));
  }
}
```
