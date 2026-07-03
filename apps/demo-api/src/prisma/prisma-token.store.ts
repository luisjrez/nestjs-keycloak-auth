import { Injectable } from "@nestjs/common";
import { hashToken, type ITokenStore, type TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaTokenStore implements ITokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: TokenRecord): Promise<void> {
    await this.prisma.token.create({
      data: {
        userId: record.userId,
        type: record.type,
        tokenHash: hashToken(record.token),
        expiresAt: record.expiresAt,
      },
    });
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    // NOTE: consumed records MUST be returned — refresh-token reuse
    // detection depends on seeing them (see ITokenStore contract).
    const row = await this.prisma.token.findFirst({
      where: { tokenHash: hashToken(token), type },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as TokenRecord["type"],
      token: row.tokenHash,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }

  async markConsumed(id: string): Promise<boolean> {
    // Conditional update = atomic consume; a second concurrent consumer
    // matches zero rows and gets `false`.
    const result = await this.prisma.token.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count > 0;
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.token.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.token.deleteMany({
      where: { userId },
    });
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    await this.prisma.userData.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    const row = await this.prisma.userData.findUnique({
      where: { userId_key: { userId, key } },
    });
    return row?.value ?? null;
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.prisma.userData.deleteMany({
      where: { userId, key },
    });
  }
}
