import { Password } from "../../../src/domain/value-objects/password";

describe("Password Value Object", () => {
  describe("create", () => {
    it("should create a valid password", () => {
      const password = Password.create("SecurePass123");
      expect(password.value).toBe("SecurePass123");
    });

    it("should accept password of exactly 8 characters", () => {
      const password = Password.create("1234567a");
      expect(password.value).toBe("1234567a");
    });

    it("should accept password longer than 8 characters", () => {
      const password = Password.create("a".repeat(100));
      expect(password.value).toBe("a".repeat(100));
    });

    it("should accept password with special characters", () => {
      const password = Password.create("P@ssw0rd!#$");
      expect(password.value).toBe("P@ssw0rd!#$");
    });

    it("should accept password with spaces", () => {
      const password = Password.create("my password 123");
      expect(password.value).toBe("my password 123");
    });
  });

  describe("validation errors", () => {
    it("should reject password shorter than 8 characters", () => {
      expect(() => Password.create("Abc1234")).toThrow(
        "Password must be at least 8 characters long",
      );
    });

    it("should reject empty password", () => {
      expect(() => Password.create("")).toThrow(
        "Password must be at least 8 characters long",
      );
    });

    it("should reject entirely numeric password", () => {
      expect(() => Password.create("1234567890")).toThrow(
        "Password cannot be entirely numeric",
      );
    });

    it("should reject single-character numeric password", () => {
      expect(() => Password.create("1")).toThrow(
        "Password must be at least 8 characters long",
      );
    });
  });

  describe("toString", () => {
    it("should return the password string", () => {
      const password = Password.create("SecurePass123");
      expect(password.toString()).toBe("SecurePass123");
    });
  });
});
