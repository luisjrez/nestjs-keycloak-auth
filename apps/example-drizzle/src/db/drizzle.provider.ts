import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Global, Module, type Provider } from "@nestjs/common";
import { CREATE_TABLES_SQL } from "./schema";
import { DrizzleTokenStore } from "./drizzle-token.store";
import { DRIZZLE_DB } from "./drizzle.constants";

const drizzleProvider: Provider = {
  provide: DRIZZLE_DB,
  useFactory: (): BetterSQLite3Database => {
    const sqlite = new Database(process.env["SQLITE_PATH"] ?? "auth-drizzle.sqlite");
    sqlite.pragma("journal_mode = WAL");
    // Create tables on boot (an example convenience; use drizzle-kit
    // migrations in production).
    sqlite.exec(CREATE_TABLES_SQL);
    return drizzle(sqlite);
  },
};

@Global()
@Module({
  providers: [drizzleProvider, DrizzleTokenStore],
  exports: [DRIZZLE_DB, DrizzleTokenStore],
})
export class DrizzleModule {}
