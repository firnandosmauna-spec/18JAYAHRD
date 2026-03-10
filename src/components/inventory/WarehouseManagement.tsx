import React, { useState } from 'react';
import {
    Warehouse,
    Plus,
    Search,
    Edit,
    Trash2,
    MapPin,
    Capacity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useWarehouses } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function WarehouseManagement() {
    const { warehouses, loading, addWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        description: '',
        capacity: 0,
        status: 'active' as 'active' | 'inactive' | 'maintenance'
    });

    const filteredWarehouses = warehouses.filter(wh =>
        wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wh.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wh.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingWarehouse) {
                await updateWarehouse(editingWarehouse.id, formData);
                toast({ title: 'Berhasil', description: 'Gudang berhasil diperbarui' });
            } else {
                await addWarehouse(formData);
                toast({ title: 'Berhasil', description: 'Gudang baru berhasil ditambahkan' });
            }
            setShowDialog(false);
            resetForm();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menyimpan gudang',
                variant: 'destructive'
            });
        }
    };

    const handleEdit = (warehouse: any) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name,
            location: warehouse.location || '',
            description: warehouse.description || '',
            capacity: warehouse.capacity || 0,
            status: warehouse.status || 'active'
        });
        setShowDialog(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus gudang ini?')) {
            try {
                await deleteWarehouse(id);
                toast({ title: 'Berhasil', description: 'Gudang berhasil dihapus' });
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: error.message || 'Gagal menghapus gudang',
                    variant: 'destructive'
                });
            }
        }
    };

    const resetForm = () => {
        setEditingWarehouse(null);
        setFormData({
            name: '',
            location: '',
            description: '',
            capacity: 0,
            status: 'active'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-body">Memuat data gudang...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Manajemen Gudang</h2>
                    <p className="text-muted-foreground font-body">Lacak dan kelola lokasi penyimpanan stok</p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm} className="bg-inventory hover:bg-inventory-dark">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Gudang
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display">
                                {editingWarehouse ? 'Edit Gudang' : 'Tambah Gudang Baru'}
                            </DialogTitle>
                            <DialogDescription className="font-body">
                                Lengkapi informasi lokasi gudang di bawah ini
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-body">Nama Gudang *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Gudang Utama, Toko Cabang"
                                    required
                                    className="font-body"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location" className="font-body">Lokasi</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Alamat atau area gudang"
                                    className="font-body"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity" className="font-body">Kapasitas (unit)</Label>
                                    <Input
                                        id="capacity"
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                        placeholder="0"
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status" className="font-body">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger className="font-body">
                                            <SelectValue placeholder="Pilih status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active" className="font-body">Aktif</SelectItem>
                                            <SelectItem value="inactive" className="font-body">Nonaktif</SelectItem>
                                            <SelectItem value="maintenance" className="font-body">Pemeliharaan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="font-body">Keterangan</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Informasi tambahan"
                                    rows={2}
                                    className="font-body"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button type="submit" className="bg-inventory hover:bg-inventory-dark font-body">
                                    {editingWarehouse ? 'Update' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari gudang..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 font-body"
                    />
                </div>
                <Badge variant="outline" className="px-3 py-1 font-mono">
                    {filteredWarehouses.length} lokasi
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWarehouses.map((wh) => (
                    <Card key={wh.id} className="hover:shadow-md transition-shadow border-gray-200">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-inventory/10 rounded-lg flex items-center justify-center">
                                        <Warehouse className="w-5 h-5 text-inventory" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-display">{wh.name}</CardTitle>
                                        <Badge
                                            variant={
                                                wh.status === 'active' ? 'default' :
                                                    wh.status === 'maintenance' ? 'outline' : 'secondary'
                                            }
                                            className="text-[10px] h-4"
                                        >
                                            {wh.status === 'active' ? 'Aktif' : wh.status === 'maintenance' ? 'Pemeliharaan' : 'Nonaktif'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEdit(wh)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(wh.id)}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex items-start gap-2 text-sm text-gray-600 font-body">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                                <span>{wh.location || 'Lokasi tidak diatur.'}</span>
                            </div>
                            {wh.capacity > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-body">
                                    <span className="text-gray-400 font-bold shrink-0">📦</span>
                                    <span>Kapasitas: {wh.capacity.toLocaleString()} unit</span>
                                </div>
                            )}
                            {wh.description && (
                                <p className="text-xs text-gray-400 italic font-body pt-1">
                                    "{wh.description}"
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredWarehouses.length === 0 && (
                <div className="text-center py-12">
                    <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-display">Belum ada gudang</h3>
                    <p className="text-gray-600 mb-4 font-body">
                        {searchQuery ? 'Tidak ada gudang yang sesuai dengan pencarian' : 'Mulai dengan menambahkan gudang pertama'}
                    </p>
                </div>
            )}
        </div>
    );
}
