import { ConfigurableThrottlerGuard } from "../../../src/nestjs/guards/configurable-throttler.guard";
import type { AuthModuleOptions } from "../../../src/nestjs/interfaces/auth-module-options.interface";

/**
 * shouldSkip is protected; we exercise it through a tiny subclass rather than
 * standing up the full ThrottlerGuard machinery (storage, reflector, options).
 */
class TestableGuard extends ConfigurableThrottlerGuard {
  constructor(options: AuthModuleOptions) {
    super(undefined as never, undefined as never, undefined as never);
    (this as unknown as { authOptions: AuthModuleOptions }).authOptions = options;
  }
  runShouldSkip(): Promise<boolean> {
    return this.shouldSkip();
  }
}

describe("ConfigurableThrottlerGuard", () => {
  it("should skip throttling when rateLimit.enabled is false", async () => {
    const guard = new TestableGuard({ rateLimit: { enabled: false } } as AuthModuleOptions);
    await expect(guard.runShouldSkip()).resolves.toBe(true);
  });

  it("should not skip when rateLimit is undefined", async () => {
    const guard = new TestableGuard({} as AuthModuleOptions);
    await expect(guard.runShouldSkip()).resolves.toBe(false);
  });

  it("should not skip when rateLimit.enabled is true", async () => {
    const guard = new TestableGuard({ rateLimit: { enabled: true } } as AuthModuleOptions);
    await expect(guard.runShouldSkip()).resolves.toBe(false);
  });
});
