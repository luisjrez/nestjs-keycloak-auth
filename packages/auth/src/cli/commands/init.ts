import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

interface InitOptions {
  outputPath: string;
}

interface RealmConfig {
  realm: string;
  serverUrl: string;
  adminUser: string;
  adminPassword: string;
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
  smtp: {
    host: string;
    port: number;
    fromEmail: string;
  };
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
  const serverUrl = await rl.question("? Keycloak server URL (default: http://localhost:8080): ");
  const adminUser = await rl.question("? Keycloak admin username (default: admin): ");
  const adminPassword = await rl.question("? Keycloak admin password (default: admin): ");
  const clientId = await rl.question("? Client ID: ");
  const secret = await rl.question("? Client Secret (leave empty to generate): ");
  const redirectUris = await rl.question("? Valid Redirect URIs (comma-separated): ");
  const smtpHost = await rl.question("? SMTP host (optional, default: localhost): ");
  const smtpPort = await rl.question("? SMTP port (optional, default: 1025): ");
  const fromEmail = await rl.question("? From email (optional, default: noreply@example.com): ");

  rl.close();

  const generatedSecret =
    secret.trim() || generateSecret();

  const config: RealmConfig = {
    realm,
    serverUrl: serverUrl.trim() || "http://localhost:8080",
    adminUser: adminUser.trim() || "admin",
    adminPassword: adminPassword.trim() || "admin",
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
    smtp: {
      host: smtpHost.trim() || "localhost",
      port: parseInt(smtpPort.trim() || "1025", 10),
      fromEmail: fromEmail.trim() || "noreply@example.com",
    },
  };

  const outputDir = path.dirname(path.resolve(options.outputPath));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(options.outputPath, JSON.stringify(config, null, 2), "utf-8");

  console.log(`
  ✅ Configuration generated!

  File: ${path.resolve(options.outputPath)}

  ℹ️  Next steps:
    1. Import into Keycloak:
       docker cp ${path.resolve(options.outputPath)} kc-auth-keycloak:/opt/keycloak/data/import/

    2. Restart Keycloak (it will auto-import):
       docker compose -f docker/docker-compose.yml restart keycloak

    3. In your NestJS app, add to .env:
       KEYCLOAK_CONFIG_PATH=${options.outputPath}
       KEYCLOAK_SERVER_URL=${config.serverUrl}
       JWT_SECRET=your-256-bit-secret
       SMTP_HOST=${config.smtp.host}
       SMTP_PORT=${config.smtp.port}
       SMTP_FROM=${config.smtp.fromEmail}
  `);
}

function generateSecret(): string {
  // Cryptographically secure — client secrets must not come from Math.random().
  return randomBytes(20).toString("hex");
}
