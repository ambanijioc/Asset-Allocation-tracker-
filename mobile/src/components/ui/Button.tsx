import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ComponentProps<typeof Feather>['name'];
  /** Custom leading visual, for brand icons that Feather does not provide. */
  iconNode?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconNode,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.accent,
    secondary: colors.card,
    ghost: 'transparent',
    danger: colors.negative,
  };
  const foregrounds: Record<ButtonVariant, string> = {
    primary: colors.accentText,
    secondary: colors.text,
    ghost: colors.accent,
    danger: '#FFFFFF',
  };
  const borderColors: Record<ButtonVariant, string> = {
    primary: colors.accent,
    secondary: colors.border,
    ghost: 'transparent',
    danger: colors.negative,
  };

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          minHeight: HEIGHT[size],
          backgroundColor: backgrounds[variant],
          borderColor: borderColors[variant],
          paddingHorizontal: size === 'sm' ? space.md : space.lg,
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregrounds[variant]} size="small" />
      ) : (
        <View style={styles.row}>
          {iconNode ?? (icon ? <Feather name={icon} size={size === 'sm' ? 14 : 16} color={foregrounds[variant]} /> : null)}
          <Text
            style={[
              type.bodyMedium,
              { color: foregrounds[variant], fontWeight: '600' },
              size === 'sm' && { fontSize: 13 },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
});
