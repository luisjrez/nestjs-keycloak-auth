/**
 * Parses a duration expressed as `<number><unit>` where unit is
 * s (seconds), m (minutes), h (hours) or d (days) — e.g. "15m", "7d".
 *
 * Throws on invalid input so misconfiguration fails at startup instead of
 * silently falling back to a default.
 */
export function parseDurationSeconds(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid duration "${value}" — expected <number><s|m|h|d>, e.g. "15m" or "7d"`,
    );
  }
  const num = Number.parseInt(match[1]!, 10);
  switch (match[2]) {
    case "s":
      return num;
    case "m":
      return num * 60;
    case "h":
      return num * 3600;
    default:
      return num * 86400;
  }
}

export function parseDurationMs(value: string): number {
  return parseDurationSeconds(value) * 1000;
}
