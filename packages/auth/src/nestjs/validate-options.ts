import { parseDurationSeconds } from "../domain/utils/duration";
import type { AuthModuleOptions } from "./interfaces/auth-module-options.interface";

const MIN_SECRET_LENGTH = 32;

/**
 * Validates the module configuration at startup so misconfiguration fails
 * loudly instead of surfacing as runtime auth bugs. Returns the options
 * unchanged when valid.
 */
export function validateAuthModuleOptions(options: AuthModuleOptions): AuthModuleOptions {
  const problems: string[] = [];

  if (!options.keycloak && !options.keycloakConfigPath) {
    problems.push("either `keycloak` or `keycloakConfigPath` is required");
  }

  const access = options.jwt?.accessToken;
  const refresh = options.jwt?.refreshToken;

  if (!access?.secret || access.secret.length < MIN_SECRET_LENGTH) {
    problems.push(`jwt.accessToken.secret must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (!refresh?.secret || refresh.secret.length < MIN_SECRET_LENGTH) {
    problems.push(`jwt.refreshToken.secret must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  if (access?.secret && refresh?.secret && access.secret === refresh.secret) {
    problems.push("jwt.accessToken.secret and jwt.refreshToken.secret must be different");
  }

  for (const [label, value] of [
    ["jwt.accessToken.expiresIn", access?.expiresIn],
    ["jwt.refreshToken.expiresIn", refresh?.expiresIn],
  ] as const) {
    if (!value) {
      problems.push(`${label} is required (e.g. "15m", "7d")`);
      continue;
    }
    try {
      parseDurationSeconds(value);
    } catch {
      problems.push(`${label} is invalid: "${value}" (expected e.g. "15m", "7d")`);
    }
  }

  if (!options.tokenStore) {
    problems.push("tokenStore is required");
  }

  // The default SMTP sender needs `email`; a custom `emailSender` replaces it.
  if (!options.emailSender && (!options.email?.from || !options.email?.transport?.host)) {
    problems.push(
      "email.from and email.transport.host are required (unless you provide a custom `emailSender`)",
    );
  }

  if (options.baseUrl && !/^https?:\/\//.test(options.baseUrl)) {
    problems.push(`baseUrl must start with http:// or https:// (got "${options.baseUrl}")`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid AuthModuleOptions:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }

  return options;
}
