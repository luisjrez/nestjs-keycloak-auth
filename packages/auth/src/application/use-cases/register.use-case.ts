import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { RegisterDto } from "../dtos/auth.dtos";
import type { User } from "../../domain/entities/user";
import { Email } from "../../domain/value-objects/email";
import { Password } from "../../domain/value-objects/password";

export class RegisterUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
  ) {}

  async execute(dto: RegisterDto): Promise<{ user: User; message: string }> {
    Email.create(dto.email);
    Password.create(dto.password);

    const user = await this.authProvider.register({
      email: dto.email,
      username: dto.username,
      password: dto.password,
    });

    return {
      user,
      message: "Registration successful.",
    };
  }
}
