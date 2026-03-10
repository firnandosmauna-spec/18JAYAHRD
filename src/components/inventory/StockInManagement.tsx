import React, { useState } from 'react';
import {
    Plus,
    Search,
    ArrowDownRight,
    Calendar,
    Package,
    Warehouse,
    FileText,
    Edit,
    Trash2,
    MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { useProducts, useWarehouses, useStockMovements } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function StockInManagement() {
    const { products, refetch: refetchProducts } = useProducts();
    const { warehouses } = useWarehouses();
    const { movements, loading, addMovement, updateMovement, deleteMovement, refetch } = useStockMovements();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMovement, setEditingMovement] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const [formData, setFormData] = useState({
        product_id: '',
        warehouse_id: '',
        quantity: '',
        reference: '',
        notes: ''
    });

    const stockInMovements = movements.filter(m => m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0));

    const filteredMovements = stockInMovements.filter(m => {
        const productName = (m as any).products?.name || '';
        const sku = (m as any).products?.sku || '';
        const reference = m.reference || '';
        const search = searchQuery.toLowerCase();
        return productName.toLowerCase().includes(search) ||
            sku.toLowerCase().includes(search) ||
            reference.toLowerCase().includes(search);
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.product_id || !formData.quantity) return;

        try {
            setIsSubmitting(true);
            await addMovement({
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                movement_type: 'in',
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                reference_type: 'manual_entry'
            });

            toast({ title: 'Berhasil', description: 'Stok masuk berhasil dicatat' });
            setShowAddDialog(false);
            setFormData({
                product_id: '',
                warehouse_id: '',
                quantity: '',
                reference: '',
                notes: ''
            });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal mencatat stok masuk',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (movement: any) => {
        setEditingMovement(movement);
        setFormData({
            product_id: movement.product_id,
            warehouse_id: movement.warehouse_id || '',
            quantity: movement.quantity.toString(),
            reference: movement.reference || '',
            notes: movement.notes || ''
        });
        setShowEditDialog(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMovement || !formData.product_id || !formData.quantity) return;

        try {
            setIsSubmitting(true);
            await updateMovement(editingMovement.id, {
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null
            });

            toast({ title: 'Berhasil', description: 'Stok masuk berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingMovement(null);
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui stok masuk',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data stok masuk ini? Stok barang akan disesuaikan kembali.')) return;

        try {
            await deleteMovement(id);
            toast({ title: 'Berhasil', description: 'Data stok masuk berhasil dihapus' });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menghapus data stok masuk',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Stok Masuk</h2>
                    <p className="text-muted-foreground font-body">Catat penambahan stok barang ke gudang</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Stok
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Catat Stok Masuk</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan detail penerimaan barang
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="font-body">Pilih Produk *</Label>
                                <Select
                                    value={formData.product_id}
                                    onValueChange={(val) => setFormData({ ...formData, product_id: val })}
                                    required
                                >
                                    <SelectTrigger className="font-body">
                                        <SelectValue placeholder="Cari produk..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((p) => (
                                            <SelectItem key={p.id} value={p.id} className="font-body">
                                                {p.name} ({p.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Jumlah *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Gudang</Label>
                                    <Select
                                        value={formData.warehouse_id}
                                        onValueChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih gudang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id} className="font-body">
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">No. Referensi (PO/Surat Jalan)</Label>
                                <Input
                                    placeholder="MSK-2024..."
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Keterangan</Label>
                                <Input
                                    placeholder="Tambahkan catatan..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="font-body"
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 font-body">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Stok'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Edit Stok Masuk</DialogTitle>
                            <DialogDescription className="font-body">
                                Perbarui detail penerimaan barang
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="font-body">Produk</Label>
                                <Select
                                    value={formData.product_id}
                                    onValueChange={(val) => setFormData({ ...formData, product_id: val })}
                                    disabled
                                >
                                    <SelectTrigger className="font-body opacity-50">
                                        <SelectValue placeholder="Produk..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((p) => (
                                            <SelectItem key={p.id} value={p.id} className="font-body">
                                                {p.name} ({p.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Jumlah *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Gudang</Label>
                                    <Select
                                        value={formData.warehouse_id}
                                        onValueChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih gudang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id} className="font-body">
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">No. Referensi (PO/Surat Jalan)</Label>
                                <Input
                                    placeholder="MSK-2024..."
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Keterangan</Label>
                                <Input
                                    placeholder="Tambahkan catatan..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="font-body"
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 font-body">
                                    {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-gray-200">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="font-display text-lg">Riwayat Stok Masuk</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari riwayat..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 font-body"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-body">Tanggal</TableHead>
                                <TableHead className="font-body">Produk</TableHead>
                                <TableHead className="font-body">Gudang</TableHead>
                                <TableHead className="font-body">Referensi</TableHead>
                                <TableHead className="font-body text-right">Jumlah</TableHead>
                                <TableHead className="font-body text-right">Harga Satuan</TableHead>
                                <TableHead className="font-body text-right">Total Harga</TableHead>
                                <TableHead className="font-body">Status</TableHead>
                                <TableHead className="font-body text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                            <span className="font-body text-muted-foreground">Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMovements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12">
                                        <ArrowDownRight className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="font-body text-muted-foreground">Belum ada data stok masuk</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMovements.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-body whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                {new Date(m.created_at).toLocaleDateString('id-ID')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold font-body text-[#1C1C1E]">{(m as any).products?.name || '-'}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{(m as any).products?.sku || '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-body">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                                                {(m as any).warehouses?.name || '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                {m.reference || '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono text-green-600">
                                            +{m.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {formatCurrency((m as any).products?.price || 0)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono text-green-600">
                                            {formatCurrency(m.quantity * ((m as any).products?.price || 0))}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                Selesai
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
                                                    <DropdownMenuItem onClick={() => handleEdit(m)} className="font-body">
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(m.id)} className="font-body text-destructive">
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {filteredMovements.length > 0 && (
                                <TableRow className="bg-gray-50/50 font-bold">
                                    <TableCell colSpan={4} className="text-right font-display text-gray-900 px-4 py-4">
                                        TOTAL
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                        +{filteredMovements.reduce((acc, m) => acc + m.quantity, 0)} unit
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                        {formatCurrency(filteredMovements.reduce((acc, m) => acc + (m.quantity * ((m as any).products?.price || 0)), 0))}
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
