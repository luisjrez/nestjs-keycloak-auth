import { Injectable } from "@nestjs/common";
import type { IAuthProvider } from "../../domain/ports/auth-provider.port";

export interface LogoutDto {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(dto: LogoutDto): Promise<void> {
    await this.authProvider.logout(dto.refreshToken);
  }
}
