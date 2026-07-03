import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { JwtTokenService } from "../../infrastructure/jwt/jwt-token.service";
import { TokenExpiredError, TokenInvalidError } from "../../domain/errors/auth-errors";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing authorization header");
    }

    try {
      const payload = await this.jwtService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException("Access token has expired");
      }
      if (err instanceof TokenInvalidError) {
        throw new UnauthorizedException("Invalid access token");
      }
      throw new UnauthorizedException("Authentication failed");
    }
  }

  private extractToken(request: { headers?: { authorization?: string } }): string | null {
    const auth = request.headers?.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
  }
}
