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
    User
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
    const { loans, loading, error, addLoan, updateLoan, deleteLoan } = useLoans();
    const { employees } = useEmployees();
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        amount: '',
        installment_amount: '',
        reason: '',
        start_date: new Date().toLocaleDateString('en-CA')
    });

    // Role checking - Make it highly flexible for any custom admin/HR roles
    const normalizedRole = (user?.role || '').toLowerCase();
    const isAdminRole = normalizedRole === 'administrator' || normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'hrd' || normalizedRole === 'owner' || normalizedRole === 'direktur';
    const hasHRDModule = user?.modules?.some(m => m.toLowerCase() === 'hrd');
    const isAdminOrHR = isAdminRole || hasHRDModule;

    // Filter Logic
    const filteredLoans = loans.filter(loan => {
        const employee = employees.find(e => e.id === loan.employee_id);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (employee?.name || '').toLowerCase().includes(searchLower) ||
            (loan.reason || '').toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;

        // Staff filtering: only see own loans unless they have HRD rights
        const matchesRole = isAdminOrHR
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
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Gagal mengajukan kasbon',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await updateLoan(id, { status: 'approved' });
            toast({ title: 'Sukses', description: 'Kasbon disetujui' });
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal menyetujui kasbon', variant: 'destructive' });
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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8"><span>Memuat data...</span></TableCell>
                                </TableRow>
                            ) : filteredLoans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><span>Tidak ada data kasbon ditemukan</span></TableCell>
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
                                            <TableCell className="font-mono">{formatCurrency(loan.amount)}</TableCell>
                                            <TableCell className="font-mono text-red-600 font-medium">{formatCurrency(loan.remaining_amount)}</TableCell>
                                            <TableCell className="font-mono">{formatCurrency(loan.installment_amount)}</TableCell>
                                            <TableCell className="font-body text-sm"><span>{formatDate(loan.start_date)}</span></TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColors[loan.status]} font-body`}>
                                                    <span>{statusLabels[loan.status]}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {loan.status === 'pending' && isAdminOrHR && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(loan.id)}>
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(loan.id)}>
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                                {(user?.role === 'Administrator' || user?.role === 'manager') && (
                                                    <Button size="icon" variant="ghost" className="text-gray-400 hover:text-red-600" onClick={() => handleDelete(loan.id)}>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                )}
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
                                onValueChange={(val) => setFormData(p => ({ ...p, employee_id: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Karyawan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}><span>{emp.name}</span></SelectItem>
                                    ))}
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
        </div>
    );
}
