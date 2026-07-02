import { Setup2FAUseCase } from "../../../src/application/use-cases/setup-2fa.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";

describe("Setup2FAUseCase", () => {
  let useCase: Setup2FAUseCase;
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

    useCase = new Setup2FAUseCase(mockAuthProvider);
  });

  it("should setup 2FA and return secret and QR code URL", async () => {
    mockAuthProvider.setup2FA.mockResolvedValue({
      secret: "JBSWY3DPEHPK3PXP",
      qrCodeUrl: "otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example",
    });

    const result = await useCase.execute({ userId: "user-1" });

    expect(mockAuthProvider.setup2FA).toHaveBeenCalledWith({ userId: "user-1" });
    expect(result).toEqual({
      secret: "JBSWY3DPEHPK3PXP",
      qrCodeUrl: expect.stringContaining("otpauth://"),
    });
  });

  it("should propagate errors from auth provider", async () => {
    mockAuthProvider.setup2FA.mockRejectedValue(new Error("2FA already configured"));

    await expect(
      useCase.execute({ userId: "user-1" }),
    ).rejects.toThrow("2FA already configured");
  });
});
