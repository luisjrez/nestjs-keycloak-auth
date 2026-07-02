export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface SendMagicLinkDto {
  email: string;
}

export interface VerifyMagicLinkDto {
  token: string;
}

export interface Setup2FADto {
  userId: string;
}

export interface Verify2FADto {
  userId: string;
  code: string;
}
