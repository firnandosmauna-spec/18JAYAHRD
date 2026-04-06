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
import { useProducts, useWarehouses, useStockMovements, useProjectLocations } from '../../hooks/useInventory';
import { usePurchaseInvoices, useSuppliers } from '../../hooks/usePurchase';
import { useToast } from '../ui/use-toast';
import { format } from 'date-fns';
import { paymentMethodService, PaymentMethod } from '../../services/paymentMethodService';
import { PurchaseService } from '../../services/purchaseService';
import { cn } from '../../lib/utils';
import type { Product } from '../../lib/supabase';
import type { PurchaseInvoice, Supplier } from '@/types/purchase';

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
    project_location?: string | null;
    movement_category?: string | null;
    payment_methods?: { id: string, name: string };
}

export function MaterialPurchaseManagement() {
    const { products, refetch: refetchProducts } = useProducts();
    const { warehouses } = useWarehouses();
    const { locations: projectLocations } = useProjectLocations();
    const { movements, loading, addMovement, updateMovement, deleteMovement, refetch } = useStockMovements();
    const { invoices } = usePurchaseInvoices();
    const { suppliers, loading: loadingSuppliers, refetch: refetchSuppliers } = useSuppliers();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

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
        project_location: '',
    });

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

    const stockInMovements = movementsWithBalances.filter(m => m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0));

    const filteredMovements = stockInMovements.filter(m => {
        const productName = (m as any).products?.name || '';
        const supplierName = (m as any).products?.suppliers?.name || '';
        const sku = (m as any).products?.sku || '';
        const reference = (m as any).reference || '';
        const search = searchQuery.toLowerCase();
        
        const matchesSearch = productName.toLowerCase().includes(search) ||
            supplierName.toLowerCase().includes(search) ||
            sku.toLowerCase().includes(search) ||
            reference.toLowerCase().includes(search);

        if (!matchesSearch) return false;

        // Date filter
        if (startDate && new Date(m.created_at) < new Date(startDate)) return false;
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (new Date(m.created_at) > end) return false;
        }

        // Payment method filter
        if (paymentMethodFilter !== 'all') {
            const inv = (invoices as PurchaseInvoice[]).find((i: PurchaseInvoice) => i.id === m.reference);
            let caraBayar = (m as any).payment_methods?.name || '';
            if (!caraBayar) {
                if (inv) {
                    caraBayar = inv.payment_status === 'paid' ? 'Tunai / Cash' : 'Hutang / Tempo';
                } else {
                    caraBayar = m.reference_type === 'manual_entry' ? 'Manual' : '-';
                }
            }
            
            const cbLower = caraBayar.toLowerCase();
            if (paymentMethodFilter === 'cash' && !(cbLower.includes('cash') || cbLower.includes('tunai'))) return false;
            if (paymentMethodFilter === 'hutang' && !(cbLower.includes('hutang') || cbLower.includes('tempo'))) return false;
            if (paymentMethodFilter === 'deposit' && !cbLower.includes('deposit')) return false;
        }

        return true;
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
                payment_method_id: formData.payment_method_id || null,
                project_location: formData.project_location || null
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
                project_location: '',
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
            project_location: movement.project_location || '',
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
                payment_method_id: formData.payment_method_id || null,
                project_location: formData.project_location || null
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

    const selectedProduct = (products as any[]).find(p => p.id === formData.product_id);
    const selectedSupplier = selectedProduct?.suppliers;
    const supplierBalance = suppliers.find(s => s.id === selectedSupplier?.id);

    const isDepositAvailable = (supplierBalance?.deposit_balance || 0) > 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Belanja Material</h2>
                    <p className="text-muted-foreground font-body">Catat penambahan material ke gudang</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetchSuppliers()} className="font-body">
                        Refresh Saldo
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Material
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                                    {selectedSupplier && (
                                        <div className="flex items-center justify-between mt-1 px-1">
                                            <span className="text-[10px] text-muted-foreground">Supplier: {selectedSupplier.name}</span>
                                            {isDepositAvailable && (
                                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                    Saldo Deposit: {formatCurrency(supplierBalance?.deposit_balance || 0)}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
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
                                    <Label className="font-body text-xs">Lokasi Proyek</Label>
                                    <Select
                                        value={formData.project_location}
                                        onValueChange={(val: string) => setFormData({ ...formData, project_location: val })}
                                    >
                                        <SelectTrigger className="font-body h-10">
                                            <SelectValue placeholder="Pilih lokasi proyek" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectLocations.map((l: string) => (
                                                <SelectItem key={l} value={l} className="font-body text-xs cursor-pointer">
                                                    {l}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                            {paymentMethods.map((pm: PaymentMethod) => {
                                                const isDeposit = pm.name.toLowerCase().includes('deposit');
                                                const isReferred = isDeposit && isDepositAvailable;
                                                return (
                                                    <SelectItem key={pm.id} value={pm.id} className="font-body text-xs">
                                                        <div className="flex items-center justify-between w-full gap-4">
                                                            <span>{pm.name}</span>
                                                            {isReferred && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[8px] h-4">Disarankan</Badge>}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    {isDepositAvailable && formData.payment_method_id && !paymentMethods.find(pm => pm.id === formData.payment_method_id)?.name.toLowerCase().includes('deposit') && (
                                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            Supplier memiliki saldo deposit. Disarankan menggunakan metode Deposit.
                                        </p>
                                    )}
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
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Total Deposit Tersedia
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {formatCurrency(suppliers.reduce((acc, s) => acc + (s.deposit_balance || 0), 0))}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">Saldo di seluruh supplier</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/50 border-red-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Total Hutang Belum Dibayar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">
                            {formatCurrency(suppliers.reduce((acc, s) => acc + (s.total_debt || 0), 0))}
                        </div>
                        <p className="text-xs text-red-600 mt-1">Estimasi hutang ke supplier</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Ringkasan Saldo Per Supplier
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[120px] overflow-y-auto px-4">
                        <div className="space-y-2">
                            {suppliers.filter(s => (s.deposit_balance || 0) > 0 || (s.total_debt || 0) > 0).length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-4">Belum ada saldo deposit atau hutang.</p>
                            ) : (
                                suppliers.filter(s => (s.deposit_balance || 0) > 0 || (s.total_debt || 0) > 0).map(s => (
                                    <div key={s.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1">
                                        <span className="font-medium truncate max-w-[150px]">{s.name}</span>
                                        <div className="flex gap-2">
                                            {(s.deposit_balance || 0) > 0 && <span className="text-blue-600">Dep: {formatCurrency(s.deposit_balance || 0)}</span>}
                                            {(s.total_debt || 0) > 0 && <span className="text-red-600">Hut: {formatCurrency(s.total_debt || 0)}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                            <Label className="font-body text-xs">Lokasi Proyek</Label>
                            <Select
                                value={formData.project_location}
                                onValueChange={(val: string) => setFormData({ ...formData, project_location: val })}
                            >
                                <SelectTrigger className="font-body h-10">
                                    <SelectValue placeholder="Ganti lokasi proyek..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectLocations.map((l: string) => (
                                        <SelectItem key={l} value={l} className="font-body text-xs cursor-pointer">
                                            {l}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

            <Card className="border-gray-200">
                <CardHeader>
                    <div className="flex flex-col space-y-4">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Mulai Tanggal</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="h-8 pl-8 text-xs font-body"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Sampai Tanggal</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-8 pl-8 text-xs font-body"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Cara Bayar</Label>
                                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                    <SelectTrigger className="h-8 text-xs font-body">
                                        <SelectValue placeholder="Semua Cara Bayar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">Semua Cara Bayar</SelectItem>
                                        <SelectItem value="cash" className="text-xs">Tunai / Cash</SelectItem>
                                        <SelectItem value="hutang" className="text-xs">Hutang / Tempo</SelectItem>
                                        <SelectItem value="deposit" className="text-xs">Deposit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                        setPaymentMethodFilter('all');
                                        setSearchQuery('');
                                    }}
                                    className="h-8 text-xs w-full flex items-center justify-center gap-2 hover:bg-gray-100"
                                >
                                    <Filter className="w-3 h-3" />
                                    Reset Filter
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-body text-[10px] uppercase">No</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Tanggal</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Supplier</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">No. Ref</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Produk</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-center bg-blue-50/50">Stok Awal</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-center bg-green-50/50">Masuk</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-center bg-red-50/50">Keluar</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-center bg-blue-50/50">Stok Akhir</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-center">Volume</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Satuan</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Kategori</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-right">Harga</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-right">Total Harga</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Cara Bayar</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Lokasi Proyek</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Gudang</TableHead>
                                <TableHead className="font-body text-[10px] uppercase">Keterangan</TableHead>
                                <TableHead className="font-body text-[10px] uppercase text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={19} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                            <span className="font-body text-muted-foreground">Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMovements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={19} className="text-center py-12">
                                        <ArrowDownRight className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="font-body text-muted-foreground">Belum ada data belanja material</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMovements.map((m: any, idx: number) => {
                                    const prod = (m as any).products;
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
                                                {format(new Date(m.created_at), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="font-body text-xs">
                                                {prod?.suppliers?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">
                                                {m.reference || '-'}
                                            </TableCell>
                                            <TableCell className="font-body font-medium text-xs">
                                                {prod?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-center bg-blue-50/30">{(m as any).opening_stock || 0}</TableCell>
                                            <TableCell className="font-mono text-xs text-center text-green-600 bg-green-50/30">
                                                {m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? Math.abs(m.quantity) : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-center text-red-600 bg-red-50/30">
                                                {m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0) ? Math.abs(m.quantity) : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-center font-bold bg-blue-50/30">{(m as any).closing_balance || 0}</TableCell>
                                            <TableCell className="font-body text-xs text-center">
                                                {m.quantity || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-xs text-center">
                                                {prod?.unit || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-[10px]">
                                                <Badge variant="secondary" className="font-normal">
                                                    {(prod as any)?.product_categories?.name || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {formatCurrency(m.unit_price || prod?.cost || 0)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600 font-mono text-xs">
                                                {formatCurrency(m.quantity * (m.unit_price || prod?.cost || 0))}
                                            </TableCell>
                                            <TableCell className="font-body text-[10px]">
                                                <Badge 
                                                    variant="secondary" 
                                                    className="font-normal"
                                                >
                                                    {caraBayar}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-body text-xs">
                                                <Badge variant="outline" className="text-[10px] font-normal bg-gray-50">
                                                    {m.project_location || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-body text-xs">
                                                {m.warehouses?.name || '-'}
                                            </TableCell>
                                            <TableCell className="font-body text-[10px] max-w-[150px] truncate uppercase text-muted-foreground">
                                                {m.notes || '-'}
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
                                <TableRow className="bg-gray-50/50 font-bold border-t-2 border-gray-200">
                                    <TableCell colSpan={13} className="text-right font-display text-gray-900 px-4 py-3">
                                        TOTAL BELANJA
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-green-600 text-sm">
                                        {formatCurrency(filteredMovements.reduce((acc, m) => acc + (m.quantity * (m.unit_price || (m as any).products?.cost || 0)), 0))}
                                    </TableCell>
                                    <TableCell colSpan={5}></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
