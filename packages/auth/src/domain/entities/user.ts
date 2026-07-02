export interface User {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  enabled: boolean;
  createdAt: Date;
  attributes?: Record<string, string[]>;
}
