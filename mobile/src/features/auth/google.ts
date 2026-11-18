import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';

import { env } from '@/src/lib/config/env';

import { auth } from './firebase';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

/**
 * Expo Go cannot load custom native modules, so the Google button is disabled
 * there. Development builds and standalone apps report no `expoGoConfig`.
 */
export const isExpoGo = Constants.expoGoConfig != null;

export const isGoogleSignInConfigured = Boolean(env.googleWebClientId);

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleSignInCancelledError';
  }
}

let nativeModule: GoogleSignInModule | null = null;
let configured = false;

function loadNativeModule(): GoogleSignInModule {
  if (isExpoGo) {
    throw new Error(
      'Google sign-in requires a development build. It cannot run in Expo Go because it needs a custom native module.',
    );
  }

  if (!nativeModule) {
    // Required lazily so this file stays safe to import in Expo Go. The module
    // registers its native bridge at import time, which would otherwise crash
    // the app before the UI can explain that a dev build is required.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  }

  return nativeModule;
}

function configureGoogle(module: GoogleSignInModule): void {
  if (configured) return;

  if (!env.googleWebClientId) {
    throw new Error(
      'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the app.',
    );
  }

  module.GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
    offlineAccess: false,
  });
  configured = true;
}

function messageFor(error: unknown): Error {
  if (error instanceof GoogleSignInCancelledError) return error;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const messages: Record<string, string> = {
    'auth/account-exists-with-different-credential':
      'An account with this email already exists. Sign in with your password instead, or use a different Google account.',
    'auth/credential-already-in-use': 'This Google account is already linked to another user.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled in the Firebase console.',
    'auth/network-request-failed': 'Network unavailable. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/invalid-credential':
      'Google sign-in could not be verified. Check the OAuth client IDs and SHA-1 fingerprint.',
    'auth/internal-error':
      'Firebase could not complete Google sign-in. Check the OAuth configuration and try again.',
  };

  return new Error(
    messages[code] ??
      (error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'),
  );
}

/**
 * Opens the native Google account picker, turns the returned ID token into a
 * Firebase credential, and signs the user into the same project as the web app.
 */
export async function signInWithGoogle(): Promise<void> {
  const module = loadNativeModule();
  configureGoogle(module);

  try {
    if (Platform.OS === 'android') {
      await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await module.GoogleSignin.signIn();
    if (response.type === 'cancelled') throw new GoogleSignInCancelledError();

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error(
        'Google did not return an ID token. Make sure the Web client ID belongs to your Firebase project.',
      );
    }

    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } catch (error) {
    if (module.isErrorWithCode(error)) {
      if (error.code === module.statusCodes.SIGN_IN_CANCELLED) {
        throw new GoogleSignInCancelledError();
      }
      if (error.code === module.statusCodes.IN_PROGRESS) {
        throw new Error('A Google sign-in is already in progress.');
      }
      if (error.code === module.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is unavailable or out of date. Update it and try again.');
      }
    }

    throw messageFor(error);
  }
}

/** Best-effort Google session cleanup so the next sign-in shows the account picker. */
export async function signOutFromGoogle(): Promise<void> {
  if (isExpoGo || !isGoogleSignInConfigured) return;

  try {
    const module = loadNativeModule();
    await module.GoogleSignin.signOut();
  } catch {
    // Signing out of Firebase is what matters; this is only session cleanup.
  }
}
