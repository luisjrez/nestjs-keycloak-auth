# Installation

## Requirements

- Node.js 20+
- pnpm 9+ (or npm/yarn)
- NestJS 10+
- Keycloak 25+

## Install the package

```bash
pnpm add @luisjrez/nestjs-keycloak-auth
```

Also install the required peer dependencies:

```bash
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

### Optional: Rate limiting

```bash
pnpm add @nestjs/throttler
```

## Module setup

The package exports `AuthModule` which you import into your NestJS app:

```typescript
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";

@Module({
  imports: [
    AuthModule.forRoot({
      // config here
    }),
  ],
})
export class AppModule {}
```

## Cookie parser

Add `cookie-parser` middleware in your `main.ts`:

```typescript
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(3000);
}
```
