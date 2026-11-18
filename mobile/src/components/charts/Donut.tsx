import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/src/lib/theme/ThemeProvider';

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  accessibilityLabel?: string;
}

/**
 * Dependency-free donut chart. Segments are drawn as dashed strokes on a
 * single circle, which keeps the SVG node count low and animation-friendly.
 */
export function Donut({
  data,
  size = 152,
  strokeWidth = 18,
  children,
  accessibilityLabel,
}: DonutProps) {
  const { colors } = useTheme();
  const total = data.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const visibleSlices = data.filter((slice) => slice.value > 0);
  const { segments } = visibleSlices.reduce<{ segments: ReactNode[]; cursor: number }>(
    (accumulator, slice) => {
      const fraction = total > 0 ? slice.value / total : 0;
      const arc = fraction * circumference;
      const visibleArc = visibleSlices.length > 1 ? Math.max(arc - 2.5, 0) : arc;
      const element = (
        <Circle
          key={slice.key}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={slice.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${visibleArc} ${circumference - visibleArc}`}
          strokeDashoffset={-accumulator.cursor}
        />
      );
      return { segments: [...accumulator.segments, element], cursor: accumulator.cursor + arc };
    },
    { segments: [], cursor: 0 },
  );

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? 'Portfolio allocation chart'}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {segments}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
