import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { useNavigate, Routes, Route, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { useProjects, useProjectWorkers, useProjectWorkerPayments, useProjectLaborRates, useProjectWorkerActivities, useProject, useProjectMaterials, useProjectProgressLogs } from '@/hooks/useProject';
import { useEmployees } from '@/hooks/useSupabase';
import { useProjectLocations } from '@/hooks/useInventory';
import { projectService } from '@/services/projectService';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Box,
  MapPin,
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
  Phone,
  Bell,
  XCircle,
  X,
  Trash2,
  Edit,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjectLocationManagement } from '@/components/inventory/ProjectLocationManagement';

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
  { label: 'Lokasi Proyek', href: '/projects/locations', icon: MapPin },
  { label: 'Laporan', href: '/projects/reports', icon: FileText },
];

// Progress Log Modal
// Progress Log Modal
function ProjectProgressLog({ project, open, onOpenChange, onUpdate }: { project: any, open: boolean, onOpenChange: (open: boolean) => void, onUpdate: () => void }) {
  const { logs, loading, addLog, updateLog, deleteLog } = useProjectProgressLogs(project.id);
  const [newLog, setNewLog] = useState({ progress: project.progress, description: '', photos: [] as string[] });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ progress: 0, description: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (open && project.id) {
      setNewLog({ ...newLog, progress: project.progress, description: '' });
    }
  }, [open, project.id]);

  const handleSubmit = async () => {
    try {
      if (!newLog.description) {
        toast({ title: "Gagal", description: "Keterangan wajib diisi", variant: "destructive" });
        return;
      }
      await addLog({
        project_id: project.id,
        progress_percentage: newLog.progress,
        description: newLog.description,
        photos: newLog.photos
      });
      toast({ title: "Progress Diperbarui", description: "Laporan progress berhasil disimpan" });
      setNewLog({ ...newLog, description: '' });
      onUpdate(); // refresh parent for project-wide progress
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal menyimpan laporan", variant: "destructive" });
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus laporan ini?")) return;
    try {
      await deleteLog(logId);
      toast({ title: "Berhasil", description: "Laporan berhasil dihapus" });
      onUpdate();
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal menghapus laporan", variant: "destructive" });
    }
  };

  const startEdit = (log: any) => {
    setEditingLogId(log.id);
    setEditForm({ progress: log.progress_percentage, description: log.description });
  };

  const handleUpdate = async () => {
    if (!editingLogId) return;
    try {
      await updateLog(editingLogId, {
        progress_percentage: editForm.progress,
        description: editForm.description
      });
      toast({ title: "Berhasil", description: "Laporan berhasil diperbarui" });
      setEditingLogId(null);
      onUpdate();
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal memperbarui laporan", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display">Laporan Progress: {project.name}</DialogTitle>
          <DialogDescription className="font-body">Catat perkembangan terbaru proyek ini.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Form */}
          <div className="space-y-4 border p-4 rounded-xl bg-slate-50">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Buat Laporan Baru</h3>
            <div className="space-y-2">
              <Label className="font-body">Progress Proyek (%)</Label>
              <div className="flex items-center gap-4">
                <Progress value={newLog.progress} className="h-3 flex-1" />
                <span className="font-bold w-12 text-right font-mono">{newLog.progress}%</span>
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
              <Label className="font-body">Keterangan Pekerjaan</Label>
              <Textarea
                placeholder="Contoh: Pemasangan atap selesai, pengecatan dimulai..."
                className="font-body resize-none"
                rows={3}
                value={newLog.description}
                onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
              />
            </div>
            <Button className="w-full bg-[#E76F51] hover:bg-[#E76F51]/90" onClick={handleSubmit}>
              Simpan Laporan
            </Button>
          </div>

          {/* History */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#E76F51]" />
              Riwayat Laporan
            </h3>
            
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
                <p className="text-sm text-slate-500 mt-2">Memuat riwayat...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-100">
                    <p className="text-sm text-slate-400">Belum ada laporan progress.</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="group border rounded-xl p-4 flex gap-4 bg-white hover:border-[#E76F51]/30 transition-all relative">
                      <div className="flex flex-col items-center gap-1 min-w-[4rem]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </span>
                        <Badge variant="outline" className="bg-[#E76F51]/5 text-[#E76F51] border-[#E76F51]/20 font-mono">
                          {log.progress_percentage}%
                        </Badge>
                      </div>
                      <div className="flex-1 border-l pl-4 border-slate-100">
                        {editingLogId === log.id ? (
                          <div className="space-y-3 pt-1">
                             <div className="space-y-1">
                               <div className="flex justify-between items-center text-xs text-slate-500">
                                 <span>Update Progress (%)</span>
                                 <span className="font-bold">{editForm.progress}%</span>
                               </div>
                               <Input
                                type="range"
                                min="0"
                                max="100"
                                value={editForm.progress}
                                onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) })}
                                className="h-6"
                               />
                             </div>
                             <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="font-body text-sm min-h-[80px]"
                             />
                             <div className="flex gap-2">
                               <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={handleUpdate}>Simpan</Button>
                               <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingLogId(null)}>Batal</Button>
                             </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-700 leading-relaxed font-body">{log.description}</p>
                            <div className="mt-2 flex items-center justify-between">
                               <span className="text-[10px] text-slate-400 italic">
                                 {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                               </span>
                               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => startEdit(log)}
                                 >
                                   <Edit className="h-3.5 w-3.5" />
                                 </Button>
                                 <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(log.id)}
                                 >
                                   <Trash2 className="h-3.5 w-3.5" />
                                 </Button>
                               </div>
                            </div>
                          </>
                        )}
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
  const { projects, loading, addProject, updateProject, deleteProject, refetch } = useProjects();
  const { addNotification } = useProjectNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { locations } = useProjectLocations();
  
  // Dashboard Logic
  const [activeWorkersCount, setActiveWorkersCount] = useState(0);
  const [selectedProjectForLog, setSelectedProjectForLog] = useState<any>(null);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    client_name: '',
    type: '',
    area_sqm: '',
    location: '',
    start_date: '',
    end_date: '',
    budget: '',
    client_phone: '',
    status: 'planning' as any,
  });

  useEffect(() => {
    if (editingProject) {
      setProjectFormData({
        name: editingProject.name || '',
        client_name: editingProject.client_name || '',
        type: editingProject.type || '',
        area_sqm: editingProject.area_sqm?.toString() || '',
        location: editingProject.location || '',
        start_date: editingProject.start_date || '',
        end_date: editingProject.end_date || '',
        budget: editingProject.budget?.toString() || '',
        client_phone: editingProject.client_phone || '',
        status: editingProject.status || 'planning',
      });
      setShowAddProjectDialog(true);
    } else {
      setProjectFormData({
        name: '',
        client_name: '',
        type: '',
        area_sqm: '',
        location: '',
        start_date: '',
        end_date: '',
        budget: '',
        client_phone: '',
        status: 'planning',
      });
    }
  }, [editingProject]);

  useEffect(() => {
    const fetchActiveWorkers = async () => {
      try {
        let total = 0;
        const activeProjectsList = projects.filter(p => p.status === 'in-progress');
        for (const p of activeProjectsList) {
          const workers = await projectService.getWorkers(p.id);
          total += workers.length;
        }
        setActiveWorkersCount(total);
      } catch (err) {
        console.error("Failed to fetch active workers", err);
      }
    };
    if (projects.length > 0) fetchActiveWorkers();
  }, [projects]);

  const activeProjects = projects.filter(p => p.status === 'in-progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);

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

  const handleSaveProject = async () => {
    if (!projectFormData.name || !projectFormData.client_name) {
      toast({
        title: 'Gagal',
        description: 'Nama Proyek dan Nama Klien wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: projectFormData.name,
        client_name: projectFormData.client_name,
        type: projectFormData.type,
        area_sqm: projectFormData.area_sqm ? parseFloat(projectFormData.area_sqm) : undefined,
        location: projectFormData.location,
        start_date: projectFormData.start_date || undefined,
        end_date: projectFormData.end_date || undefined,
        budget: projectFormData.budget ? parseFloat(projectFormData.budget) : 0,
        client_phone: projectFormData.client_phone,
        status: projectFormData.status,
      };

      if (editingProject) {
        await updateProject(editingProject.id, payload);
        toast({ title: 'Berhasil', description: 'Proyek berhasil diperbarui' });
      } else {
        await addProject({
          ...payload,
          spent: 0,
          progress: 0,
        });

        addNotification({
          title: 'Proyek Ditambahkan',
          message: `Proyek "${projectFormData.name}" berhasil dibuat`,
          type: 'success',
          time: 'Baru saja',
          module: 'project'
        });

        toast({ title: 'Berhasil', description: 'Proyek berhasil ditambahkan' });
      }

      setShowAddProjectDialog(false);
      setEditingProject(null);
      setProjectFormData({
        name: '',
        client_name: '',
        type: '',
        area_sqm: '',
        location: '',
        start_date: '',
        end_date: '',
        budget: '',
        client_phone: '',
        status: 'planning',
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
  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus proyek "${name}"?`)) return;
    
    try {
      await deleteProject(id);
      toast({ title: 'Berhasil', description: 'Proyek berhasil dihapus' });
      addNotification({
        title: 'Proyek Dihapus',
        message: `Proyek "${name}" telah dihapus`,
        type: 'warning',
        time: 'Baru saja',
        module: 'project'
      });
    } catch (error: any) {
      toast({
        title: 'Gagal Menghapus',
        description: error.message || 'Terjadi kesalahan',
        variant: 'destructive'
      });
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
                <DialogTitle className="font-display">
                  {editingProject ? 'Edit Proyek' : 'Tambah Proyek Baru'}
                </DialogTitle>
                <DialogDescription className="font-body">
                  {editingProject ? 'Perbarui informasi proyek pembangunan' : 'Buat proyek pembangunan rumah baru'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-body">Nama Proyek <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Pembangunan Rumah Tipe 45..."
                    className="font-body"
                    value={projectFormData.name}
                    onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Nama Klien <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Nama pemilik rumah"
                    className="font-body"
                    value={projectFormData.client_name}
                    onChange={(e) => setProjectFormData({ ...projectFormData, client_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tipe Proyek</Label>
                    <Select
                      value={projectFormData.type}
                      onValueChange={(val) => setProjectFormData({ ...projectFormData, type: val })}
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
                      value={projectFormData.area_sqm}
                      onChange={(e) => setProjectFormData({ ...projectFormData, area_sqm: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Lokasi</Label>
                  <Select
                    value={projectFormData.location}
                    onValueChange={(val) => setProjectFormData({ ...projectFormData, location: val })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih lokasi proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc} className="font-body">
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tanggal Mulai</Label>
                    <Input
                      type="date"
                      className="font-body"
                      value={projectFormData.start_date}
                      onChange={(e) => setProjectFormData({ ...projectFormData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Target Selesai</Label>
                    <Input
                      type="date"
                      className="font-body"
                      value={projectFormData.end_date}
                      onChange={(e) => setProjectFormData({ ...projectFormData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Budget (Rp)</Label>
                    <Input
                      type="number"
                      placeholder="450000000"
                      className="font-body"
                      value={projectFormData.budget}
                      onChange={(e) => setProjectFormData({ ...projectFormData, budget: e.target.value })}
                    />
                  </div>
                  {editingProject && (
                    <div className="space-y-2">
                      <Label className="font-body">Status</Label>
                      <Select
                        value={projectFormData.status}
                        onValueChange={(val) => setProjectFormData({ ...projectFormData, status: val })}
                      >
                        <SelectTrigger className="font-body">
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Perencanaan</SelectItem>
                          <SelectItem value="in-progress">Sedang Berjalan</SelectItem>
                          <SelectItem value="completed">Selesai</SelectItem>
                          <SelectItem value="on-hold">Ditunda</SelectItem>
                          <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Kontak Klien</Label>
                  <Input
                    placeholder="081234567890"
                    className="font-body"
                    value={projectFormData.client_phone}
                    onChange={(e) => setProjectFormData({ ...projectFormData, client_phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddProjectDialog(false);
                    setEditingProject(null);
                  }} 
                  className="font-body" 
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  className="bg-[#E76F51] hover:bg-[#E76F51]/90 font-body"
                  onClick={handleSaveProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : (editingProject ? 'Simpan Perubahan' : 'Simpan')}
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
                <TableHead className="font-body">Gaji Tukang</TableHead>
                <TableHead className="font-body">Sisa Budget</TableHead>
                <TableHead className="font-body">Target</TableHead>
                <TableHead className="font-body"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <div className="text-right">
                           <p className="font-mono font-bold text-sm text-[#E76F51]">
                             Rp {((project.spent || 0) / 1000000).toFixed(1)}jt
                           </p>
                           <p className="text-[10px] text-muted-foreground uppercase font-medium">Labor Cost</p>
                         </div>
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-[#E76F51] hover:bg-[#E76F51]/10 rounded-full"
                          title="Kelola Gaji"
                          onClick={() => navigate(`/hrd/payroll-tukang?projectId=${project.id}`)}
                         >
                           <Hammer className="h-4 w-4" />
                         </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div>
                        <p className="font-medium">Rp {((project.budget - (project.spent || 0)) / 1000000).toFixed(1)}jt</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Budget: Rp {(project.budget / 1000000).toFixed(0)}jt</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="font-body"
                            onClick={() => navigate(`/projects/active?projectId=${project.id}`)}
                          >
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="font-body"
                            onClick={() => navigate(`/hrd/payroll-tukang?projectId=${project.id}`)}
                          >
                            Penggajian Tukang
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="font-body"
                            onClick={() => setEditingProject(project)}
                          >
                            Edit Proyek
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-body" onClick={() => setSelectedProjectForLog(project)}>
                            Laporan Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="font-body text-red-600"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                          >
                            Hapus
                          </DropdownMenuItem>
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
function ProjectManageDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const navigate = useNavigate();
  const { project, loading: projectLoading, refetch: refetchProject } = useProject(projectId);
  const { logs, refetch: refetchLogs, loading: logsLoading } = useProjectProgressLogs(projectId);
  const { materials, loading: materialsLoading } = useProjectMaterials(projectId);
  const { workers, loading: workersLoading } = useProjectWorkers(projectId);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  if (projectLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E76F51]" /><p className="mt-4 text-muted-foreground">Memuat detail proyek...</p></div>;
  if (!project) return <div className="p-12 text-center text-red-500">Proyek tidak ditemukan.</div>;

  const handleProgressUpdate = () => {
    refetchProject();
    refetchLogs();
    setIsUpdateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <XCircle className="w-6 h-6 text-muted-foreground" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-[#1C1C1E]">{project.name}</h1>
            <Badge className="bg-blue-500">{project.progress}%</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-body flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {project.location || 'Lokasi tidak ditentukan'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-lg">
          <TabsTrigger value="progress" className="font-body">Progress</TabsTrigger>
          <TabsTrigger value="materials" className="font-body">Material</TabsTrigger>
          <TabsTrigger value="workers" className="font-body">Pekerja</TabsTrigger>
          <TabsTrigger value="payroll" className="font-body">Gaji</TabsTrigger>
          <TabsTrigger value="info" className="font-body">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-6">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between">
               <div>
                <CardTitle className="font-display">Catatan Progress</CardTitle>
                <CardDescription>Riwayat perkembangan fisik di lapangan.</CardDescription>
               </div>
               <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                 <DialogTrigger asChild>
                   <Button size="sm" className="bg-[#E76F51] hover:bg-[#E76F51]/90">
                     <Plus className="w-4 h-4 mr-1" /> Update Progress
                   </Button>
                 </DialogTrigger>
                 <DialogContent>
                   <ProjectProgressLog project={project} open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen} onUpdate={handleProgressUpdate} />
                 </DialogContent>
               </Dialog>
             </CardHeader>
             <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {logs.map((log: any) => (
                      <div key={log.id} className="border-l-2 border-[#E76F51]/30 pl-4 py-2 relative">
                        <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-[#E76F51]" />
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-sm">{log.progress_percentage}% Selesai</p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{log.description}</p>
                      </div>
                    ))}
                    {logs.length === 0 && !logsLoading && <p className="text-center text-muted-foreground py-8">Belum ada log progress.</p>}
                    {logsLoading && <div className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>}
                  </div>
                </ScrollArea>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
           <Card>
             <CardHeader>
               <CardTitle className="font-display">Material Proyek</CardTitle>
               <CardDescription>Daftar material yang dialokasikan untuk proyek ini.</CardDescription>
             </CardHeader>
             <CardContent>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="font-body">Item</TableHead>
                     <TableHead className="font-body">Jumlah</TableHead>
                     <TableHead className="font-body">Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {materials.map((m: any) => (
                     <TableRow key={m.id}>
                       <TableCell className="font-body text-sm">
                         <p className="font-medium">{m.products?.name || 'Unknown Product'}</p>
                         <p className="text-[10px] text-muted-foreground font-mono">{m.products?.sku}</p>
                       </TableCell>
                       <TableCell className="font-display text-sm">
                         {m.quantity} {m.unit || 'unit'}
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline" className="text-[10px] uppercase">
                           {m.status || 'Allocated'}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                   {materials.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Belum ada data material.</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="workers" className="mt-6">
           <Card>
             <CardHeader>
               <CardTitle className="font-display">Daftar Pekerja</CardTitle>
               <CardDescription>Tim lapangan yang bertugas di proyek ini.</CardDescription>
             </CardHeader>
             <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workers.map((w: any) => (
                    <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50/50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{w.employees?.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">{w.role || 'Tenaga Kerja'}</p>
                      </div>
                    </div>
                  ))}
                  {workers.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Belum ada pekerja ditugaskan.</p>}
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between">
               <div>
                <CardTitle className="font-display">Riwayat Penggajian</CardTitle>
                <CardDescription>Catatan pembayaran gaji tukang untuk proyek ini.</CardDescription>
               </div>
               <Button 
                size="sm" 
                variant="outline" 
                className="border-[#E76F51] text-[#E76F51] hover:bg-[#E76F51]/10"
                onClick={() => navigate(`/hrd/payroll-tukang?projectId=${projectId}`)}
               >
                 Kelola Penggajian
               </Button>
             </CardHeader>
             <CardContent>
                <ProjectPayrollSummary projectId={projectId} />
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg font-display">Data Klien</CardTitle></CardHeader>
                <CardContent className="space-y-3 font-body text-sm">
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Nama Klien</span> <span className="font-medium">{project.client_name}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Telepon</span> <span className="font-medium">{project.client_phone || '-'}</span></div>
                  <div className="flex justify-between pt-2"><span className="text-muted-foreground">Jenis Proyek</span> <Badge variant="outline">{project.type}</Badge></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg font-display">Biaya & Waktu</CardTitle></CardHeader>
                <CardContent className="space-y-3 font-body text-sm">
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Budget Kontrak</span> <span className="font-mono font-bold">Rp {project.budget?.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Terpakai (Material+Gaji)</span> <span className="font-mono text-red-600">Rp {project.spent?.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between pt-2"><span className="text-muted-foreground">Target Selesai</span> <span className="font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString('id-ID') : '-'}</span></div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActiveProjectsPage({ 
  selectedProjectId,
  setSelectedProjectId 
}: { 
  selectedProjectId: string,
  setSelectedProjectId: (id: string) => void 
}) {
  const { projects, loading } = useProjects();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const idFromUrl = searchParams.get('projectId');
    if (idFromUrl && !selectedProjectId) {
      setSelectedProjectId(idFromUrl);
    }
  }, [searchParams, selectedProjectId, setSelectedProjectId]);

  const activeProjects = projects.filter(p => p.status === 'in-progress');

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E76F51]" /></div>;

  if (selectedProjectId) {
    return <ProjectManageDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId('')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1C1C1E]">Proyek Aktif</h1>
          <p className="text-muted-foreground font-body">Pilih proyek untuk mengelola tim dan aktifitas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {activeProjects.map((p) => (
          <Card 
            key={p.id} 
            className="hover:shadow-md transition-all border-gray-100 group cursor-pointer hover:border-[#E76F51]/30"
            onClick={() => {
              setSelectedProjectId(p.id);
              // navigate('/projects/reports'); // Removed as per instruction
            }}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center relative min-h-[120px]">
              <div className="w-10 h-10 bg-[#E76F51]/10 rounded-full flex items-center justify-center mb-2">
                <Hammer className="w-5 h-5 text-[#E76F51]" />
              </div>
              <span className="font-bold text-[#1C1C1E] font-display text-center break-words w-full px-2">
                {p.location || p.name}
              </span>
              <Badge variant="secondary" className="mt-2 text-[10px] bg-blue-50 text-blue-600 border-blue-100 uppercase font-mono">
                {p.progress}% SELESAI
              </Badge>
            </CardContent>
          </Card>
        ))}
        {activeProjects.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
             <Hammer className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <p className="text-slate-500 font-body">Belum ada proyek aktif.</p>
          </div>
        )}
      </div>
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

// Utility to get consistent project label
const getProjectLabel = (p: any) => {
  if (p.location && p.location.trim() !== '') {
    return `${p.location} (${p.name})`;
  }
  return p.name;
};

// --- Sub-components for Project Details ---

function ProjectPayrollSummary({ projectId }: { projectId: string }) {
  const { payments, loading: paymentsLoading } = useProjectWorkerPayments(projectId);
  const { workers } = useProjectWorkers(projectId);
  const { employees } = useEmployees();
  const navigate = useNavigate();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  if (paymentsLoading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      {payments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-100 font-body text-sm text-slate-500">
          Belum ada riwayat penggajian untuk proyek ini.
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const worker = workers.find(w => w.id === p.worker_id);
            const emp = employees.find(e => e.id === worker?.employee_id);
            return (
              <div key={p.id} className="p-3 border rounded-xl bg-slate-50/50 hover:bg-white transition-colors group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{emp?.name || 'Tukang'}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                      {new Date(p.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-[#E76F51]">{formatCurrency(p.amount)}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{p.working_days} Hari Kerja</p>
                  </div>
                </div>
                {p.activity_detail && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50">
                    <p className="text-xs text-slate-600 line-clamp-2 italic" title={p.activity_detail}>
                      "{p.activity_detail}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProjectModule() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const savedPath = localStorage.getItem('lastPath_projects');
  console.log('🔍 ProjectModule: savedPath from localStorage (lastPath_projects):', savedPath);

  return (
    <ProjectNotificationProvider>
      <ModuleLayout moduleId="project" title="Proyek" navItems={navItems}>
        <Routes>
          <Route index element={
            savedPath && savedPath !== '/projects' && savedPath.startsWith('/projects') ? (
              <Navigate to={savedPath} replace />
            ) : (
              <ProjectDashboard />
            )
          } />
          <Route path="active" element={<ActiveProjectsPage selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="locations" element={<div className="p-8"><ProjectLocationManagement /></div>} />
          <Route path="reports" element={<ReportsPage />} />
        </Routes>
      </ModuleLayout>
    </ProjectNotificationProvider>
  );
}
