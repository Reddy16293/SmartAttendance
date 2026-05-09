import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, Shield, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await res.json();
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || 'Failed to load profile'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGoogleUser = profile.google_id !== null;
  const roleDisplay = profile.role === 'teacher' ? 'Professor' : 'Student';

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="backdrop-blur-sm bg-card/95 border-2">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=128&background=random`} />
                <AvatarFallback className="text-2xl font-bold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-3xl font-bold">{profile.name}</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant={profile.role === 'teacher' ? 'default' : 'secondary'} className="text-sm">
                <Shield className="h-3 w-3 mr-1" />
                {roleDisplay}
              </Badge>
              {isGoogleUser && (
                <Badge variant="outline" className="text-sm">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-3 w-3 mr-1" />
                  Google Account
                </Badge>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6 space-y-6">
            {/* Email Section */}
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Email Address</h3>
                <p className="text-base">{profile.email}</p>
              </div>
            </div>

            {/* Account Type Section */}
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Account Type</h3>
                <p className="text-base">
                  {isGoogleUser ? 'Google OAuth Account' : 'Email & Password Account'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isGoogleUser
                    ? 'Signed in using your Google account'
                    : 'Signed up with email and password'}
                </p>
              </div>
            </div>

            {/* Member Since Section */}
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Member Since</h3>
                <p className="text-base">{formatDate(profile.created_at)}</p>
                {profile.updated_at !== profile.created_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Last updated: {formatDate(profile.updated_at)}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate(profile.role === 'teacher' ? '/professor' : '/student')}
                variant="outline"
                className="w-full"
              >
                Back to Dashboard
              </Button>
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
