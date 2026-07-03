export interface TokenRecord {
  id: string;
  userId: string;
  type: "MAGIC_LINK" | "RESET_PASSWORD" | "VERIFY_EMAIL" | "REFRESH_TOKEN";
  token: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

export interface ITokenStore {
  save(record: TokenRecord): Promise<void>;
  findByToken(token: string, type: TokenRecord["type"]): Promise<TokenRecord | null>;
  markConsumed(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
  saveUserData(userId: string, key: string, value: string): Promise<void>;
  getUserData(userId: string, key: string): Promise<string | null>;
  deleteUserData(userId: string, key: string): Promise<void>;
}
