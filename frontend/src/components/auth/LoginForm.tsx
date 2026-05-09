import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'professor' | null>(null);
  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(identifier, password);
    } catch {
      // Error handled in context
    }
  };

  const handleGoogleLogin = () => {
    setShowRoleSelect(true);
  };

  const handleGoogleSuccess = (response: any) => {
    if (!selectedRole) return;
    
    (async () => {
      try {
        await loginWithGoogle(response.credential, selectedRole);
        navigate(selectedRole === 'professor' ? '/professor' : '/student');
      } catch (error) {
        console.error('Google login error:', error);
        setShowRoleSelect(false);
        setSelectedRole(null);
      }
    })();
  };

  const handleRoleSelect = (role: 'professor' | 'student') => {
    setSelectedRole(role);
  };

  // Initialize Google Sign-In on component mount and when role is selected
  useEffect(() => {
    if (!selectedRole) return;

    // Load Google SDK
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleSuccess,
          ux_mode: 'popup',
        });

        // Render the button
        const googleButtonElement = document.getElementById('google-button');
        if (googleButtonElement) {
          window.google.accounts.id.renderButton(googleButtonElement, {
            type: 'standard',
            size: 'large',
            width: '100%',
            text: 'signin',
          });
        }
      }
    };

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [selectedRole, handleGoogleSuccess]);

  if (showRoleSelect && selectedRole) {
    return (
      <Card className="w-full max-w-md card-shadow animate-scale-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Select Your Role</CardTitle>
          <CardDescription>Choose how you want to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="google-button" className="flex justify-center"></div>
          <Button
            variant="outline"
            onClick={() => {
              setShowRoleSelect(false);
              setSelectedRole(null);
            }}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showRoleSelect) {
    return (
      <Card className="w-full max-w-md card-shadow animate-scale-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Select Your Role</CardTitle>
          <CardDescription>Choose how you want to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 hover:border-primary hover:bg-accent transition-all"
            onClick={() => handleRoleSelect('professor')}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <div className="text-left">
              <p className="font-semibold">Professor</p>
              <p className="text-sm text-muted-foreground">Manage classes & attendance</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 hover:border-primary hover:bg-accent transition-all"
            onClick={() => handleRoleSelect('student')}
          >
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👨‍🎓</span>
            </div>
            <div className="text-left">
              <p className="font-semibold">Student</p>
              <p className="text-sm text-muted-foreground">View & verify attendance</p>
            </div>
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowRoleSelect(false)}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md card-shadow animate-fade-up">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-heading text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your attendance portal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Roll Number</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="identifier"
                type="text"
                placeholder="email or roll no"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <p>Demo credentials:</p>
          <p className="font-mono text-xs mt-1">professor@college.edu / demo12345</p>
          <p className="font-mono text-xs">student@college.edu / demo12345</p>
        </div>
      </CardContent>
    </Card>
  );
}

