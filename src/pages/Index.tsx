
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Hero from "@/components/Hero";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show simplified landing page for non-authenticated users
  return (
    <div className="min-h-screen">
      <Hero />
    </div>
  );
};

export default Index;
