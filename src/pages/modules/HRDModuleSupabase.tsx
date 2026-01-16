import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ModuleLayout from '@/components/layout/ModuleLayout';
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Building,
  Bell,
  Award,
  Star,
  Gift,
  Download,
  Send,
  Printer,
  X,
  Plus,
  Wallet,
  CreditCard,
  Timer,
  LogIn,
  LogOut,
  MapPin,
  Loader2,
  Briefcase
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MigrationDialog } from '@/components/MigrationDialog';
import { LeaveManagement } from '@/components/hrd/LeaveManagement';
import { AttendanceManagement } from '@/components/hrd/AttendanceManagement';
import { PayrollManagement } from '@/components/hrd/PayrollManagement';
import { LoanManagement } from '@/components/hrd/LoanManagement';
import { RewardManagement } from '@/components/hrd/RewardManagement';
import PositionsPage from '@/pages/hrd/PositionsPage';
import SettingsPage from '@/pages/hrd/SettingsPage'; // Import Settings Page
import { Settings as SettingsIcon } from 'lucide-react'; // Rename to avoid conflict if Settings is already imported

// Supabase Hooks
import { useEmployees, useDepartments, useNotifications, useLeaveRequests, useAttendance, usePayroll, useRewards, useLoans, usePositions } from '@/hooks/useSupabase';
// Duplicate removed
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/lib/supabase';
import { DataMigration } from '@/utils/migration';

// Navigation items


// Notification Context (using Supabase)
interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  addNotification: (notification: any) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotificationsContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within NotificationProvider');
  }
  return context;
}

