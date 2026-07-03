import axios from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
import { exportCommand, buildExportConfig } from "../../../src/cli/commands/export";

jest.mock("axios");
jest.mock("node:fs");

const mockAxiosCreate = axios.create as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;
const mockFsExistsSync = fs.existsSync as jest.Mock;
const mockFsMkdirSync = fs.mkdirSync as jest.Mock;
const mockFsWriteFileSync = fs.writeFileSync as jest.Mock;

let mockAdminGet: jest.Mock;

describe("exportCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsExistsSync.mockReturnValue(true);
    mockAxiosPost.mockResolvedValue({
      data: { access_token: "admin-token", expires_in: 300 },
    });

    mockAdminGet = jest.fn()
      .mockResolvedValueOnce({ data: { realm: "test-realm", enabled: true } })
      .mockResolvedValueOnce({ data: [{ id: "c1", clientId: "app-1" }] })
      .mockResolvedValueOnce({ data: { value: "secret-123" } });

    mockAxiosCreate.mockImplementation((config: any) => {
      if (config.baseURL?.includes("/admin/")) {
        return {
          get: mockAdminGet,
          defaults: { baseURL: "http://localhost:8080/admin/realms/test-realm" },
        };
      }
      return { post: jest.fn() };
    });
  });

  it("should export realm and clients to JSON file", async () => {
    const outputPath = path.resolve("/tmp/test-export.json");

    await exportCommand({
      serverUrl: "http://localhost:8080",
      realm: "test-realm",
      clientId: "admin-cli",
      clientSecret: "admin-secret",
      outputPath,
    });

    expect(mockFsWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockFsWriteFileSync).toHaveBeenCalledWith(
      outputPath,
      expect.any(String),
      "utf-8",
    );

    const writtenJson = JSON.parse(
      (mockFsWriteFileSync.mock.calls[0] as [string, string])[1],
    );
    expect(writtenJson).toHaveProperty("realm");
    expect(writtenJson).toHaveProperty("clients");
  });

  it("should create output directory when it doesn't exist", async () => {
    mockFsExistsSync.mockReturnValue(false);

    await exportCommand({
      serverUrl: "http://localhost:8080",
      realm: "test-realm",
      clientId: "admin-cli",
      clientSecret: "admin-secret",
      outputPath: "/tmp/new-dir/export.json",
    });

    expect(mockFsMkdirSync).toHaveBeenCalled();
  });

  it("should propagate errors from admin client", async () => {
    mockAxiosPost.mockRejectedValue(new Error("Connection refused"));

    await expect(
      exportCommand({
        serverUrl: "http://localhost:8080",
        realm: "test-realm",
        clientId: "admin-cli",
        clientSecret: "admin-secret",
        outputPath: "/tmp/test.json",
      }),
    ).rejects.toThrow("Connection refused");
  });
});

describe("buildExportConfig", () => {
  it("should build config from realm data and clients", () => {
    const realmData = { realm: "my-realm", enabled: true };
    const clients = [
      {
        id: "c1",
        clientId: "app-1",
        publicClient: false,
        redirectUris: ["http://localhost:3000/*"],
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
      },
    ];
    const clientSecrets = new Map<string, string>([["c1", "secret-123"]]);

    const config = buildExportConfig(realmData, clients, clientSecrets);

    expect(config).toEqual({
      realm: "my-realm",
      enabled: true,
      clients: [
        {
          clientId: "app-1",
          secret: "secret-123",
          publicClient: false,
          redirectUris: ["http://localhost:3000/*"],
          directAccessGrantsEnabled: true,
          serviceAccountsEnabled: true,
          standardFlowEnabled: true,
        },
      ],
    });
  });

  it("should use client.secret when no secret in map", () => {
    const realmData = { realm: "r", enabled: true };
    const clients = [
      {
        id: "c1",
        clientId: "app-1",
        secret: "fallback-secret",
      },
    ];
    const clientSecrets = new Map<string, string>();

    const config = buildExportConfig(realmData, clients, clientSecrets);

    expect(config.clients?.[0]?.secret).toBe("fallback-secret");
  });
});
