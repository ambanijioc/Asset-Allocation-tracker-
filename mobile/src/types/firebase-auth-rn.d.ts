/**
 * The React Native build of the Firebase JS SDK exports
 * `getReactNativePersistence`, but the public type entry point omits it.
 * This augmentation exposes the runtime API without resorting to `any` or
 * suppressing errors at every call site.
 */
import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

declare module 'firebase/auth' {
  function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
