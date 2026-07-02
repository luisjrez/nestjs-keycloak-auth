import type { ITokenStore, TokenRecord } from "../../domain/ports/token-store.port";

export class InMemoryTokenStore implements ITokenStore {
  private tokens: Map<string, TokenRecord> = new Map();

  async save(record: TokenRecord): Promise<void> {
    this.tokens.set(record.id, record);
  }

  async findByToken(
    token: string,
    type: TokenRecord["type"],
  ): Promise<TokenRecord | null> {
    for (const record of this.tokens.values()) {
      if (record.token === token && record.type === type) {
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
}
