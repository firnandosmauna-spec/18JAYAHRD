import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";

// Lazy load pages
const AuthPage = lazy(() => import("@/pages/AuthPage").then(module => ({ default: module.AuthPage })));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const HRDModule = lazy(() => import("@/pages/modules/HRDModuleSupabase")); // Supabase version
const AccountingModule = lazy(() => import("@/pages/modules/AccountingModule"));
const InventoryModule = lazy(() => import("@/pages/modules/InventoryModule"));
const CustomerServiceModule = lazy(() => import("@/pages/modules/CustomerServiceModule"));
const ProjectModule = lazy(() => import("@/pages/modules/ProjectModule"));
const SalesModule = lazy(() => import("@/pages/modules/SalesModule"));
const PurchaseModule = lazy(() => import("@/pages/modules/PurchaseModule"));
const SupabaseTestPage = lazy(() => import("@/pages/SupabaseTestPage"));
const MCPSupabasePage = lazy(() => import("@/pages/MCPSupabasePage"));
const PositionsPage = lazy(() => import("@/pages/hrd/PositionsPage"));
const MarketingModule = lazy(() => import("@/pages/modules/MarketingModule")); // Force Rebuild


function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#0D7377]/30 border-t-[#0D7377] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-body">Memuat...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<AuthPage />} />
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
          >
          </Route>

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
      <Toaster />
    </AuthProvider>
  );
}

export default App;
