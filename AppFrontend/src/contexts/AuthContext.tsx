import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, AuthContextType } from '../types/auth';
import { signOutGoogleSession } from '../services/googleAuth';
import { config } from '../config';
import { notifySessionExpired, onSessionExpired } from '../services/authSession';

const SESSION_STARTED_AT_KEY = 'session_started_at';
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface BackendUser {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  roll_number?: string;
  rollNumber?: string;
  avatar?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
  role_warning?: string;
}

interface LoginResponse {
  access_token: string;
}

interface ErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

/**
 * Parse error message from backend response
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data: ErrorResponse = await response.json();
      return data.detail || data.message || data.error || `HTTP ${response.status}`;
    }
    return response.statusText || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function mapBackendUser(user: BackendUser): User {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role === 'teacher' ? 'professor' : 'student',
    rollNumber: user.roll_number || user.rollNumber,
    avatar: user.avatar,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const scheduleSessionTimeout = useCallback((sessionStartedAt: number) => {
    clearLogoutTimer();

    const timeoutMs = config.sessionTimeoutHours * ONE_HOUR_IN_MS;
    const expiresAt = sessionStartedAt + timeoutMs;
    const remainingMs = expiresAt - Date.now();

    if (remainingMs <= 0) {
      notifySessionExpired({
        message: `Your session expired after ${config.sessionTimeoutHours} hours. Please log in again.`,
      });
      return;
    }

    logoutTimerRef.current = setTimeout(() => {
      notifySessionExpired({
        message: `Your session expired after ${config.sessionTimeoutHours} hours. Please log in again.`,
      });
    }, remainingMs);
  }, [clearLogoutTimer]);

  const clearSession = useCallback(async () => {
    clearLogoutTimer();
    setUser(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem(SESSION_STARTED_AT_KEY);
  }, [clearLogoutTimer]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const startedAtRaw = await AsyncStorage.getItem(SESSION_STARTED_AT_KEY);
          const startedAt = Number(startedAtRaw);
          const now = Date.now();

          if (Number.isFinite(startedAt) && startedAt > 0) {
            const elapsedMs = now - startedAt;
            const timeoutMs = config.sessionTimeoutHours * ONE_HOUR_IN_MS;

            if (elapsedMs >= timeoutMs) {
              await clearSession();
              Alert.alert('Session expired', `Your session expired after ${config.sessionTimeoutHours} hours. Please log in again.`);
              return;
            }

            setUser(JSON.parse(stored) as User);
            scheduleSessionTimeout(startedAt);
          } else {
            // Backward compatibility for users logged in before session timeout tracking was introduced.
            await AsyncStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
            setUser(JSON.parse(stored) as User);
            scheduleSessionTimeout(now);
          }
        }
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [clearSession, scheduleSessionTimeout]);

  useEffect(() => {
    return onSessionExpired((payload) => {
      void signOutGoogleSession();
      void clearSession();
      Alert.alert('Session expired', payload.message);
    });
  }, [clearSession]);

  useEffect(() => {
    return () => {
      clearLogoutTimer();
    };
  }, [clearLogoutTimer]);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        throw new Error(errorMessage);
      }

      const data: LoginResponse = await res.json();
      await AsyncStorage.setItem('auth_token', data.access_token);
      const now = Date.now();
      await AsyncStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
      scheduleSessionTimeout(now);

      const meRes = await fetch(`${config.apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!meRes.ok) {
        const errorMessage = await extractErrorMessage(meRes);
        throw new Error(errorMessage);
      }

      const meData: BackendUser = await meRes.json();
      const mappedUser = mapBackendUser(meData);
      setUser(mappedUser);
      await AsyncStorage.setItem('user', JSON.stringify(mappedUser));
      Alert.alert('Welcome back!', `Logged in as ${mappedUser.name}`);
    } catch (error: any) {
      const message = error?.message || 'Please check your credentials and try again.';
      Alert.alert('Login failed', message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [scheduleSessionTimeout]);

  const loginWithGoogle = useCallback(async (idToken: string, role: 'student' | 'professor') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id_token: idToken,
          role: role === 'professor' ? 'teacher' : 'student'
        }),
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        throw new Error(errorMessage);
      }

      const data: TokenResponse = await res.json();
      
      if (data.role_warning) {
        throw new Error(data.role_warning);
      }
      
      const mappedUser = mapBackendUser(data.user);
      setUser(mappedUser);
      await AsyncStorage.setItem('user', JSON.stringify(mappedUser));
      await AsyncStorage.setItem('auth_token', data.access_token);
      const now = Date.now();
      await AsyncStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
      scheduleSessionTimeout(now);
    } catch (error: any) {
      const message = error?.message || 'Google login failed';
      Alert.alert('Login failed', message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [scheduleSessionTimeout]);

  const setUserRole = useCallback((role: UserRole) => {
    console.warn('setUserRole is deprecated');
  }, []);

  const logout = useCallback(async () => {
    await signOutGoogleSession();
    await clearSession();
    Alert.alert('Logged out', 'See you next time!');
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithGoogle, logout, setUserRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
