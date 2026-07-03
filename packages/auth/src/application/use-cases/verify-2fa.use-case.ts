import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import { TwoFactorInvalidError } from "../../domain/errors/auth-errors";

export interface Verify2FARequestDto {
  /** Resolved from the authenticated user by the controller. */
  userId: string;
  code: string;
}

export class Verify2FAUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
  ) {}

  async execute(dto: Verify2FARequestDto): Promise<{ verified: boolean }> {
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
