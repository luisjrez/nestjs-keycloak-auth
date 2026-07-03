import { WeakPasswordError } from "../errors/auth-errors";

export class Password {
  private constructor(public readonly value: string) {}

  static create(raw: string): Password {
    const errors: string[] = [];

    if (raw.length < 8) {
      errors.push("at least 8 characters");
    }
    if (!/[A-Z]/.test(raw)) {
      errors.push("an uppercase letter");
    }
    if (!/[a-z]/.test(raw)) {
      errors.push("a lowercase letter");
    }
    if (!/[0-9]/.test(raw)) {
      errors.push("a number");
    }
    if (!/[^A-Za-z0-9]/.test(raw)) {
      errors.push("a special character");
    }

    if (errors.length > 0) {
      throw new WeakPasswordError(
        `Password must contain ${errors.join(", ")}`,
      );
    }

    return new Password(raw);
  }

  toString(): string {
    return this.value;
  }
}
