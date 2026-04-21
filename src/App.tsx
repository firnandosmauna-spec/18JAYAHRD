import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SopOverlay } from "@/components/SopOverlay";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/contexts/NotificationContext";

// Static imports to fix Suspense hang
// Lazy imports for modules to reduce initial bundle size
const AuthPage = lazy(() => import("@/pages/AuthPage").then(module => ({ default: module.AuthPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const HRDModule = lazy(() => import("@/pages/modules/HRDModuleSupabase"));
const InventoryModule = lazy(() => import("@/pages/modules/InventoryModule"));
const CustomerServiceModule = lazy(() => import("@/pages/modules/CustomerServiceModule"));
const AccountingModule = lazy(() => import("@/pages/modules/AccountingModule"));
const ProjectModule = lazy(() => import("@/pages/modules/ProjectModule"));
const SalesModule = lazy(() => import("@/pages/modules/SalesModule"));
const PurchaseModule = lazy(() => import("@/pages/modules/PurchaseModule"));
const SupabaseTestPage = lazy(() => import("@/pages/SupabaseTestPage"));
const MCPSupabasePage = lazy(() => import("@/pages/MCPSupabasePage"));
const PositionsPage = lazy(() => import("@/pages/hrd/PositionsPage"));
const MarketingModule = lazy(() => import("@/pages/modules/MarketingModule"));
import { AccessGuard } from "@/components/AccessGuard";

/* // Global Debug Listener
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target?.innerText?.includes('Tambah Karyawan')) {
      console.log('🔥🔥 GLOBAL CLICK DETECTED ON:', target);
      // alert('GLOBAL CLICK: Teks "Tambah Karyawan" terdeteksi diklik!');
    }
  }, true);
}


*/
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#0D7377]/30 border-t-[#0D7377] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-body">MEMUAT HALAMAN...</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Loading chunk') || 
                          this.state.error?.message?.includes('Failed to load module') ||
                          this.state.error?.message?.includes('MIME type');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-red-50 text-red-900">
          <div className="max-w-md bg-white p-6 rounded shadow border border-red-200">
            <h1 className="text-xl font-bold mb-2">
              {isChunkError ? 'Pembaruan Aplikasi Tersedia' : 'Terjadi Kesalahan Aplikasi'}
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {isChunkError 
                ? 'Versi baru aplikasi telah tersedia. Silakan muat ulang halaman untuk menggunakan versi terbaru.'
                : 'Terjadi kesalahan sistem yang tidak terduga.'}
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto mb-4 font-mono max-h-[150px]">
              {typeof this.state.error === 'object'
                ? JSON.stringify(this.state.error, Object.getOwnPropertyNames(this.state.error), 2)
                : String(this.state.error)}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  sessionStorage.removeItem('chunk_retry_count');
                  window.location.reload();
                }}
                className="bg-[#0D7377] text-white px-4 py-2 rounded text-sm hover:bg-[#0D7377]/90 flex-1 font-bold"
              >
                Muat Ulang Sekarang
              </button>
              {!isChunkError && (
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300"
                >
                  Reset & Pesan
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { isSupabaseConfigured } from "@/lib/supabase";

function ConfigErrorScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h1>
        <p className="text-gray-600">Please check your environment variables.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

import { RoutePersister } from "@/components/RoutePersister";

function App() {
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const handleGlobalDebugClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      if (target?.innerText?.includes("Tambah Karyawan")) {
        console.log("GLOBAL CLICK DETECTED ON:", target);
      }
    };

    window.addEventListener("click", handleGlobalDebugClick, true);

    return () => {
      window.removeEventListener("click", handleGlobalDebugClick, true);
    };
  }, []);

  if (!isSupabaseConfigured) {
    return <ConfigErrorScreen />;
  }

  return (
    <AuthProvider>
      {/* Version Tag for Debugging - Force Hash Update v1.4.1 */}
      <div className="fixed bottom-0 left-0 z-[9999] bg-black/80 text-white text-[8px] px-2 py-0.5 pointer-events-none font-mono">
        v1.4.3-STABLE-ATOMIC
      </div>
      <RoutePersister />
      <SopOverlay />
      <ErrorBoundary>
        <NotificationProvider>
          <Suspense fallback={<LoadingFallback />}>
            <AccessGuard>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<AuthPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* HRD Module */}
                <Route
                  path="/hrd/*"
                  element={
                    <ProtectedRoute requiredModule="hrd">
                      <HRDModule />
                    </ProtectedRoute>
                  }
                />

                {/* Accounting Module */}
                <Route
                  path="/accounting/*"
                  element={
                    <ProtectedRoute requiredModule="accounting">
                      <AccountingModule />
                    </ProtectedRoute>
                  }
                />


                {/* Inventory Module */}
                <Route
                  path="/inventory/*"
                  element={
                    <ProtectedRoute requiredModule="inventory">
                      <InventoryModule />
                    </ProtectedRoute>
                  }
                />

                {/* Customer Service Module */}
                <Route
                  path="/customer/*"
                  element={
                    <ProtectedRoute requiredModule="customer">
                      <CustomerServiceModule />
                    </ProtectedRoute>
                  }
                />

                {/* Projects Module */}
                <Route
                  path="/projects/*"
                  element={
                    <ProtectedRoute requiredModule="projects">
                      <ProjectModule />
                    </ProtectedRoute>
                  }
                />

                {/* Marketing Pipeline Module */}
                <Route
                  path="/marketing/*"
                  element={
                    <ProtectedRoute requiredModule="marketing">
                      <MarketingModule />
                    </ProtectedRoute>
                  }
                />

                {/* Sales Module */}
                <Route
                  path="/sales/*"
                  element={
                    <ProtectedRoute requiredModule="sales">
                      <SalesModule />
                    </ProtectedRoute>
                  }
                />

                {/* Purchase Module */}
                <Route
                  path="/purchase/*"
                  element={
                    <ProtectedRoute requiredModule="purchase">
                      <PurchaseModule />
                    </ProtectedRoute>
                  }
                />

                {/* Supabase Test Page */}
                <Route path="/supabase-test" element={<SupabaseTestPage />} />

                {/* MCP Supabase Integration Page */}
                <Route path="/mcp-supabase" element={<MCPSupabasePage />} />

                {/* Catch all - redirect to login */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AccessGuard>
          </Suspense>
        </NotificationProvider>
      </ErrorBoundary>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
