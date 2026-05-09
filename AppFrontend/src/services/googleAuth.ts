import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { config } from '../config';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let googleSigninModule: GoogleSigninModule | null | undefined;

let isConfigured = false;

function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === 'expo';
}

function getGoogleSigninModule(): GoogleSigninModule | null {
  if (Platform.OS === 'web' || isExpoGoRuntime()) {
    return null;
  }

  if (googleSigninModule !== undefined) {
    return googleSigninModule;
  }

  try {
    googleSigninModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    return googleSigninModule;
  } catch {
    googleSigninModule = null;
    return null;
  }
}

function getGoogleSigninModuleOrThrow(): GoogleSigninModule {
  const module = getGoogleSigninModule();
  if (!module) {
    throw new Error(
      'Google Sign-In is not available in Expo Go. Use a development build (expo run:android / expo run:ios) to enable native Google auth.'
    );
  }

  return module;
}

export function configureGoogleSignIn() {
  if (Platform.OS === 'web' || isConfigured) {
    return;
  }

  if (isExpoGoRuntime()) {
    throw new Error(
      'Google Sign-In is not available in Expo Go. Use a development build (expo run:android / expo run:ios) to enable native Google auth.'
    );
  }

  const { GoogleSignin } = getGoogleSigninModuleOrThrow();

  const webClientId = config.googleWebClientId;

  if (!webClientId) {
    throw new Error('Missing Google Web Client ID in app config');
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });

  isConfigured = true;
}

export async function getGoogleIdToken(): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Google Sign-In is only available in native mobile builds.');
  }

  if (isExpoGoRuntime()) {
    throw new Error(
      'Google Sign-In is not available in Expo Go. Switch to a development build to continue with Google.'
    );
  }

  const { GoogleSignin, isErrorWithCode, statusCodes } = getGoogleSigninModuleOrThrow();

  configureGoogleSignIn();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    await GoogleSignin.signInSilently();
  } catch (error) {
    if (!isErrorWithCode(error) || error.code !== statusCodes.SIGN_IN_REQUIRED) {
      throw error;
    }
  }

  let tokens = await GoogleSignin.getTokens().catch(() => null);
  if (!tokens?.idToken) {
    await GoogleSignin.signIn();
    tokens = await GoogleSignin.getTokens();
  }

  if (!tokens?.idToken) {
    throw new Error('Google id token was not returned.');
  }

  return tokens.idToken;
}

export function mapGoogleSignInError(error: unknown): string {
  const module = getGoogleSigninModule();

  if (module && module.isErrorWithCode(error)) {
    if (error.code === module.statusCodes.SIGN_IN_CANCELLED) {
      return 'Google sign-in was cancelled.';
    }
    if (error.code === module.statusCodes.IN_PROGRESS) {
      return 'Google sign-in is already in progress.';
    }
    if (error.code === module.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services are not available on this device.';
    }
    if (error.code === module.statusCodes.SIGN_IN_REQUIRED) {
      return 'Please sign in with Google to continue.';
    }
  }

  return error instanceof Error ? error.message : 'Google sign-in failed.';
}

export async function signOutGoogleSession() {
  if (Platform.OS === 'web' || isExpoGoRuntime()) {
    return;
  }

  const module = getGoogleSigninModule();
  if (!module) {
    return;
  }

  const { GoogleSignin } = module;

  try {
    const hasSession = await GoogleSignin.hasPreviousSignIn();
    if (hasSession) {
      await GoogleSignin.signOut();
    }
  } catch {
    // Ignore sign out errors to avoid blocking regular logout.
  }
}
