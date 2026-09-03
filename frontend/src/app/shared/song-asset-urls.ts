/**
 * Byte-serving endpoints for a song's binary assets (ADR-0006: paths match the
 * generated client's `baseUrl: /api`). Kept in one place so the player store and
 * the list row don't each hand-build the string.
 */
export const songAudioUrl = (songId: string): string => `/api/songs/${songId}/audio`;

export const songCoverUrl = (songId: string): string => `/api/songs/${songId}/cover`;
