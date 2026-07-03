import { tokenStoreContractCases, assertTokenStoreContract } from "../../src/testing";
import { InMemoryTokenStore } from "../../src/infrastructure/storage/in-memory-token.store";
import type { ITokenStore } from "../../src/domain/ports/token-store.port";

describe("ITokenStore contract — InMemoryTokenStore", () => {
  // A fresh store per case keeps them isolated.
  const makeStore = () => new InMemoryTokenStore();

  for (const { name, run } of tokenStoreContractCases(makeStore)) {
    it(name, () => run());
  }

  it("assertTokenStoreContract passes for a conforming store", async () => {
    await expect(assertTokenStoreContract(makeStore)).resolves.toBeUndefined();
  });

  it("assertTokenStoreContract throws for a store that hides consumed records", async () => {
    // A deliberately broken store: findByToken filters out consumed records,
    // which silently disables reuse detection. The suite must catch it.
    class BrokenStore extends InMemoryTokenStore {
      override async findByToken(
        token: string,
        type: Parameters<ITokenStore["findByToken"]>[1],
      ) {
        const found = await super.findByToken(token, type);
        return found?.consumedAt ? null : found;
      }
    }

    await expect(assertTokenStoreContract(() => new BrokenStore())).rejects.toThrow(
      /consumed record/i,
    );
  });

  it("assertTokenStoreContract throws for a non-atomic markConsumed", async () => {
    class BrokenStore extends InMemoryTokenStore {
      override async markConsumed(id: string): Promise<boolean> {
        await super.markConsumed(id);
        return true; // always true — breaks the atomicity contract
      }
    }

    await expect(assertTokenStoreContract(() => new BrokenStore())).rejects.toThrow(
      /markConsumed must return false/i,
    );
  });
});
