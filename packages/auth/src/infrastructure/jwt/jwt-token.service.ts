import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { TokenExpiredError, TokenInvalidError } from "../../domain/errors/auth-errors";
import { parseDurationSeconds } from "../../domain/utils/duration";

export interface JwtConfig {
  accessToken: {
    secret: string;
    expiresIn: string;
  };
  refreshToken: {
    secret: string;
    expiresIn: string;
  };
}

export interface TokenPayload extends JWTPayload {
  sub: string;
  email: string;
  username: string;
}

type TokenType = "access" | "refresh";

export class JwtTokenService {
  constructor(private readonly config: JwtConfig) {
    // Fail at startup on malformed durations instead of silently falling
    // back to a default at sign time.
    parseDurationSeconds(config.accessToken.expiresIn);
    parseDurationSeconds(config.refreshToken.expiresIn);
  }

  private get accessSecret(): Uint8Array {
    return new TextEncoder().encode(this.config.accessToken.secret);
  }

  private get refreshSecret(): Uint8Array {
    return new TextEncoder().encode(this.config.refreshToken.secret);
  }

  private async sign(
    payload: TokenPayload,
    type: TokenType,
    secret: Uint8Array,
    expiresIn: string,
  ): Promise<string> {
    return new SignJWT({ ...payload, typ: type })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  private async verify(
    token: string,
    type: TokenType,
    secret: Uint8Array,
    expiredMessage: string,
    invalidMessage: string,
  ): Promise<TokenPayload> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] }));
    } catch (err) {
      if (err instanceof Error && err.name === "JWTExpired") {
        throw new TokenExpiredError(expiredMessage);
      }
      throw new TokenInvalidError(invalidMessage);
    }

    // The `typ` claim stops an access token from being replayed as a
    // refresh token (or vice versa) if both secrets are configured equal.
    if (payload["typ"] !== type || typeof payload.sub !== "string" || !payload.sub) {
      throw new TokenInvalidError(invalidMessage);
    }

    return payload as TokenPayload;
  }

  async signAccessToken(payload: TokenPayload): Promise<string> {
    return this.sign(payload, "access", this.accessSecret, this.config.accessToken.expiresIn);
  }

  async signRefreshToken(payload: TokenPayload): Promise<string> {
    return this.sign(payload, "refresh", this.refreshSecret, this.config.refreshToken.expiresIn);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.verify(
      token,
      "access",
      this.accessSecret,
      "Access token has expired",
      "Invalid access token",
    );
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.verify(
      token,
      "refresh",
      this.refreshSecret,
      "Refresh token has expired",
      "Invalid refresh token",
    );
  }

  getAccessTokenExpiresIn(): number {
    return parseDurationSeconds(this.config.accessToken.expiresIn);
  }

  getRefreshTokenExpiresIn(): number {
    return parseDurationSeconds(this.config.refreshToken.expiresIn);
  }
}
