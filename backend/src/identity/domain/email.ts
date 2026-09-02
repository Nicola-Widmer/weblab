/**
 * A normalised, format-valid email address. Value object: equality by value,
 * immutable. Construct with `Email.of` — it trims and lower-cases, then checks
 * the shape. Uniqueness across users is a context rule (the `Register` use
 * case), not something this type can guarantee.
 */
export class Email {
  private constructor(readonly value: string) {}

  static of(raw: string): Email {
    const normalised = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
      throw new Error(`Invalid email: ${raw}`);
    }
    return new Email(normalised);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
