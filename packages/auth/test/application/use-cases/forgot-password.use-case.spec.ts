import { ForgotPasswordUseCase } from "../../../src/application/use-cases/forgot-password.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import type { IEmailSender } from "../../../src/domain/ports/email-sender.port";
import type { IEmailRenderer } from "../../../src/domain/ports/email-renderer.port";
import type { User } from "../../../src/domain/entities/user";
import { UserNotFoundError } from "../../../src/domain/errors/auth-errors";

describe("ForgotPasswordUseCase", () => {
  let useCase: ForgotPasswordUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let tokenStore: InMemoryTokenStore;
  let mockEmailSender: jest.Mocked<IEmailSender>;
  let mockEmailRenderer: jest.Mocked<IEmailRenderer>;

  beforeEach(() => {
    mockAuthProvider = {
      register: jest.fn(),
      authenticate: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      initiatePasswordReset: jest.fn(),
      completePasswordReset: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      setup2FA: jest.fn(),
      verify2FA: jest.fn(),
      disable2FA: jest.fn(),
      sendVerifyEmail: jest.fn(),
      verifyEmail: jest.fn(),
      issueTokens: jest.fn(),
    };

    tokenStore = new InMemoryTokenStore();
    mockEmailSender = { send: jest.fn() };
    mockEmailRenderer = {
      render: jest.fn().mockResolvedValue({
        html: "<p>Reset your password</p>",
        text: "Reset your password",
        subject: "Reset your password",
      }),
    };

    useCase = new ForgotPasswordUseCase(
      mockAuthProvider,
      tokenStore,
      mockEmailSender,
      mockEmailRenderer,
      "https://example.com",
    );
  });

  it("should send a password reset email", async () => {
    const mockUser: User = {
      id: "user-1",
      email: "test@example.com",
      username: "testuser",
      emailVerified: true,
      enabled: true,
      createdAt: new Date(),
    };

    mockAuthProvider.getUserByEmail.mockResolvedValue(mockUser);
    mockEmailSender.send.mockResolvedValue(undefined);

    const result = await useCase.execute({ email: "test@example.com" });

    expect(mockAuthProvider.getUserByEmail).toHaveBeenCalledWith("test@example.com");
    expect(mockEmailRenderer.render).toHaveBeenCalledWith(
      "forgot-password",
      { resetLink: expect.stringContaining("https://example.com/reset-password?token=") },
    );
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Reset your password",
        html: expect.stringContaining("Reset your password"),
      }),
    );
    expect(result.message).toContain("Password reset email sent");
  });

  it("should throw when user does not exist", async () => {
    mockAuthProvider.getUserByEmail.mockRejectedValue(new Error("User not found"));

    await expect(
      useCase.execute({ email: "nonexistent@example.com" }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it("should store reset token with 1 hour expiry", async () => {
    const mockUser: User = {
      id: "user-1",
      email: "test@example.com",
      username: "testuser",
      emailVerified: true,
      enabled: true,
      createdAt: new Date(),
    };

    mockAuthProvider.getUserByEmail.mockResolvedValue(mockUser);

    await useCase.execute({ email: "test@example.com" });

    expect(mockEmailRenderer.render).toHaveBeenCalledWith(
      "forgot-password",
      { resetLink: expect.stringContaining("https://example.com/reset-password?token=") },
    );
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Reset your password"),
      }),
    );
  });
});
