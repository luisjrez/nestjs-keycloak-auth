import type { IAuthProvider } from "../../domain/ports/auth-provider.port";

export interface Setup2FARequestDto {
  /** Resolved from the authenticated user by the controller. */
  userId: string;
}

export class Setup2FAUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(dto: Setup2FARequestDto): Promise<{
    secret: string;
    qrCodeUrl: string;
  }> {
    const result = await this.authProvider.setup2FA({ userId: dto.userId });
    return {
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
    };
  }
}
