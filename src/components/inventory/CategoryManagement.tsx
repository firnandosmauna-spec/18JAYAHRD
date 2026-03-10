import React, { useState } from 'react';
import {
    Tags,
    Plus,
    Search,
    Edit,
    Trash2,
    FileText
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
import { useProductCategories } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';

export function CategoryManagement() {
    const { categories, loading, addCategory, updateCategory, deleteCategory } = useProductCategories();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, formData);
                toast({ title: 'Berhasil', description: 'Kategori berhasil diperbarui' });
            } else {
                await addCategory(formData);
                toast({ title: 'Berhasil', description: 'Kategori baru berhasil ditambahkan' });
            }
            setShowDialog(false);
            resetForm();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menyimpan kategori',
                variant: 'destructive'
            });
        }
    };

    const handleEdit = (category: any) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || ''
        });
        setShowDialog(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
            try {
                await deleteCategory(id);
                toast({ title: 'Berhasil', description: 'Kategori berhasil dihapus' });
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: error.message || 'Gagal menghapus kategori',
                    variant: 'destructive'
                });
            }
        }
    };

    const resetForm = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            description: ''
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-body">Memuat data kategori...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Manajemen Kategori</h2>
                    <p className="text-muted-foreground font-body">Kelola kategori produk untuk pengelompokan stok</p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm} className="bg-inventory hover:bg-inventory-dark">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Kategori
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="font-display">
                                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                            </DialogTitle>
                            <DialogDescription className="font-body">
                                Lengkapi informasi kategori di bawah ini
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-body">Nama Kategori *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Semen, Kayu, Besi"
                                    required
                                    className="font-body"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="font-body">Deskripsi</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Penjelasan singkat mengenai kategori ini"
                                    rows={3}
                                    className="font-body"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="font-body">
                                    Batal
                                </Button>
                                <Button type="submit" className="bg-inventory hover:bg-inventory-dark font-body">
                                    {editingCategory ? 'Update' : 'Simpan'}
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
                        placeholder="Cari kategori..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 font-body"
                    />
                </div>
                <Badge variant="outline" className="px-3 py-1 font-mono">
                    {filteredCategories.length} kategori
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((cat) => (
                    <Card key={cat.id} className="hover:shadow-md transition-shadow border-gray-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-inventory/10 rounded-lg flex items-center justify-center">
                                        <Tags className="w-5 h-5 text-inventory" />
                                    </div>
                                    <CardTitle className="text-lg font-display">{cat.name}</CardTitle>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEdit(cat)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(cat.id)}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 font-body line-clamp-2 min-h-[40px]">
                                {cat.description || 'Tidak ada deskripsi.'}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                    <Tags className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-display">Belum ada kategori</h3>
                    <p className="text-gray-600 mb-4 font-body">
                        {searchQuery ? 'Tidak ada kategori yang sesuai dengan pencarian' : 'Mulai dengan menambahkan kategori pertama'}
                    </p>
                </div>
            )}
        </div>
    );
}
