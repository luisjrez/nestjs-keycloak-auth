# Architecture

## Clean Architecture Layers

The package follows Clean Architecture with strict dependency rules: outer layers depend on inner layers, never the reverse.

```mermaid
flowchart TB
  subgraph Domain["Domain (zero deps)"]
    Entities["User, TokenPair"]
    VO["Email, Password"]
    Errors["16 DomainErrors"]
    Ports["IAuthProvider, ITokenStore, IEmailSender"]
  end

  subgraph Application["Application"]
    UseCases["10 Use Cases\nRegister, Login, Refresh,\nForgotPassword, ResetPassword,\nSendMagicLink, VerifyMagicLink,\nSetup2FA, Verify2FA, Logout"]
    DTOs["RegisterDto, LoginDto, ..."]
  end

  subgraph Infrastructure["Infrastructure"]
    Keycloak["KeycloakAuthProvider\n(Admin REST + OIDC)"]
    JWT["JwtTokenService\n(jose HS256)"]
    Email["MailpitEmailSender\n(nodemailer)"]
    Store["InMemoryTokenStore"]
    Renderer["ReactEmailRenderer"]
  end

  subgraph NestJS["NestJS Module"]
    Module["AuthModule\n(forRoot / forRootAsync)"]
    Controller["AuthController\n(11 endpoints)"]
    Guards["JwtAuthGuard\nOptionalAuthGuard"]
    Decorators["@Public, @CurrentUser"]
    Filter["AuthExceptionFilter"]
    Events["AuthEventBus\n(7 events)"]
  end

  subgraph Consumer["Consumer App"]
    AppModule["AppModule"]
    CustomStore["YourTokenStore\n(Prisma, TypeORM, Redis...)"]
  end

  Domain --> Application
  Application --> Infrastructure
  Infrastructure --> NestJS
  NestJS --> Consumer
  Consumer -.->|implements| Ports
```

## Request Flow

```mermaid
sequenceDiagram
  participant Client
  participant Controller as AuthController
  participant UseCase
  participant Provider as KeycloakAuthProvider
  participant Keycloak
  participant Store as TokenStore

  Client->>Controller: POST /auth/login
  Controller->>UseCase: execute(dto)
  UseCase->>Provider: authenticate(email, password)
  Provider->>Keycloak: OIDC password grant
  Keycloak-->>Provider: tokens
  Provider->>Provider: sign JWT (jose)
  Provider-->>UseCase: TokenPair
  UseCase->>Store: save(refreshToken)
  UseCase-->>Controller: result
  Controller->>Client: accessToken + httpOnly cookie
```

## Token Flow

```mermaid
flowchart LR
  subgraph Issue["Token Issuance"]
    Login["Login"] --> JWT["JWTTokenService\nsigns HS256"]
    JWT --> Access["Access Token\n(15min, response body)"]
    JWT --> Refresh["Refresh Token\n(7d, httpOnly cookie)"]
    Refresh --> Store["TokenStore.save()\nSHA-256 hashed"]
  end

  subgraph Refresh["Token Refresh"]
    Cookie["httpOnly cookie"] --> Controller
    Controller --> UseCase
    UseCase --> Store.findByToken["Store.findByToken()\nSHA-256 lookup"]
    Store.findByToken --> Verify["Verify not expired\nnot consumed"]
    Verify --> NewJWT["Issue new tokens"]
    NewJWT --> MarkConsumed["Mark old as consumed"]
  end

  subgraph Logout["Logout"]
    LogoutReq["POST /auth/logout"] --> FindToken["Find refresh token"]
    FindToken --> Invalidate["Invalidate in Keycloak"]
    Invalidate --> ClearCookie["Clear httpOnly cookie"]
  end
```

## 2FA Flow

```mermaid
sequenceDiagram
  participant Client
  participant Controller
  participant UseCase
  participant Provider as KeycloakAuthProvider
  participant Store as TokenStore

  Note over Client,Store: Setup Phase
  Client->>Controller: POST /auth/2fa/setup
  Controller->>UseCase: execute(userId)
  UseCase->>Provider: setup2FA(userId)
  Provider->>Provider: generateSecret() (speakeasy)
  Provider->>Provider: generateQR() (qrcode)
  Provider->>Store: saveUserData(userId, "totp_secret", secret)
  Provider-->>Client: { secret, qrCodeUrl }

  Note over Client,Store: Verification Phase
  Client->>Controller: POST /auth/2fa/verify { code }
  Controller->>UseCase: execute(userId, code)
  UseCase->>Provider: verify2FA(userId, code)
  Provider->>Store: getUserData(userId, "totp_secret")
  Provider->>Provider: speakeasy.totp.verify({ secret, code })
  Provider-->>Client: { verified: true }
```

## Package Structure

```
@luisjrez/nestjs-keycloak-auth/
├── domain/
│   ├── entities/           User, TokenPair
│   ├── value-objects/      Email, Password
│   ├── errors/             DomainError, 16 AuthErrors
│   └── ports/              IAuthProvider, IEmailSender, ITokenStore
├── application/
│   ├── dtos/               RegisterDto, LoginDto, ...
│   └── use-cases/          10 use cases
├── infrastructure/
│   ├── keycloak/           KeycloakAuthProvider
│   ├── jwt/                JwtTokenService
│   ├── email/              MailpitEmailSender, ReactEmailRenderer
│   └── storage/            InMemoryTokenStore
├── nestjs/
│   ├── auth.module.ts
│   ├── controllers/        AuthController (11 endpoints)
│   ├── guards/             JwtAuthGuard, OptionalAuthGuard
│   ├── decorators/         @Public, @CurrentUser
│   ├── filters/            AuthExceptionFilter
│   └── events/             AuthEventBus + 7 events
└── cli/                    auth-cli (init, export, import)
```
