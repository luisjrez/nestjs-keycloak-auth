import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { hashToken, type ITokenStore, type TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { and, eq, isNull, lt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { DRIZZLE_DB } from "./drizzle.constants";
import { tokens, userData } from "./schema";

/**
 * Drizzle implementation of the auth package's `ITokenStore` port.
 *
 * Drizzle is a plain query builder (no decorators, no repositories), which
 * makes it a good demonstration that the package couples to nothing but the
 * `ITokenStore` interface. Dates are stored as epoch-ms integers.
 */
@Injectable()
export class DrizzleTokenStore implements ITokenStore {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: BetterSQLite3Database,
  ) {}

  async save(record: TokenRecord): Promise<void> {
    await this.db.insert(tokens).values({
      id: randomUUID(),
      userId: record.userId,
      type: record.type,
      // Contract: persist hashed, never in clear text.
      tokenHash: hashToken(record.token),
      expiresAt: record.expiresAt.getTime(),
      consumedAt: null,
      createdAt: record.createdAt.getTime(),
    });
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    // Contract: MUST return consumed records too — reuse detection needs them.
    const [row] = await this.db
      .select()
      .from(tokens)
      .where(and(eq(tokens.tokenHash, hashToken(token)), eq(tokens.type, type)))
      .limit(1);

    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as TokenRecord["type"],
      token: row.tokenHash,
      expiresAt: new Date(row.expiresAt),
      consumedAt: row.consumedAt != null ? new Date(row.consumedAt) : undefined,
      createdAt: new Date(row.createdAt),
    };
  }

  async markConsumed(id: string): Promise<boolean> {
    // Contract: atomic. Conditional update returning affected rows; a second
    // concurrent consumer matches zero rows and gets false.
    const updated = await this.db
      .update(tokens)
      .set({ consumedAt: Date.now() })
      .where(and(eq(tokens.id, id), isNull(tokens.consumedAt)))
      .returning({ id: tokens.id });
    return updated.length > 0;
  }

  async deleteExpired(): Promise<void> {
    await this.db.delete(tokens).where(lt(tokens.expiresAt, Date.now()));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.delete(tokens).where(eq(tokens.userId, userId));
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    await this.db
      .insert(userData)
      .values({ id: randomUUID(), userId, key, value })
      .onConflictDoUpdate({ target: [userData.userId, userData.key], set: { value } });
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    const [row] = await this.db
      .select({ value: userData.value })
      .from(userData)
      .where(and(eq(userData.userId, userId), eq(userData.key, key)))
      .limit(1);
    return row?.value ?? null;
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.db
      .delete(userData)
      .where(and(eq(userData.userId, userId), eq(userData.key, key)));
  }
}
