/**
 * Runtime configuration.
 *
 * EXPO_PUBLIC_* values are inlined at build time. Secrets never belong here —
 * the Firebase web config below is a public client identifier, not a secret.
 */
import { z } from 'zod';

const firebaseDefaults = {
  apiKey: 'AIzaSyAEEYk3TibsfxvUXTxnCNrQbJF7YVH8f_s',
  authDomain: 'liquid-muse-491818-a9.firebaseapp.com',
  projectId: 'liquid-muse-491818-a9',
  appId: '1:178094132106:web:eae58a57935805c96bd673',
  messagingSenderId: '178094132106',
} as const;

const EnvSchema = z.object({
  apiUrl: z.string().url(),
  firebase: z.object({
    apiKey: z.string().min(1),
    authDomain: z.string().min(1),
    projectId: z.string().min(1),
    appId: z.string().min(1),
    messagingSenderId: z.string().min(1),
  }),
  /** Web OAuth client ID used to request a Google ID token. */
  googleWebClientId: z.string().min(1).optional(),
  /** iOS OAuth client ID, only needed for iOS builds without Firebase plist. */
  googleIosClientId: z.string().min(1).optional(),
  /** Set to '1' to always use the bundled demo dataset. */
  forceDemo: z.boolean(),
});

const optional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const parsed = EnvSchema.safeParse({
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? firebaseDefaults.apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? firebaseDefaults.authDomain,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? firebaseDefaults.projectId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? firebaseDefaults.appId,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      firebaseDefaults.messagingSenderId,
  },
  googleWebClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  googleIosClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  forceDemo: process.env.EXPO_PUBLIC_FORCE_DEMO === '1',
});

if (!parsed.success) {
  // Fail loudly in development, but keep the app bootable in production.
  console.error('[config] Invalid environment', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : {
      apiUrl: 'http://127.0.0.1:3000',
      firebase: firebaseDefaults,
      googleWebClientId: undefined,
      googleIosClientId: undefined,
      forceDemo: true,
    };

export const APP_VERSION = '0.1.0';
