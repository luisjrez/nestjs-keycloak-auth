export interface TokenRecord {
  id: string;
  userId: string;
  type: "MAGIC_LINK" | "RESET_PASSWORD" | "VERIFY_EMAIL" | "REFRESH_TOKEN" | "PRE_AUTH_2FA";
  token: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

/**
 * Persistence contract for one-time tokens and refresh-token sessions.
 *
 * Implementation contract — violating any of these silently disables
 * security features (reuse detection, revocation, single-use tokens):
 *
 * - `save` MUST persist the token hashed (SHA-256 or stronger), never in
 *   clear text. Use the exported `hashToken` helper.
 * - `findByToken` receives the ORIGINAL (unhashed) token and MUST return
 *   the record EVEN IF it has already been consumed (`consumedAt` set).
 *   Refresh-token reuse detection depends on seeing consumed records.
 * - `markConsumed` MUST be atomic: it returns `true` only if the record
 *   existed and was NOT already consumed (e.g. `UPDATE ... WHERE id = ?
 *   AND consumed_at IS NULL`). Returning `false` signals a concurrent or
 *   repeated consumption attempt.
 * - `deleteAllForUser` revokes every token of a user (used after refresh
 *   token reuse is detected and after a password reset).
 */
export interface ITokenStore {
  save(record: TokenRecord): Promise<void>;
  findByToken(token: string, type: TokenRecord["type"]): Promise<TokenRecord | null>;
  markConsumed(id: string): Promise<boolean>;
  deleteExpired(): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  saveUserData(userId: string, key: string, value: string): Promise<void>;
  getUserData(userId: string, key: string): Promise<string | null>;
  deleteUserData(userId: string, key: string): Promise<void>;
}
