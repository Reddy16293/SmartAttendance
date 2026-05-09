import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole, AuthContextType } from '@/types/auth';
import { toast } from '@/hooks/use-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface BackendUser {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'teacher';
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

function mapBackendUser(user: BackendUser): User {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    // backend uses student/teacher; frontend expects student/professor
    role: user.role === 'teacher' ? 'professor' : 'student',
    avatar: user.avatar,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = (data as any)?.detail || 'Login failed';
        throw new Error(detail);
      }

      const data = (await res.json()) as LoginResponse;
      localStorage.setItem('auth_token', data.access_token);

      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!meRes.ok) {
        const meData = await meRes.json().catch(() => ({}));
        const detail = (meData as any)?.detail || 'Login failed';
        throw new Error(detail);
      }

      const meData = (await meRes.json()) as BackendUser;
      const mappedUser = mapBackendUser(meData);
      setUser(mappedUser);
      localStorage.setItem('user', JSON.stringify(mappedUser));
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${mappedUser.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error?.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string, role: 'student' | 'professor') => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
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
        const data = await res.json().catch(() => ({}));
        const detail = (data as any)?.detail || 'Google login failed';
        throw new Error(detail);
      }

      const data = (await res.json()) as TokenResponse;
      
      // Check if there's a role warning
      if (data.role_warning) {
        toast({
          title: 'Wrong Role',
          description: data.role_warning,
          variant: 'destructive',
        });
        setIsLoading(false);
        return; // Don't proceed with login
      }
      
      const mappedUser = mapBackendUser(data.user);
      setUser(mappedUser);
      localStorage.setItem('user', JSON.stringify(mappedUser));
      localStorage.setItem('auth_token', data.access_token);
      toast({
        title: 'Welcome!',
        description: `Logged in as ${mappedUser.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Google login failed',
        description: error?.message || 'Could not authenticate with Google',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUserRole = useCallback((role: UserRole) => {
    // Legacy function - Google flow now handled by loginWithGoogle
    // This is kept for backward compatibility but shouldn't be used
    console.warn('setUserRole is deprecated, use loginWithGoogle instead');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    toast({
      title: 'Logged out',
      description: 'See you next time!',
    });
  }, []);

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
