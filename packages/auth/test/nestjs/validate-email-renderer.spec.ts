import { validateEmailRenderer } from "../../src/nestjs/validate-email-renderer";
import { ReactEmailRenderer } from "../../src/infrastructure/email/react-email.renderer";
import type { IEmailRenderer, RenderedEmail } from "../../src/domain/ports/email-renderer.port";

describe("validateEmailRenderer", () => {
  it("passes for the default ReactEmailRenderer", async () => {
    await expect(validateEmailRenderer(new ReactEmailRenderer())).resolves.toBeUndefined();
  });

  it("passes for a complete custom renderer", async () => {
    const renderer: IEmailRenderer = {
      async render(): Promise<RenderedEmail> {
        return { html: "<p>hi</p>", text: "hi", subject: "Subject" };
      },
    };
    await expect(validateEmailRenderer(renderer)).resolves.toBeUndefined();
  });

  it("throws listing the template when the renderer does not handle it", async () => {
    const renderer: IEmailRenderer = {
      async render(name): Promise<RenderedEmail> {
        if (name === "magic-link") throw new Error("not implemented");
        return { html: "<p>x</p>", text: "x", subject: "S" };
      },
    };
    await expect(validateEmailRenderer(renderer)).rejects.toThrow(/magic-link/);
    await expect(validateEmailRenderer(renderer)).rejects.toThrow(/not implemented/);
  });

  it("throws when render returns an invalid shape (empty subject)", async () => {
    const renderer: IEmailRenderer = {
      async render(): Promise<RenderedEmail> {
        return { html: "<p>x</p>", text: "x", subject: "" };
      },
    };
    await expect(validateEmailRenderer(renderer)).rejects.toThrow(/conformance/);
  });

  it("aggregates every failing template", async () => {
    const renderer: IEmailRenderer = {
      async render(): Promise<RenderedEmail> {
        throw new Error("boom");
      },
    };
    const error = await validateEmailRenderer(renderer).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    for (const t of ["welcome", "forgot-password", "magic-link", "verify-email"]) {
      expect((error as Error).message).toContain(t);
    }
  });
});
