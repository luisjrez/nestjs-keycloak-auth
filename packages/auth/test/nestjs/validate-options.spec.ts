import { validateAuthModuleOptions } from "../../src/nestjs/validate-options";
import type { AuthModuleOptions } from "../../src/nestjs/interfaces/auth-module-options.interface";

function baseOptions(overrides: Partial<AuthModuleOptions> = {}): AuthModuleOptions {
  return {
    keycloak: {
      serverUrl: "http://localhost:8080",
      realm: "test",
      clientId: "client",
      clientSecret: "secret",
    },
    jwt: {
      accessToken: { secret: "a".repeat(32), expiresIn: "15m" },
      refreshToken: { secret: "b".repeat(32), expiresIn: "7d" },
    },
    email: { from: "no-reply@test.com", transport: { host: "localhost", port: 1025 } },
    ...overrides,
  };
}

describe("validateAuthModuleOptions", () => {
  it("should return valid options unchanged", () => {
    const opts = baseOptions();
    expect(validateAuthModuleOptions(opts)).toBe(opts);
  });

  it("should reject when neither keycloak nor keycloakConfigPath is set", () => {
    const opts = baseOptions();
    delete opts.keycloak;
    expect(() => validateAuthModuleOptions(opts)).toThrow(/keycloak.*required/i);
  });

  it("should reject short secrets", () => {
    const opts = baseOptions({
      jwt: {
        accessToken: { secret: "short", expiresIn: "15m" },
        refreshToken: { secret: "b".repeat(32), expiresIn: "7d" },
      },
    });
    expect(() => validateAuthModuleOptions(opts)).toThrow(/at least 32 characters/);
  });

  it("should reject identical access and refresh secrets", () => {
    const same = "s".repeat(32);
    const opts = baseOptions({
      jwt: {
        accessToken: { secret: same, expiresIn: "15m" },
        refreshToken: { secret: same, expiresIn: "7d" },
      },
    });
    expect(() => validateAuthModuleOptions(opts)).toThrow(/must be different/);
  });

  it("should reject an invalid duration", () => {
    const opts = baseOptions({
      jwt: {
        accessToken: { secret: "a".repeat(32), expiresIn: "15min" },
        refreshToken: { secret: "b".repeat(32), expiresIn: "7d" },
      },
    });
    expect(() => validateAuthModuleOptions(opts)).toThrow(/invalid/i);
  });

  it("should reject a malformed baseUrl", () => {
    expect(() => validateAuthModuleOptions(baseOptions({ baseUrl: "not-a-url" }))).toThrow(
      /baseUrl/,
    );
  });

  it("should require email when no custom sender is supplied", () => {
    const opts = baseOptions();
    delete opts.email;
    expect(() => validateAuthModuleOptions(opts)).toThrow(/email\.from/);
  });

  it("should allow omitting email when a custom sender is supplied", () => {
    const opts = baseOptions();
    delete opts.email;
    expect(() => validateAuthModuleOptions(opts, { hasCustomSender: true })).not.toThrow();
  });
});
