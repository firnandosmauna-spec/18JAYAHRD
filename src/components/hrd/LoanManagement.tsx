import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    Plus,
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Banknote,
    Calendar,
    User,
    History,
    Receipt,
    Wallet,
    Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useLoans, useEmployees } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/supabaseService';
import type { EmployeeLoan } from '@/lib/supabase';

// Helper for formatting currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Start Date Helper
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

export function LoanManagement() {
    const { loans, loading, error: loansError, addLoan, updateLoan, deleteLoan } = useLoans();
    const { employees } = useEmployees();
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);
    const [loanPayments, setLoanPayments] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        amount: '',
        installment_amount: '',
        reason: '',
        start_date: new Date().toLocaleDateString('en-CA')
    });

    // Auto-fill employee_id for staff
    useEffect(() => {
        if (user?.role === 'staff' && user?.employee_id) {
            setFormData(prev => ({ ...prev, employee_id: user.employee_id! }));
        }
    }, [user]);

    // Role checking - Make it highly flexible for any custom admin/HR roles
    const normalizedRole = (user?.role || '').toLowerCase();
    const isOnlyAdmin = normalizedRole === 'administrator';
    const isAdminRole = isOnlyAdmin || normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'hrd' || normalizedRole === 'owner' || normalizedRole === 'direktur';
    const hasHRDModule = user?.modules?.some(m => m.toLowerCase() === 'hrd');
    const isAdminOrHR = isAdminRole || hasHRDModule;

    // Filter Logic
    const filteredLoans = loans.filter(loan => {
        const employee = employees.find(e => e.id === loan.employee_id);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (employee?.name || '').toLowerCase().includes(searchLower) ||
            (loan.reason || '').toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;

        // Visibility: Only Administrator sees everything. Others see only their own.
        const matchesRole = isOnlyAdmin
            ? true
            : loan.employee_id === user?.employee_id;


        return matchesSearch && matchesStatus && matchesRole;
    });

    const handleAddLoan = async () => {
        try {
            if (!formData.employee_id || !formData.amount || !formData.installment_amount || !formData.reason) {
                toast({
                    title: 'Error',
                    description: 'Mohon lengkapi semua field',
                    variant: 'destructive'
                });
                return;
            }

            setIsSubmitting(true);

            const amount = parseFloat(formData.amount);
            const installment = parseFloat(formData.installment_amount);

            if (isNaN(amount) || amount <= 0) {
                toast({
                    title: 'Error',
                    description: 'Jumlah pinjaman tidak valid',
                    variant: 'destructive'
                });
                setIsSubmitting(false);
                return;
            }

            if (isNaN(installment) || installment <= 0) {
                toast({
                    title: 'Error',
                    description: 'Jumlah cicilan tidak valid',
                    variant: 'destructive'
                });
                setIsSubmitting(false);
                return;
            }

            if (installment > amount) {
                toast({
                    title: 'Error',
                    description: 'Cicilan tidak boleh lebih besar dari total pinjaman',
                    variant: 'destructive'
                });
                setIsSubmitting(false);
                return;
            }

            await addLoan({
                employee_id: formData.employee_id,
                amount: amount,
                remaining_amount: amount, // Awalnya sisa hutang = total hutang
                installment_amount: installment,
                reason: formData.reason,
                status: 'pending',
                start_date: formData.start_date
            });

            // Send notification
            try {
                const requester = employees.find(e => e.id === formData.employee_id);
                await notificationService.create({
                    title: 'Pengajuan Kasbon Baru',
                    message: `${requester?.name || 'Seorang karyawan'} mengajukan kasbon sebesar ${formatCurrency(amount)}.`,
                    type: 'info',
                    module: 'Kasbon HRD',
                    user_id: null, // send to all admins
                    read: false
                });
            } catch (notifErr) {
                console.warn('Gagal mengirim notifikasi:', notifErr);
            }

            toast({
                title: 'Sukses',
                description: 'Pengajuan kasbon berhasil dibuat',
            });
            setShowAddDialog(false);
            setFormData({
                employee_id: '',
                amount: '',
                installment_amount: '',
                reason: '',
                start_date: new Date().toLocaleDateString('en-CA')
            });
        } catch (error: any) {
            console.error('Submission error:', error);
            
            // Extract the most descriptive error message
            let errorMessage = 'Gagal mengajukan kasbon';
            if (error?.message) {
                if (error.message.includes('row-level security')) {
                    errorMessage = 'Keamanan Database: Pengajuan ditolak oleh sistem. Pastikan izin RLS sudah aktif.';
                } else {
                    errorMessage = error.message;
                }
            }

            toast({
                title: 'Gagal',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const [approvalFormData, setApprovalFormData] = useState({
        approved_amount: '',
        installment_amount: '',
        admin_notes: ''
    });

    const handleApproveClick = (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        setApprovalFormData({
            approved_amount: loan.amount.toString(),
            installment_amount: loan.installment_amount.toString(),
            admin_notes: ''
        });
        setShowApproveDialog(true);
    };

    const handleApproveConfirm = async () => {
        if (!selectedLoan) return;
        try {
            setIsSubmitting(true);
            const approvedAmount = parseFloat(approvalFormData.approved_amount);
            const installmentAmount = parseFloat(approvalFormData.installment_amount);

            await updateLoan(selectedLoan.id, {
                status: 'approved',
                amount: approvedAmount,
                remaining_amount: approvedAmount,
                installment_amount: installmentAmount,
                admin_notes: approvalFormData.admin_notes,
                approved_by: user?.id,
                approved_at: new Date().toISOString()
            });

            toast({ title: 'Sukses', description: 'Kasbon berhasil disetujui dengan penyesuaian' });
            setShowApproveDialog(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal menyetujui kasbon', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        method: 'cash' as any,
        notes: ''
    });

    const handlePaymentClick = (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        setPaymentFormData({
            amount: loan.installment_amount.toString(),
            method: 'cash',
            notes: ''
        });
        setShowPaymentDialog(true);
    };

    const { payInstallment, fetchPayments } = useLoans();

    const handlePayConfirm = async () => {
        if (!selectedLoan) return;
        try {
            setIsSubmitting(true);
            await payInstallment({
                loan_id: selectedLoan.id,
                amount: parseFloat(paymentFormData.amount),
                payment_date: new Date().toISOString(),
                payment_method: paymentFormData.method,
                notes: paymentFormData.notes
            });

            toast({ title: 'Sukses', description: 'Pembayaran cicilan berhasil dicatat' });
            setShowPaymentDialog(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal mencatat pembayaran', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShowHistory = async (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        const history = await fetchPayments(loan.id);
        setLoanPayments(history);
        setShowHistoryDialog(true);
    };

    const [editFormData, setEditFormData] = useState({
        amount: '',
        installment_amount: '',
        reason: ''
    });

    const handleEditClick = (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        setEditFormData({
            amount: loan.amount.toString(),
            installment_amount: loan.installment_amount.toString(),
            reason: loan.reason || ''
        });
        setShowEditDialog(true);
    };

    const handleEditConfirm = async () => {
        if (!selectedLoan) return;
        try {
            setIsSubmitting(true);
            const newAmount = parseFloat(editFormData.amount);
            const newInstallment = parseFloat(editFormData.installment_amount);

            // Fetch payments to recalculate remaining
            const payments = await fetchPayments(selectedLoan.id);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const newRemaining = Math.max(0, newAmount - totalPaid);

            await updateLoan(selectedLoan.id, {
                amount: newAmount,
                remaining_amount: newRemaining,
                installment_amount: newInstallment,
                reason: editFormData.reason
            });

            toast({ title: 'Sukses', description: 'Data kasbon berhasil diperbarui' });
            setShowEditDialog(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal memperbarui data', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await updateLoan(id, { status: 'rejected' });
            toast({ title: 'Sukses', description: 'Kasbon ditolak' });
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal menolak kasbon', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
        try {
            await deleteLoan(id);
            toast({ title: 'Sukses', description: 'Data kasbon dihapus' });
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' });
        }
    };

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-blue-100 text-blue-800',
        rejected: 'bg-red-100 text-red-800',
        paid_off: 'bg-green-100 text-green-800'
    };

    const statusLabels = {
        pending: 'Menunggu',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        paid_off: 'Lunas'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-display text-[#1C1C1E]"><span>Manajemen Kasbon</span></h2>
                    <p className="text-muted-foreground font-body"><span>Kelola pengajuan pinjaman dan cicilan karyawan</span></p>
                </div>
                <Button onClick={() => setShowAddDialog(true)} className="bg-hrd hover:bg-hrd-dark font-body">
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Ajukan Kasbon</span>
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari karyawan atau alasan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 font-body"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] font-body">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all"><span>Semua Status</span></SelectItem>
                            <SelectItem value="pending"><span>Menunggu</span></SelectItem>
                            <SelectItem value="approved"><span>Disetujui</span></SelectItem>
                            <SelectItem value="paid_off"><span>Lunas</span></SelectItem>
                            <SelectItem value="rejected"><span>Ditolak</span></SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-body"><span>Karyawan</span></TableHead>
                                <TableHead className="font-body"><span>Plafon</span></TableHead>
                                <TableHead className="font-body"><span>Sisa</span></TableHead>
                                <TableHead className="font-body"><span>Angsuran</span></TableHead>
                                <TableHead className="font-body"><span>Alasan</span></TableHead>
                                <TableHead className="font-body"><span>Status</span></TableHead>
                                <TableHead className="text-right font-body"><span>Aksi</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loansError && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4 bg-red-50 text-red-600 border-b border-red-100 italic text-sm">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Error: {loansError}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8"><span>Memuat data...</span></TableCell>
                                </TableRow>
                            ) : filteredLoans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                                <CreditCard className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="font-medium text-gray-900">Tidak ada pengajuan kasbon</p>
                                            <p className="text-sm max-w-[250px] mx-auto mt-1">
                                                {searchQuery ? 'Tidak ada hasil pencarian yang cocok.' : 'Saat ini belum ada pengajuan kasbon yang tersimpan di sistem.'}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLoans.map((loan) => {
                                    const employee = employees.find(e => e.id === loan.employee_id);
                                    return (
                                        <TableRow key={loan.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarFallback className="bg-hrd/10 text-hrd text-xs">
                                                            <span>{employee?.name.substring(0, 2).toUpperCase() || 'NA'}</span>
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium font-body"><span>{employee?.name || 'Unknown'}</span></p>
                                                        <p className="text-xs text-muted-foreground font-body"><span>{loan.reason}</span></p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                             <TableCell>
                                                 <div className="flex flex-col">
                                                     <span className="font-mono">{formatCurrency(loan.amount)}</span>
                                                     {loan.requested_amount > 0 && loan.requested_amount !== loan.amount && (
                                                         <span className="text-[10px] text-muted-foreground line-through">
                                                             {formatCurrency(loan.requested_amount)}
                                                         </span>
                                                     )}
                                                 </div>
                                             </TableCell>
                                             <TableCell className="font-mono text-red-600 font-medium">
                                                 <div className="flex flex-col">
                                                     <span>{formatCurrency(loan.remaining_amount)}</span>
                                                     {loan.status === 'approved' && (
                                                         <span className="text-[10px] text-blue-600">
                                                             {(100 - (loan.remaining_amount / loan.amount * 100)).toFixed(0)}% Terbayar
                                                         </span>
                                                     )}
                                                 </div>
                                             </TableCell>
                                             <TableCell className="font-mono">{formatCurrency(loan.installment_amount)}</TableCell>
                                             <TableCell className="font-body text-sm">
                                                 <div>
                                                     <p>{formatDate(loan.start_date)}</p>
                                                     {loan.admin_notes && (
                                                         <p className="text-[10px] text-muted-foreground italic truncate max-w-[100px]">
                                                             "{loan.admin_notes}"
                                                         </p>
                                                     )}
                                                 </div>
                                             </TableCell>
                                             <TableCell>
                                                 <Badge className={`${statusColors[loan.status]} font-body`}>
                                                     <span>{statusLabels[loan.status]}</span>
                                                 </Badge>
                                             </TableCell>
                                             <TableCell className="text-right">
                                                 <div className="flex justify-end gap-1">
                                                     {loan.status === 'pending' && isOnlyAdmin && (
                                                         <>
                                                             <Button size="icon" variant="ghost" title="Setujui" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApproveClick(loan)}>
                                                                 <CheckCircle className="w-4 h-4" />
                                                             </Button>
                                                             <Button size="icon" variant="ghost" title="Tolak" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(loan.id)}>
                                                                 <XCircle className="w-4 h-4" />
                                                             </Button>
                                                         </>
                                                     )}
                                                     {loan.status === 'approved' && (
                                                         <>
                                                             <Button size="icon" variant="ghost" title="Bayar Cicilan" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handlePaymentClick(loan)}>
                                                                 <Receipt className="w-4 h-4" />
                                                             </Button>
                                                             <Button size="icon" variant="ghost" title="Riwayat Cicilan" className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" onClick={() => handleShowHistory(loan)}>
                                                                 <History className="w-4 h-4" />
                                                             </Button>
                                                         </>
                                                     )}
                                                     {isOnlyAdmin && (
                                                         <Button size="icon" variant="ghost" title="Edit Nominal" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleEditClick(loan)}>
                                                             <Pencil className="w-4 h-4" />
                                                         </Button>
                                                     )}
                                                     {isAdminOrHR && (
                                                         <Button size="icon" variant="ghost" className="text-gray-400 hover:text-red-600" onClick={() => handleDelete(loan.id)}>
                                                             <MoreVertical className="w-4 h-4" />
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

            {/* Add Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle><span>Ajukan Kasbon Baru</span></DialogTitle>
                        <DialogDescription><span>Input detail pengajuan kasbon karyawan</span></DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label><span>Karyawan</span></Label>
                            <Select
                                value={formData.employee_id}
                                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                                disabled={user?.role === 'staff'}
                            >
                                <SelectTrigger className={user?.role === 'staff' ? "bg-gray-50 opacity-100 cursor-default" : ""}>
                                    <SelectValue placeholder="Pilih karyawan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {user?.role === 'staff' ? (
                                        <SelectItem value={user.employee_id || 'none'}>
                                            {employees.find(e => e.id === user.employee_id)?.name || user.name || 'Profil Saya'}
                                        </SelectItem>
                                    ) : (
                                        employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label><span>Jumlah Pinjaman (Rp)</span></Label>
                            <Input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                                placeholder="Contoh: 1000000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label><span>Cicilan per Bulan (Rp)</span></Label>
                            <Input
                                type="number"
                                value={formData.installment_amount}
                                onChange={(e) => setFormData(p => ({ ...p, installment_amount: e.target.value }))}
                                placeholder="Contoh: 100000"
                            />
                            <p className="text-xs text-muted-foreground"><span>Akan dipotong otomatis dari gaji bulanan.</span></p>
                        </div>
                        <div className="grid gap-2">
                            <Label><span>Mulai Potong Gaji</span></Label>
                            <Input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label><span>Alasan / Keperluan</span></Label>
                            <Textarea
                                value={formData.reason}
                                onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
                                placeholder="Jelaskan alasan pengajuan kasbon..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}><span>Batal</span></Button>
                        <Button onClick={handleAddLoan} disabled={isSubmitting} className="bg-hrd hover:bg-hrd-dark">
                            <span>{isSubmitting ? 'Menyimpan...' : 'Ajukan Kasbon'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Persetujuan Kasbon</DialogTitle>
                        <DialogDescription>
                            Tentukan nominal akhir yang disetujui untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                            <p className="font-bold">Pengajuan Awal:</p>
                            <p>{formatCurrency(selectedLoan?.amount || 0)} - {selectedLoan?.reason}</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Nominal Disetujui (Rp)</Label>
                            <Input
                                type="number"
                                value={approvalFormData.approved_amount}
                                onChange={(e) => setApprovalFormData(p => ({ ...p, approved_amount: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Cicilan per Bulan (Rp)</Label>
                            <Input
                                type="number"
                                value={approvalFormData.installment_amount}
                                onChange={(e) => setApprovalFormData(p => ({ ...p, installment_amount: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Catatan Admin (Opsional)</Label>
                            <Textarea
                                value={approvalFormData.admin_notes}
                                onChange={(e) => setApprovalFormData(p => ({ ...p, admin_notes: e.target.value }))}
                                placeholder="Alasan penyesuaian nominal atau catatan tambahan..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Batal</Button>
                        <Button onClick={handleApproveConfirm} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                            {isSubmitting ? 'Memproses...' : 'Setujui Kasbon'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Catat Pembayaran Cicilan</DialogTitle>
                        <DialogDescription>
                            Input pembayaran cicilan manual untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                            <div className="flex justify-between">
                                <span>Total Pinjaman:</span>
                                <span className="font-bold">{formatCurrency(selectedLoan?.amount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Sisa Saldo:</span>
                                <span className="font-bold">{formatCurrency(selectedLoan?.remaining_amount || 0)}</span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Nominal Pembayaran (Rp)</Label>
                            <Input
                                type="number"
                                value={paymentFormData.amount}
                                onChange={(e) => setPaymentFormData(p => ({ ...p, amount: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Metode Pembayaran</Label>
                            <Select 
                                value={paymentFormData.method} 
                                onValueChange={(v) => setPaymentFormData(p => ({ ...p, method: v as any }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Tunai / Langsung</SelectItem>
                                    <SelectItem value="payroll">Potong Gaji</SelectItem>
                                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Keterangan</Label>
                            <Input
                                value={paymentFormData.notes}
                                onChange={(e) => setPaymentFormData(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Misal: Cicilan Bulan April"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Batal</Button>
                        <Button onClick={handlePayConfirm} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Riwayat Pembayaran Cicilan</DialogTitle>
                        <DialogDescription>
                            Riwayat lengkap cicilan untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {loanPayments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground italic">
                                Belum ada riwayat pembayaran untuk pinjaman ini.
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tgl Bayar</TableHead>
                                            <TableHead>Metode</TableHead>
                                            <TableHead>Nominal</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loanPayments.map((pay) => (
                                            <TableRow key={pay.id}>
                                                <TableCell className="text-xs">{new Date(pay.payment_date).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="capitalize text-xs">{pay.payment_method}</TableCell>
                                                <TableCell className="font-mono text-sm font-bold">{formatCurrency(pay.amount)}</TableCell>
                                                <TableCell className="text-xs">{pay.notes || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium">Sisa Saldo Pinjaman</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedLoan?.remaining_amount || 0)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground italic">Total Pinjaman: {formatCurrency(selectedLoan?.amount || 0)}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowHistoryDialog(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Data Kasbon</DialogTitle>
                        <DialogDescription>
                            Ubah nominal atau detil kasbon untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Total Pinjaman Baru (Rp)</Label>
                            <Input
                                type="number"
                                value={editFormData.amount}
                                onChange={(e) => setEditFormData(p => ({ ...p, amount: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                Sisa saldo akan dihitung ulang secara otomatis berdasarkan riwayat cicilan yang ada.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Cicilan per Bulan (Rp)</Label>
                            <Input
                                type="number"
                                value={editFormData.installment_amount}
                                onChange={(e) => setEditFormData(p => ({ ...p, installment_amount: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Alasan / Keperluan</Label>
                            <Textarea
                                value={editFormData.reason}
                                onChange={(e) => setEditFormData(p => ({ ...p, reason: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
                        <Button onClick={handleEditConfirm} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
