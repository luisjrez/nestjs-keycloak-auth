import { ReactEmailRenderer } from "../../../src/infrastructure/email/react-email.renderer";
import { EMAIL_TEMPLATES } from "../../../src/email-templates";

describe("ReactEmailRenderer", () => {
  let renderer: ReactEmailRenderer;

  beforeEach(() => {
    renderer = new ReactEmailRenderer();
  });

  describe("render", () => {
    it("should render welcome email", async () => {
      const result = await renderer.render(EMAIL_TEMPLATES.WELCOME, {
        username: "TestUser",
        baseUrl: "https://myapp.com",
      });

      expect(result.html).toContain("Welcome, TestUser");
      expect(result.html).toContain("https://myapp.com");
      expect(result.text).toContain("WELCOME");
      expect(result.subject).toBe("Welcome to our platform");
    });

    it("should render forgot-password email", async () => {
      const result = await renderer.render(EMAIL_TEMPLATES.FORGOT_PASSWORD, {
        resetLink: "https://myapp.com/reset-password?token=abc123",
      });

      expect(result.html).toContain("Reset Your Password");
      expect(result.html).toContain("https://myapp.com/reset-password?token=abc123");
      expect(result.text).toContain("https://myapp.com/reset-password?token=abc123");
      expect(result.subject).toBe("Reset your password");
    });

    it("should render magic-link email", async () => {
      const result = await renderer.render(EMAIL_TEMPLATES.MAGIC_LINK, {
        magicLink: "https://myapp.com/magic-link?token=xyz789",
      });

      expect(result.html).toContain("Sign In Link");
      expect(result.html).toContain("https://myapp.com/magic-link?token=xyz789");
      expect(result.text).toContain("https://myapp.com/magic-link?token=xyz789");
      expect(result.subject).toBe("Your magic sign-in link");
    });

    it("should render verify-email email", async () => {
      const result = await renderer.render(EMAIL_TEMPLATES.VERIFY_EMAIL, {
        verifyLink: "https://myapp.com/verify?token=ver456",
        username: "NewUser",
      });

      expect(result.html).toContain("Verify Your Email");
      expect(result.html).toContain("Hi NewUser");
      expect(result.html).toContain("https://myapp.com/verify?token=ver456");
      expect(result.text).toContain("https://myapp.com/verify?token=ver456");
      expect(result.subject).toBe("Verify your email address");
    });

    it("should throw for unknown template", async () => {
      await expect(
        renderer.render("unknown-template", {}),
      ).rejects.toThrow("Unknown email template: unknown-template");
    });
  });
});
