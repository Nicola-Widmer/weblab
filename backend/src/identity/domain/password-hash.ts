/**
 * Wraps an already-hashed password (a bcrypt string, ADR-0005). The point of the
 * type is that it can never be confused with a plaintext password: the raw
 * string only enters through `PasswordHash.fromHash` and the plaintext never
 * touches this class. Hashing and verification live in the `PasswordHasher`
 * port.
 */
export class PasswordHash {
  private constructor(readonly value: string) {}

  static fromHash(hash: string): PasswordHash {
    if (hash.length === 0) throw new Error('Empty password hash');
    return new PasswordHash(hash);
  }
}
