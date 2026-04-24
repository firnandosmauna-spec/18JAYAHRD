import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
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
  Users,
  RefreshCcw,
  UserX,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { settingsService } from '@/services/settingsService';
import { AttendanceSettings, PayrollSettings } from '@/types/settings';

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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function calculateWorkHours(checkIn?: string, checkOut?: string): string {
  if (!checkIn || !checkOut || typeof checkIn !== 'string' || typeof checkOut !== 'string' || !checkIn.includes(':') || !checkOut.includes(':')) return '-';

  const [inHour, inMinute] = checkIn.split(':').map(Number);
  const [outHour, outMinute] = checkOut.split(':').map(Number);

  const inTime = inHour * 60 + inMinute;
  const outTime = outHour * 60 + outMinute;

  const diffMinutes = outTime - inTime;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}j ${minutes}m`;
}

function NativeSelect({
  value,
  onChange,
  className = '',
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </select>
  );
}

function InlineModal({
  title,
  description,
  onClose,
  maxWidth = 'max-w-md',
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 space-y-1">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="font-body text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// Konstanta ini sekarang akan didapat dari database settings
let WORK_START_WEEKDAY = '08:00';
let WORK_END_WEEKDAY = '17:00';
let WORK_START_SATURDAY = '08:00';
let WORK_END_SATURDAY = '13:00';
let LATE_TOLERANCE_MINUTES = 5;
const MAX_LATE_PER_MONTH = 5;

// Fungsi untuk mendapatkan jam kerja berdasarkan tanggal
function getWorkSchedule(dateString?: string, holidays: string[] = []): { start: string; end: string; isHoliday: boolean } {
  const defaultSchedule = { start: WORK_START_WEEKDAY, end: WORK_END_WEEKDAY, isHoliday: false };
  if (!dateString) return defaultSchedule;

  const date = new Date(dateString);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dateFormatted = dateString.split('T')[0];

  // Check manual holidays
  if (holidays.includes(dateFormatted)) {
    return { ...defaultSchedule, isHoliday: true };
  }

  // Minggu (Sunday) is usually holiday
  if (day === 0) {
    return { ...defaultSchedule, isHoliday: true };
  }

  // Sabtu (Saturday)
  if (day === 6) {
    return { start: WORK_START_SATURDAY, end: WORK_END_SATURDAY, isHoliday: false };
  }

  // Senin - Jumat
  return defaultSchedule;
}

// Fungsi untuk menentukan status berdasarkan jam check in
function determineAttendanceStatus(checkIn?: string, dateString?: string, holidays: string[] = []): 'present' | 'late' | 'holiday' {
  const schedule = getWorkSchedule(dateString, holidays);
  
  if (schedule.isHoliday) return 'holiday';
  if (!checkIn || typeof checkIn !== 'string' || !checkIn.includes(':')) return 'present';

  const [checkInHour, checkInMinute] = checkIn.split(':').map(Number);
  const [workHour, workMinute] = (schedule.start || '08:00').split(':').map(Number);

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


  const historyRef = React.useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString('en-CA');
  const todayDate = new Date();
  const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(today);

  const { attendance, loading, error, addAttendance, refetch, deleteAttendance, approveManualAttendance, rejectManualAttendance } = useAttendance(startDate, endDate);

  const { employees } = useEmployees();
  const { leaveRequests } = useLeaveRequests();
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    console.log('Attendance: Loaded leaveRequests count:', leaveRequests?.length);
  }, [leaveRequests]);

  // Track online users
  // const { onlineUsers } = usePresence();
  const onlineUsers: any[] = [];

  // DEBUG: Temporary log to screen
  // console.log('Current Online Users:', onlineUsers); 
  // Uncomment below to see on UI if needed, but for now just log


  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'summary' | 'manual'>('today');

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [penaltyRate, setPenaltyRate] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [isUpdatingHolidays, setIsUpdatingHolidays] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [aSettings, pSettings] = await Promise.all([
          settingsService.getAttendanceSettings(),
          settingsService.getPayrollSettings()
        ]);

        setPenaltyRate(aSettings.attendance_late_penalty);
        setAttendanceSettings(aSettings);
        setPayrollSettings(pSettings);

        // Update local variables for logic functions
        WORK_START_WEEKDAY = aSettings.work_start_time_weekday;
        WORK_END_WEEKDAY = aSettings.work_end_time_weekday;
        WORK_START_SATURDAY = aSettings.work_start_time_saturday;
        WORK_END_SATURDAY = aSettings.work_end_time_saturday;
        LATE_TOLERANCE_MINUTES = aSettings.attendance_late_tolerance;
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const [formData, setFormData] = useState<AttendanceFormData>({
    employee_id: '',
    date: today,
    check_in: '',
    check_out: '',
    status: 'present',
    location: '',
    notes: ''
  });

  // Filter attendance based on search and role
  const filteredAttendance = attendance.filter(att => {
    const employee = employees.find(emp => emp.id === att.employee_id);
    const employeeName = employee?.name || '';
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmployee = selectedEmployeeFilter === 'all' || att.employee_id === selectedEmployeeFilter;

    // If staff, only show their own attendance
    if (user?.role === 'staff') {
      return matchesSearch && att.employee_id === user.employee_id;
    }

    return matchesSearch && matchesEmployee;
  });

  // Get today's attendance
  const todayAttendance = attendance.filter(att => att.date === today);

  const filteredTodayAttendance = todayAttendance.filter(att => {
    const employee = employees.find(emp => emp.id === att.employee_id);
    const employeeName = employee?.name || '';
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmployee = selectedEmployeeFilter === 'all' || att.employee_id === selectedEmployeeFilter;

    if (user?.role === 'staff') {
      return matchesSearch && att.employee_id === user.employee_id;
    }
    return matchesSearch && matchesEmployee;
  });

  // Calculate employees who haven't clocked in at all today
  // Modified: Logic to exclude holidays
  const isTodayHoliday = getWorkSchedule(today, attendanceSettings?.attendance_holidays || []).isHoliday;

  const notPresentToday = isTodayHoliday ? [] : employees.filter(emp => {
    const isTukang = (emp.position || '').toLowerCase().includes('tukang') || 
                    (emp.position || '').toLowerCase().includes('pekerja') ||
                    (emp.departments?.name || '').toLowerCase().includes('lapangan');
    
    // Jika Tukang dan absensi online tidak wajib, jangan tampilkan di daftar "Belum Absen"
    if (!attendanceSettings?.worker_attendance_required && isTukang) {
      return false;
    }

    // Check if employee is on approved leave for today
    const isOnLeave = leaveRequests?.some(leave => {
      if (!leave.start_date || !leave.end_date || leave.status !== 'approved') return false;
      if (leave.employee_id !== emp.id) return false;
      
      const start = leave.start_date.split('T')[0];
      const end = leave.end_date.split('T')[0];
      
      return today >= start && today <= end;
    });

    if (isOnLeave) return false;

    return !todayAttendance.some(att => att.employee_id === emp.id);
  });

  // Optimized Presence Grid for History
  const historyPresenceGrid = React.useMemo(() => {
    if (!startDate || !endDate) return filteredAttendance;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Safety limit: if range > 40 days, just show real records to avoid crash
    if (diffDays > 40) return filteredAttendance;

    const dates = [];
    let curr = new Date(startDate);
    const last = new Date(endDate);
    while (curr <= last) {
      dates.push(new Date(curr).toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // Index attendance for fast lookup: date_empId -> record
    const attMap = new Map();
    attendance.forEach(a => attMap.set(`${a.date}-${a.employee_id}`, a));

    // Index leaves: empId_date -> leave
    // (A bit simplified, but effective for this context)
    
    const grid: any[] = [];
    const filteredEmployees = employees.filter(emp => {
       const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
       const matchesEmployee = selectedEmployeeFilter === 'all' || emp.id === selectedEmployeeFilter;
       if (user?.role === 'staff') return emp.id === user.employee_id;
       return matchesSearch && matchesEmployee;
    });

    dates.forEach(date => {
      const schedule = getWorkSchedule(date, attendanceSettings?.attendance_holidays || []);
      
      filteredEmployees.forEach(emp => {
        const key = `${date}-${emp.id}`;
        const attRecord = attMap.get(key);
        
        if (attRecord) {
          grid.push(attRecord);
        } else {
          // Check for approved leave
          const leaveInfo = leaveRequests?.find(leave => 
            leave.employee_id === emp.id && 
            leave.status === 'approved' &&
            date >= (leave.start_date?.split('T')[0] || '') &&
            date <= (leave.end_date?.split('T')[0] || '')
          );

          grid.push({
            id: `vhist-${emp.id}-${date}`,
            employee_id: emp.id,
            date: date,
            check_in: null,
            check_out: null,
            status: leaveInfo ? 'leave' : (schedule.isHoliday ? 'holiday' : 'absent'),
            notes: leaveInfo ? `Cuti: ${leaveInfo.reason}` : null,
            is_virtual: true
          });
        }
      });
    });

    return grid.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, employees, leaveRequests, startDate, endDate, searchQuery, selectedEmployeeFilter, user, attendanceSettings, filteredAttendance]);

  // Calculate statistics
  const requiredEmployeesCount = employees.filter(emp => {
    const isTukang = (emp.position || '').toLowerCase().includes('tukang') || 
                    (emp.position || '').toLowerCase().includes('pekerja') ||
                    (emp.departments?.name || '').toLowerCase().includes('lapangan');
    return attendanceSettings?.worker_attendance_required || !isTukang;
  }).length;

  const stats = {
    totalEmployees: employees.length,
    presentToday: todayAttendance.filter(att => ['present', 'late'].includes(att.status)).length,
    lateToday: todayAttendance.filter(att => att.status === 'late').length,
    absentToday: isTodayHoliday ? 0 : todayAttendance.filter(att => att.status === 'absent').length,
    isHoliday: isTodayHoliday,
    notYetPresentToday: notPresentToday.length,
    attendanceRate: requiredEmployeesCount > 0 ?
      Math.min(100, Math.round((todayAttendance.filter(att => ['present', 'late'].includes(att.status)).length / requiredEmployeesCount) * 100)) : 0
  };

  // Unified Presence Grid for Today
  const todayPresenceGrid = React.useMemo(() => {
    return employees.filter(emp => {
      const isTukang = (emp.position || '').toLowerCase().includes('tukang') || 
                      (emp.position || '').toLowerCase().includes('pekerja') ||
                      (emp.departments?.name || '').toLowerCase().includes('lapangan');
      
      // Filter by search and selected employee
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployee = selectedEmployeeFilter === 'all' || emp.id === selectedEmployeeFilter;
      
      if (user?.role === 'staff') {
        return matchesSearch && emp.id === user.employee_id;
      }
      
      // Jika Tukang dan absensi online tidak wajib, jangan tampilkan jika belum absen
      const attRecord = todayAttendance.find(att => att.employee_id === emp.id);
      if (!attendanceSettings?.worker_attendance_required && isTukang && !attRecord) {
        return false;
      }

      return matchesSearch && matchesEmployee;
    }).map(emp => {
      const attRecord = todayAttendance.find(att => att.employee_id === emp.id);
      
      if (attRecord) return attRecord;

      // Check for approved leave
      const leaveInfo = leaveRequests?.find(leave => 
        leave.employee_id === emp.id && 
        leave.status === 'approved' &&
        today >= (leave.start_date?.split('T')[0] || '') &&
        today <= (leave.end_date?.split('T')[0] || '')
      );

      return {
        id: `virtual-${emp.id}`,
        employee_id: emp.id,
        date: today,
        check_in: null,
        check_out: null,
        status: leaveInfo ? 'leave' : (isTodayHoliday ? 'holiday' : 'absent'),
        notes: leaveInfo ? `Cuti: ${leaveInfo.reason}` : null,
        is_virtual: true
      } as any;
    });
  }, [employees, todayAttendance, leaveRequests, today, isTodayHoliday, searchQuery, selectedEmployeeFilter, user, attendanceSettings]);

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

      await addAttendance(newAttendance);

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

  // Handle holidays
  const handleAddHoliday = async (date: string) => {
    try {
      if (!date) return;
      if (attendanceSettings?.attendance_holidays.includes(date)) {
        toast({ title: 'Info', description: 'Tanggal ini sudah ada di daftar libur' });
        return;
      }

      setIsUpdatingHolidays(true);
      const newHolidays = [...(attendanceSettings?.attendance_holidays || []), date];
      await settingsService.updateSetting('attendance_holidays', JSON.stringify(newHolidays));
      
      setAttendanceSettings(prev => prev ? { ...prev, attendance_holidays: newHolidays } : null);
      toast({ title: 'Berhasil', description: 'Hari libur ditambahkan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambah hari libur', variant: 'destructive' });
    } finally {
      setIsUpdatingHolidays(false);
    }
  };

  const handleRemoveHoliday = async (date: string) => {
    try {
      setIsUpdatingHolidays(true);
      const newHolidays = (attendanceSettings?.attendance_holidays || []).filter(d => d !== date);
      await settingsService.updateSetting('attendance_holidays', JSON.stringify(newHolidays));
      
      setAttendanceSettings(prev => prev ? { ...prev, attendance_holidays: newHolidays } : null);
      toast({ title: 'Berhasil', description: 'Hari libur dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus hari libur', variant: 'destructive' });
    } finally {
      setIsUpdatingHolidays(false);
    }
  };

  // Handle update check out dengan notifikasi
  const handleCheckOut = async (attendanceId: string, employeeId: string, checkOutTime: string) => {
    try {
      // Update check out
      await attendanceService.update(attendanceId, {
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

  const calculatePenalty = (record: AttendanceRecord): number => {
    const status = (record.status || '').toLowerCase().trim();

    // --- Absence Deduction Formula based on active payroll allowance settings ---
    if (['absent', 'tidak hadir', 'alpha', 'alpa'].includes(status)) {
      const workingDays = 26;
      const employee = employees.find(e => e.id === record.employee_id);
      const isWorker = (employee?.position || '').toLowerCase().includes('tukang') || 
                      (employee?.position || '').toLowerCase().includes('pekerja');
      
      const allowances = isWorker ? [] : (employee?.allowances || []);
      const empPos = allowances.find((a: any) => 
        a.title?.toLowerCase().includes('jabatan') || 
        a.title?.toLowerCase().includes('position')
      );
      
      const positionAllowance = empPos ? empPos.amount : 0;
      return Math.round(positionAllowance / workingDays);
    }

    // --- Late Penalty ---
    if (status === 'late' && record.check_in && typeof record.check_in === 'string' && record.check_in.includes(':') && penaltyRate > 0) {
      const schedule = getWorkSchedule(record.date);
      const [checkInHour, checkInMinute] = record.check_in.split(':').map(Number);
      const [workHour, workMinute] = (schedule.start || '08:00').split(':').map(Number);

      const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
      const workStartTotalMinutes = workHour * 60 + workMinute;
      const lateThreshold = workStartTotalMinutes + LATE_TOLERANCE_MINUTES;

      if (checkInTotalMinutes > lateThreshold) {
        const minutesLate = checkInTotalMinutes - lateThreshold;
        return minutesLate * penaltyRate;
      }
    }

    return 0;
  };

  // Handle view attendance details
  const handleViewAttendance = (attendance: AttendanceRecord) => {
    setSelectedAttendance(attendance);
    setIsEditing(false); // Reset editing state
    setShowViewDialog(true);
  };

  // Handle Update Attendance
  const handleUpdateAttendance = async () => {
    try {
      if (!selectedAttendance) return;

      const workHours = calculateWorkHours(formData.check_in, formData.check_out);

      const updates = {
        check_in: formData.check_in || null,
        check_out: formData.check_out || null,
        status: formData.status,
        work_hours: workHours !== '-' ? workHours : null,
        location: formData.location || null,
        notes: formData.notes || null,
        date: formData.date
      };

      await attendanceService.update(selectedAttendance.id, updates);

      refetch();
      setIsEditing(false);
      setShowViewDialog(false);

      toast({
        title: 'Berhasil',
        description: 'Data absensi berhasil diperbarui',
      });
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast({
        title: 'Error',
        description: 'Gagal memperbarui data absensi',
        variant: 'destructive'
      });
    }
  };

  const scrollToHistory = () => {
    setActiveTab('history');
    setTimeout(() => {
      historyRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle Reset Single Late Status
  const handleResetStatus = async (id: string) => {
    try {
      if (!confirm('Apakah Anda yakin ingin mereset status keterlambatan ini menjadi Hadir?')) {
        return;
      }

      await attendanceService.resetLateStatus(id);

      // Refresh data
      refetch();
      setShowViewDialog(false);

      toast({
        title: 'Berhasil',
        description: 'Status absensi telah direset menjadi Hadir',
      });
    } catch (error: any) {
      console.error('Failed to reset status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mereset status absensi',
        variant: 'destructive'
      });
    }
  };

  // Handle Bulk Reset Late Status
  const handleResetAllLate = async () => {
    try {
      const isPerEmployee = selectedEmployeeFilter !== 'all';
      const employeeName = isPerEmployee
        ? employees.find(e => e.id === selectedEmployeeFilter)?.name || 'Karyawan'
        : 'SEMUA karyawan';

      if (!confirm(`Apakah Anda yakin ingin mereset keterlambatan untuk ${employeeName} dari periode ${startDate} sampai ${endDate}?`)) {
        return;
      }

      const results = isPerEmployee
        ? await attendanceService.resetEmployeeLateRecords(selectedEmployeeFilter, startDate, endDate)
        : await attendanceService.resetAllLateRecords(startDate, endDate);

      // Refresh data
      refetch();

      toast({
        title: 'Berhasil',
        description: `${results?.length || 0} data absensi telah direset menjadi Hadir`,
      });
    } catch (error) {
      console.error('Failed to reset records:', error);
      toast({
        title: 'Error',
        description: 'Gagal mereset data absensi',
        variant: 'destructive'
      });
    }
  };

  // Handle Delete Attendance
  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAttendance(id);
      toast({
        title: 'Berhasil',
        description: 'Data absensi telah dihapus',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const handleApproveManual = async (id: string) => {
    if (!user?.employee_id) {
      toast({ 
        title: 'Akses Ditolak', 
        description: 'Anda harus tertaut ke data Karyawan untuk menyetujui absensi.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await approveManualAttendance(id, user.employee_id);
      toast({ title: 'Berhasil', description: 'Absensi manual disetujui' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectManual = async (id: string) => {
    if (!user?.employee_id) {
      toast({ 
        title: 'Akses Ditolak', 
        description: 'Anda harus tertaut ke data Karyawan untuk menolak absensi.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectManualAttendance(id, user.employee_id);
      toast({ title: 'Berhasil', description: 'Absensi manual ditolak' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body"><span>Memuat data absensi...</span></p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription><span>Error memuat data: {error}</span></AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Attendance Section - Show for everyone but especially important for staff */}
      <div className="mb-8">
        <UserAttendance onViewHistory={scrollToHistory} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]"><span>Manajemen Absensi</span></h1>
          <p className="text-muted-foreground font-body"><span>Kelola kehadiran dan absensi karyawan</span></p>
        </div>
        {user?.role !== 'staff' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 font-body"
              onClick={() => setShowHolidayDialog(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span>Atur Hari Libur</span>
            </Button>
            <Button
              className="bg-hrd hover:bg-hrd-dark font-body"
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Catat Absensi</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters & Export */}
      {user?.role !== 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari karyawan..."
              className="pl-10 font-body"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <NativeSelect value={selectedEmployeeFilter} onChange={setSelectedEmployeeFilter} className="font-body">
                <option value="all">Semua Karyawan</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
          <div className="flex gap-2 col-span-1 md:col-span-2 justify-end">
            <Button variant="outline" className="font-body" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {user?.role !== 'staff' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs"><span>Total</span></Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.totalEmployees}</p>
                  <p className="text-sm text-muted-foreground font-body"><span>Total Karyawan</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs"><span>Hari Ini</span></Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.presentToday}</p>
                  <p className="text-sm text-muted-foreground font-body"><span>Hadir</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs"><span>Hari Ini</span></Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.lateToday}</p>
                  <p className="text-sm text-muted-foreground font-body"><span>Terlambat</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <UserX className="w-6 h-6 text-orange-600" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs"><span>Hari Ini</span></Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.notYetPresentToday}</p>
                  <p className="text-sm text-muted-foreground font-body"><span>Belum Absen</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-hrd/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-hrd" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs"><span>Rate</span></Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.attendanceRate}%</p>
                  <p className="text-sm text-muted-foreground font-body"><span>Tingkat Kehadiran</span></p>
                  <Progress value={stats.attendanceRate} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className={`grid w-full ${user?.role === 'staff' ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <TabsTrigger value="today" className="font-body">
            <span>{user?.role === 'staff' ? 'Absensi Hari Ini' : 'Hari Ini'}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="font-body">
            <span>Riwayat</span>
          </TabsTrigger>
          {user?.role !== 'staff' && (
            <>
              <TabsTrigger value="summary" className="font-body">
                <span>Ringkasan</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="font-body relative">
                <span>Persetujuan</span>
                {attendance.filter(a => a.is_manual && a.manual_status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                    {attendance.filter(a => a.is_manual && a.manual_status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div>
                <CardTitle className="font-display"><span>Absensi Hari Ini</span></CardTitle>
                <CardDescription className="font-body">
                  <span>Daftar kehadiran karyawan tanggal {formatDate(today)}</span>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body"><span>Karyawan</span></TableHead>
                    <TableHead className="font-body"><span>Check In</span></TableHead>
                    <TableHead className="font-body"><span>Check Out</span></TableHead>
                    <TableHead className="font-body"><span>Status</span></TableHead>
                    <TableHead className="font-body text-right"><span>Aksi</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayPresenceGrid.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <span>Belum ada data absensi hari ini.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayPresenceGrid.map((attendance) => {
                      const employee = employees.find(emp => emp.id === attendance.employee_id);
                      const StatusIcon = statusIcons[attendance.status as AttendanceStatus];

                      return (
                        <TableRow key={attendance.id}>
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
                              <span>{statusLabels[attendance.status as AttendanceStatus]}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {user?.role !== 'staff' && attendance.status === 'late' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                  onClick={() => handleResetStatus(attendance.id)}
                                  title="Reset Status"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                </Button>
                              )}
                              {user?.role !== 'staff' && !attendance.is_virtual && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => {
                                      handleViewAttendance(attendance);
                                      setIsEditing(true);
                                      setFormData({
                                        employee_id: attendance.employee_id,
                                        date: attendance.date,
                                        check_in: attendance.check_in || '',
                                        check_out: attendance.check_out || '',
                                        status: attendance.status as AttendanceStatus,
                                        location: attendance.location || '',
                                        notes: attendance.notes || ''
                                      });
                                    }}
                                    title="Edit Data"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    key={`delete-${attendance.id}`}
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteAttendance(attendance.id)}
                                    disabled={isSubmitting}
                                    title="Hapus Data"
                                  >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </Button>
                                </>
                              )}
                              {!attendance.is_virtual && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewAttendance(attendance)}
                                  title="Detail Data"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab - Visible for everyone now */}
        <TabsContent value="history" className="mt-6" ref={historyRef}>
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display">Riwayat Absensi</CardTitle>
                  <CardDescription className="font-body">
                    Lihat riwayat kehadiran {user?.role === 'staff' ? 'Anda' : 'karyawan'}
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body"><span>Tanggal</span></TableHead>
                    <TableHead className="font-body"><span>Karyawan</span></TableHead>
                    <TableHead className="font-body"><span>Check In</span></TableHead>
                    <TableHead className="font-body"><span>Check Out</span></TableHead>
                    <TableHead className="font-body"><span>Status</span></TableHead>
                    <TableHead className="font-body"><span>Potongan</span></TableHead>
                    {user?.role !== 'staff' && (
                      <TableHead className="font-body text-right"><span>Aksi</span></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyPresenceGrid.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'staff' ? 5 : 6} className="text-center py-8 text-muted-foreground">
                        <span>Tidak ada riwayat absensi untuk periode ini.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyPresenceGrid.map((attendance) => {
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
                              <span>{statusLabels[attendance.status as AttendanceStatus]}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {(() => {
                              const penalty = calculatePenalty(attendance);
                              return penalty > 0 ? (
                                <span className="text-red-600 font-bold">
                                  Rp {penalty.toLocaleString('id-ID')}
                                </span>
                              ) : '-';
                            })()}
                          </TableCell>
                          {user?.role !== 'staff' && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {attendance.status === 'late' && (
                                  <Button
                                    key={`reset-${attendance.id}`}
                                    variant="ghost"
                                    size="icon"
                                    className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    onClick={() => handleResetStatus(attendance.id)}
                                    disabled={isSubmitting}
                                    title="Reset Status"
                                  >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                  </Button>
                                )}
                              {!attendance.is_virtual ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => {
                                      handleViewAttendance(attendance);
                                      setIsEditing(true);
                                      setFormData({
                                        employee_id: attendance.employee_id,
                                        date: attendance.date,
                                        check_in: attendance.check_in || '',
                                        check_out: attendance.check_out || '',
                                        status: attendance.status as AttendanceStatus,
                                        location: attendance.location || '',
                                        notes: attendance.notes || ''
                                      });
                                    }}
                                    title="Edit Data"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteAttendance(attendance.id)}
                                    title="Hapus Data"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : null}
                              {!attendance.is_virtual && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewAttendance(attendance)}
                                  title="Detail Data"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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
                            <div className="text-right">
                              <Badge className="bg-yellow-100 text-yellow-800 font-body mb-1">
                                Terlambat
                              </Badge>
                              <p className="text-[10px] text-red-600 font-bold">
                                - Rp {calculatePenalty(attendance).toLocaleString('id-ID')}
                              </p>
                            </div>
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

              {/* New: Summary Section for Not Yet Present */}
              <Card className="border-gray-200 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-display">Karyawan Belum Absen</CardTitle>
                  <CardDescription className="font-body">
                    Daftar karyawan yang belum tercatat kehadirannya hari ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notPresentToday.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {notPresentToday.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 p-2 border border-gray-100 rounded-md bg-gray-50/50">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium font-body truncate">{emp.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground font-body">Semua karyawan sudah melakukan absensi hari ini</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {user?.role !== 'staff' && (
          <TabsContent value="manual" className="mt-6">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="font-display">Persetujuan Absensi Manual</CardTitle>
                <CardDescription className="font-body">Permintaan absensi di luar jam kerja atau kegiatan luar</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-body"><span>Karyawan</span></TableHead>
                      <TableHead className="font-body"><span>Tanggal</span></TableHead>
                      <TableHead className="font-body"><span>Waktu</span></TableHead>
                      <TableHead className="font-body"><span>Alasan</span></TableHead>
                      <TableHead className="font-body text-right"><span>Aksi</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.filter(a => a.is_manual && a.manual_status === 'pending').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-body">
                          Tidak ada permintaan persetujuan pending.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendance.filter(a => a.is_manual && a.manual_status === 'pending').map((att) => {
                        const employee = employees.find(e => e.id === att.employee_id);
                        return (
                          <TableRow key={att.id}>
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
                            <TableCell className="font-body text-sm">
                              {formatDate(att.date)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {att.check_in || '--:--'} - {att.check_out || '--:--'}
                            </TableCell>
                            <TableCell className="font-body text-sm max-w-[200px] truncate" title={att.manual_reason}>
                              {att.manual_reason}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApproveManual(att.id)}
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                  Setujui
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleRejectManual(att.id)}
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                  Tolak
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Attendance Dialog */}
      {showAddDialog && (
        <InlineModal
          title="Catat Absensi"
          description="Tambah data kehadiran karyawan"
          onClose={() => setShowAddDialog(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Karyawan <span className="text-red-500">*</span></Label>
              <NativeSelect
                value={formData.employee_id}
                onChange={(value) => setFormData({ ...formData, employee_id: value })}
                className="font-body"
              >
                <option value="">Pilih karyawan</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
              </NativeSelect>
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
              <NativeSelect
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as AttendanceStatus })}
                className="font-body"
              >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </NativeSelect>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddAttendance} className="bg-hrd hover:bg-hrd-dark font-body">
              <Clock className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        </InlineModal>
      )}

      {/* View Attendance Details Dialog */}
      {showViewDialog && (
        <InlineModal
          title="Detail Absensi"
          description="Informasi lengkap kehadiran karyawan"
          onClose={() => setShowViewDialog(false)}
          maxWidth="max-w-lg"
        >
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
                {isEditing ? (
                  <>
                    <div className="space-y-2 col-span-2">
                      <Label className="font-body">Tanggal</Label>
                      <Input
                        type="date"
                        className="font-mono"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Status</Label>
                      <NativeSelect
                        value={formData.status}
                        onChange={(value) => setFormData({ ...formData, status: value as AttendanceStatus })}
                        className="font-body"
                      >
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Check In</Label>
                      <Input
                        type="time"
                        className="font-mono"
                        value={formData.check_in}
                        onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                      />
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
                    <div className="space-y-2">
                      <Label className="font-body">Lokasi</Label>
                      <Input
                        className="font-body"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="font-body">Catatan</Label>
                      <Textarea
                        className="font-body"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
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
                    {selectedAttendance.status === 'late' && (
                      <div className="space-y-2 col-span-2 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Label className="font-body text-red-600 font-bold">Potongan Keterlambatan</Label>
                        <p className="font-mono text-lg font-bold text-red-600">
                          Rp {calculatePenalty(selectedAttendance).toLocaleString('id-ID')}
                        </p>
                      </div>
                    )}
                    {selectedAttendance.notes && (
                      <div className="space-y-2 col-span-2">
                        <Label className="font-body text-muted-foreground">Catatan</Label>
                        <p className="font-body p-3 bg-gray-50 rounded-lg">{selectedAttendance.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {selectedAttendance && (
              <div className="flex-1 flex gap-2">
                {user?.role === 'Administrator' && selectedAttendance.status === 'late' && (
                  <Button
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 font-body"
                    onClick={() => handleResetStatus(selectedAttendance.id)}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Reset Status
                  </Button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
                Tutup
              </Button>
              {selectedAttendance && (
                isEditing ? (
                  <Button onClick={handleUpdateAttendance} className="bg-hrd hover:bg-hrd-dark font-body">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setIsEditing(true);
                      setFormData({
                        employee_id: selectedAttendance.employee_id,
                        date: selectedAttendance.date,
                        check_in: selectedAttendance.check_in || '',
                        check_out: selectedAttendance.check_out || '',
                        status: selectedAttendance.status as AttendanceStatus,
                        location: selectedAttendance.location || '',
                        notes: selectedAttendance.notes || ''
                      });
                    }}
                    className="bg-hrd hover:bg-hrd-dark font-body"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Data
                  </Button>
                )
              )}
            </div>
          </div>
        </InlineModal>
      )}

      {/* Holiday Management Dialog */}
      {showHolidayDialog && (
        <InlineModal
          title="Pengaturan Hari Libur"
          description="Pilih tanggal libur agar tidak terdeteksi sebagai mangkir"
          onClose={() => setShowHolidayDialog(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="date"
                id="new-holiday-date"
                className="font-mono flex-1"
                defaultValue={today}
              />
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isUpdatingHolidays}
                onClick={() => {
                  const input = document.getElementById('new-holiday-date') as HTMLInputElement;
                  handleAddHoliday(input.value);
                }}
              >
                Tambah
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-body text-xs">Tanggal Libur</TableHead>
                      <TableHead className="text-right font-body text-xs">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(attendanceSettings?.attendance_holidays || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground">
                          Belum ada hari libur manual
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...(attendanceSettings?.attendance_holidays || [])]
                        .sort((a, b) => b.localeCompare(a))
                        .map(date => (
                        <TableRow key={date}>
                          <TableCell className="font-mono text-sm py-2">
                            {formatDate(date)}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500"
                              disabled={isUpdatingHolidays}
                              onClick={() => handleRemoveHoliday(date)}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            
            <Alert className="bg-purple-50 border-purple-100 py-2">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-[11px] text-purple-800 font-body">
                Hari Minggu secara otomatis terdeteksi sebagai hari libur oleh sistem.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowHolidayDialog(false)} className="font-body">
              Tutup
            </Button>
          </div>
        </InlineModal>
      )}
    </div>
  );
}
