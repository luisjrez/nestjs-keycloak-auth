import { RefreshTokenUseCase } from "../../../src/application/use-cases/refresh-token.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";

describe("RefreshTokenUseCase", () => {
  let useCase: RefreshTokenUseCase;
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

    useCase = new RefreshTokenUseCase(mockAuthProvider);
  });

  it("should refresh tokens successfully", async () => {
    mockAuthProvider.refreshToken.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 900,
    });

    const result = await useCase.execute("old-refresh-token");

    expect(mockAuthProvider.refreshToken).toHaveBeenCalledWith({
      refreshToken: "old-refresh-token",
    });

    expect(result).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 900,
    });
  });

  it("should propagate errors from auth provider", async () => {
    mockAuthProvider.refreshToken.mockRejectedValue(new Error("Invalid refresh token"));

    await expect(useCase.execute("bad-token")).rejects.toThrow("Invalid refresh token");
  });
});
