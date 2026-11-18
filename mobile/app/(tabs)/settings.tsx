import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { policyStatusView } from '@/src/components/portfolio/policyStatus';
import { Badge } from '@/src/components/ui/Badge';
import { Banner } from '@/src/components/ui/Banner';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { GoogleIcon } from '@/src/components/ui/GoogleIcon';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { TextField } from '@/src/components/ui/TextField';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { isExpoGo, isGoogleSignInConfigured } from '@/src/features/auth/google';
import { usePortfolioData } from '@/src/features/portfolio/queries';
import { APP_VERSION, env } from '@/src/lib/config/env';
import { formatCompactINR, formatPercent } from '@/src/lib/format/money';
import { radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

const THEME_OPTIONS = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const;

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useTheme();
  const {
    user,
    isDemo,
    signOut,
    linkedProviders,
    hasPasswordLinked,
    hasGoogleLinked,
    isLinking,
    linkMessage,
    setLinkMessage,
    linkEmailPassword,
    linkGoogle,
    unlinkProvider,
  } = useAuth();
  const { summary, policyConfig, policyEvaluation } = usePortfolioData();
  const policyStatus = policyStatusView(policyEvaluation);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [linkEmail, setLinkEmail] = useState(user?.email ?? '');
  const [linkPassword, setLinkPassword] = useState('');
  const googleAvailable = !isExpoGo && isGoogleSignInConfigured;

  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Demo investor';
  const email = user?.email ?? 'demo@assettracker.app';

  const confirmSignOut = () => {
    Alert.alert(
      isDemo ? 'Exit demo' : 'Sign out',
      isDemo
        ? 'You will return to the sign-in screen.'
        : 'Your data stays safely synced to your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDemo ? 'Exit demo' : 'Sign out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
    );
  };

  const submitPasswordLink = async () => {
    const ok = await linkEmailPassword(linkEmail, linkPassword);
    if (ok) {
      setLinkPassword('');
      setShowPasswordForm(false);
    }
  };

  const confirmUnlink = (providerId: string, label: string) => {
    Alert.alert(
      `Unlink ${label}`,
      'You will no longer be able to sign in with this method.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => {
            void unlinkProvider(providerId);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" subtitle="Account, appearance and data" />

      <View style={styles.stack}>
        {isDemo ? (
          <Banner
            tone="warning"
            icon="play-circle"
            message="You are in demo mode. Nothing you do here affects a real account."
          />
        ) : null}

        <Card style={styles.accountCard}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{initials(displayName)}</Text>
          </View>
          <View style={styles.accountText}>
            <View style={styles.nameRow}>
              <Text style={[type.title, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Badge label={isDemo ? 'Demo' : 'Synced'} tone={isDemo ? 'warning' : 'positive'} />
            </View>
            <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </Card>

        {!isDemo ? (
          <View>
            <SectionHeader title="Sign-in methods" subtitle="Use Google or email/password" />
            <Card style={styles.card}>
              <View style={styles.providerRow}>
                <View style={[styles.providerIcon, { backgroundColor: colors.cardMuted }]}>
                  <GoogleIcon size={18} />
                </View>
                <View style={styles.providerText}>
                  <Text style={[type.bodyMedium, { color: colors.text }]}>Google</Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {hasGoogleLinked
                      ? 'Linked to this account'
                      : googleAvailable
                        ? 'Not linked'
                        : 'Needs a development build and Google client ID'}
                  </Text>
                </View>
                {hasGoogleLinked ? (
                  <Button
                    label="Unlink"
                    onPress={() => confirmUnlink('google.com', 'Google')}
                    variant="ghost"
                    size="sm"
                    disabled={isLinking || linkedProviders.length <= 1}
                  />
                ) : (
                  <Button
                    label={isLinking ? 'Linking…' : 'Link'}
                    onPress={() => {
                      void linkGoogle();
                    }}
                    variant="secondary"
                    size="sm"
                    disabled={isLinking || !googleAvailable}
                  />
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.providerRow}>
                <View style={[styles.providerIcon, { backgroundColor: colors.cardMuted }]}>
                  <Feather name="mail" size={17} color={colors.textSecondary} />
                </View>
                <View style={styles.providerText}>
                  <Text style={[type.bodyMedium, { color: colors.text }]}>Email / Password</Text>
                  <Text style={[type.caption, { color: colors.muted }]}>
                    {hasPasswordLinked ? 'Linked to this account' : 'Not linked'}
                  </Text>
                </View>
                {hasPasswordLinked ? (
                  <Button
                    label="Unlink"
                    onPress={() => confirmUnlink('password', 'email/password')}
                    variant="ghost"
                    size="sm"
                    disabled={isLinking || linkedProviders.length <= 1}
                  />
                ) : (
                  <Button
                    label={showPasswordForm ? 'Hide' : 'Set password'}
                    onPress={() => {
                      setShowPasswordForm((value) => !value);
                      setLinkMessage('');
                    }}
                    variant="secondary"
                    size="sm"
                    disabled={isLinking}
                  />
                )}
              </View>

              {!hasPasswordLinked && showPasswordForm ? (
                <View style={styles.form}>
                  <TextField
                    label="Email"
                    value={linkEmail}
                    onChangeText={setLinkEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!isLinking}
                  />
                  <TextField
                    label="Password"
                    value={linkPassword}
                    onChangeText={setLinkPassword}
                    secureTextEntry
                    textContentType="newPassword"
                    hint="At least 6 characters"
                    editable={!isLinking}
                  />
                  <Button
                    label={isLinking ? 'Linking…' : 'Link email/password'}
                    onPress={() => {
                      void submitPasswordLink();
                    }}
                    loading={isLinking}
                    fullWidth
                  />
                </View>
              ) : null}

              {linkMessage ? (
                <Banner
                  tone={
                    linkMessage.includes('linked') || linkMessage.includes('unlinked')
                      ? 'info'
                      : 'warning'
                  }
                  icon="info"
                  message={linkMessage}
                />
              ) : null}
            </Card>
          </View>
        ) : null}

        <View>
          <SectionHeader title="Portfolio" subtitle="Current snapshot" />
          <Card style={styles.summaryCard}>
            <SummaryRow label="Current value" value={formatCompactINR(summary.currentValue)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SummaryRow label="Invested" value={formatCompactINR(summary.investedValue)} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SummaryRow
              label="Unrealised P&L"
              value={formatPercent(summary.pnlPercent, { signed: true })}
              tone={summary.pnl >= 0 ? colors.positive : colors.negative}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SummaryRow label="Holdings" value={`${summary.assetCount}`} />
          </Card>
        </View>

        <View>
          <SectionHeader title="Portfolio policy" subtitle="Targets, bands and review cadence" />
          <Card
            onPress={() => router.push('/policy')}
            accessibilityLabel="Open allocation policy"
            style={styles.policyRow}
          >
            <View style={[styles.policyIcon, { backgroundColor: colors.accentSoft }]}>
              <Feather name="target" size={18} color={colors.accent} />
            </View>
            <View style={styles.policyText}>
              <Text style={[type.title, { color: colors.text }]}>Allocation policy</Text>
              <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
                {policyEvaluation.isTemplate
                  ? isDemo
                    ? 'Read-only in demo'
                    : 'Confirm your targets'
                  : !policyEvaluation.isValid
                    ? `Policy v${policyConfig.policy.version} · targets total ${formatPercent(
                        policyEvaluation.targetSum,
                      )}`
                    : `Policy v${policyConfig.policy.version} · ${policyEvaluation.inToleranceCount}/${policyEvaluation.targetedCount} in tolerance`}
              </Text>
            </View>
            <Badge label={policyStatus.badgeLabel} tone={policyStatus.badgeTone} />
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Card>
        </View>

        <View>
          <SectionHeader title="AI assistant" subtitle="Keys and automatic rotation" />
          <Card
            onPress={() => router.push('/ai-keys')}
            accessibilityLabel="Manage AI assistant API keys"
            style={styles.policyRow}
          >
            <View style={[styles.policyIcon, { backgroundColor: colors.accentSoft }]}>
              <Feather name="key" size={18} color={colors.accent} />
            </View>
            <View style={styles.policyText}>
              <Text style={[type.title, { color: colors.text }]}>API keys</Text>
              <Text style={[type.caption, { color: colors.muted }]} numberOfLines={1}>
                {isDemo
                  ? 'Sign in to manage keys'
                  : 'Groq, OpenRouter and Gemini · pick a model in chat'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Card>
        </View>

        <View>
          <SectionHeader title="Appearance" subtitle="Matches your device by default" />
          <Card style={styles.card}>
            <View style={styles.chips}>
              {THEME_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={preference === option.key}
                  onPress={() => setPreference(option.key)}
                />
              ))}
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Data & connection" />
          <Card style={styles.card}>
            <InfoRow icon="server" label="API endpoint" value={env.apiUrl} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="refresh-cw" label="Quote refresh" value="Every 5 minutes" />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="shield" label="Transport" value={env.apiUrl.startsWith('https') ? 'TLS' : 'Local network'} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="smartphone" label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} />
          </Card>
        </View>

        <View>
          <SectionHeader title="About" />
          <Card style={styles.card}>
            <InfoRow icon="info" label="Version" value={APP_VERSION} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon="package"
              label="Runtime"
              value={`Expo SDK ${Constants.expoConfig?.sdkVersion?.split('.')[0] ?? '57'}`}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="lock" label="Privacy" value="Portfolio data stays in your account" />
          </Card>
        </View>

        <Button
          label={isDemo ? 'Exit demo' : 'Sign out'}
          onPress={confirmSignOut}
          variant="danger"
          icon="log-out"
          fullWidth
          size="lg"
        />

        <Text style={[styles.footer, { color: colors.muted }]}>
          Asset Tracker · Built with Expo and React Native
        </Text>
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[type.body, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: tone ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: ComponentProps<typeof Feather>['name']; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={15} color={colors.muted} />
      <Text style={[type.body, { color: colors.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.muted }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  accountText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  summaryCard: { gap: space.md },
  card: { gap: space.md },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  policyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyText: { flex: 1, gap: 2 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerText: { flex: 1, gap: 2 },
  form: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  rowValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  infoValue: { fontSize: 12, flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth },
  footer: { fontSize: 11, textAlign: 'center', marginTop: space.sm },
});
