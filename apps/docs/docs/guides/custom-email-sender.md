# Custom Email & Templates

The email layer has two swappable pieces, both optional:

- **`emailSender`** (`IEmailSender`) — *how* mail is delivered (SMTP, Resend, SES…).
- **`emailRenderer`** (`IEmailRenderer`) — *what* the emails look like (your own templates).

Pass either (or both) to `AuthModule.forRoot(Async)`. If you pass neither, the
package uses its built-in SMTP sender + React templates. When you pass a custom
`emailSender`, the `email` (SMTP) option is no longer required.

## Wiring it up

```typescript
AuthModule.forRootAsync({
  useFactory: () => ({
    // ...jwt, keycloak, tokenStore...
    emailSender: new ResendEmailSender(),   // optional — replaces SMTP
    emailRenderer: new MyEmailRenderer(),   // optional — replaces templates
    // `email` can be omitted once emailSender is provided
  }),
});
```

Both are plain objects, so build them however you like (with DI, inject them
in the factory via `inject: [...]`).

## Custom templates (`IEmailRenderer`)

Override every template by implementing `IEmailRenderer`:

```typescript
interface IEmailRenderer {
  render(templateName: string, data: Record<string, string | undefined>): Promise<RenderedEmail>;
}

interface RenderedEmail { html: string; text: string; subject: string; }
```

Your renderer **must handle all four template names** the package emits, with
the data each provides:

| `templateName` | data keys |
|---|---|
| `"welcome"` | `username`, `baseUrl` |
| `"forgot-password"` | `resetLink` |
| `"magic-link"` | `magicLink` |
| `"verify-email"` | `verifyLink`, `username` |

```typescript
import type { IEmailRenderer, RenderedEmail } from "@luisjrez/nestjs-keycloak-auth";

export class MyEmailRenderer implements IEmailRenderer {
  async render(name: string, data: Record<string, string | undefined>): Promise<RenderedEmail> {
    switch (name) {
      case "magic-link":
        return {
          subject: "Your sign-in link",
          html: `<a href="${data.magicLink}">Sign in</a>`,
          text: `Sign in: ${data.magicLink}`,
        };
      // ...welcome, forgot-password, verify-email
      default:
        throw new Error(`Unhandled template: ${name}`);
    }
  }
}
```

> **Startup safety.** On boot the module renders every required template once
> and throws if any is missing or returns an empty `html`/`subject`. A renderer
> that forgets `verify-email` fails the app's startup with a clear message —
> not silently at the first email send.

---

## Custom sender (`IEmailSender`)

The `IEmailSender` interface lets you deliver mail through any provider.

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
