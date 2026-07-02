import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { LoginDto } from "../dtos/auth.dtos";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export class LoginUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(dto: LoginDto): Promise<LoginResponse> {
    const result = await this.authProvider.authenticate({
      email: dto.email,
      password: dto.password,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
      },
    };
  }
}
