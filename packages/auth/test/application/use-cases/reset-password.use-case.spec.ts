import { ResetPasswordUseCase } from "../../../src/application/use-cases/reset-password.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import type { TokenRecord } from "../../../src/domain/ports/token-store.port";
import {
  TokenInvalidError,
  ResetTokenExpiredError,
} from "../../../src/domain/errors/auth-errors";

describe("ResetPasswordUseCase", () => {
  let useCase: ResetPasswordUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let tokenStore: InMemoryTokenStore;

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
    useCase = new ResetPasswordUseCase(mockAuthProvider, tokenStore);
  });

  const setupValidToken = async (): Promise<TokenRecord> => {
    const record: TokenRecord = {
      id: "reset-1",
      userId: "user-1",
      type: "RESET_PASSWORD",
      token: "valid-reset-token",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };
    await tokenStore.save(record);
    return record;
  };

  it("should reset password with valid token", async () => {
    await setupValidToken();
    mockAuthProvider.completePasswordReset.mockResolvedValue(undefined);

    const result = await useCase.execute({
      token: "valid-reset-token",
      newPassword: "NewSecurePass123",
    });

    expect(mockAuthProvider.completePasswordReset).toHaveBeenCalledWith({
      token: "valid-reset-token",
      newPassword: "NewSecurePass123",
    });

    expect(result.message).toContain("reset successfully");
  });

  it("should mark token as consumed after reset", async () => {
    await setupValidToken();
    mockAuthProvider.completePasswordReset.mockResolvedValue(undefined);

    await useCase.execute({
      token: "valid-reset-token",
      newPassword: "NewSecurePass123",
    });

    const record = await tokenStore.findByToken("valid-reset-token", "RESET_PASSWORD");
    expect(record!.consumedAt).toBeDefined();
  });

  it("should throw for invalid token", async () => {
    await expect(
      useCase.execute({
        token: "nonexistent-token",
        newPassword: "NewSecurePass123",
      }),
    ).rejects.toThrow(TokenInvalidError);
  });

  it("should throw for expired token", async () => {
    const expired: TokenRecord = {
      id: "expired-1",
      userId: "user-1",
      type: "RESET_PASSWORD",
      token: "expired-token",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };
    await tokenStore.save(expired);

    await expect(
      useCase.execute({
        token: "expired-token",
        newPassword: "NewSecurePass123",
      }),
    ).rejects.toThrow(ResetTokenExpiredError);
  });

  it("should throw for weak new password", async () => {
    await expect(
      useCase.execute({
        token: "some-token",
        newPassword: "Abc1",
      }),
    ).rejects.toThrow("at least 8 characters");
  });

  it("should throw for numeric new password", async () => {
    await expect(
      useCase.execute({
        token: "some-token",
        newPassword: "1234567890",
      }),
    ).rejects.toThrow("entirely numeric");
  });
});
