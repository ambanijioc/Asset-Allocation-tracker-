import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, space } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Feather>['name'];
}

/** Filter / segmented-control primitive. 36pt hit target, accessible state. */
export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !onPress }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accentSoft : colors.card,
          borderColor: selected ? colors.accent : colors.border,
        },
        pressed && onPress ? styles.pressed : null,
        !onPress ? styles.disabled : null,
      ]}
    >
      {icon ? (
        <Feather name={icon} size={13} color={selected ? colors.accent : colors.muted} />
      ) : null}
      <Text
        style={[
          styles.label,
          { color: selected ? colors.accent : colors.textSecondary, fontWeight: selected ? '600' : '500' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: { fontSize: 13 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.55 },
});
