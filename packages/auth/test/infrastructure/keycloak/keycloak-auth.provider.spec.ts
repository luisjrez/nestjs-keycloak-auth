import axios from "axios";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { KeycloakAuthProvider, type KeycloakConfig } from "../../../src/infrastructure/keycloak/keycloak-auth.provider";
import { JwtTokenService } from "../../../src/infrastructure/jwt/jwt-token.service";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
} from "../../../src/domain/errors/auth-errors";

jest.mock("axios");
jest.mock("speakeasy");
jest.mock("qrcode");

const mockAxiosCreate = axios.create as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;
const mockIsAxiosError = axios.isAxiosError as unknown as jest.Mock;
const mockAdminRequest = jest.fn();
const mockOidcPost = jest.fn();

mockIsAxiosError.mockImplementation((err: any) => err?.isAxiosError === true);

// Admin token endpoint response (uses axios.post directly)
const adminTokenResponse = {
  data: { access_token: "admin-token-123", expires_in: 300 },
};
mockAxiosPost.mockResolvedValue(adminTokenResponse);

mockAxiosCreate.mockImplementation((config: any) => {
  if (config.baseURL?.includes("/admin/")) {
    return { request: mockAdminRequest };
  }
  return { post: mockOidcPost };
});

const config: KeycloakConfig = {
  serverUrl: "http://localhost:8080",
  realm: "test-realm",
  clientId: "test-client",
  clientSecret: "test-secret",
};

const jwtService = new JwtTokenService({
  accessToken: {
    secret: "test-access-secret-key-at-least-32-chars!!",
    expiresIn: "15m",
  },
  refreshToken: {
    secret: "test-refresh-secret-key-at-least-32-chars!",
    expiresIn: "7d",
  },
});

const kcUserData = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  enabled: true,
  emailVerified: true,
  createdTimestamp: Date.now(),
};

