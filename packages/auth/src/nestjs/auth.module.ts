import {
  DynamicModule,
  Global,
  Logger,
  Module,
  Provider,
  ValidationPipe,
  type ModuleMetadata,
  type PipeTransform,
} from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import {
  getOptionsToken,
  getStorageToken,
  ThrottlerGuard,
  ThrottlerStorageService,
} from "@nestjs/throttler";
import { ConfigurableThrottlerGuard } from "./guards/configurable-throttler.guard";
import { AuthController } from "./controllers/auth.controller";
import { CsrfController } from "./controllers/csrf.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GlobalAuthGuard } from "./guards/global-auth.guard";
import { OptionalAuthGuard } from "./guards/optional-auth.guard";
import { CsrfGuard } from "./guards/csrf.guard";
import { AuthExceptionFilter } from "./filters/auth-exception.filter";
import { AuthEventBus } from "./events/auth-event-bus";
import {
  AUTH_MODULE_OPTIONS,
  AUTH_PROVIDER,
  EMAIL_RENDERER,
  EMAIL_SENDER,
  TOKEN_STORE,
} from "./auth.constants";
import { validateAuthModuleOptions } from "./validate-options";
import { validateEmailRenderer } from "./validate-email-renderer";
import { parseDurationMs } from "../domain/utils/duration";
import type { ITokenStore } from "../domain/ports/token-store.port";
import type { IEmailSender } from "../domain/ports/email-sender.port";
import type { IEmailRenderer } from "../domain/ports/email-renderer.port";
import { JwtTokenService } from "../infrastructure/jwt/jwt-token.service";
import { KeycloakAuthProvider, loadKeycloakConfigFromPath } from "../infrastructure/keycloak/keycloak-auth.provider";
import { MailpitEmailSender, type EmailConfig } from "../infrastructure/email/mailpit-email.sender";
import { ReactEmailRenderer } from "../infrastructure/email/react-email.renderer";

import { RegisterUseCase } from "../application/use-cases/register.use-case";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { Complete2FALoginUseCase } from "../application/use-cases/complete-2fa-login.use-case";
import { RefreshTokenUseCase } from "../application/use-cases/refresh-token.use-case";
import { ForgotPasswordUseCase } from "../application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "../application/use-cases/reset-password.use-case";
import { SendMagicLinkUseCase } from "../application/use-cases/send-magic-link.use-case";
import { VerifyMagicLinkUseCase } from "../application/use-cases/verify-magic-link.use-case";
import { Setup2FAUseCase } from "../application/use-cases/setup-2fa.use-case";
import { Verify2FAUseCase } from "../application/use-cases/verify-2fa.use-case";
import { LogoutUseCase } from "../application/use-cases/logout.use-case";

import type { AuthModuleOptions, AuthModuleAsyncOptions } from "./interfaces/auth-module-options.interface";

const USE_CASES = [
  RegisterUseCase,
  LoginUseCase,
  Complete2FALoginUseCase,
  RefreshTokenUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  SendMagicLinkUseCase,
  VerifyMagicLinkUseCase,
  Setup2FAUseCase,
  Verify2FAUseCase,
  LogoutUseCase,
] as const;

