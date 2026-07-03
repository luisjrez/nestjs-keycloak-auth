import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

/**
 * Like JwtAuthGuard but does NOT throw when authentication fails.
 * request.user will be undefined when unauthenticated. Unexpected
 * (non-auth) errors still propagate.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwtGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await this.jwtGuard.canActivate(context);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        const request = context.switchToHttp().getRequest();
        request.user = undefined;
        return true;
      }
      throw err;
    }
  }
}
