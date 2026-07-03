import { Test } from "@nestjs/testing";
import { AuthModule } from "../../src/nestjs/auth.module";
import { JwtTokenService } from "../../src/infrastructure/jwt/jwt-token.service";
import { KeycloakAuthProvider } from "../../src/infrastructure/keycloak/keycloak-auth.provider";
import { InMemoryTokenStore } from "../../src/infrastructure/storage/in-memory-token.store";
import { AuthEventBus } from "../../src/nestjs/events/auth-event-bus";
import { LoginUseCase } from "../../src/application/use-cases/login.use-case";

const validOptions = () => ({
  keycloak: {
    serverUrl: "http://localhost:8080",
    realm: "test",
    clientId: "test-client",
    clientSecret: "test-secret",
  },
  jwt: {
    accessToken: { secret: "test-access-secret-key-at-least-32-chars!", expiresIn: "15m" },
    refreshToken: { secret: "test-refresh-secret-key-at-least-32-ch!", expiresIn: "7d" },
  },
  email: {
    from: "test@test.com",
    transport: { host: "localhost", port: 1025 },
  },
  tokenStore: new InMemoryTokenStore(),
});

describe("AuthModule", () => {
  describe("forRoot", () => {
    it("should create a module with Keycloak config", async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule.forRoot(validOptions())],
      }).compile();

      expect(module.get<JwtTokenService>(JwtTokenService)).toBeDefined();
      expect(module.get<KeycloakAuthProvider>(KeycloakAuthProvider)).toBeDefined();
      expect(module.get<AuthEventBus>(AuthEventBus)).toBeDefined();
      // Use cases are exported so consumers can inject them.
      expect(module.get<LoginUseCase>(LoginUseCase)).toBeDefined();

      await module.close();
    });

    it("should reject weak JWT secrets at startup", () => {
      expect(() =>
        AuthModule.forRoot({
          ...validOptions(),
          jwt: {
            accessToken: { secret: "short", expiresIn: "15m" },
            refreshToken: { secret: "also-short", expiresIn: "7d" },
          },
        }),
      ).toThrow(/at least 32 characters/);
    });
  });

  describe("forRootAsync", () => {
    it("should create a module with async factory", async () => {
      const module = await Test.createTestingModule({
        imports: [AuthModule.forRootAsync({ useFactory: () => validOptions() })],
      }).compile();

      expect(module.get<KeycloakAuthProvider>(KeycloakAuthProvider)).toBeDefined();

      await module.close();
    });

    it("should throw when no Keycloak config is provided", async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            AuthModule.forRootAsync({
              useFactory: () => {
                const opts = validOptions();
                delete (opts as { keycloak?: unknown }).keycloak;
                return opts;
              },
            }),
          ],
        }).compile(),
      ).rejects.toThrow(/keycloak.*required/i);
    });
  });
});