function refreshTokenTtlMs(options: AuthModuleOptions): number {
  return parseDurationMs(options.jwt.refreshToken.expiresIn);
}

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return AuthModule.build({
      provide: AUTH_MODULE_OPTIONS,
      useValue: validateAuthModuleOptions(options),
    });
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    return AuthModule.build(
      {
        provide: AUTH_MODULE_OPTIONS,
        inject: options.inject ?? [],
        useFactory: async (...args: unknown[]) =>
          validateAuthModuleOptions(await options.useFactory(...args)),
      },
      options.imports ?? [],
    );
  }

  private static build(
    optionsProvider: Provider,
    imports: ModuleMetadata["imports"] = [],
  ): DynamicModule {
    return {
      module: AuthModule,
      imports,
      controllers: [AuthController, CsrfController],
      providers: [
        optionsProvider,
        ...AuthModule.createCoreProviders(),
        ...AuthModule.createInfrastructureProviders(),
        ...AuthModule.createUseCaseProviders(),
        ...AuthModule.createThrottlerProviders(),
        { provide: APP_GUARD, useClass: GlobalAuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_FILTER, useClass: AuthExceptionFilter },
      ],
      exports: [
        AUTH_MODULE_OPTIONS,
        TOKEN_STORE,
        AUTH_PROVIDER,
        EMAIL_SENDER,
        EMAIL_RENDERER,
        AuthEventBus,
        JwtTokenService,
        JwtAuthGuard,
        OptionalAuthGuard,
        CsrfGuard,
        ThrottlerGuard,
        getOptionsToken(),
        getStorageToken(),
        ...USE_CASES,
      ],
    };
  }

  private static createCoreProviders(): Provider[] {
    return [
      AuthEventBus,
      JwtAuthGuard,
      OptionalAuthGuard,
      CsrfGuard,
      {
        provide: APP_PIPE,
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: (opts: AuthModuleOptions): PipeTransform =>
          opts.globals?.validationPipe === false
            ? { transform: (value: unknown) => value }
            : new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
              }),
      },
    ];
  }

  private static createInfrastructureProviders(): Provider[] {
    return [
      {
        provide: JwtTokenService,
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: (opts: AuthModuleOptions) => new JwtTokenService(opts.jwt),
      },
      {
        provide: TOKEN_STORE,
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: (opts: AuthModuleOptions) => opts.tokenStore,
      },
      {
        provide: KeycloakAuthProvider,
        inject: [AUTH_MODULE_OPTIONS, JwtTokenService, TOKEN_STORE],
        useFactory: async (opts: AuthModuleOptions, jwt: JwtTokenService, store: ITokenStore) => {
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
          // Unreachable: validateAuthModuleOptions already enforces this.
          throw new Error("Keycloak config is required — provide keycloak or keycloakConfigPath");
        },
      },
      { provide: AUTH_PROVIDER, useExisting: KeycloakAuthProvider },
      {
        provide: EMAIL_SENDER,
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: (opts: AuthModuleOptions): IEmailSender =>
          // A custom sender replaces SMTP entirely; otherwise use the default.
          // `email` presence is guaranteed by validateAuthModuleOptions when no
          // custom sender is supplied.
          opts.emailSender ?? new MailpitEmailSender(opts.email as EmailConfig),
      },
      {
        provide: EMAIL_RENDERER,
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: async (opts: AuthModuleOptions): Promise<IEmailRenderer> => {
          const renderer = opts.emailRenderer ?? new ReactEmailRenderer();
          // Fail at startup if the renderer can't produce every template the
          // package emits (covers both custom and default renderers).
          await validateEmailRenderer(renderer);
          return renderer;
        },
      },
    ];
  }

  private static createThrottlerProviders(): Provider[] {
    return [
      {
        provide: getOptionsToken(),
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: (opts: AuthModuleOptions) => [
          {
            limit: opts.rateLimit?.limit ?? 10,
            ttl: (opts.rateLimit?.ttl ?? 60) * 1000,
          },
        ],
      },
      {
        provide: getStorageToken(),
        useFactory: () => new ThrottlerStorageService(),
      },
      ConfigurableThrottlerGuard,
      { provide: ThrottlerGuard, useExisting: ConfigurableThrottlerGuard },
    ];
  }

  private static createUseCaseProviders(): Provider[] {
    return [
      {
        provide: RegisterUseCase,
        inject: [KeycloakAuthProvider, AUTH_MODULE_OPTIONS],
        useFactory: (auth: KeycloakAuthProvider, opts: AuthModuleOptions) =>
          new RegisterUseCase(auth, {
            requireEmailVerification: opts.requireEmailVerification ?? false,
          }),
      },
      {
        provide: LoginUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE, AUTH_MODULE_OPTIONS],
        useFactory: (auth: KeycloakAuthProvider, store: ITokenStore, opts: AuthModuleOptions) =>
          new LoginUseCase(auth, store, {
            ...(opts.lockout?.maxAttempts !== undefined && {
              maxFailedAttempts: opts.lockout.maxAttempts,
            }),
            ...(opts.lockout?.duration !== undefined && {
              lockoutDurationMs: opts.lockout.duration,
            }),
            refreshTokenTtlMs: refreshTokenTtlMs(opts),
            logger: new Logger(LoginUseCase.name),
          }),
      },
      {
        provide: Complete2FALoginUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE, AUTH_MODULE_OPTIONS],
        useFactory: (auth: KeycloakAuthProvider, store: ITokenStore, opts: AuthModuleOptions) =>
          new Complete2FALoginUseCase(auth, store, refreshTokenTtlMs(opts)),
      },
      {
        provide: RefreshTokenUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE, AUTH_MODULE_OPTIONS],
        useFactory: (auth: KeycloakAuthProvider, store: ITokenStore, opts: AuthModuleOptions) =>
          new RefreshTokenUseCase(auth, store, refreshTokenTtlMs(opts)),
      },
      {
        provide: ForgotPasswordUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE, EMAIL_SENDER, EMAIL_RENDERER, AUTH_MODULE_OPTIONS],
        useFactory: (
          auth: KeycloakAuthProvider,
          store: ITokenStore,
          email: IEmailSender,
          renderer: IEmailRenderer,
          opts: AuthModuleOptions,
        ) => new ForgotPasswordUseCase(auth, store, email, renderer, opts.baseUrl),
      },
      {
        provide: ResetPasswordUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE],
        useFactory: (auth: KeycloakAuthProvider, store: ITokenStore) =>
          new ResetPasswordUseCase(auth, store),
      },
      {
        provide: SendMagicLinkUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE, EMAIL_SENDER, EMAIL_RENDERER, AUTH_MODULE_OPTIONS],
        useFactory: (
          auth: KeycloakAuthProvider,
          store: ITokenStore,
          email: IEmailSender,
          renderer: IEmailRenderer,
          opts: AuthModuleOptions,
        ) => new SendMagicLinkUseCase(auth, store, email, renderer, opts.baseUrl),
      },
      {
        provide: VerifyMagicLinkUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE, AUTH_MODULE_OPTIONS],
        useFactory: (auth: KeycloakAuthProvider, store: ITokenStore, opts: AuthModuleOptions) =>
          new VerifyMagicLinkUseCase(auth, store, refreshTokenTtlMs(opts)),
      },
      {
        provide: Setup2FAUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) => new Setup2FAUseCase(auth),
      },
      {
        provide: Verify2FAUseCase,
        inject: [KeycloakAuthProvider],
        useFactory: (auth: KeycloakAuthProvider) => new Verify2FAUseCase(auth),
      },
      {
        provide: LogoutUseCase,
        inject: [KeycloakAuthProvider, TOKEN_STORE],
        useFactory: (auth: KeycloakAuthProvider, store: ITokenStore) =>
          new LogoutUseCase(auth, store),
      },
    ];
  }
}
