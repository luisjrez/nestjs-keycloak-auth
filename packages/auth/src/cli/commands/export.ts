import * as fs from "node:fs";
import * as path from "node:path";
import { KeycloakAdminClient } from "../admin-client";

export interface ExportOptions {
  serverUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  outputPath: string;
}

export function buildExportConfig(
  realmData: Record<string, unknown>,
  clients: Array<Record<string, unknown>>,
  clientSecrets: Map<string, string>,
) {
  return {
    realm: realmData["realm"] as string,
    enabled: realmData["enabled"] as boolean,
    clients: clients.map((c) => ({
      clientId: c["clientId"] as string,
      secret: clientSecrets.get(c["id"] as string) ?? (c["secret"] as string) ?? "",
      publicClient: (c["publicClient"] as boolean) ?? false,
      redirectUris: (c["redirectUris"] as string[]) ?? [],
      directAccessGrantsEnabled: (c["directAccessGrantsEnabled"] as boolean) ?? false,
      serviceAccountsEnabled: (c["serviceAccountsEnabled"] as boolean) ?? false,
      standardFlowEnabled: (c["standardFlowEnabled"] as boolean) ?? false,
    })),
  };
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  const client = new KeycloakAdminClient({
    serverUrl: options.serverUrl,
    realm: options.realm,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  });

  try {
    const realmData = await client.getRealm();
    const clients = await client.getClients();

    const clientSecrets = new Map<string, string>();
    for (const c of clients) {
      const id = c["id"] as string;
      const secret = await client.getClientSecret(id);
      if (secret) {
        clientSecrets.set(id, secret);
      }
    }

    const config = buildExportConfig(realmData, clients, clientSecrets);

    const outputDir = path.dirname(path.resolve(options.outputPath));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(options.outputPath, JSON.stringify(config, null, 2), "utf-8");

    console.log(`✅ Realm "${options.realm}" exported to ${path.resolve(options.outputPath)}`);
  } finally {
    await client.close();
  }
}
