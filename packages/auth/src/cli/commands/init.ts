import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

interface InitOptions {
  outputPath: string;
}

interface RealmConfig {
  realm: string;
  enabled: boolean;
  clients: Array<{
    clientId: string;
    secret: string;
    publicClient: boolean;
    redirectUris: string[];
    directAccessGrantsEnabled: boolean;
    serviceAccountsEnabled: boolean;
    standardFlowEnabled: boolean;
  }>;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const rl = readline.createInterface({ input, output });

  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   Keycloak Realm Generator                       ║
  ║   @luisjrez/nestjs-keycloak-auth                ║
  ╚══════════════════════════════════════════════════╝
  `);

  const realm = await rl.question("? Realm name: ");
  const clientId = await rl.question("? Client ID: ");
  const secret = await rl.question("? Client Secret (leave empty to generate): ");
  const redirectUris = await rl.question("? Valid Redirect URIs (comma-separated): ");

  rl.close();

  const generatedSecret =
    secret.trim() || generateSecret();

  const config: RealmConfig = {
    realm,
    enabled: true,
    clients: [
      {
        clientId,
        secret: generatedSecret,
        publicClient: false,
        redirectUris: redirectUris.split(",").map((s) => s.trim()),
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
      },
    ],
  };

  const outputDir = path.dirname(path.resolve(options.outputPath));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(options.outputPath, JSON.stringify(config, null, 2), "utf-8");

  console.log(`
  ✅ Realm configuration generated!

  File: ${path.resolve(options.outputPath)}

  ℹ️  Next steps:
    1. Import into Keycloak:
       docker cp ${path.resolve(options.outputPath)} kc-auth-keycloak:/opt/keycloak/data/import/

    2. Restart Keycloak (it will auto-import):
       docker compose -f docker/docker-compose.yml restart keycloak

    3. In your NestJS app, add to .env:
       KEYCLOAK_CONFIG_PATH=${options.outputPath}
  `);
}

function generateSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
