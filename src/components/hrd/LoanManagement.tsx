import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    Calendar,
    History,
    Receipt,
    Pencil,
    Loader2,
    Printer,
    SendHorizonal,
    ShieldAlert,
    BadgeCheck,
    Ban,
    ChevronDown,
    ChevronUp,
    Trash2,
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

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export function LoanManagement() {
    const {
        loans, loading, error: loansError,
        addLoan, updateLoan, deleteLoan,
        pendingPayments, pendingLoading,
        submitPaymentRequest, approvePaymentRequest, rejectPaymentRequest,
        payInstallment, fetchPayments,
        refetch, refetchPending
    } = useLoans();
    const { employees } = useEmployees();
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showPaymentRequestDialog, setShowPaymentRequestDialog] = useState(false);
    const [showApprovePaymentDialog, setShowApprovePaymentDialog] = useState(false);
    const [showRejectPaymentDialog, setShowRejectPaymentDialog] = useState(false);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPrintDialog, setShowPrintDialog] = useState(false);
    const [showPendingPanel, setShowPendingPanel] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);
    const [selectedPendingPayment, setSelectedPendingPayment] = useState<any | null>(null);
    const [loanPayments, setLoanPayments] = useState<any[]>([]);
    const [rejectionReason, setRejectionReason] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        amount: '',
        installment_amount: '',
        reason: '',
        start_date: new Date().toLocaleDateString('en-CA')
    });

    // Payment Request Form
    const [paymentReqData, setPaymentReqData] = useState({
        amount: '',
        method: 'cash',
        date: new Date().toLocaleDateString('en-CA'),
        notes: ''
    });

    // Auto-fill employee_id for staff
    useEffect(() => {
        if (user?.role === 'staff' && user?.employee_id) {
            setFormData(prev => ({ ...prev, employee_id: user.employee_id! }));
        }
    }, [user]);

    // Role checking
    const normalizedRole = (user?.role || '').toLowerCase();
    const isOnlyAdmin = normalizedRole === 'administrator' || normalizedRole === 'admin';
    const isAdminRole = isOnlyAdmin || normalizedRole === 'manager' || normalizedRole === 'hrd' || normalizedRole === 'owner' || normalizedRole === 'direktur';
    const hasHRDModule = user?.modules?.some(m => m.toLowerCase() === 'hrd');
    const isAdminOrHR = isAdminRole || hasHRDModule;

    const FullPageLoader = () => (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center border border-slate-100">
                <Loader2 className="w-12 h-12 text-hrd animate-spin" />
                <div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">Memproses Transaksi</h3>
                    <p className="text-sm text-slate-500 font-body">Mohon tunggu sebentar, data sedang diupdate ke database...</p>
                </div>
            </div>
        </div>
    );

    const filteredLoans = loans.filter(loan => {
        const employee = employees.find(e => e.id === loan.employee_id);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (employee?.name || '').toLowerCase().includes(searchLower) ||
            (loan.reason || '').toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
        const matchesRole = isAdminOrHR ? true : loan.employee_id === user?.employee_id;
        return matchesSearch && matchesStatus && matchesRole;
    });

    // ===== ADD LOAN =====
    const handleAddLoan = async () => {
        try {
            if (!formData.employee_id || !formData.amount || !formData.installment_amount || !formData.reason) {
                toast({ title: 'Error', description: 'Mohon lengkapi semua field', variant: 'destructive' });
                return;
            }
            setIsSubmitting(true);
            const amount = parseFloat(formData.amount);
            const installment = parseFloat(formData.installment_amount);
            if (isNaN(amount) || amount <= 0) {
                toast({ title: 'Error', description: 'Jumlah pinjaman tidak valid', variant: 'destructive' });
                setIsSubmitting(false); return;
            }
            if (isNaN(installment) || installment <= 0) {
                toast({ title: 'Error', description: 'Jumlah cicilan tidak valid', variant: 'destructive' });
                setIsSubmitting(false); return;
            }
            if (installment > amount) {
                toast({ title: 'Error', description: 'Cicilan tidak boleh lebih besar dari total pinjaman', variant: 'destructive' });
                setIsSubmitting(false); return;
            }
            await addLoan({
                employee_id: formData.employee_id,
                amount,
                requested_amount: amount,
                remaining_amount: amount,
                installment_amount: installment,
                reason: formData.reason,
                status: 'pending',
                start_date: formData.start_date
            });
            try {
                const requester = employees.find(e => e.id === formData.employee_id);
                await notificationService.create({
                    title: 'Pengajuan Kasbon Baru',
                    message: `${requester?.name || 'Seorang karyawan'} mengajukan kasbon sebesar ${formatCurrency(amount)}.`,
                    type: 'info', module: 'Kasbon HRD', user_id: null, read: false
                });
            } catch (e) { console.warn('Notif failed:', e); }
            toast({ title: 'Sukses', description: 'Pengajuan kasbon berhasil dibuat' });
            setShowAddDialog(false);
            setFormData({ employee_id: '', amount: '', installment_amount: '', reason: '', start_date: new Date().toLocaleDateString('en-CA') });
        } catch (error: any) {
            let msg = 'Gagal mengajukan kasbon';
            if (error?.message?.includes('row-level security')) msg = 'Ditolak oleh sistem keamanan database. Pastikan RLS sudah dikonfigurasi.';
            else if (error?.message) msg = error.message;
            toast({ title: 'Gagal', description: msg, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== APPROVE KASBON =====
    const [approvalFormData, setApprovalFormData] = useState({ 
        approved_amount: '', 
        installment_amount: '', 
        admin_notes: '',
        start_date: new Date().toLocaleDateString('en-CA')
    });

    const handleApproveClick = (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        setApprovalFormData({ 
            approved_amount: loan.amount.toString(), 
            installment_amount: loan.installment_amount.toString(), 
            admin_notes: '',
            start_date: loan.start_date || new Date().toLocaleDateString('en-CA')
        });
        setShowApproveDialog(true);
    };

    const handleApproveConfirm = async () => {
        if (!selectedLoan) return;
        try {
            const approvedAmount = parseFloat(approvalFormData.approved_amount);
            const installmentAmount = parseFloat(approvalFormData.installment_amount);

            if (isNaN(approvedAmount) || approvedAmount <= 0) {
                toast({ title: 'Error', description: 'Nominal disetujui tidak valid', variant: 'destructive' });
                return;
            }

            if (isNaN(installmentAmount) || installmentAmount <= 0) {
                toast({ title: 'Error', description: 'Nominal cicilan tidak valid', variant: 'destructive' });
                return;
            }

            setIsSubmitting(true);
            await updateLoan(selectedLoan.id, {
                status: 'approved',
                amount: approvedAmount,
                remaining_amount: approvedAmount,
                installment_amount: installmentAmount,
                admin_notes: approvalFormData.admin_notes,
                approved_by: user?.id,
                approved_at: new Date().toISOString(),
                start_date: approvalFormData.start_date,
                updated_at: new Date().toISOString()
            });
            try {
                await notificationService.create({
                    title: 'Kasbon Disetujui',
                    message: `Pengajuan kasbon Anda sebesar ${formatCurrency(parseFloat(approvalFormData.approved_amount))} telah disetujui oleh Administrator.`,
                    type: 'success', module: 'Kasbon HRD', user_id: null, read: false
                });
            } catch (e) { console.warn('Notif failed:', e); }
            toast({ title: 'Sukses', description: 'Kasbon berhasil disetujui' });
            setShowApproveDialog(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal menyetujui kasbon', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== EMPLOYEE: SUBMIT PAYMENT REQUEST =====
    const handlePaymentRequestClick = async (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        setPaymentReqData({
            amount: loan.installment_amount.toString(),
            method: 'cash',
            date: new Date().toLocaleDateString('en-CA'),
            notes: ''
        });
        setShowPaymentRequestDialog(true);
    };

    const handleSubmitPaymentRequest = async () => {
        if (!selectedLoan) return;
        try {
            setIsSubmitting(true);
            const amount = parseFloat(paymentReqData.amount);
            if (isNaN(amount) || amount <= 0) {
                toast({ title: 'Error', description: 'Nominal tidak valid', variant: 'destructive' });
                setIsSubmitting(false); return;
            }
            await submitPaymentRequest({
                loan_id: selectedLoan.id,
                amount,
                payment_date: new Date(paymentReqData.date).toISOString(),
                payment_method: paymentReqData.method,
                notes: paymentReqData.notes,
                requested_by: user?.id
            });
            // Notify admin
            try {
                const emp = employees.find(e => e.id === selectedLoan.employee_id);
                await notificationService.create({
                    title: 'Permintaan Cicilan Baru',
                    message: `${emp?.name || 'Karyawan'} mengajukan pembayaran cicilan sebesar ${formatCurrency(amount)}. Menunggu persetujuan Administrator.`,
                    type: 'info', module: 'Kasbon HRD', user_id: null, read: false
                });
            } catch (e) { console.warn('Notif failed:', e); }
            toast({ title: 'Sukses', description: 'Permintaan cicilan berhasil dikirim, menunggu persetujuan Administrator.' });
            setShowPaymentRequestDialog(false);
        } catch (error: any) {
            toast({ title: 'Gagal', description: error?.message || 'Gagal mengirim permintaan', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== ADMIN: APPROVE PAYMENT REQUEST =====
    const handleApprovePaymentClick = (payment: any) => {
        setSelectedPendingPayment(payment);
        setShowApprovePaymentDialog(true);
    };

    const handleApprovePaymentConfirm = async () => {
        if (!selectedPendingPayment) return;
        try {
            setIsSubmitting(true);
            await approvePaymentRequest(selectedPendingPayment.id, user?.id);
            const empId = selectedPendingPayment.employee_loans?.employee_id;
            try {
                await notificationService.create({
                    title: 'Cicilan Kasbon Disetujui',
                    message: `Pembayaran cicilan sebesar ${formatCurrency(selectedPendingPayment.amount)} telah disetujui dan dicatat oleh Administrator.`,
                    type: 'success', module: 'Kasbon HRD', user_id: null, read: false
                });
            } catch (e) { console.warn('Notif failed:', e); }
            toast({ title: 'Sukses', description: 'Pembayaran cicilan berhasil disetujui dan saldo telah dipotong.' });
            setShowApprovePaymentDialog(false);
        } catch (error: any) {
            toast({ title: 'Error', description: error?.message || 'Gagal menyetujui pembayaran', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== ADMIN: REJECT PAYMENT REQUEST =====
    const handleRejectPaymentClick = (payment: any) => {
        setSelectedPendingPayment(payment);
        setRejectionReason('');
        setShowRejectPaymentDialog(true);
    };

    const handleRejectPaymentConfirm = async () => {
        if (!selectedPendingPayment) return;
        try {
            setIsSubmitting(true);
            await rejectPaymentRequest(selectedPendingPayment.id, user?.id, rejectionReason);
            try {
                await notificationService.create({
                    title: 'Permintaan Cicilan Ditolak',
                    message: `Permintaan pembayaran cicilan sebesar ${formatCurrency(selectedPendingPayment.amount)} ditolak Administrator. ${rejectionReason ? `Alasan: ${rejectionReason}` : ''}`,
                    type: 'error', module: 'Kasbon HRD', user_id: null, read: false
                });
            } catch (e) { console.warn('Notif failed:', e); }
            toast({ title: 'Ditolak', description: 'Permintaan pembayaran cicilan telah ditolak.' });
            setShowRejectPaymentDialog(false);
        } catch (error: any) {
            toast({ title: 'Error', description: error?.message || 'Gagal menolak pembayaran', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== HISTORY =====
    const handleShowHistory = async (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        const history = await fetchPayments(loan.id);
        setLoanPayments(history);
        setShowHistoryDialog(true);
    };

    // ===== PRINT =====
    const handlePrintClick = async (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        const history = await fetchPayments(loan.id);
        setLoanPayments(history);
        setShowPrintDialog(true);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('print-area-kasbon');
        if (printContent) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`<html><head><title>Cetak Kasbon</title><style>body{font-family:monospace;padding:20px;color:#000}.flex{display:flex}.justify-between{justify-content:space-between}.border-b{border-bottom:1px dashed #ccc}.pb-2{padding-bottom:.5rem;margin-bottom:.5rem}.font-bold{font-weight:700}.uppercase{text-transform:uppercase}.text-center{text-align:center}.text-xs{font-size:.75rem}.text-red-600{color:#dc2626}.mt-6{margin-top:1.5rem}.border-t{border-top:1px solid #000}.pt-1{padding-top:.25rem}.px-4{padding-left:1rem;padding-right:1rem}.mb-14{margin-bottom:3.5rem}</style></head><body>${printContent.innerHTML}</body></html>`);
                win.document.close();
                win.focus();
                setTimeout(() => { win.print(); win.close(); }, 250);
            }
        }
    };

    // ===== EDIT =====
    const [editFormData, setEditFormData] = useState({ amount: '', installment_amount: '', reason: '' });

    const handleEditClick = (loan: EmployeeLoan) => {
        setSelectedLoan(loan);
        setEditFormData({ amount: loan.amount.toString(), installment_amount: loan.installment_amount.toString(), reason: loan.reason || '' });
        setShowEditDialog(true);
    };

    const handleEditConfirm = async () => {
        if (!selectedLoan) return;
        try {
            const newAmount = parseFloat(editFormData.amount);
            const newInstallment = parseFloat(editFormData.installment_amount);

            if (isNaN(newAmount) || newAmount <= 0) {
                toast({ title: 'Error', description: 'Total pinjaman tidak valid', variant: 'destructive' });
                return;
            }

            if (isNaN(newInstallment) || newInstallment <= 0) {
                toast({ title: 'Error', description: 'Nominal cicilan tidak valid', variant: 'destructive' });
                return;
            }
            
            setIsSubmitting(true);
            
            // Only count approved payments
            const payments = await fetchPayments(selectedLoan.id);
            const totalPaid = payments
                .filter((p: any) => p.payment_status !== 'pending_approval' && p.payment_status !== 'rejected')
                .reduce((sum, p) => sum + p.amount, 0);
                
            const newRemaining = Math.max(0, newAmount - totalPaid);
            
            // Determine new status if necessary
            let newStatus = selectedLoan.status;
            if (newRemaining <= 0) {
                newStatus = 'paid_off';
            } else if (selectedLoan.status === 'paid_off' && newRemaining > 0) {
                newStatus = 'approved';
            }

            await updateLoan(selectedLoan.id, { 
                amount: newAmount, 
                remaining_amount: newRemaining, 
                installment_amount: newInstallment, 
                reason: editFormData.reason,
                status: newStatus,
                updated_at: new Date().toISOString()
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
        } catch { toast({ title: 'Error', description: 'Gagal menolak kasbon', variant: 'destructive' }); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
        try {
            await deleteLoan(id);
            toast({ title: 'Sukses', description: 'Data kasbon dihapus' });
        } catch { toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' }); }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-blue-100 text-blue-800',
        rejected: 'bg-red-100 text-red-800',
        paid_off: 'bg-green-100 text-green-800'
    };

    const statusLabels: Record<string, string> = {
        pending: 'Menunggu',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        paid_off: 'Lunas'
    };

    const methodLabels: Record<string, string> = {
        cash: 'Tunai',
        payroll: 'Potong Gaji',
        transfer: 'Transfer Bank'
    };

    return (
        <div className="space-y-6 relative">
            {isSubmitting && <FullPageLoader />}

            {/* Header */}
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

            {/* ===== PENDING PAYMENT REQUESTS PANEL (Admin/HR only) ===== */}
            {isAdminOrHR && (
                <Card className={`border-2 ${pendingPayments.length > 0 ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200'}`}>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <button
                            className="flex items-center justify-between w-full"
                            onClick={() => setShowPendingPanel(prev => !prev)}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldAlert className={`w-5 h-5 ${pendingPayments.length > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                                <CardTitle className="text-base font-semibold">
                                    Permintaan Cicilan Menunggu Persetujuan
                                    {pendingPayments.length > 0 && (
                                        <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">{pendingPayments.length}</span>
                                    )}
                                </CardTitle>
                            </div>
                            {showPendingPanel ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                    </CardHeader>
                    {showPendingPanel && (
                        <CardContent className="px-0 pb-0">
                            {pendingLoading ? (
                                <div className="py-6 text-center text-muted-foreground text-sm">Memuat...</div>
                            ) : pendingPayments.length === 0 ? (
                                <div className="py-6 text-center text-muted-foreground text-sm italic">
                                    Tidak ada permintaan cicilan yang menunggu persetujuan.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Karyawan</TableHead>
                                            <TableHead>Nominal</TableHead>
                                            <TableHead>Metode</TableHead>
                                            <TableHead>Tanggal Bayar</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingPayments.map((payment) => {
                                            const empName = payment.employee_loans?.employees?.name || 'Unknown';
                                            return (
                                                <TableRow key={payment.id} className="bg-orange-50/30 hover:bg-orange-50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-700">
                                                                {empName.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{empName}</p>
                                                                <p className="text-[10px] text-muted-foreground">Sisa: {formatCurrency(payment.employee_loans?.remaining_amount || 0)}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono font-bold text-orange-700">{formatCurrency(payment.amount)}</TableCell>
                                                    <TableCell className="text-sm capitalize">{methodLabels[payment.payment_method] || payment.payment_method}</TableCell>
                                                    <TableCell className="text-sm">{formatDateShort(payment.payment_date)}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{payment.notes || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                                                                onClick={() => handleApprovePaymentClick(payment)}
                                                            >
                                                                <BadgeCheck className="w-3 h-3 mr-1" />
                                                                Setujui
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                                                                onClick={() => handleRejectPaymentClick(payment)}
                                                            >
                                                                <Ban className="w-3 h-3 mr-1" />
                                                                Tolak
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

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
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="pending">Menunggu</SelectItem>
                            <SelectItem value="approved">Disetujui</SelectItem>
                            <SelectItem value="paid_off">Lunas</SelectItem>
                            <SelectItem value="rejected">Ditolak</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Main Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Karyawan</TableHead>
                                <TableHead>Plafon</TableHead>
                                <TableHead>Sisa</TableHead>
                                <TableHead>Angsuran/Bln</TableHead>
                                <TableHead>Alasan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loansError && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4 bg-red-50 text-red-600 italic text-sm">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Error: {loansError}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat data...</TableCell></TableRow>
                            ) : filteredLoans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <CreditCard className="w-10 h-10 text-gray-200 mb-3" />
                                            <p className="font-medium text-gray-900">Tidak ada pengajuan kasbon</p>
                                            <p className="text-sm mt-1">{searchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada kasbon tersimpan di sistem.'}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLoans.map((loan) => {
                                    const employee = employees.find(e => e.id === loan.employee_id);
                                    const isMyLoan = loan.employee_id === user?.employee_id;
                                    return (
                                        <TableRow key={loan.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarFallback className="bg-hrd/10 text-hrd text-xs">
                                                            {employee?.name.substring(0, 2).toUpperCase() || 'NA'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium font-body">{employee?.name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-muted-foreground">Mulai: {formatDate(loan.start_date)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-mono">{formatCurrency(loan.amount)}</span>
                                                    {loan.requested_amount > 0 && loan.requested_amount !== loan.amount && (
                                                        <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(loan.requested_amount)}</span>
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
                                            <TableCell className="text-sm max-w-[150px]">
                                                <p className="truncate" title={loan.reason}>{loan.reason}</p>
                                                {loan.admin_notes && (
                                                    <p className="text-[10px] text-blue-600 italic truncate" title={loan.admin_notes}>Note: {loan.admin_notes}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[loan.status]}>
                                                    {statusLabels[loan.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {/* Admin/HR: approve pending kasbon */}
                                                    {loan.status === 'pending' && isAdminOrHR && (
                                                        <>
                                                            <Button size="icon" variant="ghost" title="Setujui Kasbon" className="text-green-600 hover:bg-green-50" onClick={() => handleApproveClick(loan)}>
                                                                <CheckCircle className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" title="Tolak Kasbon" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(loan.id)}>
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {loan.status === 'approved' && (
                                                        <>
                                                            {/* Staff/non-admin: submit payment request */}
                                                            {!isAdminOrHR && isMyLoan && (
                                                                <Button size="icon" variant="ghost" title="Ajukan Pembayaran Cicilan" className="text-blue-600 hover:bg-blue-50" onClick={() => handlePaymentRequestClick(loan)}>
                                                                    <SendHorizonal className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {/* History: visible to all */}
                                                            <Button size="icon" variant="ghost" title="Riwayat Cicilan" className="text-gray-600 hover:bg-gray-50" onClick={() => handleShowHistory(loan)}>
                                                                <History className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {/* Print */}
                                                    <Button size="icon" variant="ghost" title="Cetak" className="text-purple-600 hover:bg-purple-50" onClick={() => handlePrintClick(loan)}>
                                                        <Printer className="w-4 h-4" />
                                                    </Button>
                                                    {/* Admin: edit & delete */}
                                                    {isAdminOrHR && (
                                                        <Button size="icon" variant="ghost" title="Edit Nominal" className="text-amber-600 hover:bg-amber-50" onClick={() => handleEditClick(loan)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {isAdminOrHR && (
                                                        <Button size="icon" variant="ghost" className="text-gray-400 hover:text-red-600" onClick={() => handleDelete(loan.id)}>
                                                            <Trash2 className="w-4 h-4" />
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

            {/* ===== DIALOG: AJUKAN KASBON ===== */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajukan Kasbon Baru</DialogTitle>
                        <DialogDescription>Input detail pengajuan kasbon karyawan</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Karyawan</Label>
                            <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })} disabled={user?.role === 'staff'}>
                                <SelectTrigger className={user?.role === 'staff' ? "bg-gray-50" : ""}>
                                    <SelectValue placeholder="Pilih karyawan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {user?.role === 'staff' ? (
                                        <SelectItem value={user.employee_id || 'none'}>
                                            {employees.find(e => e.id === user.employee_id)?.name || user.name || 'Profil Saya'}
                                        </SelectItem>
                                    ) : employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Jumlah Pinjaman (Rp)</Label>
                            <Input type="number" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="Contoh: 1000000" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Cicilan per Bulan (Rp)</Label>
                            <Input type="number" value={formData.installment_amount} onChange={(e) => setFormData(p => ({ ...p, installment_amount: e.target.value }))} placeholder="Contoh: 100000" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Mulai Potong Gaji</Label>
                            <Input type="date" value={formData.start_date} onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Alasan / Keperluan</Label>
                            <Textarea value={formData.reason} onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))} placeholder="Jelaskan alasan pengajuan kasbon..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
                        <Button onClick={handleAddLoan} disabled={isSubmitting} className="bg-hrd hover:bg-hrd-dark">
                            {isSubmitting ? 'Menyimpan...' : 'Ajukan Kasbon'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== DIALOG: APPROVE KASBON (Admin) ===== */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Persetujuan Kasbon</DialogTitle>
                        <DialogDescription>Tentukan nominal akhir untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                            <p className="font-bold">Pengajuan Awal:</p>
                            <p>{formatCurrency(selectedLoan?.amount || 0)} — {selectedLoan?.reason}</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Nominal Disetujui (Rp)</Label>
                            <Input type="number" value={approvalFormData.approved_amount} onChange={(e) => setApprovalFormData(p => ({ ...p, approved_amount: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Cicilan per Bulan (Rp)</Label>
                            <Input type="number" value={approvalFormData.installment_amount} onChange={(e) => setApprovalFormData(p => ({ ...p, installment_amount: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Mulai Potong Gaji</Label>
                            <Input type="date" value={approvalFormData.start_date} onChange={(e) => setApprovalFormData(p => ({ ...p, start_date: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Catatan Admin (Opsional)</Label>
                            <Textarea value={approvalFormData.admin_notes} onChange={(e) => setApprovalFormData(p => ({ ...p, admin_notes: e.target.value }))} placeholder="Alasan penyesuaian..." />
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

            {/* ===== DIALOG: AJUKAN PEMBAYARAN (Employee) ===== */}
            <Dialog open={showPaymentRequestDialog} onOpenChange={setShowPaymentRequestDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SendHorizonal className="w-5 h-5 text-blue-600" />
                            Ajukan Pembayaran Cicilan
                        </DialogTitle>
                        <DialogDescription>
                            Permintaan Anda akan dikirim ke Administrator untuk disetujui sebelum diproses.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                            <div className="flex justify-between mb-1"><span>Total Pinjaman:</span><span className="font-bold">{formatCurrency(selectedLoan?.amount || 0)}</span></div>
                            <div className="flex justify-between text-red-700"><span>Sisa Saldo:</span><span className="font-bold">{formatCurrency(selectedLoan?.remaining_amount || 0)}</span></div>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>Pembayaran akan diproses setelah Administrator menyetujui permintaan ini. Saldo kasbon belum akan berkurang sampai disetujui.</span>
                        </div>
                        <div className="grid gap-2">
                            <Label>Nominal Pembayaran (Rp)</Label>
                            <Input type="number" value={paymentReqData.amount} onChange={(e) => setPaymentReqData(p => ({ ...p, amount: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tanggal Pembayaran</Label>
                            <Input type="date" value={paymentReqData.date} onChange={(e) => setPaymentReqData(p => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Metode Pembayaran</Label>
                            <Select value={paymentReqData.method} onValueChange={(v) => setPaymentReqData(p => ({ ...p, method: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Tunai / Langsung</SelectItem>
                                    <SelectItem value="payroll">Potong Gaji</SelectItem>
                                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Keterangan</Label>
                            <Input value={paymentReqData.notes} onChange={(e) => setPaymentReqData(p => ({ ...p, notes: e.target.value }))} placeholder="Misal: Cicilan Bulan April" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentRequestDialog(false)}>Batal</Button>
                        <Button onClick={handleSubmitPaymentRequest} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <SendHorizonal className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Mengirim...' : 'Kirim Permintaan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== DIALOG: APPROVE PAYMENT REQUEST (Admin) ===== */}
            <Dialog open={showApprovePaymentDialog} onOpenChange={setShowApprovePaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-700">
                            <BadgeCheck className="w-5 h-5" />
                            Setujui Pembayaran Cicilan
                        </DialogTitle>
                        <DialogDescription>
                            Menyetujui akan langsung memotong saldo kasbon karyawan.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPendingPayment && (
                        <div className="grid gap-3 py-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Karyawan:</span><span className="font-bold">{selectedPendingPayment.employee_loans?.employees?.name}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nominal:</span><span className="font-bold text-green-700">{formatCurrency(selectedPendingPayment.amount)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Metode:</span><span>{methodLabels[selectedPendingPayment.payment_method] || selectedPendingPayment.payment_method}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tgl Bayar:</span><span>{formatDateShort(selectedPendingPayment.payment_date)}</span></div>
                                {selectedPendingPayment.notes && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Keterangan:</span><span>{selectedPendingPayment.notes}</span></div>}
                            </div>
                            <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                                <span className="text-muted-foreground">Sisa saldo setelah disetujui:</span>
                                <span className="font-bold text-red-600">{formatCurrency(Math.max(0, (selectedPendingPayment.employee_loans?.remaining_amount || 0) - selectedPendingPayment.amount))}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApprovePaymentDialog(false)}>Batal</Button>
                        <Button onClick={handleApprovePaymentConfirm} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                            {isSubmitting ? 'Memproses...' : 'Setujui & Catat Pembayaran'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== DIALOG: REJECT PAYMENT REQUEST (Admin) ===== */}
            <Dialog open={showRejectPaymentDialog} onOpenChange={setShowRejectPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <Ban className="w-5 h-5" />
                            Tolak Permintaan Pembayaran
                        </DialogTitle>
                        <DialogDescription>Permintaan akan ditolak dan karyawan akan mendapat notifikasi.</DialogDescription>
                    </DialogHeader>
                    {selectedPendingPayment && (
                        <div className="grid gap-3 py-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-muted-foreground">Karyawan:</span><span className="font-bold">{selectedPendingPayment.employee_loans?.employees?.name}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Nominal:</span><span className="font-bold text-red-700">{formatCurrency(selectedPendingPayment.amount)}</span></div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Alasan Penolakan (Opsional)</Label>
                                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Jelaskan alasan penolakan..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectPaymentDialog(false)}>Batal</Button>
                        <Button onClick={handleRejectPaymentConfirm} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
                            {isSubmitting ? 'Memproses...' : 'Tolak Permintaan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== DIALOG: HISTORY ===== */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Riwayat Pembayaran Cicilan</DialogTitle>
                        <DialogDescription>Riwayat cicilan untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {loanPayments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground italic">Belum ada riwayat pembayaran.</div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tgl Bayar</TableHead>
                                            <TableHead>Metode</TableHead>
                                            <TableHead>Nominal</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loanPayments.map((pay) => (
                                            <TableRow key={pay.id}>
                                                <TableCell className="text-xs">{new Date(pay.payment_date).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="capitalize text-xs">{methodLabels[pay.payment_method] || pay.payment_method}</TableCell>
                                                <TableCell className="font-mono text-sm font-bold">{formatCurrency(pay.amount)}</TableCell>
                                                <TableCell>
                                                    <Badge className={
                                                        pay.payment_status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                                        pay.payment_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-green-100 text-green-800'
                                                    }>
                                                        {pay.payment_status === 'pending_approval' ? 'Menunggu' :
                                                         pay.payment_status === 'rejected' ? 'Ditolak' : 'Disetujui'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs">{pay.notes || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium">Sisa Saldo Pinjaman</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedLoan?.remaining_amount || 0)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground italic">Total: {formatCurrency(selectedLoan?.amount || 0)}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowHistoryDialog(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== DIALOG: EDIT (Admin) ===== */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Data Kasbon</DialogTitle>
                        <DialogDescription>Ubah nominal kasbon untuk {employees.find(e => e.id === selectedLoan?.employee_id)?.name || 'Karyawan'}.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Total Pinjaman Baru (Rp)</Label>
                            <Input type="number" value={editFormData.amount} onChange={(e) => setEditFormData(p => ({ ...p, amount: e.target.value }))} />
                            <p className="text-[10px] text-muted-foreground italic">Sisa saldo dihitung ulang otomatis dari riwayat cicilan.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Cicilan per Bulan (Rp)</Label>
                            <Input type="number" value={editFormData.installment_amount} onChange={(e) => setEditFormData(p => ({ ...p, installment_amount: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Alasan</Label>
                            <Textarea value={editFormData.reason} onChange={(e) => setEditFormData(p => ({ ...p, reason: e.target.value }))} />
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

            {/* ===== DIALOG: PRINT ===== */}
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent className="max-w-md bg-gray-100">
                    <DialogHeader>
                        <DialogTitle className="sr-only">Preview Kasbon</DialogTitle>
                    </DialogHeader>
                    <div className="bg-white p-6 border border-gray-300 shadow-sm mx-auto overflow-y-auto max-h-[60vh] w-full relative" id="print-area-kasbon">
                        {selectedLoan?.status === 'paid_off' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none transform -rotate-45 font-bold text-6xl text-green-600 border-8 border-green-600 rounded-lg p-2 uppercase">LUNAS</div>
                        )}
                        <div className="text-center mb-6 border-b border-black pb-4">
                            <h3 className="font-bold text-lg uppercase tracking-wider mb-1">BUKTI KASBON KARYAWAN</h3>
                            <p className="text-xs text-gray-600 font-medium">PT. 18 JAYA TEMPO</p>
                        </div>
                        <div className="space-y-3 text-sm font-mono text-black relative z-10">
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Tanggal Cetak:</span><span>{new Date().toLocaleDateString('id-ID')}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Nama Karyawan:</span><span className="font-bold">{employees.find(e => e.id === selectedLoan?.employee_id)?.name}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Mulai Potong:</span><span>{selectedLoan ? formatDate(selectedLoan.start_date) : '-'}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Total Pinjaman:</span><span>{formatCurrency(selectedLoan?.amount || 0)}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Potongan / Bulan:</span><span>{formatCurrency(selectedLoan?.installment_amount || 0)}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Sisa Saldo:</span><span className="font-bold text-red-600">{formatCurrency(selectedLoan?.remaining_amount || 0)}</span></div>
                            <div className="flex justify-between border-b border-gray-200 pb-2"><span>Status:</span><span className="uppercase font-bold">{statusLabels[selectedLoan?.status || 'pending']}</span></div>
                            <div className="mt-6 pt-2">
                                <p className="mb-2 font-bold bg-gray-100 p-1 text-center border-y border-gray-300">Riwayat Pembayaran (Disetujui)</p>
                                {loanPayments.filter(p => p.payment_status !== 'rejected' && p.payment_status !== 'pending_approval').length === 0 ? (
                                    <p className="text-xs italic text-gray-500 text-center py-2">Belum ada history pembayaran</p>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold border-b border-gray-200 pb-1 mb-1"><span>Tanggal</span><span>Metode</span><span>Nominal</span></div>
                                        {loanPayments.filter(p => p.payment_status !== 'rejected' && p.payment_status !== 'pending_approval').map((pay, idx) => (
                                            <div key={idx} className="flex justify-between text-xs border-b border-gray-100 pb-1">
                                                <span>{new Date(pay.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className="capitalize text-gray-600">{methodLabels[pay.payment_method] || pay.payment_method}</span>
                                                <span>{formatCurrency(pay.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mt-10 pt-4 flex justify-between text-center text-xs pb-4">
                                <div><p className="mb-14">Disetujui Oleh,</p><p className="border-t border-black pt-1 shrink-0 px-4 whitespace-nowrap">HRD / Management</p></div>
                                <div><p className="mb-14">Karyawan,</p><p className="border-t border-black pt-1 shrink-0 px-4 whitespace-nowrap font-bold">{employees.find(e => e.id === selectedLoan?.employee_id)?.name}</p></div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setShowPrintDialog(false)}>Batal</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />Cetak Kertas Putih
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