function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    notifications,
    unreadCount,
    addNotification: addSupabaseNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const addNotification = async (notification: any) => {
    try {
      await addSupabaseNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        module: notification.module,
        user_id: null, // System notification
        read: false
      });
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  const clearNotification = async (id: string) => {
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Notification Bell Component
function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotificationsContext();
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
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-hrd font-body text-xs">
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
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-hrd/5 border-hrd/20'
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
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {new Date(notification.created_at).toLocaleString('id-ID')}
                      </p>
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate employee duration from join_date to now
function calculateEmployeeDuration(joinDate: string): string {
  const join = new Date(joinDate);
  const now = new Date();

  // Calculate total difference in milliseconds
  const diffMs = now.getTime() - join.getTime();

  if (diffMs < 0) {
    return '0 tahun 0 bulan 0 hari 0 jam 0 menit 0 detik';
  }

  // Calculate years (more accurate by checking actual year difference)
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  let days = now.getDate() - join.getDate();
  let hours = now.getHours() - join.getHours();
  let minutes = now.getMinutes() - join.getMinutes();
  let seconds = now.getSeconds() - join.getSeconds();

  // Adjust for negative values
  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    // Get days in previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  // Ensure non-negative values
  years = Math.max(0, years);
  months = Math.max(0, months);
  days = Math.max(0, days);
  hours = Math.max(0, hours);
  minutes = Math.max(0, minutes);
  seconds = Math.max(0, seconds);

  // Format duration string
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} tahun`);
  if (months > 0) parts.push(`${months} bulan`);
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  if (seconds > 0) parts.push(`${seconds} detik`);

  return parts.length > 0 ? parts.join(' ') : '0 detik';
}

// Component for real-time employee duration display
function EmployeeDuration({ joinDate }: { joinDate: string }) {
  const [duration, setDuration] = useState(calculateEmployeeDuration(joinDate));

  useEffect(() => {
    // Update duration every second for real-time display
    const interval = setInterval(() => {
      setDuration(calculateEmployeeDuration(joinDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [joinDate]);

  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground font-mono text-xs">
        {duration}
      </span>
    </div>
  );
}

// usePresence removed, using global auth

// Employee List Component with Supabase
function EmployeeListSupabase() {
  const { addNotification } = useNotificationsContext();
  const { employees, loading, error, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { positions } = usePositions();
  const { departments } = useDepartments();
  const { attendance: todayAttendance } = useAttendance(); // Fetch today's attendance
  const { toast } = useToast();
  // Track online users from Global Auth (Stable)
  const { user, onlineUsers } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showAddDialog, setShowAddDialog] = useState(false);

  // Check if we should open add dialog from query parameter
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddDialog(true);
      // Remove query parameter after opening dialog
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for add/edit
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    salary: '',
    join_date: '',
    bank_account: '',
    bank: '',
    phone: '',
    email: '',
    address: ''
  });

  const filteredEmployees = employees.filter(emp => {
    // Staff filtering: only see own data
    if (user?.role === 'staff') {
      if (user.employee_id) return emp.id === user.employee_id;
      return emp.email === user.email;
    }

    // Admin/Manager: Hide terminated/inactive by default unless searching specifically? 
    // Actually, simple is better: hide them if they are not active/on-leave.
    return emp.status === 'active' || emp.status === 'on-leave';
  }).filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      department: '',
      salary: '',
      join_date: '',
      bank_account: '',
      bank: '',
      phone: '',
      email: '',
      address: ''
    });
  };

  // Handle position change to auto-fill department and salary
  const handlePositionChange = (title: string) => {
    // Basic normalization for matching
    const searchTitle = title.trim();
    const selectedPos = positions.find(p => p.title.trim() === searchTitle);

    setFormData(prev => {
      const newData = { ...prev, position: title };

      if (selectedPos) {
        // @ts-ignore
        const rawValues = selectedPos.department || selectedPos.Department || selectedPos.dept || selectedPos.bagian || '';

        let targetDeptId = '';

        // Check if raw value is valid
        if (rawValues) {
          // CASE 1: Value is already a UUID (long string) -> Use directly
          if (rawValues.length > 20) { // Heuristic: UUIDs are typically longer than common department names
            targetDeptId = rawValues;
          }
          // CASE 2: Value is a NAME (e.g. "HRD") -> Find UUID from departments list
          else {
            const foundDept = departments.find(d => d.name.toLowerCase() === rawValues.toLowerCase());
            if (foundDept) {
              targetDeptId = foundDept.id;
            }
          }
        }

        newData.department = targetDeptId;
        newData.salary = selectedPos.gaji_pokok ? selectedPos.gaji_pokok.toString() : '';

        // Feedback to user
        const deptName = departments.find(d => d.id === targetDeptId)?.name || '(Pilih Manual)';

        toast({
          title: "Posisi Dipilih: " + selectedPos.title,
          description: `Dept: ${deptName}, Gaji: ${newData.salary || '(Kosong)'}`,
        });
      }
      return newData;
    });
  };

  // Handle add employee
  const handleAddEmployee = async () => {
    try {
      if (!formData.name || !formData.position || !formData.department || !formData.salary || !formData.join_date) {
        addNotification({
          title: 'Form Tidak Lengkap',
          message: 'Mohon lengkapi semua field yang wajib diisi',
          type: 'warning',
          module: 'employee'
        });
        return;
      }

      const salaryNum = parseInt(formData.salary);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        addNotification({
          title: 'Gaji Tidak Valid',
          message: 'Mohon masukkan gaji yang valid (angka positif)',
          type: 'warning',
          module: 'employee'
        });
        return;
      }

      const newEmployee = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        // For display purposes or legacy, we might keep department (name), 
        // BUT better to lookup the name if needed. 
        // Supabase trigger might handle name but simpler to just store what we have.
        department: departments.find(d => d.id === formData.department)?.name || '',
        department_id: formData.department, // Ensure UUID is sent for FK
        status: 'active' as const,
        join_date: formData.join_date,
        salary: salaryNum,
        bank_account: formData.bank_account || null,
        bank: formData.bank || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        sales_target: 0,
        sales_achieved: 0,
        attendance_score: 100,
        innovation_projects: 0,
        team_leadership: false,
        customer_rating: null,
      };

      await addEmployee(newEmployee);

      addNotification({
        title: 'Karyawan Ditambahkan',
        message: `Karyawan ${formData.name} berhasil ditambahkan ke sistem`,
        type: 'success',
        module: 'employee'
      });

      toast({
        title: "Berhasil Menambahkan Karyawan",
        description: `Data karyawan ${formData.name} telah disimpan.`,
      });

      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      addNotification({
        title: 'Gagal Menambah Karyawan',
        message: `Error: ${error}`,
        type: 'error',
        module: 'employee'
      });

      toast({
        variant: "destructive",
        title: "Gagal Menambahkan Karyawan",
        description: `Terjadi kesalahan: ${error}`,
      });
    }
  };

  // Handle edit employee
  const handleEditEmployee = async () => {
    try {
      if (!formData.name || !formData.position || !formData.department || !formData.salary || !formData.join_date) {
        addNotification({
          title: 'Form Tidak Lengkap',
          message: 'Mohon lengkapi semua field yang wajib diisi',
          type: 'warning',
          module: 'employee'
        });
        return;
      }

      const salaryNum = parseInt(formData.salary);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        addNotification({
          title: 'Gaji Tidak Valid',
          message: 'Mohon masukkan gaji yang valid (angka positif)',
          type: 'warning',
          module: 'employee'
        });
        return;
      }

      const updates = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        salary: salaryNum,
        join_date: formData.join_date,
        bank_account: formData.bank_account || null,
        bank: formData.bank || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        department_id: null
      };

      await updateEmployee(selectedEmployee.id, updates);

      addNotification({
        title: 'Data Karyawan Diperbarui',
        message: `Data karyawan ${formData.name} berhasil diperbarui`,
        type: 'success',
        module: 'employee'
      });

      toast({
        title: "Berhasil Memperbarui Data",
        description: `Perubahan data karyawan ${formData.name} telah disimpan.`,
      });

      setShowEditDialog(false);
      setSelectedEmployee(null);
      resetForm();
    } catch (error) {
      addNotification({
        title: 'Gagal Memperbarui Karyawan',
        message: `Error: ${error}`,
        type: 'error',
        module: 'employee'
      });

      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Data",
        description: `Terjadi kesalahan: ${error}`,
      });
    }
  };

  // Handle view employee
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowViewDialog(true);
  };

  // Handle edit button click
  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      position: employee.position,
      department: employee.department || '',
      salary: employee.salary.toString(),
      join_date: employee.join_date,
      bank_account: employee.bank_account || '',
      bank: employee.bank || '',
      phone: employee.phone || '',
      email: employee.email || '',
      address: employee.address || ''
    });
    setShowEditDialog(true);
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    try {
      if (selectedEmployee) {
        await deleteEmployee(selectedEmployee.id);

        addNotification({
          title: 'Karyawan Dihapus',
          message: `Data karyawan ${selectedEmployee.name} telah dihapus dari sistem`,
          type: 'success',
          module: 'employee'
        });

        toast({
          title: "Karyawan Dihapus",
          description: `Data karyawan ${selectedEmployee.name} telah dihapus.`,
        });

        setShowDeleteDialog(false);
        setSelectedEmployee(null);
      }
    } catch (error) {
      addNotification({
        title: 'Gagal Menghapus Karyawan',
        message: `Error: ${error}`,
        type: 'error',
        module: 'employee'
      });

      toast({
        variant: "destructive",
        title: "Gagal Menghapus Data",
        description: `Tidak dapat menghapus karyawan: ${error}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-hrd" />
          <p className="text-muted-foreground font-body">Memuat data karyawan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error memuat data: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Daftar Karyawan</h1>
          <p className="text-muted-foreground font-body">Kelola data karyawan perusahaan</p>
        </div>

        {/* DEBUG PANEL - FOR DIAGNOSIS */}
        {/* DEBUG PANEL - FOR DIAGNOSIS */}


        {user?.role !== 'staff' && (
          <Button
            className="bg-hrd hover:bg-hrd-dark font-body"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4" >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari karyawan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
        <Button variant="outline" className="font-body">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div >

      {/* Employee Table */}
      < Card className="border-gray-200" >
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Karyawan</TableHead>
                <TableHead className="font-body">Posisi</TableHead>
                <TableHead className="font-body">Departemen</TableHead>
                <TableHead className="font-body">Status</TableHead>
                <TableHead className="font-body">Tanggal Bergabung</TableHead>
                <TableHead className="font-body">Durasi Kerja</TableHead>
                {user?.role !== 'staff' && (
                  <TableHead className="font-body text-right">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium font-body">{employee.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{employee.id}</span>
                        {/* Attendance Indicator */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {(() => {
                            const isConnected = onlineUsers.some(u => u.employee_id === employee.id);
                            const attendanceRec = todayAttendance?.find(a => a.employee_id === employee.id);
                            const isWorking = attendanceRec?.check_in && !attendanceRec.check_out;
                            const hasCheckedOut = attendanceRec?.check_out;

                            // Determine status Label
                            let statusLabel = 'Offline';
                            let statusColor = 'text-muted-foreground';
                            let dotColor = 'bg-red-400';

                            if (isConnected) {
                              statusLabel = 'Online';
                              statusColor = 'text-green-600 font-medium';
                              dotColor = 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]';

                              if (isWorking) statusLabel = 'Online (Bekerja)';
                              else if (hasCheckedOut) statusLabel = 'Online (Standby)';
                            } else {
                              if (hasCheckedOut) statusLabel = 'Offline (Pulang)';
                            }

                            return (
                              <>
                                <div
                                  className={`w-2 h-2 rounded-full ${dotColor}`}
                                  title={isConnected ? "Terhubung ke Aplikasi" : "Tidak Terhubung"}
                                />
                                <span className={`text-[10px] ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-body">{employee.position}</TableCell>
                  <TableCell className="font-body">
                    {employee.department || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.status === 'active' ? 'default' : 'secondary'}
                      className="font-body"
                    >
                      {employee.status === 'active' ? 'Aktif' :
                        employee.status === 'on-leave' ? 'Cuti' :
                          employee.status === 'inactive' ? 'Tidak Aktif' : 'Terminated'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{employee.join_date}</TableCell>
                  <TableCell className="font-body text-sm">
                    <EmployeeDuration joinDate={employee.join_date} />
                  </TableCell>
                  {user?.role !== 'staff' && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="font-body"
                            onClick={() => handleViewEmployee(employee)}
                          >
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="font-body"
                            onClick={() => handleEditClick(employee)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="font-body text-destructive"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setShowDeleteDialog(true);
                            }}
                          >
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card >

      {/* Add Employee Dialog */}
      < Dialog open={showAddDialog} onOpenChange={setShowAddDialog} >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Karyawan Baru</DialogTitle>
            <DialogDescription className="font-body">
              Masukkan data karyawan baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Nama karyawan"
                className="font-body"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Posisi <span className="text-red-500">*</span></Label>
              <Select
                value={formData.position}
                onValueChange={handlePositionChange}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih posisi" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.title} className="font-body">
                      {pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Departemen <span className="text-red-500">*</span></Label>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id} className="font-body">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
            <div className="space-y-2">
              <Label className="font-body">Gaji Pokok <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="15000000"
                className="font-mono"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Tanggal Bergabung <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                className="font-mono"
                value={formData.join_date}
                onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Email</Label>
              <Input
                type="email"
                placeholder="email@company.com"
                className="font-body"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Nomor Telepon</Label>
              <Input
                placeholder="08123456789"
                className="font-mono"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Nomor Rekening</Label>
              <Input
                placeholder="1234567890"
                className="font-mono"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Bank</Label>
              <Select value={formData.bank} onValueChange={(value) => setFormData({ ...formData, bank: value })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BCA" className="font-body">BCA</SelectItem>
                  <SelectItem value="Mandiri" className="font-body">Mandiri</SelectItem>
                  <SelectItem value="BNI" className="font-body">BNI</SelectItem>
                  <SelectItem value="BRI" className="font-body">BRI</SelectItem>
                  <SelectItem value="CIMB" className="font-body">CIMB Niaga</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddEmployee} className="bg-hrd hover:bg-hrd-dark font-body">
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Edit Employee Dialog */}
      < Dialog open={showEditDialog} onOpenChange={setShowEditDialog} >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Karyawan</DialogTitle>
            <DialogDescription className="font-body">
              Perbarui data karyawan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Nama karyawan"
                className="font-body"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Posisi <span className="text-red-500">*</span></Label>
              <Select
                value={formData.position}
                onValueChange={handlePositionChange}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih posisi" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.title} className="font-body">
                      {pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Departemen</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="font-body"
                placeholder="Departemen (Terisi otomatis dari Posisi)"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Gaji Pokok <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="15000000"
                className="font-mono"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Tanggal Bergabung <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                className="font-mono"
                value={formData.join_date}
                onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Email</Label>
              <Input
                type="email"
                placeholder="email@company.com"
                className="font-body"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Nomor Telepon</Label>
              <Input
                placeholder="08123456789"
                className="font-mono"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Nomor Rekening</Label>
              <Input
                placeholder="1234567890"
                className="font-mono"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Bank</Label>
              <Select value={formData.bank} onValueChange={(value) => setFormData({ ...formData, bank: value })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BCA" className="font-body">BCA</SelectItem>
                  <SelectItem value="Mandiri" className="font-body">Mandiri</SelectItem>
                  <SelectItem value="BNI" className="font-body">BNI</SelectItem>
                  <SelectItem value="BRI" className="font-body">BRI</SelectItem>
                  <SelectItem value="CIMB" className="font-body">CIMB Niaga</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleEditEmployee} className="bg-hrd hover:bg-hrd-dark font-body">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* View Employee Dialog */}
      < Dialog open={showViewDialog} onOpenChange={setShowViewDialog} >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Karyawan</DialogTitle>
            <DialogDescription className="font-body">
              Informasi lengkap karyawan
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-hrd/20 text-hrd font-body text-lg">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#1C1C1E]">{selectedEmployee.name}</h3>
                  <p className="text-muted-foreground font-body">{selectedEmployee.position}</p>
                  <Badge
                    variant={selectedEmployee.status === 'active' ? 'default' : 'secondary'}
                    className="font-body mt-1"
                  >
                    {selectedEmployee.status === 'active' ? 'Aktif' :
                      selectedEmployee.status === 'on-leave' ? 'Cuti' :
                        selectedEmployee.status === 'inactive' ? 'Tidak Aktif' : 'Terminated'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Departemen</Label>
                  <p className="font-body font-medium">
                    {departments.find(d => d.id === selectedEmployee.department_id)?.name || 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Tanggal Bergabung</Label>
                  <p className="font-mono font-medium">{selectedEmployee.join_date}</p>
                </div>
                {user?.role !== 'staff' && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Gaji Pokok</Label>
                    <p className="font-mono font-medium">{formatCurrency(selectedEmployee.salary)}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Skor Kehadiran</Label>
                  <p className="font-mono font-medium">{selectedEmployee.attendance_score}%</p>
                </div>
                {selectedEmployee.email && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Email</Label>
                    <p className="font-body font-medium">{selectedEmployee.email}</p>
                  </div>
                )}
                {selectedEmployee.phone && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Telepon</Label>
                    <p className="font-mono font-medium">{selectedEmployee.phone}</p>
                  </div>
                )}
                {user?.role !== 'staff' && selectedEmployee.bank_account && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Rekening Bank</Label>
                    <p className="font-mono font-medium">{selectedEmployee.bank_account}</p>
                  </div>
                )}
                {user?.role !== 'staff' && selectedEmployee.bank && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Bank</Label>
                    <p className="font-body font-medium">{selectedEmployee.bank}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
              Tutup
            </Button>
            {user?.role !== 'staff' && (
              <Button
                onClick={() => {
                  setShowViewDialog(false);
                  if (selectedEmployee) handleEditClick(selectedEmployee);
                }}
                className="bg-hrd hover:bg-hrd-dark font-body"
              >
                Edit Data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Delete Confirmation Dialog */}
      < Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Konfirmasi Hapus Karyawan</DialogTitle>
            <DialogDescription className="font-body">
              Apakah Anda yakin ingin menghapus data karyawan ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-red-100 text-red-600 font-body">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium font-body text-red-900">{selectedEmployee.name}</p>
                  <p className="text-sm text-red-700 font-body">
                    {selectedEmployee.position} - {departments.find(d => d.id === selectedEmployee.department_id)?.name}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="font-body">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              className="font-body"
            >
              <X className="w-4 h-4 mr-2" />
              Hapus Karyawan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </div >
  );
}

// Dashboard Component
function HRDDashboard() {
  const { employees } = useEmployees();
  const { leaveRequests } = useLeaveRequests();
  const today = new Date().toISOString().split('T')[0];
  const { attendance } = useAttendance(today, today);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const { payroll } = usePayroll(currentMonth, currentYear);
  const { rewards } = useRewards();
  const { addNotification } = useNotificationsContext();
  const navigate = useNavigate();

  // Calculate statistics from all submodules
  const employeeStats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    onLeave: employees.filter(e => e.status === 'on-leave').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    terminated: employees.filter(e => e.status === 'terminated').length,
  };

  const leaveStats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(l => l.status === 'pending').length,
    approved: leaveRequests.filter(l => l.status === 'approved').length,
    rejected: leaveRequests.filter(l => l.status === 'rejected').length,
  };

  const attendanceStats = {
    presentToday: attendance.filter(a => a.status === 'present').length,
    lateToday: attendance.filter(a => a.status === 'late').length,
    absentToday: attendance.filter(a => a.status === 'absent').length,
    attendanceRate: employees.length > 0
      ? Math.round((attendance.filter(a => ['present', 'late'].includes(a.status)).length / employees.length) * 100)
      : 0,
  };

  const payrollStats = {
    total: payroll.length,
    paid: payroll.filter(p => p.status === 'paid').length,
    pending: payroll.filter(p => p.status === 'pending').length,
    cancelled: payroll.filter(p => p.status === 'cancelled').length,
  };

  const rewardStats = {
    total: rewards.length,
    thisMonth: rewards.filter(r => {
      const rewardDate = new Date(r.created_at);
      return rewardDate.getMonth() + 1 === currentMonth && rewardDate.getFullYear() === currentYear;
    }).length,
  };

  // All status cards from all submodules
  const allStats = [
    // Employee Module
    {
      label: 'Total Karyawan',
      value: employeeStats.total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      module: 'Karyawan',
      onClick: () => navigate('/hrd/employees')
    },
    {
      label: 'Karyawan Aktif',
      value: employeeStats.active,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      module: 'Karyawan',
      onClick: () => navigate('/hrd/employees')
    },
    {
      label: 'Karyawan Cuti',
      value: employeeStats.onLeave,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      module: 'Karyawan',
      onClick: () => navigate('/hrd/employees')
    },
    {
      label: 'Karyawan Nonaktif',
      value: employeeStats.inactive,
      icon: XCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      module: 'Karyawan',
      onClick: () => navigate('/hrd/employees')
    },
    // Leave Module
    {
      label: 'Total Pengajuan Cuti',
      value: leaveStats.total,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      module: 'Cuti & Izin',
      onClick: () => navigate('/hrd/leave')
    },
    {
      label: 'Cuti Menunggu',
      value: leaveStats.pending,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      module: 'Cuti & Izin',
      onClick: () => navigate('/hrd/leave')
    },
    {
      label: 'Cuti Disetujui',
      value: leaveStats.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      module: 'Cuti & Izin',
      onClick: () => navigate('/hrd/leave')
    },
    {
      label: 'Cuti Ditolak',
      value: leaveStats.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      module: 'Cuti & Izin',
      onClick: () => navigate('/hrd/leave')
    },
    // Attendance Module
    {
      label: 'Hadir Hari Ini',
      value: attendanceStats.presentToday,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      module: 'Absensi',
      onClick: () => navigate('/hrd/attendance')
    },
    {
      label: 'Terlambat Hari Ini',
      value: attendanceStats.lateToday,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      module: 'Absensi',
      onClick: () => navigate('/hrd/attendance')
    },
    {
      label: 'Tidak Hadir Hari Ini',
      value: attendanceStats.absentToday,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      module: 'Absensi',
      onClick: () => navigate('/hrd/attendance')
    },
    {
      label: 'Tingkat Kehadiran',
      value: `${attendanceStats.attendanceRate}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      module: 'Absensi',
      onClick: () => navigate('/hrd/attendance')
    },
    // Payroll Module
    {
      label: 'Total Penggajian',
      value: payrollStats.total,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      module: 'Penggajian',
      onClick: () => navigate('/hrd/payroll')
    },
    {
      label: 'Gaji Dibayar',
      value: payrollStats.paid,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      module: 'Penggajian',
      onClick: () => navigate('/hrd/payroll')
    },
    {
      label: 'Gaji Pending',
      value: payrollStats.pending,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      module: 'Penggajian',
      onClick: () => navigate('/hrd/payroll')
    },
    {
      label: 'Gaji Dibatalkan',
      value: payrollStats.cancelled,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      module: 'Penggajian',
      onClick: () => navigate('/hrd/payroll')
    },
    // Reward Module
    {
      label: 'Total Reward',
      value: rewardStats.total,
      icon: Award,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      module: 'Reward',
      onClick: () => navigate('/hrd/rewards')
    },
    {
      label: 'Reward Bulan Ini',
      value: rewardStats.thisMonth,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      module: 'Reward',
      onClick: () => navigate('/hrd/rewards')
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Dashboard HRD</h1>
          <p className="text-muted-foreground font-body">Kelola sumber daya manusia perusahaan</p>
        </div>
        <NotificationBell />
      </div>

      {/* Stats Grid - All Submodules Status */}
      <div className="space-y-6">
        {/* Group by Module */}
        {['Karyawan', 'Cuti & Izin', 'Absensi', 'Penggajian', 'Reward']
          .filter(moduleName => {
            const { user } = useAuth();
            if (user?.role === 'staff' && moduleName === 'Reward') return false;
            return true;
          })
          .map((moduleName) => {
            const moduleStats = allStats.filter(stat => stat.module === moduleName);
            if (moduleStats.length === 0) return null;

            return (
              <div key={moduleName} className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-[#1C1C1E]">{moduleName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {moduleStats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="border-gray-200 cursor-pointer hover:shadow-md transition-all hover:border-hrd"
                        onClick={stat.onClick}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                              <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {stat.module}
                            </Badge>
                          </div>
                          <div className="mt-4">
                            <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stat.value}</p>
                            <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="font-display">Quick Actions</CardTitle>
          <CardDescription className="font-body">
            Aksi cepat untuk operasi umum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 font-body hover:bg-hrd/5 hover:border-hrd transition-colors"
              onClick={() => navigate('/hrd/employees?add=true')}
            >
              <UserPlus className="w-6 h-6 text-hrd" />
              Tambah Karyawan
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 font-body hover:bg-hrd/5 hover:border-hrd transition-colors"
              onClick={() => navigate('/hrd/leave')}
            >
              <Calendar className="w-6 h-6 text-hrd" />
              Ajukan Cuti
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 font-body hover:bg-hrd/5 hover:border-hrd transition-colors"
              onClick={() => navigate('/hrd/attendance')}
            >
              <Clock className="w-6 h-6 text-hrd" />
              Lihat Absensi
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 font-body hover:bg-hrd/5 hover:border-hrd transition-colors"
              onClick={() => navigate('/hrd/payroll')}
            >
              <DollarSign className="w-6 h-6 text-hrd" />
              Proses Gaji
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 bg-hrd/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-hrd" />
        </div>
        <h2 className="font-display text-xl font-bold text-[#1C1C1E] mb-2">{title}</h2>
        <p className="text-muted-foreground font-body">Halaman ini sedang dalam pengembangan</p>
      </div>
    </div>
  );
}

export default function HRDModuleSupabase() {
  const { user } = useAuth();
  const { checkAccess, loading: loadingPermissions } = usePermissions();
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Generate navigation items based on dynamic permissions
  const filteredNavItems = [
    ...(checkAccess('Dashboard') !== 'none' ? [{ label: 'Dashboard', href: '/hrd', icon: Users }] : []),
    ...(checkAccess('Karyawan') !== 'none' ? [{ label: 'Karyawan', href: '/hrd/employees', icon: Users }] : []),
    ...(checkAccess('Posisi Jabatan') !== 'none' ? [{ label: 'Posisi Jabatan', href: '/hrd/positions', icon: Briefcase }] : []),
    ...(checkAccess('Rekrutmen') !== 'none' ? [{ label: 'Rekrutmen', href: '/hrd/recruitment', icon: UserPlus }] : []),
    ...(checkAccess('Cuti & Izin') !== 'none' ? [{ label: 'Cuti & Izin', href: '/hrd/leave', icon: Calendar }] : []),
    ...(checkAccess('Absensi') !== 'none' ? [{ label: 'Absensi', href: '/hrd/attendance', icon: Clock }] : []),
    ...(checkAccess('Penggajian') !== 'none' ? [{ label: 'Penggajian', href: '/hrd/payroll', icon: DollarSign }] : []),
    ...(checkAccess('Kasbon') !== 'none' ? [{ label: 'Kasbon', href: '/hrd/loans', icon: Wallet }] : []),
    ...(checkAccess('Reward') !== 'none' ? [{ label: 'Reward', href: '/hrd/rewards', icon: Award }] : []),
    ...(checkAccess('Pengaturan') !== 'none' ? [{ label: 'Pengaturan', href: '/hrd/settings', icon: SettingsIcon }] : [])
  ];

  // Check Supabase configuration and migration on component mount
  useEffect(() => {
    const checkSupabaseAndMigration = async () => {
      try {
        // Check if Supabase is configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey ||
          supabaseUrl.includes('your_supabase') ||
          supabaseKey.includes('your_supabase')) {
          setSupabaseError('Supabase belum dikonfigurasi. Silakan konfigurasi terlebih dahulu.');
          return;
        }

        // Test basic connection
        const { error } = await supabase.from('departments').select('count').limit(1);
        if (error) {
          setSupabaseError(`Koneksi Supabase gagal: ${error.message}`);
          return;
        }

        // Check if migration is needed
        const migrationNeeded = await DataMigration.checkMigrationNeeded();
        if (migrationNeeded) {
          setShowMigrationDialog(true);
        }
      } catch (error) {
        console.error('Failed to check Supabase configuration:', error);
        setSupabaseError(`Error: ${error}`);
      }
    };

    checkSupabaseAndMigration();
  }, []);

  // Show error page if Supabase is not configured
  if (supabaseError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <CardTitle className="text-red-700">Konfigurasi Database</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{supabaseError}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Untuk menggunakan modul HRD dengan Supabase, Anda perlu:
              </p>
              <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                <li>Konfigurasi file .env dengan credentials Supabase</li>
                <li>Jalankan schema SQL di Supabase</li>
                <li>Test koneksi database</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => window.open('/supabase-test', '_blank')}
                className="flex-1"
              >
                <Building className="w-4 h-4 mr-2" />
                Test Koneksi
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/mcp-supabase', '_blank')}
                className="flex-1"
              >
                <Building className="w-4 h-4 mr-2" />
                MCP Integration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <ModuleLayout moduleId="hrd" title="HRD" navItems={filteredNavItems}>
        <Routes>
          <Route index element={
            ['staff', 'marketing'].includes(user?.role || '')
              ? <Navigate to="/hrd/employees" replace />
              : <HRDDashboard />
          } />
          <Route path="employees" element={<EmployeeListSupabase />} />
          <Route
            path="positions"
            element={['staff', 'marketing'].includes(user?.role || '') ? <Navigate to="/hrd" replace /> : <PositionsPage />}
          />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="recruitment" element={['staff', 'marketing'].includes(user?.role || '') ? <Navigate to="/hrd" replace /> : <PlaceholderPage title="Rekrutmen" />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="payroll" element={<PayrollManagement />} />
          <Route path="loans" element={<LoanManagement />} />
          <Route path="rewards" element={<RewardManagement />} />
          <Route path="settings" element={user?.role === 'admin' ? <SettingsPage /> : <Navigate to="/hrd" replace />} />
        </Routes>
      </ModuleLayout>

      {/* Migration Dialog */}
      <MigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
      />
    </NotificationProvider>
  );
}
