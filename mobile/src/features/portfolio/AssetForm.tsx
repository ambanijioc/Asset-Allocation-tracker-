import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { TextField } from '@/src/components/ui/TextField';
import { space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

import type { Asset } from './types';
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  validateAssetForm,
  type AssetFormOutput,
  type AssetFormValues,
} from './schema';

interface AssetFormProps {
  initial?: Partial<Asset>;
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  serverError?: string | null;
  onSubmit: (values: AssetFormOutput) => void;
}

export function AssetForm({
  initial,
  submitLabel,
  submitting = false,
  disabled = false,
  serverError,
  onSubmit,
}: AssetFormProps) {
  const { colors } = useTheme();
  const [values, setValues] = useState<AssetFormValues>({
    name: initial?.name ?? '',
    symbol: initial?.symbol ?? '',
    type: (ASSET_TYPES as readonly string[]).includes(initial?.type ?? '')
      ? (initial?.type as AssetFormValues['type'])
      : 'STOCK',
    quantity: initial ? String(initial.quantity) : '',
    entryPrice: initial ? String(initial.entryPrice) : '',
    manualPrice: initial?.manualPrice != null ? String(initial.manualPrice) : '',
    currency: initial?.currency === 'USD' ? 'USD' : 'INR',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AssetFormValues, string>>>({});

  const update = <K extends keyof AssetFormValues>(key: K, value: AssetFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = () => {
    const result = validateAssetForm(values);
    setErrors(result.errors);
    if (result.success && result.data) onSubmit(result.data);
  };

  return (
    <View style={styles.wrapper}>
      <Card style={styles.card}>
        <Text style={[type.label, { color: colors.muted }]}>Instrument</Text>
        <TextField
          label="Name"
          placeholder="e.g. HDFC Bank"
          value={values.name}
          onChangeText={(text) => update('name', text)}
          error={errors.name}
          autoCapitalize="words"
          returnKeyType="next"
          editable={!disabled}
        />
        <TextField
          label="Ticker / symbol"
          placeholder="e.g. HDFCBANK.NS"
          value={values.symbol}
          onChangeText={(text) => update('symbol', text)}
          error={errors.symbol}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!disabled}
        />
        <Text style={[type.caption, { color: colors.muted }]}>
          Use Yahoo Finance symbols: .NS for NSE, .BO for BSE, -USD for crypto.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[type.label, { color: colors.muted }]}>Category</Text>
        <View style={styles.chips}>
          {ASSET_TYPES.map((assetType) => (
            <Chip
              key={assetType}
              label={ASSET_TYPE_LABELS[assetType]}
              selected={values.type === assetType}
              onPress={disabled ? undefined : () => update('type', assetType)}
            />
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[type.label, { color: colors.muted }]}>Position</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField
              label="Quantity"
              placeholder="0"
              keyboardType="decimal-pad"
              value={String(values.quantity)}
              onChangeText={(text) => update('quantity', text)}
              error={errors.quantity}
              editable={!disabled}
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Avg. price"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={String(values.entryPrice)}
              onChangeText={(text) => update('entryPrice', text)}
              error={errors.entryPrice}
              editable={!disabled}
            />
          </View>
        </View>

        <View style={styles.chips}>
          {(['INR', 'USD'] as const).map((currency) => (
            <Chip
              key={currency}
              label={currency === 'INR' ? '₹ INR' : '$ USD'}
              selected={values.currency === currency}
              onPress={disabled ? undefined : () => update('currency', currency)}
            />
          ))}
        </View>

        <TextField
          label="Manual price (optional)"
          placeholder="Overrides live quotes"
          keyboardType="decimal-pad"
          value={String(values.manualPrice ?? '')}
          onChangeText={(text) => update('manualPrice', text)}
          error={errors.manualPrice}
          hint="Leave empty to use live market data."
          editable={!disabled}
        />
      </Card>

      {serverError ? (
        <Text style={[type.body, { color: colors.negative }]} accessibilityRole="alert">
          {serverError}
        </Text>
      ) : null}

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={submitting}
        disabled={disabled}
        fullWidth
        size="lg"
        icon={initial?.id ? 'check' : 'plus'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.lg },
  card: { gap: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space.xs },
  row: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
});
