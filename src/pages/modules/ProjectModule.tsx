import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Calendar,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Hammer,
  Truck,
  Package,
  ClipboardList,
  MapPin,
  Phone,
  Mail,
  Bell,
  XCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createContext, useContext, ReactNode } from 'react';

// Notification types and context for ProjectModule
interface ProjectNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
  module: string;
}

interface ProjectNotificationContextType {
  notifications: ProjectNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<ProjectNotification, 'id' | 'read'>) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearNotification: (id: number) => void;
}

const ProjectNotificationContext = createContext<ProjectNotificationContextType | undefined>(undefined);

function useProjectNotifications() {
  const context = useContext(ProjectNotificationContext);
  if (!context) {
    // Return default values if not in provider
    return {
      notifications: [] as ProjectNotification[],
      unreadCount: 0,
      addNotification: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearNotification: () => {},
    };
  }
  return context;
}

// Initial notifications for project module
const initialProjectNotifications: ProjectNotification[] = [
  { id: 1, title: 'Proyek Baru', message: 'Proyek pembangunan rumah tipe 45 dimulai', type: 'info', time: '5 menit lalu', read: false, module: 'project' },
  { id: 2, title: 'Material Tiba', message: 'Pengiriman semen 50 sak telah tiba', type: 'success', time: '1 jam lalu', read: false, module: 'material' },
  { id: 3, title: 'Stok Rendah', message: 'Stok besi beton hampir habis', type: 'warning', time: '2 jam lalu', read: false, module: 'material' },
];

function ProjectNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ProjectNotification[]>(initialProjectNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<ProjectNotification, 'id' | 'read'>) => {
    const newNotification: ProjectNotification = {
      ...notification,
      id: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <ProjectNotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotification }}>
      {children}
    </ProjectNotificationContext.Provider>
  );
}

// Notification Bell Component
function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useProjectNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-mono"
            >
              {unreadCount}
            </motion.span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display">Notifikasi</DialogTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-[#E76F51] font-body text-xs">
                Tandai semua dibaca
              </Button>
            )}
          </div>
          <DialogDescription className="font-body">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi telah dibaca'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.read ? 'bg-gray-50 border-gray-200' : 'bg-[#E76F51]/5 border-[#E76F51]/20'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-body ${notification.read ? 'text-gray-600' : 'text-[#1C1C1E] font-medium'}`}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{notification.message}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{notification.time}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const navItems = [
  { label: 'Dashboard', href: '/projects', icon: Building2 },
  { label: 'Proyek Aktif', href: '/projects/active', icon: Hammer },
  { label: 'Perencanaan', href: '/projects/planning', icon: ClipboardList },
  { label: 'Material', href: '/projects/materials', icon: Package },
  { label: 'Tim & Pekerja', href: '/projects/team', icon: Users },
  { label: 'Laporan', href: '/projects/reports', icon: FileText },
];

// Mock data
const projects = [
  { 
    id: 1, 
    name: 'Pembangunan Rumah Tipe 45 - Jl. Merdeka', 
    client: 'Budi Santoso', 
    status: 'in-progress', 
    progress: 65, 
    startDate: '2024-01-15', 
    targetDate: '2024-04-15',
    budget: 450000000,
    spent: 292500000,
    location: 'Jl. Merdeka No. 123, Jakarta',
    phone: '081234567890',
    type: 'Rumah Tinggal',
    area: 45
  },
  { 
    id: 2, 
    name: 'Renovasi Rumah Tipe 70 - Perumahan Griya', 
    client: 'Siti Rahayu', 
    status: 'in-progress', 
    progress: 40, 
    startDate: '2024-02-01', 
    targetDate: '2024-05-01',
    budget: 280000000,
    spent: 112000000,
    location: 'Perumahan Griya Asri Blok C12',
    phone: '081298765432',
    type: 'Renovasi',
    area: 70
  },
  { 
    id: 3, 
    name: 'Pembangunan Rumah Tipe 60 - BSD', 
    client: 'Ahmad Wijaya', 
    status: 'planning', 
    progress: 15, 
    startDate: '2024-03-01', 
    targetDate: '2024-07-01',
    budget: 600000000,
    spent: 90000000,
    location: 'BSD City, Tangerang Selatan',
    phone: '081345678901',
    type: 'Rumah Tinggal',
    area: 60
  },
  { 
    id: 4, 
    name: 'Pembangunan Rumah Minimalis - Bekasi', 
    client: 'Dewi Lestari', 
    status: 'completed', 
    progress: 100, 
    startDate: '2023-10-01', 
    targetDate: '2024-01-31',
    budget: 380000000,
    spent: 375000000,
    location: 'Jl. Raya Bekasi KM 25',
    phone: '081456789012',
    type: 'Rumah Tinggal',
    area: 50
  },
];

