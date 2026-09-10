import { Uuid } from '../../shared/domain/uuid';

/**
 * The identity facts the BFF trusts from a validated Keycloak access token.
 * `subject` is Keycloak's `sub` (a UUID); it becomes the local user id.
 */
export interface VerifiedToken {
  subject: Uuid;
  email?: string;
  name?: string;
}

/**
 * Port: validate a Keycloak-issued JWT access token — signature against the
 * realm JWKS, plus `iss`, `aud` and expiry. Rejects if any check fails; the
 * HTTP edge turns a rejection into 401.
 */
export abstract class TokenVerifier {
  abstract verify(accessToken: string): Promise<VerifiedToken>;
}
