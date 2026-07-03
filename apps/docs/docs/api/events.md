# Events

The `AuthEventBus` emits typed events for key authentication flows. Inject it into your services to react to auth events.

## Usage

```typescript
import { Injectable } from "@nestjs/common";
import { AuthEventBus, UserRegisteredEvent } from "@luisjrez/nestjs-keycloak-auth";

@Injectable()
export class MyListener {
  constructor(private readonly eventBus: AuthEventBus) {
    this.eventBus.on(UserRegisteredEvent, (event) => {
      console.log(`New user registered: ${event.email}`);
      // Send welcome email, create profile, etc.
    });
  }
}
```

## Available events

| Event | Payload | When emitted |
|-------|---------|-------------|
| `UserRegisteredEvent` | `{ email, username, timestamp }` | After successful registration |
| `UserLoggedInEvent` | `{ email, timestamp }` | After successful login |
| `UserLoggedOutEvent` | `{ email, timestamp }` | After logout |
| `MagicLinkSentEvent` | `{ email, timestamp }` | After sending magic link |
| `PasswordResetEvent` | `{ email, timestamp }` | After password reset |
| `TwoFactorEnabledEvent` | `{ email, timestamp }` | After 2FA setup |
| `TwoFactorDisabledEvent` | `{ email, timestamp }` | After 2FA disabled |

## Cleanup

Events are emitted synchronously. No cleanup is needed for the event bus itself.
