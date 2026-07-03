import { Inject, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AUTH_MODULE_OPTIONS } from "../auth.constants";
import type { AuthModuleOptions } from "../interfaces/auth-module-options.interface";

/**
 * ThrottlerGuard that honors `rateLimit.enabled: false`, letting a consumer
 * turn off rate limiting entirely (e.g. E2E/load environments) without
 * touching the per-endpoint `@Throttle()` decorators.
 */
@Injectable()
export class ConfigurableThrottlerGuard extends ThrottlerGuard {
  @Inject(AUTH_MODULE_OPTIONS)
  private readonly authOptions!: AuthModuleOptions;

  protected override async shouldSkip(): Promise<boolean> {
    return this.authOptions.rateLimit?.enabled === false;
  }
}