const projectPhases = [
  { id: 1, name: 'Persiapan Lahan', duration: '7 hari', status: 'completed' },
  { id: 2, name: 'Pondasi', duration: '14 hari', status: 'completed' },
  { id: 3, name: 'Struktur & Rangka', duration: '21 hari', status: 'in-progress' },
  { id: 4, name: 'Dinding & Atap', duration: '14 hari', status: 'pending' },
  { id: 5, name: 'Instalasi MEP', duration: '10 hari', status: 'pending' },
  { id: 6, name: 'Finishing Interior', duration: '14 hari', status: 'pending' },
  { id: 7, name: 'Finishing Eksterior', duration: '7 hari', status: 'pending' },
  { id: 8, name: 'Landscaping', duration: '5 hari', status: 'pending' },
];

const materials = [
  { id: 1, name: 'Semen Portland', unit: 'Sak', stock: 150, used: 85, price: 65000 },
  { id: 2, name: 'Bata Merah', unit: 'Buah', stock: 5000, used: 3200, price: 1200 },
  { id: 3, name: 'Pasir Cor', unit: 'M³', stock: 25, used: 18, price: 350000 },
  { id: 4, name: 'Besi Beton 10mm', unit: 'Batang', stock: 200, used: 145, price: 85000 },
  { id: 5, name: 'Keramik 40x40', unit: 'Dus', stock: 80, used: 45, price: 125000 },
  { id: 6, name: 'Cat Tembok', unit: 'Kaleng', stock: 60, used: 28, price: 180000 },
];

const workers = [
  { id: 1, name: 'Pak Joko', role: 'Mandor', phone: '081234567890', status: 'active', dailyRate: 250000 },
  { id: 2, name: 'Pak Budi', role: 'Tukang Batu', phone: '081234567891', status: 'active', dailyRate: 200000 },
  { id: 3, name: 'Pak Andi', role: 'Tukang Batu', phone: '081234567892', status: 'active', dailyRate: 200000 },
  { id: 4, name: 'Pak Rudi', role: 'Tukang Kayu', phone: '081234567893', status: 'active', dailyRate: 220000 },
  { id: 5, name: 'Pak Hadi', role: 'Tukang Las', phone: '081234567894', status: 'active', dailyRate: 230000 },
  { id: 6, name: 'Pak Slamet', role: 'Tukang Cat', phone: '081234567895', status: 'on-leave', dailyRate: 180000 },
];

