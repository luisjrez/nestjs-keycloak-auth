import type { IEmailRenderer } from "../domain/ports/email-renderer.port";
import { EMAIL_TEMPLATES } from "../application/constants/email-templates";

/**
 * Every template the package renders, with representative data. Used to
 * smoke-test a custom renderer at startup so a missing/broken template fails
 * the boot instead of the first email send.
 */
const REQUIRED_TEMPLATES: ReadonlyArray<{
  name: string;
  data: Record<string, string>;
}> = [
  { name: EMAIL_TEMPLATES.WELCOME, data: { username: "test", baseUrl: "https://example.com" } },
  { name: EMAIL_TEMPLATES.FORGOT_PASSWORD, data: { resetLink: "https://example.com/reset?token=x" } },
  { name: EMAIL_TEMPLATES.MAGIC_LINK, data: { magicLink: "https://example.com/magic?token=x" } },
  {
    name: EMAIL_TEMPLATES.VERIFY_EMAIL,
    data: { verifyLink: "https://example.com/verify?token=x", username: "test" },
  },
];

/**
 * Renders every required template once and asserts the result shape. Throws an
 * aggregated error listing every template that failed, so a consumer's custom
 * renderer is proven complete at startup rather than at first send.
 */
export async function validateEmailRenderer(renderer: IEmailRenderer): Promise<void> {
  const failures: string[] = [];

  for (const { name, data } of REQUIRED_TEMPLATES) {
    try {
      const result = await renderer.render(name, data);
      if (
        !result ||
        typeof result.html !== "string" ||
        typeof result.text !== "string" ||
        typeof result.subject !== "string" ||
        result.html.length === 0 ||
        result.subject.length === 0
      ) {
        failures.push(`  - "${name}": render() returned an invalid RenderedEmail (need non-empty html/text/subject)`);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push(`  - "${name}": render() threw — ${reason}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Custom emailRenderer failed template conformance check:\n${failures.join("\n")}\n` +
        `A renderer must handle every template the package emits.`,
    );
  }
}
