import { Email } from "../../../src/domain/value-objects/email";

describe("Email Value Object", () => {
  describe("create", () => {
    it("should create a valid email", () => {
      const email = Email.create("user@example.com");
      expect(email.value).toBe("user@example.com");
    });

    it("should trim whitespace", () => {
      const email = Email.create("  user@example.com  ");
      expect(email.value).toBe("user@example.com");
    });

    it("should convert to lowercase", () => {
      const email = Email.create("USER@Example.COM");
      expect(email.value).toBe("user@example.com");
    });

    it("should reject email without @", () => {
      expect(() => Email.create("userexample.com")).toThrow("Invalid email");
    });

    it("should reject email without domain", () => {
      expect(() => Email.create("user@")).toThrow("Invalid email");
    });

    it("should reject email without local part", () => {
      expect(() => Email.create("@example.com")).toThrow("Invalid email");
    });

    it("should reject empty string", () => {
      expect(() => Email.create("")).toThrow("Invalid email");
    });

    it("should reject email with spaces in middle", () => {
      expect(() => Email.create("user @example.com")).toThrow("Invalid email");
    });

    it("should reject email without TLD", () => {
      expect(() => Email.create("user@example")).toThrow("Invalid email");
    });

    it("should handle email with subdomain", () => {
      const email = Email.create("user@sub.example.com");
      expect(email.value).toBe("user@sub.example.com");
    });

    it("should handle email with plus addressing", () => {
      const email = Email.create("user+tag@example.com");
      expect(email.value).toBe("user+tag@example.com");
    });

    it("should handle email with numbers", () => {
      const email = Email.create("user123@example.com");
      expect(email.value).toBe("user123@example.com");
    });
  });

  describe("equals", () => {
    it("should return true for identical emails", () => {
      const a = Email.create("user@example.com");
      const b = Email.create("user@example.com");
      expect(a.equals(b)).toBe(true);
    });

    it("should return false for different emails", () => {
      const a = Email.create("user@example.com");
      const b = Email.create("other@example.com");
      expect(a.equals(b)).toBe(false);
    });

    it("should handle case insensitivity", () => {
      const a = Email.create("User@Example.COM");
      const b = Email.create("user@example.com");
      expect(a.equals(b)).toBe(true);
    });
  });

  describe("toString", () => {
    it("should return the email string", () => {
      const email = Email.create("user@example.com");
      expect(email.toString()).toBe("user@example.com");
    });
  });
});
