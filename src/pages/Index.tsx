
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Hero from "@/components/Hero";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] via-[#1e5bb8] to-[#A4D65E]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-pulse border border-white/30">
            <div className="w-8 h-8 bg-white rounded-full opacity-80"></div>
          </div>
          <p className="text-white/80 text-lg">Carregando...</p>
        </div>
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
