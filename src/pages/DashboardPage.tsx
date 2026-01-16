// Force update
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, ModuleType } from '@/contexts/AuthContext';
import {
  Users,
  Calculator,
  Package,
  HeadphonesIcon,
  Bell,
  Search,
  Settings,

  ChevronRight,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  UserPlus,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  MessageSquare,
  Building2,
  Shield,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/components/auth/UserProfile';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input as FormInput } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ModuleConfig {
  id: ModuleType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  route: string;
  stats: { label: string; value: number; icon: React.ElementType }[];
  notifications: number;
}

const modules: ModuleConfig[] = [
  {
    id: 'hrd',
    name: 'HRD',
    description: 'Kelola karyawan, cuti, absensi, dan penggajian',
    icon: Users,
    color: 'text-hrd',
    bgColor: 'bg-hrd/10',
    borderColor: 'border-hrd',
    route: '/hrd',
    stats: [
      { label: 'Karyawan Aktif', value: 156, icon: Users },
      { label: 'Pengajuan Cuti', value: 8, icon: FileText },
      { label: 'Karyawan Baru', value: 3, icon: UserPlus },
    ],
    notifications: 8,
  },
  {
    id: 'accounting',
    name: 'Akuntansi',
    description: 'Pembukuan, jurnal, laporan keuangan, dan invoice',
    icon: Calculator,
    color: 'text-accounting-light',
    bgColor: 'bg-accounting/10',
    borderColor: 'border-accounting',
    route: '/accounting',
    stats: [
      { label: 'Invoice Pending', value: 12, icon: FileText },
      { label: 'Pendapatan Bulan Ini', value: 45000000, icon: DollarSign },
      { label: 'Transaksi Hari Ini', value: 24, icon: TrendingUp },
    ],
    notifications: 5,
  },
  {
    id: 'inventory',
    name: 'Persediaan',
    description: 'Stok barang, pembelian, dan manajemen gudang',
    icon: Package,
    color: 'text-inventory',
    bgColor: 'bg-inventory/10',
    borderColor: 'border-inventory',
    route: '/inventory',
    stats: [
      { label: 'Total Produk', value: 1248, icon: Package },
      { label: 'Stok Rendah', value: 15, icon: AlertCircle },
      { label: 'Pesanan Masuk', value: 7, icon: ShoppingCart },
    ],
    notifications: 15,
  },
  {
    id: 'marketing',
    name: 'Pipeline Marketing',
    description: 'Kelola prospek dan deal marketing',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-600',
    route: '/marketing',
    stats: [
      { label: 'Deal Baru', value: 5, icon: TrendingUp },
      { label: 'Total Pipeline', value: 150000000, icon: DollarSign },
      { label: 'Deal Won', value: 2, icon: CheckCircle },
    ],
    notifications: 3,
  },
  {
    id: 'customer',
    name: 'Pelayanan Konsumen',
    description: 'Tiket support, keluhan, dan feedback pelanggan',
    icon: HeadphonesIcon,
    color: 'text-customer',
    bgColor: 'bg-customer/10',
    borderColor: 'border-customer',
    route: '/customer',
    stats: [
      { label: 'Tiket Terbuka', value: 23, icon: MessageSquare },
      { label: 'Diselesaikan Hari Ini', value: 18, icon: CheckCircle },
      { label: 'Rata-rata Respon', value: 2.5, icon: Clock },
    ],
    notifications: 23,
  },
  {
    id: 'project',
    name: 'Proyek',
    description: 'Manajemen proyek pembangunan rumah',
    icon: Building2,
    color: 'text-[#E76F51]',
    bgColor: 'bg-[#E76F51]/10',
    borderColor: 'border-[#E76F51]',
    route: '/projects',
    stats: [
      { label: 'Proyek Aktif', value: 2, icon: Building2 },
      { label: 'Proyek Selesai', value: 1, icon: CheckCircle },
      { label: 'Total Budget', value: 1710000000, icon: DollarSign },
    ],
    notifications: 5,
  },
  {
    id: 'sales',
    name: 'Penjualan',
    description: 'Kelola penjualan, pelanggan, dan invoice',
    icon: ShoppingCart,
    color: 'text-[#2563EB]',
    bgColor: 'bg-[#2563EB]/10',
    borderColor: 'border-[#2563EB]',
    route: '/sales',
    stats: [
      { label: 'Pesanan Aktif', value: 12, icon: ShoppingCart },
      { label: 'Invoice Pending', value: 8, icon: FileText },
      { label: 'Pendapatan Bulan Ini', value: 45000000, icon: DollarSign },
    ],
    notifications: 8,
  },
  {
    id: 'purchase',
    name: 'Pembelian',
    description: 'Kelola pembelian, supplier, dan PO',
    icon: ShoppingBag,
    color: 'text-[#EA580C]',
    bgColor: 'bg-[#EA580C]/10',
    borderColor: 'border-[#EA580C]',
    route: '/purchase',
    stats: [
      { label: 'PO Aktif', value: 6, icon: ShoppingBag },
      { label: 'Invoice Pending', value: 4, icon: FileText },
      { label: 'Pengeluaran Bulan Ini', value: 28000000, icon: DollarSign },
    ],
    notifications: 4,
  },
];

