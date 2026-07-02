import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { Setup2FADto } from "../dtos/auth.dtos";

export class Setup2FAUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(dto: Setup2FADto): Promise<{
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
