import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useProductCategories, useWarehouses, useInventoryUnits, useInventoryVolumes, useProjectLocations } from '@/hooks/useInventory';
import { useSuppliers } from '@/hooks/usePurchase';
import { useToast } from '@/components/ui/use-toast';
import { productService } from '@/services/inventoryService';

interface AddProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    existingProduct?: any; // For edit mode later
}

export function AddProductDialog({ open, onOpenChange, onSuccess, existingProduct }: AddProductDialogProps) {
    const { categories } = useProductCategories();
    const { warehouses } = useWarehouses();
    const { units } = useInventoryUnits();
    const { volumes } = useInventoryVolumes();
    const { locations } = useProjectLocations();
    const { suppliers } = useSuppliers();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category_id: '',
        stock: '',
        min_stock: '',
        price: '',
        unit: '',
        warehouse_id: '',
        cost: '',
        description: '',
        barcode: '',
        volume: '',
        project_location: '',
        purchase_payment_method: 'CASH',
        supplier_id: '',
    });

    useEffect(() => {
        if (existingProduct) {
            setFormData({
                name: existingProduct.name || '',
                sku: existingProduct.sku || '',
                category_id: existingProduct.category_id || '',
                stock: existingProduct.stock?.toString() || '',
                min_stock: existingProduct.min_stock?.toString() || '',
                price: existingProduct.price?.toString() || '',
                unit: existingProduct.unit || '',
                warehouse_id: existingProduct.warehouse_id || '',
                cost: existingProduct.cost?.toString() || '',
                description: existingProduct.description || '',
                barcode: existingProduct.barcode || '',
                volume: existingProduct.volume || '',
                project_location: existingProduct.project_location || '',
                purchase_payment_method: existingProduct.purchase_payment_method || 'CASH',
                supplier_id: existingProduct.supplier_id || '',
            });
        } else {
            resetForm();
        }
    }, [existingProduct, open]);

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            category_id: '',
            stock: '',
            min_stock: '',
            price: '',
            unit: '',
            warehouse_id: '',
            cost: '',
            description: '',
            barcode: '',
            volume: '',
            project_location: '',
            purchase_payment_method: 'CASH',
            supplier_id: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            // Auto-generate SKU if empty
            let finalSku = formData.sku.trim().toUpperCase();
            if (!finalSku) {
                const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                finalSku = `PRD-${date}-${random}`;
            }

            const payload: any = {
                name: formData.name.trim() || 'Produk Tanpa Nama',
                sku: finalSku,
                stock: formData.stock ? parseFloat(formData.stock) : 0,
                min_stock: formData.min_stock ? parseFloat(formData.min_stock) : 0,
                price: formData.price ? parseFloat(formData.price) : 0,
                cost: formData.cost ? parseFloat(formData.cost) : 0,
                unit: formData.unit || 'Unit',
                category_id: formData.category_id || null,
                warehouse_id: formData.warehouse_id || null,
                description: formData.description.trim() || null,
                barcode: formData.barcode.trim() || null,
                volume: formData.volume || null,
                project_location: formData.project_location || null,
                purchase_payment_method: formData.purchase_payment_method,
                status: 'active'
            };

            if (existingProduct) {
                await productService.update(existingProduct.id, payload);
                toast({ title: 'Berhasil', description: 'Produk berhasil diperbarui' });
            } else {
                await productService.create(payload);
                toast({ title: 'Berhasil', description: 'Produk berhasil ditambahkan' });
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            console.error('Save product error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Gagal menyimpan produk',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        {existingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                    </DialogTitle>
                    <DialogDescription className="font-body">
                        Lengkapi informasi detail produk di bawah ini
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="font-body">Nama Produk</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="font-body"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="sku" className="font-body">SKU</Label>
                            <Input
                                id="sku"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                className="font-mono"
                                placeholder="Auto-generate jika kosong"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category" className="font-body">Kategori</Label>
                            <Select
                                value={formData.category_id}
                                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                            >
                                <SelectTrigger className="font-body">
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="font-body">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="stock" className="font-body">Stok Awal</Label>
                            <Input
                                id="stock"
                                type="number"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="font-mono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="minStock" className="font-body">Min. Stok</Label>
                            <Input
                                id="minStock"
                                type="number"
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                className="font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price" className="font-body">Harga Jual</Label>
                            <Input
                                id="price"
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="font-mono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="unit" className="font-body">Satuan</Label>
                            <Select
                                value={formData.unit}
                                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                            >
                                <SelectTrigger className="font-body">
                                    <SelectValue placeholder="Pilih satuan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((unit) => (
                                        <SelectItem key={unit} value={unit} className="font-body">
                                            {unit}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="warehouse" className="font-body">Gudang</Label>
                            <Select
                                value={formData.warehouse_id}
                                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                            >
                                <SelectTrigger className="font-body">
                                    <SelectValue placeholder="Pilih gudang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id} className="font-body">
                                            {wh.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cost" className="font-body">Harga Beli</Label>
                            <Input
                                id="cost"
                                type="number"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="payment_method" className="font-body">Metode Pembayaran (Beli)</Label>
                            <Select
                                value={formData.purchase_payment_method}
                                onValueChange={(value) => setFormData({ ...formData, purchase_payment_method: value as 'CASH' | 'Hutang' })}
                            >
                                <SelectTrigger className="font-body">
                                    <SelectValue placeholder="Pilih metode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH" className="font-body">CASH</SelectItem>
                                    <SelectItem value="Hutang" className="font-body">Hutang</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="barcode" className="font-body">Barcode</Label>
                            <Input
                                id="barcode"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="volume" className="font-body">Volume</Label>
                            <Select
                                value={formData.volume}
                                onValueChange={(value) => setFormData({ ...formData, volume: value })}
                            >
                                <SelectTrigger className="font-body">
                                    <SelectValue placeholder="Pilih volume" />
                                </SelectTrigger>
                                <SelectContent>
                                    {volumes.map((v) => (
                                        <SelectItem key={v} value={v} className="font-body">
                                            {v}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="font-body">Lokasi Proyek</Label>
                            <Select
                                value={formData.project_location}
                                onValueChange={(value) => setFormData({ ...formData, project_location: value })}
                            >
                                <SelectTrigger className="font-body">
                                    <SelectValue placeholder="Pilih lokasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((l) => (
                                        <SelectItem key={l} value={l} className="font-body">
                                            {l}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="supplier" className="font-body">Supplier</Label>
                        <Select
                            value={formData.supplier_id}
                            onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                        >
                            <SelectTrigger className="font-body">
                                <SelectValue placeholder="Pilih supplier (opsional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="font-body">
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="font-body">Keterangan</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="font-body"
                            placeholder="Tambahkan keterangan tambahan..."
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="font-body"
                            disabled={isSubmitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            className="bg-inventory hover:bg-inventory-dark font-body"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Menyimpan...' : (existingProduct ? 'Perbarui' : 'Simpan')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
