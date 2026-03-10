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
import { useProducts, useWarehouses } from '@/hooks/useInventory';
import { stockMovementService } from '@/services/inventoryService';
import { useToast } from '@/components/ui/use-toast';
import type { Product } from '@/lib/supabase';

interface AddStockMovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    product?: Product | null;
}

export function AddStockMovementDialog({
    open,
    onOpenChange,
    onSuccess,
    product
}: AddStockMovementDialogProps) {
    const { warehouses } = useWarehouses();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        quantity: '',
        warehouse_id: '',
        reference: '',
        notes: '',
    });

    useEffect(() => {
        if (open) {
            setFormData({
                quantity: '',
                warehouse_id: product?.warehouse_id || '',
                reference: '',
                notes: '',
            });
        }
    }, [open, product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !formData.quantity) return;

        try {
            setIsSubmitting(true);
            await stockMovementService.create({
                product_id: product.id,
                warehouse_id: formData.warehouse_id || null,
                quantity: parseFloat(formData.quantity),
                movement_type: 'in',
                reference: formData.reference.trim() || null,
                notes: formData.notes.trim() || null,
                reference_type: 'manual_entry'
            });

            toast({
                title: 'Berhasil',
                description: `Stok ${product.name} telah ditambahkan`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Gagal',
                description: error.message || 'Gagal menambah stok',
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
                    <DialogTitle className="font-display">Tambah Stok</DialogTitle>
                    <DialogDescription className="font-body">
                        {product ? `Menambah stok untuk ${product.name}` : 'Masukkan detail penambahan stok'}
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
                            placeholder="MSK-..."
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            className="font-mono"
                        />
                    </div>

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
                            className="bg-inventory hover:bg-inventory-dark font-body"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Stok'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
