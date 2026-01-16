import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  MapPin
} from 'lucide-react';
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

// Notification Context
interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
  module: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Initial notifications
const initialNotifications: Notification[] = [
  { id: 1, title: 'Pengajuan Cuti Baru', message: 'Budi Santoso mengajukan cuti 5 hari', type: 'info', time: '5 menit lalu', read: false, module: 'cuti' },
  { id: 2, title: 'Gaji Diproses', message: 'Slip gaji bulan Januari telah dikirim', type: 'success', time: '1 jam lalu', read: false, module: 'payroll' },
  { id: 3, title: 'Keterlambatan', message: '3 karyawan terlambat hari ini', type: 'warning', time: '2 jam lalu', read: false, module: 'attendance' },
  { id: 4, title: 'Reward Baru', message: 'Ahmad Wijaya mendapat Employee of the Month', type: 'success', time: '3 jam lalu', read: false, module: 'reward' },
  { id: 5, title: 'Cuti Disetujui', message: 'Pengajuan cuti Siti Rahayu telah disetujui', type: 'success', time: '5 jam lalu', read: true, module: 'cuti' },
];

function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
    const newNotification: Notification = {
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
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Notification Bell Component
function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
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
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.read ? 'bg-gray-50 border-gray-200' : 'bg-hrd/5 border-hrd/20'
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

// Mock data - moved before navItems to avoid reference errors
const employees = [
  { id: 1, name: 'Budi Santoso', position: 'Software Engineer', department: 'IT', status: 'active', joinDate: '2022-03-15', salary: 15000000, bankAccount: '1234567890', bank: 'BCA', salesTarget: 0, salesAchieved: 0, attendanceScore: 100, innovationProjects: 3 },
  { id: 2, name: 'Siti Rahayu', position: 'HR Manager', department: 'HRD', status: 'active', joinDate: '2021-01-10', salary: 18000000, bankAccount: '0987654321', bank: 'Mandiri', salesTarget: 0, salesAchieved: 0, attendanceScore: 98, teamLeadership: true },
  { id: 3, name: 'Ahmad Wijaya', position: 'Sales Executive', department: 'Sales', status: 'active', joinDate: '2023-06-01', salary: 12000000, bankAccount: '1122334455', bank: 'BNI', salesTarget: 500000000, salesAchieved: 750000000, attendanceScore: 95, customerRating: 4.8 },
  { id: 4, name: 'Dewi Lestari', position: 'Accountant', department: 'Finance', status: 'active', joinDate: '2022-09-20', salary: 14000000, bankAccount: '5544332211', bank: 'BRI', salesTarget: 0, salesAchieved: 0, attendanceScore: 100, innovationProjects: 1 },
  { id: 5, name: 'Rudi Hermawan', position: 'Marketing Specialist', department: 'Marketing', status: 'on-leave', joinDate: '2023-02-14', salary: 13000000, bankAccount: '6677889900', bank: 'BCA', salesTarget: 300000000, salesAchieved: 280000000, attendanceScore: 92, customerRating: 4.5 },
  { id: 6, name: 'Rina Wijayanti', position: 'Team Leader', department: 'IT', status: 'active', joinDate: '2021-05-20', salary: 20000000, bankAccount: '2233445566', bank: 'BCA', salesTarget: 0, salesAchieved: 0, attendanceScore: 100, teamLeadership: true },
  { id: 7, name: 'Andi Pratama', position: 'Customer Service', department: 'CS', status: 'active', joinDate: '2022-11-10', salary: 10000000, bankAccount: '3344556677', bank: 'Mandiri', salesTarget: 0, salesAchieved: 0, attendanceScore: 97, customerRating: 4.9 },
  { id: 8, name: 'Maya Kusuma', position: 'Sales Manager', department: 'Sales', status: 'active', joinDate: '2020-08-15', salary: 22000000, bankAccount: '4455667788', bank: 'BNI', salesTarget: 800000000, salesAchieved: 950000000, attendanceScore: 100, teamLeadership: true },
  { id: 9, name: 'Fajar Nugroho', position: 'Developer', department: 'IT', status: 'active', joinDate: '2023-01-05', salary: 14000000, bankAccount: '5566778899', bank: 'BRI', salesTarget: 0, salesAchieved: 0, attendanceScore: 100, innovationProjects: 5 },
  { id: 10, name: 'Linda Sari', position: 'Support Specialist', department: 'CS', status: 'active', joinDate: '2022-07-20', salary: 11000000, bankAccount: '6677889900', bank: 'BCA', salesTarget: 0, salesAchieved: 0, attendanceScore: 100, customerRating: 4.7 },
];

const navItems = [
  { label: 'Dashboard', href: '/hrd', icon: Users },
  { label: 'Karyawan', href: '/hrd/employees', icon: Users },
  { label: 'Rekrutmen', href: '/hrd/recruitment', icon: UserPlus },
  { label: 'Cuti & Izin', href: '/hrd/leave', icon: Calendar },
  { label: 'Absensi', href: '/hrd/attendance', icon: Clock },
  { label: 'Penggajian', href: '/hrd/payroll', icon: DollarSign },
  { label: 'Reward', href: '/hrd/rewards', icon: Award },
];

const leaveRequests = [
  { id: 1, employee: 'Budi Santoso', type: 'Cuti Tahunan', startDate: '2024-02-01', endDate: '2024-02-05', days: 5, status: 'pending', reason: 'Liburan keluarga' },
  { id: 2, employee: 'Siti Rahayu', type: 'Izin Sakit', startDate: '2024-01-28', endDate: '2024-01-29', days: 2, status: 'approved', reason: 'Demam' },
  { id: 3, employee: 'Ahmad Wijaya', type: 'Cuti Tahunan', startDate: '2024-02-10', endDate: '2024-02-12', days: 3, status: 'pending', reason: 'Acara keluarga' },
  { id: 4, employee: 'Dewi Lestari', type: 'Izin Pribadi', startDate: '2024-01-30', endDate: '2024-01-30', days: 1, status: 'rejected', reason: 'Urusan pribadi' },
];

// Attendance data
const attendanceData = [
  { id: 1, employee: 'Budi Santoso', date: '2024-01-28', checkIn: '08:05', checkOut: '17:30', status: 'present', workHours: '9h 25m', location: 'Kantor Pusat' },
  { id: 2, employee: 'Siti Rahayu', date: '2024-01-28', checkIn: '07:55', checkOut: '17:15', status: 'present', workHours: '9h 20m', location: 'Kantor Pusat' },
  { id: 3, employee: 'Ahmad Wijaya', date: '2024-01-28', checkIn: '08:45', checkOut: '17:00', status: 'late', workHours: '8h 15m', location: 'Remote' },
  { id: 4, employee: 'Dewi Lestari', date: '2024-01-28', checkIn: '08:00', checkOut: '17:30', status: 'present', workHours: '9h 30m', location: 'Kantor Pusat' },
  { id: 5, employee: 'Rudi Hermawan', date: '2024-01-28', checkIn: '-', checkOut: '-', status: 'leave', workHours: '-', location: '-' },
];

const attendanceStats = [
  { label: 'Hadir', value: 142, color: 'bg-green-500' },
  { label: 'Terlambat', value: 8, color: 'bg-orange-500' },
  { label: 'Izin/Cuti', value: 4, color: 'bg-blue-500' },
  { label: 'Tidak Hadir', value: 2, color: 'bg-red-500' },
];

// Payroll data
const payrollData = [
  { id: 1, employee: 'Budi Santoso', position: 'Software Engineer', baseSalary: 15000000, allowances: 2500000, deductions: 1500000, netSalary: 16000000, status: 'paid', payDate: '2024-01-25' },
  { id: 2, employee: 'Siti Rahayu', position: 'HR Manager', baseSalary: 18000000, allowances: 3000000, deductions: 1800000, netSalary: 19200000, status: 'paid', payDate: '2024-01-25' },
  { id: 3, employee: 'Ahmad Wijaya', position: 'Sales Executive', baseSalary: 12000000, allowances: 4500000, deductions: 1200000, netSalary: 15300000, status: 'pending', payDate: '-' },
  { id: 4, employee: 'Dewi Lestari', position: 'Accountant', baseSalary: 14000000, allowances: 2000000, deductions: 1400000, netSalary: 14600000, status: 'paid', payDate: '2024-01-25' },
  { id: 5, employee: 'Rudi Hermawan', position: 'Marketing Specialist', baseSalary: 13000000, allowances: 2000000, deductions: 1300000, netSalary: 13700000, status: 'pending', payDate: '-' },
];

// Reward data
const rewardData = [
  { id: 1, employee: 'Ahmad Wijaya', type: 'Closing', description: 'Pencapaian target penjualan 150%', points: 600, date: '2024-01-28', status: 'active' },
  { id: 2, employee: 'Budi Santoso', type: 'Innovation Award', description: 'Mengembangkan 3 proyek inovatif yang meningkatkan efisiensi sistem', points: 300, date: '2024-01-15', status: 'active' },
  { id: 3, employee: 'Siti Rahayu', type: 'Best Team Leader', description: 'Kepemimpinan luar biasa dalam mengelola tim HRD', points: 400, date: '2024-01-10', status: 'active' },
  { id: 4, employee: 'Dewi Lestari', type: 'Perfect Attendance', description: 'Kehadiran sempurna selama 6 bulan berturut-turut', points: 200, date: '2024-01-05', status: 'claimed' },
  { id: 5, employee: 'Rina Wijayanti', type: 'Best Team Leader', description: 'Memimpin tim IT dengan hasil proyek yang memuaskan', points: 400, date: '2024-01-20', status: 'active' },
  { id: 6, employee: 'Andi Pratama', type: 'Customer Champion', description: 'Rating kepuasan pelanggan 4.9/5.0', points: 350, date: '2024-01-18', status: 'active' },
  { id: 7, employee: 'Maya Kusuma', type: 'Closing', description: 'Mencapai 118% dari target penjualan', points: 600, date: '2024-01-12', status: 'active' },
  { id: 8, employee: 'Fajar Nugroho', type: 'Innovation Award', description: 'Mengembangkan 5 proyek inovatif yang meningkatkan produktivitas', points: 300, date: '2024-01-25', status: 'active' },
  { id: 9, employee: 'Linda Sari', type: 'Perfect Attendance', description: 'Kehadiran sempurna dan konsisten', points: 200, date: '2024-01-08', status: 'active' },
  { id: 10, employee: 'Budi Santoso', type: 'Employee of the Month', description: 'Kinerja luar biasa di bulan Januari', points: 500, date: '2024-01-30', status: 'active' },
];

const rewardTypes = [
  { name: 'Employee of the Month', points: 500, icon: Star },
  { name: 'Innovation Award', points: 300, icon: Award },
  { name: 'Best Team Leader', points: 400, icon: Users },
  { name: 'Perfect Attendance', points: 200, icon: Clock },
  { name: 'Customer Champion', points: 350, icon: Gift },
  { name: 'Closing', points: 600, icon: Award },
];

const stats = [
  { label: 'Total Karyawan', value: 156, icon: Users, change: '+5%' },
  { label: 'Karyawan Baru', value: 8, icon: UserPlus, change: '+12%' },
  { label: 'Pengajuan Cuti', value: 12, icon: Calendar, change: '-3%' },
  { label: 'Tingkat Kehadiran', value: '94%', icon: Clock, change: '+2%' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function HRDDashboard() {
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [showLeaveRequestDialog, setShowLeaveRequestDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: '',
    handoverTo: ''
  });

  const leaveTypes = [
    { value: 'annual', label: 'Cuti Tahunan', maxDays: 12 },
    { value: 'sick', label: 'Cuti Sakit', maxDays: 14 },
    { value: 'maternity', label: 'Cuti Melahirkan', maxDays: 90 },
    { value: 'paternity', label: 'Cuti Ayah', maxDays: 3 },
    { value: 'marriage', label: 'Cuti Menikah', maxDays: 3 },
    { value: 'bereavement', label: 'Cuti Duka', maxDays: 3 },
    { value: 'unpaid', label: 'Cuti Tanpa Gaji', maxDays: 30 },
    { value: 'permission', label: 'Izin (Jam Kerja)', maxDays: 1 },
  ];

  const calculateDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const selectedLeaveType = leaveTypes.find(t => t.value === leaveForm.leaveType);
  const requestedDays = calculateDays();
  const isOverLimit = selectedLeaveType && requestedDays > selectedLeaveType.maxDays;

  const handleSubmitLeaveRequest = () => {
    if (!leaveForm.employeeId || !leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      addNotification({
        title: 'Form Tidak Lengkap',
        message: 'Mohon lengkapi semua field yang wajib diisi',
        type: 'warning',
        time: 'Baru saja',
        module: 'leave'
      });
      return;
    }

    if (isOverLimit) {
      addNotification({
        title: 'Melebihi Batas',
        message: `Jumlah hari melebihi batas maksimal ${selectedLeaveType?.maxDays} hari untuk ${selectedLeaveType?.label}`,
        type: 'error',
        time: 'Baru saja',
        module: 'leave'
      });
      return;
    }

    const selectedEmployee = employees.find(e => e.id.toString() === leaveForm.employeeId);
    addNotification({
      title: 'Pengajuan Cuti/Izin Berhasil',
      message: `Pengajuan ${selectedLeaveType?.label} untuk ${selectedEmployee?.name} (${requestedDays} hari) telah dikirim untuk persetujuan`,
      type: 'success',
      time: 'Baru saja',
      module: 'leave'
    });
    setShowLeaveRequestDialog(false);
    setLeaveForm({
      employeeId: '',
      leaveType: '',
      startDate: '',
      endDate: '',
      reason: '',
      emergencyContact: '',
      handoverTo: ''
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Dashboard HRD</h1>
          <p className="text-muted-foreground font-body">Kelola sumber daya manusia perusahaan</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Dialog open={showLeaveRequestDialog} onOpenChange={setShowLeaveRequestDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-hrd text-hrd hover:bg-hrd/10 font-body">
                <FileText className="w-4 h-4 mr-2" />
                Ajukan Cuti/Izin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Form Pengajuan Cuti/Izin</DialogTitle>
                <DialogDescription className="font-body">
                  Lengkapi form berikut untuk mengajukan cuti atau izin
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Employee Selection */}
                <div className="space-y-2">
                  <Label className="font-body">Karyawan <span className="text-red-500">*</span></Label>
                  <Select value={leaveForm.employeeId} onValueChange={(value) => setLeaveForm({...leaveForm, employeeId: value})}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(emp => emp.status === 'active').map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()} className="font-body">
                          {emp.name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Leave Type */}
                <div className="space-y-2">
                  <Label className="font-body">Jenis Cuti/Izin <span className="text-red-500">*</span></Label>
                  <Select value={leaveForm.leaveType} onValueChange={(value) => setLeaveForm({...leaveForm, leaveType: value})}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih jenis cuti/izin" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(type => (
                        <SelectItem key={type.value} value={type.value} className="font-body">
                          {type.label} (Maks. {type.maxDays} hari)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Tanggal Mulai <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      className="font-body"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Tanggal Selesai <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      className="font-body"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                      min={leaveForm.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Days Summary */}
                {requestedDays > 0 && (
                  <div className={`p-3 rounded-lg border ${isOverLimit ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-body ${isOverLimit ? 'text-red-700' : 'text-blue-700'}`}>
                        Total Hari Diajukan:
                      </span>
                      <span className={`font-mono font-bold ${isOverLimit ? 'text-red-900' : 'text-blue-900'}`}>
                        {requestedDays} hari
                      </span>
                    </div>
                    {selectedLeaveType && (
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-xs font-body ${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>
                          Batas Maksimal {selectedLeaveType.label}:
                        </span>
                        <span className={`font-mono text-xs ${isOverLimit ? 'text-red-700' : 'text-blue-700'}`}>
                          {selectedLeaveType.maxDays} hari
                        </span>
                      </div>
                    )}
                    {isOverLimit && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Jumlah hari melebihi batas maksimal
                      </p>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="font-body">Alasan Pengajuan <span className="text-red-500">*</span></Label>
                  <Textarea 
                    placeholder="Jelaskan alasan pengajuan cuti/izin..."
                    className="font-body min-h-[80px]"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-2">
                  <Label className="font-body">Kontak Darurat</Label>
                  <Input 
                    placeholder="Nomor telepon yang bisa dihubungi"
                    className="font-body"
                    value={leaveForm.emergencyContact}
                    onChange={(e) => setLeaveForm({...leaveForm, emergencyContact: e.target.value})}
                  />
                </div>

                {/* Handover */}
                <div className="space-y-2">
                  <Label className="font-body">Serah Terima Tugas Kepada</Label>
                  <Select value={leaveForm.handoverTo} onValueChange={(value) => setLeaveForm({...leaveForm, handoverTo: value})}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih karyawan pengganti" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(emp => emp.status === 'active' && emp.id.toString() !== leaveForm.employeeId).map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()} className="font-body">
                          {emp.name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-body text-gray-600">
                    <strong>Catatan:</strong> Pengajuan cuti/izin akan diproses dalam 1-2 hari kerja. 
                    Pastikan untuk melakukan serah terima tugas sebelum cuti dimulai.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowLeaveRequestDialog(false)} className="font-body">
                  Batal
                </Button>
                <Button 
                  className="bg-hrd hover:bg-hrd-dark font-body"
                  onClick={handleSubmitLeaveRequest}
                  disabled={isOverLimit}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Ajukan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            className="bg-hrd hover:bg-hrd-dark font-body"
            onClick={() => navigate('/hrd/employees')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Karyawan
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-hrd/10 flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-hrd" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stat.change}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className="border-gray-200 hover:border-hrd/50 transition-colors cursor-pointer"
          onClick={() => navigate('/hrd/payroll')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-body font-medium text-sm">Proses Gaji</p>
              <p className="text-xs text-muted-foreground font-body">2 pending</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-gray-200 hover:border-hrd/50 transition-colors cursor-pointer"
          onClick={() => navigate('/hrd/leave')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-body font-medium text-sm">Cuti Pending</p>
              <p className="text-xs text-muted-foreground font-body">2 pengajuan</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-gray-200 hover:border-hrd/50 transition-colors cursor-pointer"
          onClick={() => navigate('/hrd/attendance')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-body font-medium text-sm">Terlambat</p>
              <p className="text-xs text-muted-foreground font-body">3 hari ini</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-gray-200 hover:border-hrd/50 transition-colors cursor-pointer"
          onClick={() => navigate('/hrd/rewards')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-body font-medium text-sm">Reward</p>
              <p className="text-xs text-muted-foreground font-body">4 aktif</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leave Requests */}
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Pengajuan Cuti Terbaru</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-hrd font-body"
            onClick={() => navigate('/hrd/leave')}
          >
            Lihat Semua
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaveRequests.slice(0, 4).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                      {request.employee.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium font-body text-[#1C1C1E]">{request.employee}</p>
                    <p className="text-sm text-muted-foreground font-body">
                      {request.type} • {request.days} hari
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}
                    className="font-body"
                  >
                    {request.status === 'approved' ? 'Disetujui' : request.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                  </Badge>
                  {request.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => addNotification({
                          title: 'Cuti Disetujui',
                          message: `Pengajuan cuti ${request.employee} telah disetujui`,
                          type: 'success',
                          time: 'Baru saja',
                          module: 'cuti'
                        })}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeList() {
  const { addNotification } = useNotifications();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<typeof employees[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load data from localStorage or use default employees
  const [employeeList, setEmployeeList] = useState(() => {
    const savedEmployees = localStorage.getItem('hrd-employees');
    return savedEmployees ? JSON.parse(savedEmployees) : employees;
  });

  // Form states for add/edit
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    salary: '',
    joinDate: '',
    bankAccount: '',
    bank: ''
  });

  // Save to localStorage whenever employeeList changes
  useEffect(() => {
    localStorage.setItem('hrd-employees', JSON.stringify(employeeList));
  }, [employeeList]);

  const filteredEmployees = employeeList.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      department: '',
      salary: '',
      joinDate: '',
      bankAccount: '',
      bank: ''
    });
  };

  // Handle add employee
  const handleAddEmployee = () => {
    console.log('handleAddEmployee called', formData);
    
    if (!formData.name?.trim() || !formData.position?.trim() || !formData.department || !formData.salary || !formData.joinDate) {
      const missingFields = [];
      if (!formData.name?.trim()) missingFields.push('Nama');
      if (!formData.position?.trim()) missingFields.push('Posisi');
      if (!formData.department) missingFields.push('Departemen');
      if (!formData.salary) missingFields.push('Gaji');
      if (!formData.joinDate) missingFields.push('Tanggal Bergabung');
      
      addNotification({
        title: 'Form Tidak Lengkap',
        message: `Mohon lengkapi field: ${missingFields.join(', ')}`,
        type: 'warning',
        time: 'Baru saja',
        module: 'employee'
      });
      return;
    }

    // Validate salary is a valid number
    const salaryNum = parseInt(formData.salary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      addNotification({
        title: 'Gaji Tidak Valid',
        message: 'Mohon masukkan gaji yang valid (angka positif)',
        type: 'warning',
        time: 'Baru saja',
        module: 'employee'
      });
      return;
    }

    // Generate new ID safely
    const newId = employeeList.length > 0 ? Math.max(...employeeList.map(emp => emp.id)) + 1 : 1;
    
    const newEmployee = {
      id: newId,
      name: formData.name.trim(),
      position: formData.position.trim(),
      department: formData.department,
      status: 'active' as const,
      joinDate: formData.joinDate,
      salary: salaryNum,
      bankAccount: formData.bankAccount || '',
      bank: formData.bank || '',
      salesTarget: 0,
      salesAchieved: 0,
      attendanceScore: 100,
      innovationProjects: 0,
      teamLeadership: false,
      customerRating: undefined
    };

    console.log('Adding new employee:', newEmployee);
    
    setEmployeeList(prev => {
      const updated = [...prev, newEmployee];
      console.log('Updated employee list:', updated);
      return updated;
    });
    
    addNotification({
      title: 'Karyawan Ditambahkan',
      message: `Karyawan ${formData.name} berhasil ditambahkan ke sistem`,
      type: 'success',
      time: 'Baru saja',
      module: 'employee'
    });
    
    setShowAddDialog(false);
    resetForm();
  };

  // Handle edit employee
  const handleEditEmployee = () => {
    if (!selectedEmployee || !formData.name || !formData.position || !formData.department || !formData.salary || !formData.joinDate) {
      addNotification({
        title: 'Form Tidak Lengkap',
        message: 'Mohon lengkapi semua field yang wajib diisi',
        type: 'warning',
        time: 'Baru saja',
        module: 'employee'
      });
      return;
    }

    const updatedEmployee = {
      ...selectedEmployee,
      name: formData.name,
      position: formData.position,
      department: formData.department,
      salary: parseInt(formData.salary),
      joinDate: formData.joinDate,
      bankAccount: formData.bankAccount || undefined,
      bank: formData.bank || undefined
    };

    setEmployeeList(prev => prev.map(emp => emp.id === selectedEmployee.id ? updatedEmployee : emp));
    addNotification({
      title: 'Data Karyawan Diperbarui',
      message: `Data karyawan ${formData.name} berhasil diperbarui`,
      type: 'success',
      time: 'Baru saja',
      module: 'employee'
    });
    setShowEditDialog(false);
    setSelectedEmployee(null);
    resetForm();
  };

  // Handle view employee
  const handleViewEmployee = (employee: typeof employees[0]) => {
    setSelectedEmployee(employee);
    setShowViewDialog(true);
  };

  // Handle edit button click
  const handleEditClick = (employee: typeof employees[0]) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      salary: employee.salary.toString(),
      joinDate: employee.joinDate,
      bankAccount: employee.bankAccount || '',
      bank: employee.bank || ''
    });
    setShowEditDialog(true);
  };

  // Handle delete employee
  const handleDeleteEmployee = () => {
    if (selectedEmployee) {
      setEmployeeList(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      addNotification({
        title: 'Karyawan Dihapus',
        message: `Data karyawan ${selectedEmployee.name} telah dihapus dari sistem`,
        type: 'success',
        time: 'Baru saja',
        module: 'employee'
      });
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Daftar Karyawan</h1>
          <p className="text-muted-foreground font-body">Kelola data karyawan perusahaan</p>
        </div>
        <Button 
          className="bg-hrd hover:bg-hrd-dark font-body"
          onClick={() => {
            console.log('Opening add dialog');
            resetForm();
            setShowAddDialog(true);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
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
      </div>

      {/* Employee Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Karyawan</TableHead>
                <TableHead className="font-body">Posisi</TableHead>
                <TableHead className="font-body">Departemen</TableHead>
                <TableHead className="font-body">Status</TableHead>
                <TableHead className="font-body">Tanggal Bergabung</TableHead>
                <TableHead className="font-body text-right">Aksi</TableHead>
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
                      <span className="font-medium font-body">{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-body">{employee.position}</TableCell>
                  <TableCell className="font-body">{employee.department}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={employee.status === 'active' ? 'default' : 'secondary'}
                      className="font-body"
                    >
                      {employee.status === 'active' ? 'Aktif' : 'Cuti'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{employee.joinDate}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog 
        open={showAddDialog} 
        onOpenChange={(open) => {
          console.log('Dialog state changing to:', open);
          setShowAddDialog(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
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
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Posisi <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Posisi/Jabatan" 
                className="font-body"
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Departemen <span className="text-red-500">*</span></Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT" className="font-body">IT</SelectItem>
                  <SelectItem value="HRD" className="font-body">HRD</SelectItem>
                  <SelectItem value="Sales" className="font-body">Sales</SelectItem>
                  <SelectItem value="Finance" className="font-body">Finance</SelectItem>
                  <SelectItem value="Marketing" className="font-body">Marketing</SelectItem>
                  <SelectItem value="CS" className="font-body">Customer Service</SelectItem>
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
                onChange={(e) => setFormData({...formData, salary: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Tanggal Bergabung <span className="text-red-500">*</span></Label>
              <Input 
                type="date" 
                className="font-mono"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Nomor Rekening</Label>
              <Input 
                placeholder="1234567890" 
                className="font-mono"
                value={formData.bankAccount}
                onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Bank</Label>
              <Select value={formData.bank} onValueChange={(value) => setFormData({...formData, bank: value})}>
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
            <Button 
              onClick={(e) => {
                e.preventDefault();
                console.log('Button clicked!');
                handleAddEmployee();
              }} 
              className="bg-hrd hover:bg-hrd-dark font-body"
              type="button"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
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
                  <p className="text-sm text-red-700 font-body">{selectedEmployee.position} - {selectedEmployee.department}</p>
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

      {/* View Employee Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
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
                    {selectedEmployee.status === 'active' ? 'Aktif' : 'Cuti'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Departemen</Label>
                  <p className="font-body font-medium">{selectedEmployee.department}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Tanggal Bergabung</Label>
                  <p className="font-mono font-medium">{selectedEmployee.joinDate}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Gaji Pokok</Label>
                  <p className="font-mono font-medium">{formatCurrency(selectedEmployee.salary)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Skor Kehadiran</Label>
                  <p className="font-mono font-medium">{selectedEmployee.attendanceScore}%</p>
                </div>
                {selectedEmployee.bankAccount && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Rekening Bank</Label>
                    <p className="font-mono font-medium">{selectedEmployee.bankAccount}</p>
                  </div>
                )}
                {selectedEmployee.bank && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Bank</Label>
                    <p className="font-body font-medium">{selectedEmployee.bank}</p>
                  </div>
                )}
                {selectedEmployee.salesTarget > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label className="font-body text-muted-foreground">Target Penjualan</Label>
                      <p className="font-mono font-medium">{formatCurrency(selectedEmployee.salesTarget)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body text-muted-foreground">Pencapaian</Label>
                      <p className="font-mono font-medium">{formatCurrency(selectedEmployee.salesAchieved)}</p>
                    </div>
                  </>
                )}
                {selectedEmployee.innovationProjects > 0 && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Proyek Inovasi</Label>
                    <p className="font-mono font-medium">{selectedEmployee.innovationProjects} proyek</p>
                  </div>
                )}
                {selectedEmployee.customerRating && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Rating Pelanggan</Label>
                    <p className="font-mono font-medium">{selectedEmployee.customerRating}/5.0</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
              Tutup
            </Button>
            <Button 
              onClick={() => {
                setShowViewDialog(false);
                if (selectedEmployee) handleEditClick(selectedEmployee);
              }}
              className="bg-hrd hover:bg-hrd-dark font-body"
            >
              Edit Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
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
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Posisi <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Posisi/Jabatan" 
                className="font-body"
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Departemen <span className="text-red-500">*</span></Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT" className="font-body">IT</SelectItem>
                  <SelectItem value="HRD" className="font-body">HRD</SelectItem>
                  <SelectItem value="Sales" className="font-body">Sales</SelectItem>
                  <SelectItem value="Finance" className="font-body">Finance</SelectItem>
                  <SelectItem value="Marketing" className="font-body">Marketing</SelectItem>
                  <SelectItem value="CS" className="font-body">Customer Service</SelectItem>
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
                onChange={(e) => setFormData({...formData, salary: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Tanggal Bergabung <span className="text-red-500">*</span></Label>
              <Input 
                type="date" 
                className="font-mono"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Nomor Rekening</Label>
              <Input 
                placeholder="1234567890" 
                className="font-mono"
                value={formData.bankAccount}
                onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Bank</Label>
              <Select value={formData.bank} onValueChange={(value) => setFormData({...formData, bank: value})}>
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
    </div>
  );
}

function LeaveManagement() {
  const { addNotification } = useNotifications();
  
  const handleApprove = (employee: string) => {
    addNotification({
      title: 'Cuti Disetujui',
      message: `Pengajuan cuti ${employee} telah disetujui`,
      type: 'success',
      time: 'Baru saja',
      module: 'cuti'
    });
  };

  const handleReject = (employee: string) => {
    addNotification({
      title: 'Cuti Ditolak',
      message: `Pengajuan cuti ${employee} telah ditolak`,
      type: 'error',
      time: 'Baru saja',
      module: 'cuti'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Cuti & Izin</h1>
          <p className="text-muted-foreground font-body">Kelola pengajuan cuti dan izin karyawan</p>
        </div>
        <NotificationBell />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="font-body">
          <TabsTrigger value="pending">Menunggu ({leaveRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {leaveRequests.filter(r => r.status === 'pending').map((request) => (
              <Card key={request.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                          {request.employee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{request.employee}</h3>
                        <p className="text-sm text-muted-foreground font-body">{request.type}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm font-body">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {request.startDate} - {request.endDate}
                          </span>
                          <span className="font-mono">{request.days} hari</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground font-body">
                          Alasan: {request.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="font-body text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(request.employee)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Tolak
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 font-body"
                        onClick={() => handleApprove(request.employee)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Setujui
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <div className="space-y-4">
            {leaveRequests.filter(r => r.status === 'approved').map((request) => (
              <Card key={request.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                          {request.employee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{request.employee}</h3>
                        <p className="text-sm text-muted-foreground font-body">
                          {request.type} • {request.startDate} - {request.endDate}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 font-body">Disetujui</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <div className="space-y-4">
            {leaveRequests.filter(r => r.status === 'rejected').map((request) => (
              <Card key={request.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                          {request.employee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{request.employee}</h3>
                        <p className="text-sm text-muted-foreground font-body">
                          {request.type} • {request.startDate} - {request.endDate}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="font-body">Ditolak</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Karyawan</TableHead>
                    <TableHead className="font-body">Jenis</TableHead>
                    <TableHead className="font-body">Tanggal</TableHead>
                    <TableHead className="font-body">Durasi</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-body font-medium">{request.employee}</TableCell>
                      <TableCell className="font-body">{request.type}</TableCell>
                      <TableCell className="font-mono text-sm">{request.startDate}</TableCell>
                      <TableCell className="font-mono">{request.days} hari</TableCell>
                      <TableCell>
                        <Badge 
                          variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="font-body"
                        >
                          {request.status === 'approved' ? 'Disetujui' : request.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

// Attendance Management Page
function AttendanceManagement() {
  const { addNotification } = useNotifications();
  const [selectedDate, setSelectedDate] = useState('2024-01-28');

  const totalEmployees = attendanceStats.reduce((acc, stat) => acc + stat.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Absensi</h1>
          <p className="text-muted-foreground font-body">Pantau kehadiran karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 font-mono"
          />
          <Button className="bg-hrd hover:bg-hrd-dark font-body">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {attendanceStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-body text-muted-foreground">{stat.label}</span>
                  <span className={`w-3 h-3 rounded-full ${stat.color}`} />
                </div>
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stat.value}</p>
                <Progress value={(stat.value / totalEmployees) * 100} className="h-1 mt-2" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Attendance Summary */}
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">Ringkasan Kehadiran</CardTitle>
            <div className="flex items-center gap-4 text-sm font-body">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Hadir
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" /> Terlambat
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> Izin/Cuti
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Tidak Hadir
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-4 rounded-full overflow-hidden flex">
            <div className="bg-green-500 h-full" style={{ width: `${(142/156)*100}%` }} />
            <div className="bg-orange-500 h-full" style={{ width: `${(8/156)*100}%` }} />
            <div className="bg-blue-500 h-full" style={{ width: `${(4/156)*100}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${(2/156)*100}%` }} />
          </div>
          <p className="text-sm text-muted-foreground font-body mt-2">
            Total: {totalEmployees} karyawan • Tingkat kehadiran: {((142/156)*100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="font-display text-lg">Detail Kehadiran - {selectedDate}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Karyawan</TableHead>
                <TableHead className="font-body">Check In</TableHead>
                <TableHead className="font-body">Check Out</TableHead>
                <TableHead className="font-body">Jam Kerja</TableHead>
                <TableHead className="font-body">Lokasi</TableHead>
                <TableHead className="font-body">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceData.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                          {record.employee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium font-body">{record.employee}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-green-500" />
                      <span className="font-mono">{record.checkIn}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="font-mono">{record.checkOut}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{record.workHours}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-body text-sm">{record.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'outline'}
                      className={`font-body ${
                        record.status === 'present' ? 'bg-green-100 text-green-700' :
                        record.status === 'late' ? 'bg-orange-100 text-orange-700' :
                        record.status === 'leave' ? 'bg-blue-100 text-blue-700' : ''
                      }`}
                    >
                      {record.status === 'present' ? 'Hadir' : 
                       record.status === 'late' ? 'Terlambat' : 
                       record.status === 'leave' ? 'Cuti' : 'Tidak Hadir'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Payroll Management Page
function PayrollManagement() {
  const { addNotification } = useNotifications();
  const [selectedMonth, setSelectedMonth] = useState('2024-01');
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<typeof payrollData[0] | null>(null);

  const totalPayroll = payrollData.reduce((acc, p) => acc + p.netSalary, 0);
  const paidCount = payrollData.filter(p => p.status === 'paid').length;
  const pendingCount = payrollData.filter(p => p.status === 'pending').length;

  const handleProcessPayroll = (employee: typeof payrollData[0]) => {
    addNotification({
      title: 'Gaji Diproses',
      message: `Gaji ${employee.employee} sebesar ${formatCurrency(employee.netSalary)} telah diproses`,
      type: 'success',
      time: 'Baru saja',
      module: 'payroll'
    });
  };

  const handleViewPayslip = (employee: typeof payrollData[0]) => {
    setSelectedEmployee(employee);
    setShowPayslipDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Penggajian</h1>
          <p className="text-muted-foreground font-body">Kelola gaji dan slip gaji karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40 font-mono"
          />
          <Button 
            className="bg-hrd hover:bg-hrd-dark font-body"
            onClick={() => addNotification({
              title: 'Proses Gaji Massal',
              message: `${pendingCount} gaji karyawan sedang diproses`,
              type: 'info',
              time: 'Baru saja',
              module: 'payroll'
            })}
          >
            <Send className="w-4 h-4 mr-2" />
            Proses Semua
          </Button>
        </div>
      </div>

      {/* Payroll Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Gaji</p>
                <p className="font-mono text-xl font-bold text-[#1C1C1E]">{formatCurrency(totalPayroll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Sudah Dibayar</p>
                <p className="font-mono text-xl font-bold text-[#1C1C1E]">{paidCount} karyawan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Timer className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Pending</p>
                <p className="font-mono text-xl font-bold text-[#1C1C1E]">{pendingCount} karyawan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Rata-rata Gaji</p>
                <p className="font-mono text-xl font-bold text-[#1C1C1E]">{formatCurrency(totalPayroll / payrollData.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="font-display text-lg">Daftar Gaji - Januari 2024</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Karyawan</TableHead>
                <TableHead className="font-body">Gaji Pokok</TableHead>
                <TableHead className="font-body">Tunjangan</TableHead>
                <TableHead className="font-body">Potongan</TableHead>
                <TableHead className="font-body">Gaji Bersih</TableHead>
                <TableHead className="font-body">Status</TableHead>
                <TableHead className="font-body text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                          {payroll.employee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium font-body">{payroll.employee}</p>
                        <p className="text-xs text-muted-foreground font-body">{payroll.position}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatCurrency(payroll.baseSalary)}</TableCell>
                  <TableCell className="font-mono text-sm text-green-600">+{formatCurrency(payroll.allowances)}</TableCell>
                  <TableCell className="font-mono text-sm text-red-600">-{formatCurrency(payroll.deductions)}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatCurrency(payroll.netSalary)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={payroll.status === 'paid' ? 'default' : 'secondary'}
                      className={`font-body ${payroll.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                    >
                      {payroll.status === 'paid' ? 'Dibayar' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-body"
                        onClick={() => handleViewPayslip(payroll)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Slip
                      </Button>
                      {payroll.status === 'pending' && (
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 font-body"
                          onClick={() => handleProcessPayroll(payroll)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Proses
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payslip Dialog */}
      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Slip Gaji</DialogTitle>
            <DialogDescription className="font-body">
              Periode: Januari 2024
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                    {selectedEmployee.employee.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium font-body">{selectedEmployee.employee}</p>
                  <p className="text-sm text-muted-foreground font-body">{selectedEmployee.position}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-body text-muted-foreground">Gaji Pokok</span>
                  <span className="font-mono">{formatCurrency(selectedEmployee.baseSalary)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-body text-muted-foreground">Tunjangan</span>
                  <span className="font-mono text-green-600">+{formatCurrency(selectedEmployee.allowances)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-body text-muted-foreground">Potongan (BPJS, Pajak)</span>
                  <span className="font-mono text-red-600">-{formatCurrency(selectedEmployee.deductions)}</span>
                </div>
                <div className="flex justify-between py-3 bg-hrd/10 rounded-lg px-3">
                  <span className="font-body font-semibold">Gaji Bersih</span>
                  <span className="font-mono font-bold text-hrd">{formatCurrency(selectedEmployee.netSalary)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="font-body">
              <Printer className="w-4 h-4 mr-2" />
              Cetak
            </Button>
            <Button className="bg-hrd hover:bg-hrd-dark font-body">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reward Management Page
function RewardManagement() {
  const { addNotification } = useNotifications();
  const [showAddRewardDialog, setShowAddRewardDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedRewardType, setSelectedRewardType] = useState<string>('');

  const totalPoints = rewardData.reduce((acc, r) => acc + r.points, 0);
  const activeRewards = rewardData.filter(r => r.status === 'active').length;

  const selectedEmployee = employees.find(e => e.id.toString() === selectedEmployeeId);

  const handleGiveReward = () => {
    addNotification({
      title: 'Reward Diberikan',
      message: 'Reward baru telah berhasil diberikan kepada karyawan',
      type: 'success',
      time: 'Baru saja',
      module: 'reward'
    });
    setShowAddRewardDialog(false);
    setSelectedEmployeeId('');
    setSelectedRewardType('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Reward</h1>
          <p className="text-muted-foreground font-body">Kelola penghargaan dan apresiasi karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Dialog open={showAddRewardDialog} onOpenChange={setShowAddRewardDialog}>
            <DialogTrigger asChild>
              <Button className="bg-hrd hover:bg-hrd-dark font-body">
                <Plus className="w-4 h-4 mr-2" />
                Beri Reward
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Beri Reward Baru</DialogTitle>
                <DialogDescription className="font-body">
                  Berikan penghargaan kepada karyawan berprestasi
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-body">Pilih Karyawan</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()} className="font-body">
                          {emp.name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedEmployee && selectedEmployee.salesTarget > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-body font-medium text-blue-900 mb-1">Data Penjualan</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-blue-700">Target:</span>
                        <span className="font-mono text-blue-900">Rp {selectedEmployee.salesTarget.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-blue-700">Tercapai:</span>
                        <span className="font-mono text-blue-900">Rp {selectedEmployee.salesAchieved.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-blue-700">Persentase:</span>
                        <span className={`font-mono font-bold ${selectedEmployee.salesAchieved >= selectedEmployee.salesTarget ? 'text-green-600' : 'text-orange-600'}`}>
                          {((selectedEmployee.salesAchieved / selectedEmployee.salesTarget) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="font-body">Jenis Reward</Label>
                  <Select value={selectedRewardType} onValueChange={setSelectedRewardType}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih jenis reward" />
                    </SelectTrigger>
                    <SelectContent>
                      {rewardTypes.map(type => {
                        const isTargetReward = type.name === 'Closing';
                        const isEligible = !isTargetReward || 
                          (selectedEmployee && selectedEmployee.salesAchieved >= selectedEmployee.salesTarget && selectedEmployee.salesTarget > 0);
                        
                        return (
                          <SelectItem 
                            key={type.name} 
                            value={type.name} 
                            className="font-body" 
                            disabled={!isEligible}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{type.name} ({type.points} poin)</span>
                              {isTargetReward && selectedEmployee && selectedEmployee.salesTarget > 0 && (
                                <span className={`text-xs ml-2 ${isEligible ? 'text-green-600' : 'text-red-600'}`}>
                                  {isEligible ? '✓ Memenuhi syarat' : '✗ Belum memenuhi'}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Deskripsi</Label>
                  <Textarea placeholder="Alasan pemberian reward..." className="font-body" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddRewardDialog(false)} className="font-body">
                  Batal
                </Button>
                <Button onClick={handleGiveReward} className="bg-hrd hover:bg-hrd-dark font-body">
                  <Award className="w-4 h-4 mr-2" />
                  Berikan Reward
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reward Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Poin Diberikan</p>
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Reward Aktif</p>
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{activeRewards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Reward Diklaim</p>
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{rewardData.filter(r => r.status === 'claimed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reward Types */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="font-display text-lg">Jenis Reward</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {rewardTypes.map((type, index) => {
              // Calculate how many employees are eligible for this reward type
              const eligibleCount = type.name === 'Closing'
                ? employees.filter(emp => emp.salesTarget > 0 && emp.salesAchieved >= emp.salesTarget).length
                : employees.length;
              
              return (
                <motion.div
                  key={type.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-50 rounded-xl text-center hover:bg-hrd/10 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-hrd/20 flex items-center justify-center mx-auto mb-2">
                    <type.icon className="w-6 h-6 text-hrd" />
                  </div>
                  <p className="font-body text-sm font-medium text-[#1C1C1E]">{type.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{type.points} poin</p>
                  {type.name === 'Closing' && (
                    <p className="font-body text-xs text-green-600 mt-1">
                      {eligibleCount} karyawan memenuhi syarat
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Rewards */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="font-display text-lg">Reward Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rewardData.map((reward, index) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-yellow-100 text-yellow-700 font-body">
                      {reward.employee.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-body text-[#1C1C1E]">{reward.employee}</p>
                      <Badge className="bg-yellow-100 text-yellow-700 font-body text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        {reward.points} poin
                      </Badge>
                    </div>
                    <p className="text-sm font-body text-hrd">{reward.type}</p>
                    <p className="text-xs text-muted-foreground font-body">{reward.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={reward.status === 'active' ? 'default' : 'secondary'}
                    className={`font-body ${reward.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {reward.status === 'active' ? 'Aktif' : 'Diklaim'}
                  </Badge>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{reward.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HRDModule() {
  return (
    <NotificationProvider>
      <ModuleLayout moduleId="hrd" title="HRD" navItems={navItems}>
        <Routes>
          <Route index element={<HRDDashboard />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="recruitment" element={<PlaceholderPage title="Rekrutmen" />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="payroll" element={<PayrollManagement />} />
          <Route path="rewards" element={<RewardManagement />} />
        </Routes>
      </ModuleLayout>
    </NotificationProvider>
  );
}
