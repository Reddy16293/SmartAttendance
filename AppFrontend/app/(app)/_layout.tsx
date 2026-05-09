import { Redirect, Stack, usePathname } from 'expo-router';
import { Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { LoadingBar } from '../../src/components/ui/LoadingBar';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return <LoadingBar message="Loading your dashboard..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Detect and warn about wrong-role navigation attempts
  if (user.role === 'student' && pathname.includes('(professor)')) {
    Alert.alert(
      'Access Restricted',
      'You do not have permission to access the professor dashboard. Redirecting to your student dashboard.',
      [{ text: 'OK' }]
    );
    return <Redirect href="/(app)/(student)" />;
  }

  if (user.role === 'professor' && pathname.includes('(student)')) {
    Alert.alert(
      'Access Restricted',
      'You do not have permission to access the student dashboard. Redirecting to your professor dashboard.',
      [{ text: 'OK' }]
    );
    return <Redirect href="/(app)/(professor)" />;
  }

  // Use a stack to host the nested role-based tab groups
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(student)" redirect={user.role !== 'student'} />
      <Stack.Screen name="(professor)" redirect={user.role !== 'professor'} />
    </Stack>
  );
}
