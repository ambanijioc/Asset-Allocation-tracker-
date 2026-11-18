import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

import { env } from '@/src/lib/config/env';

/** Firebase is initialized lazily so web bundling and tests never touch RN APIs. */
const app = getApps().length ? getApp() : initializeApp(env.firebase);

function createAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh can re-run module init; reuse the existing instance.
    return getAuth(app);
  }
}

export const auth = createAuth();
