import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  TokenExpiredError,
  TokenInvalidError,
  UserNotFoundError,
  AccountDisabledError,
  TwoFactorRequiredError,
  TwoFactorInvalidError,
  TwoFactorAlreadyConfiguredError,
  RateLimitError,
  MagicLinkExpiredError,
  MagicLinkAlreadyUsedError,
  ResetTokenExpiredError,
  WeakPasswordError,
} from "../../../src/domain/errors/auth-errors";

describe("Auth errors", () => {
  const errorCases = [
    { name: "EmailAlreadyExistsError", Class: EmailAlreadyExistsError, code: "EMAIL_EXISTS", status: 409 },
    { name: "UsernameAlreadyExistsError", Class: UsernameAlreadyExistsError, code: "USERNAME_EXISTS", status: 409 },
    { name: "InvalidCredentialsError", Class: InvalidCredentialsError, code: "INVALID_CREDENTIALS", status: 401 },
    { name: "EmailNotVerifiedError", Class: EmailNotVerifiedError, code: "EMAIL_NOT_VERIFIED", status: 403 },
    { name: "TokenExpiredError", Class: TokenExpiredError, code: "TOKEN_EXPIRED", status: 401 },
    { name: "TokenInvalidError", Class: TokenInvalidError, code: "TOKEN_INVALID", status: 401 },
    { name: "UserNotFoundError", Class: UserNotFoundError, code: "USER_NOT_FOUND", status: 404 },
    { name: "AccountDisabledError", Class: AccountDisabledError, code: "ACCOUNT_DISABLED", status: 403 },
    { name: "TwoFactorRequiredError", Class: TwoFactorRequiredError, code: "2FA_REQUIRED", status: 403 },
    { name: "TwoFactorInvalidError", Class: TwoFactorInvalidError, code: "2FA_INVALID", status: 401 },
    { name: "TwoFactorAlreadyConfiguredError", Class: TwoFactorAlreadyConfiguredError, code: "2FA_ALREADY_CONFIGURED", status: 409 },
    { name: "RateLimitError", Class: RateLimitError, code: "RATE_LIMIT", status: 429 },
    { name: "MagicLinkExpiredError", Class: MagicLinkExpiredError, code: "MAGIC_LINK_EXPIRED", status: 410 },
    { name: "MagicLinkAlreadyUsedError", Class: MagicLinkAlreadyUsedError, code: "MAGIC_LINK_USED", status: 410 },
    { name: "ResetTokenExpiredError", Class: ResetTokenExpiredError, code: "RESET_TOKEN_EXPIRED", status: 410 },
    { name: "WeakPasswordError", Class: WeakPasswordError, code: "WEAK_PASSWORD", status: 422 },
  ];

  for (const { name, Class: ErrorClass, code, status } of errorCases) {
    describe(name, () => {
      it(`should have code "${code}"`, () => {
        const err = new ErrorClass("test message");
        expect(err.code).toBe(code);
      });

      it(`should have status ${status}`, () => {
        const err = new ErrorClass("test message");
        expect(err.status).toBe(status);
      });

      it("should inherit from Error", () => {
        const err = new ErrorClass("test message");
        expect(err).toBeInstanceOf(Error);
      });

      it("should propagate the message", () => {
        const err = new ErrorClass("custom message");
        expect(err.message).toBe("custom message");
      });

      it("should have correct toJSON output", () => {
        const err = new ErrorClass("test message");
        const json = err.toJSON();

        expect(json).toMatchObject({
          error: code,
          message: "test message",
          statusCode: status,
        });
        expect(json.timestamp).toBeDefined();
      });
    });
  }
});
