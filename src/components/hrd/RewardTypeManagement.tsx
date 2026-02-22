import React, { useState } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Star,
    Award,
    Trophy,
    Medal,
    Crown,
    Target,
    Gift,
    MoreVertical,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useRewardTypes } from '@/hooks/useSupabase';
import type { RewardTypeMaster } from '@/lib/supabase';

const iconOptions = [
    { name: 'Award', icon: Award },
    { name: 'Star', icon: Star },
    { name: 'Trophy', icon: Trophy },
    { name: 'Medal', icon: Medal },
    { name: 'Crown', icon: Crown },
    { name: 'Target', icon: Target },
    { name: 'Gift', icon: Gift },
];

export function RewardTypeManagement() {
    const { rewardTypes, loading, error, addRewardType, updateRewardType, deleteRewardType } = useRewardTypes();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        default_points: '100',
        monetary_percentage: '0',
        description: '',
        icon_name: 'Award'
    });

    const filteredTypes = rewardTypes.filter(type =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            default_points: '100',
            monetary_percentage: '0',
            description: '',
            icon_name: 'Award'
        });
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (type: RewardTypeMaster) => {
        setIsEditing(true);
        setEditId(type.id);
        setFormData({
            name: type.name,
            code: type.code,
            default_points: type.default_points.toString(),
            monetary_percentage: (type.monetary_percentage || 0).toString(),
            description: type.description || '',
            icon_name: type.icon_name || 'Award'
        });
        setShowAddDialog(true);
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name || !formData.code) {
                toast({
                    title: 'Error',
                    description: 'Nama dan Kode wajib diisi',
                    variant: 'destructive'
                });
                return;
            }

            const payload = {
                name: formData.name,
                code: formData.code,
                default_points: parseInt(formData.default_points) || 0,
                monetary_percentage: parseFloat(formData.monetary_percentage) || 0,
                description: formData.description,
                icon_name: formData.icon_name
            };

            if (isEditing && editId) {
                // When editing, exclude code as it shouldn't be changed and is unique
                const { code, ...updatePayload } = payload;
                console.log('🔄 Updating reward type:', editId, updatePayload);
                await updateRewardType(editId, updatePayload as any);
                toast({
                    title: 'Sukses',
                    description: 'Berhasil memperbarui jenis penghargaan'
                });
            } else {
                console.log('➕ Adding reward type:', payload);
                await addRewardType(payload);
                toast({
                    title: 'Sukses',
                    description: 'Berhasil menambah jenis penghargaan',
                    className: 'bg-green-600 text-white'
                });
            }

            setShowAddDialog(false);
            resetForm();
        } catch (err: any) {
            console.error('❌ Failed to save reward type:', err);
            toast({
                title: 'Error',
                description: err.message || 'Gagal menyimpan data',
                variant: 'destructive',
                className: 'bg-red-600 text-white'
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus jenis penghargaan ini?')) {
            try {
                await deleteRewardType(id);
                toast({
                    title: 'Sukses',
                    description: 'Berhasil menghapus jenis penghargaan'
                });
            } catch (err: any) {
                toast({
                    title: 'Error',
                    description: err.message || 'Gagal menghapus data',
                    variant: 'destructive'
                });
            }
        }
    };

    if (loading && rewardTypes.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-hrd" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold">Master Jenis Penghargaan</h2>
                <Button
                    onClick={() => { resetForm(); setShowAddDialog(true); }}
                    className="bg-hrd hover:bg-hrd-dark font-body"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Jenis
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Cari jenis penghargaan..."
                    className="pl-10 font-body"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="font-body">Nama</TableHead>
                                <TableHead className="font-body">Kode</TableHead>
                                <TableHead className="font-body text-center">Poin Default</TableHead>
                                <TableHead className="font-body text-center">Persentase Gaji</TableHead>
                                <TableHead className="font-body text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTypes.map((type) => {
                                const IconComp = iconOptions.find(i => i.name === type.icon_name)?.icon || Award;
                                return (
                                    <TableRow key={type.id}>
                                        <TableCell>
                                            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                                                <IconComp className="w-4 h-4 text-yellow-600" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium font-body">{type.name}</span>
                                            {type.description && (
                                                <p className="text-xs text-muted-foreground font-body">{type.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{type.code}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                {type.default_points} pts
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="font-mono text-blue-600 border-blue-200 bg-blue-50">
                                                {type.monetary_percentage || 0}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(type)} className="font-body text-blue-600">
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(type.id)} className="font-body text-red-600">
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredTypes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-body">
                                        Tidak ada jenis penghargaan ditemukan
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display">
                            {isEditing ? 'Edit Jenis Penghargaan' : 'Tambah Jenis Penghargaan'}
                        </DialogTitle>
                        <DialogDescription className="font-body">
                            Kelola kategori master jenis penghargaan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="font-body">Nama Penghargaan</Label>
                            <Input
                                id="name"
                                placeholder="Contoh: Karyawan Terbaik"
                                className="font-body"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code" className="font-body">Kode (Unique ID)</Label>
                            <Input
                                id="code"
                                placeholder="Contoh: employee_of_month"
                                className="font-mono"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                disabled={isEditing}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="points" className="font-body">Poin Default</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    className="font-mono"
                                    value={formData.default_points}
                                    onChange={(e) => setFormData({ ...formData, default_points: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="percentage" className="font-body">Konversi (%)</Label>
                                <div className="relative">
                                    <Input
                                        id="percentage"
                                        type="number"
                                        step="0.1"
                                        className="font-mono pr-8"
                                        value={formData.monetary_percentage}
                                        onChange={(e) => setFormData({ ...formData, monetary_percentage: e.target.value })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-body">Ikon</Label>
                            <div className="flex flex-wrap gap-2">
                                {iconOptions.map((item) => (
                                    <Button
                                        key={item.name}
                                        variant={formData.icon_name === item.name ? 'default' : 'outline'}
                                        size="icon"
                                        onClick={() => setFormData({ ...formData, icon_name: item.name })}
                                        className={formData.icon_name === item.name ? 'bg-hrd' : ''}
                                    >
                                        <item.icon className="w-4 h-4" />
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="font-body">Deskripsi</Label>
                            <Textarea
                                id="description"
                                placeholder="Keterangan singkat..."
                                className="font-body"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} className="font-body">
                            Batal
                        </Button>
                        <Button onClick={handleSubmit} className="bg-hrd hover:bg-hrd-dark font-body">
                            {isEditing ? 'Simpan Perubahan' : 'Tambah Jenis'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
