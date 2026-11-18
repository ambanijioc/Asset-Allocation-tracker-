import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/src/lib/theme/ThemeProvider';

export interface BarSegment {
  key: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  segments: BarSegment[];
  height?: number;
  accessibilityLabel?: string;
}

/** Horizontal 100% stacked bar used for allocation and market-cap splits. */
export function StackedBar({ segments, height = 8, accessibilityLabel }: StackedBarProps) {
  const { colors } = useTheme();
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: colors.cardMuted },
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.row, { borderRadius: height / 2 }]}>
        {visible.map((segment) => {
          const segmentValue = segment.value;
          return (
            <View
              key={segment.key}
              style={{ flex: segmentValue, backgroundColor: segment.color, height: '100%' }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
});
