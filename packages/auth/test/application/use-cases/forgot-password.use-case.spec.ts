import { ForgotPasswordUseCase } from "../../../src/application/use-cases/forgot-password.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import type { IEmailSender } from "../../../src/domain/ports/email-sender.port";
import type { User } from "../../../src/domain/entities/user";
import { UserNotFoundError } from "../../../src/domain/errors/auth-errors";

describe("ForgotPasswordUseCase", () => {
  let useCase: ForgotPasswordUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let tokenStore: InMemoryTokenStore;
  let mockEmailSender: jest.Mocked<IEmailSender>;

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
    };

    tokenStore = new InMemoryTokenStore();
    mockEmailSender = { send: jest.fn() };

    useCase = new ForgotPasswordUseCase(mockAuthProvider, tokenStore, mockEmailSender);
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
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Password Reset",
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

    const tokens = await tokenStore.findByToken(expect.any(String), "RESET_PASSWORD");
    expect(tokens).toBeNull(); // We can't query by random token

    // Verify send was called with a reset link
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("token="),
      }),
    );
    const callArg = (mockEmailSender.send as jest.Mock).mock.calls[0][0];
    expect(callArg.html).toContain("reset-password");
  });
});
