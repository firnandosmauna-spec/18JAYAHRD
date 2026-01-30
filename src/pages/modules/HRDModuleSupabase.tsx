import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ModuleLayout from '@/components/layout/ModuleLayout';
import {
  Users,
  User,
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
import { NotificationProvider, useNotificationsContext } from '@/contexts/NotificationContext';

// Supabase Hooks
import {
  useEmployees,
  useDepartments,
  useNotifications,
  useLeaveRequests,
  useAttendance,
  usePayroll,
  useRewards,
  useLoans,
  usePositions,
  useContracts,
  useJobHistory,
  useLeaveQuota
} from '@/hooks/useSupabase';
import { usePermissions } from '@/hooks/usePermissions';
import { ESSPortal } from '@/components/hrd/ESSPortal';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/lib/supabase';
import { DataMigration } from '@/utils/migration';
import { userService, type AppUser } from '@/services/userService';

// Navigation items


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

  // Fetch users for linking status
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await userService.getAllUsers();
        if (data && Array.isArray(data)) {
          setUsers(data as AppUser[]);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("Failed to load users for linking:", err);
      }
    };
    loadUsers();
  }, []);

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

  // Derive filters from positions
  // RESTRICTED LEVELS: As per request, only these 3 are allowed for new selection.
  const uniqueLevels = ['Administrator', 'Staf', 'Manager'];

  // Create a combined list of departments from both the Departments table and distinct names in Positions
  const derivedDepartments = [...departments];
  const distinctPositionDepts = Array.from(new Set(positions.map(p => p.department))).filter(Boolean);

  distinctPositionDepts.forEach(posDeptName => {
    // Check if this name already exists in departments array (case-insensitive)
    const exists = derivedDepartments.some(d => d.name.trim().toLowerCase() === posDeptName.trim().toLowerCase());
    if (!exists) {
      // Add as a pseudo-department
      // We use the name itself as the ID for purely local selection handling if needed, 
      // but better to keep it clean.
      derivedDepartments.push({
        id: `temp-${posDeptName}`, // Temporary ID
        name: posDeptName,
        created_at: '',
        updated_at: ''
      });
    }
  });

  // Filter departments based on selected Level (formData.position)
  // MODIFIED: We now showing ALL departments always.
  // This allows users to select ANY Department for a given Level (e.g. Staf),
  // even if that specific combination doesn't exist in the 'positions' table yet.
  const filteredDepartments = derivedDepartments;

  // Auto-fill Salary when Position (Level) and Department are selected
  useEffect(() => {
    if (formData.position && formData.department) {
      // Find department name either by ID (if UUID) or if it's a temp ID
      const selectedDeptObj = derivedDepartments.find(d => d.id === formData.department);
      const deptName = selectedDeptObj?.name;

      if (deptName) {
        const matchedPosition = positions.find(p =>
          p.level === formData.position &&
          p.department?.trim().toLowerCase() === deptName.trim().toLowerCase()
        );
        if (matchedPosition && matchedPosition.gaji_pokok) {
          setFormData(prev => ({ ...prev, salary: matchedPosition.gaji_pokok.toString() }));
          toast({
            title: "Info Gaji",
            description: `Gaji otomatis diisi: ${formatCurrency(matchedPosition.gaji_pokok)}`,
          });
        }
      }
    }
  }, [formData.position, formData.department, positions, derivedDepartments]);

  // Handle position change: update form data
  const handlePositionChange = (level: string) => {
    console.log("DEBUG: Selected Level:", level);
    setFormData(prev => ({ ...prev, position: level, department: '' })); // Reset department when level changes

    // Auto-select department if only one department has this level
    const associatedDepts = positions
      .filter(p => p.level === level)
      .map(p => p.department);


    if (associatedDepts.length === 1) {
      const deptName = associatedDepts[0];
      // Find dept object in derived list
      const dept = derivedDepartments.find(d => d.name.trim().toLowerCase() === deptName.trim().toLowerCase());
      if (dept) {
        console.log("DEBUG: Auto-selecting single dept:", dept.name);
        setFormData(prev => ({
          ...prev,
          position: level,
          department: dept.id
        }));
      }
    }
  };

  const handleAddEmployee = async () => {
    try {
      // Check for missing fields individually to give better feedback
      const missingFields = [];
      if (!formData.name) missingFields.push("Nama Lengkap");
      if (!formData.position) missingFields.push("Posisi");
      if (!formData.department) missingFields.push("Departemen");
      if (!formData.salary) missingFields.push("Gaji Pokok");
      if (!formData.join_date) missingFields.push("Tanggal Bergabung");
      if (!formData.email) missingFields.push("Email Resmi");

      if (missingFields.length > 0) {
        console.warn("DEBUG: Validation failed - missing fields:", missingFields);
        addNotification({
          title: 'Data Belum Lengkap',
          message: `Mohon isi field berikut: ${missingFields.join(', ')}`,
          type: 'warning',
          module: 'employee'
        });
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan",
          description: `Mohon lengkapi: ${missingFields.join(', ')}`,
        });
        return;
      }

      console.log("DEBUG: Validation passed");
      const salaryNum = parseInt(formData.salary);
      if (isNaN(salaryNum) || salaryNum <= 0) {
        console.warn("DEBUG: Validation failed - invalid salary");
        addNotification({
          title: 'Gaji Tidak Valid',
          message: 'Mohon masukkan gaji yang valid (angka positif)',
          type: 'warning',
          module: 'employee'
        });
        return;
      }

      // Auto-construct full title: "{Level} - {Department}"
      // e.g., "Staff - HRD"
      // Find selected dept object. 
      // NOTE: derivedDepartments is inside the component scope but we need it here. 
      // It is safer to recalculate name or use the one we just built.
      // But wait... handleAddEmployee is inside the component. We can access derivedDepartments!
      const selectedDeptObj = derivedDepartments.find(d => d.id === formData.department);
      const selectedDeptName = selectedDeptObj?.name || '';

      const fullJobTitle = `${formData.position} - ${selectedDeptName}`;

      // Handle department ID logic:
      // If ID starts with "temp-", it means it's a name-only department (no UUID).
      // So we send null for department_id.
      const isTempId = formData.department.startsWith('temp-');
      const finalDeptId = isTempId ? null : formData.department;

      const newEmployee = {
        name: formData.name.trim(),
        position: fullJobTitle,
        department: selectedDeptName,

        department_id: finalDeptId, // Send proper UUID or null
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

      console.log("DEBUG: Sending to addEmployee:", newEmployee);
      const result = await addEmployee(newEmployee);
      console.log("DEBUG: addEmployee successful, result:", result);

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
      console.error("DEBUG: addEmployee error:", error);
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

      // Logic to find selected department object using derivedDepartments (includes temp ones)
      const selectedDeptObj = derivedDepartments.find(d => d.id === formData.department);
      const selectedDeptName = selectedDeptObj?.name || '';

      const fullJobTitle = `${formData.position} - ${selectedDeptName}`;

      // Handle department ID logic:
      // If ID starts with "temp-", it means it's a name-only department (no UUID).
      const isTempId = formData.department.startsWith('temp-');
      const finalDeptId = isTempId ? null : formData.department;

      const updates = {
        name: formData.name.trim(),
        position: fullJobTitle,
        department: selectedDeptName,
        salary: salaryNum,
        join_date: formData.join_date,
        bank_account: formData.bank_account || null,
        bank: formData.bank || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        department_id: finalDeptId
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

    // Parse combined title back to components if possible
    // Format: "{Level} - {Department}"
    let level = employee.position;
    if (employee.position && employee.position.includes(' - ')) {
      const parts = employee.position.split(' - ');
      if (parts.length >= 2) {
        // Heuristic: Last part is department, rest is level
        const deptPart = parts.pop();
        level = parts.join(' - ');
      }
    }

    setFormData({
      name: employee.name,
      position: level, // extracted level
      // Attempt to match department to derived list
      // Prefer ID if it matches, otherwise find by name
      department: employee.department_id || derivedDepartments.find(d => d.name === employee.department)?.id || '',
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

  // Removed early returns to prevent "Rendered fewer hooks" error
  /*
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-hrd" />
          <p className="text-muted-foreground font-body">MENGAMBIL DATA KARYAWAN...</p>
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
  */

  return (
    <div className="space-y-6">
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
              console.log("DEBUG: Add Employee Button Clicked!");
              resetForm();
              setShowAddDialog(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      {/* Employee Table */}
      <div className="rounded-md border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[250px] font-body">Karyawan</TableHead>
              <TableHead className="font-body">Posisi</TableHead>
              <TableHead className="font-body">Departemen</TableHead>
              <TableHead className="font-body">Status</TableHead>
              <TableHead className="font-body">Akun Pengguna</TableHead>
              <TableHead className="text-right font-body">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center font-body text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center font-body text-muted-foreground">
                  Tidak ada karyawan ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => {
                const linkedUser = users.find(u =>
                  u.employee_id === employee.id ||
                  (u.email && employee.email && u.email.toLowerCase() === employee.email.toLowerCase())
                );

                return (
                  <TableRow key={employee.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-gray-100">
                          <AvatarFallback className="bg-hrd/10 text-hrd text-xs font-body font-bold">
                            {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium font-body text-sm text-[#1C1C1E]">{employee.name}</span>
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{employee.email || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm font-medium text-gray-700">{employee.position}</TableCell>
                    <TableCell className="font-body text-sm text-gray-600">
                      {departments.find(d => d.id === employee.department_id)?.name || employee.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        employee.status === 'active' ? 'default' :
                          employee.status === 'on-leave' ? 'secondary' : 'outline'
                      } className={`font-body text-xs capitalize ${employee.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}`}>
                        {employee.status === 'active' ? 'Aktif' :
                          employee.status === 'on-leave' ? 'Cuti' :
                            employee.status === 'inactive' ? 'Nonaktif' : employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {linkedUser ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit border border-blue-100">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Terhubung</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full w-fit border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Belum Ada</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-hrd hover:bg-hrd/10" onClick={() => handleViewEmployee(employee)} title="Lihat Detail">
                          <FileText className="w-4 h-4" />
                        </Button>
                        {user?.role !== 'staff' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(employee)} title="Edit">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                              setSelectedEmployee(employee);
                              setShowDeleteDialog(true);
                            }} title="Hapus">
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Employee Dialog - MANUAL OVERLAY */}
      {showAddDialog && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold font-display text-gray-900">Tambah Karyawan Baru</h2>
                <p className="text-sm text-muted-foreground">Isi formulir di bawah ini</p>
              </div>
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-gray-400 hover:text-red-500 transition-colors bg-gray-100 items-center justify-center flex w-8 h-8 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contoh: Budi Santoso"
                  className="font-body"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Posisi <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.position}
                    onValueChange={handlePositionChange}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent className="z-[999999]">
                      {uniqueLevels.map((level) => (
                        <SelectItem key={level} value={level} className="font-body">
                          {level}
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
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent className="z-[999999]">
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="font-body">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-blue-50 p-3 border border-blue-100">
                <Label className="font-body text-blue-700">Email Resmi (Wajib) <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="nama.karyawan@perusahaan.com"
                  className="font-body bg-white border-blue-200 focus:ring-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-[11px] text-blue-600 font-medium">
                  ⓘ Penting: Email ini digunakan untuk menghubungkan akun saat register.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Gaji Pokok</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">Rp</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="font-mono pl-9"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Tanggal Gabung</Label>
                  <Input
                    type="date"
                    className="font-mono"
                    value={formData.join_date}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => { setShowAddDialog(false); resetForm(); }}
                  className="font-body"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddEmployee}
                  className="bg-hrd hover:bg-hrd-dark font-body text-white w-32 shadow-lg"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
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
                  {uniqueLevels.map((level) => (
                    <SelectItem key={level} value={level} className="font-body">
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Departemen</Label>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredDepartments.map((dept) => (
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
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleEditEmployee} className="bg-hrd hover:bg-hrd-dark font-body">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog} >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Karyawan</DialogTitle>
            <DialogDescription className="font-body">
              Informasi lengkap karyawan
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="general" className="font-body">Umum</TabsTrigger>
                <TabsTrigger value="contract" className="font-body">Kontrak</TabsTrigger>
                <TabsTrigger value="history" className="font-body">Riwayat</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
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
                </div>
              </TabsContent>

              <TabsContent value="contract" className="space-y-4">
                <EmployeeContractTab employeeId={selectedEmployee.id} />
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <EmployeeHistoryTab employeeId={selectedEmployee.id} />
              </TabsContent>
            </Tabs>
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
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
      </Dialog>
    </div>
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
              onClick={() => {
                alert('DEBUG: Klik dari Dashboard HRD...');
                navigate('/hrd/employees?add=true');
              }}
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
    { label: 'Portal Mandiri', href: '/hrd/portal', icon: User },
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
        const { error } = await supabase.from('departments').select('id').limit(1);
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
              ? <Navigate to="/hrd/portal" replace />
              : <HRDDashboard />
          } />
          <Route path="portal" element={<ESSPortal />} />
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

// --- Sub-components for Employee Details ---

function EmployeeContractTab({ employeeId }: { employeeId: string }) {
  const { contracts, loading } = useContracts(employeeId);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-hrd" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-display font-medium text-sm text-muted-foreground uppercase tracking-wider">Riwayat Kontrak</h4>
        <Button size="sm" variant="outline" className="text-xs border-hrd/50 text-hrd hover:bg-hrd/10 font-body h-7">Tambah Kontrak</Button>
      </div>
      <div className="space-y-2">
        {contracts.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-xl border-gray-100">
            <p className="text-sm text-muted-foreground font-body">Belum ada data kontrak</p>
          </div>
        ) : (
          contracts.map(contract => (
            <div key={contract.id} className="p-3 border rounded-lg bg-white shadow-sm hover:border-hrd/30 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium font-body text-sm">{contract.contract_number}</p>
                  <p className="text-xs text-hrd font-medium mt-0.5">{contract.type}</p>
                </div>
                <Badge variant={contract.status === 'active' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                  {contract.status === 'active' ? 'Aktif' : 'Selesai'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                <Calendar className="w-3 h-3" />
                <span>{contract.start_date} s/d {contract.end_date || 'Permanen'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmployeeHistoryTab({ employeeId }: { employeeId: string }) {
  const { history, loading } = useJobHistory(employeeId);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-hrd" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-display font-medium text-sm text-muted-foreground uppercase tracking-wider">Riwayat Jabatan</h4>
        <Button size="sm" variant="outline" className="text-xs border-hrd/50 text-hrd hover:bg-hrd/10 font-body h-7">Tambah Riwayat</Button>
      </div>
      <div className="space-y-6 relative ml-2 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
        {history.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-xl border-gray-100 ml-0">
            <p className="text-sm text-muted-foreground font-body">Belum ada riwayat jabatan</p>
          </div>
        ) : (
          history.map(item => (
            <div key={item.id} className="relative pl-6">
              <div className="absolute left-[-3.5px] top-1.5 w-2 h-2 rounded-full bg-hrd border-2 border-white shadow-sm shadow-hrd/20" />
              <p className="font-bold text-sm text-[#1C1C1E]">{item.new_position}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                <Calendar className="w-3 h-3" />
                <span>Efektif sejak {item.change_date}</span>
              </div>
              {item.reason && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs italic text-gray-600 border-l-2 border-gray-200">
                  {item.reason}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
