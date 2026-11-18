import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Badge } from '@/src/components/ui/Badge';
import { Banner } from '@/src/components/ui/Banner';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { IconButton } from '@/src/components/ui/IconButton';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { ErrorState } from '@/src/components/ui/States';
import { TextField } from '@/src/components/ui/TextField';
import type { AiKeyEntry } from '@/src/features/assistant/keys';
import { useAiKeys } from '@/src/features/assistant/useAiKeys';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

const DEFAULT_MAX_KEYS = 10;

export default function AiKeysScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDemo } = useAuth();
  const { list, add, remove } = useAiKeys();

  const [keyInput, setKeyInput] = useState('');
  const [label, setLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const keys = list.data?.keys ?? [];
  const maxKeys = list.data?.maxKeys ?? DEFAULT_MAX_KEYS;
  const loading = list.isLoading;
  const loadError = list.error
    ? list.error instanceof Error
      ? list.error.message
      : 'Could not load your AI keys.'
    : null;

  const personalCount = keys.filter((entry) => entry.source === 'account').length;
  const serverCount = keys.length - personalCount;
  const canAdd =
    !isDemo && !add.isPending && personalCount < maxKeys && keyInput.trim().length > 0;

  const handleAdd = async () => {
    const value = keyInput.trim();
    if (!value || add.isPending || isDemo) return;

    setFormError(null);
    setNotice(null);
    setActionError(null);
    try {
      const response = await add.mutateAsync({
        key: value,
        label: label.trim() || undefined,
      });
      setKeyInput('');
      setLabel('');
      setNotice(
        `${response.key.label} added. The assistant will rotate to it automatically.`,
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not add the key.',
      );
    }
  };

  const removeKey = async (entry: AiKeyEntry) => {
    setDeletingId(entry.id);
    setNotice(null);
    setActionError(null);
    try {
      await remove.mutateAsync(entry.id);
      setNotice(`${entry.label} removed.`);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not remove the key.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (entry: AiKeyEntry) => {
    Alert.alert(
      'Remove key?',
      `${entry.label} (${entry.masked}) will no longer be used by the assistant.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeKey(entry);
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <ScreenHeader
          eyebrow="AI ASSISTANT"
          title="API keys"
          subtitle="Multiple Groq keys, rotated automatically"
          action={
            <IconButton
              icon="x"
              onPress={() => router.back()}
              accessibilityLabel="Close API key settings"
            />
          }
        />

        <View style={styles.stack}>
          {isDemo ? (
            <Banner
              tone="warning"
              icon="lock"
              message="Sign in with a real account to add or manage AI keys. Demo mode cannot store them."
            />
          ) : null}

          <Banner
            tone="info"
            icon="shield"
            message="Keys are stored on the server under your account. They are never included in the app bundle."
          />

          {notice ? (
            <Banner tone="info" icon="check-circle" message={notice} />
          ) : null}
          {actionError ? (
            <Banner tone="error" icon="alert-circle" message={actionError} />
          ) : null}

          <View>
            <SectionHeader
              title="Configured keys"
              subtitle={
                isDemo
                  ? 'Sign in to view keys'
                  : `${personalCount}/${maxKeys} personal${serverCount > 0 ? ` · ${serverCount} server` : ''}`
              }
            />

            {loading ? (
              <Card style={styles.loadingCard}>
                <Skeleton height={16} width="55%" />
                <Skeleton height={12} width="35%" />
                <Skeleton height={16} width="45%" />
                <Skeleton height={12} width="30%" />
              </Card>
            ) : loadError ? (
              <ErrorState
                title="Could not load keys"
                message={loadError}
                onRetry={() => void list.refetch()}
              />
            ) : keys.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.cardMuted }]}>
                  <Feather name="key" size={20} color={colors.muted} />
                </View>
                <Text style={[type.title, { color: colors.text }]}>No keys yet</Text>
                <Text style={[type.caption, styles.emptyText, { color: colors.muted }]}>
                  Add your first Groq key below. It is checked with Groq before it is saved.
                </Text>
              </Card>
            ) : (
              <Card padded={false}>
                {keys.map((entry, index) => (
                  <View key={entry.id}>
                    {index > 0 ? (
                      <View
                        style={[styles.divider, { backgroundColor: colors.border }]}
                      />
                    ) : null}
                    <View style={styles.keyRow}>
                      <View
                        style={[
                          styles.keyIcon,
                          {
                            backgroundColor:
                              entry.source === 'environment'
                                ? colors.accentSoft
                                : colors.cardMuted,
                          },
                        ]}
                      >
                        <Feather
                          name={entry.source === 'environment' ? 'server' : 'key'}
                          size={15}
                          color={
                            entry.source === 'environment'
                              ? colors.accent
                              : colors.muted
                          }
                        />
                      </View>
                      <View style={styles.keyText}>
                        <Text
                          style={[type.bodyMedium, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {entry.label}
                        </Text>
                        <Text style={[type.caption, { color: colors.muted }]}>
                          {entry.masked}
                        </Text>
                      </View>
                      <Badge
                        label={
                          entry.status === 'cooling'
                            ? 'Cooling'
                            : entry.source === 'environment'
                              ? 'Server'
                              : 'Active'
                        }
                        tone={
                          entry.status === 'cooling'
                            ? 'warning'
                            : entry.source === 'environment'
                              ? 'accent'
                              : 'positive'
                        }
                      />
                      {entry.source === 'account' ? (
                        deletingId === entry.id ? (
                          <ActivityIndicator size="small" color={colors.muted} />
                        ) : (
                          <Pressable
                            onPress={() => confirmDelete(entry)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${entry.label}`}
                            hitSlop={10}
                            style={({ pressed }) => [pressed && styles.pressed]}
                          >
                            <Feather name="trash-2" size={16} color={colors.muted} />
                          </Pressable>
                        )
                      ) : null}
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>

          <View>
            <SectionHeader
              title="Add a key"
              subtitle="Create one at console.groq.com/keys"
            />
            <Card style={styles.form}>
              <TextField
                label="Groq API key"
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder="gsk_…"
                icon="key"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!isDemo && !add.isPending && personalCount < maxKeys}
              />
              <TextField
                label="Label (optional)"
                value={label}
                onChangeText={setLabel}
                placeholder="Personal key"
                maxLength={40}
                editable={!isDemo && !add.isPending && personalCount < maxKeys}
              />

              {formError ? (
                <Text style={[styles.formError, { color: colors.negative }]}>
                  {formError}
                </Text>
              ) : null}

              {personalCount >= maxKeys ? (
                <Text style={[styles.formError, { color: colors.warning }]}>
                  You have reached the {maxKeys}-key limit. Remove one before adding
                  another.
                </Text>
              ) : null}

              <Button
                label="Validate and add key"
                onPress={() => void handleAdd()}
                icon="plus"
                fullWidth
                loading={add.isPending}
                disabled={!canAdd}
              />
            </Card>
          </View>

          <Text style={[styles.footer, { color: colors.muted }]}>
            The assistant uses the least-recently-used key first. If Groq rate-limits
            or rejects a key, it cools down and the next key is tried automatically.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space.xl },
  loadingCard: { gap: space.md },
  emptyCard: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  emptyText: { textAlign: 'center', maxWidth: 280, lineHeight: 18 },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  keyIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  form: { gap: space.lg },
  formError: { fontSize: 12, lineHeight: 17, marginHorizontal: 2 },
  pressed: { opacity: 0.6 },
  footer: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: space.md,
  },
});
