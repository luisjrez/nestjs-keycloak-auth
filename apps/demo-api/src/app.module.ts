import { Module } from "@nestjs/common";
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaTokenStore } from "./prisma/prisma-token.store";

/**
 * Reads a required secret from the environment. Outside production a dev
 * fallback is allowed; in production a missing secret aborts startup so
 * the app never signs tokens with a publicly known value.
 */
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
    PrismaModule,

    // ─── Auth Module ──────────────────────────────────────────
    // This is how consumers wire the auth package into their NestJS app.
    AuthModule.forRootAsync({
      // The token store is a module-level dependency. Passing `{ useClass }`
      // lets Nest construct it and inject its own deps (PrismaService here) —
      // no manual `new`. You could also pass a ready-made instance.
      tokenStore: { useClass: PrismaTokenStore },
      useFactory: () => ({
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
        baseUrl: process.env["APP_URL"] ?? "http://localhost:3000",
        cookieSecure: process.env["NODE_ENV"] === "production",
        // Allow E2E/load environments to turn rate limiting off.
        ...(process.env["RATE_LIMIT_DISABLED"] === "1" && {
          rateLimit: { enabled: false },
        }),
        // Uncomment to enforce CSRF double-submit validation on all
        // mutating endpoints (clients must call GET /auth/csrf first):
        // csrf: { enabled: true },
        // Uncomment to require email verification before first login
        // (needs SMTP configured in the Keycloak realm):
        // requireEmailVerification: true,
      }),
    }),
  ],
})
export class AppModule {}
