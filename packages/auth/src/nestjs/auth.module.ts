import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AuthController } from "./controllers/auth.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OptionalAuthGuard } from "./guards/optional-auth.guard";
import { AuthExceptionFilter } from "./filters/auth-exception.filter";
import { AuthEventBus } from "./events/auth-event-bus";
import { JwtTokenService } from "../infrastructure/jwt/jwt-token.service";
import { KeycloakAuthProvider } from "../infrastructure/keycloak/keycloak-auth.provider";
import { MailpitEmailSender } from "../infrastructure/email/mailpit-email.sender";

import { RegisterUseCase } from "../application/use-cases/register.use-case";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../application/use-cases/refresh-token.use-case";
import { ForgotPasswordUseCase } from "../application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "../application/use-cases/reset-password.use-case";
import { SendMagicLinkUseCase } from "../application/use-cases/send-magic-link.use-case";
import { VerifyMagicLinkUseCase } from "../application/use-cases/verify-magic-link.use-case";
import { Setup2FAUseCase } from "../application/use-cases/setup-2fa.use-case";
import { Verify2FAUseCase } from "../application/use-cases/verify-2fa.use-case";

import type { AuthModuleOptions, AuthModuleAsyncOptions } from "./interfaces/auth-module-options.interface";

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthController],
      providers: [
        ...AuthModule.createCoreProviders(),
        ...AuthModule.createInfrastructureProviders(options),
        ...AuthModule.createUseCaseProviders(),
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_FILTER,
          useClass: AuthExceptionFilter,
        },
      ],
      exports: [AuthEventBus, JwtTokenService],
    };
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...AuthModule.createCoreProviders(),
      ...AuthModule.createUseCaseProviders(),
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      },
      {
        provide: APP_FILTER,
        useClass: AuthExceptionFilter,
      },
    ];

    return {
      module: AuthModule,
      imports: options.imports ?? [],
      controllers: [AuthController],
      providers: [
        ...providers,
        {
          provide: "AUTH_MODULE_OPTIONS",
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        {
          provide: KeycloakAuthProvider,
          inject: ["AUTH_MODULE_OPTIONS"],
          useFactory: (opts: AuthModuleOptions) => {
            if (opts.keycloak) {
              return new KeycloakAuthProvider(opts.keycloak);
            }
            throw new Error("Keycloak config is required");
          },
        },
        {
          provide: MailpitEmailSender,
          inject: ["AUTH_MODULE_OPTIONS"],
          useFactory: (opts: AuthModuleOptions) => {
            return new MailpitEmailSender(opts.email);
          },
        },
        {
          provide: JwtTokenService,
          inject: ["AUTH_MODULE_OPTIONS"],
          useFactory: (opts: AuthModuleOptions) => {
            return new JwtTokenService(opts.jwt);
          },
        },
        {
          provide: "ITokenStore",
          inject: ["AUTH_MODULE_OPTIONS"],
          useFactory: (opts: AuthModuleOptions) => {
            return opts.tokenStore;
          },
        },
      ],
      exports: [AuthEventBus, JwtTokenService],
    };
  }

  private static createCoreProviders(): Provider[] {
    return [
      AuthEventBus,
      {
        provide: OptionalAuthGuard,
        useClass: OptionalAuthGuard,
      },
    ];
  }

  private static createInfrastructureProviders(
    options: AuthModuleOptions,
  ): Provider[] {
    return [
      {
        provide: "AUTH_MODULE_OPTIONS",
        useValue: options,
      },
      {
        provide: KeycloakAuthProvider,
        useFactory: () => {
          if (options.keycloak) {
            return new KeycloakAuthProvider(options.keycloak);
          }
          throw new Error("Keycloak config is required");
        },
      },
      {
        provide: MailpitEmailSender,
        useFactory: () => new MailpitEmailSender(options.email),
      },
      {
        provide: JwtTokenService,
        useFactory: () => new JwtTokenService(options.jwt),
      },
      {
        provide: "ITokenStore",
        useValue: options.tokenStore,
      },
    ];
  }

  private static createUseCaseProviders(): Provider[] {
    return [
      {
        provide: RegisterUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) =>
          new RegisterUseCase(auth),
      },
      {
        provide: LoginUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) => new LoginUseCase(auth),
      },
      {
        provide: RefreshTokenUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) =>
          new RefreshTokenUseCase(auth),
      },
      {
        provide: ForgotPasswordUseCase,
        inject: [KeycloakAuthProvider, "ITokenStore", MailpitEmailSender],
        useFactory: (
          auth: KeycloakAuthProvider,
          store: any,
          email: MailpitEmailSender,
        ) => new ForgotPasswordUseCase(auth, store, email),
      },
      {
        provide: ResetPasswordUseCase,
        inject: [KeycloakAuthProvider, "ITokenStore"],
        useFactory: (auth: KeycloakAuthProvider, store: any) =>
          new ResetPasswordUseCase(auth, store),
      },
      {
        provide: SendMagicLinkUseCase,
        inject: [KeycloakAuthProvider, "ITokenStore", MailpitEmailSender],
        useFactory: (
          auth: KeycloakAuthProvider,
          store: any,
          email: MailpitEmailSender,
        ) => new SendMagicLinkUseCase(auth, store, email),
      },
      {
        provide: VerifyMagicLinkUseCase,
        inject: [KeycloakAuthProvider, "ITokenStore"],
        useFactory: (auth: KeycloakAuthProvider, store: any) =>
          new VerifyMagicLinkUseCase(auth, store),
      },
      {
        provide: Setup2FAUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) => new Setup2FAUseCase(auth),
      },
      {
        provide: Verify2FAUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) =>
          new Verify2FAUseCase(auth),
      },
    ];
  }
}
