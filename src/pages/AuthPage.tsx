import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { authService } from '@/services/authService';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionCheckRef = useRef(false);

  // Get the intended destination from location state, default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  // Logic: 
  // 1. If user arrives and is ALREADY authenticated (stale session), logout immediately (Security Request).
  // 2. If user MANUALLY logs in (isAuthenticated becomes true after being false), redirect to dashboard.
  useEffect(() => {
    if (isLoading) return;

    if (!sessionCheckRef.current) {
      // First time check after loading is done
      sessionCheckRef.current = true;
      if (isAuthenticated) {
        logout();
      }
    } else {
      // Subsequent updates - if authenticated now, it must be from a fresh login
      if (isAuthenticated) {
        navigate(from, { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, logout, navigate, from]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 flex-col gap-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium tracking-wide">MEMUAT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 overflow-hidden bg-white">
      {/* Left Side - Branding (Desktop) */}
      <div className="hidden lg:flex flex-col justify-center items-center relative bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white p-12 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/30 blur-[130px] animate-pulse" />
          <div className="absolute bottom-[0%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/30 blur-[130px] animate-pulse delay-1000" />
          <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-pink-500/20 blur-[100px] animate-pulse delay-500" />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">HRD 18 JAYA</h1>
          <p className="text-lg text-blue-100/80 leading-relaxed">
            Sistem Manajemen Sumber Daya Manusia Terintegrasi.
            Kelola data karyawan, absensi, dan penggajian dengan lebih efisien dan profesional.
          </p>
        </div>

        <div className="absolute bottom-8 text-sm text-white/30 font-mono">
          © 2026 PT. 18 JAYA. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-6 bg-gray-100 relative overflow-y-auto h-full">

        <div className="w-full max-w-md space-y-8 py-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">HRD&ERP SYSTEM 18 JAYA</h1>
            <p className="text-sm text-gray-500">Sistem Manajemen SDM</p>
          </div>

          <div className="bg-white p-1 rounded-2xl shadow-none lg:shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] border-0 lg:border lg:border-gray-100">
            {isLogin ? (
              <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}