import axios from "axios";
import { KeycloakAdminClient } from "../../src/cli/admin-client";

jest.mock("axios");

const mockAxiosCreate = axios.create as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;
const mockAdminGet = jest.fn();
const mockAdminPut = jest.fn();
const mockAdminPost = jest.fn();

const adminTokenResponse = {
  data: { access_token: "admin-token-123", expires_in: 300 },
};

const serverUrl = "http://localhost:8080";
const realm = "test-realm";
const clientId = "admin-cli";
const clientSecret = "admin-secret";

describe("KeycloakAdminClient", () => {
  let adminClient: KeycloakAdminClient;

  beforeAll(() => {
    mockAxiosCreate.mockImplementation((config: any) => {
      if (config.baseURL?.includes("/admin/")) {
        return {
          get: mockAdminGet,
          post: mockAdminPost,
          put: mockAdminPut,
          defaults: { baseURL: `${serverUrl}/admin/realms/${realm}` },
        };
      }
      return { post: jest.fn() };
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosPost.mockResolvedValue(adminTokenResponse);
    adminClient = new KeycloakAdminClient({
      serverUrl,
      realm,
      clientId,
      clientSecret,
    });
  });

  describe("getRealm", () => {
    it("should fetch and return realm data", async () => {
      const realmData = { realm: "test-realm", enabled: true };
      mockAdminGet.mockResolvedValueOnce({ data: realmData });

      const result = await adminClient.getRealm();

      expect(result).toEqual(realmData);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        `${serverUrl}/realms/${realm}/protocol/openid-connect/token`,
        expect.any(String),
        expect.objectContaining({
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );
    });

    it("should cache admin token across calls", async () => {
      mockAdminGet.mockResolvedValue({ data: { realm: "test-realm" } });

      await adminClient.getRealm();
      await adminClient.getRealm();

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    });
  });

  describe("getClients", () => {
    it("should fetch and return clients", async () => {
      const clients = [
        { id: "c1", clientId: "my-app", publicClient: false },
      ];
      mockAdminGet.mockResolvedValueOnce({ data: clients });

      const result = await adminClient.getClients();

      expect(result).toEqual(clients);
      expect(mockAdminGet).toHaveBeenCalledWith("/clients", expect.any(Object));
    });
  });

  describe("realmExists", () => {
    it("should return true when getRealm succeeds", async () => {
      mockAdminGet.mockResolvedValueOnce({ data: { realm: "test-realm" } });

      const result = await adminClient.realmExists();

      expect(result).toBe(true);
    });

    it("should return false when getRealm throws", async () => {
      mockAdminGet.mockRejectedValueOnce(new Error("Not found"));

      const result = await adminClient.realmExists();

      expect(result).toBe(false);
    });
  });

  describe("createRealm", () => {
    it("should POST to master admin API to create realm", async () => {
      const realmConfig = { realm: "new-realm", enabled: true };
      mockAdminPost.mockResolvedValueOnce({ data: {}, status: 201 });

      await adminClient.createRealm(realmConfig);

      expect(mockAdminPost).toHaveBeenCalledWith(
        "",
        realmConfig,
        expect.objectContaining({
          headers: { Authorization: "Bearer admin-token-123" },
        }),
      );
    });
  });

  describe("updateRealm", () => {
    it("should PUT realm config", async () => {
      const realmConfig = { realm: "test-realm", enabled: false };
      mockAdminPut.mockResolvedValueOnce({ data: {} });

      await adminClient.updateRealm(realmConfig);

      expect(mockAdminPut).toHaveBeenCalledWith(
        "",
        realmConfig,
        expect.any(Object),
      );
    });
  });

  describe("getClientByClientId", () => {
    it("should return client when found", async () => {
      const client = { id: "c1", clientId: "my-app" };
      mockAdminGet.mockResolvedValueOnce({ data: [client] });

      const result = await adminClient.getClientByClientId("my-app");

      expect(result).toEqual(client);
    });

    it("should return null when no client found", async () => {
      mockAdminGet.mockResolvedValueOnce({ data: [] });

      const result = await adminClient.getClientByClientId("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createClient", () => {
    it("should POST to create client", async () => {
      const clientConfig = { clientId: "new-client", publicClient: true };
      mockAdminPost.mockResolvedValueOnce({ data: {}, status: 201 });

      await adminClient.createClient(clientConfig);

      expect(mockAdminPost).toHaveBeenCalledWith(
        "/clients",
        clientConfig,
        expect.any(Object),
      );
    });
  });

  describe("updateClient", () => {
    it("should PUT to update client", async () => {
      const clientConfig = { clientId: "my-app", publicClient: true };
      mockAdminPut.mockResolvedValueOnce({ data: {} });

      await adminClient.updateClient("c1", clientConfig);

      expect(mockAdminPut).toHaveBeenCalledWith(
        "/clients/c1",
        clientConfig,
        expect.any(Object),
      );
    });
  });

  describe("getClientSecret", () => {
    it("should return the client secret", async () => {
      mockAdminGet.mockResolvedValueOnce({ data: { value: "my-secret" } });

      const result = await adminClient.getClientSecret("c1");

      expect(result).toBe("my-secret");
      expect(mockAdminGet).toHaveBeenCalledWith(
        "/clients/c1/client-secret",
        expect.any(Object),
      );
    });

    it("should return null on error", async () => {
      mockAdminGet.mockRejectedValueOnce(new Error("Forbidden"));

      const result = await adminClient.getClientSecret("c1");

      expect(result).toBeNull();
    });
  });

  describe("close", () => {
    it("should clear token cache", async () => {
      mockAdminGet.mockResolvedValue({ data: { realm: "test-realm" } });

      await adminClient.getRealm();
      await adminClient.close();
      await adminClient.getRealm();

      expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    });
  });
});
