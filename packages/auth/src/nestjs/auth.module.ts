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
  EMAIL_RENDERER_SOURCE,
  EMAIL_SENDER,
  TOKEN_STORE,
} from "./auth.constants";
import { resolveProvidable } from "./providable";
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

import type {
  AuthModuleOptions,
  AuthModuleAsyncOptions,
  AuthModuleSyncConfig,
  AuthModuleDeps,
} from "./interfaces/auth-module-options.interface";

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
  static forRoot(config: AuthModuleSyncConfig): DynamicModule {
    const { tokenStore, emailSender, emailRenderer, ...options } = config;
    return AuthModule.build(
      {
        provide: AUTH_MODULE_OPTIONS,
        useValue: validateAuthModuleOptions(options, { hasCustomSender: emailSender !== undefined }),
      },
      [],
      { tokenStore, emailSender, emailRenderer },
    );
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const { tokenStore, emailSender, emailRenderer, imports, inject, useFactory } = options;
    return AuthModule.build(
      {
        provide: AUTH_MODULE_OPTIONS,
        inject: inject ?? [],
        useFactory: async (...args: unknown[]) =>
          validateAuthModuleOptions(await useFactory(...args), {
            hasCustomSender: emailSender !== undefined,
          }),
      },
      imports ?? [],
      { tokenStore, emailSender, emailRenderer },
    );
  }

  private static build(
    optionsProvider: Provider,
    imports: ModuleMetadata["imports"] = [],
    deps: AuthModuleDeps,
  ): DynamicModule {
    return {
      module: AuthModule,
      imports,
      controllers: [AuthController, CsrfController],
      providers: [
        optionsProvider,
        ...AuthModule.createCoreProviders(),
        ...AuthModule.createInfrastructureProviders(deps),
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

  private static createInfrastructureProviders(deps: AuthModuleDeps): Provider[] {
    return [
      {
        provide: JwtTokenService,
        inject: [AUTH_MODULE_OPTIONS],
        useFactory: (opts: AuthModuleOptions) => new JwtTokenService(opts.jwt),
      },

      // Consumer-supplied dependencies. Each accepts either a ready-made
      // instance or a provider descriptor ({ useClass | useFactory | ... }),
      // so they get full DI, lifecycle hooks, and overrideProvider in tests.
      ...resolveProvidable<ITokenStore>(TOKEN_STORE, deps.tokenStore, {
        provide: TOKEN_STORE,
        useFactory: () => {
          throw new Error("tokenStore is required");
        },
      }),
      ...resolveProvidable<IEmailSender>(EMAIL_SENDER, deps.emailSender, {
        provide: EMAIL_SENDER,
        inject: [AUTH_MODULE_OPTIONS],
        // Default SMTP sender; `email` presence is enforced by validation.
        useFactory: (opts: AuthModuleOptions): IEmailSender =>
          new MailpitEmailSender(opts.email as EmailConfig),
      }),
      ...resolveProvidable<IEmailRenderer>(EMAIL_RENDERER_SOURCE, deps.emailRenderer, {
        provide: EMAIL_RENDERER_SOURCE,
        useFactory: (): IEmailRenderer => new ReactEmailRenderer(),
      }),
      // Wraps the resolved renderer with a startup conformance check, then
      // exposes it as EMAIL_RENDERER. Works whether the source was an
      // instance, a class, or a factory.
      {
        provide: EMAIL_RENDERER,
        inject: [EMAIL_RENDERER_SOURCE],
        useFactory: async (renderer: IEmailRenderer): Promise<IEmailRenderer> => {
          await validateEmailRenderer(renderer);
          return renderer;
        },
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