const recentActivities = [
  { id: 1, module: 'hrd', action: 'Pengajuan cuti disetujui', user: 'Budi Santoso', time: '5 menit lalu', icon: CheckCircle },
  { id: 2, module: 'sales', action: 'Pesanan #SO-2024-001 dibuat', user: 'Sales Admin', time: '10 menit lalu', icon: ShoppingCart },
  { id: 3, module: 'accounting', action: 'Invoice #INV-2024-001 dibuat', user: 'Siti Rahayu', time: '15 menit lalu', icon: FileText },
  { id: 4, module: 'purchase', action: 'PO #PO-2024-001 dikirim ke supplier', user: 'Purchasing', time: '25 menit lalu', icon: ShoppingBag },
  { id: 5, module: 'inventory', action: 'Stok produk A-001 rendah', user: 'System', time: '30 menit lalu', icon: AlertCircle },
  { id: 6, module: 'customer', action: 'Tiket #TKT-456 diselesaikan', user: 'Ahmad Wijaya', time: '1 jam lalu', icon: CheckCircle },
  { id: 7, module: 'sales', action: 'Pelanggan baru PT. Maju Bersama ditambahkan', user: 'Sales Team', time: '1.5 jam lalu', icon: Users },
  { id: 8, module: 'hrd', action: 'Karyawan baru ditambahkan', user: 'HR Admin', time: '2 jam lalu', icon: UserPlus },
];

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  return <span>{prefix}{formatNumber(displayValue)}{suffix}</span>;
}

