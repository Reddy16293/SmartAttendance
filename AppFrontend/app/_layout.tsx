import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/contexts/AuthContext';
import { AppDataProvider } from '../src/contexts/AppDataContext';

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppDataProvider>
            <ThemeProvider value={DefaultTheme}>
              <StatusBar style="dark" backgroundColor="#FFFFFF" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)/login" />
                <Stack.Screen name="(app)" />
                <Stack.Screen name="+not-found" />
              </Stack>
            </ThemeProvider>
          </AppDataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
