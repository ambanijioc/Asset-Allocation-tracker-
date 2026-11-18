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
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  unlink,
  updateProfile,
  type User,
} from 'firebase/auth';

import {
  GoogleSignInCancelledError,
  linkGoogleAccount as googleLinkAccount,
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
  linkedProviders: string[];
  hasPasswordLinked: boolean;
  hasGoogleLinked: boolean;
  isLinking: boolean;
  linkMessage: string;
  setLinkMessage: (message: string) => void;
  linkEmailPassword: (email: string, password: string) => Promise<boolean>;
  linkGoogle: () => Promise<boolean>;
  unlinkProvider: (providerId: string) => Promise<boolean>;
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

function mapLinkError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const messages: Record<string, string> = {
    'auth/provider-already-linked': 'This sign-in method is already linked to your account.',
    'auth/credential-already-in-use':
      'These credentials belong to another account. Sign in with that method first, then link here.',
    'auth/email-already-in-use':
      'These credentials belong to another account. Sign in with that method first, then link here.',
    'auth/requires-recent-login':
      'For security, sign out and sign back in, then try linking again.',
    'auth/invalid-credential': 'Invalid credentials. Check the email and password.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/weak-password': 'Use at least 6 characters for your password.',
    'auth/popup-closed-by-user': 'Google linking was cancelled.',
    'auth/cancelled-popup-request': 'Google linking was cancelled.',
    'auth/cancelled': 'Google linking was cancelled.',
    'auth/network-request-failed': 'Network unavailable. Check your connection.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
  };

  return (
    messages[code] ??
    (error instanceof Error ? error.message : 'Linking failed. Please try again.')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');

  const linkedProviders = useMemo(
    () => user?.providerData.map((provider) => provider.providerId) ?? [],
    [user],
  );
  const hasPasswordLinked = linkedProviders.includes('password');
  const hasGoogleLinked = linkedProviders.includes('google.com');

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

  const refreshUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setUser(null);
      return;
    }
    try {
      await current.reload();
    } catch {
      // The local providerData is still updated by link/unlink.
    }
    if (auth.currentUser) setUser({ ...auth.currentUser } as User);
  }, []);

  /** Link an email/password credential to the current (e.g. Google) session. */
  const linkEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (isLinking) return false;
      if (!email.trim() || !password) {
        setLinkMessage('Please enter both email and password.');
        return false;
      }
      setIsLinking(true);
      setLinkMessage('');
      try {
        const current = auth.currentUser;
        if (!current) throw new Error('No user is currently signed in.');
        await linkWithCredential(
          current,
          EmailAuthProvider.credential(email.trim(), password),
        );
        await refreshUser();
        setLinkMessage('Email/password linked. You can now sign in with either method.');
        return true;
      } catch (error) {
        setLinkMessage(mapLinkError(error));
        return false;
      } finally {
        setIsLinking(false);
      }
    },
    [isLinking, refreshUser],
  );

  /** Link Google to the current (e.g. email/password) session. */
  const linkGoogle = useCallback(async () => {
    if (isLinking) return false;
    setIsLinking(true);
    setLinkMessage('');
    try {
      await googleLinkAccount();
      await refreshUser();
      setLinkMessage('Google account linked. You can now sign in with either method.');
      return true;
    } catch (error) {
      if (error instanceof GoogleSignInCancelledError) return false;
      setLinkMessage(mapLinkError(error));
      return false;
    } finally {
      setIsLinking(false);
    }
  }, [isLinking, refreshUser]);

  const unlinkProvider = useCallback(
    async (providerId: string) => {
      if (isLinking) return false;
      const current = auth.currentUser;
      if (!current) {
        setLinkMessage('No user is currently signed in.');
        return false;
      }
      if ((current.providerData?.length ?? 0) <= 1) {
        setLinkMessage('Cannot unlink the only sign-in method. Link another method first.');
        return false;
      }
      setIsLinking(true);
      setLinkMessage('');
      try {
        await unlink(current, providerId);
        await refreshUser();
        setLinkMessage('Sign-in method unlinked.');
        return true;
      } catch (error) {
        setLinkMessage(mapLinkError(error));
        return false;
      } finally {
        setIsLinking(false);
      }
    },
    [isLinking, refreshUser],
  );

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
      linkedProviders,
      hasPasswordLinked,
      hasGoogleLinked,
      isLinking,
      linkMessage,
      setLinkMessage,
      linkEmailPassword,
      linkGoogle,
      unlinkProvider,
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
      linkedProviders,
      hasPasswordLinked,
      hasGoogleLinked,
      isLinking,
      linkMessage,
      linkEmailPassword,
      linkGoogle,
      unlinkProvider,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
