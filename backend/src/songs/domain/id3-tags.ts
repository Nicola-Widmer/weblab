/**
 * Metadata parsed out of an uploaded MP3. Transient — read once during upload by
 * the `Id3Reader` port, never persisted as-is. Every field is optional; a
 * missing title falls back to the filename.
 */
export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
  coverBytes?: Buffer;
  /** MIME type of `coverBytes` (e.g. `image/jpeg`, `image/png`). */
  coverMimeType?: string;
}
