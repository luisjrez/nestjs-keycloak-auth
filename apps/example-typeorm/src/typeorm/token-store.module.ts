import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenEntity, UserDataEntity } from "./entities";
import { TypeOrmTokenStore } from "./typeorm-token.store";

/**
 * Wires the repositories into TypeOrmTokenStore and exports it so the
 * AuthModule factory can inject a single, ready-to-use ITokenStore.
 */
@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity, UserDataEntity])],
  providers: [TypeOrmTokenStore],
  exports: [TypeOrmTokenStore],
})
export class TokenStoreModule {}
