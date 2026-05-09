/**
 * Configuration module for managing environment-aware app settings
 * Loads from environment variables with sensible defaults for development
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface AppConfig {
  apiUrl: string;
  googleWebClientId: string;
  googleAndroidClientId: string;
  googleIosClientId: string;
  sessionTimeoutHours: number;
  isDevelopment: boolean;
}

/**
 * Normalize API URL for platform-specific requirements
 * Android emulator uses 10.0.2.2 to reach localhost on the host machine
 */
function normalizeApiUrl(url: string): string {
  if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return url.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
  }
  return url;
}

/**
 * Create config from environment variables and constants
 */
function createConfig(): AppConfig {
  // Try to load from environment variables (EXPO_PUBLIC_* are injected by Expo)
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  const expoExtraApiUrl = (Constants.expoConfig?.extra?.apiUrl as string) || '';
  const expoExtraGoogleWebId = (Constants.expoConfig?.extra?.googleWebClientId as string) || '';
  const expoExtraGoogleAndroidId = (Constants.expoConfig?.extra?.googleAndroidClientId as string) || '';
  const expoExtraGoogleIosId = (Constants.expoConfig?.extra?.googleIosClientId as string) || '';
  const expoExtraSessionTimeoutHours = (Constants.expoConfig?.extra?.sessionTimeoutHours as string | number | undefined);

  // Determine API URL with fallback chain:
  // 1. Environment variable (EXPO_PUBLIC_API_URL)
  // 2. app.json extra (for backward compatibility during migration)
  // 3. Platform-specific sensible default
  let apiUrl = envApiUrl || expoExtraApiUrl;
  if (!apiUrl) {
    apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
  }
  apiUrl = normalizeApiUrl(apiUrl);

  // Determine OAuth Client IDs with fallback chain:
  // 1. Environment variables (EXPO_PUBLIC_GOOGLE_*)
  // 2. app.json extra (for backward compatibility)
  // 3. Empty string (will be caught at auth time if missing)
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || expoExtraGoogleWebId || '';
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || expoExtraGoogleAndroidId || '';
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || expoExtraGoogleIosId || '';

  const rawSessionTimeoutHours = process.env.EXPO_PUBLIC_SESSION_TIMEOUT_HOURS || String(expoExtraSessionTimeoutHours ?? '8');
  const parsedSessionTimeoutHours = Number(rawSessionTimeoutHours);
  const sessionTimeoutHours = Number.isFinite(parsedSessionTimeoutHours) && parsedSessionTimeoutHours > 0
    ? parsedSessionTimeoutHours
    : 8;

  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (!googleWebClientId && !googleAndroidClientId && !googleIosClientId) {
    console.warn(
      'WARNING: Google OAuth credentials are not configured. ' +
      'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, ' +
      'and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in your environment variables or app.json'
    );
  }

  return {
    apiUrl,
    googleWebClientId,
    googleAndroidClientId,
    googleIosClientId,
    sessionTimeoutHours,
    isDevelopment,
  };
}

// Instantiate config once to ensure consistent behavior
export const config = createConfig();

// For testing/debugging purposes, log config state in development
if (config.isDevelopment) {
  console.log('[Config] Loaded with API URL:', config.apiUrl);
  console.log('[Config] OAuth Web Client:', config.googleWebClientId ? '✓ set' : '✗ missing');
  console.log('[Config] OAuth Android Client:', config.googleAndroidClientId ? '✓ set' : '✗ missing');
  console.log('[Config] OAuth iOS Client:', config.googleIosClientId ? '✓ set' : '✗ missing');
  console.log('[Config] Session Timeout (hours):', config.sessionTimeoutHours);
}

export default config;
