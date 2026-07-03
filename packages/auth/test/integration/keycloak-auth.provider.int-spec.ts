import { KeycloakAuthProvider, type KeycloakConfig } from "../../src/infrastructure/keycloak/keycloak-auth.provider";
import { JwtTokenService } from "../../src/infrastructure/jwt/jwt-token.service";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
} from "../../src/domain/errors/auth-errors";

const KC_SERVER_URL = process.env["KEYCLOAK_SERVER_URL"] ?? "http://localhost:8080";
const KC_REALM = process.env["KEYCLOAK_REALM"] ?? "test-realm";
const KC_CLIENT_ID = process.env["KEYCLOAK_CLIENT_ID"] ?? "test-client";
const KC_CLIENT_SECRET = process.env["KEYCLOAK_CLIENT_SECRET"] ?? "test-secret";

const jwtConfig = {
  accessToken: { secret: "test-access-secret-key-at-least-32-chars!", expiresIn: "15m" },
  refreshToken: { secret: "test-refresh-secret-key-at-least-32-ch", expiresIn: "7d" },
};

const kcConfig: KeycloakConfig = {
  serverUrl: KC_SERVER_URL,
  realm: KC_REALM,
  clientId: KC_CLIENT_ID,
  clientSecret: KC_CLIENT_SECRET,
};

function email(prefix: string): string {
  return `int-test-${prefix}-${Date.now()}@example.com`;
}

async function waitForKeycloak(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(
        `${KC_SERVER_URL}/realms/${KC_REALM}/.well-known/openid-configuration`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Keycloak not available at ${KC_SERVER_URL} after ${maxRetries} retries. ` +
      "Run 'pnpm docker:up' first.",
  );
}

describe("KeycloakAuthProvider (integration)", () => {
  let provider: KeycloakAuthProvider;
  let jwtService: JwtTokenService;

  beforeAll(async () => {
    await waitForKeycloak();
    jwtService = new JwtTokenService(jwtConfig);
    provider = new KeycloakAuthProvider(kcConfig, jwtService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("register", () => {
    const testEmail = email("register");

    it("should create a user and return user data", async () => {
      const user = await provider.register({
        email: testEmail,
        username: `int-test-user-${Date.now()}`,
        password: "SecurePass123",
      });

      expect(user.id).toBeTruthy();
      expect(user.email).toBe(testEmail);
      expect(user.enabled).toBe(true);
      expect(user.emailVerified).toBe(true);
    });

    it("should throw EmailAlreadyExistsError for duplicate email", async () => {
      await expect(
        provider.register({
          email: testEmail,
          username: `another-user-${Date.now()}`,
          password: "SecurePass456",
        }),
      ).rejects.toThrow(EmailAlreadyExistsError);
    });
  });

  describe("authenticate", () => {
    const testEmail = email("auth");

    beforeAll(async () => {
      await provider.register({
        email: testEmail,
        username: `auth-user-${Date.now()}`,
        password: "SecurePass123",
      });
    });

    it("should throw InvalidCredentialsError for wrong password", async () => {
      await expect(
        provider.authenticate({
          email: testEmail,
          password: "WrongPassword999",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should throw for nonexistent user", async () => {
      await expect(
        provider.authenticate({
          email: "nonexistent@example.com",
          password: "AnyPass123",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe("user lookup", () => {
    const testEmail = email("lookup");
    let userId: string;

    beforeAll(async () => {
      const user = await provider.register({
        email: testEmail,
        username: `lookup-user-${Date.now()}`,
        password: "SecurePass123",
      });
      userId = user.id;
    });

    it("should get user by ID", async () => {
      const user = await provider.getUserById(userId);

      expect(user.id).toBe(userId);
      expect(user.email).toBe(testEmail);
    });

    it("should get user by email", async () => {
      const user = await provider.getUserByEmail(testEmail);

      expect(user.email).toBe(testEmail);
      expect(user.id).toBe(userId);
    });

    it("should throw UserNotFoundError for unknown email", async () => {
      await expect(provider.getUserByEmail("unknown@example.com")).rejects.toThrow(UserNotFoundError);
    });
  });

  describe("password reset", () => {
    const testEmail = email("reset");
    let userId: string;

    beforeAll(async () => {
      const user = await provider.register({
        email: testEmail,
        username: `reset-user-${Date.now()}`,
        password: "OldPass123",
      });
      userId = user.id;
    });

    it("should complete password reset without throwing", async () => {
      await expect(
        provider.completePasswordReset({
          userId,
          newPassword: "NewPass456",
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("2FA", () => {
    const testEmail = email("2fa");
    let userId: string;

    beforeAll(async () => {
      const user = await provider.register({
        email: testEmail,
        username: `2fa-user-${Date.now()}`,
        password: "SecurePass123",
      });
      userId = user.id;
    });

    it("should setup 2FA and return secret and QR code", async () => {
      const result = await provider.setup2FA({ userId });

      expect(result.secret).toBeTruthy();
      expect(result.qrCodeUrl).toBeTruthy();
      expect(result.qrCodeUrl).toContain("data:image/png;base64,");
    });

    it("should reject invalid TOTP code when no secret configured", async () => {
      const isValid = await provider.verify2FA({ userId, code: "000000" });
      expect(isValid).toBe(false);
    });
  });

  describe("logout", () => {
    it("should not throw when logging out with invalid token", async () => {
      await expect(provider.logout("some-invalid-refresh-token")).resolves.toBeUndefined();
    });
  });

  describe("issueTokens", () => {
    const testEmail = email("tokens");
    let userId: string;

    beforeAll(async () => {
      const user = await provider.register({
        email: testEmail,
        username: `token-user-${Date.now()}`,
        password: "SecurePass123",
      });
      userId = user.id;
    });

    it("should issue signed tokens for a valid user", async () => {
      const result = await provider.issueTokens(userId);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBeGreaterThan(0);
    });
  });

  describe("disable2FA", () => {
    const testEmail = email("disable2fa");
    let userId: string;

    beforeAll(async () => {
      const user = await provider.register({
        email: testEmail,
        username: `disable2fa-user-${Date.now()}`,
        password: "SecurePass123",
      });
      userId = user.id;
    });

    it("should disable 2FA without throwing", async () => {
      await expect(provider.disable2FA(userId)).resolves.toBeUndefined();
    });
  });
});
