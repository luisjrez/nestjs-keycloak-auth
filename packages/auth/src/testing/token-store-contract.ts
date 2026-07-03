import { randomUUID } from "node:crypto";
import type { ITokenStore, TokenRecord } from "../domain/ports/token-store.port";
import { hashToken } from "../infrastructure/storage/token-hash";

/**
 * Framework-agnostic conformance suite for `ITokenStore` implementations.
 *
 * The three contract rules that matter for security are NOT expressible in the
 * type system — a store can compile and still silently break refresh-token
 * reuse detection. This suite exercises them so any consumer (Prisma, TypeORM,
 * Drizzle, Redis, …) can prove its store is correct.
 *
 * It has no test-framework dependency: each case runs and throws on failure.
 * Wrap it in your runner of choice:
 *
 * ```ts
 * import { tokenStoreContractCases } from "@luisjrez/nestjs-keycloak-auth/testing";
 *
 * describe("MyTokenStore", () => {
 *   for (const { name, run } of tokenStoreContractCases(() => new MyTokenStore(db))) {
 *     it(name, () => run());
 *   }
 * });
 * ```
 *
 * Or run them all at once and throw on the first failure:
 *
 * ```ts
 * await assertTokenStoreContract(() => new MyTokenStore(db));
 * ```
 */

export interface TokenStoreContractCase {
  name: string;
  run: () => Promise<void>;
}

/**
 * A factory that returns a FRESH, EMPTY store for each case. If your store
 * wraps a shared DB, truncate the auth tables in the factory (or point each run
 * at a throwaway database/file) so cases don't leak state into each other.
 */
