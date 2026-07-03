import axios from "axios";
import * as fs from "node:fs";
import { importCommand, readRealmConfig } from "../../../src/cli/commands/import";

jest.mock("axios");
jest.mock("node:fs");

const mockFsReadFileSync = fs.readFileSync as jest.Mock;
const mockAxiosCreate = axios.create as jest.Mock;
const mockAxiosPost = axios.post as jest.Mock;

const sampleRealmJson = JSON.stringify({
  realm: "my-realm",
  enabled: true,
  clients: [
    {
      clientId: "my-app",
      secret: "app-secret",
      publicClient: false,
      redirectUris: ["http://localhost:3000/*"],
    },
  ],
});

const adminToken = {
  data: { access_token: "admin-token", expires_in: 300 },
};

describe("readRealmConfig", () => {
  it("should parse realm JSON file", () => {
    mockFsReadFileSync.mockReturnValue(sampleRealmJson);

    const config = readRealmConfig("/path/to/realm.json");

    expect(config.realm).toBe("my-realm");
    expect(config.enabled).toBe(true);
    expect(config.clients).toHaveLength(1);
    expect(config.clients?.[0]?.clientId).toBe("my-app");
  });
});

describe("importCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsReadFileSync.mockReturnValue(sampleRealmJson);
    mockAxiosPost.mockResolvedValue(adminToken);
  });

  it("should create realm when it doesn't exist", async () => {
    const mockAdminGet = jest
      .fn()
      .mockRejectedValueOnce(new Error("Not found"))
      .mockResolvedValueOnce({ data: [] });
    const mockAdminPost = jest.fn().mockResolvedValue({ data: {}, status: 201 });
    const mockAdminPut = jest.fn().mockResolvedValue({ data: {} });

    mockAxiosCreate.mockImplementation((config: any) => {
      if (config.baseURL?.includes("/admin/")) {
        return {
          get: mockAdminGet,
          post: mockAdminPost,
          put: mockAdminPut,
          defaults: { baseURL: "http://localhost:8080/admin/realms/my-realm" },
        };
      }
      return { post: jest.fn() };
    });

    await importCommand({
      serverUrl: "http://localhost:8080",
      realm: "my-realm",
      clientId: "admin-cli",
      clientSecret: "admin-secret",
      filePath: "/path/to/realm.json",
    });

    expect(mockAdminPost).toHaveBeenCalled();
  });

  it("should update realm when it exists", async () => {
    const mockAdminGet = jest
      .fn()
      .mockResolvedValueOnce({ data: { realm: "my-realm", enabled: true } })
      .mockResolvedValueOnce({ data: [{ id: "c1", clientId: "my-app" }] });
    const mockAdminPost = jest.fn().mockResolvedValue({ data: {}, status: 201 });
    const mockAdminPut = jest.fn().mockResolvedValue({ data: {} });

    mockAxiosCreate.mockImplementation((config: any) => {
      if (config.baseURL?.includes("/admin/")) {
        return {
          get: mockAdminGet,
          post: mockAdminPost,
          put: mockAdminPut,
          defaults: { baseURL: "http://localhost:8080/admin/realms/my-realm" },
        };
      }
      return { post: jest.fn() };
    });

    await importCommand({
      serverUrl: "http://localhost:8080",
      realm: "my-realm",
      clientId: "admin-cli",
      clientSecret: "admin-secret",
      filePath: "/path/to/realm.json",
    });

    expect(mockAdminPut).toHaveBeenCalled();
  });

  it("should handle empty clients array", async () => {
    mockFsReadFileSync.mockReturnValue(
      JSON.stringify({ realm: "empty-realm", enabled: true, clients: [] }),
    );

    const mockAdminGet = jest
      .fn()
      .mockRejectedValueOnce(new Error("Not found"));
    const mockAdminPost = jest.fn().mockResolvedValue({ data: {}, status: 201 });
    const mockAdminPut = jest.fn().mockResolvedValue({ data: {} });

    mockAxiosCreate.mockImplementation((config: any) => {
      if (config.baseURL?.includes("/admin/")) {
        return {
          get: mockAdminGet,
          post: mockAdminPost,
          put: mockAdminPut,
          defaults: { baseURL: "http://localhost:8080/admin/realms/empty-realm" },
        };
      }
      return { post: jest.fn() };
    });

    await importCommand({
      serverUrl: "http://localhost:8080",
      realm: "empty-realm",
      clientId: "admin-cli",
      clientSecret: "admin-secret",
      filePath: "/path/to/realm.json",
    });

    expect(mockAdminPost).toHaveBeenCalled();
  });
});
