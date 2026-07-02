import type { User } from "../../../src/domain/entities/user";

describe("User Entity", () => {
  it("should create a valid user object", () => {
    const user: User = {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      emailVerified: true,
      enabled: true,
      createdAt: new Date("2024-01-01"),
    };

    expect(user.id).toBe("user-123");
    expect(user.email).toBe("test@example.com");
    expect(user.username).toBe("testuser");
    expect(user.emailVerified).toBe(true);
    expect(user.enabled).toBe(true);
    expect(user.createdAt).toEqual(new Date("2024-01-01"));
  });

  it("should allow optional attributes", () => {
    const user: User = {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      emailVerified: false,
      enabled: true,
      createdAt: new Date(),
      attributes: {
        department: ["engineering"],
        locale: ["en-US"],
      },
    };

    expect(user.attributes).toBeDefined();
    expect(user.attributes!["department"]).toEqual(["engineering"]);
  });

  it("should allow user without attributes", () => {
    const user: User = {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      emailVerified: false,
      enabled: true,
      createdAt: new Date(),
    };

    expect(user.attributes).toBeUndefined();
  });

  it("should allow unverified email", () => {
    const user: User = {
      id: "user-123",
      email: "unverified@example.com",
      username: "unverified",
      emailVerified: false,
      enabled: true,
      createdAt: new Date(),
    };

    expect(user.emailVerified).toBe(false);
  });

  it("should allow disabled account", () => {
    const user: User = {
      id: "user-123",
      email: "disabled@example.com",
      username: "disabled",
      emailVerified: true,
      enabled: false,
      createdAt: new Date(),
    };

    expect(user.enabled).toBe(false);
  });
});
