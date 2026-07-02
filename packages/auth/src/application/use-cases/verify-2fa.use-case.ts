import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { Verify2FADto } from "../dtos/auth.dtos";
import { TwoFactorInvalidError } from "../../domain/errors/auth-errors";

export class Verify2FAUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
  ) {}

  async execute(dto: Verify2FADto): Promise<{ verified: boolean }> {
    const isValid = await this.authProvider.verify2FA({
      userId: dto.userId,
      code: dto.code,
    });

    if (!isValid) {
      throw new TwoFactorInvalidError("Invalid 2FA code");
    }

    return { verified: true };
  }
}
