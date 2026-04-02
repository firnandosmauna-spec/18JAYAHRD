import { ReactNode, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, ModuleType } from '@/contexts/AuthContext';
import {
  Building2,
  Users,
  Package,
  HeadphonesIcon,
  Home,
  ShoppingCart,
  ShoppingBag,
  X,
  Calculator,
  TrendingUp,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/auth/UserProfile';
import { NotificationBell } from '@/components/hrd/NotificationBell';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface ModuleLayoutProps {
  children: ReactNode;
  moduleId: ModuleType;
  title: string;
  navItems: (NavItem | NavGroup)[];
}

const moduleConfig: Record<string, any> = {
  hrd: {
    color: 'bg-hrd',
    textColor: 'text-hrd',
    lightBg: 'bg-hrd/10',
    borderColor: 'border-hrd',
    icon: Users,
  },
  accounting: {
    color: 'bg-accounting',
    textColor: 'text-accounting-light',
    lightBg: 'bg-accounting/10',
    borderColor: 'border-accounting',
    icon: Calculator,
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
  projects: {
    color: 'bg-projects',
    textColor: 'text-projects',
    lightBg: 'bg-projects/10',
    borderColor: 'border-projects',
    icon: Building2,
  },
  marketing: {
    color: 'bg-indigo-600',
    textColor: 'text-indigo-600',
    lightBg: 'bg-indigo-50',
    borderColor: 'border-indigo-600',
    icon: TrendingUp,
  },
  sales: {
    color: 'bg-sales',
    textColor: 'text-sales',
    lightBg: 'bg-sales/10',
    borderColor: 'border-sales',
    icon: ShoppingCart,
  },
  purchase: {
    color: 'bg-purchase',
    textColor: 'text-purchase',
    lightBg: 'bg-purchase/10',
    borderColor: 'border-purchase',
    icon: ShoppingBag,
  },
};

const allModules = [
  { id: 'hrd' as ModuleType, name: 'HRD & Payroll', icon: Users, route: '/hrd' },
  { id: 'accounting' as ModuleType, name: 'Akuntansi', icon: Calculator, route: '/accounting' },
  { id: 'inventory' as ModuleType, name: 'Inventory', icon: Package, route: '/inventory' },
  { id: 'marketing' as ModuleType, name: 'Marketing', icon: TrendingUp, route: '/marketing' },
  { id: 'customer' as ModuleType, name: 'Customer Service', icon: HeadphonesIcon, route: '/customer' },
  { id: 'projects' as ModuleType, name: 'Proyek', icon: Building2, route: '/projects' },
  { id: 'sales' as ModuleType, name: 'Penjualan', icon: ShoppingCart, route: '/sales' },
  { id: 'purchase' as ModuleType, name: 'Pembelian', icon: ShoppingBag, route: '/purchase' },
] as const;

export default function ModuleLayout({ children, moduleId, title, navItems }: ModuleLayoutProps) {
  const { user, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const config = moduleConfig[moduleId] || moduleConfig.hrd;
  const ModuleIcon = config.icon;

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg font-body text-sm transition-all",
          isActive
            ? `${config.lightBg} ${config.textColor} font-bold`
            : "text-gray-600 hover:bg-gray-100"
        )}
      >
        <item.icon className={cn("w-4 h-4", isActive ? config.textColor : "text-gray-400")} />
        {item.label}
      </Link>
    );
  };

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
                  <h2 className="font-display font-bold text-white leading-tight">{title}</h2>
                  <p className="text-[10px] text-white/70 font-body uppercase tracking-wider">Modul Aktif</p>
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
            {navItems.map((itemOrGroup, idx) => {
              if ('group' in itemOrGroup) {
                return (
                  <div key={idx} className="pt-4 first:pt-0 space-y-1">
                    <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {itemOrGroup.group}
                    </p>
                    {itemOrGroup.items.map((item) => renderNavItem(item))}
                  </div>
                );
              }
              return renderNavItem(itemOrGroup as NavItem);
            })}
          </nav>

          {/* Quick Module Switch */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-muted-foreground font-body mb-2 px-3">Modul Lainnya</p>
            <div className="grid grid-cols-4 gap-2">
              {allModules.filter(m => hasModuleAccess(m.id)).map((module) => {
                const isCurrentModule = module.id === moduleId;
                const moduleConf = moduleConfig[module.id];
                
                const storageKey = `lastPath_${module.id}`;
                const savedPath = localStorage.getItem(storageKey);
                const targetPath = savedPath || module.route;
                
                return (
                  <Link
                    key={module.id}
                    to={isCurrentModule ? '#' : targetPath}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "w-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer relative z-10",
                      isCurrentModule
                        ? `${moduleConf.color} text-white cursor-default`
                        : `${moduleConf.lightBg} ${moduleConf.textColor} hover:bg-white/50 active:scale-95`
                    )}
                    title={module.name}
                  >
                    <module.icon className="w-5 h-5 pointer-events-none" />
                  </Link>
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
      <main className="lg:pl-64 min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-4 ml-auto">
            <NotificationBell />
            <UserProfile />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
