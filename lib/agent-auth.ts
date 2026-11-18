import { NextResponse } from 'next/server';

import { verifyFirebaseIdToken } from './firebase-auth';

/**
 * Resolves the Firebase user behind an API request.
 *
 * Signed-in mobile clients send `Authorization: Bearer <idToken>`. Production
 * requires a valid token; local development falls back to a shared `development`
 * uid so the API can be exercised without a phone session.
 */
export async function resolveRequestUid(
  request: Request,
): Promise<{ uid: string } | { response: NextResponse }> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (token) {
    try {
      const user = await verifyFirebaseIdToken(token);
      if (!user) {
        return {
          response: NextResponse.json(
            { error: 'Your session expired. Please sign in again.' },
            { status: 401 },
          ),
        };
      }
      return { uid: user.uid };
    } catch (error: any) {
      console.warn('[AUTH] Firebase token verification failed:', error?.message || error);
      return {
        response: NextResponse.json(
          { error: 'Could not verify your session. Please sign in again.' },
          { status: 401 },
        ),
      };
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      response: NextResponse.json(
        { error: 'Sign in to use the assistant.' },
        { status: 401 },
      ),
    };
  }

  return { uid: 'development' };
}
