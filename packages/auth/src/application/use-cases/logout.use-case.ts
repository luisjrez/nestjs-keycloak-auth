import type { IAuthProvider } from "../../domain/ports/auth-provider.port";
import type { ITokenStore } from "../../domain/ports/token-store.port";

export interface LogoutDto {
  refreshToken: string;
}

export class LogoutUseCase {
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly tokenStore: ITokenStore,
  ) {}

  async execute(dto: LogoutDto): Promise<void> {
    const record = await this.tokenStore.findByToken(dto.refreshToken, "REFRESH_TOKEN");
    if (record && !record.consumedAt) {
      await this.tokenStore.markConsumed(record.id);
    }
    await this.authProvider.logout(dto.refreshToken);
  }
}
