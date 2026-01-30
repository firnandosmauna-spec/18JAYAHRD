import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, ModuleType } from '@/contexts/AuthContext';
import {
  Building2,
  Users,
  Package,
  HeadphonesIcon,
  Home,
  Bell,
  ShoppingCart,
  ShoppingBag,
  ChevronLeft,
  Menu,
  Calculator,
  TrendingUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/auth/UserProfile';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ModuleLayoutProps {
  children: ReactNode;
  moduleId: ModuleType;
  title: string;
  navItems: { label: string; href: string; icon: React.ElementType }[];
}

const moduleConfig = {
  hrd: {
    color: 'bg-hrd',
    textColor: 'text-hrd',
    lightBg: 'bg-hrd/10',
    borderColor: 'border-hrd',
    icon: Users,
  },
  inventory: {
    color: 'bg-inventory',
    textColor: 'text-inventory',
    lightBg: 'bg-inventory/10',
    borderColor: 'border-inventory',
    icon: Package,
  },
  customer: {
    color: 'bg-customer',
    textColor: 'text-customer',
    lightBg: 'bg-customer/10',
    borderColor: 'border-customer',
    icon: HeadphonesIcon,
  },
  accounting: {
    color: 'bg-accounting',
    textColor: 'text-accounting',
    lightBg: 'bg-accounting/10',
    borderColor: 'border-accounting',
    icon: Calculator,
  },
  project: {
    color: 'bg-[#E76F51]',
    textColor: 'text-[#E76F51]',
    lightBg: 'bg-[#E76F51]/10',
    borderColor: 'border-[#E76F51]',
    icon: Building2,
  },
  sales: {
    color: 'bg-[#2563EB]',
    textColor: 'text-[#2563EB]',
    lightBg: 'bg-[#2563EB]/10',
    borderColor: 'border-[#2563EB]',
    icon: ShoppingCart,
  },
  purchase: {
    color: 'bg-[#EA580C]',
    textColor: 'text-[#EA580C]',
    lightBg: 'bg-[#EA580C]/10',
    borderColor: 'border-[#EA580C]',
    icon: ShoppingBag,
  },
  marketing: {
    color: 'bg-indigo-600',
    textColor: 'text-indigo-600',
    lightBg: 'bg-indigo-50',
    borderColor: 'border-indigo-600',
    icon: TrendingUp,
  },
};

const allModules = [
  { id: 'hrd' as ModuleType, name: 'HRD', route: '/hrd', icon: Users },
  { id: 'accounting' as ModuleType, name: 'Akuntansi', route: '/accounting', icon: Calculator },
  { id: 'inventory' as ModuleType, name: 'Persediaan', route: '/inventory', icon: Package },
  { id: 'customer' as ModuleType, name: 'Pelayanan', route: '/customer', icon: HeadphonesIcon },
  { id: 'project' as ModuleType, name: 'Proyek', route: '/projects', icon: Building2 },
  { id: 'sales' as ModuleType, name: 'Penjualan', route: '/sales', icon: ShoppingCart },
  { id: 'purchase' as ModuleType, name: 'Pembelian', route: '/purchase', icon: ShoppingBag },
  { id: 'marketing' as ModuleType, name: 'Marketing', route: '/marketing', icon: TrendingUp },
];

export default function ModuleLayout({ children, moduleId, title, navItems }: ModuleLayoutProps) {
  const { user, logout, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const config = moduleConfig[moduleId];
  const ModuleIcon = config.icon;



  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`p-4 ${config.color}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ModuleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white">{title}</h2>
                  <p className="text-xs text-white/70 font-body">Modul Aktif</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-white/20"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm transition-all",
                    isActive
                      ? `${config.lightBg} ${config.textColor} font-medium`
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Module Switch */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-muted-foreground font-body mb-2 px-3">Modul Lainnya</p>
            <div className="grid grid-cols-4 gap-2">
              {allModules.filter(m => hasModuleAccess(m.id)).map((module) => {
                const isCurrentModule = module.id === moduleId;
                const moduleConf = moduleConfig[module.id];
                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      if (!isCurrentModule) {
                        navigate(module.route);
                        setSidebarOpen(false);
                      }
                    }}
                    disabled={isCurrentModule}
                    className={cn(
                      "w-full aspect-square rounded-lg flex items-center justify-center transition-all",
                      isCurrentModule
                        ? `${moduleConf.color} text-white`
                        : `${moduleConf.lightBg} ${moduleConf.textColor} hover:opacity-80`
                    )}
                    title={module.name}
                  >
                    <module.icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm text-gray-600 hover:bg-gray-100 transition-all"
            >
              <Home className="w-5 h-5" />
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-body hidden sm:inline">Dashboard</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-mono">
                  3
                </span>
              </Button>

              <UserProfile />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
