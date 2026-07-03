import type { Config } from "jest";

const config: Config = {
  displayName: "@luisjrez/nestjs-keycloak-auth (integration)",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.int-spec.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        diagnostics: true,
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  verbose: true,
  testTimeout: 30000,
};

export default config;
