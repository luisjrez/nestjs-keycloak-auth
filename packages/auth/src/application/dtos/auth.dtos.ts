import { IsEmail, IsString, MinLength, Matches } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "Invalid email" })
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/,
    { message: "Password must contain uppercase, lowercase, number, and special character" },
  )
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
  @IsString()
  userId!: string;
}

export class Verify2FADto {
  @IsString()
  userId!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}
