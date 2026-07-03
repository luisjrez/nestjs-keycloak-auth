import { Controller, Get } from "@nestjs/common";
import { CurrentUser, Public, type AuthenticatedUser } from "@luisjrez/nestjs-keycloak-auth";

@Controller()
export class AppController {
  @Public()
  @Get("health")
  health() {
    return { status: "ok", orm: "drizzle", timestamp: new Date().toISOString() };
  }

  // Protected by the global JwtAuthGuard the AuthModule registers.
  @Get("profile")
  profile(@CurrentUser() user: AuthenticatedUser) {
    return { message: "You are authenticated", user };
  }
}
