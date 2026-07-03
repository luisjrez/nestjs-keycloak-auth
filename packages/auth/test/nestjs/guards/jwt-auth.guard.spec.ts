import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "../../../src/nestjs/guards/jwt-auth.guard";
import { JwtTokenService } from "../../../src/infrastructure/jwt/jwt-token.service";

const jwtService = new JwtTokenService({
  accessToken: { secret: "test-secret-at-least-32-chars-long!!", expiresIn: "15m" },
  refreshToken: { secret: "test-refresh-secret-at-least-32-char", expiresIn: "7d" },
});

function mockContext(headers: Record<string, string>) {
  const request = { headers } as any;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function mockReflector(isPublic: boolean) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
}

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(mockReflector(false), jwtService);
  });

  it("should allow public routes", async () => {
    const publicGuard = new JwtAuthGuard(mockReflector(true), jwtService);
    const result = await publicGuard.canActivate(mockContext({}));
    expect(result).toBe(true);
  });

  it("should throw UnauthorizedException when no token", async () => {
    await expect(guard.canActivate(mockContext({}))).rejects.toThrow("Missing authorization header");
  });

  it("should throw UnauthorizedException when token has no Bearer prefix", async () => {
    await expect(guard.canActivate(mockContext({ authorization: "Invalid token" }))).rejects.toThrow(
      "Missing authorization header",
    );
  });

  it("should throw UnauthorizedException for expired token", async () => {
    const expiredService = new JwtTokenService({
      accessToken: { secret: "test-secret-at-least-32-chars-long!!", expiresIn: "0s" },
      refreshToken: { secret: "test-refresh-secret-at-least-32-char", expiresIn: "7d" },
    });

    // Sign a token that expires immediately
    const expiredToken = await expiredService.signAccessToken({
      sub: "u-1",
      email: "test@test.com",
      username: "testuser",
    });

    // Wait for 1ms to ensure expiry
    await new Promise((r) => setTimeout(r, 10));

    const expiredGuard = new JwtAuthGuard(mockReflector(false), expiredService);
    await expect(
      expiredGuard.canActivate(mockContext({ authorization: `Bearer ${expiredToken}` })),
    ).rejects.toThrow("Access token has expired");
  });

  it("should throw UnauthorizedException for invalid token", async () => {
    const badToken = await jwtService.signRefreshToken({
      sub: "u-1",
      email: "test@test.com",
      username: "testuser",
    });

    await expect(
      guard.canActivate(mockContext({ authorization: `Bearer ${badToken}` })),
    ).rejects.toThrow("Invalid access token");
  });

  it("should pass for valid token and set request.user", async () => {
    const validToken = await jwtService.signAccessToken({
      sub: "u-1",
      email: "test@test.com",
      username: "testuser",
    });

    const request = { headers: { authorization: `Bearer ${validToken}` } } as any;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect(request.user.sub).toBe("u-1");
  });
});
