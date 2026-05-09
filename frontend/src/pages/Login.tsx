import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.role === 'professor' ? '/professor' : '/student'} replace />;
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
