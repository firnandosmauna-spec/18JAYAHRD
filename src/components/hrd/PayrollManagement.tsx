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
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

// Hooks
import { usePayroll, useEmployees, useLoans } from '@/hooks/useSupabase';
import { attendanceService } from '@/services/supabaseService';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollRecord } from '@/lib/supabase';

// Types
type PayrollStatus = 'pending' | 'paid' | 'cancelled';

interface PayrollFormData {
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: string;
  allowances: string;
  deductions: string;
  overtime_hours?: string;
  overtime_rate?: string;
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

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { payroll, loading, error, addPayroll, markAsPaid, deletePayroll } = usePayroll(selectedMonth, selectedYear);
  const { employees } = useEmployees();
  const { loans } = useLoans(); // Fetch loans
  const { user } = useAuth();
  const { toast } = useToast();

  console.log("DEBUG: Current User Role:", user?.role);
  console.log("DEBUG: Current User ID:", user?.id);
  console.log("DEBUG: Current Employee ID:", user?.employee_id);

  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'summary'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  const [formData, setFormData] = useState<PayrollFormData>({
    employee_id: '',
    period_month: currentMonth,
    period_year: currentYear,
    base_salary: '',
    allowances: '0',
    deductions: '0',
    overtime_hours: '0',
    overtime_rate: '0'
  });

  const [deductionDetails, setDeductionDetails] = useState<string[]>([]);
  const [linkedEmployeeIds, setLinkedEmployeeIds] = useState<string[]>([]);

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
        try {
          const attendance = await attendanceService.getByEmployee(formData.employee_id, formData.period_month, formData.period_year);

          // Absensi (Alpha)
          const absentCount = attendance?.filter((a: any) => a.status === 'absent').length || 0;
          if (absentCount > 0) {
            newDetails.push(`Absensi: ${absentCount} hari tidak hadir`);
          }

          // Keterlambatan (Late)
          // Aturan: Potong Rp 1.000 per menit keterlambatan
          let totalLateMinutes = 0;
          attendance?.forEach((record: any) => {
            if (record.status === 'late' && record.check_in) {
              const [h, m] = record.check_in.split(':').map(Number);
              const checkInMinutes = h * 60 + m;
              const workStartMinutes = 8 * 60; // 08:00 standard masuk

              if (checkInMinutes > workStartMinutes) {
                totalLateMinutes += (checkInMinutes - workStartMinutes);
              }
            }
          });

          if (totalLateMinutes > 0) {
            const latePenalty = totalLateMinutes * 1000;
            totalDeductions += latePenalty;
            newDetails.push(`Keterlambatan: ${totalLateMinutes} menit (Rp ${latePenalty.toLocaleString('id-ID')})`);
          }

        } catch (err) {
          console.error("Failed to fetch attendance", err);
        }

        setDeductionDetails(newDetails);

        setFormData(prev => ({
          ...prev,
          base_salary: salary,
          deductions: totalDeductions.toString()
        }));
      };

      fetchData();
    }
  }, [formData.employee_id, employees, loans, formData.period_month, formData.period_year]);

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
      overtime_rate: '0'
    });
  };

  // Calculate net salary
  const calculateNetSalary = () => {
    const baseSalary = parseFloat(formData.base_salary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const overtimeHours = parseFloat(formData.overtime_hours) || 0;
    const overtimeRate = parseFloat(formData.overtime_rate) || 0;

    const overtimePay = overtimeHours * overtimeRate;
    return baseSalary + allowances + overtimePay - deductions;
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
      const netSalary = calculateNetSalary();

      const newPayroll = {
        employee_id: formData.employee_id,
        period_month: formData.period_month,
        period_year: formData.period_year,
        base_salary: baseSalary,
        allowances,
        deductions,
        net_salary: netSalary,
        status: 'pending' as const,
        pay_date: null
      };

      console.log("Payload:", newPayroll);
      await addPayroll(newPayroll);
      console.log("Payroll added successfully");
      setShowAddDialog(false);
      resetForm();
      toast({
        title: 'Sukses',
        description: 'Berhasil membuat data payroll!',
        variant: 'default', // or 'success' if available, usually default is fine
        className: 'bg-green-600 text-white'
      });
    } catch (error: any) {
      console.error('Failed to add payroll:', error);
      toast({
        title: 'Error',
        description: `Gagal menambah data penggajian: ${error.message || 'Error tidak diketahui'}`,
        variant: 'destructive',
      });
    }
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
    generateSalarySlip(payroll, employee);
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

      {/* Statistics Cards */}
      {user?.role !== 'staff' && (
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
      )}

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
                    <Button variant="outline" className="font-body" onClick={handleExportExcel}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
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
                    <TableHead className="font-body">Potongan</TableHead>
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
                                  <DropdownMenuItem onClick={() => handleDownloadSlip(payroll)} className="font-body">
                                    <Download className="w-4 h-4 mr-2" />
                                    Slip Gaji
                                  </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Buat Payroll Baru</DialogTitle>
            <DialogDescription className="font-body">
              Tambah data penggajian karyawan
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

            <div className="space-y-2">
              <Label className="font-body">Tunjangan</Label>
              <Input
                type="number"
                placeholder="0"
                className="font-mono"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Potongan</Label>
              <Input
                type="number"
                placeholder="0"
                className="font-mono"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
              />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddPayroll} className="bg-hrd hover:bg-hrd-dark font-body">
              <Calculator className="w-4 h-4 mr-2" />
              Buat Payroll
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

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-body text-green-800">Tunjangan</span>
                  <span className="font-mono font-bold text-green-800">
                    {formatCurrency(selectedPayroll.allowances)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-body text-red-800">Potongan</span>
                  <span className="font-mono font-bold text-red-800">
                    {formatCurrency(selectedPayroll.deductions)}
                  </span>
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
      </Dialog>
    </div>
  );
}