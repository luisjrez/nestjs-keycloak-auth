import { createHash } from "node:crypto";
import type { ITokenStore, TokenRecord } from "../../domain/ports/token-store.port";

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class InMemoryTokenStore implements ITokenStore {
  private tokens: Map<string, TokenRecord> = new Map();
  private userData: Map<string, Map<string, string>> = new Map();

  async save(record: TokenRecord): Promise<void> {
    this.tokens.set(record.id, { ...record, token: hash(record.token) });
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    const hashed = hash(token);
    for (const record of this.tokens.values()) {
      if (record.token === hashed && record.type === type) {
        return record;
      }
    }
    return null;
  }

  async markConsumed(id: string): Promise<void> {
    const record = this.tokens.get(id);
    if (record) {
      this.tokens.set(id, { ...record, consumedAt: new Date() });
    }
  }

  async deleteExpired(): Promise<void> {
    const now = new Date();
    for (const [id, record] of this.tokens.entries()) {
      if (record.expiresAt < now) {
        this.tokens.delete(id);
      }
    }
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    let map = this.userData.get(userId);
    if (!map) {
      map = new Map();
      this.userData.set(userId, map);
    }
    map.set(key, value);
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    return this.userData.get(userId)?.get(key) ?? null;
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    this.userData.get(userId)?.delete(key);
  }
}
