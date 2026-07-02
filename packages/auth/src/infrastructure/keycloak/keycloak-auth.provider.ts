import type {
  IAuthProvider,
  RegisterRequest,
  AuthenticateRequest,
  AuthenticateResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  InitiatePasswordResetRequest,
  CompletePasswordResetRequest,
  Setup2FARequest,
  Setup2FAResponse,
  Verify2FARequest,
  User as KcUser,
} from "../../domain/ports/auth-provider.port";

export interface KeycloakConfig {
  serverUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

export class KeycloakAuthProvider implements IAuthProvider {
  constructor(private readonly config: KeycloakConfig) {}

  register(_req: RegisterRequest): Promise<KcUser> {
    throw new Error("KeycloakAuthProvider.register not implemented yet");
  }

  authenticate(_req: AuthenticateRequest): Promise<AuthenticateResponse> {
    throw new Error("KeycloakAuthProvider.authenticate not implemented yet");
  }

  refreshToken(_req: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    throw new Error("KeycloakAuthProvider.refreshToken not implemented yet");
  }

  logout(_refreshToken: string): Promise<void> {
    throw new Error("KeycloakAuthProvider.logout not implemented yet");
  }

  initiatePasswordReset(_req: InitiatePasswordResetRequest): Promise<void> {
    throw new Error("KeycloakAuthProvider.initiatePasswordReset not implemented yet");
  }

  completePasswordReset(_req: CompletePasswordResetRequest): Promise<void> {
    throw new Error("KeycloakAuthProvider.completePasswordReset not implemented yet");
  }

  getUserById(_id: string): Promise<KcUser> {
    throw new Error("KeycloakAuthProvider.getUserById not implemented yet");
  }

  getUserByEmail(_email: string): Promise<KcUser> {
    throw new Error("KeycloakAuthProvider.getUserByEmail not implemented yet");
  }

  setup2FA(_req: Setup2FARequest): Promise<Setup2FAResponse> {
    throw new Error("KeycloakAuthProvider.setup2FA not implemented yet");
  }

  verify2FA(_req: Verify2FARequest): Promise<boolean> {
    throw new Error("KeycloakAuthProvider.verify2FA not implemented yet");
  }

  disable2FA(_userId: string): Promise<void> {
    throw new Error("KeycloakAuthProvider.disable2FA not implemented yet");
  }

  sendVerifyEmail(_userId: string): Promise<void> {
    throw new Error("KeycloakAuthProvider.sendVerifyEmail not implemented yet");
  }

  verifyEmail(_token: string): Promise<void> {
    throw new Error("KeycloakAuthProvider.verifyEmail not implemented yet");
  }

  getBaseUrl(): string {
    return `${this.config.serverUrl}/realms/${this.config.realm}`;
  }

  getAdminUrl(): string {
    return `${this.config.serverUrl}/admin/realms/${this.config.realm}`;
  }
}
