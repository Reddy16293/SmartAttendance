import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { LoadingBar } from '../src/components/ui/LoadingBar';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingBar message="Restoring your session..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={user.role === 'professor' ? '/(app)/(professor)' : '/(app)/(student)'} />;
}
