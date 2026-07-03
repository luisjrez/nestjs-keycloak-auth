import * as fs from "node:fs";
import { KeycloakAdminClient } from "../admin-client";

export interface ImportOptions {
  serverUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  filePath: string;
}

export function readRealmConfig(filePath: string): {
  realm: string;
  enabled?: boolean;
  clients?: Array<{
    clientId: string;
    secret?: string;
    publicClient?: boolean;
    redirectUris?: string[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
} {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

export async function importCommand(options: ImportOptions): Promise<void> {
  const config = readRealmConfig(options.filePath);

  const client = new KeycloakAdminClient({
    serverUrl: options.serverUrl,
    realm: config.realm,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  });

  try {
    const exists = await client.realmExists();

    const realmPayload: Record<string, unknown> = { ...config };
    delete realmPayload["clients"];

    if (!exists) {
      await client.createRealm(realmPayload);
      console.log(`✅ Realm "${config.realm}" created`);
    } else {
      await client.updateRealm(realmPayload);
      console.log(`✅ Realm "${config.realm}" updated`);
    }

    const incomingClients = config.clients ?? [];
    for (const incoming of incomingClients) {
      const existing = await client.getClientByClientId(incoming.clientId);

      const clientPayload: Record<string, unknown> = { ...incoming };
      delete clientPayload["secret"];

      if (existing) {
        await client.updateClient(existing["id"] as string, clientPayload);
        console.log(`  ✓ Client "${incoming.clientId}" updated`);
      } else {
        await client.createClient(clientPayload);
        console.log(`  ✓ Client "${incoming.clientId}" created`);
      }
    }

    console.log(`✅ Import complete: ${incomingClients.length} client(s) processed`);
  } finally {
    await client.close();
  }
}
