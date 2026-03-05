import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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
  DropdownMenuSeparator,
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
import { generateSalarySlip } from '@/utils/pdfGenerator';
import { exportPayrollToExcel } from '@/utils/excelGenerator';
import { PayrollPrintSettingsDialog } from './PayrollPrintSettingsDialog';


// Hooks
import { usePayroll, useEmployees, useLoans } from '@/hooks/useSupabase';
import { attendanceService, rewardService, leaveService } from '@/services/supabaseService';
import { userService } from '@/services/userService';
import { settingsService } from '@/services/settingsService';
import { DEFAULT_PAYROLL_SETTINGS, PayrollSettings } from '@/types/settings';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollRecord } from '@/lib/supabase';

// Types
type PayrollStatus = 'pending' | 'paid' | 'cancelled';

interface PayrollFormData {
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
  manual_allowance_details: { title: string, amount: number }[];
  manual_deduction_details: { title: string, amount: number }[];
  bank_account_details: string;
  is_perfect_attendance: boolean;
}

const statusLabels: Record<PayrollStatus, string> = {
  pending: 'Menunggu',
  paid: 'Dibayar',
  cancelled: 'Dibatalkan'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const statusIcons = {
  pending: AlertCircle,
  paid: CheckCircle,
  cancelled: XCircle
};

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

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
  const [printSettings, setPrintSettings] = useState<any>(undefined);
  const [deductionDetails, setDeductionDetails] = useState<string[]>([]);
  const [allowanceDetails, setAllowanceDetails] = useState<string[]>([]);
  const [linkedEmployeeIds, setLinkedEmployeeIds] = useState<string[]>([]);
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
    manual_allowance_details: [],
    manual_deduction_details: [],
    bank_account_details: '',
    is_perfect_attendance: false,
  });

  // Custom Hooks
  const { payroll, loading, error, addPayroll, markAsPaid, updatePayroll, deletePayroll } = usePayroll(selectedMonth, selectedYear);
  const { employees } = useEmployees();
  const { loans } = useLoans();
  const { user } = useAuth();
  const { toast } = useToast();

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
      const settings = await settingsService.getPayrollSettings();
      setPayrollSettings(settings);
    } catch (error: any) {
      console.error("Failed to fetch payroll settings", error);
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

        let newDeductionDetails: string[] = [];
        let newAllowanceDetails: string[] = [];
        let totalDeductions = 0;

        // 1. Base Salary
        let baseSalaryValue = employee.salary;
        let maternityInfo = '';

        // --- 1.1 Maternity Leave Check ---
        try {
          const employeeLeaves = await leaveService.getByEmployee(formData.employee_id);
          const maternityLeaves = employeeLeaves.filter(l =>
            l.leave_type === 'maternity' &&
            l.status === 'approved'
          );

          if (maternityLeaves.length > 0) {
            const periodStart = new Date(formData.period_year, formData.period_month - 1, 1);
            const periodEnd = new Date(formData.period_year, formData.period_month, 0);

            const activeMaternity = maternityLeaves.find(l => {
              const start = new Date(l.start_date);
              const end = new Date(l.end_date);
              return (start <= periodEnd && end >= periodStart);
            });

            if (activeMaternity) {
              const leaveStart = new Date(activeMaternity.start_date);
              const monthDiff = (formData.period_year * 12 + formData.period_month) - (leaveStart.getFullYear() * 12 + (leaveStart.getMonth() + 1));
              const monthIndex = monthDiff + 1;

              if (monthIndex >= 1 && monthIndex <= 3) {
                let multiplier = 1.0;
                if (monthIndex === 2) multiplier = 0.75;
                else if (monthIndex === 3) multiplier = 0.5;

                baseSalaryValue = Math.round(baseSalaryValue * multiplier);
                maternityInfo = `Cuti Hamil Bulan ke-${monthIndex} (${multiplier * 100}% Gaji)`;
                newAllowanceDetails.push(maternityInfo);
              }
            }
          }
        } catch (err) {
          console.error("Maternity check error:", err);
        }

        const salary = baseSalaryValue.toString();

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
        let totalRewardAllowance = 0;
        let rewardDetailsItems: { title: string, amount: number }[] = [];
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

        try {
          attendance = await attendanceService.getByEmployee(formData.employee_id, formData.period_month, formData.period_year);

          // Absensi (Alpha) - status 'absent'
          absentCount = attendance?.filter((a: any) => {
            const status = (a.status || '').toLowerCase().trim();
            return status === 'absent' || status === 'tidak hadir' || status === 'alpha' || status === 'alpa';
          }).length || 0;

          if (absentCount > 0) {
            if (payrollSettings && payrollSettings.payroll_deduction_absent > 0) {
              absentDeductionAmount = absentCount * payrollSettings.payroll_deduction_absent;
              newDeductionDetails.push(`Absensi: ${absentCount} hari tidak hadir (Rp ${absentDeductionAmount.toLocaleString('id-ID')})`);
            }
          }

          // Keterlambatan (Late)
          totalLateMinutes = 0;
          let latePenalty = 0;
          attendance?.forEach((record: any) => {
            if (record.status === 'late' && record.check_in) {
              const [h, m] = record.check_in.split(':').map(Number);
              const checkInMinutes = h * 60 + m;
              const workStartMinutes = 8 * 60; // 08:00 standard masuk

              if (checkInMinutes > workStartMinutes) {
                const diff = (checkInMinutes - workStartMinutes);
                totalLateMinutes += diff;
              }
            }
          });

          if (totalLateMinutes > 0) {
            const multiplier = payrollSettings?.attendance_late_penalty || 1000;
            latePenalty = totalLateMinutes * multiplier;
            // The User wants Late Penalty (min * 1000) to be part of "Potongan Absen"
            absentDeductionAmount += latePenalty;
            newDeductionDetails.push(`Keterlambatan: ${totalLateMinutes} menit (Rp ${latePenalty.toLocaleString('id-ID')})`);
          }

          const presentCount = attendance?.filter((a: any) => ['present', 'late', 'business_trip', 'wfh'].includes(a.status)).length || 0;

          setDebugInfo({
            attendanceCount: attendance?.length || 0,
            absentCount: absentCount,
            presentCount: presentCount,
            lateMinutes: totalLateMinutes,
            deductionRate: payrollSettings?.attendance_late_penalty || 1000,
            foundSettings: !!payrollSettings,
            rawStatuses: attendance?.slice(0, 5).map((a: any) => a.status || 'null')
          });

          // --- Auto-Calculate Allowances & Deductions based on Settings ---
          if (payrollSettings) {
            const workingDays = 26; // Fixed 26 days divisor as per user request
            const dailyAbsentPenalty = Math.round((
              (payrollSettings.payroll_allowance_position || 0) +
              (payrollSettings.payroll_allowance_meal || 0) +
              (payrollSettings.payroll_allowance_gasoline || 0)
            ) / workingDays);

            // Base salary proration (keep existing logic or adjust if needed)
            // The user specifically mentioned allowances, usually base salary is also prorated
            baseSalaryValue = Math.round((baseSalaryValue / workingDays) * presentCount);

            // Allowances are now recorded at full monthly value (no more proration here)
            // Deduction will be handled separately in absentDeductionAmount
            mealAllowance = payrollSettings.payroll_allowance_meal || 0;
            gasolineAllowance = payrollSettings.payroll_allowance_gasoline || 0;
            positionAllowance = payrollSettings.payroll_allowance_position || 0;

            // Explicit absence deduction based on (P+M+G)/26
            if (absentCount > 0) {
              const formulaAbsenceDeduction = absentCount * dailyAbsentPenalty;
              absentDeductionAmount += formulaAbsenceDeduction;
              newDeductionDetails.push(`Absensi: ${absentCount} hari x Rp ${dailyAbsentPenalty.toLocaleString('id-ID')} = Rp ${formulaAbsenceDeduction.toLocaleString('id-ID')}`);
            }

            // bpjs
            const employeeBpjs = employee.deductions?.find((d: any) =>
              d.title.toUpperCase().includes('BPJS')
            );

            if (employeeBpjs) {
              bpjsDeduction = employeeBpjs.amount;
            } else {
              bpjsDeduction = payrollSettings.payroll_bpjs_rate || 0;
            }

            thrAllowance = payrollSettings.payroll_allowance_thr || 0;

            if (mealAllowance > 0) {
              newAllowanceDetails.push(`Uang Makan: ${formatCurrency(mealAllowance)} (Utuh)`);
            }
            if (gasolineAllowance > 0) {
              newAllowanceDetails.push(`Uang Bensin: ${formatCurrency(gasolineAllowance)} (Utuh)`);
            }
          }

          // --- Manual Items from Employee Profile ---
          manualAllowanceItems = employee.allowances || [];
          manualDeductionItems = employee.deductions || [];

          if (manualAllowanceItems.length > 0) {
            totalManualAllowances = manualAllowanceItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          }

          if (manualDeductionItems.length > 0) {
            totalManualDeductions = manualDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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
          deductions: (totalDeductions + totalManualDeductions).toString(),
          bank_account_details: employee.bank_account || '',
          meal_allowance: mealAllowance.toString(),
          gasoline_allowance: gasolineAllowance.toString(),
          bpjs_deduction: bpjsDeduction.toString(),
          absent_deduction: absentDeductionAmount.toString(),
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

  // Filter payroll based on search and role
  const filteredPayroll = payroll.filter(pay => {
    // If staff, only show their own
    if (user?.role === 'staff') {
      if (user.employee_id) {
        return pay.employee_id === user.employee_id;
      }
      return false;
    }

    const employee = employees.find(emp => emp.id === pay.employee_id);
    const employeeName = employee?.name || '';
    return employeeName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate statistics
  const stats = {
    totalPayroll: payroll.reduce((sum, pay) => sum + pay.net_salary, 0),
    pendingPayroll: payroll.filter(pay => pay.status === 'pending').length,
    paidPayroll: payroll.filter(pay => pay.status === 'paid').length,
    totalEmployees: payroll.length,
    averageSalary: payroll.length > 0 ? payroll.reduce((sum, pay) => sum + pay.net_salary, 0) / payroll.length : 0
  };

  // Reset form
  const resetForm = () => {
    setFormData({
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
      manual_allowance_details: [],
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

    const manualAllowancesTotal = formData.manual_allowance_details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const manualDeductionsTotal = formData.manual_deduction_details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    const totalAllowances = allowances + gasoline + meal + position + discretionary + thr + manualAllowancesTotal;
    const totalDeductions = deductions + bpjs + absent; // 'deductions' already includes loans + manual deductions now
    const overtimePay = overtimeHours * overtimeRate;

    return baseSalary + totalAllowances + overtimePay - totalDeductions;
  };

  // Handle edit payroll
  const handleEditPayroll = (p: PayrollRecord) => {
    setIsEditing(true);
    setEditId(p.id);
    setFormData({
      employee_id: p.employee_id,
      period_month: p.period_month,
      period_year: p.period_year,
      base_salary: p.base_salary.toString(),
      allowances: (p.allowances - (p.gasoline_allowance || 0) - (p.meal_allowance || 0) - (p.position_allowance || 0) - (p.discretionary_allowance || 0) - (p.thr_allowance || 0)).toString(),
      deductions: (p.deductions - (p.bpjs_deduction || 0) - (p.absent_deduction || 0)).toString(),
      overtime_hours: '0',
      overtime_rate: '0',
      gasoline_allowance: (p.gasoline_allowance || 0).toString(),
      meal_allowance: (p.meal_allowance || 0).toString(),
      position_allowance: (p.position_allowance || 0).toString(),
      discretionary_allowance: (p.discretionary_allowance || 0).toString(),
      thr_allowance: (p.thr_allowance || 0).toString(),
      bpjs_deduction: (p.bpjs_deduction || 0).toString(),
      absent_deduction: (p.absent_deduction || 0).toString(),
      manual_allowance_details: [],
      manual_deduction_details: [],
      bank_account_details: p.bank_account_details || '',
      is_perfect_attendance: false,
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

      if (!linkedEmployeeIds.includes(formData.employee_id)) {
        toast({
          title: 'Karyawan Belum Registrasi',
          description: 'Karyawan ini belum memiliki akun sistem (User Account).',
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
      const manualAllowancesTotal = formData.manual_allowance_details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      const totalAllowances = allowances + gasoline + meal + position + discretionary + thr + manualAllowancesTotal;
      const totalDeductions = deductions + bpjs + absent;
      const netSalary = calculateNetSalary();

      const payrollPayload: any = {
        employee_id: formData.employee_id,
        period_month: formData.period_month,
        period_year: formData.period_year,
        base_salary: baseSalary,
        allowances: totalAllowances,
        deductions: totalDeductions,
        net_salary: netSalary,
        gasoline_allowance: gasoline,
        meal_allowance: meal,
        position_allowance: position,
        discretionary_allowance: discretionary,
        thr_allowance: thr,
        bpjs_deduction: bpjs,
        absent_deduction: absent,
        reward_allowance: 0,
        reward_details: [],
        bank_account_details: formData.bank_account_details,
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
      for (const employee of eligibleEmployees) {
        // Basic calculations
        let baseSalary = employee.salary;
        let totalDeductions = 0;
        let mealAllowance = 0;
        let gasolineAllowance = 0;
        let totalRewardAllowance = 0;
        let absentDeductionAmount = 0;
        let newAllowanceDetails: string[] = [];

        // --- Special Case: Maternity Leave ---
        try {
          const leaveRequests = await leaveService.getByEmployee(employee.id);
          const maternityLeave = leaveRequests?.find(l =>
            l.leave_type === 'maternity' &&
            l.status === 'approved' &&
            new Date(l.start_date) <= new Date(selectedYear, selectedMonth - 1, 1) &&
            new Date(l.end_date) >= new Date(selectedYear, selectedMonth - 1, 1)
          );

          if (maternityLeave) {
            const start = new Date(maternityLeave.start_date);
            const current = new Date(selectedYear, selectedMonth - 1, 1);
            const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());

            let tierPercentage = 100;
            if (diffMonths === 1) tierPercentage = 75;
            else if (diffMonths >= 2) tierPercentage = 50;

            const originalSalary = baseSalary;
            baseSalary = (originalSalary * tierPercentage) / 100;
            newAllowanceDetails.push(`Maternity Leave (${tierPercentage}% Gaji): ${formatCurrency(originalSalary)} -> ${formatCurrency(baseSalary)}`);
          }
        } catch (err) {
          console.error("Error checking maternity leave in batch:", err);
        }

        // Loans
        const activeLoans = loans.filter(l =>
          l.employee_id === employee.id &&
          l.status === 'approved' &&
          l.remaining_amount > 0 &&
          new Date(l.start_date) <= new Date(selectedYear, selectedMonth - 1, 1)
        );
        totalDeductions += activeLoans.reduce((sum, loan) => sum + loan.installment_amount, 0);

        // Attendance & Rewards
        const attendance = await attendanceService.getByEmployee(employee.id, selectedMonth, selectedYear);
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

        if (absentCount > 0 && payrollSettings?.payroll_deduction_absent) {
          absentDeductionAmount = absentCount * payrollSettings.payroll_deduction_absent;
        }

        let totalLateMinutes = 0;
        const manualAllowanceItems = employee.allowances || [];
        const manualDeductionItems = employee.deductions || [];
        const totalManualAllowances = manualAllowanceItems.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalManualDeductions = manualDeductionItems.reduce((sum, i) => sum + (i.amount || 0), 0);

        attendance?.forEach((record: any) => {
          if (record.status === 'late' && record.check_in) {
            const [h, m] = record.check_in.split(':').map(Number);
            const checkInMinutes = h * 60 + m;
            const workStartMinutes = 8 * 60;
            if (checkInMinutes > workStartMinutes) {
              totalLateMinutes += (checkInMinutes - workStartMinutes);
            }
          }
        });

        if (totalLateMinutes > 0) {
          absentDeductionAmount += totalLateMinutes * (payrollSettings?.attendance_late_penalty || 1000);
        }

        const presentCount = attendance?.filter((a: any) => ['present', 'late', 'business_trip', 'wfh'].includes(a.status)).length || 0;
        const workingDays = 26; // Fixed 26 days divisor
        const dailyAbsentPenalty = Math.round((
          (payrollSettings?.payroll_allowance_position || 0) +
          (payrollSettings?.payroll_allowance_meal || 0) +
          (payrollSettings?.payroll_allowance_gasoline || 0)
        ) / workingDays);

        // Prorate base salary based on attendance
        baseSalary = Math.round((baseSalary / workingDays) * presentCount);

        // Allowances at full value
        mealAllowance = payrollSettings?.payroll_allowance_meal || 0;
        gasolineAllowance = payrollSettings?.payroll_allowance_gasoline || 0;
        const position = payrollSettings?.payroll_allowance_position || 0;

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

        const bpjs = payrollSettings?.payroll_bpjs_rate || 0;
        const discretionary = 0;
        const thr = payrollSettings?.payroll_allowance_thr || 0;

        const totalOtherAllowances = mealAllowance + gasolineAllowance + position + discretionary + thr + totalManualAllowances;
        const combinedDeductions = totalDeductions + bpjs + absentDeductionAmount + totalManualDeductions;
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
          bpjs_deduction: bpjs,
          absent_deduction: absentDeductionAmount,
          reward_allowance: totalRewardAllowance,
          reward_details: rewardDetailsItems,
          manual_allowance_details: manualAllowanceItems,
          manual_deduction_details: manualDeductionItems,
          bank_account_details: employee.bank_account || '',
          is_perfect_attendance: isPerfect
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
    exportPayrollToExcel(filteredPayroll, employees, { month: selectedMonth, year: selectedYear });
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
            payroll={filteredPayroll[0]}
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
            Ekspor
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[150px] font-body">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px] font-mono">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body">Total Gaji</TableHead>
                    <TableHead className="font-body text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.map((pay) => {
                    const employee = employees.find(e => e.id === pay.employee_id);
                    const StatusIcon = statusIcons[pay.status as PayrollStatus];
                    return (
                      <TableRow key={pay.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-hrd/10 text-hrd">
                                {employee?.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-body font-medium">{employee?.name}</p>
                              <p className="text-xs text-gray-500 font-body">{employee?.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[pay.status as PayrollStatus]} font-body flex items-center w-fit gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusLabels[pay.status as PayrollStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {formatCurrency(pay.net_salary)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedPayroll(pay); setShowViewDialog(true); }}>
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                            {user?.role !== 'staff' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {pay.status === 'pending' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleMarkAsPaid(pay.id)} className="text-green-600 font-body">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Tandai Dibayar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleEditPayroll(pay)} className="font-body">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => handlePrintSlip(pay)} className="font-body">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Cetak Slip
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeletePayroll(pay.id)} className="text-red-600 font-body">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditing ? 'Edit Data Payroll' : 'Buat Payroll Baru'}
            </DialogTitle>
            <DialogDescription className="font-body">
              {isEditing ? 'Perbarui data penggajian karyawan.' : 'Tambah data penggajian karyawan'}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body">Bulan</Label>
                <Select value={formData.period_month.toString()} onValueChange={(value) => setFormData({ ...formData, period_month: parseInt(value) })}>
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()} className="font-body">
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Tahun</Label>
                <Select value={formData.period_year.toString()} onValueChange={(value) => setFormData({ ...formData, period_year: parseInt(value) })}>
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 3 }, (_, i) => currentYear - 1 + i).map(year => (
                      <SelectItem key={year} value={year.toString()} className="font-mono">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-green-50/30">
              <div className="space-y-2">
                <Label className="font-body text-xs text-green-700">Uang Makan (Pro-rata)</Label>
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder="0"
                    className="font-mono text-sm border-green-200"
                    value={formData.meal_allowance}
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
                {formData.manual_deduction_details?.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Potongan Manual:</p>
                    {formData.manual_deduction_details?.map((md, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-red-800/80 italic pl-1">
                        <span>• {md.title}</span>
                        <span className="font-mono">{formatCurrency(md.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                    Number(formData.deductions || 0)
                  )}
                </p>
              </div>
            </div>

            {/* Removed the redundant Rincian boxes as they are now inline or in summary */}

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
          <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payroll Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Penggajian</DialogTitle>
            <DialogDescription className="font-body">
              Informasi lengkap penggajian karyawan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayroll && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-500">Bulan</span>
                  <p className="font-body font-medium">{months[selectedPayroll.period_month - 1]}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500">Tahun</span>
                  <p className="font-mono font-medium">{selectedPayroll.period_year}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}