import { DomainError } from "./domain-error";

export class EmailAlreadyExistsError extends DomainError {
  public readonly code = "EMAIL_EXISTS";
  public readonly status = 409;
}

export class UsernameAlreadyExistsError extends DomainError {
  public readonly code = "USERNAME_EXISTS";
  public readonly status = 409;
}

export class InvalidCredentialsError extends DomainError {
  public readonly code = "INVALID_CREDENTIALS";
  public readonly status = 401;
}

export class EmailNotVerifiedError extends DomainError {
  public readonly code = "EMAIL_NOT_VERIFIED";
  public readonly status = 403;
}

export class TokenExpiredError extends DomainError {
  public readonly code = "TOKEN_EXPIRED";
  public readonly status = 401;
}

export class TokenInvalidError extends DomainError {
  public readonly code = "TOKEN_INVALID";
  public readonly status = 401;
}

export class UserNotFoundError extends DomainError {
  public readonly code = "USER_NOT_FOUND";
  public readonly status = 404;
}

export class AccountDisabledError extends DomainError {
  public readonly code = "ACCOUNT_DISABLED";
  public readonly status = 403;
}

export class TwoFactorRequiredError extends DomainError {
  public readonly code = "2FA_REQUIRED";
  public readonly status = 403;
}

export class TwoFactorInvalidError extends DomainError {
  public readonly code = "2FA_INVALID";
  public readonly status = 401;
}

export class TwoFactorAlreadyConfiguredError extends DomainError {
  public readonly code = "2FA_ALREADY_CONFIGURED";
  public readonly status = 409;
}

export class RateLimitError extends DomainError {
  public readonly code = "RATE_LIMIT";
  public readonly status = 429;
}

export class MagicLinkExpiredError extends DomainError {
  public readonly code = "MAGIC_LINK_EXPIRED";
  public readonly status = 410;
}

export class MagicLinkAlreadyUsedError extends DomainError {
  public readonly code = "MAGIC_LINK_USED";
  public readonly status = 410;
}

export class ResetTokenExpiredError extends DomainError {
  public readonly code = "RESET_TOKEN_EXPIRED";
  public readonly status = 410;
}

export class WeakPasswordError extends DomainError {
  public readonly code = "WEAK_PASSWORD";
  public readonly status = 422;
}

export class TokenReuseDetectedError extends DomainError {
  public readonly code = "TOKEN_REUSE_DETECTED";
  public readonly status = 401;
}

export class AccountLockedError extends DomainError {
  public readonly code = "ACCOUNT_LOCKED";
  public readonly status = 423;
}

export class HealthCheckFailedError extends DomainError {
  public readonly code = "HEALTH_CHECK_FAILED";
  public readonly status = 503;
}