describe("KeycloakAuthProvider", () => {
  let provider: KeycloakAuthProvider;
  const tokenStore = new InMemoryTokenStore();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosPost.mockResolvedValue(adminTokenResponse);
    mockIsAxiosError.mockImplementation((err: any) => err?.isAxiosError === true);
    provider = new KeycloakAuthProvider(config, jwtService, tokenStore);
  });

  describe("register", () => {
    it("should register a user and return user data", async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: {}, status: 201 })
        .mockResolvedValueOnce({ data: [kcUserData] });

      const result = await provider.register({
        email: "test@example.com",
        username: "testuser",
        password: "SecurePass123@",
      });

      expect(result.email).toBe("test@example.com");
      expect(result.username).toBe("testuser");
    });

    it("should throw EmailAlreadyExistsError on 409 for email", async () => {
      mockAdminRequest.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 409, data: { errorMessage: "Email already exists" } },
      });

      await expect(
        provider.register({ email: "exists@example.com", username: "u", password: "SecurePass123@" }),
      ).rejects.toThrow(EmailAlreadyExistsError);
    });

    it("should throw UsernameAlreadyExistsError on 409 for username", async () => {
      mockAdminRequest.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 409, data: { errorMessage: "User exists with same username" } },
      });

      await expect(
        provider.register({ email: "e@example.com", username: "existing", password: "SecurePass123@" }),
      ).rejects.toThrow(UsernameAlreadyExistsError);
    });
  });

  describe("authenticate", () => {
    it("should authenticate and return user with tokens", async () => {
      mockOidcPost.mockResolvedValueOnce({
        data: { access_token: "oidc-at", refresh_token: "oidc-rt", expires_in: 300, token_type: "Bearer" },
      });
      mockAdminRequest.mockResolvedValueOnce({ data: [kcUserData] });

      const result = await provider.authenticate({
        email: "test@example.com",
        password: "SecurePass123@",
      });

      expect(result.user.id).toBe("user-1");
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it("should throw InvalidCredentialsError on 401 from OIDC", async () => {
      mockOidcPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401, data: { error: "invalid_grant", error_description: "Invalid user credentials" } },
      });

      await expect(
        provider.authenticate({ email: "bad@example.com", password: "wrong" }),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe("refreshToken", () => {
    it("should verify refresh token and return new tokens", async () => {
      const realRefreshToken = await jwtService.signRefreshToken({
        sub: "user-1",
        email: "test@example.com",
        username: "testuser",
      });
      mockAdminRequest.mockResolvedValueOnce({ data: kcUserData });

      const result = await provider.refreshToken({ refreshToken: realRefreshToken });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it("should throw when refresh token is invalid", async () => {
      const badToken = jwtService.signAccessToken({ sub: "u-1", email: "e@e.com", username: "u" });

      await expect(
        provider.refreshToken({ refreshToken: await badToken }),
      ).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("should call OIDC logout and not throw on error", async () => {
      mockOidcPost.mockRejectedValueOnce(new Error("Network error"));

      await expect(provider.logout("some-refresh-token")).resolves.toBeUndefined();
    });

    it("should call OIDC logout on success", async () => {
      mockOidcPost.mockResolvedValueOnce({ status: 204 });

      await provider.logout("some-refresh-token");

      expect(mockOidcPost).toHaveBeenCalled();
    });
  });

  describe("initiatePasswordReset", () => {
    it("should throw", async () => {
      await expect(provider.initiatePasswordReset({ email: "test@example.com" })).rejects.toThrow(
        "Use ForgotPasswordUseCase",
      );
    });
  });

  describe("completePasswordReset", () => {
    it("should update password in Keycloak", async () => {
      mockAdminRequest.mockResolvedValueOnce({ data: {}, status: 204 });

      await provider.completePasswordReset({
        userId: "user-1",
        newPassword: "NewSecurePass456",
      });

      expect(mockAdminRequest).toHaveBeenCalledWith({
        method: "put",
        url: "/users/user-1/reset-password",
        headers: { Authorization: "Bearer admin-token-123" },
        data: { type: "password", value: "NewSecurePass456", temporary: false },
      });
    });

    it("should map 404 error", async () => {
      mockAdminRequest.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404, data: { errorMessage: "User not found" } },
      });

      await expect(
        provider.completePasswordReset({ userId: "nonexistent", newPassword: "NewSecurePass456" }),
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("getUserById", () => {
    it("should return user data", async () => {
      mockAdminRequest.mockResolvedValueOnce({ data: kcUserData });

      const user = await provider.getUserById("user-1");

      expect(user.id).toBe("user-1");
      expect(user.email).toBe("test@example.com");
    });

    it("should throw UserNotFoundError on 404", async () => {
      mockAdminRequest.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404, data: { error: "User not found" } },
      });

      await expect(provider.getUserById("nonexistent")).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("getUserByEmail", () => {
    it("should return user data", async () => {
      mockAdminRequest.mockResolvedValueOnce({ data: [kcUserData] });

      const user = await provider.getUserByEmail("test@example.com");

      expect(user.email).toBe("test@example.com");
    });

    it("should throw UserNotFoundError when no users found", async () => {
      mockAdminRequest.mockResolvedValueOnce({ data: [] });

      await expect(provider.getUserByEmail("missing@example.com")).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("setup2FA", () => {
    it("should generate secret and save to token store", async () => {
      const mockSecret = { base32: "JBSWY3DPEHPK3PXP", otpauth_url: "otpauth://totp/test" };
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue("data:image/png;base64,test");

      const result = await provider.setup2FA({ userId: "user-1" });

      const stored = await tokenStore.getUserData("user-1", "totpSecret");
      expect(stored).toBe("JBSWY3DPEHPK3PXP");
      expect(result.secret).toBe("JBSWY3DPEHPK3PXP");
      expect(result.qrCodeUrl).toBe("data:image/png;base64,test");
    });
  });

  describe("verify2FA", () => {
    it("should return true for valid code", async () => {
      await tokenStore.saveUserData("user-1", "totpSecret", "JBSWY3DPEHPK3PXP");
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await provider.verify2FA({ userId: "user-1", code: "123456" });

      expect(result).toBe(true);
    });

    it("should return false for invalid code", async () => {
      await tokenStore.saveUserData("user-1", "totpSecret", "JBSWY3DPEHPK3PXP");
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await provider.verify2FA({ userId: "user-1", code: "000000" });

      expect(result).toBe(false);
    });

    it("should return false when no TOTP secret configured", async () => {
      const result = await provider.verify2FA({ userId: "user-1", code: "123456" });

      expect(result).toBe(false);
    });
  });

  describe("disable2FA", () => {
    it("should remove totpSecret from token store", async () => {
      await tokenStore.saveUserData("user-1", "totpSecret", "JBSWY3DPEHPK3PXP");

      await provider.disable2FA("user-1");

      const stored = await tokenStore.getUserData("user-1", "totpSecret");
      expect(stored).toBeNull();
    });
  });

  describe("sendVerifyEmail", () => {
    it("should call admin API", async () => {
      mockAdminRequest.mockResolvedValueOnce({ data: {}, status: 204 });

      await provider.sendVerifyEmail("user-1");

      expect(mockAdminRequest).toHaveBeenCalledWith({
        method: "put",
        url: "/users/user-1/send-verify-email",
        headers: { Authorization: "Bearer admin-token-123" },
        data: undefined,
      });
    });
  });

  describe("verifyEmail", () => {
    it("should throw", async () => {
      await expect(provider.verifyEmail("some-token")).rejects.toThrow(
        "Email verification is handled by Keycloak directly",
      );
    });
  });

  describe("issueTokens", () => {
    it("should return signed tokens for user", async () => {
      mockAdminRequest.mockResolvedValueOnce({ data: kcUserData });

      const result = await provider.issueTokens("user-1");

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBe(900);
    });

    it("should throw when user not found", async () => {
      mockAdminRequest.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404, data: { error: "User not found" } },
      });

      await expect(provider.issueTokens("nonexistent")).rejects.toThrow(UserNotFoundError);
    });
  });
});
