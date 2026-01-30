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

function App() {
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

