import React, { useState } from 'react';
import {
    Plus,
    Search,
    ArrowUpRight,
    Calendar,
    Warehouse,
    FileText,
    AlertCircle,
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
    Alert,
    AlertDescription,
} from '@/components/ui/alert';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProducts, useWarehouses, useStockMovements } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function StockOutManagement() {
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

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const currentStock = selectedProduct ? selectedProduct.stock : 0;
    const isOverstock = formData.quantity ? parseFloat(formData.quantity) > currentStock : false;

    const stockOutMovements = movements.filter(m => m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0));

    const filteredMovements = stockOutMovements.filter(m => {
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

        if (isOverstock) {
            toast({
                title: 'Error',
                description: 'Jumlah stok keluar melebihi stok yang tersedia',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await addMovement({
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                movement_type: 'out',
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                reference_type: 'manual_entry'
            });

            toast({ title: 'Berhasil', description: 'Stok keluar berhasil dicatat' });
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
                description: error.message || 'Gagal mencatat stok keluar',
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

        // Calculate if updated quantity is more than available (considering current movement)
        const currentProdStock = selectedProduct ? selectedProduct.stock : 0;
        const potentialStock = currentProdStock + editingMovement.quantity;
        if (parseFloat(formData.quantity) > potentialStock) {
            toast({
                title: 'Error',
                description: 'Jumlah stok keluar melebihi stok yang tersedia',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await updateMovement(editingMovement.id, {
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null
            });

            toast({ title: 'Berhasil', description: 'Stok keluar berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingMovement(null);
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui stok keluar',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data stok keluar ini? Stok barang akan disesuaikan kembali.')) return;

        try {
            await deleteMovement(id);
            toast({ title: 'Berhasil', description: 'Data stok keluar berhasil dihapus' });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menghapus data stok keluar',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Stok Keluar</h2>
                    <p className="text-muted-foreground font-body">Catat pengeluaran barang dari gudang</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Plus className="w-4 h-4 mr-2" />
                            Catat Pengeluaran
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Catat Stok Keluar</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan detail pengeluaran barang
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
                                                {p.name} (Stok: {p.stock} {p.unit})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedProduct && (
                                <Alert className={isOverstock ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
                                    <AlertCircle className={`h-4 w-4 ${isOverstock ? "text-red-600" : "text-blue-600"}`} />
                                    <AlertDescription className={`text-xs font-body ${isOverstock ? "text-red-700" : "text-blue-700"}`}>
                                        Stok saat ini: <strong>{currentStock} {selectedProduct.unit}</strong>.
                                        {isOverstock && " Jumlah melebihi stok!"}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Jumlah *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                        className={`font-mono ${isOverstock ? "border-red-500" : ""}`}
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
                                <Label className="font-body text-xs">No. Referensi (SO/Kwitansi)</Label>
                                <Input
                                    placeholder="KLR-2024..."
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Keterangan</Label>
                                <Input
                                    placeholder="Alasan pengeluaran..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="font-body"
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isOverstock}
                                    className="bg-red-600 hover:bg-red-700 font-body"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Catat Pengeluaran'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Edit Stok Keluar</DialogTitle>
                            <DialogDescription className="font-body">
                                Perbarui detail pengeluaran barang
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
                                                {p.name} (Stok: {p.stock} {p.unit})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedProduct && editingMovement && (
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-xs font-body text-blue-700">
                                        Stok akan disesuaikan. Stok saat ini: <strong>{selectedProduct.stock} {selectedProduct.unit}</strong>.
                                    </AlertDescription>
                                </Alert>
                            )}

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
                                <Label className="font-body text-xs">No. Referensi (SO/Kwitansi)</Label>
                                <Input
                                    placeholder="KLR-2024..."
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Keterangan</Label>
                                <Input
                                    placeholder="Alasayan pengeluaran..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="font-body"
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-red-600 hover:bg-red-700 font-body"
                                >
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
                        <CardTitle className="font-display text-lg">Riwayat Stok Keluar</CardTitle>
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
                                        <ArrowUpRight className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="font-body text-muted-foreground">Belum ada data stok keluar</p>
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
                                        <TableCell className="text-right font-bold font-mono text-red-600">
                                            -{m.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {formatCurrency((m as any).products?.price || 0)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono text-red-600">
                                            {formatCurrency(m.quantity * ((m as any).products?.price || 0))}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-none">
                                                Keluar
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
                                    <TableCell className="text-right font-mono text-red-600">
                                        -{filteredMovements.reduce((acc, m) => acc + m.quantity, 0)} unit
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-mono text-red-600">
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
