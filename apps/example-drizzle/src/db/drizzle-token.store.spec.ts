import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { tokenStoreContractCases } from "@luisjrez/nestjs-keycloak-auth/testing";
import { DrizzleTokenStore } from "./drizzle-token.store";
import { CREATE_TABLES_SQL } from "./schema";

/**
 * Runs the package's ITokenStore conformance suite against the Drizzle store.
 * Each case gets a fresh in-memory SQLite database — no Docker, no Keycloak.
 */
describe("ITokenStore contract — DrizzleTokenStore", () => {
  const makeStore = () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(CREATE_TABLES_SQL);
    return new DrizzleTokenStore(drizzle(sqlite));
  };

  for (const { name, run } of tokenStoreContractCases(makeStore)) {
    it(name, () => run());
  }
});
