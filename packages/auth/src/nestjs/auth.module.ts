import { DynamicModule, Global, Module, Provider, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { AuthController } from "./controllers/auth.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OptionalAuthGuard } from "./guards/optional-auth.guard";
import { AuthExceptionFilter } from "./filters/auth-exception.filter";
import { AuthEventBus } from "./events/auth-event-bus";
import { JwtTokenService } from "../infrastructure/jwt/jwt-token.service";
import { KeycloakAuthProvider, loadKeycloakConfigFromPath } from "../infrastructure/keycloak/keycloak-auth.provider";
import { MailpitEmailSender } from "../infrastructure/email/mailpit-email.sender";
import { ReactEmailRenderer } from "../infrastructure/email/react-email.renderer";

import { RegisterUseCase } from "../application/use-cases/register.use-case";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../application/use-cases/refresh-token.use-case";
import { ForgotPasswordUseCase } from "../application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "../application/use-cases/reset-password.use-case";
import { SendMagicLinkUseCase } from "../application/use-cases/send-magic-link.use-case";
import { VerifyMagicLinkUseCase } from "../application/use-cases/verify-magic-link.use-case";
import { Setup2FAUseCase } from "../application/use-cases/setup-2fa.use-case";
import { Verify2FAUseCase } from "../application/use-cases/verify-2fa.use-case";
import { LogoutUseCase } from "../application/use-cases/logout.use-case";

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
      exports: [AuthEventBus, JwtTokenService, ReactEmailRenderer],
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
          inject: ["AUTH_MODULE_OPTIONS", JwtTokenService, "ITokenStore"],
          useFactory: async (opts: AuthModuleOptions, jwt: JwtTokenService, store: any) => {
            if (opts.keycloak) {
              return new KeycloakAuthProvider(opts.keycloak, jwt, store);
            }
            if (opts.keycloakConfigPath) {
              const kcConfig = await loadKeycloakConfigFromPath(
                opts.keycloakConfigPath,
                process.env["KEYCLOAK_SERVER_URL"],
              );
              return new KeycloakAuthProvider(kcConfig, jwt, store);
            }
            throw new Error("Keycloak config is required — provide keycloak or keycloakConfigPath");
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
        {
          provide: ReactEmailRenderer,
          useFactory: () => new ReactEmailRenderer(),
        },
      ],
      exports: [AuthEventBus, JwtTokenService, ReactEmailRenderer],
    };
  }

  private static createCoreProviders(): Provider[] {
    return [
      AuthEventBus,
      JwtAuthGuard,
      {
        provide: OptionalAuthGuard,
        useClass: OptionalAuthGuard,
      },
      {
        provide: APP_PIPE,
        useFactory: () =>
          new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
          }),
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
        inject: [JwtTokenService, "ITokenStore"],
        useFactory: (jwt: JwtTokenService, store: any) => {
          if (options.keycloak) {
            return new KeycloakAuthProvider(options.keycloak, jwt, store);
          }
          throw new Error("Keycloak config is required — provide keycloak option");
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
      {
        provide: ReactEmailRenderer,
        useFactory: () => new ReactEmailRenderer(),
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
        inject: [KeycloakAuthProvider, "ITokenStore", MailpitEmailSender, ReactEmailRenderer, "AUTH_MODULE_OPTIONS"],
        useFactory: (
          auth: KeycloakAuthProvider,
          store: any,
          email: MailpitEmailSender,
          renderer: ReactEmailRenderer,
          opts: AuthModuleOptions,
        ) => new ForgotPasswordUseCase(auth, store, email, renderer, opts.baseUrl),
      },
      {
        provide: ResetPasswordUseCase,
        inject: [KeycloakAuthProvider, "ITokenStore"],
        useFactory: (auth: KeycloakAuthProvider, store: any) =>
          new ResetPasswordUseCase(auth, store),
      },
      {
        provide: SendMagicLinkUseCase,
        inject: [KeycloakAuthProvider, "ITokenStore", MailpitEmailSender, ReactEmailRenderer, "AUTH_MODULE_OPTIONS"],
        useFactory: (
          auth: KeycloakAuthProvider,
          store: any,
          email: MailpitEmailSender,
          renderer: ReactEmailRenderer,
          opts: AuthModuleOptions,
        ) => new SendMagicLinkUseCase(auth, store, email, renderer, opts.baseUrl),
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
      {
        provide: LogoutUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) =>
          new LogoutUseCase(auth),
      },
    ];
  }
}
