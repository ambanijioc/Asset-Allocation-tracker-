import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';

import {
  GoogleSignInCancelledError,
  signInWithGoogle as googleSignIn,
  signOutFromGoogle,
} from './google';
import { auth } from './firebase';

const DEMO_KEY = 'asset-tracker/demo-session';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  uid: string | null;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsDemo: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const messages: Record<string, string> = {
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': 'Use at least 6 characters for your password.',
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Network unavailable. Check your connection.',
  };

  return new Error(messages[code] ?? 'Something went wrong. Please try again.');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      if (nextUser) {
        // A real session always wins over the local demo flag.
        setIsDemo(false);
        void AsyncStorage.removeItem(DEMO_KEY);
      }
      setAuthReady(true);
    });

    AsyncStorage.getItem(DEMO_KEY)
      .then((stored) => {
        if (active && stored === '1') setIsDemo(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setDemoReady(true);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      throw messageFor(error);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
        // onAuthStateChanged fired before the profile update; refresh the
        // in-memory user so greetings and settings pick up the name.
        setUser(auth.currentUser);
      }
    } catch (error) {
      throw messageFor(error);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await googleSignIn();
    } catch (error) {
      // Closing the account picker is a normal outcome, not an error.
      if (error instanceof GoogleSignInCancelledError) return;
      throw error instanceof Error ? error : new Error('Google sign-in failed.');
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw messageFor(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsDemo(false);
    await AsyncStorage.removeItem(DEMO_KEY).catch(() => {});
    await signOutFromGoogle();
    await firebaseSignOut(auth).catch(() => {});
  }, []);

  const continueAsDemo = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_KEY, '1').catch(() => {});
    setIsDemo(true);
  }, []);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const status: AuthStatus = !authReady || !demoReady ? 'loading' : user || isDemo ? 'signedIn' : 'signedOut';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      uid: user?.uid ?? null,
      isDemo,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
      continueAsDemo,
      getToken,
    }),
    [
      status,
      user,
      isDemo,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
      continueAsDemo,
      getToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
