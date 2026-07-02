import { Injectable } from "@nestjs/common";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaTokenStore implements ITokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: TokenRecord): Promise<void> {
    await this.prisma.token.create({
      data: {
        userId: record.userId,
        type: record.type,
        tokenHash: record.token,
        expiresAt: record.expiresAt,
      },
    });
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    const row = await this.prisma.token.findFirst({
      where: { tokenHash: token, type, consumedAt: null },
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

  async markConsumed(id: string): Promise<void> {
    await this.prisma.token.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.token.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
