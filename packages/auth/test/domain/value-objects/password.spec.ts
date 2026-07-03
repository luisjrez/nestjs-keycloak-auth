import { Password } from "../../../src/domain/value-objects/password";
import { WeakPasswordError } from "../../../src/domain/errors/auth-errors";

describe("Password Value Object", () => {
  describe("create", () => {
    it("should create a valid password", () => {
      const password = Password.create("SecurePass123@");
      expect(password.value).toBe("SecurePass123@");
    });

    it("should accept password of exactly 8 characters", () => {
      const password = Password.create("Abc1def!");
      expect(password.value).toBe("Abc1def!");
    });

    it("should accept password with special characters", () => {
      const password = Password.create("P@ssw0rd!#$");
      expect(password.value).toBe("P@ssw0rd!#$");
    });

    it("should accept password with uppercase, lowercase, number, symbol", () => {
      const password = Password.create("My P@ss 123");
      expect(password.value).toBe("My P@ss 123");
    });
  });

  describe("validation errors", () => {
    it("should reject password shorter than 8 characters", () => {
      expect(() => Password.create("Abc1234")).toThrow(WeakPasswordError);
    });

    it("should reject empty password", () => {
      expect(() => Password.create("")).toThrow(WeakPasswordError);
    });

    it("should reject password without uppercase", () => {
      expect(() => Password.create("lowercase1@")).toThrow(WeakPasswordError);
    });

    it("should reject password without lowercase", () => {
      expect(() => Password.create("UPPERCASE1@")).toThrow(WeakPasswordError);
    });

    it("should reject password without number", () => {
      expect(() => Password.create("Abcdefgh@")).toThrow(WeakPasswordError);
    });

    it("should reject password without special character", () => {
      expect(() => Password.create("Abcdefgh1")).toThrow(WeakPasswordError);
    });
  });

  describe("toString", () => {
    it("should return the password string", () => {
      const password = Password.create("SecurePass123@");
      expect(password.toString()).toBe("SecurePass123@");
    });
  });
});
