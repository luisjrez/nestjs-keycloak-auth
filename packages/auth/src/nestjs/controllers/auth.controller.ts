import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseFilters,
} from "@nestjs/common";
import { Request, Response } from "express";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.use-case";
import { ForgotPasswordUseCase } from "../../application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "../../application/use-cases/reset-password.use-case";
import { SendMagicLinkUseCase } from "../../application/use-cases/send-magic-link.use-case";
import { VerifyMagicLinkUseCase } from "../../application/use-cases/verify-magic-link.use-case";
import { Setup2FAUseCase } from "../../application/use-cases/setup-2fa.use-case";
import { Verify2FAUseCase } from "../../application/use-cases/verify-2fa.use-case";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { AuthExceptionFilter } from "../filters/auth-exception.filter";
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
  VerifyMagicLinkDto,
  Setup2FADto,
  Verify2FADto,
} from "../../application/dtos/auth.dtos";

@Controller("auth")
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly sendMagicLinkUseCase: SendMagicLinkUseCase,
    private readonly verifyMagicLinkUseCase: VerifyMagicLinkUseCase,
    private readonly setup2FAUseCase: Setup2FAUseCase,
    private readonly verify2FAUseCase: Verify2FAUseCase,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(dto);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false, // true in production
      sameSite: "strict",
      path: "/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.["refreshToken"] as string | undefined;

    if (!refreshToken) {
      return this.refreshTokenUseCase.execute("");
    }

    return this.refreshTokenUseCase.execute(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() _user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie("refreshToken", { path: "/auth/refresh" });
    return { message: "Logged out successfully" };
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto);
  }

  @Public()
  @Post("magic-link")
  @HttpCode(HttpStatus.OK)
  async sendMagicLink(@Body() dto: SendMagicLinkDto) {
    return this.sendMagicLinkUseCase.execute(dto);
  }

  @Public()
  @Post("magic-link/verify")
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.verifyMagicLinkUseCase.execute(dto);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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
    return this.verify2FAUseCase.execute({ ...dto, userId: user.sub });
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
