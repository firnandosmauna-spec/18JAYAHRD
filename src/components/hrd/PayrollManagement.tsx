import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  User,
  CreditCard,
  Download,
  Eye,
  Edit,
  Trash2,
  Calculator,
  TrendingUp,
  Wallet,
  FileText,
  Send,
  Printer,
  Info,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
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
import { generateSalarySlip, generatePayrollReport } from '@/utils/pdfGenerator';
import { exportPayrollToExcel } from '@/utils/excelGenerator';
import { PayrollPrintSettingsDialog } from './PayrollPrintSettingsDialog';
import { usePayroll, useEmployees, useLoans } from '@/hooks/useSupabase';
import { attendanceService, rewardService, leaveService } from '@/services/supabaseService';
import { userService } from '@/services/userService';
import { settingsService } from '@/services/settingsService';
import { DEFAULT_PAYROLL_SETTINGS, PayrollSettings, DEFAULT_ATTENDANCE_SETTINGS, AttendanceSettings } from '@/types/settings';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollRecord } from '@/lib/supabase';

// Types
type PayrollStatus = 'pending' | 'paid' | 'cancelled';

interface PayrollFormData {
  start_date: string;
  end_date: string;

  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: string;
  allowances: string; // Tunjangan Lain-lain
  deductions: string; // Potongan Lain-lain
  overtime_hours?: string;
  overtime_rate?: string;
  // New Fields
  gasoline_allowance: string;
  meal_allowance: string;
  position_allowance: string;
  discretionary_allowance: string;
  thr_allowance: string;

  bpjs_deduction: string;
  absent_deduction: string;
  late_deduction: string;
  reward_allowance: string;
  loan_amount: string;
  manual_allowance_details: { title: string, amount: number }[];
  manual_deduction_details: { title: string, amount: number }[];
  bank_account_details: string;
  is_perfect_attendance: boolean;
}

