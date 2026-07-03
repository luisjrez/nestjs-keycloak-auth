import { createHash } from "node:crypto";
import { hashToken } from "../../../src/infrastructure/storage/token-hash";

describe("hashToken", () => {
  it("should produce a stable SHA-256 hex digest", () => {
    const expected = createHash("sha256").update("my-token").digest("hex");
    expect(hashToken("my-token")).toBe(expected);
  });

  it("should be deterministic", () => {
    expect(hashToken("same")).toBe(hashToken("same"));
  });

  it("should differ for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("should never return the input in clear text", () => {
    expect(hashToken("secret-value")).not.toContain("secret-value");
  });
});
