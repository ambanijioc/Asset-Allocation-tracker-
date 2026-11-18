import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Subtle opacity pulse; native driver keeps it off the JS thread. */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: colors.cardMuted, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
