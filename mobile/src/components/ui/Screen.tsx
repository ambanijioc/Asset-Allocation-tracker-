import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (disable for virtualized lists). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const rootStyle = [
    styles.root,
    { backgroundColor: colors.bg, paddingTop: insets.top },
    style,
  ];

  if (!scroll) return <View style={rootStyle}>{children}</View>;

  return (
    <ScrollView
      style={rootStyle}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + space.xxxl * 2 },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
            colors={[colors.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
});
