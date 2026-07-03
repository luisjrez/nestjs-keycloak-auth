import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaService } from "./prisma.service";

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class PrismaTokenStore implements ITokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: TokenRecord): Promise<void> {
    await this.prisma.token.create({
      data: {
        userId: record.userId,
        type: record.type,
        tokenHash: hash(record.token),
        expiresAt: record.expiresAt,
      },
    });
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    const row = await this.prisma.token.findFirst({
      where: { tokenHash: hash(token), type, consumedAt: null },
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
