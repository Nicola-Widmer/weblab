/**
 * `Uuid` — the type of every entity id and every cross-aggregate reference
 * (`ownerId`, `songId`, `entryId`, …). A branded `string`: still a string at
 * runtime, but the compiler will not let a raw string in where a `Uuid` is
 * expected. Minted by the `IdGenerator` port (see `shared/application`).
 */
export type Uuid = string & { readonly __brand: 'Uuid' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): value is Uuid {
  return UUID_RE.test(value);
}

/** Brand a string as a `Uuid`, validating its shape. Throws on a malformed id. */
export function asUuid(value: string): Uuid {
  if (!isUuid(value)) throw new Error(`Not a UUID: ${value}`);
  return value as Uuid;
}
