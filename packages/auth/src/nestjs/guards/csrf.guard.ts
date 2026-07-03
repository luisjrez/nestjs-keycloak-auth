import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { AUTH_MODULE_OPTIONS } from "../auth.constants";
import type { AuthModuleOptions } from "../interfaces/auth-module-options.interface";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const DEFAULT_CSRF_COOKIE = "csrf-token";
export const DEFAULT_CSRF_HEADER = "x-csrf-token";

/**
 * Double-submit-cookie CSRF guard. Registered app-wide by AuthModule; in
 * that mode it only enforces when `options.csrf.enabled` is true. Used
 * standalone (outside the module, no options in scope) it always enforces.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject(AUTH_MODULE_OPTIONS)
    private readonly options?: AuthModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.options && this.options.csrf?.enabled !== true) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method)) {
      return true;
    }

    const cookieName = this.options?.csrf?.cookieName ?? DEFAULT_CSRF_COOKIE;
    const headerName = (this.options?.csrf?.headerName ?? DEFAULT_CSRF_HEADER).toLowerCase();

    const cookieToken = req.cookies?.[cookieName] as string | undefined;
    const headerValue = req.headers?.[headerName];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException("Missing CSRF token");
    }

    if (cookieToken.length !== headerToken.length) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    const bufCookie = Buffer.from(cookieToken);
    const bufHeader = Buffer.from(headerToken);

    if (!timingSafeEqual(bufCookie, bufHeader)) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
