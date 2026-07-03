import axios, { type AxiosInstance } from "axios";

export interface AdminClientOptions {
  serverUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

export class KeycloakAdminClient {
  private readonly adminApi: AxiosInstance;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private adminTokenCache: { accessToken: string; expiresAt: number } | null = null;

  constructor(options: AdminClientOptions) {
    this.adminApi = axios.create({
      baseURL: `${options.serverUrl}/admin/realms/${options.realm}`,
    });
    this.tokenUrl = `${options.serverUrl}/realms/${options.realm}/protocol/openid-connect/token`;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  private async getAdminToken(): Promise<string> {
    if (this.adminTokenCache && this.adminTokenCache.expiresAt > Date.now()) {
      return this.adminTokenCache.accessToken;
    }

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await axios.post<{
      access_token: string;
      expires_in: number;
    }>(this.tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, expires_in } = response.data;
    this.adminTokenCache = {
      accessToken: access_token,
      expiresAt: Date.now() + (expires_in - 30) * 1000,
    };

    return access_token;
  }

  async getRealm(): Promise<Record<string, unknown>> {
    const token = await this.getAdminToken();
    const response = await this.adminApi.get("", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data as Record<string, unknown>;
  }

  async getClients(): Promise<Array<Record<string, unknown>>> {
    const token = await this.getAdminToken();
    const response = await this.adminApi.get("/clients", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data as Array<Record<string, unknown>>;
  }

  async realmExists(): Promise<boolean> {
    try {
      await this.getRealm();
      return true;
    } catch {
      return false;
    }
  }

  async createRealm(realmConfig: Record<string, unknown>): Promise<void> {
    const token = await this.getAdminToken();
    const serverUrl = this.adminApi.defaults.baseURL?.replace(
      `/admin/realms/${realmConfig["realm"] as string}`,
      "",
    );
    const masterApi = axios.create({
      baseURL: `${serverUrl}/admin/realms`,
    });
    await masterApi.post("", realmConfig, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateRealm(realmConfig: Record<string, unknown>): Promise<void> {
    const token = await this.getAdminToken();
    await this.adminApi.put("", realmConfig, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async createClient(clientConfig: Record<string, unknown>): Promise<void> {
    const token = await this.getAdminToken();
    await this.adminApi.post("/clients", clientConfig, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getClientByClientId(clientId: string): Promise<Record<string, unknown> | null> {
    const token = await this.getAdminToken();
    const response = await this.adminApi.get("/clients", {
      params: { clientId },
      headers: { Authorization: `Bearer ${token}` },
    });
    const clients = response.data as Array<Record<string, unknown>>;
    return clients.length > 0 ? (clients[0] ?? null) : null;
  }

  async updateClient(
    clientUuid: string,
    clientConfig: Record<string, unknown>,
  ): Promise<void> {
    const token = await this.getAdminToken();
    await this.adminApi.put(`/clients/${clientUuid}`, clientConfig, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getClientSecret(clientUuid: string): Promise<string | null> {
    try {
      const token = await this.getAdminToken();
      const response = await this.adminApi.get(`/clients/${clientUuid}/client-secret`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data as { value?: string };
      return data.value ?? null;
    } catch {
      return null;
    }
  }

  async close(): Promise<void> {
    this.adminTokenCache = null;
  }
}
