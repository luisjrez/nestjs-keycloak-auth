import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
  UseFilters,
  Inject,
  Logger,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { ConfigurableThrottlerGuard } from "../guards/configurable-throttler.guard";
import { Request, Response, type CookieOptions } from "express";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { Complete2FALoginUseCase } from "../../application/use-cases/complete-2fa-login.use-case";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.use-case";
import { ForgotPasswordUseCase } from "../../application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "../../application/use-cases/reset-password.use-case";
import { SendMagicLinkUseCase } from "../../application/use-cases/send-magic-link.use-case";
import { VerifyMagicLinkUseCase } from "../../application/use-cases/verify-magic-link.use-case";
import { Setup2FAUseCase } from "../../application/use-cases/setup-2fa.use-case";
import { Verify2FAUseCase } from "../../application/use-cases/verify-2fa.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { AuthExceptionFilter } from "../filters/auth-exception.filter";
import { AuthEventBus } from "../events/auth-event-bus";
import {
  UserRegisteredEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  MagicLinkSentEvent,
  PasswordResetEvent,
  TwoFactorEnabledEvent,
} from "../events/auth-events";
import { AUTH_MODULE_OPTIONS } from "../auth.constants";
import { parseDurationMs } from "../../domain/utils/duration";
import type { AuthModuleOptions } from "../interfaces/auth-module-options.interface";
import {
  RegisterDto,
  LoginDto,
  Complete2FADto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
  VerifyMagicLinkDto,
  Setup2FADto,
  Verify2FADto,
} from "../../application/dtos/auth.dtos";

@Controller("auth")
@UseFilters(AuthExceptionFilter)
@UseGuards(ConfigurableThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly refreshCookieMaxAgeMs: number;

  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly complete2FALoginUseCase: Complete2FALoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly sendMagicLinkUseCase: SendMagicLinkUseCase,
    private readonly verifyMagicLinkUseCase: VerifyMagicLinkUseCase,
    private readonly setup2FAUseCase: Setup2FAUseCase,
    private readonly verify2FAUseCase: Verify2FAUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly eventBus: AuthEventBus,
    @Inject(AUTH_MODULE_OPTIONS) private readonly options: AuthModuleOptions,
  ) {
    this.refreshCookieMaxAgeMs = parseDurationMs(options.jwt.refreshToken.expiresIn);
  }

  private baseCookieOptions(): CookieOptions {
    const opts: CookieOptions = {
      httpOnly: true,
      secure: this.options.cookieSecure ?? process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/auth/refresh",
    };
    if (this.options.cookieDomain) {
      opts.domain = this.options.cookieDomain;
    }
    return opts;
  }

  private refreshCookieOptions(): CookieOptions {
    return { ...this.baseCookieOptions(), maxAge: this.refreshCookieMaxAgeMs };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie("refreshToken", refreshToken, this.refreshCookieOptions());
  }

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto) {
    const result = await this.registerUseCase.execute(dto);
    this.logger.log(`User registered: ${result.user.id}`);
    await this.eventBus.emit(
      new UserRegisteredEvent(result.user.id, result.user.email, result.user.username),
    );
    return result;
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(dto);

    if ("twoFactorRequired" in result) {
      return {
        twoFactorRequired: true,
        preAuthToken: result.preAuthToken,
        expiresIn: result.expiresIn,
      };
    }

    this.setRefreshCookie(res, result.refreshToken);

    this.logger.log(`User logged in: ${result.user.id}`);
    await this.eventBus.emit(new UserLoggedInEvent(result.user.id, result.user.email));
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Post("2fa/complete")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async complete2FALogin(
    @Body() dto: Complete2FADto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.complete2FALoginUseCase.execute(dto);

    this.setRefreshCookie(res, result.refreshToken);

    this.logger.log(`User logged in (2FA): ${result.user.id}`);
    await this.eventBus.emit(new UserLoggedInEvent(result.user.id, result.user.email));
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.["refreshToken"] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const result = await this.refreshTokenUseCase.execute(refreshToken);

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.["refreshToken"] as string | undefined;
    if (refreshToken) {
      await this.logoutUseCase.execute({ refreshToken });
    }
    res.clearCookie("refreshToken", this.baseCookieOptions());
    this.logger.log(`User logged out: ${user.sub}`);
    await this.eventBus.emit(new UserLoggedOutEvent(user.sub));
    return { message: "Logged out successfully" };
  }

  @Public()
  @Get("health")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  getHealth() {
    if (this.options.healthCheck?.enabled === false) {
      throw new NotFoundException();
    }
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.forgotPasswordUseCase.execute(dto);
    return { message: "If the email exists, a reset link has been sent" };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.resetPasswordUseCase.execute(dto);
    await this.eventBus.emit(new PasswordResetEvent(result.userId));
    return { message: "Password has been reset successfully" };
  }

  @Public()
  @Post("magic-link")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async sendMagicLink(@Body() dto: SendMagicLinkDto) {
    const result = await this.sendMagicLinkUseCase.execute(dto);
    if (result.userId) {
      await this.eventBus.emit(new MagicLinkSentEvent(result.userId, dto.email));
    }
    return { message: "If the email exists, a magic link has been sent" };
  }

  @Public()
  @Post("magic-link/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.verifyMagicLinkUseCase.execute(dto);

    this.setRefreshCookie(res, result.refreshToken);

    this.logger.log("Magic link verified");
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/setup")
  @HttpCode(HttpStatus.OK)
  async setup2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Setup2FADto,
  ) {
    return this.setup2FAUseCase.execute({ ...dto, userId: user.sub });
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  async verify2FA(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Verify2FADto,
  ) {
    const result = await this.verify2FAUseCase.execute({ ...dto, userId: user.sub });
    await this.eventBus.emit(new TwoFactorEnabledEvent(user.sub));
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
