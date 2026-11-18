import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { GoogleIcon } from '@/src/components/ui/GoogleIcon';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { isExpoGo, isGoogleSignInConfigured } from '@/src/features/auth/google';
import { APP_VERSION } from '@/src/lib/config/env';
import { radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

type Mode = 'signin' | 'signup' | 'reset';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, resetPassword, continueAsDemo } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const googleAvailable = !isExpoGo && isGoogleSignInConfigured;

  const switchMode = (next: Mode) => {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    const errors: typeof fieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (mode !== 'reset' && password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    if (mode === 'signup' && displayName.trim().length < 2) {
      errors.name = 'Enter your name.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    setNotice(null);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setNotice(`Reset link sent to ${email.trim()}. Check your inbox.`);
      } else if (mode === 'signup') {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!googleAvailable) return;

    setGoogleLoading(true);
    setFormError(null);
    setNotice(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Google sign-in failed. Please try again.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await continueAsDemo();
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
              <Feather name="pie-chart" size={26} color={colors.accent} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Asset Tracker</Text>
            <Text style={[type.body, styles.tagline, { color: colors.muted }]}>
              Track allocation, monitor P&L and screen the market — in one place.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[type.title, { color: colors.text }]}>
                {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
              </Text>
              <Text style={[type.caption, { color: colors.muted }]}>
                {mode === 'signin'
                  ? 'Sign in to sync your portfolio across devices.'
                  : mode === 'signup'
                    ? 'Start with a clean, private portfolio.'
                    : 'We will email you a secure reset link.'}
              </Text>
            </View>

            {mode !== 'reset' ? (
              <>
                <Button
                  label="Continue with Google"
                  onPress={handleGoogle}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  iconNode={<GoogleIcon size={18} />}
                  loading={googleLoading}
                  disabled={!googleAvailable || submitting}
                  accessibilityHint={
                    googleAvailable
                      ? 'Signs in with your Google account'
                      : 'Unavailable in Expo Go or until Google OAuth is configured'
                  }
                />
                {!googleAvailable ? (
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {isExpoGo
                      ? 'Google sign-in needs a development build — Expo Go cannot load custom native modules.'
                      : 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google sign-in.'}
                  </Text>
                ) : null}

                <View style={styles.dividerRow}>
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                  <Text style={[type.caption, { color: colors.muted }]}>or use email</Text>
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                </View>
              </>
            ) : null}

            {mode === 'signup' ? (
              <TextField
                label="Name"
                placeholder="Your name"
                value={displayName}
                onChangeText={setDisplayName}
                error={fieldErrors.name}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />
            ) : null}

            <TextField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            {mode !== 'reset' ? (
              <TextField
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            ) : null}

            {formError ? (
              <Text style={[type.caption, { color: colors.negative }]} accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}
            {notice ? (
              <Text style={[type.caption, { color: colors.positive }]} accessibilityRole="alert">
                {notice}
              </Text>
            ) : null}

            <Button
              label={
                mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'
              }
              onPress={handleSubmit}
              loading={submitting}
              disabled={googleLoading}
              size="lg"
              fullWidth
              icon={mode === 'reset' ? 'mail' : 'arrow-right'}
            />

            <View style={styles.links}>
              {mode === 'signin' ? (
                <>
                  <Pressable onPress={() => switchMode('signup')} accessibilityRole="button">
                    <Text style={[styles.link, { color: colors.accent }]}>Create account</Text>
                  </Pressable>
                  <Pressable onPress={() => switchMode('reset')} accessibilityRole="button">
                    <Text style={[styles.link, { color: colors.muted }]}>Forgot password?</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => switchMode('signin')} accessibilityRole="button">
                  <Text style={[styles.link, { color: colors.accent }]}>Back to sign in</Text>
                </Pressable>
              )}
            </View>
          </Card>

          <View style={styles.demo}>
            <View style={[styles.dividerRow]}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[type.caption, { color: colors.muted }]}>or</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>
            <Button
              label="Explore demo portfolio"
              onPress={handleDemo}
              variant="secondary"
              loading={demoLoading}
              icon="play-circle"
              fullWidth
            />
            <Text style={[styles.footnote, { color: colors.muted }]}>
              Demo mode uses a bundled sample portfolio. It never touches your account and is
              read-only.
            </Text>
          </View>

          <Text style={[styles.version, { color: colors.muted }]}>v{APP_VERSION}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    paddingVertical: space.xxl,
    gap: space.xxl,
  },
  brand: { alignItems: 'center', gap: space.sm },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  appName: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  tagline: { textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  card: { gap: space.lg },
  cardHeader: { gap: space.xs, marginBottom: space.xs },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontSize: 13, fontWeight: '600' },
  demo: { gap: space.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  footnote: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  version: { fontSize: 11, textAlign: 'center' },
});
