import React, { useState } from 'react';
import { Alert, View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { getGoogleIdToken, mapGoogleSignInError } from '../../src/services/googleAuth';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/Card';
import { Colors } from '../../src/constants/Colors';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'professor' | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const { login, loginWithGoogle, isLoading, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.replace(user.role === 'professor' ? '/(app)/(professor)' : '/(app)/(student)');
    }
  }, [user, router]);

  const handleSubmit = async () => {
    try {
      await login(identifier, password);
    } catch {
      // Error handled in context with Alert
    }
  };

  const handleGoogleLogin = () => {
    setShowRoleSelect(true);
  };

  const handleRoleSelect = async (role: 'student' | 'professor') => {
    setSelectedRole(role);

    try {
      setIsGoogleSigningIn(true);
      const idToken = await getGoogleIdToken();
      await loginWithGoogle(idToken, role);
      setShowRoleSelect(false);
      setSelectedRole(null);
      router.replace(role === 'professor' ? '/(app)/(professor)' : '/(app)/(student)');
    } catch (error) {
      setSelectedRole(null);
      Alert.alert(
        'Google login failed',
        mapGoogleSignInError(error)
      );
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  if (showRoleSelect) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.innerContainer}>
            <Card style={styles.card}>
              <CardHeader style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <GraduationCap size={32} color={Colors.light.primary} />
                </View>
                <CardTitle>Select Your Role</CardTitle>
                <CardDescription>Choose how you want to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  style={styles.roleButton}
                  onPress={() => handleRoleSelect('professor')}
                  isLoading={(isLoading || isGoogleSigningIn) && selectedRole === 'professor'}
                >
                  Professor - Manage courses and attendance
                </Button>

                <Button
                  variant="outline"
                  style={styles.roleButton}
                  onPress={() => handleRoleSelect('student')}
                  isLoading={(isLoading || isGoogleSigningIn) && selectedRole === 'student'}
                >
                  Student - View and verify attendance
                </Button>

                <Button
                  variant="ghost"
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowRoleSelect(false);
                    setSelectedRole(null);
                  }}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.innerContainer}>
          <Card style={styles.card}>
            <CardHeader style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <GraduationCap size={32} color={Colors.light.primary} />
              </View>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Sign in to your attendance portal</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                label="Email or Roll Number"
                placeholder="email or roll no"
                value={identifier}
                onChangeText={setIdentifier}
                leftIcon={<Mail size={18} color={Colors.light.mutedForeground} />}
                autoCapitalize="none"
              />
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Lock size={18} color={Colors.light.mutedForeground} />}
              />
              <Button 
                onPress={handleSubmit} 
                isLoading={isLoading}
                style={styles.signInButton}
              >
                Sign In
              </Button>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.divider} />
              </View>

              <Button 
                variant="outline"
                onPress={handleGoogleLogin}
                style={styles.googleButton}
                disabled={isLoading || isGoogleSigningIn}
              >
                <View style={styles.googleButtonContent}>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              </Button>

              <View style={styles.demoCredentials}>
                <Text style={styles.demoTitle}>Demo credentials:</Text>
                <Text style={styles.demoText}>professor@college.edu / demo12345</Text>
                <Text style={styles.demoText}>student@college.edu / demo12345</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signInButton: {
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    color: Colors.light.mutedForeground,
    fontWeight: '700',
  },
  googleButton: {
    marginBottom: 20,
  },
  roleButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 4,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  demoCredentials: {
    alignItems: 'center',
    marginTop: 10,
  },
  demoTitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginBottom: 4,
  },
  demoText: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
