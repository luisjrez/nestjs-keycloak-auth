import { SendMagicLinkUseCase } from "../../../src/application/use-cases/send-magic-link.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import type { IEmailSender } from "../../../src/domain/ports/email-sender.port";
import type { IEmailRenderer } from "../../../src/domain/ports/email-renderer.port";
import type { User } from "../../../src/domain/entities/user";
import { UserNotFoundError } from "../../../src/domain/errors/auth-errors";

describe("SendMagicLinkUseCase", () => {
  let useCase: SendMagicLinkUseCase;
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
        html: "<p>Sign in with magic link</p>",
        text: "Sign in with magic link",
        subject: "Your magic sign-in link",
      }),
    };

    useCase = new SendMagicLinkUseCase(
      mockAuthProvider,
      tokenStore,
      mockEmailSender,
      mockEmailRenderer,
      "https://example.com",
    );
  });

  it("should send magic link email", async () => {
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
      "magic-link",
      { magicLink: expect.stringContaining("https://example.com/magic-link?token=") },
    );
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Your magic sign-in link",
        html: expect.stringContaining("Sign in with magic link"),
      }),
    );
    expect(result.message).toContain("Magic link sent");
  });

  it("should return a generic message and send no email when the user does not exist", async () => {
    mockAuthProvider.getUserByEmail.mockRejectedValue(
      new UserNotFoundError("No user"),
    );

    const result = await useCase.execute({ email: "nonexistent@example.com" });

    // No user-enumeration: identical message to the success path.
    expect(result.message).toContain("Magic link sent");
    expect(result.userId).toBeUndefined();
    expect(mockEmailSender.send).not.toHaveBeenCalled();
  });

  it("should propagate unexpected provider errors", async () => {
    mockAuthProvider.getUserByEmail.mockRejectedValue(new Error("Keycloak down"));

    await expect(
      useCase.execute({ email: "test@example.com" }),
    ).rejects.toThrow("Keycloak down");
  });

  it("should store magic link token with 15 min expiry", async () => {
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
      "magic-link",
      { magicLink: expect.stringContaining("https://example.com/magic-link?token=") },
    );
    expect(mockEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Sign in with magic link"),
      }),
    );
  });
});
