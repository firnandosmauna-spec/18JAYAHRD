import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
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

// Hooks
import { useLeaveRequests, useEmployees, useLeaveQuota } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { LeaveRequest } from '@/lib/supabase';
import { attendanceService } from '@/services/supabaseService';

// Types
type LeaveStatus = 'pending' | 'approved' | 'rejected';
type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'marriage' | 'bereavement' | 'unpaid' | 'permission';

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
  permission: 'Izin'
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
    const nextDayStr = nextDay.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

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
  const { leaveRequests, loading, error, addLeaveRequest, approveLeaveRequest, rejectLeaveRequest } = useLeaveRequests();
  const { employees } = useEmployees();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | LeaveStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const { quotas: allQuotas, refetch: refetchQuota } = useLeaveQuota();
  const [lateReturns, setLateReturns] = useState<Record<string, { isLate: boolean; returnDate?: string }>>({});

  const [formData, setFormData] = useState<LeaveFormData>({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
    emergency_contact: '',
    handover_to: ''
  });

  // Filter leave requests based on active tab and search
  const filteredLeaveRequests = leaveRequests.filter(req => {
    const employee = employees.find(e => e.id === req.employee_id);
    const matchesSearch = employee?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Handle add leave request
  const handleAddLeaveRequest = async () => {
    try {
      if (!formData.employee_id || !formData.start_date || !formData.end_date || !formData.reason) {
        alert('Mohon lengkapi semua field yang wajib diisi');
        return;
      }

      const days = calculateDays(formData.start_date, formData.end_date);

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
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add leave request:', error);
      alert('Gagal menambah pengajuan cuti');
    }
  };

  // Handle approve leave
  const handleApproveLeave = async (leaveId: string) => {
    try {
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
      </div>

      {/* Quota Summary (Admin/Manager only) */}
      {user?.role !== 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-blue-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-900">
              <Calendar className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-blue-600 font-bold text-[10px] uppercase tracking-widest">Total Jatah Cuti</CardDescription>
              <CardTitle className="text-3xl font-display text-blue-900">{allQuotas.reduce((acc, q) => acc + q.total_days, 0)} <span className="text-sm font-medium">Hari</span></CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-orange-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-900">
              <Clock className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-orange-600 font-bold text-[10px] uppercase tracking-widest">Cuti Terpakai</CardDescription>
              <CardTitle className="text-3xl font-display text-orange-900">{allQuotas.reduce((acc, q) => acc + q.used_days, 0)} <span className="text-sm font-medium">Hari</span></CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-green-50/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-green-900">
              <CheckCircle className="w-12 h-12" />
            </div>
            <CardHeader className="pb-2 text-left">
              <CardDescription className="text-green-600 font-bold text-[10px] uppercase tracking-widest">Sisa Kuota</CardDescription>
              <CardTitle className="text-3xl font-display text-green-900">{allQuotas.reduce((acc, q) => acc + q.remaining_days, 0)} <span className="text-sm font-medium">Hari</span></CardTitle>
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
                  <AnimatePresence>
                    {filteredLeaveRequests.map((leave) => {
                      const employee = employees.find(emp => emp.id === leave.employee_id);
                      const StatusIcon = statusIcons[leave.status as LeaveStatus];

                      return (
                        <motion.tr
                          key={leave.id}
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="font-body"
                                  onClick={() => handleViewLeave(leave)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                {leave.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      className="font-body text-green-600"
                                      onClick={() => handleApproveLeave(leave.id)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Setujui
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="font-body text-red-600"
                                      onClick={() => handleRejectLeave(leave.id)}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Tolak
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem className="font-body">
                                  <Download className="w-4 h-4 mr-2" />
                                  Export PDF
                                </DropdownMenuItem>
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
      </Tabs>

      {/* Add Leave Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Ajukan Cuti/Izin</DialogTitle>
            <DialogDescription className="font-body">
              Buat pengajuan cuti atau izin baru
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
              <Label className="font-body">Jenis Cuti/Izin <span className="text-red-500">*</span></Label>
              <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value as LeaveType })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih jenis cuti" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="font-body">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-body text-blue-800">
                  Durasi: {calculateDays(formData.start_date, formData.end_date)} hari
                </p>
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
              <Select value={formData.handover_to} onValueChange={(value) => setFormData({ ...formData, handover_to: value })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih karyawan pengganti" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(emp => emp.id !== formData.employee_id).map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="font-body">
                      {emp.name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddLeaveRequest} className="bg-hrd hover:bg-hrd-dark font-body">
              <Send className="w-4 h-4 mr-2" />
              Ajukan
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
              Informasi lengkap pengajuan cuti/izin
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge className={`${statusColors[selectedLeave.status as LeaveStatus]} font-body px-4 py-2`}>
                  {React.createElement(statusIcons[selectedLeave.status as LeaveStatus], { className: "w-4 h-4 mr-2" })}
                  {selectedLeave.status === 'pending' ? 'Menunggu Persetujuan' :
                    selectedLeave.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                </Badge>
              </div>

              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                    {employees.find(emp => emp.id === selectedLeave.employee_id)?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-display font-bold text-[#1C1C1E]">
                    {employees.find(emp => emp.id === selectedLeave.employee_id)?.name || 'Unknown'}
                  </h3>
                  <p className="text-muted-foreground font-body">
                    {employees.find(emp => emp.id === selectedLeave.employee_id)?.position || 'Unknown Position'}
                  </p>
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Jenis Cuti</Label>
                  <p className="font-body font-medium">{leaveTypeLabels[selectedLeave.leave_type as LeaveType]}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Durasi</Label>
                  <p className="font-mono font-medium">{selectedLeave.days} hari</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Tanggal Mulai</Label>
                  <p className="font-mono font-medium">{formatDate(selectedLeave.start_date)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Tanggal Selesai</Label>
                  <p className="font-mono font-medium">{formatDate(selectedLeave.end_date)}</p>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label className="font-body text-muted-foreground">Alasan</Label>
                <p className="font-body p-3 bg-gray-50 rounded-lg">{selectedLeave.reason}</p>
              </div>

              {/* Additional Info */}
              {(selectedLeave.emergency_contact || selectedLeave.handover_to) && (
                <div className="grid grid-cols-1 gap-4">
                  {selectedLeave.emergency_contact && (
                    <div className="space-y-2">
                      <Label className="font-body text-muted-foreground">Kontak Darurat</Label>
                      <p className="font-mono font-medium">{selectedLeave.emergency_contact}</p>
                    </div>
                  )}
                  {selectedLeave.handover_to && (
                    <div className="space-y-2">
                      <Label className="font-body text-muted-foreground">Diserahkan Kepada</Label>
                      <p className="font-body font-medium">
                        {employees.find(emp => emp.id === selectedLeave.handover_to)?.name || 'Unknown'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Info */}
              {selectedLeave.status !== 'pending' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">
                      {selectedLeave.status === 'approved' ? 'Disetujui oleh' : 'Ditolak oleh'}
                    </Label>
                    <p className="font-body font-medium">
                      {employees.find(emp => emp.id === selectedLeave.approved_by)?.name || 'System'}
                    </p>
                    {selectedLeave.approved_at && (
                      <p className="font-mono text-sm text-muted-foreground">
                        {new Date(selectedLeave.approved_at).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
              Tutup
            </Button>
            {selectedLeave?.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 font-body"
                  onClick={() => {
                    handleRejectLeave(selectedLeave.id);
                    setShowViewDialog(false);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Tolak
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 font-body"
                  onClick={() => {
                    handleApproveLeave(selectedLeave.id);
                    setShowViewDialog(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Setujui
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}