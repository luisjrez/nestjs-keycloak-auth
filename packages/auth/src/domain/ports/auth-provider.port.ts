import type { User as UserEntity } from "../entities/user";

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthenticateRequest {
  email: string;
  password: string;
}

export interface AuthenticateResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface InitiatePasswordResetRequest {
  email: string;
}

export interface CompletePasswordResetRequest {
  token: string;
  newPassword: string;
}

export interface Setup2FARequest {
  userId: string;
}

export interface Setup2FAResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface Verify2FARequest {
  userId: string;
  code: string;
}

export type User = UserEntity;

export interface IAuthProvider {
  register(req: RegisterRequest): Promise<User>;
  authenticate(req: AuthenticateRequest): Promise<AuthenticateResponse>;
  refreshToken(req: RefreshTokenRequest): Promise<RefreshTokenResponse>;
  logout(refreshToken: string): Promise<void>;
  initiatePasswordReset(req: InitiatePasswordResetRequest): Promise<void>;
  completePasswordReset(req: CompletePasswordResetRequest): Promise<void>;
  getUserById(id: string): Promise<User>;
  getUserByEmail(email: string): Promise<User>;
  setup2FA(req: Setup2FARequest): Promise<Setup2FAResponse>;
  verify2FA(req: Verify2FARequest): Promise<boolean>;
  disable2FA(userId: string): Promise<void>;
  sendVerifyEmail(userId: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}
