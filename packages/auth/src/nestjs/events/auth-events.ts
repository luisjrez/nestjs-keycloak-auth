export abstract class AuthEvent {
  public readonly timestamp: string;

  constructor() {
    this.timestamp = new Date().toISOString();
  }
}

export class UserRegisteredEvent extends AuthEvent {
  constructor(
    public readonly keycloakId: string,
    public readonly email: string,
    public readonly username: string,
  ) {
    super();
  }
}

export class UserLoggedInEvent extends AuthEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {
    super();
  }
}

export class UserLoggedOutEvent extends AuthEvent {
  constructor(public readonly userId: string) {
    super();
  }
}

export class MagicLinkSentEvent extends AuthEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {
    super();
  }
}

export class PasswordResetEvent extends AuthEvent {
  constructor(public readonly userId: string) {
    super();
  }
}

export class TwoFactorEnabledEvent extends AuthEvent {
  constructor(public readonly userId: string) {
    super();
  }
}

export class TwoFactorDisabledEvent extends AuthEvent {
  constructor(public readonly userId: string) {
    super();
  }
}
