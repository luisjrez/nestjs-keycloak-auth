import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * Backs the auth package's REFRESH_TOKEN / MAGIC_LINK / RESET_PASSWORD /
 * VERIFY_EMAIL / PRE_AUTH_2FA records. The `token` value is always stored
 * hashed (see TypeOrmTokenStore).
 */
@Entity("auth_tokens")
@Index(["tokenHash"])
@Index(["userId"])
export class TokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  type!: string;

  @Column()
  tokenHash!: string;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true })
  consumedAt!: Date | null;

  @Column({ type: "datetime" })
  createdAt!: Date;
}

/** Per-user key/value store (2FA secrets, lockout counters). */
@Entity("auth_user_data")
@Unique(["userId", "key"])
@Index(["userId"])
export class UserDataEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  key!: string;

  @Column({ type: "text" })
  value!: string;
}
