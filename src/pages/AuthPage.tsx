import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { authService } from '@/services/authService';
import { motion, AnimatePresence } from 'framer-motion';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const isSwitching = searchParams.get('switch') === 'true';

  // Determine the best resumption path
  const getResumePath = (): string => {
    // Priority: Explicit redirect from router state OR global lastVisitedPath
    const savedPath = localStorage.getItem('lastVisitedPath');
    const path = (location.state?.from?.pathname + (location.state?.from?.search || '')) || savedPath;
    
    // Safety check for absolute path
    const validPath = (path && typeof path === 'string' && path.startsWith('/')) ? path : '/dashboard';

    // Avoid redirect loops
    const ignoredPaths = ['/', '/dashboard', '/auth', '/login', '/reset-password'];
    if (ignoredPaths.includes(validPath)) {
       return '/dashboard';
    }
    
    return validPath;
  };

  const resumePath = getResumePath();

  useEffect(() => {
    if (isLoading) return;

    // Redirection happens ONLY once authentication is fully resolved
    if (isAuthenticated && !isSwitching) {
      console.log('🚀 [AUTH] Final Session Restore:', resumePath);
      navigate(resumePath, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, resumePath, isSwitching]);

  // Show loading while checking authentication and loading profile
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 flex-col gap-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium tracking-wide">MENYIAPKAN SESI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-body">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">18 JAYA</h1>
            <p className="text-gray-500 font-body text-sm mt-1 uppercase tracking-widest">Management System</p>
          </div>
          
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm />
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 font-body">
                    Belum punya akun?{' '}
                    <button
                      onClick={() => setIsLogin(false)}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Daftar Sekarang
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterForm />
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 font-body">
                    Sudah punya akun?{' '}
                    <button
                      onClick={() => setIsLogin(true)}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Masuk Sekarang
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-mono tracking-tighter">
            &copy; {new Date().getFullYear()} PT. DELAPAN BELAS JAYA
          </p>
        </div>
      </div>
    </div>
  );
}