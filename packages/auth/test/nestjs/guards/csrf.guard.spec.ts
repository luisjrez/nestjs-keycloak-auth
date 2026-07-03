import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { CsrfGuard } from "../../../src/nestjs/guards/csrf.guard";
import type { AuthModuleOptions } from "../../../src/nestjs/interfaces/auth-module-options.interface";

function contextFor(req: {
  method: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("CsrfGuard", () => {
  const enabled: AuthModuleOptions = { csrf: { enabled: true } } as AuthModuleOptions;

  it("should allow any request when csrf is not enabled in options", () => {
    const guard = new CsrfGuard({ csrf: { enabled: false } } as AuthModuleOptions);
    expect(guard.canActivate(contextFor({ method: "POST" }))).toBe(true);
  });

  it("should allow safe methods without a token", () => {
    const guard = new CsrfGuard(enabled);
    expect(guard.canActivate(contextFor({ method: "GET" }))).toBe(true);
  });

  it("should reject a mutating request with no tokens", () => {
    const guard = new CsrfGuard(enabled);
    expect(() => guard.canActivate(contextFor({ method: "POST" }))).toThrow(ForbiddenException);
  });

  it("should reject when cookie and header tokens differ", () => {
    const guard = new CsrfGuard(enabled);
    const ctx = contextFor({
      method: "POST",
      cookies: { "csrf-token": "aaaaaaaa" },
      headers: { "x-csrf-token": "bbbbbbbb" },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("should allow when cookie and header tokens match", () => {
    const guard = new CsrfGuard(enabled);
    const ctx = contextFor({
      method: "POST",
      cookies: { "csrf-token": "match-token" },
      headers: { "x-csrf-token": "match-token" },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("should honor custom cookie and header names", () => {
    const guard = new CsrfGuard({
      csrf: { enabled: true, cookieName: "xsrf", headerName: "X-XSRF" },
    } as AuthModuleOptions);
    const ctx = contextFor({
      method: "POST",
      cookies: { xsrf: "custom-token" },
      headers: { "x-xsrf": "custom-token" },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("should always enforce when used standalone (no options injected)", () => {
    const guard = new CsrfGuard();
    expect(() => guard.canActivate(contextFor({ method: "POST" }))).toThrow(ForbiddenException);
  });
});
