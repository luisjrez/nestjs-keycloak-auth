import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Backs the auth package's token records. `tokenHash` holds a SHA-256 of the
 * original token (see DrizzleTokenStore). Dates are stored as unix-epoch ms
 * integers, mapped back to `Date` in the store.
 */
export const tokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: integer("consumed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    byHash: index("idx_tokens_hash").on(t.tokenHash),
    byUser: index("idx_tokens_user").on(t.userId),
  }),
);

/** Per-user key/value store (2FA secrets, lockout counters). */
export const userData = sqliteTable(
  "auth_user_data",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => ({
    byUserKey: uniqueIndex("uq_user_data_user_key").on(t.userId, t.key),
  }),
);

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tokens_hash ON auth_tokens (token_hash);
  CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens (user_id);
  CREATE TABLE IF NOT EXISTS auth_user_data (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uq_user_data_user_key ON auth_user_data (user_id, key);
` as const;
