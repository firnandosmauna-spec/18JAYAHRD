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

import { attendanceService, rewardService } from '@/services/supabaseService';

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

  reward_allowance: string;

  reward_details: { title: string, amount: number }[];

  manual_allowance_details: { title: string, amount: number }[];

  manual_deduction_details: { title: string, amount: number }[];

  bank_account_details: string;

  is_perfect_attendance: boolean;

  target_achieved: boolean;

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

  const [printSettings, setPrintSettings] = useState<unknown>(undefined);

  const [deductionDetails, setDeductionDetails] = useState<string[]>([]);

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

    reward_allowance: '0',

    reward_details: [],

    manual_allowance_details: [],

    manual_deduction_details: [],

    bank_account_details: '',

    is_perfect_attendance: false,

    target_achieved: false

  });



  // Custom Hooks

  const { payroll, loading, error, addPayroll, markAsPaid, updatePayroll, deletePayroll } = usePayroll(selectedMonth, selectedYear);

  const { employees } = useEmployees();

  const { loans } = useLoans();

  const { user } = useAuth();

  const { toast } = useToast();



  console.log("DEBUG: Current User Role:", user?.role);

  console.log("DEBUG: Current User ID:", user?.id);

  console.log("DEBUG: Current Employee ID:", user?.employee_id);



  // Load initial settings

  useEffect(() => {

    const saved = localStorage.getItem('hris_payroll_print_settings');

    if (saved) {

      try {

        setPrintSettings(JSON.parse(saved));

      } catch (e) { console.error(e); }

    }

  }, []);



  const fetchPayrollSettings = async () => {

    try {

      console.log("DEBUG: Attempting to fetch payroll settings...");

      const settings = await settingsService.getPayrollSettings();

      console.log("DEBUG: Fetched payroll settings successfully:", settings);

      setPayrollSettings(settings);

    } catch (error: any) {

      console.error("FATAL: Failed to fetch payroll settings", error);

      // Update debug info to show the error

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



  // Auto-fill salary and calculate deductions when employee changes

  useEffect(() => {

    if (formData.employee_id) {

      const fetchData = async () => {

        const employee = employees.find(e => e.id === formData.employee_id);

        if (!employee) return;



        let newDetails: string[] = [];

        let totalDeductions = 0;



        // 1. Base Salary

        const salary = employee.salary.toString();



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

          newDetails.push(`Potongan Kasbon: ${formatCurrency(totalLoanDeduction)}`);

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

          const rewards = await rewardService.getByEmployee(formData.employee_id);



          // Filter rewards by period and status (only claimed)

          const periodRewards = rewards.filter((r: any) => {

            if (r.status !== 'claimed' || !r.claimed_date) return false;

            const rewardDate = new Date(r.claimed_date);

            return rewardDate.getMonth() + 1 === formData.period_month &&

              rewardDate.getFullYear() === formData.period_year;

          });



          totalRewardAllowance = periodRewards.reduce((sum: number, r: any) => sum + (r.points || 0), 0);

          rewardDetailsItems = periodRewards.map((r: any) => ({

            title: r.title || 'Penghargaan',

            amount: r.points || 0

          }));



          if (totalRewardAllowance > 0) {

            const rewardList = periodRewards.map((r: any) => r.title || 'Penghargaan').join(', ');

            newDetails.push(`Reward: ${rewardList} (${formatCurrency(totalRewardAllowance)})`);

          }



          setFormData(prev => ({

            ...prev,

            reward_allowance: totalRewardAllowance.toString(),

            reward_details: rewardDetailsItems

          }));



          // DEBUG LOGGING

          console.log(`DEBUG: Fetching attendance for EmployeeID: ${formData.employee_id}, Period: ${formData.period_month}/${formData.period_year}`);

          console.log("DEBUG: Raw Attendance data:", attendance);

          console.log("DEBUG: Payroll Settings found:", payrollSettings ? "YES" : "NO", payrollSettings);



          // Absensi (Alpha) - status 'absent'

          absentCount = attendance?.filter((a: any) => {

            const status = (a.status || '').toLowerCase().trim();

            return status === 'absent' || status === 'tidak hadir' || status === 'alpha' || status === 'alpa';

          }).length || 0;



          if (absentCount > 0) {

            if (payrollSettings && payrollSettings.payroll_deduction_absent > 0) {

              absentDeductionAmount = absentCount * payrollSettings.payroll_deduction_absent;

              newDetails.push(`Absensi: ${absentCount} hari tidak hadir (Rp ${absentDeductionAmount.toLocaleString('id-ID')})`);

            } else if (payrollSettings) {

              newDetails.push(`Absensi: ${absentCount} hari tidak hadir (Rp 0 di settings)`);

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

            newDetails.push(`Keterlambatan: ${totalLateMinutes} menit (Rp ${latePenalty.toLocaleString('id-ID')})`);

          }



          // 4. Sanctions Info (SP1)

          const sp1Count = attendance?.filter((record: any) =>

            record.notes && record.notes.includes('SP1 TRIGGERED')

          ).length || 0;



          if (sp1Count > 0) {

            newDetails.push(`Sanksi: ${sp1Count}x Peringatan SP1 Mingguan (Akumulasi > 30 menit)`);

          }



          // Move setDebugInfo here so all variables are initialized

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



          // --- Auto-Calculate Allowances based on Settings ---

          if (payrollSettings) {

            const presentCount = attendance?.filter((a: any) => ['present', 'late', 'business_trip', 'wfh'].includes(a.status)).length || 0;

            const daysInMonth = new Date(formData.period_year, formData.period_month, 0).getDate();



            mealAllowance = Math.round(((payrollSettings.payroll_allowance_meal || 0) / daysInMonth) * presentCount);

            gasolineAllowance = Math.round(((payrollSettings.payroll_allowance_gasoline || 0) / daysInMonth) * presentCount);

            bpjsDeduction = payrollSettings.payroll_bpjs_rate || 0;

            positionAllowance = payrollSettings.payroll_allowance_position || 0;

            thrAllowance = payrollSettings.payroll_allowance_thr || 0;



            if (payrollSettings.payroll_allowance_meal > 0 && mealAllowance > 0) {

              newDetails.push(`Uang Makan: ${presentCount}/${daysInMonth} hari x ${formatCurrency(payrollSettings.payroll_allowance_meal)} = ${formatCurrency(mealAllowance)}`);

            }

            if (payrollSettings.payroll_allowance_gasoline > 0 && gasolineAllowance > 0) {

              newDetails.push(`Uang Bensin: ${presentCount}/${daysInMonth} hari x ${formatCurrency(payrollSettings.payroll_allowance_gasoline)} = ${formatCurrency(gasolineAllowance)}`);

            }



            // --- Perfect Attendance Reward (Automatic) ---

            const isPerfect = absentCount === 0 && totalLateMinutes === 0 && attendance?.length > 0;

            if (isPerfect && payrollSettings.payroll_reward_perfect_attendance > 0) {

              const amount = payrollSettings.payroll_reward_perfect_attendance;

              totalRewardAllowance += amount;

              rewardDetailsItems.push({

                title: 'Kehadiran Sempurna',

                amount: amount

              });

              newDetails.push(`Reward: Kehadiran Sempurna (${formatCurrency(amount)})`);

            }



            // --- Target Achievement Reward (Manual Toggle) ---

            if (formData.target_achieved && payrollSettings.payroll_reward_target_achievement > 0) {

              const amount = payrollSettings.payroll_reward_target_achievement;

              totalRewardAllowance += amount;

              rewardDetailsItems.push({

                title: 'Pencapaian Target',

                amount: amount

              });

              newDetails.push(`Reward: Pencapaian Target (${formatCurrency(amount)})`);

            }

          }



          // --- Manual Items from Employee Profile ---

          manualAllowanceItems = employee.allowances || [];

          manualDeductionItems = employee.deductions || [];



          if (manualAllowanceItems.length > 0) {

            totalManualAllowances = manualAllowanceItems.reduce((sum, item) => sum + (item.amount || 0), 0);

            const itemsList = manualAllowanceItems.map(i => i.title).join(', ');

            newDetails.push(`Tunjangan Manual: ${itemsList} (${formatCurrency(totalManualAllowances)})`);

          }



          if (manualDeductionItems.length > 0) {

            totalManualDeductions = manualDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);

            const itemsList = manualDeductionItems.map(i => i.title).join(', ');

            newDetails.push(`Potongan Manual: ${itemsList} (${formatCurrency(totalManualDeductions)})`);

          }



        } catch (error: any) {

          console.error("Error in payroll calculation:", error);

          setDebugInfo(prev => ({

            ...prev,

            error: `Attendance Error: ${error.message || JSON.stringify(error)}`

          }));

        }



        setDeductionDetails(newDetails);



        setFormData(prev => {

          return {

            ...prev,

            base_salary: salary,

            deductions: totalDeductions.toString(), // loans + late

            bank_account_details: employee.bank_account || '',

            meal_allowance: mealAllowance.toString(),

            gasoline_allowance: gasolineAllowance.toString(),

            bpjs_deduction: bpjsDeduction.toString(),

            absent_deduction: absentDeductionAmount.toString(),

            reward_allowance: totalRewardAllowance.toString(),

            reward_details: rewardDetailsItems,

            manual_allowance_details: manualAllowanceItems,

            manual_deduction_details: manualDeductionItems,

            position_allowance: positionAllowance.toString(),

            thr_allowance: thrAllowance.toString(),

            // Add manual items to total numeric fields if necessary, 

            // but usually 'allowance' and 'deduction' represent "Other"

            // For now, let's keep them separate as details, but they MUST be added in handleAddPayroll

            is_perfect_attendance: absentCount === 0 && totalLateMinutes === 0 && (attendance?.length || 0) > 0,

          };

        });

      };



      fetchData();

    }

  }, [formData.employee_id, employees, loans, formData.period_month, formData.period_year, payrollSettings, formData.target_achieved]);



  // Filter payroll based on search and role

  const filteredPayroll = payroll.filter(pay => {

    // If staff, only show their own

    if (user?.role === 'staff') {

      if (user.employee_id) {

        return pay.employee_id === user.employee_id;

      }

      // If staff but no employee_id found, show nothing for safety

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

      reward_allowance: '0',

      reward_details: [],

      manual_allowance_details: [],

      manual_deduction_details: [],

      bank_account_details: '',

      is_perfect_attendance: false,

      target_achieved: false

    });

    setDeductionDetails([]);

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



    // New Fields

    const gasoline = parseFloat(formData.gasoline_allowance) || 0;

    const meal = parseFloat(formData.meal_allowance) || 0;

    const position = parseFloat(formData.position_allowance) || 0;

    const discretionary = parseFloat(formData.discretionary_allowance) || 0;

    const thr = parseFloat(formData.thr_allowance) || 0;

    const bpjs = parseFloat(formData.bpjs_deduction) || 0;

    const absent = parseFloat(formData.absent_deduction) || 0;

    const reward = parseFloat(formData.reward_allowance) || 0;



    const totalAllowances = allowances + gasoline + meal + position + discretionary + thr + reward;

    const totalDeductions = deductions + bpjs + absent;

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

      overtime_hours: '0', // Not stored in model yet or separately

      overtime_rate: '0',

      gasoline_allowance: (p.gasoline_allowance || 0).toString(),

      meal_allowance: (p.meal_allowance || 0).toString(),

      position_allowance: (p.position_allowance || 0).toString(),

      discretionary_allowance: (p.discretionary_allowance || 0).toString(),

      thr_allowance: (p.thr_allowance || 0).toString(),

      bpjs_deduction: (p.bpjs_deduction || 0).toString(),

      absent_deduction: (p.absent_deduction || 0).toString(),

      reward_allowance: (p.reward_allowance || 0).toString(),

      reward_details: p.reward_details || [],

      bank_account_details: p.bank_account_details || '',

      manual_allowance_details: p.manual_allowance_details || [],

      manual_deduction_details: p.manual_deduction_details || [],

      is_perfect_attendance: !!p.is_perfect_attendance,

      target_achieved: false // Default for editing, or figure out if we want to store it

    });

    setShowAddDialog(true);

  };



  // Handle add payroll

  const handleAddPayroll = async () => {

    console.log("Attempting to add payroll:", formData);

    try {

      if (!formData.employee_id || !formData.base_salary) {

        toast({

          title: 'Validasi Gagal',

          description: 'Mohon pilih karyawan dan isi gaji pokok.',

          variant: 'destructive',

        });

        return;

      }



      // Check if employee is registered (has system account)

      if (!linkedEmployeeIds.includes(formData.employee_id)) {

        toast({

          title: 'Karyawan Belum Registrasi',

          description: 'Karyawan ini belum melakukan registrasi akun (User Account). Silakan buat akun pengguna untuk karyawan ini terlebih dahulu di menu Manajemen Pengguna.',

          variant: 'destructive',

        });

        return;

      }



      // Check for duplicate pending payroll (Prevent Double/Spam)

      // Only effective if we are viewing the same period (which is standard usage)

      const isDuplicate = payroll.some(p =>

        p.employee_id === formData.employee_id &&

        p.period_month === formData.period_month &&

        p.period_year === formData.period_year &&

        p.status === 'pending'

      );



      if (isDuplicate) {

        toast({

          title: 'Permintaan Gagal',

          description: 'Gaji anda sudah diajukan, silahkan cek status.',

          variant: 'default',

          className: 'bg-yellow-600 text-white border-yellow-700'

        });

        return;

      }



      // Check for already PAID/APPROVED payroll

      const isPaid = payroll.some(p =>

        p.employee_id === formData.employee_id &&

        p.period_month === formData.period_month &&

        p.period_year === formData.period_year &&

        p.status === 'paid'

      );



      if (isPaid) {

        toast({

          title: 'Permintaan Gagal',

          description: 'Gaji anda sudah disetujui, cek status.',

          variant: 'default',

          className: 'bg-green-600 text-white border-green-700'

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



      const totalAllowances = allowances + gasoline + meal + position + discretionary + thr;

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

        reward_allowance: parseFloat(formData.reward_allowance) || 0,

        reward_details: formData.reward_details,

        bank_account_details: formData.bank_account_details

      };



      if (isEditing && editId) {

        await updatePayroll(editId, payrollPayload);

        toast({

          title: 'Sukses',

          description: 'Berhasil memperbarui data payroll!',

        });

      } else {

        payrollPayload.status = 'pending';

        await addPayroll(payrollPayload);

        toast({

          title: 'Sukses',

          description: 'Berhasil membuat data payroll!',

          className: 'bg-green-600 text-white'

        });

      }



      setShowAddDialog(false);

      resetForm();

    } catch (error: any) {

      console.error('Failed to save payroll:', error);

      toast({

        title: 'Error',

        description: `Gagal menyimpan data penggajian: ${error.message || 'Error tidak diketahui'}`,

        variant: 'destructive',

      });

    }

  };



  // Batch Process Payroll logic

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

        let totalDeductions = 0;

        let mealAllowance = 0;

        let gasolineAllowance = 0;

        let totalRewardAllowance = 0;

        let absentDeductionAmount = 0;



        // Loans

        const activeLoans = loans.filter(l =>

          l.employee_id === employee.id &&

          l.status === 'approved' &&

          l.remaining_amount > 0 &&

          new Date(l.start_date) <= new Date(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`)

        );

        totalDeductions += activeLoans.reduce((sum, loan) => sum + loan.installment_amount, 0);



        // Attendance & Rewards

        const attendance = await attendanceService.getByEmployee(employee.id, selectedMonth, selectedYear);

        const rewards = await rewardService.getByEmployee(employee.id);



        const periodRewards = rewards.filter((r: any) => {

          if (r.status !== 'claimed' || !r.claimed_date) return false;

          const rewardDate = new Date(r.claimed_date);

          return rewardDate.getMonth() + 1 === selectedMonth && rewardDate.getFullYear() === selectedYear;

        });

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

        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();



        mealAllowance = Math.round(((payrollSettings?.payroll_allowance_meal || 0) / daysInMonth) * presentCount);

        gasolineAllowance = Math.round(((payrollSettings?.payroll_allowance_gasoline || 0) / daysInMonth) * presentCount);



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

        const position = payrollSettings?.payroll_allowance_position || 0;

        const discretionary = 0;

        const thr = payrollSettings?.payroll_allowance_thr || 0;



        const totalOtherAllowances = mealAllowance + gasolineAllowance + position + discretionary + thr + totalManualAllowances;

        const combinedDeductions = totalDeductions + bpjs + absentDeductionAmount + totalManualDeductions;

        const netSalary = (employee.salary || 0) + totalOtherAllowances + totalRewardAllowance - combinedDeductions;



        await addPayroll({

          employee_id: employee.id,

          period_month: selectedMonth,

          period_year: selectedYear,

          base_salary: employee.salary,

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



  // Helper to check if it's payroll day

  const isPayrollDay = () => {

    const today = new Date().getDate();

    return today === (payrollSettings?.payroll_schedule_day || 23);

  };



  // Handle mark as paid

  const handleMarkAsPaid = async (payrollId: string) => {

    try {

      const payDate = new Date().toISOString().split('T')[0];

      await markAsPaid(payrollId, payDate);

    } catch (error) {

      console.error('Failed to mark as paid:', error);

      toast({

        title: 'Error',

        description: 'Gagal menandai sebagai dibayar',

        variant: 'destructive',

      });

    }

  };



  // Handle Delete Payroll

  const handleDeletePayroll = async (payrollId: string) => {

    if (!confirm('Apakah Anda yakin ingin menghapus data penggajian ini?')) return;



    try {

      await deletePayroll(payrollId);

      // alert('Data penggajian berhasil dihapus'); 

    } catch (error) {

      console.error('Failed to delete payroll:', error);

      toast({

        title: 'Error',

        description: 'Gagal menghapus data penggajian',

        variant: 'destructive',

      });

    }

  };



  // Handle download slip

  const handleDownloadSlip = (payroll: PayrollRecord) => {

    const employee = employees.find(emp => emp.id === payroll.employee_id);

    if (!employee) {

      toast({

        title: 'Error',

        description: 'Data karyawan tidak ditemukan',

        variant: 'destructive',

      });

      return;

    }

    console.log("DEBUG: Generating PDF for employee:", employee.name, {

      bank: employee.bank,

      bank_account: employee.bank_account

    });

    generateSalarySlip(payroll, employee, printSettings as any);

  };



  // Handle Export Excel

  const handleExportExcel = () => {

    if (filteredPayroll.length === 0) {

      toast({

        title: 'Info',

        description: 'Tidak ada data payroll untuk diexport',

      });

      return;

    }



    exportPayrollToExcel(filteredPayroll, employees, {

      month: selectedMonth,

      year: selectedYear

    });



    // alert('Laporan payroll berhasil didownload');

  };



  // Handle view payroll details

  const handleViewPayroll = (payroll: PayrollRecord) => {

    setSelectedPayroll(payroll);

    setShowViewDialog(true);

  };



  if (loading) {

    return (

      <div className="flex items-center justify-center h-[60vh]">

        <div className="text-center">

          <div className="w-8 h-8 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />

          <p className="text-muted-foreground font-body">Memuat data penggajian...</p>

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

      <div className="flex items-center justify-between">

        <div>

          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Penggajian</h1>

          <p className="text-muted-foreground font-body">Kelola penggajian dan tunjangan karyawan</p>

        </div>

        {user?.role !== 'staff' && (

          <div className="flex items-center gap-2">

            <Button

              className="bg-hrd hover:bg-hrd-dark font-body"

              onClick={() => {

                resetForm();

                setShowAddDialog(true);

              }}

            >

              <Plus className="w-4 h-4 mr-2" />

              Buat Payroll

            </Button>

          </div>

        )}

      </div>



      {/* Period Selector */}

      <Card className="border-gray-200">

        <CardContent className="p-4">

          <div className="flex items-center gap-4">

            <Label className="font-body">Periode:</Label>

            <Select

              value={selectedMonth.toString()}

              onValueChange={(value) => setSelectedMonth(parseInt(value))}

              disabled={user?.role === 'staff'}

            >

              <SelectTrigger className="w-40 font-body">

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

            <Select

              value={selectedYear.toString()}

              onValueChange={(value) => setSelectedYear(parseInt(value))}

              disabled={user?.role === 'staff'}

            >

              <SelectTrigger className="w-32 font-mono">

                <SelectValue />

              </SelectTrigger>

              <SelectContent>

                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (

                  <SelectItem key={year} value={year.toString()} className="font-mono">

                    {year}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            {user?.role === 'staff' && (

              <p className="text-xs text-muted-foreground ml-2">

                *Staf hanya dapat melihat periode saat ini

              </p>

            )}

          </div>

        </CardContent>

      </Card>



      {/* Payroll Schedule Banner */}

      {user?.role !== 'staff' && (

        <motion.div

          initial={{ opacity: 0, scale: 0.95 }}

          animate={{ opacity: 1, scale: 1 }}

        >

          <Card className={`border-none shadow-sm ${isPayrollDay() ? 'bg-blue-600 text-white' : 'bg-gray-50 border border-gray-100'}`}>

            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className={`p-2 rounded-xl ${isPayrollDay() ? 'bg-white/20' : 'bg-blue-100'}`}>

                  <Calendar className={`w-5 h-5 ${isPayrollDay() ? 'text-white' : 'text-blue-600'}`} />

                </div>

                <div>

                  <p className={`text-sm font-bold ${isPayrollDay() ? 'text-white' : 'text-gray-900'}`}>

                    {isPayrollDay() ? 'Hari Penggajian Tiba!' : 'Jadwal Penggajian Rutin'}

                  </p>

                  <p className={`text-xs ${isPayrollDay() ? 'text-blue-100' : 'text-muted-foreground'}`}>

                    {isPayrollDay()

                      ? `Hari ini adalah tanggal ${payrollSettings?.payroll_schedule_day || 23}. Silakan proses payroll untuk semua karyawan.`

                      : `Penggajian rutin dijadwalkan setiap tanggal ${payrollSettings?.payroll_schedule_day || 23} tiap bulannya.`}

                  </p>

                </div>

              </div>



              <div className="flex items-center gap-3 w-full md:w-auto">

                <Button

                  onClick={handleProcessBatchPayroll}

                  disabled={isBatchProcessing}

                  className={`${isPayrollDay() ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'} font-body w-full md:w-auto`}

                >

                  {isBatchProcessing ? (

                    <>

                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />

                      Memproses ({batchProgress}%)

                    </>

                  ) : (

                    <>

                      <CheckCircle className="w-4 h-4 mr-2" />

                      Proses Payroll Masal

                    </>

                  )}

                </Button>

              </div>

            </CardContent>

          </Card>

        </motion.div>

      )}



      {/* Statistics Cards */}

      {

        user?.role !== 'staff' && (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <motion.div

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ delay: 0 }}

            >

              <Card className="border-gray-200">

                <CardContent className="p-6">

                  <div className="flex items-center justify-between">

                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">

                      <DollarSign className="w-6 h-6 text-green-600" />

                    </div>

                    <Badge variant="secondary" className="font-mono text-xs">

                      Total

                    </Badge>

                  </div>

                  <div className="mt-4">

                    <p className="font-mono text-lg font-bold text-[#1C1C1E]">{formatCurrency(stats.totalPayroll)}</p>

                    <p className="text-sm text-muted-foreground font-body">Total Penggajian</p>

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

                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">

                      <AlertCircle className="w-6 h-6 text-yellow-600" />

                    </div>

                    <Badge variant="secondary" className="font-mono text-xs">

                      Pending

                    </Badge>

                  </div>

                  <div className="mt-4">

                    <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.pendingPayroll}</p>

                    <p className="text-sm text-muted-foreground font-body">Menunggu Pembayaran</p>

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

                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">

                      <CheckCircle className="w-6 h-6 text-blue-600" />

                    </div>

                    <Badge variant="secondary" className="font-mono text-xs">

                      Paid

                    </Badge>

                  </div>

                  <div className="mt-4">

                    <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.paidPayroll}</p>

                    <p className="text-sm text-muted-foreground font-body">Sudah Dibayar</p>

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

                    <div className="w-12 h-12 rounded-xl bg-hrd/10 flex items-center justify-center">

                      <TrendingUp className="w-6 h-6 text-hrd" />

                    </div>

                    <Badge variant="secondary" className="font-mono text-xs">

                      Avg

                    </Badge>

                  </div>

                  <div className="mt-4">

                    <p className="font-mono text-lg font-bold text-[#1C1C1E]">{formatCurrency(stats.averageSalary)}</p>

                    <p className="text-sm text-muted-foreground font-body">Rata-rata Gaji</p>

                  </div>

                </CardContent>

              </Card>

            </motion.div>

          </div>

        )

      }



      {/* Tabs */}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>

        <TabsList className={`grid w-full ${user?.role === 'staff' ? 'grid-cols-1' : 'grid-cols-3'}`}>

          <TabsTrigger value="current" className="font-body">

            Periode Saat Ini

          </TabsTrigger>

          {user?.role !== 'staff' && (

            <>

              <TabsTrigger value="history" className="font-body">

                Riwayat

              </TabsTrigger>

              <TabsTrigger value="summary" className="font-body">

                Ringkasan

              </TabsTrigger>

            </>

          )}

        </TabsList>



        {/* Current Period Tab */}

        <TabsContent value="current" className="mt-6">

          <Card className="border-gray-200">

            <CardHeader>

              <div className="flex items-center justify-between">

                <div>

                  <CardTitle className="font-display">Penggajian {months[selectedMonth - 1]} {selectedYear}</CardTitle>

                  <CardDescription className="font-body">

                    Daftar penggajian periode saat ini

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

                  {user?.role !== 'staff' && (

                    <div className="flex gap-2">

                      <PayrollPrintSettingsDialog onSettingsChange={setPrintSettings} />

                      <Button variant="outline" className="font-body" onClick={handleExportExcel}>

                        <Download className="w-4 h-4 mr-2" />

                        Export

                      </Button>

                    </div>

                  )}

                </div>

              </div>

            </CardHeader>

            <CardContent className="p-0">

              <Table>

                <TableHeader>

                  <TableRow>

                    <TableHead className="font-body">Karyawan</TableHead>

                    <TableHead className="font-body">Gaji Pokok</TableHead>

                    <TableHead className="font-body">Tunjangan</TableHead>

                    <TableHead className="font-body text-hrd">Reward</TableHead>

                    <TableHead className="font-body">Potongan Absen</TableHead>

                    <TableHead className="font-body">Total Potongan</TableHead>

                    <TableHead className="font-body">Gaji Bersih</TableHead>

                    <TableHead className="font-body">Status</TableHead>

                    <TableHead className="font-body text-right">Aksi</TableHead>

                  </TableRow>

                </TableHeader>

                <TableBody>

                  <AnimatePresence>

                    {filteredPayroll

                      .filter(p => p.status === 'pending')

                      .map((payroll) => {

                        const employee = employees.find(emp => emp.id === payroll.employee_id);

                        const StatusIcon = statusIcons[payroll.status as PayrollStatus];



                        return (

                          <motion.tr

                            key={payroll.id}

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

                                  <span className="font-medium font-body">{employee?.name || 'Unknown'}</span>

                                  <p className="text-xs text-muted-foreground font-body">{employee?.position}</p>

                                </div>

                              </div>

                            </TableCell>

                            <TableCell className="font-mono text-sm">

                              {formatCurrency(payroll.base_salary)}

                            </TableCell>

                            <TableCell className="font-mono text-sm">

                              {formatCurrency(payroll.allowances)}

                            </TableCell>

                            <TableCell className="font-mono text-sm font-bold text-hrd">

                              {formatCurrency(payroll.reward_allowance || 0)}

                            </TableCell>

                            <TableCell className="font-mono text-sm">

                              {formatCurrency(payroll.absent_deduction || 0)}

                            </TableCell>

                            <TableCell className="font-mono text-sm">

                              {formatCurrency(payroll.deductions)}

                            </TableCell>

                            <TableCell className="font-mono text-sm font-bold">

                              {formatCurrency(payroll.net_salary)}

                            </TableCell>

                            <TableCell>

                              <Badge className={`${statusColors[payroll.status as PayrollStatus]} font-body`}>

                                <StatusIcon className="w-3 h-3 mr-1" />

                                {statusLabels[payroll.status as PayrollStatus]}

                              </Badge>

                            </TableCell>



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

                                    onClick={() => handleViewPayroll(payroll)}

                                  >

                                    <Eye className="w-4 h-4 mr-2" />

                                    Lihat Detail

                                  </DropdownMenuItem>



                                  {user?.role !== 'staff' && (

                                    <DropdownMenuItem

                                      className="font-body text-blue-600"

                                      onClick={() => handleEditPayroll(payroll)}

                                    >

                                      <Edit className="w-4 h-4 mr-2" />

                                      Edit

                                    </DropdownMenuItem>

                                  )}



                                  {user?.role !== 'staff' && payroll.status === 'pending' && (

                                    <DropdownMenuItem

                                      className="font-body text-green-600"

                                      onClick={() => handleMarkAsPaid(payroll.id)}

                                    >

                                      <CheckCircle className="w-4 h-4 mr-2" />

                                      Tandai Dibayar

                                    </DropdownMenuItem>

                                  )}



                                  <DropdownMenuItem

                                    className="font-body"

                                    onClick={() => handleDownloadSlip(payroll)}

                                  >

                                    <Printer className="w-4 h-4 mr-2" />

                                    Cetak Slip

                                  </DropdownMenuItem>



                                  {user?.role !== 'staff' && (

                                    <DropdownMenuItem className="font-body">

                                      <Send className="w-4 h-4 mr-2" />

                                      Kirim Email

                                    </DropdownMenuItem>

                                  )}

                                  {user?.role !== 'staff' && (

                                    <DropdownMenuItem

                                      className="font-body text-red-600 focus:text-red-700"

                                      onClick={() => handleDeletePayroll(payroll.id)}

                                    >

                                      <Trash2 className="w-4 h-4 mr-2" />

                                      Hapus

                                    </DropdownMenuItem>

                                  )}

                                </DropdownMenuContent>

                              </DropdownMenu>

                            </TableCell>

                          </motion.tr>

                        );

                      })}

                  </AnimatePresence>

                </TableBody>

              </Table>

            </CardContent>

          </Card>

        </TabsContent>



        {/* History Tab */}

        <TabsContent value="history" className="mt-6">

          <Card className="border-gray-200">

            <CardHeader>

              <CardTitle className="font-display">Riwayat Penggajian</CardTitle>

              <CardDescription className="font-body">

                Riwayat pembayaran gaji karyawan

              </CardDescription>

            </CardHeader>

            <CardContent>

              {filteredPayroll.filter(p => p.status === 'paid').length === 0 ? (

                <div className="text-center py-8">

                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />

                  <p className="text-muted-foreground font-body">Belum ada riwayat pembayaran gaji untuk periode ini</p>

                </div>

              ) : (

                <Table>

                  <TableHeader>

                    <TableRow>

                      <TableHead className="font-body">Karyawan</TableHead>

                      <TableHead className="font-body">Tanggal Bayar</TableHead>

                      <TableHead className="font-body">Gaji Bersih</TableHead>

                      <TableHead className="font-body text-right">Aksi</TableHead>

                    </TableRow>

                  </TableHeader>

                  <TableBody>

                    {filteredPayroll

                      .filter(p => p.status === 'paid')

                      .map((payroll) => {

                        const employee = employees.find(e => e.id === payroll.employee_id);

                        return (

                          <TableRow key={payroll.id}>

                            <TableCell>

                              <div>

                                <p className="font-medium font-body text-[#1C1C1E]">{employee?.name || 'Unknown'}</p>

                                <p className="text-sm text-muted-foreground font-body">{employee?.position}</p>

                              </div>

                            </TableCell>

                            <TableCell className="font-mono">

                              {formatDate(payroll.pay_date)}

                            </TableCell>

                            <TableCell className="font-mono font-medium text-[#1C1C1E]">

                              {formatCurrency(payroll.net_salary)}

                            </TableCell>

                            <TableCell className="text-right">

                              <DropdownMenu>

                                <DropdownMenuTrigger asChild>

                                  <Button variant="ghost" size="icon">

                                    <MoreVertical className="w-4 h-4" />

                                  </Button>

                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">

                                  <DropdownMenuItem onClick={() => handleViewPayroll(payroll)} className="font-body">

                                    <Eye className="w-4 h-4 mr-2" />

                                    Lihat Detail

                                  </DropdownMenuItem>

                                  {user?.role !== 'staff' && (

                                    <DropdownMenuItem onClick={() => handleEditPayroll(payroll)} className="font-body text-blue-600">

                                      <Edit className="w-4 h-4 mr-2" />

                                      Edit

                                    </DropdownMenuItem>

                                  )}

                                  <DropdownMenuItem onClick={() => handleDownloadSlip(payroll)} className="font-body">

                                    <Printer className="w-4 h-4 mr-2" />

                                    Slip Gaji

                                  </DropdownMenuItem>

                                  {user?.role !== 'staff' && (

                                    <DropdownMenuItem onClick={() => handleDeletePayroll(payroll.id)} className="font-body text-red-600 focus:text-red-700">

                                      <Trash2 className="w-4 h-4 mr-2" />

                                      Hapus

                                    </DropdownMenuItem>

                                  )}

                                </DropdownMenuContent>

                              </DropdownMenu>

                            </TableCell>

                          </TableRow>

                        );

                      })}

                  </TableBody>

                </Table>

              )}

            </CardContent>

          </Card>

        </TabsContent>



        {/* Summary Tab */}

        <TabsContent value="summary" className="mt-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Card className="border-gray-200">

              <CardHeader>

                <CardTitle className="font-display">Ringkasan Penggajian</CardTitle>

                <CardDescription className="font-body">

                  Statistik penggajian periode ini

                </CardDescription>

              </CardHeader>

              <CardContent>

                <div className="space-y-4">

                  <div className="flex items-center justify-between">

                    <span className="font-body">Total Penggajian</span>

                    <span className="font-mono font-bold">{formatCurrency(stats.totalPayroll)}</span>

                  </div>

                  <div className="flex items-center justify-between">

                    <span className="font-body">Rata-rata Gaji</span>

                    <span className="font-mono font-bold">{formatCurrency(stats.averageSalary)}</span>

                  </div>

                  <div className="flex items-center justify-between">

                    <span className="font-body">Jumlah Karyawan</span>

                    <span className="font-mono font-bold">{stats.totalEmployees}</span>

                  </div>



                  <div className="pt-4 border-t">

                    <div className="grid grid-cols-2 gap-4">

                      <div className="text-center p-4 bg-yellow-50 rounded-lg">

                        <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />

                        <p className="font-mono text-2xl font-bold text-yellow-600">{stats.pendingPayroll}</p>

                        <p className="text-sm text-yellow-700 font-body">Menunggu</p>

                      </div>

                      <div className="text-center p-4 bg-green-50 rounded-lg">

                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />

                        <p className="font-mono text-2xl font-bold text-green-600">{stats.paidPayroll}</p>

                        <p className="text-sm text-green-700 font-body">Dibayar</p>

                      </div>

                    </div>

                  </div>

                </div>

              </CardContent>

            </Card>



            <Card className="border-gray-200">

              <CardHeader>

                <CardTitle className="font-display">Pembayaran Tertunda</CardTitle>

                <CardDescription className="font-body">

                  Daftar gaji yang belum dibayar

                </CardDescription>

              </CardHeader>

              <CardContent>

                <div className="space-y-3">

                  {payroll

                    .filter(pay => pay.status === 'pending')

                    .slice(0, 5)

                    .map((payroll) => {

                      const employee = employees.find(emp => emp.id === payroll.employee_id);

                      return (

                        <div key={payroll.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">

                          <Avatar className="w-8 h-8">

                            <AvatarFallback className="bg-yellow-200 text-yellow-800 font-body text-xs">

                              {employee?.name.split(' ').map(n => n[0]).join('') || 'N/A'}

                            </AvatarFallback>

                          </Avatar>

                          <div className="flex-1">

                            <p className="font-medium font-body">{employee?.name || 'Unknown'}</p>

                            <p className="text-xs text-muted-foreground font-mono">

                              {formatCurrency(payroll.net_salary)}

                            </p>

                          </div>

                          <Button

                            size="sm"

                            className="bg-green-600 hover:bg-green-700 font-body"

                            onClick={() => handleMarkAsPaid(payroll.id)}

                          >

                            Bayar

                          </Button>

                        </div>

                      );

                    })}



                  {payroll.filter(pay => pay.status === 'pending').length === 0 && (

                    <div className="text-center py-8">

                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />

                      <p className="text-muted-foreground font-body">Semua gaji sudah dibayar</p>

                    </div>

                  )}

                </div>

              </CardContent>

            </Card>

          </div>

        </TabsContent>

      </Tabs>



      {/* Add Payroll Dialog */}

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

                <p className="text-[10px] text-blue-500 italic">

                  *Data otomatis disinkronkan dari profil karyawan. Pastikan data di Manajemen Karyawan sudah lengkap.

                </p>

              </div>

            )}



            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">

                <Label className="font-body text-xs text-hrd">Reward (Otis)</Label>

                <Input

                  type="number"

                  placeholder="0"

                  className="font-mono text-sm border-hrd/30 bg-hrd/5"

                  value={formData.reward_allowance}

                  onChange={(e) => setFormData({ ...formData, reward_allowance: e.target.value })}

                />



                {/* New Reward Toggles */}

                <div className="mt-3 p-3 rounded-xl bg-hrd/5 border border-hrd/20 space-y-3">

                  <div className="flex items-center space-x-2">

                    <Checkbox

                      id="target_achieved"

                      checked={formData.target_achieved}

                      onCheckedChange={(checked) => setFormData({ ...formData, target_achieved: !!checked })}

                    />

                    <label htmlFor="target_achieved" className="text-xs font-medium text-hrd cursor-pointer">

                      Pencapaian Target (100%)

                    </label>

                  </div>



                  <div className="flex items-center space-x-2 opacity-70">

                    <Checkbox

                      id="is_perfect"

                      checked={formData.is_perfect_attendance}

                      disabled

                    />

                    <label htmlFor="is_perfect" className="text-xs font-medium text-gray-600">

                      Kehadiran Sempurna (Auto)

                    </label>

                  </div>

                </div>



                {formData.reward_details?.length > 0 && (

                  <div className="mt-1 space-y-0.5">

                    <p className="text-[10px] font-bold text-hrd uppercase tracking-wider">Item Penghargaan:</p>

                    {formData.reward_details?.map((rd, i) => (

                      <div key={i} className="flex justify-between text-[10px] text-hrd/80 italic pl-1">

                        <span>â€¢ {rd.title}</span>

                        <span className="font-mono">{formatCurrency(rd.amount)}</span>

                      </div>

                    ))}

                  </div>

                )}



                {formData.manual_allowance_details?.length > 0 && (

                  <div className="mt-1 space-y-0.5">

                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tunjangan Manual:</p>

                    {formData.manual_allowance_details?.map((ma, i) => (

                      <div key={i} className="flex justify-between text-[10px] text-blue-800/80 italic pl-1">

                        <span>â€¢ {ma.title}</span>

                        <span className="font-mono">{formatCurrency(ma.amount)}</span>

                      </div>

                    ))}

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

                        <span>â€¢ {md.title}</span>

                        <span className="font-mono">{formatCurrency(md.amount)}</span>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </div>

          </div>





          {/* Diagnostic Helper Box */}

          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-[10px] space-y-1">

            <p className="font-bold text-blue-800 flex items-center">

              <Info className="w-3 h-3 mr-1" /> DIAGNOSTIK SISTEM:

            </p>

            <div className="grid grid-cols-2 gap-x-2 text-blue-700">

              <span>ID Karyawan:</span>

              <span className="font-mono text-[8px] truncate">{formData.employee_id || '-'}</span>

              <span>Data Absensi Found:</span>

              <span className="font-mono">{debugInfo.attendanceCount} recs</span>

              <span>Hari Hadir (Makan/Bensin):</span>

              <span className="font-mono font-bold text-green-600">{debugInfo.presentCount} hari</span>

              <span>Menit Terlambat:</span>

              <span className="font-mono font-bold text-red-600">{debugInfo.lateMinutes} menit</span>

              <span>Absen Hari (Alpha):</span>

              <span className="font-mono text-red-600">{debugInfo.absentCount} hari</span>

              <span>Tarif Denda (Settings):</span>

              <span className="font-mono">Rp {debugInfo.deductionRate.toLocaleString('id-ID')}/mnt</span>

              <span>Status Settings:</span>

              <span className="font-mono">{debugInfo.foundSettings ? 'Terkoneksi' : 'GAGAL'}</span>

              {debugInfo.rawStatuses && debugInfo.rawStatuses.length > 0 && (

                <>

                  <span className="col-span-2 mt-1 pt-1 border-t border-blue-100 text-[8px] italic">Status Terdeteksi (Sample):</span>

                  <span className="col-span-2 font-mono text-[8px] bg-white/50 p-0.5 rounded">

                    {debugInfo.rawStatuses.join(', ')}

                  </span>

                </>

              )}

            </div>

            {debugInfo.error && (

              <div className="mt-1 p-1 bg-red-100 border border-red-200 text-red-700 font-mono text-[9px] break-all">

                ERR: {debugInfo.error}

              </div>

            )}

            <p className="text-[9px] text-blue-500 italic mt-1">

              *Jika 'Absen Terdeteksi' adalah 0 namun karyawan tidak masuk, pastikan status di Manajemen Absensi adalah 'absent' atau 'Tidak Hadir'.

            </p>

          </div>



          {deductionDetails.length > 0 && (

            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded border border-gray-100">

              <p className="font-semibold mb-1">Rincian Potongan Otomatis:</p>

              <ul className="list-disc list-inside space-y-0.5">

                {deductionDetails.map((detail, idx) => (

                  <li key={idx}>{detail}</li>

                ))}

              </ul>

            </div>

          )}



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



    {/* View Payroll Details Dialog */ }

  < Dialog open={showViewDialog} onOpenChange={setShowViewDialog} >

    <DialogContent className="sm:max-w-lg">

      <DialogHeader>

        <DialogTitle className="font-display">Detail Penggajian</DialogTitle>

        <DialogDescription className="font-body">

          Informasi lengkap penggajian karyawan

        </DialogDescription>

      </DialogHeader>

      {selectedPayroll && (

        <div className="space-y-4">

          {/* Status Badge */}

          <div className="flex justify-center">

            <Badge className={`${statusColors[selectedPayroll.status as PayrollStatus]} font-body px-4 py-2`}>

              {React.createElement(statusIcons[selectedPayroll.status as PayrollStatus], { className: "w-4 h-4 mr-2" })}

              {statusLabels[selectedPayroll.status as PayrollStatus]}

            </Badge>

          </div>



          {/* Employee Info */}

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">

            <Avatar className="w-12 h-12">

              <AvatarFallback className="bg-hrd/20 text-hrd font-body">

                {employees.find(emp => emp.id === selectedPayroll.employee_id)?.name.split(' ').map(n => n[0]).join('') || 'N/A'}

              </AvatarFallback>

            </Avatar>

            <div>

              <h3 className="font-display font-bold text-[#1C1C1E]">

                {employees.find(emp => emp.id === selectedPayroll.employee_id)?.name || 'Unknown'}

              </h3>

              <p className="text-muted-foreground font-body">

                {employees.find(emp => emp.id === selectedPayroll.employee_id)?.position || 'Unknown Position'}

              </p>

            </div>

          </div>



          {/* Payroll Details */}

          <div className="space-y-3">

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">

              <span className="font-body text-muted-foreground">Periode</span>

              <span className="font-mono font-medium">

                {months[selectedPayroll.period_month - 1]} {selectedPayroll.period_year}

              </span>

            </div>



            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">

              <span className="font-body text-blue-800">Gaji Pokok</span>

              <span className="font-mono font-bold text-blue-800">

                {formatCurrency(selectedPayroll.base_salary)}

              </span>

            </div>



            {/* Breakdown Allowances */}

            <div className="space-y-1">

              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rincian Tunjangan</div>

              {(['gasoline_allowance', 'meal_allowance', 'position_allowance', 'discretionary_allowance', 'thr_allowance', 'reward_allowance'] as const).map((key) => {

                const val = selectedPayroll[key] || 0;

                if (val <= 0) return null;

                const labels: Record<string, string> = {

                  gasoline_allowance: 'Uang Bensin',

                  meal_allowance: 'Uang Makan',

                  position_allowance: 'Tunjangan Jabatan',

                  discretionary_allowance: 'Uang Bijak',

                  thr_allowance: 'THR',

                  reward_allowance: 'Reward (Penghargaan)'

                };

                if (key === 'reward_allowance') {

                  if (!selectedPayroll.reward_details || selectedPayroll.reward_details?.length === 0) {

                    return (

                      <div key={key} className="flex justify-between text-sm">

                        <span className="text-gray-600">{labels[key]}</span>

                        <span className="font-mono">{formatCurrency(val)}</span>

                      </div>

                    );

                  }

                  return selectedPayroll.reward_details?.map((rd, i) => (

                    <div key={`${key}-${i}`} className="flex justify-between text-sm italic">

                      <span className="text-gray-600 ml-2">â€¢ {rd.title}</span>

                      <span className="font-mono">{formatCurrency(rd.amount)}</span>

                    </div>

                  ));

                }

                return (

                  <div key={key} className="flex justify-between text-sm">

                    <span className="text-gray-600">{labels[key]}</span>

                    <span className="font-mono">{formatCurrency(val)}</span>

                  </div>

                );

              })}



              {selectedPayroll.manual_allowance_details?.map((ma, i) => (

                <div key={`manual-allowance-${i}`} className="flex justify-between text-sm italic">

                  <span className="text-gray-600 ml-2">â€¢ {ma.title}</span>

                  <span className="font-mono">{formatCurrency(ma.amount)}</span>

                </div>

              ))}

              {/* Remaining Allowances (calculated by subtracting known components from total if needed, but here we stored 'allowances' as total in DB? Wait.

                       In my logic: totalAllowances = allowances + gasoline + ...

                       So 'allowances' column in DB is TOTAL.

                       But wait, looking at my logic:

                       allowances: totalAllowances

                       So selectedPayroll.allowances IS the total.

                       And I didn't store the "other" allowances separately in the DB.

                       Ah, I made a mistake in the DB schema/logic plan.

                       

                       In handleAddPayroll:

                       allowances: totalAllowances

                       

                       So I lost the "other" allowances value if I only have the total and the components.

                       Actually, I can calculate "Other" = Total - (Sum of components).

                   */}

              <div className="flex justify-between text-sm">

                <span className="text-gray-600">Lain-lain</span>

                <span className="font-mono">

                  {formatCurrency(

                    selectedPayroll.allowances -

                    ((selectedPayroll.gasoline_allowance || 0) +

                      (selectedPayroll.meal_allowance || 0) +

                      (selectedPayroll.position_allowance || 0) +

                      (selectedPayroll.discretionary_allowance || 0) +

                      (selectedPayroll.thr_allowance || 0))

                  )}

                </span>

              </div>

              <div className="flex items-center justify-between p-2 bg-green-50 rounded mt-1">

                <span className="font-body text-green-800 font-bold text-sm">Total Tunjangan</span>

                <span className="font-mono font-bold text-green-800 text-sm">

                  {formatCurrency(selectedPayroll.allowances)}

                </span>

              </div>

            </div>



            {/* Breakdown Deductions */}

            <div className="space-y-1 mt-2">

              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rincian Potongan</div>

              {selectedPayroll.bpjs_deduction && selectedPayroll.bpjs_deduction > 0 && (

                <div className="flex justify-between text-sm">

                  <span className="text-gray-600">BPJS</span>

                  <span className="font-mono">{formatCurrency(selectedPayroll.bpjs_deduction)}</span>

                </div>

              )}

              {selectedPayroll.absent_deduction && selectedPayroll.absent_deduction > 0 && (

                <div className="flex justify-between text-sm">

                  <span className="text-gray-600">Potongan Absen</span>

                  <span className="font-mono">{formatCurrency(selectedPayroll.absent_deduction)}</span>

                </div>

              )}



              {selectedPayroll.manual_deduction_details?.map((md, i) => (

                <div key={`manual-deduction-${i}`} className="flex justify-between text-sm italic">

                  <span className="text-gray-600 ml-2">â€¢ {md.title}</span>

                  <span className="font-mono text-red-600">-{formatCurrency(md.amount)}</span>

                </div>

              ))}

              <div className="flex justify-between text-sm">

                <span className="text-gray-600">Lain-lain</span>

                <span className="font-mono">

                  {formatCurrency(selectedPayroll.deductions - ((selectedPayroll.bpjs_deduction || 0) + (selectedPayroll.absent_deduction || 0)))}

                </span>

              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 rounded mt-1">

                <span className="font-body text-red-800 font-bold text-sm">Total Potongan</span>

                <span className="font-mono font-bold text-red-800 text-sm">

                  {formatCurrency(selectedPayroll.deductions)}

                </span>

              </div>

            </div>



            <div className="flex items-center justify-between p-4 bg-hrd/10 rounded-lg border-2 border-hrd/20">

              <span className="font-body font-bold text-hrd">Gaji Bersih</span>

              <span className="font-mono font-bold text-xl text-hrd">

                {formatCurrency(selectedPayroll.net_salary)}

              </span>

            </div>

          </div>



          {/* Payment Info */}

          {selectedPayroll.pay_date && (

            <div className="p-4 bg-green-50 rounded-lg">

              <div className="space-y-2">

                <Label className="font-body text-green-800">Tanggal Pembayaran</Label>

                <p className="font-mono font-medium text-green-800">

                  {formatDate(selectedPayroll.pay_date)}

                </p>

              </div>

            </div>

          )}

        </div>

      )}

      <DialogFooter>

        <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">

          Tutup

        </Button>

        {selectedPayroll?.status === 'pending' && (

          <Button

            className="bg-green-600 hover:bg-green-700 font-body"

            onClick={() => {

              handleMarkAsPaid(selectedPayroll.id);

              setShowViewDialog(false);

            }}

          >

            <CheckCircle className="w-4 h-4 mr-2" />

            Tandai Dibayar

          </Button>

        )}

        <Button className="bg-hrd hover:bg-hrd-dark font-body">

          <Printer className="w-4 h-4 mr-2" />

          Cetak Slip

        </Button>

      </DialogFooter>

    </DialogContent>

  </Dialog >

    </div >

  );

}

