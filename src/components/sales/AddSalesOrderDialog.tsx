import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCustomers, useProducts, useSalesOrders } from '@/hooks/useSales';
import { useToast } from '@/components/ui/use-toast';
import { SalesService } from '@/services/salesService';
import type { Customer, Product, SalesOrderItem } from '@/types/sales';

interface AddSalesOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

import { useAuth } from '@/contexts/AuthContext';

export function AddSalesOrderDialog({ open, onOpenChange, onSuccess }: AddSalesOrderDialogProps) {
    const { user } = useAuth();
    const { customers } = useCustomers();
    const { products } = useProducts();
    const { createOrder } = useSalesOrders();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: '',
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        payment_method: 'CASH' as 'CASH' | 'Credit',
        notes: '',
    });

    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open]);

    const resetForm = () => {
        setFormData({
            customer_id: '',
            order_date: new Date().toISOString().split('T')[0],
            delivery_date: '',
            payment_method: 'CASH',
            notes: '',
        });
        setItems([]);
    };

    const handleCustomerChange = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        setFormData(prev => ({
            ...prev,
            customer_id: customerId,
            payment_method: customer?.preferred_payment_method || 'CASH'
        }));
    };

    const addItem = () => {
        setItems([
            ...items,
            {
                product_id: '',
                quantity: 1,
                unit_price: 0,
                discount_percentage: 0,
                line_total: 0,
            },
        ]);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            item.unit_price = product?.selling_price || 0;
        }

        item.line_total = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
        newItems[index] = item;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.line_total, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customer_id || items.length === 0) {
            toast({
                title: 'Error',
                description: 'Pilih pelanggan dan setidaknya satu produk',
                variant: 'destructive',
            });
            return;
        }

        try {
            setIsSubmitting(true);
            const orderNumber = SalesService.generateOrderNumber();
            const subtotal = calculateTotal();

            await createOrder({
                order_number: orderNumber,
                customer_id: formData.customer_id,
                order_date: formData.order_date,
                delivery_date: formData.delivery_date || undefined,
                status: 'confirmed',
                subtotal,
                tax_amount: 0,
                discount_amount: 0,
                total_amount: subtotal,
                payment_method: formData.payment_method,
                notes: formData.notes,
                created_by: user?.id || null,
            }, items);

            toast({
                title: 'Berhasil',
                description: 'Pesanan penjualan berhasil dibuat',
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal membuat pesanan',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        Buat Pesanan Penjualan
                    </DialogTitle>
                    <DialogDescription>
                        Lengkapi detail pesanan di bawah ini.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Pelanggan *</Label>
                            <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih pelanggan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Metode Pembayaran</Label>
                            <Select
                                value={formData.payment_method}
                                onValueChange={(val: any) => setFormData({ ...formData, payment_method: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih metode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">CASH</SelectItem>
                                    <SelectItem value="Credit">Credit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Tanggal Pesanan</Label>
                            <Input
                                type="date"
                                value={formData.order_date}
                                onChange={e => setFormData({ ...formData, order_date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tanggal Pengiriman</Label>
                            <Input
                                type="date"
                                value={formData.delivery_date}
                                onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-lg font-bold">Produk</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Produk
                            </Button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                                <div className="col-span-4 grid gap-1">
                                    <Label className="text-xs">Produk</Label>
                                    <Select
                                        value={item.product_id}
                                        onValueChange={val => updateItem(index, 'product_id', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Produk" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 grid gap-1">
                                    <Label className="text-xs">Jumlah</Label>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-3 grid gap-1">
                                    <Label className="text-xs">Harga</Label>
                                    <Input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 grid gap-1 text-right">
                                    <Label className="text-xs">Total</Label>
                                    <div className="py-2 font-mono text-sm">
                                        {new Intl.NumberFormat('id-ID').format(item.line_total)}
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500"
                                        onClick={() => removeItem(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 font-bold uppercase">Total Akhir</div>
                        <div className="text-2xl font-bold text-blue-600">
                            IDR {new Intl.NumberFormat('id-ID').format(calculateTotal())}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Catatan</Label>
                        <Input
                            placeholder="Catatan tambahan..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting || items.length === 0}>
                            {isSubmitting ? 'Menyimpan...' : 'Buat Pesanan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
