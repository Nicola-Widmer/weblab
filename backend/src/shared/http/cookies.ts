/**
 * Minimal cookie helpers so the backend needs no `cookie-parser` — it reads one
 * cookie and Express's own `res.cookie` / `res.clearCookie` handle writing.
 */

/** Read a single cookie value from a raw `Cookie` header. */
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}