export default function DashboardPage() {
  const { user, logout, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const handleModuleClick = (module: ModuleConfig) => {
    if (hasModuleAccess(module.id)) {
      navigate(module.route);
    }
  };



  const getModuleColor = (moduleId: string) => {
    switch (moduleId) {
      case 'hrd': return 'bg-hrd';
      case 'accounting': return 'bg-accounting';
      case 'inventory': return 'bg-inventory';
      case 'customer': return 'bg-customer';
      case 'sales': return 'bg-[#2563EB]';
      case 'purchase': return 'bg-[#EA580C]';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1A2332] rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-[#1C1C1E]">BusinessHub</span>
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari karyawan, transaksi, produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 font-body"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {/* TODO: Open notifications panel */ }}
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-mono">
                  51
                </span>
              </Button>

              {/* User Menu */}
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-[#1C1C1E] mb-2">
            Selamat Datang, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground font-body">
            Pilih modul untuk memulai pekerjaan Anda hari ini
          </p>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-4 mb-8 shadow-sm"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {modules.filter(m => hasModuleAccess(m.id)).map((module, index) => (
              <div key={module.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className={`w-10 h-10 rounded-lg ${module.bgColor} flex items-center justify-center`}>
                  <module.icon className={`w-5 h-5 ${module.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body">{module.name}</p>
                  <p className="font-mono font-semibold text-[#1C1C1E]">
                    <AnimatedNumber value={module.notifications} /> pending
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <AnimatePresence>
            {modules.map((module, index) => {
              const hasAccess = hasModuleAccess(module.id);

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={hasAccess ? { y: -4, scale: 1.01 } : {}}
                  onClick={() => handleModuleClick(module)}
                  className={`
                    relative bg-white rounded-2xl border-2 p-6 transition-all duration-300
                    ${hasAccess
                      ? `cursor-pointer hover:shadow-lg hover:border-l-8 ${module.borderColor} border-gray-200`
                      : 'opacity-50 cursor-not-allowed border-gray-200'
                    }
                  `}
                >
                  {/* Notification Badge */}
                  {hasAccess && module.notifications > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1, type: 'spring' }}
                      className="absolute -top-2 -right-2"
                    >
                      <Badge className={`${getModuleColor(module.id)} text-white font-mono px-2 py-1`}>
                        {module.notifications}
                      </Badge>
                    </motion.div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl ${module.bgColor} flex items-center justify-center`}>
                      <module.icon className={`w-7 h-7 ${module.color}`} />
                    </div>
                    {hasAccess && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-xl font-bold text-[#1C1C1E] mb-2">
                    {module.name}
                  </h3>
                  <p className="text-muted-foreground font-body text-sm mb-4">
                    {module.description}
                  </p>

                  {/* Stats */}
                  {hasAccess && (
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                      {module.stats.map((stat, statIndex) => (
                        <div key={statIndex} className="text-center">
                          <p className="font-mono text-lg font-semibold text-[#1C1C1E]">
                            <AnimatedNumber
                              value={stat.value}
                              prefix={stat.label.includes('Pendapatan') ? 'Rp ' : ''}
                              suffix={stat.label.includes('Rata-rata') ? 'h' : ''}
                            />
                          </p>
                          <p className="text-xs text-muted-foreground font-body truncate">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Locked Overlay */}
                  {!hasAccess && (
                    <div className="absolute inset-0 bg-gray-100/50 rounded-2xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Lock className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 font-body">Akses Terbatas</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="font-display text-xl font-bold text-[#1C1C1E] mb-4">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* HRD Quick Actions */}
            {hasModuleAccess('hrd') && (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/hrd')}
                >
                  <div className="w-12 h-12 bg-hrd/10 rounded-lg flex items-center justify-center mb-3">
                    <UserPlus className="w-6 h-6 text-hrd" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Tambah Karyawan</p>
                  <p className="text-xs text-gray-500">Daftar karyawan baru</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/hrd')}
                >
                  <div className="w-12 h-12 bg-hrd/10 rounded-lg flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-hrd" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Ajukan Cuti</p>
                  <p className="text-xs text-gray-500">Buat pengajuan cuti</p>
                </motion.div>
              </>
            )}

            {/* Accounting Quick Actions */}
            {hasModuleAccess('accounting') && (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/accounting')}
                >
                  <div className="w-12 h-12 bg-accounting/10 rounded-lg flex items-center justify-center mb-3">
                    <DollarSign className="w-6 h-6 text-accounting-light" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Buat Transaksi</p>
                  <p className="text-xs text-gray-500">Catat transaksi baru</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/accounting')}
                >
                  <div className="w-12 h-12 bg-accounting/10 rounded-lg flex items-center justify-center mb-3">
                    <Calculator className="w-6 h-6 text-accounting-light" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Laporan Keuangan</p>
                  <p className="text-xs text-gray-500">Lihat laporan</p>
                </motion.div>
              </>
            )}

            {/* Sales Quick Actions */}
            {hasModuleAccess('sales') && (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/sales')}
                >
                  <div className="w-12 h-12 bg-[#2563EB]/10 rounded-lg flex items-center justify-center mb-3">
                    <ShoppingCart className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Pesanan Baru</p>
                  <p className="text-xs text-gray-500">Buat pesanan penjualan</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/sales')}
                >
                  <div className="w-12 h-12 bg-[#2563EB]/10 rounded-lg flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Tambah Pelanggan</p>
                  <p className="text-xs text-gray-500">Daftar pelanggan baru</p>
                </motion.div>
              </>
            )}

            {/* Purchase Quick Actions */}
            {hasModuleAccess('purchase') && (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/purchase')}
                >
                  <div className="w-12 h-12 bg-[#EA580C]/10 rounded-lg flex items-center justify-center mb-3">
                    <ShoppingBag className="w-6 h-6 text-[#EA580C]" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">PO Baru</p>
                  <p className="text-xs text-gray-500">Buat purchase order</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/purchase')}
                >
                  <div className="w-12 h-12 bg-[#EA580C]/10 rounded-lg flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-[#EA580C]" />
                  </div>
                  <p className="font-medium text-sm text-gray-900">Tambah Supplier</p>
                  <p className="text-xs text-gray-500">Daftar supplier baru</p>
                </motion.div>
              </>
            )}

            {/* Inventory Quick Actions */}
            {hasModuleAccess('inventory') && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/inventory')}
              >
                <div className="w-12 h-12 bg-inventory/10 rounded-lg flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-inventory" />
                </div>
                <p className="font-medium text-sm text-gray-900">Kelola Stok</p>
                <p className="text-xs text-gray-500">Update inventori</p>
              </motion.div>
            )}

            {/* Customer Service Quick Actions */}
            {hasModuleAccess('customer') && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/customer')}
              >
                <div className="w-12 h-12 bg-customer/10 rounded-lg flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-customer" />
                </div>
                <p className="font-medium text-sm text-gray-900">Tiket Baru</p>
                <p className="text-xs text-gray-500">Buat tiket support</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-[#1C1C1E]">
              Aktivitas Terbaru
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-hrd font-body"
              onClick={() => {/* TODO: Show all activities */ }}
            >
              Lihat Semua
            </Button>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg ${getModuleColor(activity.module)}/10 flex items-center justify-center flex-shrink-0`}>
                    <activity.icon className={`w-5 h-5 ${activity.module === 'hrd' ? 'text-hrd' :
                      activity.module === 'accounting' ? 'text-accounting-light' :
                        activity.module === 'inventory' ? 'text-inventory' :
                          activity.module === 'sales' ? 'text-[#2563EB]' :
                            activity.module === 'purchase' ? 'text-[#EA580C]' :
                              'text-customer'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1E] font-body">
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Pengaturan
            </DialogTitle>
            <DialogDescription className="font-body">
              Kelola pengaturan akun dan preferensi sistem
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="font-body">Profil</TabsTrigger>
              <TabsTrigger value="preferences" className="font-body">Preferensi</TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger value="admin" className="font-body">
                  <Shield className="w-4 h-4 mr-1" />
                  Administrator
                </TabsTrigger>
              )}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-hrd flex items-center justify-center text-white text-xl font-bold">
                    {user?.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">{user?.name}</h3>
                    <p className="text-sm text-muted-foreground font-body capitalize">{user?.role}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Nama Lengkap</Label>
                    <FormInput defaultValue={user?.name} className="font-body" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Email</Label>
                    <FormInput defaultValue={user?.email} className="font-body" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Password Baru</Label>
                    <FormInput type="password" placeholder="Kosongkan jika tidak ingin mengubah" className="font-body" />
                  </div>
                </div>

                <Button className="bg-hrd hover:bg-hrd/90 font-body">
                  Simpan Perubahan
                </Button>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-body font-medium">Notifikasi Email</p>
                    <p className="text-sm text-muted-foreground font-body">Terima notifikasi melalui email</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-body font-medium">Notifikasi Browser</p>
                    <p className="text-sm text-muted-foreground font-body">Tampilkan notifikasi di browser</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-body font-medium">Mode Gelap</p>
                    <p className="text-sm text-muted-foreground font-body">Gunakan tema gelap</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-body font-medium">Auto Logout</p>
                    <p className="text-sm text-muted-foreground font-body">Logout otomatis setelah tidak aktif</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </TabsContent>

            {/* Admin Tab */}
            {user?.role === 'admin' && (
              <TabsContent value="admin" className="space-y-4 mt-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-body text-yellow-800">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Anda memiliki akses administrator penuh ke sistem
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-display font-bold">Manajemen Pengguna</h4>

                  <div className="border rounded-lg divide-y">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-hrd flex items-center justify-center text-white text-sm font-bold">AD</div>
                        <div>
                          <p className="font-body font-medium">Administrator</p>
                          <p className="text-xs text-muted-foreground font-body">admin@company.com</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Admin</Badge>
                    </div>

                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accounting flex items-center justify-center text-white text-sm font-bold">MU</div>
                        <div>
                          <p className="font-body font-medium">Manager User</p>
                          <p className="text-xs text-muted-foreground font-body">manager@company.com</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500">Manager</Badge>
                    </div>

                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-inventory flex items-center justify-center text-white text-sm font-bold">SU</div>
                        <div>
                          <p className="font-body font-medium">Staff User</p>
                          <p className="text-xs text-muted-foreground font-body">staff@company.com</p>
                        </div>
                      </div>
                      <Badge className="bg-gray-500">Staff</Badge>
                    </div>
                  </div>

                  <Button variant="outline" className="font-body w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Tambah Pengguna Baru
                  </Button>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-display font-bold">Pengaturan Sistem</h4>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-body font-medium">Mode Maintenance</p>
                      <p className="text-sm text-muted-foreground font-body">Nonaktifkan akses untuk pengguna non-admin</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-body font-medium">Registrasi Terbuka</p>
                      <p className="text-sm text-muted-foreground font-body">Izinkan pengguna baru mendaftar</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-body font-medium">Log Aktivitas</p>
                      <p className="text-sm text-muted-foreground font-body">Catat semua aktivitas pengguna</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
