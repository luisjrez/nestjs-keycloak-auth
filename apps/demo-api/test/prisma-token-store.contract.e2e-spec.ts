import { resolve } from "path";
import { execSync } from "child_process";
import { tokenStoreContractCases } from "@luisjrez/nestjs-keycloak-auth/testing";
import { PrismaService } from "../src/prisma/prisma.service";
import { PrismaTokenStore } from "../src/prisma/prisma-token.store";

/**
 * Runs the package's ITokenStore conformance suite against the Prisma store.
 * Unlike the TypeORM/Drizzle contract tests (which use in-memory SQLite), this
 * one needs the demo's Postgres — so it lives in the e2e suite that already
 * boots it via Docker.
 */
const TEST_DB_URL = "postgresql://auth_demo:auth_demo@localhost:5434/auth_demo";
process.env["DATABASE_URL"] = TEST_DB_URL;

execSync("npx prisma db push --accept-data-loss --force-reset 2>&1", {
  cwd: resolve(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: TEST_DB_URL },
});

describe("ITokenStore contract — PrismaTokenStore", () => {
  const prisma = new PrismaService();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // A fresh store means a clean table set per case.
  const makeStore = async () => {
    await prisma.token.deleteMany();
    await prisma.userData.deleteMany();
    return new PrismaTokenStore(prisma);
  };

  for (const { name, run } of tokenStoreContractCases(makeStore)) {
    it(name, () => run());
  }
});
