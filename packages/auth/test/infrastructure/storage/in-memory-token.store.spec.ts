import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import type { TokenRecord } from "../../../src/domain/ports/token-store.port";

describe("InMemoryTokenStore", () => {
  let store: InMemoryTokenStore;

  beforeEach(() => {
    store = new InMemoryTokenStore();
  });

  const makeRecord = (overrides: Partial<TokenRecord> = {}): TokenRecord => ({
    id: "token-1",
    userId: "user-1",
    type: "MAGIC_LINK",
    token: "abc123",
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    ...overrides,
  });

  describe("save", () => {
    it("should save a token record", async () => {
      const record = makeRecord();
      await store.save(record);

      const found = await store.findByToken("abc123", "MAGIC_LINK");
      expect(found).toBeDefined();
      expect(found!.id).toBe("token-1");
    });
  });

  describe("findByToken", () => {
    it("should find a token by its value and type", async () => {
      const record = makeRecord();
      await store.save(record);

      const found = await store.findByToken("abc123", "MAGIC_LINK");
      expect(found).toBeDefined();
      expect(found!.token).toBe("abc123");
    });

    it("should return null for unknown token", async () => {
      const found = await store.findByToken("nonexistent", "MAGIC_LINK");
      expect(found).toBeNull();
    });

    it("should return consumed tokens (consumption check is done by use case)", async () => {
      const record = makeRecord({ consumedAt: new Date() });
      await store.save(record);

      const found = await store.findByToken("abc123", "MAGIC_LINK");
      expect(found).toBeDefined();
      expect(found!.consumedAt).toBeDefined();
    });

    it("should filter by type", async () => {
      const record = makeRecord({ type: "RESET_PASSWORD" });
      await store.save(record);

      const found = await store.findByToken("abc123", "MAGIC_LINK");
      expect(found).toBeNull();
    });

    it("should handle multiple tokens", async () => {
      const record1 = makeRecord({ id: "t1", token: "token-1", type: "MAGIC_LINK" });
      const record2 = makeRecord({ id: "t2", token: "token-2", type: "RESET_PASSWORD" });

      await store.save(record1);
      await store.save(record2);

      const found1 = await store.findByToken("token-1", "MAGIC_LINK");
      const found2 = await store.findByToken("token-2", "RESET_PASSWORD");

      expect(found1).toBeDefined();
      expect(found2).toBeDefined();
    });
  });

  describe("markConsumed", () => {
    it("should mark a token as consumed", async () => {
      const record = makeRecord();
      await store.save(record);

      await store.markConsumed("token-1");

      const found = await store.findByToken("abc123", "MAGIC_LINK");
      expect(found).toBeDefined();
      expect(found!.consumedAt).toBeInstanceOf(Date);
    });

    it("should not throw for nonexistent token", async () => {
      await expect(store.markConsumed("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("deleteExpired", () => {
    it("should delete expired tokens", async () => {
      const expired = makeRecord({
        id: "expired",
        token: "expired-token",
        expiresAt: new Date(Date.now() - 1000),
      });
      const valid = makeRecord({
        id: "valid",
        token: "valid-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      await store.save(expired);
      await store.save(valid);

      await store.deleteExpired();

      const foundExpired = await store.findByToken("expired-token", "MAGIC_LINK");
      const foundValid = await store.findByToken("valid-token", "MAGIC_LINK");

      expect(foundExpired).toBeNull();
      expect(foundValid).toBeDefined();
    });

    it("should not throw when no tokens exist", async () => {
      await expect(store.deleteExpired()).resolves.not.toThrow();
    });
  });
});
