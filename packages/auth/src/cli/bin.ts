#!/usr/bin/env node
import * as fs from "node:fs";
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { exportCommand } from "./commands/export";
import { importCommand } from "./commands/import";

const program = new Command();

program
  .name("auth-cli")
  .description("Keycloak realm configuration generator for @luisjrez/nestjs-keycloak-auth")
  .version("0.0.1");

program
  .command("init")
  .description("Interactive wizard to generate keycloak-realm.json")
  .option("-o, --output <path>", "Output file path", "./keycloak-realm.json")
  .action(async (options) => {
    await initCommand({ outputPath: options.output });
  });

program
  .command("export")
  .description("Export realm configuration from a running Keycloak instance")
  .requiredOption("--server-url <url>", "Keycloak server URL")
  .requiredOption("--realm <name>", "Realm name")
  .requiredOption("--client-id <id>", "Client ID for admin API authentication")
  .requiredOption("--client-secret <secret>", "Client secret for admin API authentication")
  .option("-o, --output <path>", "Output file path", "./keycloak-realm.json")
  .action(async (options) => {
    try {
      await exportCommand({
        serverUrl: options.serverUrl,
        realm: options.realm,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        outputPath: options.output,
      });
    } catch (error) {
      console.error("❌ Export failed:", (error as Error).message);
      process.exit(1);
    }
  });

program
  .command("import")
  .description("Import realm configuration into a running Keycloak instance")
  .requiredOption("--server-url <url>", "Keycloak server URL")
  .requiredOption("--client-id <id>", "Client ID for admin API authentication")
  .requiredOption("--client-secret <secret>", "Client secret for admin API authentication")
  .requiredOption("-f, --file <path>", "Realm JSON file path")
  .action(async (options) => {
    try {
      const config = JSON.parse(fs.readFileSync(options.file, "utf-8"));
      await importCommand({
        serverUrl: options.serverUrl,
        realm: config.realm,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        filePath: options.file,
      });
    } catch (error) {
      console.error("❌ Import failed:", (error as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);
