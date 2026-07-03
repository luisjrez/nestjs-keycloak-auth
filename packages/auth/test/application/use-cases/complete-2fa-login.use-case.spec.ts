import { Complete2FALoginUseCase } from "../../../src/application/use-cases/complete-2fa-login.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import type { User } from "../../../src/domain/entities/user";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import {
  TokenInvalidError,
  TwoFactorInvalidError,
} from "../../../src/domain/errors/auth-errors";

describe("Complete2FALoginUseCase", () => {
  let useCase: Complete2FALoginUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let tokenStore: InMemoryTokenStore;

  const user: User = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    emailVerified: true,
    enabled: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockAuthProvider = {
      register: jest.fn(),
      authenticate: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      initiatePasswordReset: jest.fn(),
      completePasswordReset: jest.fn(),
      getUserById: jest.fn().mockResolvedValue(user),
      getUserByEmail: jest.fn(),
      setup2FA: jest.fn(),
      verify2FA: jest.fn(),
      disable2FA: jest.fn(),
      sendVerifyEmail: jest.fn(),
      verifyEmail: jest.fn(),
      issueTokens: jest.fn().mockResolvedValue({
        accessToken: "at-final",
        refreshToken: "rt-final",
        expiresIn: 900,
        sub: "user-1",
      }),
    };
    tokenStore = new InMemoryTokenStore();
    useCase = new Complete2FALoginUseCase(mockAuthProvider, tokenStore);
  });

  const savePreAuthToken = async (token = "pre-auth-token"): Promise<void> => {
    await tokenStore.save({
      id: token,
      userId: "user-1",
      type: "PRE_AUTH_2FA",
      token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    });
  };

  it("should issue tokens when the code is valid", async () => {
    await savePreAuthToken();
    mockAuthProvider.verify2FA.mockResolvedValue(true);

    const result = await useCase.execute({ preAuthToken: "pre-auth-token", code: "123456" });

    expect(result.accessToken).toBe("at-final");
    expect(result.user.id).toBe("user-1");
    const saved = await tokenStore.findByToken("rt-final", "REFRESH_TOKEN");
    expect(saved).not.toBeNull();
  });

  it("should reject an unknown pre-auth token", async () => {
    await expect(
      useCase.execute({ preAuthToken: "nope", code: "123456" }),
    ).rejects.toThrow(TokenInvalidError);
    expect(mockAuthProvider.issueTokens).not.toHaveBeenCalled();
  });

  it("should reject an invalid TOTP code without consuming the token twice", async () => {
    await savePreAuthToken();
    mockAuthProvider.verify2FA.mockResolvedValue(false);

    await expect(
      useCase.execute({ preAuthToken: "pre-auth-token", code: "000000" }),
    ).rejects.toThrow(TwoFactorInvalidError);
    expect(mockAuthProvider.issueTokens).not.toHaveBeenCalled();
  });

  it("should reject a pre-auth token that was already used", async () => {
    await savePreAuthToken();
    mockAuthProvider.verify2FA.mockResolvedValue(true);
    await useCase.execute({ preAuthToken: "pre-auth-token", code: "123456" });

    await expect(
      useCase.execute({ preAuthToken: "pre-auth-token", code: "123456" }),
    ).rejects.toThrow(TokenInvalidError);
  });
});
