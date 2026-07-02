#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init";

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
  .option("--username <user>", "Admin username", "admin")
  .option("--password <pass>", "Admin password", "admin")
  .option("-o, --output <path>", "Output file path", "./keycloak-realm.json")
  .action(async (options) => {
    console.log("Export not implemented yet", options);
  });

program
  .command("import")
  .description("Import realm configuration into a running Keycloak instance")
  .requiredOption("--server-url <url>", "Keycloak server URL")
  .option("--username <user>", "Admin username", "admin")
  .option("--password <pass>", "Admin password", "admin")
  .requiredOption("-f, --file <path>", "Realm JSON file path")
  .action(async (options) => {
    console.log("Import not implemented yet", options);
  });

program.parse(process.argv);
