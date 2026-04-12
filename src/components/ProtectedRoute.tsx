import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ModuleType } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Lock, ShieldAlert, Loader2, Home } from 'lucide-react';
import { Button } from './ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: ModuleType;
}

export default function ProtectedRoute({ children, requiredModule }: ProtectedRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, hasModuleAccess, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">MENYIAPKAN SESI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!user) {
    return (
        <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-hrd mx-auto mb-4" />
                <p className="text-muted-foreground font-body">MENGAMBIL PROFIL...</p>
            </div>
        </div>
    );
  }

  // Permission Check
  if (requiredModule && !hasModuleAccess(requiredModule)) {
    // Show Restriction Screen instead of Redirecting
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-body">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20" />
                    <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="h-12 w-12 text-red-500" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-display font-bold tracking-tight text-white">Akses Terbatas</h1>
                    <p className="text-slate-400 leading-relaxed">
                        Akun Anda tidak memiliki izin untuk mengakses modul <span className="text-white font-bold">{requiredModule.toUpperCase()}</span>.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button
                        className="w-full h-12 rounded-xl text-sm font-bold tracking-wide bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => navigate('/dashboard')}
                    >
                        <Home className="w-4 h-4 mr-2" /> KEMBALI KE DASHBOARD
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-12 rounded-xl text-xs text-slate-500 hover:text-white"
                        onClick={() => logout()}
                    >
                        KELUAR DARI AKUN
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
