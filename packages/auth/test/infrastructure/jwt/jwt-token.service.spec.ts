import { JwtTokenService, type JwtConfig } from "../../../src/infrastructure/jwt/jwt-token.service";

const config: JwtConfig = {
  accessToken: {
    secret: "test-access-secret-that-is-at-least-32-chars!!",
    expiresIn: "15m",
  },
  refreshToken: {
    secret: "test-refresh-secret-that-is-at-least-32-chars!",
    expiresIn: "7d",
  },
};

describe("JwtTokenService", () => {
  let service: JwtTokenService;

  beforeEach(() => {
    service = new JwtTokenService(config);
  });

  describe("signAccessToken", () => {
    it("should sign a valid access token", async () => {
      const token = await service.signAccessToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // header.payload.signature
    });

    it("should include claims in the token", async () => {
      const token = await service.signAccessToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      const decoded = await service.verifyAccessToken(token);
      expect(decoded.sub).toBe("user-123");
      expect(decoded.email).toBe("user@example.com");
      expect(decoded.username).toBe("testuser");
    });
  });

  describe("signRefreshToken", () => {
    it("should sign a valid refresh token", async () => {
      const token = await service.signRefreshToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      expect(token).toBeDefined();
      expect(token.split(".")).toHaveLength(3);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", async () => {
      const token = await service.signAccessToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      const payload = await service.verifyAccessToken(token);
      expect(payload.sub).toBe("user-123");
    });

    it("should reject token signed with different secret", async () => {
      const otherService = new JwtTokenService({
        accessToken: { secret: "different-secret-that-is-at-least-32-chars!!", expiresIn: "15m" },
        refreshToken: { secret: "different-refresh-secret-32-chars-minimum!!", expiresIn: "7d" },
      });

      const token = await otherService.signAccessToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      await expect(service.verifyAccessToken(token)).rejects.toThrow("Invalid access token");
    });

    it("should reject a malformed token", async () => {
      await expect(service.verifyAccessToken("not-a-jwt")).rejects.toThrow("Invalid access token");
    });

    it("should reject an expired token", async () => {
      const shortExpiryService = new JwtTokenService({
        accessToken: { secret: "short-lived-secret-that-is-at-least-32-chars!!", expiresIn: "0s" },
        refreshToken: { secret: "short-refresh-secret-that-is-at-least-32-char", expiresIn: "7d" },
      });

      const token = await shortExpiryService.signAccessToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      await expect(shortExpiryService.verifyAccessToken(token)).rejects.toThrow(
        "Access token has expired",
      );
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", async () => {
      const token = await service.signRefreshToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      const payload = await service.verifyRefreshToken(token);
      expect(payload.sub).toBe("user-123");
    });

    it("should reject access token used as refresh token", async () => {
      const accessToken = await service.signAccessToken({
        sub: "user-123",
        email: "user@example.com",
        username: "testuser",
      });

      await expect(service.verifyRefreshToken(accessToken)).rejects.toThrow("Invalid refresh token");
    });

    it("should reject an invalid refresh token", async () => {
      await expect(service.verifyRefreshToken("invalid")).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("getAccessTokenExpiresIn", () => {
    it("should parse minutes format", () => {
      const svc = new JwtTokenService({
        accessToken: { secret: "test-secret-at-least-32-characters-long!!", expiresIn: "15m" },
        refreshToken: { secret: "test-refresh-secret-32-chars-minimum!!!", expiresIn: "7d" },
      });

      expect(svc.getAccessTokenExpiresIn()).toBe(900); // 15 * 60
    });

    it("should parse seconds format", () => {
      const svc = new JwtTokenService({
        accessToken: { secret: "test-secret-at-least-32-characters-long!!", expiresIn: "30s" },
        refreshToken: { secret: "test-refresh-secret-32-chars-minimum!!!", expiresIn: "7d" },
      });

      expect(svc.getAccessTokenExpiresIn()).toBe(30);
    });

    it("should parse hours format", () => {
      const svc = new JwtTokenService({
        accessToken: { secret: "test-secret-at-least-32-characters-long!!", expiresIn: "1h" },
        refreshToken: { secret: "test-refresh-secret-32-chars-minimum!!!", expiresIn: "7d" },
      });

      expect(svc.getAccessTokenExpiresIn()).toBe(3600);
    });

    it("should parse days format", () => {
      const svc = new JwtTokenService({
        accessToken: { secret: "test-secret-at-least-32-characters-long!!", expiresIn: "1d" },
        refreshToken: { secret: "test-refresh-secret-32-chars-minimum!!!", expiresIn: "7d" },
      });

      expect(svc.getAccessTokenExpiresIn()).toBe(86400);
    });
  });
});
