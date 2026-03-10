import React, { useState } from 'react';
import {
    MapPin,
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
import { useProjectLocations } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function ProjectLocationManagement() {
    const { locations, loading, addLocation, removeLocation, updateLocation } = useProjectLocations();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [newLocation, setNewLocation] = useState('');
    const [editingLocation, setEditingLocation] = useState<{ old: string, new: string } | null>(null);

    const filteredLocations = locations.filter(l =>
        l.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocation.trim()) return;

        try {
            if (locations.includes(newLocation.trim())) {
                toast({ title: 'Error', description: 'Lokasi sudah ada', variant: 'destructive' });
                return;
            }
            await addLocation(newLocation.trim());
            toast({ title: 'Berhasil', description: 'Lokasi baru berhasil ditambahkan' });
            setShowAddDialog(false);
            setNewLocation('');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menambahkan lokasi',
                variant: 'destructive'
            });
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLocation || !editingLocation.new.trim()) return;

        try {
            if (locations.includes(editingLocation.new.trim()) && editingLocation.new.trim() !== editingLocation.old) {
                toast({ title: 'Error', description: 'Lokasi sudah ada', variant: 'destructive' });
                return;
            }
            await updateLocation(editingLocation.old, editingLocation.new.trim());
            toast({ title: 'Berhasil', description: 'Lokasi berhasil diperbarui' });
            setShowEditDialog(false);
            setEditingLocation(null);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal memperbarui lokasi',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (location: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus lokasi "${location}"?`)) {
            try {
                await removeLocation(location);
                toast({ title: 'Berhasil', description: 'Lokasi berhasil dihapus' });
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: error.message || 'Gagal menghapus lokasi',
                    variant: 'destructive'
                });
            }
        }
    };

    const startEditing = (location: string) => {
        setEditingLocation({ old: location, new: location });
        setShowEditDialog(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-body">Memuat data lokasi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Manajemen Lokasi Proyek</h2>
                    <p className="text-muted-foreground font-body">Kelola daftar lokasi proyek untuk penempatan material</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-inventory hover:bg-inventory-dark">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Lokasi
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="font-display">Tambah Lokasi Baru</DialogTitle>
                            <DialogDescription className="font-body">
                                Masukkan nama lokasi proyek (misal: Cluster A, Blok B)
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="location" className="font-body">Nama Lokasi *</Label>
                                <Input
                                    id="location"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    placeholder="Contoh: Proyek A"
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
                        placeholder="Cari lokasi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 font-body"
                    />
                </div>
                <Badge variant="outline" className="px-3 py-1 font-mono">
                    {filteredLocations.length} lokasi
                </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredLocations.map((l) => (
                    <Card key={l} className="hover:shadow-sm transition-shadow border-gray-100 group">
                        <CardContent className="p-4 flex flex-col items-center justify-center relative min-h-[120px]">
                            <div className="w-10 h-10 bg-inventory/5 rounded-full flex items-center justify-center mb-2">
                                <MapPin className="w-5 h-5 text-inventory/60" />
                            </div>
                            <span className="font-bold text-[#1C1C1E] font-display text-center break-words w-full px-2">{l}</span>

                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(l)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-inventory hover:bg-inventory/5"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(l)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredLocations.length === 0 && (
                <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-display">Belum ada lokasi</h3>
                    <p className="text-gray-600 mb-4 font-body">
                        {searchQuery ? 'Tidak ada lokasi yang sesuai dengan pencarian' : 'Mulai dengan menambahkan lokasi pertama'}
                    </p>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display">Edit Lokasi</DialogTitle>
                        <DialogDescription className="font-body">
                            Ubah nama lokasi proyek
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-location" className="font-body">Nama Lokasi *</Label>
                            <Input
                                id="edit-location"
                                value={editingLocation?.new || ''}
                                onChange={(e) => setEditingLocation(prev => prev ? { ...prev, new: e.target.value } : null)}
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
