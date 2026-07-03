import { IsEmail, IsOptional, IsString, MinLength, Matches } from "class-validator";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/;
const PASSWORD_POLICY_MESSAGE =
  "Password must contain uppercase, lowercase, number, and special character";

export class RegisterDto {
  @IsEmail({}, { message: "Invalid email" })
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: "Invalid email" })
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Invalid email" })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  newPassword!: string;
}

export class SendMagicLinkDto {
  @IsEmail({}, { message: "Invalid email" })
  email!: string;
}

export class VerifyMagicLinkDto {
  @IsString()
  token!: string;
}

export class Setup2FADto {
  /** Resolved from the access token by the controller; ignored if sent by clients. */
  @IsOptional()
  @IsString()
  userId?: string;
}

export class Verify2FADto {
  /** Resolved from the access token by the controller; ignored if sent by clients. */
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MinLength(6)
  code!: string;
}

export class Complete2FADto {
  @IsString()
  preAuthToken!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}
