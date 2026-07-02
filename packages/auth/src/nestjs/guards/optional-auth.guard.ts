import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

/**
 * Like JwtAuthGuard but does NOT throw when no token is present.
 * request.user will be undefined when unauthenticated.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwtGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await this.jwtGuard.canActivate(context);
    } catch {
      const request = context.switchToHttp().getRequest();
      request.user = undefined;
      return true;
    }
  }
}
