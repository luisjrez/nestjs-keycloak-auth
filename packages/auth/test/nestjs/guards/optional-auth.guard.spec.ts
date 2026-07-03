import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { OptionalAuthGuard } from "../../../src/nestjs/guards/optional-auth.guard";
import type { JwtAuthGuard } from "../../../src/nestjs/guards/jwt-auth.guard";

function contextFor(req: Record<string, unknown> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("OptionalAuthGuard", () => {
  it("should pass through when the wrapped guard authenticates", async () => {
    const jwtGuard = { canActivate: jest.fn().mockResolvedValue(true) } as unknown as JwtAuthGuard;
    const guard = new OptionalAuthGuard(jwtGuard);

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
  });

  it("should allow the request and clear user on an auth failure", async () => {
    const jwtGuard = {
      canActivate: jest.fn().mockRejectedValue(new UnauthorizedException()),
    } as unknown as JwtAuthGuard;
    const guard = new OptionalAuthGuard(jwtGuard);
    const req: { user?: unknown } = { user: "stale" };

    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });

  it("should re-throw unexpected (non-auth) errors", async () => {
    const jwtGuard = {
      canActivate: jest.fn().mockRejectedValue(new Error("boom")),
    } as unknown as JwtAuthGuard;
    const guard = new OptionalAuthGuard(jwtGuard);

    await expect(guard.canActivate(contextFor())).rejects.toThrow("boom");
  });
});
