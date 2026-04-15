import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';
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
import { useCustomers, useProducts, useSalesInvoices, useSalesOrders } from '@/hooks/useSales';
import { useToast } from '@/components/ui/use-toast';
import { SalesService } from '@/services/salesService';
import type { Customer, Product, SalesInvoiceItem } from '@/types/sales';

interface AddSalesInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

import { useAuth } from '@/contexts/AuthContext';

export function AddSalesInvoiceDialog({ open, onOpenChange, onSuccess }: AddSalesInvoiceDialogProps) {
    const { user } = useAuth();
    const { customers } = useCustomers();
    const { products } = useProducts();
    const { orders } = useSalesOrders();
    const { createInvoice } = useSalesInvoices();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: '',
        sales_order_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
            sales_order_id: '',
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
            payment_method: customer?.preferred_payment_method || 'CASH',
            due_date: new Date(Date.now() + (customer?.payment_terms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
    };

    const handleOrderChange = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setFormData(prev => ({
                ...prev,
                sales_order_id: orderId,
                customer_id: order.customer_id,
                payment_method: order.payment_method || prev.payment_method,
            }));

            if (order.items) {
                setItems(order.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percentage: item.discount_percentage,
                    line_total: item.line_total,
                })));
            }
        }
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
            const invoiceNumber = SalesService.generateInvoiceNumber();
            const totalAmount = calculateTotal();

            await createInvoice({
                invoice_number: invoiceNumber,
                sales_order_id: formData.sales_order_id || undefined,
                customer_id: formData.customer_id,
                invoice_date: formData.invoice_date,
                due_date: formData.due_date,
                status: 'draft',
                subtotal: totalAmount,
                tax_amount: 0,
                discount_amount: 0,
                total_amount: totalAmount,
                paid_amount: 0,
                payment_status: 'unpaid',
                payment_method: formData.payment_method,
                notes: formData.notes,
                created_by: user?.id || null,
            }, items);

            toast({
                title: 'Berhasil',
                description: 'Invoice penjualan berhasil dibuat',
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal membuat invoice',
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
                        <Receipt className="w-5 h-5 text-purple-600" />
                        Buat Invoice Penjualan
                    </DialogTitle>
                    <DialogDescription>
                        Lengkapi detail invoice di bawah ini.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Pilih Pesanan (Opsional)</Label>
                            <Select value={formData.sales_order_id} onValueChange={handleOrderChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih dari pesanan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tanpa Pesanan</SelectItem>
                                    {orders.filter(o => o.status === 'confirmed').map(o => (
                                        <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
                        <div className="grid gap-2">
                            <Label>Tanggal Invoice</Label>
                            <Input
                                type="date"
                                value={formData.invoice_date}
                                onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tanggal Jatuh Tempo</Label>
                            <Input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-lg font-bold">Item Invoice</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Item
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
                        <div className="text-sm text-gray-600 font-bold uppercase">Total Tagihan</div>
                        <div className="text-2xl font-bold text-purple-600">
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
                            {isSubmitting ? 'Menyimpan...' : 'Buat Invoice'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
