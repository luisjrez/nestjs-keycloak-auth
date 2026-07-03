import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AUTH_MODULE_OPTIONS } from "../auth.constants";
import type { AuthModuleOptions } from "../interfaces/auth-module-options.interface";

/**
 * Module-registered APP_GUARD wrapper around JwtAuthGuard. Lets consumers
 * opt out of the global auth guard (`globals.authGuard: false`) without
 * affecting explicit `@UseGuards(JwtAuthGuard)` usage.
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: JwtAuthGuard,
    @Inject(AUTH_MODULE_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.options.globals?.authGuard === false) {
      return true;
    }
    return this.jwtGuard.canActivate(context);
  }
}
