import type { IAuthProvider } from "../../domain/ports/auth-provider.port";

export class RefreshTokenUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
  ) {}

  async execute(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    return this.authProvider.refreshToken({ refreshToken });
  }
}
