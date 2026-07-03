# Quick Start

This guide walks through setting up the auth module with Keycloak and Prisma.

## 1. Generate a Keycloak realm

```bash
npx auth-cli init --output ./keycloak-realm.json
```

This will prompt for realm name, client ID, etc., and generate a config file.

## 2. Configure the module

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaTokenStore } from "./prisma-token.store";
import { PrismaService } from "./prisma.service";

@Module({
  imports: [
    AuthModule.forRootAsync({
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        keycloakConfigPath: process.env["KEYCLOAK_CONFIG_PATH"]!,
        jwt: {
          accessToken: {
            secret: process.env["ACCESS_TOKEN_SECRET"]!,
            expiresIn: "15m",
          },
          refreshToken: {
            secret: process.env["REFRESH_TOKEN_SECRET"]!,
            expiresIn: "7d",
          },
        },
        email: {
          from: process.env["EMAIL_FROM"]!,
          transport: {
            host: process.env["SMTP_HOST"]!,
            port: Number(process.env["SMTP_PORT"]),
          },
        },
        tokenStore: new PrismaTokenStore(prisma),
        baseUrl: process.env["APP_URL"]!,
        cookieSecure: process.env["NODE_ENV"] === "production",
      }),
    }),
  ],
})
export class AppModule {}
```

## 3. Add cookie parser and CORS

```typescript
// main.ts
import helmet from "helmet";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    credentials: true,
  });
  app.use(cookieParser());
  app.setGlobalPrefix("api");

  await app.listen(3000);
}
```

## 4. Start Keycloak

```bash
docker compose -f docker/docker-compose.yml up -d
```

Keycloak will be available at `http://localhost:8080`.

## 5. Register a user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"StrongPass1!"}'
```

## 6. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongPass1!"}'
```

Returns an access token and sets a refresh token cookie.
