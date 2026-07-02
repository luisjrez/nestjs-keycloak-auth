export class Password {
  private constructor(public readonly value: string) {}

  /**
   * Minimum password requirements (Django-like):
   * - At least 8 characters
   * - Cannot be entirely numeric
   */
  static create(raw: string): Password {
    if (raw.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    if (/^\d+$/.test(raw)) {
      throw new Error("Password cannot be entirely numeric");
    }
    return new Password(raw);
  }

  toString(): string {
    return this.value;
  }
}
