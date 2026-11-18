import { createPublicKey, verify as verifySignature } from 'node:crypto';

/**
 * Minimal Firebase ID-token verification.
 *
 * The mobile app signs in with Firebase and sends `Authorization: Bearer <idToken>`
 * on API calls. We only need to verify RS256 signatures against Google's public
 * keys and check the standard claims, so this avoids pulling in firebase-admin
 * just for the assistant route.
 */

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'liquid-muse-491818-a9';

type PublicJwk = {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
};

type JwksCache = {
  keys: PublicJwk[];
  expiresAt: number;
};

let jwksCache: JwksCache | null = null;

function decodeJsonPart(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function getPublicKeys(): Promise<PublicJwk[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;

  const response = await fetch(JWKS_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not fetch Firebase signing keys (HTTP ${response.status})`);
  }

  const body = (await response.json()) as { keys?: PublicJwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache = { keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return keys;
}

export type VerifiedFirebaseUser = { uid: string };

export async function verifyFirebaseIdToken(
  token: string,
): Promise<VerifiedFirebaseUser | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;

  let header: any;
  let payload: any;
  try {
    header = decodeJsonPart(headerPart);
    payload = decodeJsonPart(payloadPart);
  } catch {
    return null;
  }

  if (header?.alg !== 'RS256' || typeof header?.kid !== 'string') return null;

  let keys = await getPublicKeys();
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');

  // Google rotates signing keys occasionally. If the cache does not have the
  // key yet, refresh once before rejecting the token.
  if (!jwk) {
    jwksCache = null;
    keys = await getPublicKeys();
    jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  }
  if (!jwk?.n || !jwk?.e) return null;

  let validSignature = false;
  try {
    const publicKey = createPublicKey({
      key: { kty: 'RSA', n: jwk.n, e: jwk.e },
      format: 'jwk',
    });
    validSignature = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      publicKey,
      Buffer.from(signaturePart, 'base64url'),
    );
  } catch {
    return null;
  }
  if (!validSignature) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (typeof payload.iat !== 'number' || payload.iat > now + 5 * 60) return null;
  if (payload.aud !== PROJECT_ID) return null;
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) return null;
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

  return { uid: payload.sub };
}
