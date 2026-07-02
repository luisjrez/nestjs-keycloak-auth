import { Verify2FAUseCase } from "../../../src/application/use-cases/verify-2fa.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { TwoFactorInvalidError } from "../../../src/domain/errors/auth-errors";

describe("Verify2FAUseCase", () => {
  let useCase: Verify2FAUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;

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

    useCase = new Verify2FAUseCase(mockAuthProvider);
  });

  it("should verify valid 2FA code", async () => {
    mockAuthProvider.verify2FA.mockResolvedValue(true);

    const result = await useCase.execute({
      userId: "user-1",
      code: "123456",
    });

    expect(mockAuthProvider.verify2FA).toHaveBeenCalledWith({
      userId: "user-1",
      code: "123456",
    });
    expect(result).toEqual({ verified: true });
  });

  it("should throw for invalid 2FA code", async () => {
    mockAuthProvider.verify2FA.mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: "user-1",
        code: "000000",
      }),
    ).rejects.toThrow(TwoFactorInvalidError);
  });

  it("should propagate auth provider errors", async () => {
    mockAuthProvider.verify2FA.mockRejectedValue(new Error("User not found"));

    await expect(
      useCase.execute({
        userId: "nonexistent",
        code: "123456",
      }),
    ).rejects.toThrow("User not found");
  });
});
