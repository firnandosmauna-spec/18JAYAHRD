import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ModuleType } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: ModuleType;
}

export default function ProtectedRoute({ children, requiredModule }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, hasModuleAccess } = useAuth();

  // Log current state
  useEffect(() => {
    console.log('🛡️ ProtectedRoute state:', {
      path: location.pathname,
      isLoading,
      isAuthenticated,
      requiredModule
    });
  }, [isLoading, isAuthenticated, location.pathname, requiredModule]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
