import {
  Controller,
  Get,
  Inject,
  Optional,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { Public } from "../decorators/public.decorator";
import { AUTH_MODULE_OPTIONS } from "../auth.constants";
import { DEFAULT_CSRF_COOKIE } from "../guards/csrf.guard";
import type { AuthModuleOptions } from "../interfaces/auth-module-options.interface";

@Controller("auth")
export class CsrfController {
  constructor(
    @Optional()
    @Inject(AUTH_MODULE_OPTIONS)
    private readonly options?: AuthModuleOptions,
  ) {}

  @Public()
  @Get("csrf")
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = randomUUID();
    const cookieName = this.options?.csrf?.cookieName ?? DEFAULT_CSRF_COOKIE;

    res.cookie(cookieName, token, {
      // Must be readable by the frontend to echo it in the header
      // (double-submit pattern).
      httpOnly: false,
      sameSite: "strict",
      secure: this.options?.cookieSecure ?? req.secure,
      path: "/",
    });

    return { csrfToken: token };
  }
}
