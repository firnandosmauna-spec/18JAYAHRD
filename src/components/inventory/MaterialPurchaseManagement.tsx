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
    MoreVertical,
    TrendingUp,
    Filter
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
import { useProducts, useWarehouses, useStockMovements } from '../../hooks/useInventory';
import { usePurchaseInvoices } from '../../hooks/usePurchase';
import { useToast } from '../ui/use-toast';
import { paymentMethodService, PaymentMethod } from '../../services/paymentMethodService';
import { cn } from '../../lib/utils';
import type { Product } from '../../lib/supabase';
import type { PurchaseInvoice } from '@/types/purchase';

interface StockMovement {
    id: string;
    product_id: string;
    warehouse_id: string | null;
    quantity: number;
    movement_type: string;
    reference: string | null;
    notes: string | null;
    unit_price: number;
    created_at: string;
    reference_type?: string;
    payment_method_id?: string | null;
    products?: any;
    warehouses?: any;
    payment_methods?: any;
}

export function MaterialPurchaseManagement() {
    const { products, refetch: refetchProducts } = useProducts();
    const { warehouses } = useWarehouses();
    const { movements, loading, addMovement, updateMovement, deleteMovement, refetch } = useStockMovements();
    const { invoices } = usePurchaseInvoices();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    React.useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const data = await paymentMethodService.getActive();
                setPaymentMethods(data);
                if (data.length > 0 && !formData.payment_method_id) {
                    setFormData(prev => ({ ...prev, payment_method_id: data[0].id }));
                }
            } catch (error) {
                console.error('Error fetching payment methods:', error);
            }
        };
        fetchPaymentMethods();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        warehouse_id: '',
        reference: '',
        notes: '',
        unit_price: '',
        payment_method_id: '',
    });

    const stockInMovements = (movements as StockMovement[]).filter(m => m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0));

    const filteredMovements = stockInMovements.filter(m => {
        const productName = m.products?.name || '';
        const sku = m.products?.sku || '';
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
                unit_price: parseFloat(formData.unit_price) || 0,
                reference_type: 'manual_entry',
                payment_method_id: formData.payment_method_id || null
            });

            toast({ title: 'Berhasil', description: 'Stok masuk berhasil dicatat' });
            setShowAddDialog(false);
            setFormData({
                product_id: '',
                warehouse_id: '',
                quantity: '',
                reference: '',
                notes: '',
                unit_price: '',
                payment_method_id: paymentMethods[0]?.id || '',
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

    const handleEdit = (movement: StockMovement) => {
        setEditingMovement(movement);
        setFormData({
            product_id: movement.product_id,
            warehouse_id: movement.warehouse_id || '',
            quantity: movement.quantity.toString(),
            reference: movement.reference || '',
            notes: movement.notes || '',
            unit_price: movement.unit_price.toString(),
            payment_method_id: movement.payment_method_id || '',
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
                notes: formData.notes.trim() || null,
                unit_price: parseFloat(formData.unit_price) || 0,
                payment_method_id: formData.payment_method_id || null
            });

            toast({ title: 'Berhasil', description: 'Belanja material berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingMovement(null);
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui belanja material',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data belanja material ini? Stok barang akan disesuaikan kembali.')) return;

        try {
            await deleteMovement(id);
            toast({ title: 'Berhasil', description: 'Data belanja material berhasil dihapus' });
            refetch();
            refetchProducts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menghapus data belanja material',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Belanja Material</h2>
                    <p className="text-muted-foreground font-body">Catat penambahan material ke gudang</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Catat Belanja Material</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan detail penerimaan material
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="font-body">Pilih Produk *</Label>
                                <Select
                                    value={formData.product_id}
                                    onValueChange={(val: string) => {
                                        const p = (products as any[]).find((prod: any) => prod.id === val);
                                        setFormData({
                                            ...formData,
                                            product_id: val,
                                            unit_price: p?.cost?.toString() || ''
                                        });
                                    }}
                                    required
                                >
                                    <SelectTrigger className="font-body">
                                        <SelectValue placeholder="Cari produk..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(products as any[]).map((p: any) => (
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Gudang</Label>
                                    <Select
                                        value={formData.warehouse_id}
                                        onValueChange={(val: string) => setFormData({ ...formData, warehouse_id: val })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih gudang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(warehouses as any[]).map((w: any) => (
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unit_price: e.target.value })}
                                    required
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">No. Referensi (PO/Surat Jalan)</Label>
                                <Input
                                    placeholder="MSK-2024..."
                                    value={formData.reference}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reference: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Cara Pembayaran</Label>
                                <Select
                                    value={formData.payment_method_id}
                                    onValueChange={(val: string) => setFormData({ ...formData, payment_method_id: val })}
                                >
                                    <SelectTrigger className="font-body text-xs h-9">
                                        <SelectValue placeholder="Pilih Cara Bayar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((pm: PaymentMethod) => (
                                            <SelectItem key={pm.id} value={pm.id} className="font-body text-xs">
                                                {pm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Keterangan</Label>
                                <Input
                                    placeholder="Tambahkan catatan..."
                                    value={formData.notes}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, notes: e.target.value })}
                                    className="font-body"
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 font-body">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Material'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">Edit Belanja Material</DialogTitle>
                            <DialogDescription className="font-body">
                                Perbarui detail penerimaan material
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="font-body">Produk</Label>
                                <Select
                                    value={formData.product_id}
                                    onValueChange={(val: string) => setFormData({ ...formData, product_id: val })}
                                    disabled
                                >
                                    <SelectTrigger className="font-body opacity-50">
                                        <SelectValue placeholder="Produk..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(products as any[]).map((p: any) => (
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, quantity: e.target.value })}
                                        required
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-body text-xs">Gudang</Label>
                                    <Select
                                        value={formData.warehouse_id}
                                        onValueChange={(val: string) => setFormData({ ...formData, warehouse_id: val })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih gudang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(warehouses as any[]).map((w: any) => (
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reference: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Cara Pembayaran</Label>
                                <Select
                                    value={formData.payment_method_id}
                                    onValueChange={(val: string) => setFormData({ ...formData, payment_method_id: val })}
                                >
                                    <SelectTrigger className="font-body text-xs h-9">
                                        <SelectValue placeholder="Pilih Cara Bayar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((pm: PaymentMethod) => (
                                            <SelectItem key={pm.id} value={pm.id} className="font-body text-xs">
                                                {pm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-body text-xs">Keterangan</Label>
                                <Input
                                    placeholder="Tambahkan catatan..."
                                    value={formData.notes}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, notes: e.target.value })}
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
                        <CardTitle className="font-display text-lg">Riwayat Belanja Material</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari riwayat..."
                                value={searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                className="pl-10 font-body"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-body text-[10px] uppercase">No</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Tanggal</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Produk</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">SKU</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Kategori</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Volume</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Satuan</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-right">Harga Beli</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-right">Total Harga</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Gudang</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Supplier</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Cara Bayar</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                            <span className="font-body text-muted-foreground">Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMovements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-12">
                                        <ArrowDownRight className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="font-body text-muted-foreground">Belum ada data belanja material</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMovements.map((m: StockMovement, idx: number) => {
                                    const prod = m.products;
                                    const inv = (invoices as PurchaseInvoice[]).find((i: PurchaseInvoice) => i.id === m.reference);

                                    // Priority: 1. Linked payment method, 2. Invoice status, 3. Reference type
                                    let caraBayar = m.payment_methods?.name;

                                    if (!caraBayar) {
                                        if (inv) {
                                            caraBayar = inv.payment_status === 'paid' ? 'Tunai / Cash' : 'Hutang / Tempo';
                                        } else {
                                            caraBayar = m.reference_type === 'manual_entry' ? 'Manual' : '-';
                                        }
                                    }

                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                                            <TableCell className="font-body whitespace-nowrap text-xs">
                                                {new Date(m.created_at).toLocaleDateString('id-ID')}
                                            </TableCell>
                                            <TableCell className="font-body font-medium text-xs">
                                                {prod?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px]">
                                                {prod?.sku || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-xs">
                                                {prod?.product_categories?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-xs text-center">
                                                {prod?.volume || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-xs text-center">
                                                {prod?.unit || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {formatCurrency(m.unit_price || prod?.cost || 0)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600 font-mono text-xs">
                                                {formatCurrency(m.quantity * (m.unit_price || prod?.cost || 0))}
                                            </TableCell>
                                            <TableCell className="font-body text-xs">
                                                {m.warehouses?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-xs">
                                                {prod?.suppliers?.name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-body",
                                                        caraBayar?.toLowerCase().includes('cash') || caraBayar?.toLowerCase().includes('tunai') ? "text-green-600 bg-green-50" :
                                                            caraBayar?.toLowerCase().includes('hutang') || caraBayar?.toLowerCase().includes('tempo') ? "text-orange-600 bg-orange-50" : "text-gray-600 bg-gray-50"
                                                    )}
                                                >
                                                    {caraBayar}
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
                                    );
                                })
                            )}
                            {filteredMovements.length > 0 && (
                                <TableRow className="bg-gray-50/50 font-bold">
                                    <TableCell colSpan={8} className="text-right font-display text-gray-900 px-4 py-3">
                                        TOTAL
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600">
                                        {formatCurrency(filteredMovements.reduce((acc, m) => acc + (m.quantity * (m.unit_price || (m as any).products?.cost || 0)), 0))}
                                    </TableCell>
                                    <TableCell colSpan={4}></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
