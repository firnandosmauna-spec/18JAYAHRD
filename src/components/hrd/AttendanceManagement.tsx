import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  User,
  MapPin,
  Timer,
  LogIn,
  LogOut,
  Download,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { UserAttendance } from './UserAttendance';
import { exportAttendanceToExcel } from '@/utils/excelGenerator';

// Hooks
import { useAttendance, useEmployees, useLeaveRequests } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import type { AttendanceRecord, LeaveRequest } from '@/lib/supabase';
import { attendanceService, leaveService } from '@/services/supabaseService';

// Types
type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday';

interface AttendanceFormData {
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  location?: string;
  notes?: string;
}

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Hadir',
  late: 'Terlambat',
  absent: 'Tidak Hadir',
  leave: 'Cuti',
  holiday: 'Libur'
};

const statusColors = {
  present: 'bg-green-100 text-green-800 border-green-200',
  late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  absent: 'bg-red-100 text-red-800 border-red-200',
  leave: 'bg-blue-100 text-blue-800 border-blue-200',
  holiday: 'bg-purple-100 text-purple-800 border-purple-200'
};

const statusIcons = {
  present: CheckCircle,
  late: AlertCircle,
  absent: XCircle,
  leave: Calendar,
  holiday: Calendar
};

function formatTime(timeString?: string) {
  if (!timeString) return '-';
  return timeString;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function calculateWorkHours(checkIn?: string, checkOut?: string): string {
  if (!checkIn || !checkOut) return '-';

  const [inHour, inMinute] = checkIn.split(':').map(Number);
  const [outHour, outMinute] = checkOut.split(':').map(Number);

  const inTime = inHour * 60 + inMinute;
  const outTime = outHour * 60 + outMinute;

  const diffMinutes = outTime - inTime;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}j ${minutes}m`;
}

// Konstanta aturan absensi
const DEFAULT_WORK_START = '08:00';
const DEFAULT_WORK_END = '16:00';
const SATURDAY_WORK_END = '15:00';
const LATE_TOLERANCE_MINUTES = 5;
const MAX_LATE_PER_MONTH = 5;

// Fungsi untuk mendapatkan jam kerja berdasarkan tanggal
function getWorkSchedule(dateString?: string): { start: string; end: string } {
  if (!dateString) return { start: DEFAULT_WORK_START, end: DEFAULT_WORK_END };

  const date = new Date(dateString);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Sabtu
  if (day === 6) {
    return { start: DEFAULT_WORK_START, end: SATURDAY_WORK_END };
  }

  // Minggu
  if (day === 0) {
    return { start: DEFAULT_WORK_START, end: DEFAULT_WORK_END }; // Atau libur? Asumsi default
  }

  // Senin - Jumat
  return { start: DEFAULT_WORK_START, end: DEFAULT_WORK_END };
}

// Fungsi untuk menentukan status berdasarkan jam check in
function determineAttendanceStatus(checkIn?: string, dateString?: string): 'present' | 'late' {
  if (!checkIn) return 'present';

  const schedule = getWorkSchedule(dateString);
  const [checkInHour, checkInMinute] = checkIn.split(':').map(Number);
  const [workHour, workMinute] = schedule.start.split(':').map(Number);

  const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
  const workStartTotalMinutes = workHour * 60 + workMinute;
  const lateThreshold = workStartTotalMinutes + LATE_TOLERANCE_MINUTES;

  // Jika check in lebih dari jam masuk + toleransi
  if (checkInTotalMinutes > lateThreshold) {
    return 'late';
  }

  return 'present';
}

// Fungsi untuk menghitung jumlah keterlambatan dalam 1 bulan
async function countLateThisMonth(employeeId: string, currentDate: string): Promise<number> {
  try {
    const date = new Date(currentDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const monthlyAttendance = await attendanceService.getByEmployee(employeeId, month, year);

    // Hitung jumlah keterlambatan (status = 'late') dalam bulan ini
    const lateCount = monthlyAttendance.filter(att => att.status === 'late').length;

    return lateCount;
  } catch (error) {
    console.error('Error counting late attendance:', error);
    return 0;
  }
}

// Fungsi untuk mengecek apakah karyawan terlambat masuk setelah tanggal akhir cuti/izin
async function checkLateReturnFromLeave(employeeId: string, checkInDate: string): Promise<LeaveRequest | null> {
  try {
    // Ambil semua leave requests yang approved untuk karyawan ini
    const allLeaves = await leaveService.getAll();

    // Filter leave yang approved dan untuk karyawan ini
    const employeeLeaves = allLeaves.filter(
      (leave: LeaveRequest) =>
        leave.employee_id === employeeId &&
        leave.status === 'approved'
    );

    // Normalize checkInDate to start of day (midnight) in local timezone for fair comparison
    const checkInDateObj = new Date(checkInDate);
    checkInDateObj.setHours(0, 0, 0, 0); // Normalize to start of day

    for (const leave of employeeLeaves) {
      // Normalize endDate to end of day (23:59:59.999) in local timezone
      const endDate = new Date(leave.end_date);
      endDate.setHours(23, 59, 59, 999); // Set ke akhir hari

      // Compare: if check-in date is after the leave end date, employee is late returning
      // We compare checkInDateObj (start of day) with endDate (end of day)
      // This ensures employees checking in on the leave end date are NOT flagged as late
      if (checkInDateObj > endDate) {
        return leave;
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking late return from leave:', error);
    return null;
  }
}

export function AttendanceManagement() {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const { attendance, loading, error, addAttendance, refetch } = useAttendance(startDate, endDate);
  const { employees } = useEmployees();
  const { user } = useAuth();
  const { toast } = useToast();

  // Track online users
  const { onlineUsers } = usePresence();

  // DEBUG: Temporary log to screen
  // console.log('Current Online Users:', onlineUsers); 
  // Uncomment below to see on UI if needed, but for now just log


  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'summary'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);

  const [formData, setFormData] = useState<AttendanceFormData>({
    employee_id: '',
    date: today,
    check_in: '',
    check_out: '',
    status: 'present',
    location: '',
    notes: ''
  });

  // Filter attendance based on search
  const filteredAttendance = attendance.filter(att => {
    const employee = employees.find(emp => emp.id === att.employee_id);
    const employeeName = employee?.name || '';
    return employeeName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get today's attendance
  const todayAttendance = attendance.filter(att => att.date === today);

  // Calculate statistics
  const stats = {
    totalEmployees: employees.length,
    presentToday: todayAttendance.filter(att => att.status === 'present').length,
    lateToday: todayAttendance.filter(att => att.status === 'late').length,
    absentToday: todayAttendance.filter(att => att.status === 'absent').length,
    attendanceRate: employees.length > 0 ?
      Math.round((todayAttendance.filter(att => ['present', 'late'].includes(att.status)).length / employees.length) * 100) : 0
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: today,
      check_in: '',
      check_out: '',
      status: 'present',
      location: '',
      notes: ''
    });
  };

  // Handle add attendance
  const handleAddAttendance = async () => {
    try {
      if (!formData.employee_id || !formData.date) {
        toast({
          title: 'Error',
          description: 'Mohon lengkapi karyawan dan tanggal',
          variant: 'destructive'
        });
        return;
      }

      // Tentukan status otomatis berdasarkan jam check in jika ada
      let finalStatus = formData.status;
      if (formData.check_in && (formData.status === 'present' || formData.status === 'late')) {
        finalStatus = determineAttendanceStatus(formData.check_in);
      }

      const workHours = calculateWorkHours(formData.check_in, formData.check_out);

      const newAttendance = {
        employee_id: formData.employee_id,
        date: formData.date,
        check_in: formData.check_in || null,
        check_out: formData.check_out || null,
        status: finalStatus,
        work_hours: workHours !== '-' ? workHours : null,
        location: formData.location || null,
        notes: formData.notes || null
      };

      const savedAttendance = await addAttendance(newAttendance);

      // Cek apakah karyawan terlambat masuk setelah tanggal akhir cuti/izin
      if (formData.check_in && formData.date) {
        const lateReturnLeave = await checkLateReturnFromLeave(formData.employee_id, formData.date);

        if (lateReturnLeave) {
          const employee = employees.find(emp => emp.id === formData.employee_id);
          const endDate = new Date(lateReturnLeave.end_date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          const checkInDate = new Date(formData.date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          toast({
            title: 'Peringatan: Terlambat Kembali dari Cuti/Izin',
            description: `${employee?.name || 'Karyawan'} terlambat masuk setelah tanggal akhir cuti/izin. Tanggal akhir cuti: ${endDate}, Tanggal masuk: ${checkInDate}. Harap perhatikan ketepatan waktu kembali bekerja.`,
            variant: 'destructive',
            duration: 12000
          });
        }
      }

      // Jika ada check out, cek apakah perlu menampilkan notifikasi surat peringatan
      if (formData.check_out) {
        const lateCount = await countLateThisMonth(formData.employee_id, formData.date);

        if (lateCount > MAX_LATE_PER_MONTH) {
          const employee = employees.find(emp => emp.id === formData.employee_id);
          toast({
            title: 'Surat Peringatan 1',
            description: `${employee?.name || 'Karyawan'} telah melebihi ${MAX_LATE_PER_MONTH} kali keterlambatan dalam 1 bulan (Total: ${lateCount} kali). Surat peringatan 1 telah diterbitkan.`,
            variant: 'destructive',
            duration: 10000
          });
        }
      }

      setShowAddDialog(false);
      resetForm();

      toast({
        title: 'Berhasil',
        description: 'Data absensi berhasil disimpan',
      });
    } catch (error) {
      console.error('Failed to add attendance:', error);
      toast({
        title: 'Error',
        description: 'Gagal menambah data absensi',
        variant: 'destructive'
      });
    }
  };

  // Handle update check out dengan notifikasi
  const handleCheckOut = async (attendanceId: string, employeeId: string, checkOutTime: string) => {
    try {
      // Update check out
      const updatedAttendance = await attendanceService.update(attendanceId, {
        check_out: checkOutTime
      });

      // Hitung jam kerja
      const attendanceRecord = attendance.find(att => att.id === attendanceId);
      if (attendanceRecord?.check_in) {
        const workHours = calculateWorkHours(attendanceRecord.check_in, checkOutTime);
        await attendanceService.update(attendanceId, {
          work_hours: workHours !== '-' ? workHours : null
        });
      }

      // Cek apakah karyawan terlambat masuk setelah tanggal akhir cuti/izin
      if (attendanceRecord?.date && attendanceRecord?.check_in) {
        const lateReturnLeave = await checkLateReturnFromLeave(employeeId, attendanceRecord.date);

        if (lateReturnLeave) {
          const employee = employees.find(emp => emp.id === employeeId);
          const endDate = new Date(lateReturnLeave.end_date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          const checkInDate = new Date(attendanceRecord.date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          toast({
            title: 'Peringatan: Terlambat Kembali dari Cuti/Izin',
            description: `${employee?.name || 'Karyawan'} terlambat masuk setelah tanggal akhir cuti/izin. Tanggal akhir cuti: ${endDate}, Tanggal masuk: ${checkInDate}. Harap perhatikan ketepatan waktu kembali bekerja.`,
            variant: 'destructive',
            duration: 12000
          });
        }
      }

      // Cek jumlah keterlambatan bulan ini
      const lateCount = await countLateThisMonth(employeeId, attendanceRecord?.date || today);

      if (lateCount > MAX_LATE_PER_MONTH) {
        const employee = employees.find(emp => emp.id === employeeId);
        toast({
          title: 'Surat Peringatan 1',
          description: `${employee?.name || 'Karyawan'} telah melebihi ${MAX_LATE_PER_MONTH} kali keterlambatan dalam 1 bulan (Total: ${lateCount} kali). Surat peringatan 1 telah diterbitkan.`,
          variant: 'destructive',
          duration: 10000
        });
      }

      // Refresh data
      refetch();

      toast({
        title: 'Berhasil',
        description: 'Check out berhasil dicatat',
      });
    } catch (error) {
      console.error('Failed to update check out:', error);
      toast({
        title: 'Error',
        description: 'Gagal mencatat check out',
        variant: 'destructive'
      });
    }
  };

  // Handle view attendance details
  const handleViewAttendance = (attendance: AttendanceRecord) => {
    setSelectedAttendance(attendance);
    setShowViewDialog(true);
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    try {
      if (attendance.length === 0) {
        toast({
          title: 'Info',
          description: 'Tidak ada data absensi untuk diexport',
          variant: 'default'
        });
        return;
      }

      const date = new Date(startDate);
      exportAttendanceToExcel(attendance, employees, {
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });

      toast({
        title: 'Berhasil Export',
        description: 'Laporan absensi berhasil didownload',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Error Export',
        description: 'Gagal mengexport data. Pastikan library xlsx terinstall.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat data absensi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error memuat data: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}





      {/* User Attendance Section - Show for everyone but especially important for staff */}
      <div className="mb-8">
        <UserAttendance />
      </div>

      {/* DEBUG PANEL REMOVED */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Absensi</h1>
          <p className="text-muted-foreground font-body">Kelola kehadiran dan absensi karyawan</p>
        </div>
        {user?.role !== 'staff' && (
          <Button
            className="bg-hrd hover:bg-hrd-dark font-body"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Catat Absensi
          </Button>
        )}
      </div>

      {/* Export Button & Filters (Optional placement) */}
      {user?.role !== 'staff' && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" className="font-body" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Export Laporan Bulanan (Excel)
          </Button>
        </div>
      )}

      {/* Statistics Cards */}
      {user?.role !== 'staff' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Total
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.totalEmployees}</p>
                  <p className="text-sm text-muted-foreground font-body">Total Karyawan</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Hari Ini
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.presentToday}</p>
                  <p className="text-sm text-muted-foreground font-body">Hadir</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Hari Ini
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.lateToday}</p>
                  <p className="text-sm text-muted-foreground font-body">Terlambat</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Hari Ini
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.absentToday}</p>
                  <p className="text-sm text-muted-foreground font-body">Tidak Hadir</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-hrd/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-hrd" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    Rate
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.attendanceRate}%</p>
                  <p className="text-sm text-muted-foreground font-body">Tingkat Kehadiran</p>
                  <Progress value={stats.attendanceRate} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        {user?.role === 'staff' ? (
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="today" className="font-body">
              Absensi Hari Ini
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" className="font-body">
              Hari Ini
            </TabsTrigger>
            <TabsTrigger value="history" className="font-body">
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="summary" className="font-body">
              Ringkasan
            </TabsTrigger>
          </TabsList>
        )}

        {/* Today Tab */}
        <TabsContent value="today" className="mt-6">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display">Absensi Hari Ini</CardTitle>
                  <CardDescription className="font-body">
                    {formatDate(today)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari karyawan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 font-body w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Karyawan</TableHead>
                    <TableHead className="font-body">Check In</TableHead>
                    <TableHead className="font-body">Check Out</TableHead>
                    <TableHead className="font-body">Jam Kerja</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body">Lokasi</TableHead>
                    {user?.role !== 'staff' && (
                      <TableHead className="font-body text-right">Aksi</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {todayAttendance.filter(att => {
                      const employee = employees.find(emp => emp.id === att.employee_id);
                      const employeeName = employee?.name || '';
                      return employeeName.toLowerCase().includes(searchQuery.toLowerCase());
                    }).map((attendance) => {
                      const employee = employees.find(emp => emp.id === attendance.employee_id);
                      const StatusIcon = statusIcons[attendance.status as AttendanceStatus];

                      return (
                        <motion.tr
                          key={attendance.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="group"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                                  {employee?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium font-body">{employee?.name || 'Unknown'}</span>
                                  {onlineUsers.some(u => u.employee_id === employee?.id) && (
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" title="Online" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground font-body">{employee?.position}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attendance.check_in ? (
                              <div className="flex items-center gap-1">
                                <LogIn className="w-3 h-3 text-green-500" />
                                {formatTime(attendance.check_in)}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attendance.check_out ? (
                              <div className="flex items-center gap-1">
                                <LogOut className="w-3 h-3 text-red-500" />
                                {formatTime(attendance.check_out)}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attendance.work_hours || calculateWorkHours(attendance.check_in, attendance.check_out)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[attendance.status as AttendanceStatus]} font-body`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusLabels[attendance.status as AttendanceStatus]}
                            </Badge>
                            {attendance.status === 'late' && attendance.check_in && (
                              <div className="mt-1 text-xs text-red-600 font-medium font-mono">
                                Denda: Rp {(
                                  (parseInt(attendance.check_in.split(':')[0]) * 60 + parseInt(attendance.check_in.split(':')[1]) - (8 * 60)) * 1000
                                ).toLocaleString('id-ID')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-body text-sm">
                            {attendance.location ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                {attendance.location}
                              </div>
                            ) : '-'}
                          </TableCell>
                          {user?.role !== 'staff' && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {attendance.check_in && !attendance.check_out && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-body"
                                    onClick={() => {
                                      const now = new Date();
                                      const checkOutTime = now.toTimeString().slice(0, 5);
                                      handleCheckOut(attendance.id, attendance.employee_id, checkOutTime);
                                    }}
                                  >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Check Out
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="font-body"
                                      onClick={() => handleViewAttendance(attendance)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Lihat Detail
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="font-body">
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="font-body text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Hapus
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab - Only for non-staff users */}
        {user?.role !== 'staff' && (
          <TabsContent value="history" className="mt-6">
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display">Riwayat Absensi</CardTitle>
                    <CardDescription className="font-body">
                      Lihat riwayat kehadiran karyawan
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="font-mono"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="font-mono"
                    />
                    <Button variant="outline" className="font-body">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-body">Tanggal</TableHead>
                      <TableHead className="font-body">Karyawan</TableHead>
                      <TableHead className="font-body">Check In</TableHead>
                      <TableHead className="font-body">Check Out</TableHead>
                      <TableHead className="font-body">Status</TableHead>
                      <TableHead className="font-body text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((attendance) => {
                      const employee = employees.find(emp => emp.id === attendance.employee_id);
                      const StatusIcon = statusIcons[attendance.status as AttendanceStatus];

                      return (
                        <TableRow key={attendance.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(attendance.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                                  {employee?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium font-body">{employee?.name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatTime(attendance.check_in)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatTime(attendance.check_out)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[attendance.status as AttendanceStatus]} font-body`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusLabels[attendance.status as AttendanceStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewAttendance(attendance)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Summary Tab - Only for non-staff users */}
        {user?.role !== 'staff' && (
          <TabsContent value="summary" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="font-display">Ringkasan Kehadiran</CardTitle>
                  <CardDescription className="font-body">
                    Statistik kehadiran bulan ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-body">Tingkat Kehadiran</span>
                      <span className="font-mono font-bold">{stats.attendanceRate}%</span>
                    </div>
                    <Progress value={stats.attendanceRate} className="h-2" />

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="font-mono text-2xl font-bold text-green-600">{stats.presentToday}</p>
                        <p className="text-sm text-green-700 font-body">Hadir Hari Ini</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <p className="font-mono text-2xl font-bold text-red-600">{stats.absentToday}</p>
                        <p className="text-sm text-red-700 font-body">Tidak Hadir</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="font-display">Karyawan Terlambat</CardTitle>
                  <CardDescription className="font-body">
                    Daftar karyawan yang sering terlambat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayAttendance
                      .filter(att => att.status === 'late')
                      .slice(0, 5)
                      .map((attendance) => {
                        const employee = employees.find(emp => emp.id === attendance.employee_id);
                        return (
                          <div key={attendance.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-yellow-200 text-yellow-800 font-body text-xs">
                                {employee?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium font-body">{employee?.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground font-body">
                                Check in: {formatTime(attendance.check_in)}
                              </p>
                            </div>
                            <Badge className="bg-yellow-100 text-yellow-800 font-body">
                              Terlambat
                            </Badge>
                          </div>
                        );
                      })}

                    {todayAttendance.filter(att => att.status === 'late').length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground font-body">Tidak ada karyawan yang terlambat hari ini</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Attendance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Catat Absensi</DialogTitle>
            <DialogDescription className="font-body">
              Tambah data kehadiran karyawan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Karyawan <span className="text-red-500">*</span></Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="font-body">
                      {emp.name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Tanggal <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                className="font-mono"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Status <span className="text-red-500">*</span></Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as AttendanceStatus })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-body">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.status === 'present' || formData.status === 'late') && (
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 font-body text-sm">
                    <strong>Aturan Absensi:</strong> Jam masuk 08:00, toleransi 5 menit.
                    Jika terlambat lebih dari 3 kali per bulan, akan mendapat surat peringatan 1.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body">Check In</Label>
                    <Input
                      type="time"
                      className="font-mono"
                      value={formData.check_in}
                      onChange={(e) => {
                        const checkInTime = e.target.value;
                        // Otomatis tentukan status berdasarkan jam check in
                        const autoStatus = determineAttendanceStatus(checkInTime);
                        setFormData({
                          ...formData,
                          check_in: checkInTime,
                          status: autoStatus
                        });
                      }}
                    />
                    {formData.check_in && (
                      <p className="text-xs text-muted-foreground font-body">
                        Status: {statusLabels[determineAttendanceStatus(formData.check_in)]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Check Out</Label>
                    <Input
                      type="time"
                      className="font-mono"
                      value={formData.check_out}
                      onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-body">Lokasi</Label>
                  <Input
                    placeholder="Kantor Pusat, WFH, dll."
                    className="font-body"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="font-body">Catatan</Label>
              <Textarea
                placeholder="Catatan tambahan..."
                className="font-body"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddAttendance} className="bg-hrd hover:bg-hrd-dark font-body">
              <Clock className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Attendance Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Absensi</DialogTitle>
            <DialogDescription className="font-body">
              Informasi lengkap kehadiran karyawan
            </DialogDescription>
          </DialogHeader>
          {selectedAttendance && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                    {employees.find(emp => emp.id === selectedAttendance.employee_id)?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-display font-bold text-[#1C1C1E]">
                    {employees.find(emp => emp.id === selectedAttendance.employee_id)?.name || 'Unknown'}
                  </h3>
                  <p className="text-muted-foreground font-body">
                    {employees.find(emp => emp.id === selectedAttendance.employee_id)?.position || 'Unknown Position'}
                  </p>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Tanggal</Label>
                  <p className="font-mono font-medium">{formatDate(selectedAttendance.date)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Status</Label>
                  <Badge className={`${statusColors[selectedAttendance.status as AttendanceStatus]} font-body w-fit`}>
                    {React.createElement(statusIcons[selectedAttendance.status as AttendanceStatus], { className: "w-3 h-3 mr-1" })}
                    {statusLabels[selectedAttendance.status as AttendanceStatus]}
                  </Badge>
                </div>
                {selectedAttendance.check_in && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Check In</Label>
                    <p className="font-mono font-medium">{formatTime(selectedAttendance.check_in)}</p>
                  </div>
                )}
                {selectedAttendance.check_out && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Check Out</Label>
                    <p className="font-mono font-medium">{formatTime(selectedAttendance.check_out)}</p>
                  </div>
                )}
                {selectedAttendance.work_hours && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Jam Kerja</Label>
                    <p className="font-mono font-medium">{selectedAttendance.work_hours}</p>
                  </div>
                )}
                {selectedAttendance.location && (
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Lokasi</Label>
                    <p className="font-body font-medium">{selectedAttendance.location}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedAttendance.notes && (
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Catatan</Label>
                  <p className="font-body p-3 bg-gray-50 rounded-lg">{selectedAttendance.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
              Tutup
            </Button>
            <Button className="bg-hrd hover:bg-hrd-dark font-body">
              <Edit className="w-4 h-4 mr-2" />
              Edit Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}