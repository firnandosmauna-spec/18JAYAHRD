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
import {
    useProducts,
    useWarehouses,
    useStockMovements,
    useProjectLocations
} from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function StockOutManagement() {
    const { products, refetch: refetchProducts } = useProducts();
    const { warehouses } = useWarehouses();
    const { movements, loading, addMovement, updateMovement, deleteMovement, refetch } = useStockMovements();
    const { locations } = useProjectLocations();
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
        notes: '',
        unit_price: '',
        project_location: '',
        movement_category: 'Keluar',
    });

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const currentStock = selectedProduct ? selectedProduct.stock : 0;
    const isOverstock = formData.quantity ? parseFloat(formData.quantity) > currentStock : false;

    // Calculate running balances per product
    const calculateBalances = () => {
        // Sort all movements by created_at ascending to calculate running balance correctly
        const sortedAllMovements = [...movements].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const productBalances: Record<string, number> = {};

        return sortedAllMovements.map(m => {
            const pid = m.product_id;
            const prevBalance = productBalances[pid] || 0;
            let currentBalance = prevBalance;

            if (m.movement_type === 'in' || m.movement_type === 'adjustment') {
                currentBalance += m.quantity;
            } else if (m.movement_type === 'out') {
                currentBalance -= Math.abs(m.quantity);
            }

            productBalances[pid] = currentBalance;

            return {
                ...m,
                opening_stock: prevBalance,
                closing_balance: currentBalance
            };
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const movementsWithBalances = calculateBalances();

    const filteredMovements = movementsWithBalances.filter(m => {
        const productName = (m as any).products?.name || '';
        const sku = (m as any).products?.sku || '';
        const reference = m.reference || '';
        const search = searchQuery.toLowerCase();

        if (searchQuery) {
            return productName.toLowerCase().includes(search) ||
                sku.toLowerCase().includes(search) ||
                reference.toLowerCase().includes(search);
        }
        return true;
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.product_id || !formData.quantity) return;

        /* 
        Removed strict blocking of overstock to allow forced recording
        if (isOverstock) {
            toast({
                title: 'Error',
                description: 'Jumlah stok keluar melebihi stok yang tersedia',
                variant: 'destructive'
            });
            return;
        }
        */

        try {
            setIsSubmitting(true);
            await addMovement({
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                movement_type: 'out',
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                unit_price: parseFloat(formData.unit_price) || 0,
                project_location: formData.project_location || null,
                movement_category: formData.movement_category || 'Keluar',
                reference_type: 'manual_entry'
            });

            toast({ title: 'Berhasil', description: 'Ending material masuk dan keluar berhasil dicatat' });
            setShowAddDialog(false);
            setFormData({
                product_id: '',
                warehouse_id: '',
                quantity: '',
                reference: '',
                notes: '',
                unit_price: '',
                project_location: '',
                movement_category: 'Keluar',
            });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal mencatat ending material masuk dan keluar',
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
            quantity: Math.abs(movement.quantity).toString(),
            reference: movement.reference || '',
            notes: movement.notes || '',
            unit_price: movement.unit_price ? movement.unit_price.toString() : '',
            project_location: movement.project_location || '',
            movement_category: movement.movement_category || 'Keluar',
        });
        setShowEditDialog(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMovement || !formData.product_id || !formData.quantity) return;

        /*
        Removed strict blocking of overstock to allow forced recording
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
        */

        try {
            setIsSubmitting(true);
            await updateMovement(editingMovement.id, {
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                unit_price: parseFloat(formData.unit_price) || 0,
                project_location: formData.project_location || null,
                movement_category: formData.movement_category || 'Keluar',
            });

            toast({ title: 'Berhasil', description: 'Ending material masuk dan keluar berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingMovement(null);
            setFormData({
                product_id: '',
                warehouse_id: '',
                quantity: '',
                reference: '',
                notes: '',
                unit_price: '',
                project_location: '',
                movement_category: 'Keluar',
            });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui ending material masuk dan keluar',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data ending material masuk dan keluar ini? Stok barang akan disesuaikan kembali.')) return;

        try {
            await deleteMovement(id);
            toast({ title: 'Berhasil', description: 'Data ending material masuk dan keluar berhasil dihapus' });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menghapus data ending material masuk dan keluar',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Ending material masuk dan keluar</h2>
                    <p className="text-muted-foreground font-body">Catat pengeluaran material dari gudang</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Plus className="w-4 h-4 mr-2" />
                            Catat Ending material masuk dan keluar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Catat Ending material masuk dan keluar</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan detail pengeluaran material
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="font-body">Pilih Produk *</Label>
                                <Select
                                    value={formData.product_id}
                                    onValueChange={(val) => {
                                        const p = products.find(prod => prod.id === val);
                                        setFormData({
                                            ...formData,
                                            product_id: val,
                                            unit_price: p?.price?.toString() || ''
                                        });
                                    }}
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
                                <Label className="font-body text-xs">Harga Satuan (IDR) *</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                    required
                                    className="font-mono"
                                />
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Lokasi Proyek</Label>
                                    <Select
                                        value={formData.project_location}
                                        onValueChange={(val) => setFormData({ ...formData, project_location: val })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih lokasi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((loc) => (
                                                <SelectItem key={loc} value={loc} className="font-body">
                                                    {loc}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Kategori *</Label>
                                    <Select
                                        value={formData.movement_category}
                                        onValueChange={(val) => setFormData({ ...formData, movement_category: val })}
                                        required
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Keluar">Keluar (Penjualan/Lainnya)</SelectItem>
                                            <SelectItem value="Pemakaian">Pemakaian (Internal Proyek)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                    disabled={isSubmitting}
                                    className="bg-red-600 hover:bg-red-700 font-body"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Catat Ending material masuk dan keluar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Edit Ending material masuk dan keluar</DialogTitle>
                            <DialogDescription className="font-body">
                                Perbarui detail pengeluaran material
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
                                <div className="flex justify-between">
                                    <Label className="font-body text-xs">Harga Satuan (IDR) *</Label>
                                    <span className="text-[10px] text-muted-foreground font-body">
                                        {selectedProduct ? `Ref Beli: ${formatCurrency(selectedProduct.cost)} / Jual: ${formatCurrency(selectedProduct.price)}` : ''}
                                    </span>
                                </div>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                    required
                                    className="font-mono"
                                />
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Lokasi Proyek</Label>
                                    <Select
                                        value={formData.project_location}
                                        onValueChange={(val) => setFormData({ ...formData, project_location: val })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih lokasi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((loc) => (
                                                <SelectItem key={loc} value={loc} className="font-body">
                                                    {loc}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Kategori *</Label>
                                    <Select
                                        value={formData.movement_category}
                                        onValueChange={(val) => setFormData({ ...formData, movement_category: val })}
                                        required
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Keluar">Keluar (Penjualan/Lainnya)</SelectItem>
                                            <SelectItem value="Pemakaian">Pemakaian (Internal Proyek)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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
                        <CardTitle className="font-display text-lg">Riwayat Ending material masuk dan keluar</CardTitle>
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
                                <TableHead className="font-body">No</TableHead>
                                <TableHead className="font-body">Tanggal</TableHead>
                                <TableHead className="font-body">Produk</TableHead>
                                <TableHead className="font-body">Stok Awal</TableHead>
                                <TableHead className="font-body text-inventory">Masuk</TableHead>
                                <TableHead className="font-body text-red-600">Keluar</TableHead>
                                <TableHead className="font-body text-orange-600">Pemakaian</TableHead>
                                <TableHead className="font-body">Lokasi Proyek</TableHead>
                                <TableHead className="font-body">Gudang</TableHead>
                                <TableHead className="font-body">Saldo Stok Akhir</TableHead>
                                <TableHead className="font-body">Keterangan</TableHead>
                                <TableHead className="font-body">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                            <span className="font-body text-muted-foreground">Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMovements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-12">
                                        <ArrowUpRight className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="font-body text-muted-foreground">Belum ada data ending material masuk dan keluar</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMovements.map((m, index) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-body text-xs text-muted-foreground">{index + 1}</TableCell>
                                        <TableCell className="font-body whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                {new Date(m.created_at).toLocaleDateString('id-ID')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold font-body text-xs text-[#1C1C1E]">{(m as any).products?.name || '-'}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">{(m as any).products?.sku || '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{(m as any).opening_stock || 0}</TableCell>
                                        <TableCell className="font-mono text-xs text-inventory font-bold">
                                            {m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? `+${m.quantity}` : '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-red-600 font-bold">
                                            {m.movement_type === 'out' && (m.movement_category === 'Keluar' || !m.movement_category) ? `-${Math.abs(m.quantity)}` : '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-orange-600 font-bold">
                                            {m.movement_type === 'out' && m.movement_category === 'Pemakaian' ? `-${Math.abs(m.quantity)}` : '-'}
                                        </TableCell>
                                        <TableCell className="font-body text-xs">
                                            {m.project_location || '-'}
                                        </TableCell>
                                        <TableCell className="font-body text-xs">
                                            {(m as any).warehouses?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold">{(m as any).closing_balance || 0}</TableCell>
                                        <TableCell className="font-body text-xs max-w-[150px] truncate">
                                            {m.notes || '-'}
                                        </TableCell>
                                        <TableCell>
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
                                    <TableCell colSpan={4} className="font-display text-gray-900 px-4 py-4">
                                        TOTAL
                                    </TableCell>
                                    <TableCell className="font-mono text-red-600">
                                        -{filteredMovements.reduce((acc, m) => acc + m.quantity, 0)} unit
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="font-mono text-inventory">
                                        {formatCurrency(filteredMovements.reduce((acc, m) => acc + (m.quantity * (m.unit_price || (m as any).products?.price || 0)), 0))}
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