function ProjectDashboard() {
  const { addNotification } = useProjectNotifications();
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);

  const activeProjects = projects.filter(p => p.status === 'in-progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-progress':
        return <Badge className="bg-blue-500">Sedang Berjalan</Badge>;
      case 'planning':
        return <Badge className="bg-yellow-500">Perencanaan</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Selesai</Badge>;
      case 'on-hold':
        return <Badge className="bg-gray-500">Ditunda</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Dashboard Proyek</h1>
          <p className="text-muted-foreground font-body mt-1">Kelola proyek pembangunan rumah</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showAddProjectDialog} onOpenChange={setShowAddProjectDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#E76F51] hover:bg-[#E76F51]/90 font-body">
                <Plus className="w-4 h-4 mr-2" />
                Proyek Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Tambah Proyek Baru</DialogTitle>
                <DialogDescription className="font-body">
                  Buat proyek pembangunan rumah baru
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-body">Nama Proyek</Label>
                  <Input placeholder="Pembangunan Rumah Tipe 45..." className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Nama Klien</Label>
                  <Input placeholder="Nama pemilik rumah" className="font-body" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tipe Proyek</Label>
                    <Select>
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new" className="font-body">Rumah Baru</SelectItem>
                        <SelectItem value="renovation" className="font-body">Renovasi</SelectItem>
                        <SelectItem value="extension" className="font-body">Perluasan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Luas (m²)</Label>
                    <Input type="number" placeholder="45" className="font-body" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Lokasi</Label>
                  <Input placeholder="Alamat lengkap proyek" className="font-body" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tanggal Mulai</Label>
                    <Input type="date" className="font-body" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Target Selesai</Label>
                    <Input type="date" className="font-body" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Budget (Rp)</Label>
                  <Input type="number" placeholder="450000000" className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Kontak Klien</Label>
                  <Input placeholder="081234567890" className="font-body" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddProjectDialog(false)} className="font-body">
                  Batal
                </Button>
                <Button 
                  className="bg-[#E76F51] hover:bg-[#E76F51]/90 font-body"
                  onClick={() => {
                    addNotification({
                      title: 'Proyek Ditambahkan',
                      message: 'Proyek baru berhasil ditambahkan',
                      type: 'success',
                      time: 'Baru saja',
                      module: 'project'
                    });
                    setShowAddProjectDialog(false);
                  }}
                >
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-muted-foreground">Proyek Aktif</p>
                  <p className="text-2xl font-display font-bold text-[#1C1C1E] mt-1">{activeProjects}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#E76F51]/20 flex items-center justify-center">
                  <Hammer className="w-6 h-6 text-[#E76F51]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-muted-foreground">Proyek Selesai</p>
                  <p className="text-2xl font-display font-bold text-[#1C1C1E] mt-1">{completedProjects}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-display font-bold text-[#1C1C1E] mt-1">
                    Rp {(totalBudget / 1000000000).toFixed(1)}M
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-muted-foreground">Pekerja Aktif</p>
                  <p className="text-2xl font-display font-bold text-[#1C1C1E] mt-1">
                    {workers.filter(w => w.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display">Daftar Proyek</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari proyek..." className="pl-9 w-64 font-body" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Nama Proyek</TableHead>
                <TableHead className="font-body">Klien</TableHead>
                <TableHead className="font-body">Status</TableHead>
                <TableHead className="font-body">Progress</TableHead>
                <TableHead className="font-body">Budget</TableHead>
                <TableHead className="font-body">Target</TableHead>
                <TableHead className="font-body"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-body font-medium">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {project.location}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-body">
                    <div>
                      <p>{project.client}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {project.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-body">
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div>
                      <p className="font-medium">Rp {(project.budget / 1000000).toFixed(0)}jt</p>
                      <p className="text-xs text-muted-foreground">
                        Terpakai: Rp {(project.spent / 1000000).toFixed(0)}jt
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-body text-sm">
                    {new Date(project.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="font-body">Lihat Detail</DropdownMenuItem>
                        <DropdownMenuItem className="font-body">Edit Proyek</DropdownMenuItem>
                        <DropdownMenuItem className="font-body">Laporan Progress</DropdownMenuItem>
                        <DropdownMenuItem className="font-body text-red-600">Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Project Phases & Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Phases */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Tahapan Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectPhases.map((phase, index) => (
                <div key={phase.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    phase.status === 'completed' ? 'bg-green-500 text-white' :
                    phase.status === 'in-progress' ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-body font-medium">{phase.name}</p>
                    <p className="text-xs text-muted-foreground">{phase.duration}</p>
                  </div>
                  {phase.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {phase.status === 'in-progress' && <Clock className="w-5 h-5 text-blue-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Material Proyek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {materials.slice(0, 6).map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E76F51]/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#E76F51]" />
                    </div>
                    <div>
                      <p className="font-body font-medium">{material.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Terpakai: {material.used} {material.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">
                      {material.stock - material.used} {material.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">Sisa stok</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActiveProjectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Proyek Aktif</h1>
      <p className="text-muted-foreground font-body">Halaman proyek aktif</p>
    </div>
  );
}

function PlanningPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Perencanaan</h1>
      <p className="text-muted-foreground font-body">Halaman perencanaan proyek</p>
    </div>
  );
}

function MaterialsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Material</h1>
      <p className="text-muted-foreground font-body">Halaman manajemen material</p>
    </div>
  );
}

function TeamPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Tim & Pekerja</h1>
      <p className="text-muted-foreground font-body">Halaman manajemen tim</p>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Laporan</h1>
      <p className="text-muted-foreground font-body">Halaman laporan proyek</p>
    </div>
  );
}

export default function ProjectModule() {
  return (
    <ProjectNotificationProvider>
      <ModuleLayout moduleId="project" title="Proyek" navItems={navItems}>
        <Routes>
          <Route index element={<ProjectDashboard />} />
          <Route path="active" element={<ActiveProjectsPage />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Routes>
      </ModuleLayout>
    </ProjectNotificationProvider>
  );
}
