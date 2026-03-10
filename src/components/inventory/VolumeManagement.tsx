import React, { useState } from 'react';
import {
    Box,
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
import { useInventoryVolumes } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function VolumeManagement() {
    const { volumes, loading, addVolume, removeVolume, updateVolume } = useInventoryVolumes();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [newVolume, setNewVolume] = useState('');
    const [editingVolume, setEditingVolume] = useState<{ old: string, new: string } | null>(null);

    const filteredVolumes = volumes.filter(v =>
        v.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVolume.trim()) return;

        try {
            if (volumes.includes(newVolume.trim())) {
                toast({ title: 'Error', description: 'Volume sudah ada', variant: 'destructive' });
                return;
            }
            await addVolume(newVolume.trim());
            toast({ title: 'Berhasil', description: 'Volume baru berhasil ditambahkan' });
            setShowAddDialog(false);
            setNewVolume('');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menambahkan volume',
                variant: 'destructive'
            });
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVolume || !editingVolume.new.trim()) return;

        try {
            if (volumes.includes(editingVolume.new.trim()) && editingVolume.new.trim() !== editingVolume.old) {
                toast({ title: 'Error', description: 'Volume sudah ada', variant: 'destructive' });
                return;
            }
            await updateVolume(editingVolume.old, editingVolume.new.trim());
            toast({ title: 'Berhasil', description: 'Volume berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingVolume(null);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui volume',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (volume: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus volume "${volume}"?`)) {
            try {
                await removeVolume(volume);
                toast({ title: 'Berhasil', description: 'Volume berhasil dihapus' });
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: error.message || 'Gagal menghapus volume',
                    variant: 'destructive'
                });
            }
        }
    };

    const startEditing = (volume: string) => {
        setEditingVolume({ old: volume, new: volume });
        setShowEditDialog(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-body">Memuat data volume...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Manajemen Volume</h2>
                    <p className="text-muted-foreground font-body">Kelola daftar volume standar produk (misal: 10 kg, 1 m3)</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-inventory hover:bg-inventory-dark">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Volume
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="font-display">Tambah Volume Baru</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan deskripsi volume (misal: 50 kg, 40 liter)
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="volume" className="font-body">Deskripsi Volume *</Label>
                                <Input
                                    id="volume"
                                    value={newVolume}
                                    onChange={(e) => setNewVolume(e.target.value)}
                                    placeholder="Contoh: 50 kg"
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
                        placeholder="Cari volume..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 font-body"
                    />
                </div>
                <Badge variant="outline" className="px-3 py-1 font-mono">
                    {filteredVolumes.length} volume
                </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredVolumes.map((v) => (
                    <Card key={v} className="hover:shadow-sm transition-shadow border-gray-100 group">
                        <CardContent className="p-4 flex flex-col items-center justify-center relative min-h-[120px]">
                            <div className="w-10 h-10 bg-inventory/5 rounded-full flex items-center justify-center mb-2">
                                <Box className="w-5 h-5 text-inventory/60" />
                            </div>
                            <span className="font-bold text-[#1C1C1E] font-display text-center break-words w-full px-2">{v}</span>

                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(v)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-inventory hover:bg-inventory/5"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(v)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredVolumes.length === 0 && (
                <div className="text-center py-12">
                    <Box className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-display">Belum ada volume</h3>
                    <p className="text-gray-600 mb-4 font-body">
                        {searchQuery ? 'Tidak ada volume yang sesuai dengan pencarian' : 'Mulai dengan menambahkan volume pertama'}
                    </p>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display">Edit Volume</DialogTitle>
                        <DialogDescription className="font-body">
                            Ubah deskripsi volume produk
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-volume" className="font-body">Deskripsi Volume *</Label>
                            <Input
                                id="edit-volume"
                                value={editingVolume?.new || ''}
                                onChange={(e) => setEditingVolume(prev => prev ? { ...prev, new: e.target.value } : null)}
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
