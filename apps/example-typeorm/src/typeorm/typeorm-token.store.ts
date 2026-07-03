import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { hashToken, type ITokenStore, type TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, Repository } from "typeorm";
import { TokenEntity, UserDataEntity } from "./entities";

/**
 * TypeORM implementation of the auth package's `ITokenStore` port.
 *
 * The auth package is ORM-agnostic — it only talks to this interface. The
 * two contract-critical points to honor are documented inline below.
 */
@Injectable()
export class TypeOrmTokenStore implements ITokenStore {
  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokens: Repository<TokenEntity>,
    @InjectRepository(UserDataEntity)
    private readonly userData: Repository<UserDataEntity>,
  ) {}

  async save(record: TokenRecord): Promise<void> {
    await this.tokens.insert({
      id: randomUUID(),
      userId: record.userId,
      type: record.type,
      // Contract: persist hashed, never in clear text.
      tokenHash: hashToken(record.token),
      expiresAt: record.expiresAt,
      consumedAt: null,
      createdAt: record.createdAt,
    });
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    // Contract: MUST return consumed records too — refresh-token reuse
    // detection depends on seeing them.
    const row = await this.tokens.findOne({
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
    // Contract: atomic — a conditional update that matches zero rows on a
    // second concurrent consumer, returning false.
    const result = await this.tokens.update(
      { id, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  async deleteExpired(): Promise<void> {
    await this.tokens.delete({ expiresAt: LessThan(new Date()) });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.tokens.delete({ userId });
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    const existing = await this.userData.findOne({ where: { userId, key } });
    if (existing) {
      await this.userData.update({ id: existing.id }, { value });
    } else {
      await this.userData.insert({ id: randomUUID(), userId, key, value });
    }
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    const row = await this.userData.findOne({ where: { userId, key } });
    return row?.value ?? null;
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.userData.delete({ userId, key });
  }
}
