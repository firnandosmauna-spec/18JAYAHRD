import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ModuleType } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: ModuleType;
}

export default function ProtectedRoute({ children, requiredModule }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, hasModuleAccess, user } = useAuth();

  // Log current state
  useEffect(() => {
    console.log('🛡️ ProtectedRoute state:', {
      path: location.pathname,
      isLoading,
      isAuthenticated,
      userRole: user?.role,
      userModules: user?.modules,
      requiredModule,
      hasAccess: requiredModule ? hasModuleAccess(requiredModule) : 'N/A'
    });
  }, [isLoading, isAuthenticated, location.pathname, requiredModule, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">MEMERIKSA PERIZINAN...</p>
          <div className="mt-4 text-xs text-red-500 font-mono bg-red-50 p-2 rounded">
            DEBUG: Loading={String(isLoading)} Auth={String(isAuthenticated)}
            <br />
            Path={location.pathname}
            <br />
            User={user?.email || 'None'} Role={user?.role || 'None'}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If not authenticated, always send to /auth
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
