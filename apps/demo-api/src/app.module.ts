import { Module } from "@nestjs/common";
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaTokenStore } from "./prisma/prisma-token.store";

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,

    // ─── Auth Module ──────────────────────────────────────────
    // This is how consumers wire the auth package into their NestJS app.
    // Full config will be added once domain & infrastructure layers are built.
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        keycloakConfigPath: process.env["KEYCLOAK_CONFIG_PATH"] ?? "./keycloak-realm.json",
        jwt: {
          accessToken: {
            secret: process.env["ACCESS_TOKEN_SECRET"] ?? "dev-access-secret-change-me",
            expiresIn: "15m",
          },
          refreshToken: {
            secret: process.env["REFRESH_TOKEN_SECRET"] ?? "dev-refresh-secret-change-me",
            expiresIn: "7d",
          },
        },
        email: {
          from: process.env["EMAIL_FROM"] ?? "noreply@example.com",
          transport: {
            host: process.env["SMTP_HOST"] ?? "localhost",
            port: Number(process.env["SMTP_PORT"] ?? "1025"),
          },
        },
        tokenStore: new PrismaTokenStore(prisma),
        baseUrl: process.env["APP_URL"] ?? "http://localhost:3000",
        cookieSecure: process.env["NODE_ENV"] === "production",
      }),
    }),
  ],
})
export class AppModule {}
