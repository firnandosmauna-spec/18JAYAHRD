import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useProducts, useWarehouses, useProjectLocations } from '@/hooks/useInventory';
import { stockMovementService } from '@/services/inventoryService';
import { useToast } from '@/components/ui/use-toast';
import type { Product } from '@/lib/supabase';

interface AddStockMovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    product?: Product | null;
    mode?: 'in' | 'out';
}

export function AddStockMovementDialog({
    open,
    onOpenChange,
    onSuccess,
    product,
    mode = 'in'
}: AddStockMovementDialogProps) {
    const { warehouses } = useWarehouses();
    const { locations } = useProjectLocations();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        quantity: '',
        warehouse_id: '',
        reference: '',
        notes: '',
        unit_price: '',
        project_location: '',
        movement_category: 'Keluar',
    });

    useEffect(() => {
        if (open) {
            setFormData({
                quantity: '',
                warehouse_id: product?.warehouse_id || '',
                reference: '',
                notes: '',
                unit_price: (mode === 'in' ? product?.cost : product?.price)?.toString() || '',
                project_location: '',
                movement_category: 'Keluar',
            });
        }
    }, [open, product, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !formData.quantity) return;

        try {
            setIsSubmitting(true);
            await stockMovementService.create({
                product_id: product.id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                movement_type: mode,
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                unit_price: parseFloat(formData.unit_price) || 0,
                project_location: formData.project_location || null,
                movement_category: mode === 'out' ? formData.movement_category : null,
                reference_type: 'manual_entry'
            });

            toast({
                title: 'Berhasil',
                description: `Stok ${product.name} telah di${mode === 'in' ? 'tambah' : 'kurang'}kan`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Gagal',
                description: error.message || `Gagal ${mode === 'in' ? 'menambah' : 'mengeluarkan'} stok`,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        {mode === 'in' ? 'Tambah Stok (Masuk)' : 'Catat Stok Keluar'}
                    </DialogTitle>
                    <DialogDescription className="font-body">
                        {product
                            ? `${mode === 'in' ? 'Menambah' : 'Mengeluarkan'} stok untuk ${product.name}`
                            : `Masukkan detail ${mode === 'in' ? 'penambahan' : 'pengeluaran'} stok`}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="quantity" className="font-body">Jumlah *</Label>
                        <Input
                            id="quantity"
                            type="number"
                            placeholder="0"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                            className="font-mono"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="unit_price" className="font-body">Harga Satuan (IDR) *</Label>
                        <Input
                            id="unit_price"
                            type="number"
                            placeholder="0"
                            value={formData.unit_price}
                            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                            required
                            className="font-mono"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="warehouse" className="font-body">Gudang</Label>
                        <Select
                            value={formData.warehouse_id}
                            onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                        >
                            <SelectTrigger id="warehouse" className="font-body">
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

                    <div className="grid gap-2">
                        <Label htmlFor="reference" className="font-body">Referensi (No. PO/SJ)</Label>
                        <Input
                            id="reference"
                            placeholder={mode === 'in' ? 'MSK-...' : 'KLR-...'}
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            className="font-mono"
                        />
                    </div>

                    {mode === 'out' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="font-body">Lokasi Proyek</Label>
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
                            <div className="grid gap-2">
                                <Label className="font-body">Kategori *</Label>
                                <Select
                                    value={formData.movement_category}
                                    onValueChange={(val) => setFormData({ ...formData, movement_category: val })}
                                    required
                                >
                                    <SelectTrigger className="font-body">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Keluar">Keluar</SelectItem>
                                        <SelectItem value="Pemakaian">Pemakaian</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="notes" className="font-body">Keterangan</Label>
                        <Input
                            id="notes"
                            placeholder="Catatan tambahan..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="font-body"
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="font-body"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={`${mode === 'in' ? 'bg-inventory hover:bg-inventory-dark' : 'bg-red-600 hover:bg-red-700'} font-body`}
                        >
                            {isSubmitting ? 'Menyimpan...' : (mode === 'in' ? 'Simpan Stok' : 'Catat Keluar')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
