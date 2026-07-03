// ─── Domain ─────────────────────────────────────────────────
export { DomainError } from "./domain/errors/domain-error";
export {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  TokenExpiredError,
  TokenInvalidError,
  TokenReuseDetectedError,
  UserNotFoundError,
  AccountDisabledError,
  AccountLockedError,
  TwoFactorRequiredError,
  TwoFactorInvalidError,
  TwoFactorAlreadyConfiguredError,
  RateLimitError,
  MagicLinkExpiredError,
  MagicLinkAlreadyUsedError,
  ResetTokenExpiredError,
  WeakPasswordError,
  HealthCheckFailedError,
} from "./domain/errors/auth-errors";

export { Email } from "./domain/value-objects/email";
export { Password } from "./domain/value-objects/password";
export type { User } from "./domain/entities/user";
export type { TokenPair } from "./domain/entities/token-pair";

export type { IAuthProvider } from "./domain/ports/auth-provider.port";
export type { IEmailSender } from "./domain/ports/email-sender.port";
export type { IEmailRenderer } from "./domain/ports/email-renderer.port";
export type { ILogger } from "./domain/ports/logger.port";
export type { ITokenStore, TokenRecord } from "./domain/ports/token-store.port";
export { parseDurationSeconds, parseDurationMs } from "./domain/utils/duration";

// ─── Application ────────────────────────────────────────────
export { RegisterUseCase } from "./application/use-cases/register.use-case";
export { LoginUseCase } from "./application/use-cases/login.use-case";
export type {
  LoginResult,
  LoginSuccessResponse,
  TwoFactorRequiredResponse,
} from "./application/use-cases/login.use-case";
export { Complete2FALoginUseCase } from "./application/use-cases/complete-2fa-login.use-case";
export { RefreshTokenUseCase } from "./application/use-cases/refresh-token.use-case";
export { ForgotPasswordUseCase } from "./application/use-cases/forgot-password.use-case";
export { ResetPasswordUseCase } from "./application/use-cases/reset-password.use-case";
export { SendMagicLinkUseCase } from "./application/use-cases/send-magic-link.use-case";
export { VerifyMagicLinkUseCase } from "./application/use-cases/verify-magic-link.use-case";
export { Setup2FAUseCase } from "./application/use-cases/setup-2fa.use-case";
export { Verify2FAUseCase } from "./application/use-cases/verify-2fa.use-case";
export { LogoutUseCase } from "./application/use-cases/logout.use-case";

export {
  RegisterDto,
  LoginDto,
  Complete2FADto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
  VerifyMagicLinkDto,
  Setup2FADto,
  Verify2FADto,
} from "./application/dtos/auth.dtos";

// ─── NestJS Module ──────────────────────────────────────────
export { AuthModule } from "./nestjs/auth.module";
export { AuthController } from "./nestjs/controllers/auth.controller";
export { CsrfController } from "./nestjs/controllers/csrf.controller";
export { JwtAuthGuard } from "./nestjs/guards/jwt-auth.guard";
export { OptionalAuthGuard } from "./nestjs/guards/optional-auth.guard";
export { CsrfGuard } from "./nestjs/guards/csrf.guard";
export { CurrentUser } from "./nestjs/decorators/current-user.decorator";
export type { AuthenticatedUser } from "./nestjs/decorators/current-user.decorator";
export { Public } from "./nestjs/decorators/public.decorator";
export { AuthExceptionFilter } from "./nestjs/filters/auth-exception.filter";
export { AuthEventBus } from "./nestjs/events/auth-event-bus";
export { AUTH_MODULE_OPTIONS, TOKEN_STORE, AUTH_PROVIDER } from "./nestjs/auth.constants";
export { validateAuthModuleOptions } from "./nestjs/validate-options";

export type { AuthModuleOptions, AuthModuleAsyncOptions } from "./nestjs/interfaces/auth-module-options.interface";

// ─── Events ─────────────────────────────────────────────────
export {
  UserRegisteredEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  MagicLinkSentEvent,
  PasswordResetEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
} from "./nestjs/events/auth-events";

// ─── Infrastructure ─────────────────────────────────────────
export { KeycloakAuthProvider } from "./infrastructure/keycloak/keycloak-auth.provider";
export type { KeycloakConfig } from "./infrastructure/keycloak/keycloak-auth.provider";
export { MailpitEmailSender, MailpitEmailSender as SmtpEmailSender } from "./infrastructure/email/mailpit-email.sender";
export type { EmailConfig } from "./infrastructure/email/mailpit-email.sender";
export { JwtTokenService } from "./infrastructure/jwt/jwt-token.service";
export type { JwtConfig } from "./infrastructure/jwt/jwt-token.service";
export { InMemoryTokenStore } from "./infrastructure/storage/in-memory-token.store";
export { hashToken } from "./infrastructure/storage/token-hash";
