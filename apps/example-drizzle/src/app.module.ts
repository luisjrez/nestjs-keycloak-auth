import { Module } from "@nestjs/common";
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";
import { AppController } from "./app.controller";
import { DrizzleModule } from "./db/drizzle.provider";
import { DrizzleTokenStore } from "./db/drizzle-token.store";

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return devFallback;
}

@Module({
  controllers: [AppController],
  imports: [
    // SQLite file — no Docker needed for the token store. Only Keycloak
    // (the identity provider) and Mailpit run in Docker.
    DrizzleModule,

    AuthModule.forRootAsync({
      imports: [DrizzleModule],
      inject: [DrizzleTokenStore],
      useFactory: (tokenStore: DrizzleTokenStore) => ({
        keycloakConfigPath: process.env["KEYCLOAK_CONFIG_PATH"] ?? "./keycloak-realm.json",
        jwt: {
          accessToken: {
            secret: requireSecret("ACCESS_TOKEN_SECRET", "dev-only-access-token-secret-32-chars!!"),
            expiresIn: "15m",
          },
          refreshToken: {
            secret: requireSecret("REFRESH_TOKEN_SECRET", "dev-only-refresh-token-secret-32-chars!"),
            expiresIn: "7d",
          },
        },
        email: {
          from: process.env["EMAIL_FROM"] ?? "noreply@example.com",
          transport: {
            host: process.env["SMTP_HOST"] ?? "localhost",
            port: Number(process.env["SMTP_PORT"] ?? "1025"),
            ignoreTLS: true,
          },
        },
        tokenStore,
        baseUrl: process.env["APP_URL"] ?? "http://localhost:3000",
        cookieSecure: process.env["NODE_ENV"] === "production",
        ...(process.env["RATE_LIMIT_DISABLED"] === "1" && {
          rateLimit: { enabled: false },
        }),
      }),
    }),
  ],
})
export class AppModule {}
