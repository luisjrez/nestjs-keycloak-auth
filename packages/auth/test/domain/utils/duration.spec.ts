import { parseDurationSeconds, parseDurationMs } from "../../../src/domain/utils/duration";

describe("parseDurationSeconds", () => {
  it.each([
    ["30s", 30],
    ["15m", 900],
    ["2h", 7200],
    ["7d", 604800],
  ])("should parse %s to %i seconds", (input, expected) => {
    expect(parseDurationSeconds(input)).toBe(expected);
  });

  it("should convert to milliseconds", () => {
    expect(parseDurationMs("1m")).toBe(60000);
  });

  it.each(["15min", "abc", "", "10", "1w", "-5m"])(
    "should throw on invalid input %p",
    (input) => {
      expect(() => parseDurationSeconds(input)).toThrow(/Invalid duration/);
    },
  );
});
