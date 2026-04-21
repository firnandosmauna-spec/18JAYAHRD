import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  User,
  FileText,
  Send,
  Eye,
  Edit,
  Trash2,
  Download
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Hooks
import { useLeaveRequests, useEmployees, useLeaveQuota } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { LeaveRequest } from '@/lib/supabase';
import { attendanceService } from '@/services/supabaseService';
import { settingsService } from '@/services/settingsService';

// Types
type LeaveStatus = 'pending' | 'approved' | 'rejected';
type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'marriage' | 'bereavement' | 'unpaid' | 'permission' | 'situational';

interface LeaveFormData {
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  emergency_contact?: string;
  handover_to?: string;
}

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: 'Cuti Tahunan',
  sick: 'Cuti Sakit',
  maternity: 'Cuti Melahirkan',
  paternity: 'Cuti Ayah',
  marriage: 'Cuti Nikah',
  bereavement: 'Cuti Duka',
  unpaid: 'Cuti Tanpa Gaji',
  permission: 'Izin',
  situational: 'Cuti Situasional'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
};

const statusIcons = {
  pending: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
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

// Fungsi untuk menghitung hari kerja (termasuk Sabtu, kecuali Minggu dan Libur)
function calculateWorkingDaysBetween(startDate: Date, endDate: Date, holidays: string[]): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const target = new Date(endDate);
  target.setHours(0, 0, 0, 0);

  while (current < target) {
    const day = current.getDay();
    const dateStr = current.toLocaleDateString('en-CA');

    // Cek jika bukan Minggu (0) dan bukan hari libur manual
    if (day !== 0 && !holidays.includes(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// Fungsi untuk mengecek apakah karyawan terlambat kembali dari cuti
async function checkLateReturn(leave: LeaveRequest): Promise<{ isLate: boolean; returnDate?: string }> {
  try {
    if (leave.status !== 'approved') {
      return { isLate: false };
    }

    const endDate = new Date(leave.end_date);
    endDate.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jika cuti belum berakhir, tidak perlu cek
    if (endDate >= today) {
      return { isLate: false };
    }

    // Cek apakah ada attendance setelah tanggal akhir cuti
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toLocaleDateString('en-CA');
    const todayStr = today.toLocaleDateString('en-CA');

    const attendanceRecords = await attendanceService.getByDateRange(nextDayStr, todayStr);
    const employeeAttendance = attendanceRecords.filter(
      (att: any) => att.employee_id === leave.employee_id && att.check_in
    );

    if (employeeAttendance.length > 0) {
      // Ada attendance setelah tanggal akhir cuti, cek tanggal pertama kali kembali
      const firstReturn = employeeAttendance.sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0];

      const returnDate = new Date(firstReturn.date);
      returnDate.setHours(0, 0, 0, 0);

      // Jika tanggal kembali > tanggal akhir cuti, berarti terlambat
      if (returnDate > endDate) {
        return { isLate: true, returnDate: firstReturn.date };
      }
    } else {
      // Belum ada attendance setelah tanggal akhir cuti, berarti belum kembali
      return { isLate: true };
    }

    return { isLate: false };
  } catch (error) {
    console.error('Error checking late return:', error);
    return { isLate: false };
  }
}

export function LeaveManagement() {
  const {
    leaveRequests,
    loading,
    error,
    addLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest
  } = useLeaveRequests();
  const { employees } = useEmployees();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | LeaveStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { quotas: allQuotas, refetch: refetchQuota } = useLeaveQuota();
  const [lateReturns, setLateReturns] = useState<Record<string, { isLate: boolean; returnDate?: string }>>({});
  const [holidays, setHolidays] = useState<string[]>([]);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const settings = await settingsService.getAttendanceSettings();
        setHolidays(settings.attendance_holidays || []);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      }
    };
    fetchHolidays();
  }, []);

  const [formData, setFormData] = useState<LeaveFormData>({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
    emergency_contact: '',
    handover_to: ''
  });

  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  const selectedEmployee = selectedLeave
    ? employees.find((emp) => emp.id === selectedLeave.employee_id) ?? null
    : null;

  const handoverEmployee = selectedLeave?.handover_to
    ? employees.find((emp) => emp.id === selectedLeave.handover_to) ?? null
    : null;

  const approverEmployee = selectedLeave?.approved_by
    ? employees.find((emp) => emp.id === selectedLeave.approved_by) ?? null
    : null;

  // Filter leave requests based on active tab and search
  const filteredLeaveRequests = leaveRequests.filter(req => {
    const employee = employees.find(e => e.id === req.employee_id);
    const matchesSearch = employee?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.leave_type as string).toLowerCase().includes(searchQuery.toLowerCase()) ||
      leaveTypeLabels[req.leave_type as LeaveType].toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeTab === 'all' || req.status === activeTab;

    // Staff filtering: only see own requests
    const matchesRole = user?.role === 'staff'
      ? req.employee_id === user.employee_id
      : true;

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Get counts for each tab
  const counts = {
    all: leaveRequests.length,
    pending: leaveRequests.filter(l => l.status === 'pending').length,
    approved: leaveRequests.filter(l => l.status === 'approved').length,
    rejected: leaveRequests.filter(l => l.status === 'rejected').length
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      leave_type: 'annual',
      start_date: '',
      end_date: '',
      reason: '',
      emergency_contact: '',
      handover_to: ''
    });
  };

  // Handle add/edit leave request
  const handleAddLeaveRequest = async () => {
    try {
      if (!formData.employee_id || !formData.start_date || !formData.end_date || !formData.reason) {
        alert('Mohon lengkapi semua field yang wajib diisi');
        return;
      }

      // Validasi Lead Time 14 Hari Kerja (Kecuali cuti sakit/duka/situasional yang mendadak)
      const nonLeadTimeTypes = ['sick', 'bereavement', 'situational'];
      if (!nonLeadTimeTypes.includes(formData.leave_type)) {
        const today = new Date();
        const start = new Date(formData.start_date);
        const workingDaysLead = calculateWorkingDaysBetween(today, start, holidays);

        if (workingDaysLead < 14) {
          alert(`Peringatan: Pengajuan cuti ${leaveTypeLabels[formData.leave_type]} minimal dilakukan 14 hari kerja sebelum tanggal mulai. Saat ini hanya tersisa ${workingDaysLead} hari kerja.`);
          return;
        }
      }

      const days = calculateDays(formData.start_date, formData.end_date);

      if (isEditing && selectedLeave) {
        const updates = {
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days,
          reason: formData.reason,
          emergency_contact: formData.emergency_contact || null,
          handover_to: formData.handover_to || null,
        };

        await updateLeaveRequest(selectedLeave.id, updates);
        alert('Pengajuan cuti berhasil diperbarui');
      } else {
        // Rule: Annual leave max 4 times per year
        if (formData.leave_type === 'annual') {
          const year = new Date(formData.start_date).getFullYear();
          const annualRequestsThisYear = leaveRequests.filter(req =>
            req.employee_id === formData.employee_id &&
            req.leave_type === 'annual' &&
            req.status !== 'rejected' &&
            new Date(req.start_date).getFullYear() === year
          );

          if (annualRequestsThisYear.length >= 4) {
            alert(`Maaf, jatah pengambilan cuti tahunan sudah maksimal (4 kali) untuk tahun ${year}.`);
            return;
          }
        }

        const newLeaveRequest = {
          employee_id: formData.employee_id,
          leave_type: formData.leave_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days,
          reason: formData.reason,
          status: 'pending' as const,
          emergency_contact: formData.emergency_contact || null,
          handover_to: formData.handover_to || null,
          approved_by: null,
          approved_at: null
        };

        await addLeaveRequest(newLeaveRequest);
        alert('Pengajuan cuti berhasil dikirim');
      }

      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to process leave request:', error);
      alert('Gagal memproses pengajuan cuti');
    }
  };

  // Handle edit leave
  const handleEditLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setFormData({
      employee_id: leave.employee_id,
      leave_type: leave.leave_type as LeaveType,
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason,
      emergency_contact: leave.emergency_contact || '',
      handover_to: leave.handover_to || ''
    });
    setIsEditing(true);
    setShowAddDialog(true);
  };

  // Handle delete leave
  const handleDeleteLeave = async (leaveId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus/membatalkan pengajuan cuti ini?')) {
      try {
        await deleteLeaveRequest(leaveId);
        alert('Pengajuan cuti berhasil dihapus');
      } catch (error) {
        console.error('Failed to delete leave:', error);
        alert('Gagal menghapus pengajuan cuti');
      }
    }
  };

  // Handle approve leave
  const handleApproveLeave = async (leaveId: string) => {
    try {
      if (user?.role !== 'Administrator') {
        alert('Hanya Administrator yang dapat menyetujui pengajuan cuti.');
        return;
      }

      if (!user?.id) {
        alert('User tidak terautentikasi');
        return;
      }

      // Find current user's employee record or use HR Manager as default approver
      let approverId = user.employee_id; // If user has employee_id in profile

      if (!approverId) {
        // Use HR Manager as default approver if current user is not an employee
        const hrManager = employees.find(emp => emp.position.toLowerCase().includes('hr') || emp.position.toLowerCase().includes('manager'));
        approverId = hrManager?.id || employees[0]?.id; // Fallback to first employee
      }

      if (!approverId) {
        alert('Tidak ada approver yang valid ditemukan');
        return;
      }

      console.log('Approving leave:', { leaveId, approverId });
      await approveLeaveRequest(leaveId, approverId);
      await refetchQuota();
      alert('Cuti berhasil disetujui');
    } catch (error) {
      console.error('Failed to approve leave:', error);
      alert(`Gagal menyetujui cuti: ${error}`);
    }
  };

  // Handle reject leave
  const handleRejectLeave = async (leaveId: string) => {
    try {
      if (user?.role !== 'Administrator') {
        alert('Hanya Administrator yang dapat menolak pengajuan cuti.');
        return;
      }

      console.log('Rejecting leave:', { leaveId });
      await rejectLeaveRequest(leaveId);
      alert('Cuti berhasil ditolak');
    } catch (error) {
      console.error('Failed to reject leave:', error);
      alert(`Gagal menolak cuti: ${error}`);
    }
  };

  // Handle view leave details
  const handleViewLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowViewDialog(true);
  };

  // Cek late returns untuk semua leave yang approved
  useEffect(() => {
    const checkAllLateReturns = async () => {
      const approvedLeaves = leaveRequests.filter(l => l.status === 'approved');
      const lateReturnMap: Record<string, { isLate: boolean; returnDate?: string }> = {};

      for (const leave of approvedLeaves) {
        const result = await checkLateReturn(leave);
        lateReturnMap[leave.id] = result;
      }

      setLateReturns(lateReturnMap);
    };

    if (leaveRequests.length > 0) {
      checkAllLateReturns();
    }
  }, [leaveRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat data cuti...</p>
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
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Cuti dan Izin</h1>
          <p className="text-muted-foreground font-body">Kelola pengajuan cuti dan izin karyawan</p>
        </div>
        <Button
          className="bg-hrd hover:bg-hrd-dark font-body"
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajukan Cuti
        </Button>
        <Button
          variant="outline"
          className="border-orange-200 text-orange-700 hover:bg-orange-50 font-body ml-2"
          onClick={() => setShowPayoutDialog(true)}
        >
          <FileText className="w-4 h-4 mr-2" />
          Laporan Akhir Tahun
        </Button>
      </div>

      {/* Quota Summary (Admin/Manager only) */}
      {user?.role !== 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-blue-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-900">
              <Calendar className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-blue-600 font-bold text-[10px] uppercase tracking-widest">Sisa Cuti Tahunan</CardDescription>
              <CardTitle className="text-2xl font-display text-blue-900">
                {allQuotas.reduce((acc, q) => acc + q.remaining_days, 0)} <span className="text-sm font-medium">Hari</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-orange-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-900">
              <Clock className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-orange-600 font-bold text-[10px] uppercase tracking-widest">Cuti Tahunan Terpakai</CardDescription>
              <CardTitle className="text-2xl font-display text-orange-900">
                {allQuotas.reduce((acc, q) => acc + q.used_days, 0)} <span className="text-sm font-medium">Hari</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-purple-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-900">
              <FileText className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-purple-600 font-bold text-[10px] uppercase tracking-widest">Cuti Situasional (Ambil)</CardDescription>
              <CardTitle className="text-2xl font-display text-purple-900">
                {leaveRequests.filter(r => r.leave_type === 'situational' && r.status === 'approved').reduce((acc, q) => acc + q.days, 0)} <span className="text-sm font-medium">Kali</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-emerald-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-900">
              <CheckCircle className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">Potensi Payout (Situasional)</CardDescription>
              <CardTitle className="text-2xl font-display text-emerald-900">
                {(() => {
                  const totalSituationalUsed = leaveRequests.filter(r => r.leave_type === 'situational' && r.status === 'approved').reduce((acc, q) => acc + q.days, 0);
                  // Assuming situational leave part of the 12 days pool
                  // User said "cuti 12 hari... bisa diambil 4 kali... cuti situasional dapat diganti uang"
                  // I'll calculate remaining balance as potentially payable
                  const totalRemaining = allQuotas.reduce((acc, q) => acc + q.remaining_days, 0);
                  return totalRemaining;
                })()} <span className="text-sm font-medium">Hari</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari karyawan atau jenis cuti..."
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="font-body">
            Semua ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="pending" className="font-body">
            Menunggu ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="font-body">
            Disetujui ({counts.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="font-body">
            Ditolak ({counts.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Karyawan</TableHead>
                    <TableHead className="font-body">Jenis Cuti</TableHead>
                    <TableHead className="font-body">Tanggal</TableHead>
                    <TableHead className="font-body">Durasi</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredLeaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center">
                          <div className="space-y-1">
                            <p className="font-body text-sm font-medium text-slate-700">Belum ada data cuti yang cocok.</p>
                            <p className="font-body text-xs text-muted-foreground">
                              Coba ubah tab status atau kosongkan pencarian untuk melihat semua data.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLeaveRequests.map((leave) => {
                      const employee = employees.find(emp => emp.id === leave.employee_id);
                      const StatusIcon = statusIcons[leave.status as LeaveStatus];

                      return (
                        <TableRow
                          key={leave.id}
                          className="group"
                        >
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
                          <TableCell className="font-body">
                            {leaveTypeLabels[leave.leave_type as LeaveType]}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {leave.days} hari
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={`${statusColors[leave.status as LeaveStatus]} font-body w-fit`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {leave.status === 'pending' ? 'Menunggu' :
                                  leave.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                              </Badge>
                              {leave.status === 'approved' && lateReturns[leave.id]?.isLate && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 font-body w-fit text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Terlambat Kembali
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-body"
                                onClick={() => handleViewLeave(leave)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Detail
                              </Button>
                              {leave.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-body text-blue-600 hover:text-blue-700"
                                    onClick={() => handleEditLeave(leave)}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-body text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteLeave(leave.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Hapus
                                  </Button>
                                  {user?.role === 'Administrator' && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="font-body text-green-600 hover:text-green-700"
                                        onClick={() => handleApproveLeave(leave.id)}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Setujui
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="font-body text-red-600 hover:text-red-700"
                                        onClick={() => handleRejectLeave(leave.id)}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Tolak
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="font-body">
                                <Download className="w-4 h-4 mr-1" />
                                Export
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Leave Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          resetForm();
          setIsEditing(false);
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditing ? 'Edit Pengajuan Cuti/Izin' : 'Ajukan Cuti/Izin'}
            </DialogTitle>
            <DialogDescription className="font-body">
              {isEditing ? 'Perbarui data pengajuan Anda' : 'Buat pengajuan cuti atau izin baru'}
            </DialogDescription>
          </DialogHeader>
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
              <Label className="font-body">Jenis Cuti/Izin <span className="text-red-500">*</span></Label>
              <NativeSelect
                value={formData.leave_type}
                onChange={(value) => setFormData({ ...formData, leave_type: value as LeaveType })}
                className="font-body"
              >
                  {Object.entries(leaveTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body">Tanggal Mulai <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className="font-mono"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Tanggal Selesai <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className="font-mono"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {formData.start_date && formData.end_date && (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-body text-blue-800">
                    Durasi Cuti: {calculateDays(formData.start_date, formData.end_date)} hari
                  </p>
                </div>
                
                {!['sick', 'bereavement', 'situational'].includes(formData.leave_type) && (
                  <div className={`p-3 border rounded-lg ${
                    calculateWorkingDaysBetween(new Date(), new Date(formData.start_date), holidays) >= 14
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-orange-50 border-orange-200 text-orange-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <p className="text-xs font-body">
                        Lead Time: {calculateWorkingDaysBetween(new Date(), new Date(formData.start_date), holidays)} Hari Kerja
                      </p>
                    </div>
                    {calculateWorkingDaysBetween(new Date(), new Date(formData.start_date), holidays) < 14 && (
                      <p className="text-[10px] mt-1 opacity-80 font-body">
                        * Minimal pengajuan adalah 14 hari kerja (termasuk Sabtu).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-body">Alasan <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Jelaskan alasan pengajuan cuti/izin..."
                className="font-body"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Kontak Darurat</Label>
              <Input
                placeholder="Nomor telepon yang bisa dihubungi"
                className="font-mono"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Serahkan Tugas Kepada</Label>
              <NativeSelect
                value={formData.handover_to || ''}
                onChange={(value) => setFormData({ ...formData, handover_to: value })}
                className="font-body"
              >
                <option value="">Pilih karyawan pengganti</option>
                  {employees.filter(emp => emp.id !== formData.employee_id).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); setIsEditing(false); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddLeaveRequest} className="bg-hrd hover:bg-hrd-dark font-body">
              <Send className="w-4 h-4 mr-2" />
              {isEditing ? 'Simpan Perubahan' : 'Ajukan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Leave Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Pengajuan Cuti</DialogTitle>
            <DialogDescription className="font-body">
              Informasi lengkap pengajuan cuti atau izin yang dipilih.
            </DialogDescription>
          </DialogHeader>

          {selectedLeave ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Karyawan</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{selectedEmployee?.name || 'Unknown'}</p>
                  <p className="font-body text-xs text-muted-foreground">{selectedEmployee?.position || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[selectedLeave.status as LeaveStatus]} font-body w-fit`}>
                    {selectedLeave.status === 'pending' ? 'Menunggu' :
                      selectedLeave.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Jenis Cuti</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{leaveTypeLabels[selectedLeave.leave_type as LeaveType]}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Durasi</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{selectedLeave.days} hari</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tanggal Mulai</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{formatDate(selectedLeave.start_date)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tanggal Selesai</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{formatDate(selectedLeave.end_date)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Kontak Darurat</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{selectedLeave.emergency_contact || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Serah Tugas</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{handoverEmployee?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Disetujui Oleh</p>
                  <p className="font-body text-sm text-[#1C1C1E]">{approverEmployee?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tanggal Persetujuan</p>
                  <p className="font-body text-sm text-[#1C1C1E]">
                    {selectedLeave.approved_at ? formatDate(selectedLeave.approved_at) : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Alasan</p>
                <div className="rounded-lg border bg-slate-50 p-3 text-sm font-body text-slate-700">
                  {selectedLeave.reason}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Year-End Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Laporan & Kompensasi Akhir Tahun</DialogTitle>
            <DialogDescription className="font-body">
              Ringkasan cuti hangus dan potensi pencairan dana cuti situasional
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Alert className="bg-orange-50 border-orange-200 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-body text-xs">
                Sesuai peraturan, <strong>Cuti Tahunan</strong> yang tidak diambil akan hangus di akhir tahun.
                Sedangkan <strong>Cuti Situasional</strong> dapat diganti dengan uang.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-display font-bold text-sm">Daftar Kompensasi Karyawan</h3>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-body text-xs">Karyawan</TableHead>
                      <TableHead className="font-body text-xs">Sisa Tahunan (Hangus)</TableHead>
                      <TableHead className="font-body text-xs">Sisa Situasional (Dibayar)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map(emp => {
                      const quota = allQuotas.find(q => q.employee_id === emp.id);
                      const situationalUsed = leaveRequests.filter(r =>
                        r.employee_id === emp.id &&
                        r.leave_type === 'situational' &&
                        r.status === 'approved'
                      ).reduce((acc, q) => acc + q.days, 0);

                      const remaining = quota?.remaining_days || 0;
                      // Logika: Sisa jatah adalah gabungan. Situasional bisa diklaim jika masih ada sisa.
                      // Jika sisa > 0, kita asumsikan Situasional diprioritaskan untuk payout jika ada sisa.
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-body py-2">
                            <div className="font-medium text-xs">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground">{emp.position}</div>
                          </TableCell>
                          <TableCell className="font-body py-2 text-xs font-mono">
                            {remaining} Hari
                          </TableCell>
                          <TableCell className="font-body py-2 text-xs">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 font-mono">
                              {remaining} Hari
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)} className="font-body">
              Tutup
            </Button>
            <Button className="bg-hrd hover:bg-hrd-dark font-body">
              <Download className="w-4 h-4 mr-2" />
              Export Laporan Akhir Tahun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
