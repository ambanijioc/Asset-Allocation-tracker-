import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface IconButtonProps {
  icon: ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'plain' | 'outline';
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'outline',
  size = 40,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: variant === 'outline' ? colors.card : 'transparent',
          borderColor: colors.border,
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Feather name={icon} size={17} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
});
