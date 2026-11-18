import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
}

/** Surface primitive: one border, one radius, one shadow — used everywhere. */
export function Card({ children, style, onPress, accessibilityLabel, padded = true }: CardProps) {
  const { colors, scheme } = useTheme();

  const surface: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      padding: padded ? space.lg : 0,
      shadowOpacity: scheme === 'light' ? 0.04 : 0,
    },
    style,
  ];

  if (!onPress) return <View style={surface}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [surface, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#09090B',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: { opacity: 0.72 },
});
