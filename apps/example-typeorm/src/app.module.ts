import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";
import { AppController } from "./app.controller";
import { TokenEntity, UserDataEntity } from "./typeorm/entities";
import { TypeOrmTokenStore } from "./typeorm/typeorm-token.store";
import { TokenStoreModule } from "./typeorm/token-store.module";

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
    TypeOrmModule.forRoot({
      type: "better-sqlite3",
      database: process.env["SQLITE_PATH"] ?? "auth-typeorm.sqlite",
      entities: [TokenEntity, UserDataEntity],
      synchronize: true, // fine for an example; use migrations in production
    }),
    TokenStoreModule,

    AuthModule.forRootAsync({
      // TokenStoreModule already provides TypeOrmTokenStore (wired to its
      // repositories); reuse that provider via `useExisting`.
      imports: [TokenStoreModule],
      tokenStore: { useExisting: TypeOrmTokenStore },
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
        ...(process.env["RATE_LIMIT_DISABLED"] === "1" && {
          rateLimit: { enabled: false },
        }),
      }),
    }),
  ],
})
export class AppModule {}
