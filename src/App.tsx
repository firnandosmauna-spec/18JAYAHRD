import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { DiagnosticOverlay } from "@/components/DiagnosticOverlay";

// Static imports to fix Suspense hang
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import HRDModule from "@/pages/modules/HRDModuleSupabase";
import InventoryModule from "@/pages/modules/InventoryModule";
import CustomerServiceModule from "@/pages/modules/CustomerServiceModule";
const ProjectModule = lazy(() => import("@/pages/modules/ProjectModule"));
const SalesModule = lazy(() => import("@/pages/modules/SalesModule"));
const PurchaseModule = lazy(() => import("@/pages/modules/PurchaseModule"));
const SupabaseTestPage = lazy(() => import("@/pages/SupabaseTestPage"));
const MCPSupabasePage = lazy(() => import("@/pages/MCPSupabasePage"));
const PositionsPage = lazy(() => import("@/pages/hrd/PositionsPage"));
const MarketingModule = lazy(() => import("@/pages/modules/MarketingModule"));
const AccountingModule = lazy(() => import("@/pages/modules/AccountingModule"));

// Global Debug Listener
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target?.innerText?.includes('Tambah Karyawan')) {
      console.log('🔥🔥 GLOBAL CLICK DETECTED ON:', target);
      // alert('GLOBAL CLICK: Teks "Tambah Karyawan" terdeteksi diklik!');
    }
  }, true);
}


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
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-red-50 text-red-900">
          <div className="max-w-md bg-white p-6 rounded shadow border border-red-200">
            <h1 className="text-xl font-bold mb-2">Terjadi Kesalahan Aplikasi</h1>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto mb-4 font-mono max-h-[200px]">
              {typeof this.state.error === 'object'
                ? JSON.stringify(this.state.error, Object.getOwnPropertyNames(this.state.error), 2)
                : String(this.state.error)}
            </pre>
            <div className="text-[10px] text-gray-500 mb-4 font-mono truncate">
              URL: {window.location.href}
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
            >
              Reset & Reload
            </button>
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
      <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-3">Setup Required</h1>
        <p className="text-gray-600 text-center mb-6">
          Aplikasi berhasil dideploy, tetapi belum terhubung ke database Supabase.
        </p>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm mb-6">
          <p className="font-semibold text-slate-700 mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-2 text-slate-600">
            <li>Buka dashboard hosting Anda (Vercel/Netlify).</li>
            <li>Masuk ke <strong>Settings &gt; Environment Variables</strong>.</li>
            <li>Tambahkan Environment Variables berikut:
              <ul className="list-disc list-inside ml-4 mt-1 font-mono text-xs">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </li>
            <li>Lakukan <strong>Redeploy</strong> aplikasi.</li>
          </ol>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function App() {
  if (!isSupabaseConfigured) {
    return <ConfigErrorScreen />;
  }

  return (
    <AuthProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
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

            {/* Project Module */}
            <Route
              path="/projects/*"
              element={
                <ProtectedRoute requiredModule="project">
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
        </Suspense>
      </ErrorBoundary>
      <Toaster />
    </AuthProvider>
  );
}

export default App;

