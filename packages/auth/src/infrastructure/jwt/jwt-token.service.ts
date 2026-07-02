import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { TokenExpiredError, TokenInvalidError } from "../../domain/errors/auth-errors";

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

export class JwtTokenService {
  constructor(private readonly config: JwtConfig) {}

  private get accessSecret(): Uint8Array {
    return new TextEncoder().encode(this.config.accessToken.secret);
  }

  private get refreshSecret(): Uint8Array {
    return new TextEncoder().encode(this.config.refreshToken.secret);
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const num = Number.parseInt(match[1]!, 10);
    switch (match[2]) {
      case "s": return num;
      case "m": return num * 60;
      case "h": return num * 3600;
      case "d": return num * 86400;
      default: return 900;
    }
  }

  async signAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(this.config.accessToken.expiresIn)
      .sign(this.accessSecret);
  }

  async signRefreshToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(this.config.refreshToken.expiresIn)
      .sign(this.refreshSecret);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret);
      return payload as unknown as TokenPayload;
    } catch (err) {
      if (err instanceof Error && err.name === "JWTExpired") {
        throw new TokenExpiredError("Access token has expired");
      }
      throw new TokenInvalidError("Invalid access token");
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.refreshSecret);
      return payload as unknown as TokenPayload;
    } catch (err) {
      if (err instanceof Error && err.name === "JWTExpired") {
        throw new TokenExpiredError("Refresh token has expired");
      }
      throw new TokenInvalidError("Invalid refresh token");
    }
  }

  getAccessTokenExpiresIn(): number {
    return this.parseExpiresIn(this.config.accessToken.expiresIn);
  }
}
