import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Plus,
    Search,
    Edit,
    Trash2,
    MoreVertical,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { paymentMethodService, PaymentMethod } from '@/services/paymentMethodService';

export function PaymentMethodManagement() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const fetchMethods = async () => {
        try {
            setLoading(true);
            const data = await paymentMethodService.getAll();
            setMethods(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Gagal mengambil data cara pembayaran',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        try {
            setIsSubmitting(true);
            await paymentMethodService.create(formData);
            toast({ title: 'Berhasil', description: 'Cara pembayaran baru telah ditambahkan' });
            setShowAddDialog(false);
            setFormData({ name: '', description: '' });
            fetchMethods();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menambahkan cara pembayaran',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMethod || !formData.name) return;

        try {
            setIsSubmitting(true);
            await paymentMethodService.update(editingMethod.id, formData);
            toast({ title: 'Berhasil', description: 'Cara pembayaran telah diperbarui' });
            setShowEditDialog(false);
            setEditingMethod(null);
            fetchMethods();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui cara pembayaran',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (method: PaymentMethod) => {
        try {
            await paymentMethodService.update(method.id, { is_active: !method.is_active });
            toast({
                title: 'Status Diperbarui',
                description: `Cara pembayaran ${method.name} telah ${!method.is_active ? 'diaktifkan' : 'dinonaktifkan'}`
            });
            fetchMethods();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Gagal mengubah status',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus cara pembayaran ini?')) return;

        try {
            await paymentMethodService.delete(id);
            toast({ title: 'Berhasil', description: 'Cara pembayaran telah dihapus' });
            fetchMethods();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Gagal menghapus data. Data mungkin masih digunakan dalam transaksi.',
                variant: 'destructive'
            });
        }
    };

    const filteredMethods = methods.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-[#1C1C1E]">Cara Pembayaran</h2>
                    <p className="text-muted-foreground font-body text-sm">Kelola metode pembayaran untuk transaksi persediaan</p>
                </div>
                <Button
                    onClick={() => {
                        setFormData({ name: '', description: '' });
                        setShowAddDialog(true);
                    }}
                    className="bg-inventory hover:bg-inventory-dark font-body"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Metode
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari metode pembayaran..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 font-body"
                    />
                </div>
            </div>

            <Card className="border-gray-200">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-body text-xs uppercase tracking-wider">Nama Metode</TableHead>
                                <TableHead className="font-body text-xs uppercase tracking-wider">Keterangan</TableHead>
                                <TableHead className="font-body text-xs uppercase tracking-wider">Status</TableHead>
                                <TableHead className="font-body text-xs uppercase tracking-wider text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-body">
                                        Memuat data...
                                    </TableCell>
                                </TableRow>
                            ) : filteredMethods.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-body">
                                        <div className="flex flex-col items-center gap-2">
                                            <CreditCard className="w-8 h-8 opacity-20" />
                                            <p>Belum ada data cara pembayaran</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMethods.map((m) => (
                                    <TableRow key={m.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-body font-medium">
                                            {m.name}
                                        </TableCell>
                                        <TableCell className="font-body text-sm text-muted-foreground">
                                            {m.description || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`font-body text-[10px] ${m.is_active ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-400 bg-gray-50'} cursor-pointer`}
                                                onClick={() => toggleStatus(m)}
                                            >
                                                {m.is_active ? 'Aktif' : 'Non-aktif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingMethod(m);
                                                            setFormData({ name: m.name, description: m.description || '' });
                                                            setShowEditDialog(true);
                                                        }}
                                                        className="font-body cursor-pointer"
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => toggleStatus(m)}
                                                        className="font-body cursor-pointer"
                                                    >
                                                        {m.is_active ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                        {m.is_active ? 'Non-aktifkan' : 'Aktifkan'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(m.id)}
                                                        className="font-body cursor-pointer text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display">Tambah Cara Pembayaran</DialogTitle>
                        <DialogDescription className="font-body">
                            Tambahkan metode pembayaran baru untuk transaksi persediaan
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="font-body">Nama Metode *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Misal: Transfer Bank Mandiri"
                                required
                                className="font-body"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-body">Keterangan</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Opsional keterangan..."
                                className="font-body"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="font-body">Batal</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-inventory hover:bg-inventory-dark font-body">
                                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display">Edit Cara Pembayaran</DialogTitle>
                        <DialogDescription className="font-body">
                            Perbarui informasi metode pembayaran
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="font-body">Nama Metode *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Misal: Tunai"
                                required
                                className="font-body"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-body">Keterangan</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Opsional keterangan..."
                                className="font-body"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="font-body">Batal</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-inventory hover:bg-inventory-dark font-body">
                                {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