export type TokenStoreFactory = () => ITokenStore | Promise<ITokenStore>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ITokenStore contract violation: ${message}`);
  }
}

function makeRecord(overrides: Partial<TokenRecord> = {}): TokenRecord {
  return {
    id: randomUUID(),
    userId: "user-1",
    type: "REFRESH_TOKEN",
    token: randomUUID(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

export function tokenStoreContractCases(
  makeStore: TokenStoreFactory,
): TokenStoreContractCase[] {
  const withStore = async (fn: (store: ITokenStore) => Promise<void>): Promise<void> => {
    const store = await makeStore();
    await fn(store);
  };

  return [
    {
      name: "save then findByToken round-trips a record by its original token",
      run: () =>
        withStore(async (store) => {
          const rec = makeRecord({ token: "raw-token-value" });
          await store.save(rec);
          const found = await store.findByToken("raw-token-value", "REFRESH_TOKEN");
          assert(found, "findByToken returned null for a token that was just saved");
          assert(found.userId === rec.userId, "findByToken returned the wrong userId");
          assert(!found.consumedAt, "a freshly saved token must not be consumed");
        }),
    },
    {
      name: "RULE 1: tokens are persisted hashed, never in clear text",
      run: () =>
        withStore(async (store) => {
          const raw = "super-secret-token";
          await store.save(makeRecord({ token: raw }));
          const found = await store.findByToken(raw, "REFRESH_TOKEN");
          assert(found, "findByToken returned null");
          assert(
            found.token !== raw,
            "the stored `token` equals the clear-text value — it must be hashed",
          );
          assert(
            found.token === hashToken(raw),
            "the stored token is not the SHA-256 hash produced by hashToken()",
          );
        }),
    },
    {
      name: "findByToken discriminates by type",
      run: () =>
        withStore(async (store) => {
          await store.save(makeRecord({ token: "same", type: "REFRESH_TOKEN" }));
          const asReset = await store.findByToken("same", "RESET_PASSWORD");
          assert(asReset === null, "findByToken ignored the `type` discriminator");
        }),
    },
    {
      name: "findByToken returns null for an unknown token",
      run: () =>
        withStore(async (store) => {
          const found = await store.findByToken("never-saved", "REFRESH_TOKEN");
          assert(found === null, "expected null for an unknown token");
        }),
    },
    {
      name: "RULE 2: findByToken returns CONSUMED records (reuse detection needs them)",
      run: () =>
        withStore(async (store) => {
          await store.save(makeRecord({ token: "to-consume" }));
          const first = await store.findByToken("to-consume", "REFRESH_TOKEN");
          assert(first, "setup: token not found");
          await store.markConsumed(first.id);

          const afterConsume = await store.findByToken("to-consume", "REFRESH_TOKEN");
          assert(
            afterConsume,
            "findByToken hid a consumed record — this silently breaks refresh-token reuse detection",
          );
          assert(
            afterConsume.consumedAt instanceof Date,
            "a consumed record must expose a `consumedAt` Date",
          );
        }),
    },
    {
      name: "RULE 3: markConsumed is atomic — true once, false on repeat",
      run: () =>
        withStore(async (store) => {
          await store.save(makeRecord({ token: "atomic" }));
          const rec = await store.findByToken("atomic", "REFRESH_TOKEN");
          assert(rec, "setup: token not found");

          const first = await store.markConsumed(rec.id);
          assert(first === true, "first markConsumed must return true");

          const second = await store.markConsumed(rec.id);
          assert(
            second === false,
            "second markConsumed must return false — a non-atomic implementation returns true and opens a double-use window",
          );
        }),
    },
    {
      name: "markConsumed returns false for a non-existent id",
      run: () =>
        withStore(async (store) => {
          const result = await store.markConsumed(randomUUID());
          assert(result === false, "markConsumed on a missing id must return false");
        }),
    },
    {
      name: "deleteAllForUser removes every token for that user only",
      run: () =>
        withStore(async (store) => {
          await store.save(makeRecord({ userId: "u-a", token: "a1" }));
          await store.save(makeRecord({ userId: "u-a", token: "a2" }));
          await store.save(makeRecord({ userId: "u-b", token: "b1" }));

          await store.deleteAllForUser("u-a");

          assert(
            (await store.findByToken("a1", "REFRESH_TOKEN")) === null,
            "deleteAllForUser left a token behind",
          );
          assert(
            (await store.findByToken("a2", "REFRESH_TOKEN")) === null,
            "deleteAllForUser left a token behind",
          );
          assert(
            (await store.findByToken("b1", "REFRESH_TOKEN")) !== null,
            "deleteAllForUser removed another user's token",
          );
        }),
    },
    {
      name: "deleteExpired removes only expired tokens",
      run: () =>
        withStore(async (store) => {
          await store.save(
            makeRecord({ token: "expired", expiresAt: new Date(Date.now() - 1000) }),
          );
          await store.save(
            makeRecord({ token: "fresh", expiresAt: new Date(Date.now() + 60_000) }),
          );

          await store.deleteExpired();

          assert(
            (await store.findByToken("expired", "REFRESH_TOKEN")) === null,
            "deleteExpired kept an expired token",
          );
          assert(
            (await store.findByToken("fresh", "REFRESH_TOKEN")) !== null,
            "deleteExpired removed a still-valid token",
          );
        }),
    },
    {
      name: "user data is an upsert keyed on (userId, key)",
      run: () =>
        withStore(async (store) => {
          await store.saveUserData("u-1", "totpSecret", "first");
          assert(
            (await store.getUserData("u-1", "totpSecret")) === "first",
            "getUserData did not return the saved value",
          );

          await store.saveUserData("u-1", "totpSecret", "second");
          assert(
            (await store.getUserData("u-1", "totpSecret")) === "second",
            "saveUserData did not upsert — a second write for the same (userId, key) must overwrite",
          );

          assert(
            (await store.getUserData("u-1", "missing")) === null,
            "getUserData must return null for an unknown key",
          );
        }),
    },
    {
      name: 'user data tolerates the literal "system" userId (lockout counters)',
      run: () =>
        withStore(async (store) => {
          await store.saveUserData("system", "login_failed:a@b.com", "3");
          assert(
            (await store.getUserData("system", "login_failed:a@b.com")) === "3",
            'the store must accept a non-user "system" userId as a plain string key',
          );
        }),
    },
    {
      name: "deleteUserData removes an entry and is idempotent",
      run: () =>
        withStore(async (store) => {
          await store.saveUserData("u-1", "k", "v");
          await store.deleteUserData("u-1", "k");
          assert(
            (await store.getUserData("u-1", "k")) === null,
            "deleteUserData did not remove the entry",
          );
          // second delete must not throw
          await store.deleteUserData("u-1", "k");
        }),
    },
  ];
}

/**
 * Runs every contract case in sequence and throws on the first violation.
 * Useful outside a test framework (e.g. a startup self-check in non-prod).
 */
export async function assertTokenStoreContract(makeStore: TokenStoreFactory): Promise<void> {
  for (const { name, run } of tokenStoreContractCases(makeStore)) {
    try {
      await run();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`[${name}] ${reason}`);
    }
  }
}
