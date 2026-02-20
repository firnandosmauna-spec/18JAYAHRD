import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { useProjects } from '@/hooks/useProject';
import { projectService } from '@/services/projectService';
import { useToast } from '@/components/ui/use-toast';
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
  Bell,
  XCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    return {
      notifications: [] as ProjectNotification[],
      unreadCount: 0,
      addNotification: () => { },
      markAsRead: () => { },
      markAllAsRead: () => { },
      clearNotification: () => { },
    };
  }
  return context;
}

const initialProjectNotifications: ProjectNotification[] = [];

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
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-[#E76F51]/5 border-[#E76F51]/20'
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

// Progress Log Modal
function ProjectProgressLog({ project, open, onOpenChange, onUpdate }: { project: any, open: boolean, onOpenChange: (open: boolean) => void, onUpdate: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLog, setNewLog] = useState({ progress: project.progress, description: '', photos: [] as string[] });
  const { toast } = useToast();

  useEffect(() => {
    if (open && project.id) {
      loadLogs();
      setNewLog({ ...newLog, progress: project.progress });
    }
  }, [open, project.id]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjectLogs(project.id);
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await projectService.addProjectLog({
        project_id: project.id,
        progress_percentage: newLog.progress,
        description: newLog.description,
        photos: newLog.photos
      });
      toast({ title: "Progress Diperbarui", description: "Laporan progress berhasil disimpan" });
      onOpenChange(false);
      onUpdate(); // refresh parent
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal menyimpan laporan", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Laporan Progress: {project.name}</DialogTitle>
          <DialogDescription>Catat perkembangan terbaru proyek ini.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Input Form */}
          <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
            <div className="space-y-2">
              <Label>Progress Saat Ini (%)</Label>
              <div className="flex items-center gap-4">
                <Progress value={newLog.progress} className="h-4 flex-1" />
                <span className="font-bold w-12 text-right">{newLog.progress}%</span>
              </div>
              <Input
                type="range"
                min="0"
                max="100"
                value={newLog.progress}
                onChange={(e) => setNewLog({ ...newLog, progress: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Keterangan Pekerjaan</Label>
              <Input
                placeholder="Contoh: Pemasangan atap selesai..."
                value={newLog.description}
                onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
              />
            </div>
            <Button className="w-full bg-[#E76F51]" onClick={handleSubmit}>Simpan Laporan</Button>
          </div>

          {/* History */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Riwayat Laporan</h3>
            {loading ? <p className="text-sm text-slate-500">Memuat riwayat...</p> : (
              <div className="space-y-4">
                {logs.length === 0 ? <p className="text-sm text-slate-500">Belum ada laporan.</p> : (
                  logs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-3 flex gap-4 bg-white relative">
                      <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                        <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{log.progress_percentage}%</Badge>
                      </div>
                      <div className="flex-1 border-l pl-4">
                        <p className="text-sm text-slate-700">{log.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDashboard() {
  const { projects, loading, addProject, refetch } = useProjects();
  const { addNotification } = useProjectNotifications();
  const { toast } = useToast();

  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Dashboard Logic
  const [selectedProjectForLog, setSelectedProjectForLog] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    client_name: '',
    type: '',
    area_sqm: '',
    location: '',
    start_date: '',
    end_date: '',
    budget: '',
    client_phone: '',
  });

  const activeProjects = projects.filter(p => p.status === 'in-progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);

  // Note: 'workers' count is not available in simple project list, would need separate query or join
  // Placeholder for now
  const activeWorkersCount = 0;

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
      case 'cancelled':
        return <Badge className="bg-red-500">Dibatalkan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAddProject = async () => {
    try {
      setIsSubmitting(true);
      // Basic validation
      if (!newProject.name || !newProject.client_name) {
        toast({
          title: 'Error',
          description: 'Nama Proyek dan Nama Klien wajib diisi',
          variant: 'destructive',
        });
        return;
      }

      await addProject({
        name: newProject.name,
        client_name: newProject.client_name,
        type: newProject.type,
        area_sqm: newProject.area_sqm ? parseFloat(newProject.area_sqm) : 0,
        location: newProject.location,
        start_date: newProject.start_date || undefined,
        end_date: newProject.end_date || undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : 0,
        client_phone: newProject.client_phone,
        status: 'planning',
        spent: 0,
        progress: 0,
      });

      addNotification({
        title: 'Proyek Ditambahkan',
        message: `Proyek "${newProject.name}" berhasil dibuat`,
        type: 'success',
        time: 'Baru saja',
        module: 'project'
      });

      toast({
        title: 'Berhasil',
        description: 'Proyek berhasil ditambahkan',
      });

      setShowAddProjectDialog(false);
      setNewProject({
        name: '',
        client_name: '',
        type: '',
        area_sqm: '',
        location: '',
        start_date: '',
        end_date: '',
        budget: '',
        client_phone: '',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message || 'Gagal menambahkan proyek',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E76F51]/30 border-t-[#E76F51] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat data proyek...</p>
        </div>
      </div>
    );
  }

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
                  <Label className="font-body">Nama Proyek <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Pembangunan Rumah Tipe 45..."
                    className="font-body"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Nama Klien <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Nama pemilik rumah"
                    className="font-body"
                    value={newProject.client_name}
                    onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tipe Proyek</Label>
                    <Select
                      value={newProject.type}
                      onValueChange={(val) => setNewProject({ ...newProject, type: val })}
                    >
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rumah Baru" className="font-body">Rumah Baru</SelectItem>
                        <SelectItem value="Renovasi" className="font-body">Renovasi</SelectItem>
                        <SelectItem value="Perluasan" className="font-body">Perluasan</SelectItem>
                        <SelectItem value="Interior" className="font-body">Interior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Luas (m²)</Label>
                    <Input
                      type="number"
                      placeholder="45"
                      className="font-body"
                      value={newProject.area_sqm}
                      onChange={(e) => setNewProject({ ...newProject, area_sqm: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Lokasi</Label>
                  <Input
                    placeholder="Alamat lengkap proyek"
                    className="font-body"
                    value={newProject.location}
                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tanggal Mulai</Label>
                    <Input
                      type="date"
                      className="font-body"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Target Selesai</Label>
                    <Input
                      type="date"
                      className="font-body"
                      value={newProject.end_date}
                      onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Budget (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="450000000"
                    className="font-body"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Kontak Klien</Label>
                  <Input
                    placeholder="081234567890"
                    className="font-body"
                    value={newProject.client_phone}
                    onChange={(e) => setNewProject({ ...newProject, client_phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddProjectDialog(false)} className="font-body" disabled={isSubmitting}>
                  Batal
                </Button>
                <Button
                  className="bg-[#E76F51] hover:bg-[#E76F51]/90 font-body"
                  onClick={handleAddProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
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
                  <p className="text-xl font-display font-bold text-[#1C1C1E] mt-1">
                    Rp {(totalBudget / 1000000).toLocaleString('id-ID')}jt
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
                    {activeWorkersCount}
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
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Belum ada proyek. Silakan buat proyek baru.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-body font-medium">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {project.location || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-body">
                      <div>
                        <p>{project.client_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {project.client_phone || '-'}
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
                          Terpakai: Rp {((project.spent || 0) / 1000000).toFixed(0)}jt
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
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
                          <DropdownMenuItem className="font-body" onClick={() => setSelectedProjectForLog(project)}>
                            Laporan Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-body text-red-600">Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      {/* Progress Log Dialog */}
      {
        selectedProjectForLog && (
          <ProjectProgressLog
            project={selectedProjectForLog}
            open={!!selectedProjectForLog}
            onOpenChange={(open) => !open && setSelectedProjectForLog(null)}
            onUpdate={() => { refetch(); }}
          />
        )
      }
    </div >
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
  const { projects, loading } = useProjects();
  const sortedProjects = [...projects].sort((a, b) => b.progress - a.progress);

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat data laporan...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Laporan Progress Proyek</h1>
      <p className="text-muted-foreground font-body">Rekapitulasi progress seluruh proyek aktif.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProjects.map(project => (
          <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">{project.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{project.client_name}</p>
                </div>
                <Badge className={project.status === 'in-progress' ? 'bg-blue-500' : 'bg-slate-500'}>
                  {project.status === 'in-progress' ? 'Aktif' : project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-bold text-slate-700">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Target Selesai</p>
                  <p className="font-medium text-slate-700">
                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Sisa Budget</p>
                  <p className="font-medium text-slate-700">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(project.budget - (project.spent || 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
