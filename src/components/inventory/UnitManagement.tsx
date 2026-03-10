import React, { useState } from 'react';
import {
    Scale,
    Plus,
    Search,
    Trash2,
    Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { useInventoryUnits } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function UnitManagement() {
    const { units, loading, addUnit, removeUnit, updateUnit } = useInventoryUnits();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [newUnit, setNewUnit] = useState('');
    const [editingUnit, setEditingUnit] = useState<{ old: string, new: string } | null>(null);

    const filteredUnits = units.filter(unit =>
        unit.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnit.trim()) return;

        try {
            const normalizedNew = newUnit.trim().toLowerCase();
            if (units.includes(normalizedNew)) {
                toast({ title: 'Error', description: 'Satuan sudah ada', variant: 'destructive' });
                return;
            }
            await addUnit(normalizedNew);
            toast({ title: 'Berhasil', description: 'Satuan baru berhasil ditambahkan' });
            setShowAddDialog(false);
            setNewUnit('');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menambahkan satuan',
                variant: 'destructive'
            });
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUnit || !editingUnit.new.trim()) return;

        try {
            const normalizedNew = editingUnit.new.trim().toLowerCase();
            if (units.includes(normalizedNew) && normalizedNew !== editingUnit.old) {
                toast({ title: 'Error', description: 'Satuan sudah ada', variant: 'destructive' });
                return;
            }
            await updateUnit(editingUnit.old, normalizedNew);
            toast({ title: 'Berhasil', description: 'Satuan berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingUnit(null);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui satuan',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (unit: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus satuan "${unit}"?`)) {
            try {
                await removeUnit(unit);
                toast({ title: 'Berhasil', description: 'Satuan berhasil dihapus' });
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: error.message || 'Gagal menghapus satuan',
                    variant: 'destructive'
                });
            }
        }
    };

    const startEditing = (unit: string) => {
        setEditingUnit({ old: unit, new: unit });
        setShowEditDialog(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-body">Memuat data satuan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Manajemen Satuan</h2>
                    <p className="text-muted-foreground font-body">Kelola daftar satuan ukuran produk (Unit of Measure)</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-inventory hover:bg-inventory-dark">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Satuan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="font-display">Tambah Satuan Baru</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan nama satuan (misal: kg, box, sak)
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit" className="font-body">Nama Satuan *</Label>
                                <Input
                                    id="unit"
                                    value={newUnit}
                                    onChange={(e) => setNewUnit(e.target.value)}
                                    placeholder="Contoh: sak, kg, dus"
                                    required
                                    className="font-body"
                                    autoFocus
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button type="submit" className="bg-inventory hover:bg-inventory-dark font-body">
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari satuan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 font-body"
                    />
                </div>
                <Badge variant="outline" className="px-3 py-1 font-mono">
                    {filteredUnits.length} satuan
                </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredUnits.map((unit) => (
                    <Card key={unit} className="hover:shadow-sm transition-shadow border-gray-100 group">
                        <CardContent className="p-4 flex flex-col items-center justify-center relative min-h-[120px]">
                            <div className="w-10 h-10 bg-inventory/5 rounded-full flex items-center justify-center mb-2">
                                <Scale className="w-5 h-5 text-inventory/60" />
                            </div>
                            <span className="font-bold text-[#1C1C1E] font-display text-center break-words w-full px-2">{unit}</span>

                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(unit)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-inventory hover:bg-inventory/5"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(unit)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredUnits.length === 0 && (
                <div className="text-center py-12">
                    <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-display">Belum ada satuan</h3>
                    <p className="text-gray-600 mb-4 font-body">
                        {searchQuery ? 'Tidak ada satuan yang sesuai dengan pencarian' : 'Mulai dengan menambahkan satuan pertama'}
                    </p>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display">Edit Satuan</DialogTitle>
                        <DialogDescription className="font-body">
                            Ubah nama satuan ukuran produk
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-unit" className="font-body">Nama Satuan *</Label>
                            <Input
                                id="edit-unit"
                                value={editingUnit?.new || ''}
                                onChange={(e) => setEditingUnit(prev => prev ? { ...prev, new: e.target.value } : null)}
                                required
                                className="font-body"
                                autoFocus
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="font-body">
                                Batal
                            </Button>
                            <Button type="submit" className="bg-inventory hover:bg-inventory-dark font-body">
                                Perbarui
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
