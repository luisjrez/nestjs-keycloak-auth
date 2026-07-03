import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { RegisterDto } from "../dtos/auth.dtos";
import type { User } from "../../domain/entities/user";
import { Email } from "../../domain/value-objects/email";
import { Password } from "../../domain/value-objects/password";

export interface RegisterUseCaseOptions {
  /**
   * When true, accounts are created with emailVerified=false and a
   * verification email is sent; login fails with EMAIL_NOT_VERIFIED until
   * the user verifies. Default: false (account is usable immediately).
   */
  requireEmailVerification?: boolean;
}

export class RegisterUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly options: RegisterUseCaseOptions = {},
  ) {}

  async execute(dto: RegisterDto): Promise<{ user: User; message: string }> {
    Email.create(dto.email);
    Password.create(dto.password);

    const requireVerification = this.options.requireEmailVerification ?? false;

    const user = await this.authProvider.register({
      email: dto.email,
      username: dto.username,
      password: dto.password,
      emailVerified: !requireVerification,
    });

    if (requireVerification) {
      await this.authProvider.sendVerifyEmail(user.id);
      return {
        user,
        message: "Registration successful. Check your inbox to verify your email.",
      };
    }

    return {
      user,
      message: "Registration successful.",
    };
  }
}