const statusLabels: Record<PayrollStatus | 'unprocessed', string> = {
  pending: 'Menunggu',
  paid: 'Dibayar',
  cancelled: 'Dibatalkan',
  unprocessed: 'Belum Diproses'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  unprocessed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusIcons = {
  pending: AlertCircle,
  paid: CheckCircle,
  cancelled: XCircle,
  unprocessed: Loader2
};

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function NativeSelect({
  value,
  onChange,
  children,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    >
      {children}
    </select>
  );
}

function InlineModal({
  title,
  description,
  onClose,
  maxWidth = 'max-w-2xl',
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function isWorkerEmployee(employee: any) {
  if (!employee) return false;

  const position = (employee.position || "").toLowerCase();
  const department = (employee.department || "").toLowerCase();
  const departmentName = (employee.departments?.name || "").toLowerCase();
  const workerKeywords = ["tukang", "pekerja", "lapangan"];

  return workerKeywords.some((keyword) =>
    position.includes(keyword) ||
    department.includes(keyword) ||
    departmentName.includes(keyword)
  );
}

export function PayrollManagement() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // State Declarations
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'summary'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>(DEFAULT_PAYROLL_SETTINGS);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [printSettings, setPrintSettings] = useState<any>(undefined);
  const [deductionDetails, setDeductionDetails] = useState<string[]>([]);
  const [allowanceDetails, setAllowanceDetails] = useState<string[]>([]);
  const [linkedEmployeeIds, setLinkedEmployeeIds] = useState<string[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    attendanceCount: number;
    absentCount: number;
    presentCount: number;
    lateMinutes: number;
    deductionRate: number;
    foundSettings: boolean;
    error?: string;
    rawStatuses?: string[];
  }>({ attendanceCount: 0, absentCount: 0, presentCount: 0, lateMinutes: 0, deductionRate: 1000, foundSettings: false });
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
    const [formData, setFormData] = useState<PayrollFormData>({
    start_date: new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-CA'),
    end_date: new Date(currentYear, currentMonth, 0).toLocaleDateString('en-CA'),

    employee_id: '',
    period_month: currentMonth,
    period_year: currentYear,
    base_salary: '',
    allowances: '0',
    deductions: '0',
    overtime_hours: '0',
    overtime_rate: '0',
    gasoline_allowance: '0',
    meal_allowance: '0',
    position_allowance: '0',
    discretionary_allowance: '0',
    thr_allowance: '0',
    bpjs_deduction: '0',
    absent_deduction: '0',
    late_deduction: '0',
    reward_allowance: '0',
    loan_amount: '0',
    manual_allowance_details: [],
    manual_deduction_details: [],
    bank_account_details: '',
    is_perfect_attendance: false,
  });

  // Custom Hooks
  const { payroll, loading, error, refetch, addPayroll, markAsPaid, updatePayroll, deletePayroll } = usePayroll(selectedMonth, selectedYear);
  const { employees } = useEmployees();
  const { loans } = useLoans();
  const { user } = useAuth();
  const { toast } = useToast();
  const selectedEmployee = employees.find((employee) => employee.id === formData.employee_id);
  const isSelectedEmployeeWorker = isWorkerEmployee(selectedEmployee);

  // Load initial settings
  useEffect(() => {
    const saved = localStorage.getItem('hris_payroll_print_settings');
    if (saved) {
      try {
        setPrintSettings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchPayrollSettings = async () => {
    try {
      const [pSettings, aSettings] = await Promise.all([
        settingsService.getPayrollSettings(),
        settingsService.getAttendanceSettings()
      ]);
      setPayrollSettings(pSettings);
      setAttendanceSettings(aSettings);
    } catch (error: any) {
      console.error("Failed to fetch settings", error);
      setDebugInfo(prev => ({
        ...prev,
        foundSettings: false,
        error: error.message || JSON.stringify(error)
      }));
    }
  };

  useEffect(() => {
    fetchPayrollSettings();
  }, [showAddDialog]);

  // Fetch linked users (employees with system accounts)
  useEffect(() => {
    const fetchLinkedUsers = async () => {
      try {
        const users = await userService.getAllUsers();
        // Extract employee IDs from users who have one
        const ids = users.map(u => u.employee_id).filter(id => id !== null) as string[];
        setLinkedEmployeeIds(ids);
      } catch (err) {
        console.error("Failed to fetch users for validation", err);
      }
    };
    fetchLinkedUsers();
  }, []);

  // Fetch bulk data for the period to support real-time preview
  const fetchAllPeriodData = async () => {
    try {
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      const [attendance, leaves] = await Promise.all([
        attendanceService.getByDateRange(startDate, endDate),
        leaveService.getAll() // Unfortunately no getByDateRange for leaves in service, so we get all
      ]);

      setAllAttendance(attendance);
      setAllLeaves(leaves);
    } catch (err) {
      console.error("Failed to fetch bulk period data", err);
    }
  };

  useEffect(() => {
    fetchAllPeriodData();
  }, [selectedMonth, selectedYear]);

  // Helper to get work schedule (mirrors AttendanceManagement)
  const getWorkSchedule = (dateString: string) => { // Updated logic below
    const date = new Date(dateString);
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dateFormatted = dateString.split('T')[0];
    const holidays = attendanceSettings?.attendance_holidays || [];
    const isHoliday = day === 0 || holidays.includes(dateFormatted);

    if (isHoliday) {
      return {
        start: attendanceSettings?.work_start_time_weekday || '07:30',
        end: attendanceSettings?.work_end_time_weekday || '17:00',
        isHoliday: true
      };
    }

    if (day === 6) { // Saturday
      return {
        start: attendanceSettings?.work_start_time_saturday || '07:30',
        isHoliday: false,
        end: attendanceSettings?.work_end_time_saturday || '13:00'
      };
    }
    return {
      start: attendanceSettings?.work_start_time_weekday || '07:30',
      isHoliday: false,
      end: attendanceSettings?.work_end_time_weekday || '17:00'
    };
  };

  // Unified calculation logic for preview
  const calculateDraftValues = (employee: any) => {
    const isWorker = isWorkerEmployee(employee);
    const empAttendance = allAttendance.filter(a => a.employee_id === employee.id);
    const empLeaves = allLeaves.filter(l => l.employee_id === employee.id && l.status === 'approved');

    // Base salary strictly follows employee data (fixed as per revision)
    let baseSalary = employee.salary;
    let maternityInfo = '';

    let totalAllowances = 0;
    let totalDeductions = 0;

    // Attendance count
    const absentCount = empAttendance.filter((a: any) => {
      const status = (a.status || '').toLowerCase().trim();
      return status === 'absent' || status === 'tidak hadir' || status === 'alpha' || status === 'alpa';
    }).length || 0;

    const presentCount = empAttendance.filter((a: any) => {
      const status = (a.status || '').toLowerCase().trim();
      return ['present', 'late', 'business_trip', 'wfh'].includes(status);
    }).length || 0;

    let totalLateMinutes = 0;
    empAttendance.forEach((record: any) => {
      const status = (record.status || '').toLowerCase().trim();
      if (status === 'late' && record.check_in) {
        const schedule = getWorkSchedule(record.date);
        if (schedule.isHoliday) return;
        const [h, m] = record.check_in.split(':').map(Number);
        const [sh, sm] = schedule.start.split(':').map(Number);

        const checkInMinutes = h * 60 + m;
        const workStartMinutes = sh * 60 + sm;
        const lateThreshold = workStartMinutes + (attendanceSettings?.attendance_late_tolerance || 5);

        if (checkInMinutes > lateThreshold) {
          totalLateMinutes += (checkInMinutes - lateThreshold);
        }
      }
    });

    const workingDays = 26; // Pembagi tetap 26 hari sesuai permintaan user
    
    // Formula Potongan Absen: (Tunjangan Jabatan) / 26
    const employeeAllowancesForPenalty = isWorker ? [] : (employee.allowances || []);
    const empPosForPenalty = employeeAllowancesForPenalty.find((a: any) => 
      a.title?.toLowerCase().includes('jabatan') || 
      a.title?.toLowerCase().includes('position')
    );
    const positionForPenalty = empPosForPenalty ? empPosForPenalty.amount : 0;
    
    const dailyAbsentPenalty = Math.round((positionForPenalty) / workingDays);

    // Fixed Base Salary as per revision (not prorated by attendance)
    const proratedBase = baseSalary;
    const employeeAllowances = isWorker ? [] : (employee.allowances || []);
    
    // Sinkronisasi Otomatis: Ambil tunjangan dari profil karyawan
    const empMeal = employeeAllowances.find((a: any) => 
      a.title?.toLowerCase().includes('makan') || 
      a.title?.toLowerCase().includes('meal')
    );
    const empGas = employeeAllowances.find((a: any) => 
      a.title?.toLowerCase().includes('bensin') || 
      a.title?.toLowerCase().includes('gasoline') ||
      a.title?.toLowerCase().includes('transport')
    );
    const empPos = employeeAllowances.find((a: any) => 
      a.title?.toLowerCase().includes('jabatan') || 
      a.title?.toLowerCase().includes('position')
    );
    const empThr = employeeAllowances.find((a: any) => 
      a.title?.toLowerCase().includes('thr')
    );

    // Allowances - ONLY from Employee Profile (No global fallbacks per user request)
    const mealAllowance = empMeal ? empMeal.amount : 0;
    const gasolineAllowance = empGas ? empGas.amount : 0;
    const positionAllowance = empPos ? empPos.amount : 0;
    const thrAllowance = empThr ? empThr.amount : 0;

    const bpjsDeduction = payrollSettings?.payroll_bpjs_rate || 0;

    // Perfect Attendance Reward
    const isPerfect = absentCount === 0 && totalLateMinutes === 0 && empAttendance.length > 0;
    const rewardAllowance = isPerfect ? (payrollSettings?.payroll_reward_perfect_attendance || 0) : 0;

    let absentDeduction = 0;
    if (absentCount > 0) {
      // Formula Potongan Absen: (Tunjangan Jabatan) / 26 + Potongan Standar
      absentDeduction = absentCount * (payrollSettings?.payroll_deduction_absent || 0);
      absentDeduction += absentCount * dailyAbsentPenalty;
    }
    const late_deduction = totalLateMinutes * (payrollSettings?.attendance_late_penalty || 1000);

    const manualAllowancesTotal = isWorker ? 0 : (employee.allowances?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0);
    const manualDeductionsTotal = employee.deductions?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;

    // Loan Deductions
    const activeLoans = loans.filter(l =>
      l.employee_id === employee.id &&
      l.status === 'approved' &&
      l.remaining_amount > 0 &&
      new Date(l.start_date) <= new Date(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`)
    );
    const totalLoanDeduction = activeLoans.reduce((sum, loan) => sum + loan.installment_amount, 0);

    const draftAllowances = mealAllowance + gasolineAllowance + positionAllowance + thrAllowance + manualAllowancesTotal;
    const draftDeductions = absentDeduction + late_deduction + totalLoanDeduction;
    const draftNet = proratedBase + draftAllowances + rewardAllowance - draftDeductions;

    return {
      base_salary: proratedBase,
      allowances: draftAllowances,
      deductions: draftDeductions,
      net_salary: draftNet,
      absent_deduction: absentDeduction,
      late_deduction: late_deduction,
      meal_allowance: mealAllowance,
      gasoline_allowance: gasolineAllowance,
      position_allowance: positionAllowance,
      bpjs_deduction: 0,
      reward_allowance: rewardAllowance,
      loan_amount: totalLoanDeduction
    };
  };

  // Automatic payroll suggestion
  useEffect(() => {
    if (payrollSettings?.is_automatic_payroll && isPayrollDay() && user?.role !== 'staff') {
      const pendingEmployees = employees.filter(emp => !payroll.some(p => p.employee_id === emp.id));
      if (pendingEmployees.length > 0 && !isBatchProcessing) {
        toast({
          title: "Pengingat Penggajian Otomatis",
          description: `Hari ini adalah jadwal penggajian. Ada ${pendingEmployees.length} karyawan yang belum diproses. Klik "Proses Payroll Masal" untuk memulai.`,
          duration: 10000,
        });
      }
    }
  }, [payrollSettings, payroll, employees]);

  function isPayrollDay() {
    if (!payrollSettings || !payrollSettings.payroll_schedule_day) return false;
    return currentDate.getDate() >= payrollSettings.payroll_schedule_day;
  }

  // Auto-fill salary and calculate deductions when employee changes
  useEffect(() => {
    if (formData.employee_id) {
      const fetchData = async () => {
        const employee = employees.find(e => e.id === formData.employee_id);
        if (!employee) return;
        const isWorker = isWorkerEmployee(employee);

        let newDeductionDetails: string[] = [];
        let newAllowanceDetails: string[] = [];
        let totalDeductions = 0;

        // 1. Base Salary
        let baseSalaryValue = employee.salary;

        // 2. Loan Deductions
        const activeLoans = loans.filter(l =>
          l.employee_id === formData.employee_id &&
          l.status === 'approved' &&
          l.remaining_amount > 0 &&
          new Date(l.start_date) <= new Date(`${formData.period_year}-${formData.period_month.toString().padStart(2, '0')}-01`)
        );

        const totalLoanDeduction = activeLoans.reduce((sum, loan) => sum + loan.installment_amount, 0);
        totalDeductions += totalLoanDeduction;

        if (totalLoanDeduction > 0) {
          newDeductionDetails.push(`Potongan Kasbon: ${formatCurrency(totalLoanDeduction)}`);
        }

        // 3. Attendance Info
        let mealAllowance = 0;
        let gasolineAllowance = 0;
        let absentDeductionAmount = 0;
        let bpjsDeduction = 0;
        let positionAllowance = 0;
        let thrAllowance = 0;
        let attendance: any[] = [];
        let absentCount = 0;
        let totalLateMinutes = 0;
        let manualAllowanceItems: { title: string, amount: number }[] = [];
        let manualDeductionItems: { title: string, amount: number }[] = [];
        let totalManualAllowances = 0;
        let totalManualDeductions = 0;
        let latePenalty = 0;

        try {
          attendance = await attendanceService.getByEmployeeDateRange(formData.employee_id, formData.start_date, formData.end_date);

          // Absensi (Alpha) - status 'absent'
          absentCount = attendance?.filter((a: any) => {
            const status = (a.status || '').toLowerCase().trim();
            return status === 'absent' || status === 'tidak hadir' || status === 'alpha' || status === 'alpa';
          }).length || 0;

          if (absentCount > 0) {
            if (payrollSettings && payrollSettings.payroll_deduction_absent > 0) {
              absentDeductionAmount = absentCount * payrollSettings.payroll_deduction_absent;
              totalDeductions += absentDeductionAmount;
              newDeductionDetails.push(`Absensi: ${absentCount} hari tidak hadir (Rp ${absentDeductionAmount.toLocaleString('id-ID')})`);
            }
          }

          // Keterlambatan (Late)
          totalLateMinutes = 0;
          attendance?.forEach((record: any) => {
            const status = (record.status || '').toLowerCase().trim();
            if (status === 'late' && record.check_in) {
              const schedule = getWorkSchedule(record.date);
              if (schedule.isHoliday) return;

              const [h, m] = record.check_in.split(':').map(Number);
              const [sh, sm] = (schedule.start || '07:30').split(':').map(Number);

              const checkInMinutes = h * 60 + m;
              const workStartMinutes = sh * 60 + sm;
              const lateThreshold = workStartMinutes + (attendanceSettings?.attendance_late_tolerance || 5);

              if (checkInMinutes > lateThreshold) {
                totalLateMinutes += (checkInMinutes - lateThreshold);
              }
            }
          });

          if (totalLateMinutes > 0) {
            const multiplier = payrollSettings?.attendance_late_penalty || 1000;
            latePenalty = totalLateMinutes * multiplier;
            totalDeductions += latePenalty;
            newDeductionDetails.push(`Keterlambatan: ${totalLateMinutes} menit (Rp ${latePenalty.toLocaleString('id-ID')})`);
          }

          setDebugInfo({
            attendanceCount: attendance?.length || 0,
            absentCount: absentCount,
            presentCount: 0,
            lateMinutes: totalLateMinutes,
            deductionRate: 0,
            foundSettings: !!payrollSettings,
            rawStatuses: attendance?.slice(0, 5).map((a: any) => a.status || 'null')
          });

          // --- Auto-Calculate Allowances & Deductions based on Settings ---
          if (payrollSettings) {
            const workingDays = 26; // Fixed 26 days divisor as per user request
            
            // Allowances - Default to 0, strictly based on employee data per user request
            mealAllowance = 0;
            gasolineAllowance = 0;
            positionAllowance = 0;
            thrAllowance = 0;

            // bpjs
            bpjsDeduction = 0; // BPJS auto-deduction removed
          }

          // --- Manual Items from Employee Profile ---
          const employeeAllowances = isWorker ? [] : (employee.allowances || []);
          
          // Sinkronisasi Otomatis: Ambil tunjangan spesifik dari profil karyawan
          const empMeal = employeeAllowances.find(a => 
            a.title?.toLowerCase().includes('makan') || 
            a.title?.toLowerCase().includes('meal')
          );
          const empGas = employeeAllowances.find(a => 
            a.title?.toLowerCase().includes('bensin') || 
            a.title?.toLowerCase().includes('gasoline') ||
            a.title?.toLowerCase().includes('transport')
          );
          const empPos = employeeAllowances.find(a => 
            a.title?.toLowerCase().includes('jabatan') || 
            a.title?.toLowerCase().includes('position')
          );
          const empThr = employeeAllowances.find(a => 
            a.title?.toLowerCase().includes('thr')
          );

          if (empMeal) mealAllowance = empMeal.amount;
          if (empGas) gasolineAllowance = empGas.amount;
          if (empPos) positionAllowance = empPos.amount;
          if (empThr) thrAllowance = empThr.amount;

          // Filter out specific allowances to avoid double counting in "Manual Items"
          manualAllowanceItems = employeeAllowances.filter(a => 
            a !== empMeal && a !== empGas && a !== empPos && a !== empThr
          );
          manualDeductionItems = employee.deductions || [];

          // Attendance-based calculations (Only if settings exist)
          if (payrollSettings) {
            const workingDays = 26; // Pembagi tetap 26 hari sesuai permintaan user
            // Formula Potongan Absen: (Tunjangan Jabatan) / 26
            const dailyAbsentPenalty = Math.round((positionAllowance) / workingDays);

            if (absentCount > 0) {
              // Basic penalty + allowance-based penalty
              const formulaAbsenceDeduction = (absentCount * (payrollSettings.payroll_deduction_absent || 0)) + (absentCount * dailyAbsentPenalty);
              absentDeductionAmount = formulaAbsenceDeduction;
              totalDeductions += formulaAbsenceDeduction;
              newDeductionDetails.push(`Absensi: ${absentCount} hari (Potongan Rp ${formulaAbsenceDeduction.toLocaleString('id-ID')})`);
            }
          }

          if (mealAllowance > 0) {
            newAllowanceDetails.push(`Uang Makan: ${formatCurrency(mealAllowance)}`);
          }
          if (gasolineAllowance > 0) {
            newAllowanceDetails.push(`Uang Bensin: ${formatCurrency(gasolineAllowance)}`);
          }
          if (positionAllowance > 0) {
            newAllowanceDetails.push(`Tunjangan Jabatan: ${formatCurrency(positionAllowance)}`);
          }

          if (manualAllowanceItems.length > 0) {
            totalManualAllowances = manualAllowanceItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          }

        } catch (error: any) {
          console.error("Error in payroll calculation:", error);
          setDebugInfo(prev => ({
            ...prev,
            error: `Attendance Error: ${error.message || JSON.stringify(error)}`
          }));
        }

        setDeductionDetails(newDeductionDetails);
        setAllowanceDetails(newAllowanceDetails);

        setFormData(prev => ({
          ...prev,
          base_salary: baseSalaryValue.toString(),
          deductions: (totalDeductions).toString(), // Removed totalManualDeductions to avoid double counting
          bank_account_details: employee.bank_account || '',
          meal_allowance: mealAllowance.toString(),
          gasoline_allowance: gasolineAllowance.toString(),
          bpjs_deduction: bpjsDeduction.toString(),
          absent_deduction: absentDeductionAmount.toString(),
          late_deduction: latePenalty.toString(),
          reward_allowance: (absentCount === 0 && totalLateMinutes === 0 && (attendance?.length || 0) > 0)
            ? (payrollSettings?.payroll_reward_perfect_attendance || 0).toString()
            : '0',
          manual_allowance_details: manualAllowanceItems,
          manual_deduction_details: manualDeductionItems,
          position_allowance: positionAllowance.toString(),
          thr_allowance: thrAllowance.toString(),
          is_perfect_attendance: absentCount === 0 && totalLateMinutes === 0 && (attendance?.length || 0) > 0,
        }));
      };

      fetchData();
    }
  }, [formData.employee_id, employees, loans, formData.period_month, formData.period_year, payrollSettings]);

  // Create a unified list of employees and their payroll status
  const unifiedPayroll = employees
    .filter(emp => emp.status === 'active') // Only active employees
    .map(emp => {
      const existingPay = payroll.find(p => p.employee_id === emp.id);
      const draft = !existingPay ? calculateDraftValues(emp) : null;

      return {
        id: existingPay?.id || `draft-${emp.id}`,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_position: emp.position,
        period_month: selectedMonth,
        period_year: selectedYear,
        base_salary: existingPay?.base_salary || draft?.base_salary || 0,
        allowances: existingPay?.allowances || draft?.allowances || 0,
        deductions: existingPay?.deductions || draft?.deductions || 0,
        net_salary: existingPay?.net_salary || draft?.net_salary || 0,
        status: existingPay?.status || 'unprocessed',
        pay_date: existingPay?.pay_date,
        gasoline_allowance: existingPay?.gasoline_allowance || draft?.gasoline_allowance || 0,
        meal_allowance: existingPay?.meal_allowance || draft?.meal_allowance || 0,
        position_allowance: existingPay?.position_allowance || draft?.position_allowance || 0,
        late_deduction: existingPay?.late_deduction || draft?.late_deduction || 0,
        absent_deduction: existingPay?.absent_deduction || draft?.absent_deduction || 0,
        reward_allowance: existingPay?.reward_allowance || 0,
        loan_amount: existingPay?.loan_amount || draft?.loan_amount || 0,
        is_payroll_exists: !!existingPay,
        raw_pay: existingPay // Keep reference for details
      };
    });

  // Filter based on search and role
  const filteredPayroll = unifiedPayroll.filter(item => {
    // If staff, only show their own
    if (user?.role === 'staff') {
      return item.employee_id === user.employee_id;
    }

    return item.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate statistics
  const stats = {
    totalPayroll: payroll.reduce((sum, pay) => sum + pay.net_salary, 0),
    potentialTotalPayroll: unifiedPayroll.reduce((sum, item) => sum + item.net_salary, 0),
    pendingPayroll: payroll.filter(pay => pay.status === 'pending').length,
    paidPayroll: payroll.filter(pay => pay.status === 'paid').length,
    unprocessedEmployees: unifiedPayroll.filter(p => !p.is_payroll_exists).length,
    totalEmployees: unifiedPayroll.length,
    averageSalary: payroll.length > 0 ? payroll.reduce((sum, pay) => sum + pay.net_salary, 0) / payroll.length : 0
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      start_date: new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-CA'),
      end_date: new Date(selectedYear, selectedMonth, 0).toLocaleDateString('en-CA'),
      employee_id: '',
      period_month: selectedMonth,
      period_year: selectedYear,
      base_salary: '',
      allowances: '0',
      deductions: '0',
      overtime_hours: '0',
      overtime_rate: '0',
      gasoline_allowance: '0',
      meal_allowance: '0',
      position_allowance: '0',
      discretionary_allowance: '0',
      thr_allowance: '0',
      bpjs_deduction: '0',
      absent_deduction: '0',
      late_deduction: '0',
      manual_allowance_details: [],
      reward_allowance: '0',
      loan_amount: '0',
      manual_deduction_details: [],
      bank_account_details: '',
      is_perfect_attendance: false,
    });
    setDeductionDetails([]);
    setAllowanceDetails([]);
    setIsEditing(false);
    setEditId(null);
  };

  // Calculate net salary
  const calculateNetSalary = () => {
    const baseSalary = parseFloat(formData.base_salary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const overtimeHours = parseFloat(formData.overtime_hours) || 0;
    const overtimeRate = parseFloat(formData.overtime_rate) || 0;

    const gasoline = parseFloat(formData.gasoline_allowance) || 0;
    const meal = parseFloat(formData.meal_allowance) || 0;
    const position = parseFloat(formData.position_allowance) || 0;
    const discretionary = parseFloat(formData.discretionary_allowance) || 0;
    const thr = parseFloat(formData.thr_allowance) || 0;
    const bpjs = parseFloat(formData.bpjs_deduction) || 0;
    const absent = parseFloat(formData.absent_deduction) || 0;
    const late = parseFloat(formData.late_deduction) || 0;

    const manualAllowancesTotal = formData.manual_allowance_details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const manualDeductionsTotal = formData.manual_deduction_details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    const effectiveAllowances = isSelectedEmployeeWorker ? 0 : allowances;
    const effectiveGasoline = isSelectedEmployeeWorker ? 0 : gasoline;
    const effectiveMeal = isSelectedEmployeeWorker ? 0 : meal;
    const effectivePosition = isSelectedEmployeeWorker ? 0 : position;
    const effectiveDiscretionary = isSelectedEmployeeWorker ? 0 : discretionary;
    const effectiveThr = isSelectedEmployeeWorker ? 0 : thr;
    const effectiveManualAllowances = isSelectedEmployeeWorker ? 0 : manualAllowancesTotal;

    const loan = parseFloat(formData.loan_amount) || 0;

    const totalAllowances = effectiveAllowances + effectiveGasoline + effectiveMeal + effectivePosition + effectiveDiscretionary + effectiveThr + effectiveManualAllowances + Number(formData.reward_allowance || 0);
    const totalDeductions = deductions + bpjs + absent + late + manualDeductionsTotal + loan;
    const overtimePay = overtimeHours * overtimeRate;

    return baseSalary + totalAllowances + overtimePay - totalDeductions;
  };

  // Handle edit payroll
  const handleEditPayroll = (p: PayrollRecord) => {
    const employee = employees.find((item) => item.id === p.employee_id);
    const isWorker = isWorkerEmployee(employee);
    setIsEditing(true);
    setEditId(p.id);
    setFormData({
      employee_id: p.employee_id,
      period_month: p.period_month,
      period_year: p.period_year,
      base_salary: p.base_salary.toString(),
      allowances: isWorker ? '0' : (p.allowances - (p.gasoline_allowance || 0) - (p.meal_allowance || 0) - (p.position_allowance || 0) - (p.discretionary_allowance || 0) - (p.thr_allowance || 0)).toString(),
      deductions: (p.deductions - (p.bpjs_deduction || 0) - (p.absent_deduction || 0) - (p.late_deduction || 0) - (p.loan_amount || 0)).toString(),
      overtime_hours: '0',
      overtime_rate: '0',
      gasoline_allowance: isWorker ? '0' : (p.gasoline_allowance || 0).toString(),
      meal_allowance: isWorker ? '0' : (p.meal_allowance || 0).toString(),
      position_allowance: isWorker ? '0' : (p.position_allowance || 0).toString(),
      discretionary_allowance: isWorker ? '0' : (p.discretionary_allowance || 0).toString(),
      thr_allowance: isWorker ? '0' : (p.thr_allowance || 0).toString(),
      bpjs_deduction: (p.bpjs_deduction || 0).toString(),
      absent_deduction: (p.absent_deduction || 0).toString(),
      late_deduction: (p.late_deduction || 0).toString(),
      reward_allowance: (p.reward_allowance || 0).toString(),
      loan_amount: (p.loan_amount || 0).toString(),
      manual_allowance_details: isWorker ? [] : (p.manual_allowance_details || []),
      manual_deduction_details: p.manual_deduction_details || [],
      bank_account_details: p.bank_account_details || '',
      is_perfect_attendance: p.is_perfect_attendance || false,
      start_date: p.start_date || new Date(p.period_year, p.period_month - 1, 1).toLocaleDateString('en-CA'),
      end_date: p.end_date || new Date(p.period_year, p.period_month, 0).toLocaleDateString('en-CA'),
    });
    setShowAddDialog(true);
  };

  // Handle add payroll
  const handleAddPayroll = async () => {
    try {
      if (!formData.employee_id || !formData.base_salary) {
        toast({
          title: 'Validasi Gagal',
          description: 'Mohon pilih karyawan dan isi gaji pokok.',
          variant: 'destructive',
        });
        return;
      }

      const baseSalary = parseFloat(formData.base_salary);
      const allowances = parseFloat(formData.allowances) || 0;
      const deductions = parseFloat(formData.deductions) || 0;
      const gasoline = parseFloat(formData.gasoline_allowance) || 0;
      const meal = parseFloat(formData.meal_allowance) || 0;
      const position = parseFloat(formData.position_allowance) || 0;
      const discretionary = parseFloat(formData.discretionary_allowance) || 0;
      const thr = parseFloat(formData.thr_allowance) || 0;
      const bpjs = parseFloat(formData.bpjs_deduction) || 0;
      const absent = parseFloat(formData.absent_deduction) || 0;
      const late = parseFloat(formData.late_deduction) || 0;
      const loan = parseFloat(formData.loan_amount) || 0;
      const overtimeHours = parseFloat(formData.overtime_hours) || 0;
      const overtimeRate = parseFloat(formData.overtime_rate) || 0;
      const overtimePay = overtimeHours * overtimeRate;

      const manualAllowanceDetails = isSelectedEmployeeWorker ? [] : formData.manual_allowance_details;
      const manualAllowancesTotal = manualAllowanceDetails?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const manualDeductionDetails = formData.manual_deduction_details || [];
      const manualDeductionsTotal = manualDeductionDetails.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      const effectiveAllowances = isSelectedEmployeeWorker ? 0 : allowances;
      const effectiveGasoline = isSelectedEmployeeWorker ? 0 : gasoline;
      const effectiveMeal = isSelectedEmployeeWorker ? 0 : meal;
      const effectivePosition = isSelectedEmployeeWorker ? 0 : position;
      const effectiveDiscretionary = isSelectedEmployeeWorker ? 0 : discretionary;
      const effectiveThr = isSelectedEmployeeWorker ? 0 : thr;

      const totalAllowances = effectiveAllowances + effectiveGasoline + effectiveMeal + effectivePosition + effectiveDiscretionary + effectiveThr + manualAllowancesTotal + (parseFloat(formData.reward_allowance) || 0);
      const totalDeductions = deductions + bpjs + absent + late + manualDeductionsTotal + loan;
      const netSalary = baseSalary + totalAllowances + overtimePay - totalDeductions;

      const payrollPayload: any = {
        employee_id: formData.employee_id,
        period_month: formData.period_month,
        period_year: formData.period_year,
        base_salary: baseSalary,
        allowances: totalAllowances,
        deductions: totalDeductions,
        net_salary: netSalary,
        gasoline_allowance: effectiveGasoline,
        meal_allowance: effectiveMeal,
        position_allowance: effectivePosition,
        discretionary_allowance: effectiveDiscretionary,
        thr_allowance: effectiveThr,
        loan_amount: loan,
        bpjs_deduction: bpjs,
        absent_deduction: absent,
        late_deduction: late,
        overtime_hours: overtimeHours,
        overtime_rate: overtimeRate,
        reward_allowance: parseFloat(formData.reward_allowance) || 0,
        reward_details: formData.is_perfect_attendance ? [{ title: 'Kehadiran Sempurna', amount: parseFloat(formData.reward_allowance) || 0 }] : [],
        bank_account_details: formData.bank_account_details,
        manual_allowance_details: manualAllowanceDetails,
        manual_deduction_details: manualDeductionDetails,
        is_perfect_attendance: formData.is_perfect_attendance,
        start_date: formData.start_date,
        end_date: formData.end_date
      };

      // --- DUPLICATE CHECK ---
      if (!isEditing) {
        const isDuplicate = payroll.some(p =>
          p.employee_id === formData.employee_id &&
          p.period_month === formData.period_month &&
          p.period_year === formData.period_year
        );

        if (isDuplicate) {
          toast({
            title: 'Duplikat',
            description: 'Data payroll untuk periode ini sudah ada. Silakan gunakan menu Edit.',
            variant: 'destructive'
          });
          return;
        }
      }

      if (isEditing && editId) {
        await updatePayroll(editId, payrollPayload);
        toast({ title: 'Sukses', description: 'Berhasil memperbarui data payroll!' });
      } else {
        payrollPayload.status = 'pending';
        await addPayroll(payrollPayload);
        toast({ title: 'Sukses', description: 'Berhasil membuat data payroll!' });
      }

      setShowAddDialog(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('Failed to save payroll:', error);
      toast({
        title: 'Error',
        description: `Gagal menyimpan data penggajian: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleProcessBatchPayroll = async () => {
    try {
      setIsBatchProcessing(true);
      setBatchProgress(0);

      const eligibleEmployees = employees.filter(emp => !payroll.some(p => p.employee_id === emp.id));

      if (eligibleEmployees.length === 0) {
        toast({
          title: "Sudah Diproses",
          description: "Semua karyawan sudah memiliki data payroll untuk periode ini.",
        });
        setIsBatchProcessing(false);
        return;
      }

      toast({
        title: "Memulai Proses",
        description: `Memproses payroll untuk ${eligibleEmployees.length} karyawan...`,
      });

      let count = 0;
      const startDate = formData.start_date;
      const endDate = formData.end_date;

      for (const employee of eligibleEmployees) {
        const isWorker = isWorkerEmployee(employee);
        // Basic calculations
        let baseSalary = employee.salary;
        let totalDeductions = 0;
        let mealAllowance = 0;
        let gasolineAllowance = 0;
        let totalRewardAllowance = 0;
        let absentDeductionAmount = 0;
        let lateDeductionAmount = 0;

        const activeLoans = loans.filter(l =>
          l.employee_id === employee.id &&
          l.status === 'approved' &&
          l.remaining_amount > 0 &&
          new Date(l.start_date) <= new Date(endDate)
        );
        const current_loan_amount = activeLoans.reduce((sum, loan) => sum + loan.installment_amount, 0);

        // Attendance & Rewards
        const attendance = await attendanceService.getByEmployeeDateRange(employee.id, startDate, endDate);
        const rewards = await rewardService.getByEmployee(employee.id);

        const periodRewards = rewards?.filter((r: any) => {
          if (r.status !== 'claimed' || !r.claimed_date) return false;
          const rewardDate = new Date(r.claimed_date);
          return rewardDate.getMonth() + 1 === selectedMonth && rewardDate.getFullYear() === selectedYear;
        }) || [];

        totalRewardAllowance = periodRewards.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
        const rewardDetailsItems = periodRewards.map((r: any) => ({
          title: r.title || 'Penghargaan',
          amount: r.points || 0
        }));

        const absentCount = attendance?.filter((a: any) => {
          const status = (a.status || '').toLowerCase().trim();
          return status === 'absent' || status === 'tidak hadir' || status === 'alpha' || status === 'alpa';
        }).length || 0;

        let totalLateMinutes = 0;
        attendance?.forEach((record: any) => {
          const status = (record.status || '').toLowerCase().trim();
          if (status === 'late' && record.check_in) {
            const schedule = getWorkSchedule(record.date);
            if (schedule.isHoliday) return;

            const [h, m] = record.check_in.split(':').map(Number);
            const [sh, sm] = (schedule.start || '07:30').split(':').map(Number);

            const checkInMinutes = h * 60 + m;
            const workStartMinutes = sh * 60 + sm;
            const lateThreshold = workStartMinutes + (attendanceSettings?.attendance_late_tolerance || 5);

            if (checkInMinutes > lateThreshold) {
              totalLateMinutes += (checkInMinutes - lateThreshold);
            }
          }
        });

        if (totalLateMinutes > 0) {
          lateDeductionAmount = totalLateMinutes * (payrollSettings?.attendance_late_penalty || 1000);
        }

        if (absentCount > 0 && payrollSettings?.payroll_deduction_absent) {
          absentDeductionAmount = absentCount * payrollSettings.payroll_deduction_absent;
        }

        const employeeAllowances = isWorker ? [] : (employee.allowances || []);
        
        // Sinkronisasi Otomatis: Ambil tunjangan dari profil karyawan
        const empMeal = employeeAllowances.find(a => 
          a.title?.toLowerCase().includes('makan') || 
          a.title?.toLowerCase().includes('meal')
        );
        const empGas = employeeAllowances.find(a => 
          a.title?.toLowerCase().includes('bensin') || 
          a.title?.toLowerCase().includes('gasoline') ||
          a.title?.toLowerCase().includes('transport')
        );
        const empPos = employeeAllowances.find(a => 
          a.title?.toLowerCase().includes('jabatan') || 
          a.title?.toLowerCase().includes('position')
        );
        const empThr = employeeAllowances.find(a => 
          a.title?.toLowerCase().includes('thr')
        );

        // Allowances - ONLY from Employee Profile (No global fallbacks per user request)
        mealAllowance = empMeal ? empMeal.amount : 0;
        gasolineAllowance = empGas ? empGas.amount : 0;
        const position = empPos ? empPos.amount : 0;
        const thrAmount = empThr ? empThr.amount : 0;

        const workingDays = 26; // Pembagi tetap 26 hari sesuai permintaan user
        // Formula Potongan Absen: (Tunjangan Jabatan) / 26
        const dailyAbsentPenalty = Math.round((position) / workingDays);

        // Manual Items (excluding the ones already picked above)
        const manualAllowanceItems = employeeAllowances.filter(a => 
          a !== empMeal && a !== empGas && a !== empPos && a !== empThr
        );
        const manualDeductionItems = employee.deductions || [];
        const totalManualAllowances = manualAllowanceItems.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalManualDeductions = manualDeductionItems.reduce((sum, i) => sum + (i.amount || 0), 0);

        // Absence deduction based on (P+M+G)/26
        if (absentCount > 0) {
          absentDeductionAmount += absentCount * dailyAbsentPenalty;
        }

        // --- Perfect Attendance Reward (Automatic) ---
        const isPerfect = absentCount === 0 && totalLateMinutes === 0 && (attendance?.length || 0) > 0;
        if (isPerfect && payrollSettings?.payroll_reward_perfect_attendance && payrollSettings.payroll_reward_perfect_attendance > 0) {
          const amount = payrollSettings.payroll_reward_perfect_attendance;
          totalRewardAllowance += amount;
          rewardDetailsItems.push({
            title: 'Kehadiran Sempurna',
            amount: amount
          });
        }

        const bpjs = 0;
        const discretionary = 0;
        const thr = thrAmount;

        const totalOtherAllowances = mealAllowance + gasolineAllowance + position + discretionary + thr + totalManualAllowances;
        const combinedDeductions = totalDeductions + absentDeductionAmount + lateDeductionAmount + totalManualDeductions + current_loan_amount;
        const netSalary = baseSalary + totalOtherAllowances + totalRewardAllowance - combinedDeductions;

        await addPayroll({
          employee_id: employee.id,
          period_month: selectedMonth,
          period_year: selectedYear,
          base_salary: baseSalary,
          allowances: totalOtherAllowances,
          deductions: combinedDeductions,
          net_salary: netSalary,
          status: 'pending',
          gasoline_allowance: gasolineAllowance,
          meal_allowance: mealAllowance,
          position_allowance: position,
          discretionary_allowance: discretionary,
          thr_allowance: thr,
          loan_amount: current_loan_amount,
          bpjs_deduction: bpjs,
          absent_deduction: absentDeductionAmount,
          late_deduction: lateDeductionAmount,
          reward_allowance: totalRewardAllowance,
          reward_details: rewardDetailsItems,
          manual_allowance_details: manualAllowanceItems,
          manual_deduction_details: manualDeductionItems,
          bank_account_details: employee.bank_account || '',
          is_perfect_attendance: absentCount === 0 && totalLateMinutes === 0 && (attendance?.length || 0) > 0,
          start_date: startDate,
          end_date: endDate
        });

        count++;
        setBatchProgress(Math.round((count / eligibleEmployees.length) * 100));
      }

      toast({
        title: "Sukses",
        description: `Berhasil memproses ${count} data payroll.`,
        className: "bg-green-600 text-white"
      });
    } catch (err: any) {
      console.error("Batch process failed:", err);
      toast({
        title: "Proses Gagal",
        description: err.message || "Terjadi kesalahan saat memproses masal.",
        variant: "destructive"
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaid(id, new Date().toISOString());
      toast({ title: 'Sukses', description: 'Payroll ditandai sebagai dibayar.' });
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeletePayroll = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data payroll ini?')) return;
    try {
      await deletePayroll(id);
      toast({ title: 'Sukses', description: 'Data payroll berhasil dihapus.' });
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const handlePrintSlip = (pay: PayrollRecord) => {
    const employee = employees.find(e => e.id === pay.employee_id);
    if (!employee) return;
    generateSalarySlip(pay, employee, printSettings);
  };

  const handleExportExcel = () => {
    exportPayrollToExcel(filteredPayroll as any, employees, { month: selectedMonth, year: selectedYear });
  };

  const handleExportPDF = () => {
    const payrollData = filteredPayroll
      .filter(p => p.is_payroll_exists && p.raw_pay)
      .map(p => ({
        payroll: p.raw_pay as PayrollRecord,
        employee: employees.find(e => e.id === p.employee_id)!
      })).filter(data => data.employee !== undefined);

    const period = `${months[selectedMonth - 1]} ${selectedYear}`;
    generatePayrollReport(payrollData, period, printSettings);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Manajemen Penggajian</h1>
          <p className="text-gray-500 font-body">Kelola gaji, tunjangan, dan potongan karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <PayrollPrintSettingsDialog
            onSettingsChange={setPrintSettings}
            payroll={filteredPayroll[0] as any}
            employee={employees.find(e => e.id === filteredPayroll[0]?.employee_id)}
          />
          {user?.role !== 'staff' && (
            <>
              <Button
                onClick={handleProcessBatchPayroll}
                disabled={isBatchProcessing}
                variant="outline"
                className="border-hrd text-hrd hover:bg-hrd/5 font-body"
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses ({batchProgress}%)
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Proses Masal
                  </>
                )}
              </Button>
              <Button onClick={() => { setIsEditing(false); resetForm(); setShowAddDialog(true); }} className="bg-hrd hover:bg-hrd-dark font-body">
                <Plus className="w-4 h-4 mr-2" />
                Buat Payroll
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportExcel} className="font-body">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="font-body text-red-600 border-red-200 hover:bg-red-50">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-blue-600">Total Pengeluaran</p>
                <p className="text-xl font-mono font-bold text-blue-900">{formatCurrency(stats.totalPayroll)}</p>
                {stats.potentialTotalPayroll > stats.totalPayroll && (
                  <p className="text-[10px] font-body text-blue-400 mt-1">Potensi: {formatCurrency(stats.potentialTotalPayroll)}</p>
                )}
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-yellow-600">Menunggu</p>
                <p className="text-xl font-mono font-bold text-yellow-900">{stats.pendingPayroll} Karyawan</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-green-600">Terbayar</p>
                <p className="text-xl font-mono font-bold text-green-900">{stats.paidPayroll} Karyawan</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-purple-600">Rata-rata Gaji</p>
                <p className="text-xl font-mono font-bold text-purple-900">{formatCurrency(stats.averageSalary)}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            <div className="flex items-center gap-2">
              <NativeSelect
                value={selectedMonth.toString()}
                onChange={(value) => setSelectedMonth(parseInt(value))}
                className="w-[140px] font-body"
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={selectedYear.toString()}
                onChange={(value) => setSelectedYear(parseInt(value))}
                className="w-[100px] font-body"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </NativeSelect>
                        </div>

            {/* Rentang Tanggal Penggajian (Main Header) */}
            <div className="flex items-center gap-2 p-1.5 bg-blue-50/50 rounded-lg border border-blue-100 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-tighter mr-1 ml-1">
                <Calendar className="w-3 h-3" />
                Rentang:
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="h-7 w-[130px] text-[10px] font-mono border-blue-200 bg-white"
                />
                <span className="text-blue-400 text-xs">-</span>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-7 w-[130px] text-[10px] font-mono border-blue-200 bg-white"
                />
              </div>

                            {(() => {
                const hDates = attendanceSettings?.attendance_holidays || [];
                const start = new Date(formData.start_date);
                const end = new Date(formData.end_date);
                const hList = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const dStr = d.toISOString().split('T')[0];
                  if (d.getDay() === 0) hList.push({ date: dStr, name: 'Hari Minggu' });
                  else if (hDates.some(h => h.split('T')[0] === dStr)) hList.push({ date: dStr, name: 'Libur Perusahaan' });
                }
                if (hList.length === 0) return null;
                return (
                  <div className="relative group ml-2">
                    <div className="p-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200 animate-pulse cursor-help">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white border border-orange-100 rounded-lg shadow-xl p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-1.5 border-b border-orange-50 pb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Daftar Hari Libur:
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {hList.map((h, idx) => (
                          <div key={idx} className="flex flex-col border-l-2 border-orange-200 pl-1.5 py-0.5">
                            <span className="text-[9px] font-mono text-gray-500">{new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            <span className="text-[10px] font-medium text-gray-800 leading-tight">{h.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cari karyawan..."
                className="pl-8 font-body"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-hrd mb-4" />
              <p className="text-gray-500 font-body">Memuat data payroll...</p>
            </div>
          ) : filteredPayroll.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-lg">
              <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-body">Tidak ada data payroll ditemukan</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Karyawan</TableHead>
                    <TableHead className="font-body text-center">Status</TableHead>
                    <TableHead className="font-body text-right">Gaji Pokok</TableHead>
                    <TableHead className="font-body text-right">Tunjangan</TableHead>
                    <TableHead className="font-body text-right">Pot. Absen</TableHead>
                    <TableHead className="font-body text-right">Pot. Telat</TableHead>
                    <TableHead className="font-body text-right text-red-600">Pinjaman</TableHead>
                    <TableHead className="font-body text-right">Total Gaji</TableHead>
                    <TableHead className="font-body text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.map((item) => {
                    const StatusIcon = statusIcons[item.status as keyof typeof statusIcons];
                    return (
                      <TableRow key={item.id} className={!item.is_payroll_exists ? 'bg-gray-50/50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-hrd/10 text-hrd">
                                {item.employee_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-body font-medium">{item.employee_name}</p>
                              <p className="text-xs text-gray-500 font-body">{item.employee_position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[item.status as keyof typeof statusColors]} font-body flex items-center w-fit gap-1 mx-auto`}>
                            {item.status === 'unprocessed' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {item.status !== 'unprocessed' && <StatusIcon className="w-3 h-3" />}
                            {statusLabels[item.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono text-right ${item.is_payroll_exists ? 'text-blue-600' : 'text-blue-400 italic'}`}>
                          {formatCurrency(item.base_salary)}
                        </TableCell>
                        <TableCell className={`font-mono text-right ${item.is_payroll_exists ? 'text-green-600' : 'text-green-400 italic'}`}>
                          {formatCurrency(item.allowances + (item.reward_allowance || 0))}
                        </TableCell>
                        <TableCell className={`font-mono text-right ${item.is_payroll_exists ? 'text-red-500' : 'text-red-300 italic'}`}>
                          {formatCurrency(item.absent_deduction || 0)}
                        </TableCell>
                        <TableCell className={`font-mono text-right ${item.is_payroll_exists ? 'text-red-500' : 'text-red-300 italic'}`}>
                          {formatCurrency(item.late_deduction || 0)}
                        </TableCell>
                        <TableCell className={`font-mono text-right ${item.is_payroll_exists ? 'text-red-600' : 'text-red-400 italic'}`}>
                          {formatCurrency(item.loan_amount || 0)}
                        </TableCell>
                        <TableCell className={`font-mono font-bold text-right ${item.is_payroll_exists ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                          {formatCurrency(item.net_salary)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.is_payroll_exists ? (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedPayroll(item.raw_pay); setShowViewDialog(true); }}>
                                  <Eye className="w-4 h-4 text-gray-500" />
                                </Button>
                                {user?.role !== 'staff' && (
                                  <>
                                    {item.status === 'pending' && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Tandai Dibayar"
                                          onClick={() => handleMarkAsPaid(item.id)}
                                        >
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Edit Payroll"
                                          onClick={() => handleEditPayroll(item.raw_pay)}
                                        >
                                          <Edit className="w-4 h-4 text-blue-600" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Cetak Slip"
                                      onClick={() => handlePrintSlip(item.raw_pay)}
                                    >
                                      <Printer className="w-4 h-4 text-gray-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Hapus Payroll"
                                      onClick={() => handleDeletePayroll(item.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              user?.role !== 'staff' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-hrd hover:bg-hrd/5 font-body flex items-center gap-1"
                                  onClick={() => {
                                    setIsEditing(false);
                                    resetForm();
                                    setFormData(prev => ({ ...prev, employee_id: item.employee_id }));
                                    setShowAddDialog(true);
                                  }}
                                >
                                  <Plus className="w-3 h-3" />
                                  Proses
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Payroll Dialog */}
      {showAddDialog && (
        <InlineModal
          title={isEditing ? 'Edit Data Payroll' : 'Buat Payroll Baru'}
          description={isEditing ? 'Perbarui data penggajian karyawan.' : 'Tambah data penggajian karyawan'}
          onClose={() => setShowAddDialog(false)}
          maxWidth="max-w-2xl"
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
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {/* Rentang Tanggal Penggajian */}
            <div className="flex items-center gap-2 p-1.5 bg-blue-50/50 rounded-lg border border-blue-100 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-tighter mr-1 ml-1">
                <Calendar className="w-3 h-3" />
                Rentang:
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="h-7 w-[130px] text-[10px] font-mono border-blue-200 bg-white"
                />
                <span className="text-blue-400 text-xs">-</span>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-7 w-[130px] text-[10px] font-mono border-blue-200 bg-white"
                />
              </div>

                            {(() => {
                const hDates = attendanceSettings?.attendance_holidays || [];
                const start = new Date(formData.start_date);
                const end = new Date(formData.end_date);
                const hList = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const dStr = d.toISOString().split('T')[0];
                  if (d.getDay() === 0) hList.push({ date: dStr, name: 'Hari Minggu' });
                  else if (hDates.some(h => h.split('T')[0] === dStr)) hList.push({ date: dStr, name: 'Libur Perusahaan' });
                }
                if (hList.length === 0) return null;
                return (
                  <div className="relative group ml-2">
                    <div className="p-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200 animate-pulse cursor-help">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white border border-orange-100 rounded-lg shadow-xl p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-1.5 border-b border-orange-50 pb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Daftar Hari Libur:
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {hList.map((h, idx) => (
                          <div key={idx} className="flex flex-col border-l-2 border-orange-200 pl-1.5 py-0.5">
                            <span className="text-[9px] font-mono text-gray-500">{new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            <span className="text-[10px] font-medium text-gray-800 leading-tight">{h.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body">Bulan</Label>
                <NativeSelect
                  value={formData.period_month.toString()}
                  onChange={(value) => setFormData({ ...formData, period_month: parseInt(value) })}
                  className="font-body"
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Tahun</Label>
                <NativeSelect
                  value={formData.period_year.toString()}
                  onChange={(value) => setFormData({ ...formData, period_year: parseInt(value) })}
                  className="font-mono"
                >
                  {Array.from({ length: 3 }, (_, i) => currentYear - 1 + i).map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Gaji Pokok <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="15000000"
                className="font-mono"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
              />
            </div>

            {formData.employee_id && (
              <div className="space-y-4 border p-4 rounded-lg bg-blue-50/50 border-blue-100">
                <Label className="font-body font-bold text-blue-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Informasi Bank Karyawan
                </Label>
                <div className="grid grid-cols-2 gap-4 text-sm font-body">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs">Bank</span>
                    <p className="font-medium text-blue-900 border-b border-blue-200 pb-1">
                      {employees.find(e => e.id === formData.employee_id)?.bank || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs">No. Rekening</span>
                    <p className="font-medium text-blue-900 border-b border-blue-200 pb-1">
                      {employees.find(e => e.id === formData.employee_id)?.bank_account || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isSelectedEmployeeWorker && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="font-body text-amber-800">
                  Karyawan tukang tidak mendapatkan tunjangan payroll. Semua komponen tunjangan otomatis dikunci ke `0`.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-green-50/30">
              <div className="space-y-2">
                <Label className="font-body text-xs text-green-700">Uang Makan (Pro-rata)</Label>
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder="0"
                    className="font-mono text-sm border-green-200"
                    value={formData.meal_allowance}
                    disabled={isSelectedEmployeeWorker}
                    onChange={(e) => setFormData({ ...formData, meal_allowance: e.target.value })}
                  />
                  {allowanceDetails.find(d => d.includes('Uang Makan')) && (
                    <p className="text-[10px] text-green-600 italic">
                      {allowanceDetails.find(d => d.includes('Uang Makan'))?.split('=')[0]?.trim()}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs text-green-700">Uang Bensin (Pro-rata)</Label>
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder="0"
                    className="font-mono text-sm border-green-200"
                    value={formData.gasoline_allowance}
                    disabled={isSelectedEmployeeWorker}
                    onChange={(e) => setFormData({ ...formData, gasoline_allowance: e.target.value })}
                  />
                  {allowanceDetails.find(d => d.includes('Uang Bensin')) && (
                    <p className="text-[10px] text-green-600 italic">
                      {allowanceDetails.find(d => d.includes('Uang Bensin'))?.split('=')[0]?.trim()}
                    </p>
                  )}
                </div>
              </div>
              <div className="col-span-2 mt-1 space-y-4">
                {formData.manual_allowance_details?.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tunjangan Manual:</p>
                    {formData.manual_allowance_details?.map((ma, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-blue-800/80 italic pl-1">
                        <span>• {ma.title}</span>
                        <span className="font-mono">{formatCurrency(ma.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {formData.discretionary_allowance && Number(formData.discretionary_allowance) > 0 && (
                  <div className="flex justify-between text-[10px] text-blue-800/80 italic pt-1 border-t border-blue-100">
                    <span className="font-bold">Uang Bijak:</span>
                    <span className="font-mono">{formatCurrency(Number(formData.discretionary_allowance))}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 border p-4 rounded-lg bg-red-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-xs">Potongan Absen</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="font-mono text-sm"
                    value={formData.absent_deduction}
                    onChange={(e) => setFormData({ ...formData, absent_deduction: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs">Potongan Telat</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="font-mono text-sm"
                    value={formData.late_deduction}
                    onChange={(e) => setFormData({ ...formData, late_deduction: e.target.value })}
                  />
                </div>
                {formData.manual_deduction_details?.length > 0 && (
                  <div className="mt-1 col-span-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Potongan Manual:</p>
                    {formData.manual_deduction_details?.map((md, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-red-800/80 italic pl-1">
                        <span>• {md.title}</span>
                        <span className="font-mono">{formatCurrency(md.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <Label className="font-body text-xs text-red-700">Pinjaman (Mengurangi Penerimaan)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="font-mono text-sm border-red-200"
                    value={formData.loan_amount}
                    onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Summary Preview Areas */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-600 font-bold uppercase block mb-1">Total Penerimaan</span>
                <p className="font-mono font-bold text-blue-800">
                  {formatCurrency(
                    Number(formData.base_salary || 0) +
                    Number(formData.meal_allowance || 0) +
                    Number(formData.gasoline_allowance || 0) +
                    Number(formData.position_allowance || 0) +
                    Number(formData.discretionary_allowance || 0) +
                    Number(formData.thr_allowance || 0) +
                    Number(formData.allowances || 0)
                  )}
                </p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-[10px] text-red-600 font-bold uppercase block mb-1">Total Potongan</span>
                <p className="font-mono font-bold text-red-800">
                  {formatCurrency(
                    Number(formData.bpjs_deduction || 0) +
                    Number(formData.absent_deduction || 0) +
                    Number(formData.late_deduction || 0) +
                    Number(formData.loan_amount || 0) +
                    Number(formData.deductions || 0)
                  )}
                </p>
              </div>
            </div>

            {/* Net Salary Preview */}
            {formData.base_salary && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-body text-green-800">Gaji Bersih:</span>
                  <span className="font-mono font-bold text-green-800">
                    {formatCurrency(calculateNetSalary())}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 bg-white pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddPayroll} className="bg-hrd hover:bg-hrd-dark font-body">
              {isEditing ? 'Simpan Perubahan' : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Buat Payroll
                </>
              )}
            </Button>
          </div>
        </InlineModal>
      )}

      {/* View Payroll Details Dialog */}
      {showViewDialog && (
        <InlineModal
          title="Detail Penggajian"
          description="Informasi lengkap penggajian karyawan"
          onClose={() => setShowViewDialog(false)}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {selectedPayroll && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg border">
                  <div className="space-y-1">
                    <span className="text-gray-500 font-body">Bulan</span>
                    <p className="font-body font-medium">{months[selectedPayroll.period_month - 1]}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500 font-body">Tahun</span>
                    <p className="font-mono font-medium">{selectedPayroll.period_year}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-body font-bold text-blue-700 text-xs uppercase tracking-wider">Penerimaan</h4>
                  <div className="space-y-1 border rounded-lg p-3 bg-blue-50/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-body">Gaji Pokok</span>
                      <span className="font-mono">{formatCurrency(selectedPayroll.base_salary)}</span>
                    </div>
                    {selectedPayroll.position_allowance ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-body">Tunjangan Jabatan</span>
                        <span className="font-mono">{formatCurrency(selectedPayroll.position_allowance)}</span>
                      </div>
                    ) : null}
                    {selectedPayroll.meal_allowance ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-body">Uang Makan</span>
                        <span className="font-mono">{formatCurrency(selectedPayroll.meal_allowance)}</span>
                      </div>
                    ) : null}
                    {selectedPayroll.gasoline_allowance ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-body">Uang Bensin</span>
                        <span className="font-mono">{formatCurrency(selectedPayroll.gasoline_allowance)}</span>
                      </div>
                    ) : null}
                    {selectedPayroll.reward_allowance ? (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span className="font-body">Bonus/Reward</span>
                        <span className="font-mono">{formatCurrency(selectedPayroll.reward_allowance)}</span>
                      </div>
                    ) : null}
                    {selectedPayroll.thr_allowance ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-body">THR</span>
                        <span className="font-mono">{formatCurrency(selectedPayroll.thr_allowance)}</span>
                      </div>
                    ) : null}
                    {selectedPayroll.manual_allowance_details?.map((ma, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600 font-body">{ma.title}</span>
                        <span className="font-mono">{formatCurrency(ma.amount)}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-1 border-t flex justify-between text-sm font-bold text-blue-800">
                      <span className="font-body">Total Penerimaan</span>
                      <span className="font-mono">{formatCurrency(selectedPayroll.base_salary + selectedPayroll.allowances + (selectedPayroll.reward_allowance || 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-body font-bold text-red-700 text-xs uppercase tracking-wider">Potongan</h4>
                  <div className="space-y-1 border rounded-lg p-3 bg-red-50/30">
                    <div className="flex justify-between text-sm text-red-600">
                      <span className="font-body">Potongan Absen</span>
                      <span className="font-mono">({formatCurrency(selectedPayroll.absent_deduction || 0)})</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600">
                      <span className="font-body">Potongan Telat</span>
                      <span className="font-mono">({formatCurrency(selectedPayroll.late_deduction || 0)})</span>
                    </div>
                    {selectedPayroll.loan_amount ? (
                      <div className="flex justify-between text-sm text-red-600">
                        <span className="font-body">Pinjaman</span>
                        <span className="font-mono">({formatCurrency(selectedPayroll.loan_amount)})</span>
                      </div>
                    ) : null}
                    {selectedPayroll.bpjs_deduction ? (
                      <div className="flex justify-between text-sm text-red-600">
                        <span className="font-body">BPJS</span>
                        <span className="font-mono">({formatCurrency(selectedPayroll.bpjs_deduction)})</span>
                      </div>
                    ) : null}
                    {selectedPayroll.manual_deduction_details?.map((md, i) => (
                      <div key={i} className="flex justify-between text-sm text-red-600">
                        <span className="font-body">{md.title}</span>
                        <span className="font-mono">({formatCurrency(md.amount)})</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-1 border-t flex justify-between text-sm font-bold text-red-800">
                      <span className="font-body">Total Potongan</span>
                      <span className="font-mono">{formatCurrency(selectedPayroll.deductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="text-base font-body font-bold text-gray-900">Total Gaji Bersih</span>
                  <span className="text-xl font-mono font-bold text-hrd">{formatCurrency(selectedPayroll.net_salary)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Tutup</Button>
          </div>
        </InlineModal>
      )}
    </div>
  );
}
