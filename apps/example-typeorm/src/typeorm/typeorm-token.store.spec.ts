import "reflect-metadata";
import { DataSource } from "typeorm";
import { tokenStoreContractCases } from "@luisjrez/nestjs-keycloak-auth/testing";
import { TokenEntity, UserDataEntity } from "./entities";
import { TypeOrmTokenStore } from "./typeorm-token.store";

/**
 * Runs the package's ITokenStore conformance suite against the TypeORM store.
 * Each case gets a fresh in-memory SQLite database — no Docker, no Keycloak.
 */
describe("ITokenStore contract — TypeOrmTokenStore", () => {
  const makeStore = async () => {
    const dataSource = new DataSource({
      type: "better-sqlite3",
      database: ":memory:",
      entities: [TokenEntity, UserDataEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    return new TypeOrmTokenStore(
      dataSource.getRepository(TokenEntity),
      dataSource.getRepository(UserDataEntity),
    );
  };

  for (const { name, run } of tokenStoreContractCases(makeStore)) {
    it(name, () => run());
  }
});
