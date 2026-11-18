import { Feather } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  icon?: ComponentProps<typeof Feather>['name'];
}

export function TextField({ label, error, hint, icon, secureTextEntry, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecure = secureTextEntry && !revealed;
  const isEditable = rest.editable !== false;

  return (
    <View style={[styles.wrapper, !isEditable ? styles.readOnly : null]}>
      <Text style={[type.bodyMedium, styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.negative : focused ? colors.accent : colors.border,
          },
        ]}
      >
        {icon ? <Feather name={icon} size={16} color={colors.muted} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={isSecure}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          accessibilityLabel={label}
          style={[styles.input, type.body, { color: colors.text }, style]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Feather name={revealed ? 'eye-off' : 'eye'} size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.message, { color: colors.negative }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  readOnly: { opacity: 0.6 },
  label: { marginLeft: 2 },
  inputRow: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  input: {
    flex: 1,
    paddingVertical: space.md,
    fontSize: 15,
  },
  message: { fontSize: 12, marginLeft: 2 },
});
