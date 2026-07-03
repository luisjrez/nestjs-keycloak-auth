import { Test } from "@nestjs/testing";
import { AuthModule } from "../../src/nestjs/auth.module";
import { JwtTokenService } from "../../src/infrastructure/jwt/jwt-token.service";
import { KeycloakAuthProvider } from "../../src/infrastructure/keycloak/keycloak-auth.provider";
import { InMemoryTokenStore } from "../../src/infrastructure/storage/in-memory-token.store";
import { AuthEventBus } from "../../src/nestjs/events/auth-event-bus";

describe("AuthModule", () => {
  describe("forRoot", () => {
    it("should create a module with Keycloak config", async () => {
      const module = await Test.createTestingModule({
        imports: [
          AuthModule.forRoot({
            keycloak: {
              serverUrl: "http://localhost:8080",
              realm: "test",
              clientId: "test-client",
              clientSecret: "test-secret",
            },
            jwt: {
              accessToken: { secret: "test-access-secret-key-at-least-32-chars!", expiresIn: "15m" },
              refreshToken: { secret: "test-refresh-secret-key-at-least-32-ch", expiresIn: "7d" },
            },
            email: {
              from: "test@test.com",
              transport: { host: "localhost", port: 1025 },
            },
            tokenStore: new InMemoryTokenStore(),
          }),
        ],
      }).compile();

      const jwtService = module.get<JwtTokenService>(JwtTokenService);
      expect(jwtService).toBeDefined();

      const provider = module.get<KeycloakAuthProvider>(KeycloakAuthProvider);
      expect(provider).toBeDefined();

      const eventBus = module.get<AuthEventBus>(AuthEventBus);
      expect(eventBus).toBeDefined();

      await module.close();
    });
  });

  describe("forRootAsync", () => {
    it("should create a module with async factory", async () => {
      const module = await Test.createTestingModule({
        imports: [
          AuthModule.forRootAsync({
            useFactory: () => ({
              keycloak: {
                serverUrl: "http://localhost:8080",
                realm: "test",
                clientId: "test-client",
                clientSecret: "test-secret",
              },
              jwt: {
                accessToken: { secret: "test-access-secret-key-at-least-32-chars!", expiresIn: "15m" },
                refreshToken: { secret: "test-refresh-secret-key-at-least-32-ch", expiresIn: "7d" },
              },
              email: {
                from: "test@test.com",
                transport: { host: "localhost", port: 1025 },
              },
              tokenStore: new InMemoryTokenStore(),
            }),
          }),
        ],
      }).compile();

      const provider = module.get<KeycloakAuthProvider>(KeycloakAuthProvider);
      expect(provider).toBeDefined();

      await module.close();
    });

    it("should throw when no Keycloak config is provided", async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            AuthModule.forRootAsync({
              useFactory: () => ({
                jwt: {
                  accessToken: { secret: "test-secret", expiresIn: "15m" },
                  refreshToken: { secret: "test-refresh-secret", expiresIn: "7d" },
                },
                email: {
                  from: "test@test.com",
                  transport: { host: "localhost", port: 1025 },
                },
                tokenStore: new InMemoryTokenStore(),
              }),
            }),
          ],
        }).compile(),
      ).rejects.toThrow("Keycloak config is required");
    });
  });
});
