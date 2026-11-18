// app.config.ts runs in Node, not the React Native runtime. Scope Node types
// to this file so the app's global types stay React Native-only.
/// <reference types="node" />
import { existsSync } from 'node:fs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Firebase client files are optional at development time. They are only
 * attached to the native config when present so `expo start` and Expo Go keep
 * working before Google Sign-In has been provisioned.
 */
const fileIfPresent = (path: string) => (existsSync(path) ? path : undefined);

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = fileIfPresent('./google-services.json');
  const googleServiceInfoPlist = fileIfPresent('./GoogleService-Info.plist');

  const plugins = (config.plugins ?? []).map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name !== '@react-native-google-signin/google-signin' || !iosUrlScheme) return plugin;
    return [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme },
    ] as [string, { iosUrlScheme: string }];
  });

  return {
    ...config,
    name: config.name ?? 'Asset Tracker',
    slug: config.slug ?? 'asset-tracker',
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    ios: {
      ...config.ios,
      ...(googleServiceInfoPlist ? { googleServicesFile: googleServiceInfoPlist } : {}),
    },
    plugins,
  };
};
