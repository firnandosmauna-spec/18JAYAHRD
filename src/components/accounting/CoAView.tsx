import React from 'react';
import { useAccounts } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Plus, Loader2, Search, Filter } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from '../../components/ui/use-toast';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';

export function CoAView() {
    const { accounts, loading, refresh, createAccount } = useAccounts();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [newAccount, setNewAccount] = React.useState({
        code: '',
        name: '',
        type: 'asset',
        description: ''
    });
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const success = await createAccount(newAccount);
        if (success) {
            setIsAddDialogOpen(false);
            setNewAccount({ code: '', name: '', type: 'asset', description: '' });
        }
        setSubmitting(false);
    };

    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [editingAccount, setEditingAccount] = React.useState<any>(null);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { id, balance, created_at, updated_at, ...updateData } = editingAccount;
            const { error } = await supabase
                .from('accounting_accounts')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Berhasil', description: 'Akun berhasil diperbarui' });
            setIsEditDialogOpen(false);
            refresh();
        } catch (err: any) {
            toast({
                title: 'Gagal memperbarui akun',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.code.includes(searchTerm)
    );

    const typeLabels: Record<string, string> = {
        asset: 'Aset',
        liability: 'Kewajiban',
        equity: 'Ekuitas',
        revenue: 'Pendapatan',
        expense: 'Beban'
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'asset': return 'bg-blue-100 text-blue-800';
            case 'liability': return 'bg-orange-100 text-orange-800';
            case 'equity': return 'bg-purple-100 text-purple-800';
            case 'revenue': return 'bg-green-100 text-green-800';
            case 'expense': return 'bg-rose-100 text-rose-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Bagan Akun (CoA)</h2>
                    <p className="text-muted-foreground">Kelola daftar akun akuntansi perusahaan</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-accounting hover:bg-accounting-dark text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Akun
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>Tambah Akun Baru</DialogTitle>
                                <DialogDescription>
                                    Lengkapi detail di bawah untuk membuat akun baru dalam bagan akun.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="code" className="text-right">Kode</Label>
                                    <Input
                                        id="code"
                                        value={newAccount.code}
                                        onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                                        className="col-span-3"
                                        placeholder="Misal: 1-1000"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Nama</Label>
                                    <Input
                                        id="name"
                                        value={newAccount.name}
                                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                        className="col-span-3"
                                        placeholder="Nama Akun"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">Tipe</Label>
                                    <div className="col-span-3">
                                        <Select
                                            value={newAccount.type}
                                            onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih tipe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="asset">ASET</SelectItem>
                                                <SelectItem value="liability">KEWAJIBAN</SelectItem>
                                                <SelectItem value="equity">EKUITAS</SelectItem>
                                                <SelectItem value="revenue">PENDAPATAN</SelectItem>
                                                <SelectItem value="expense">BEBAN</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">Deskripsi</Label>
                                    <Input
                                        id="description"
                                        value={newAccount.description}
                                        onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                                        className="col-span-3"
                                        placeholder="Opsional"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
                                <Button type="submit" className="bg-accounting hover:bg-accounting-dark text-white" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Simpan Akun
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Account Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle>Edit Akun</DialogTitle>
                            <DialogDescription>
                                Ubah informasi akun {editingAccount?.code}.
                            </DialogDescription>
                        </DialogHeader>
                        {editingAccount && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-code" className="text-right">Kode</Label>
                                    <Input
                                        id="edit-code"
                                        value={editingAccount.code}
                                        onChange={(e) => setEditingAccount({ ...editingAccount, code: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-name" className="text-right">Nama</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingAccount.name}
                                        onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-type" className="text-right">Tipe</Label>
                                    <div className="col-span-3">
                                        <Select
                                            value={editingAccount.type}
                                            onValueChange={(value) => setEditingAccount({ ...editingAccount, type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="asset">ASET</SelectItem>
                                                <SelectItem value="liability">KEWAJIBAN</SelectItem>
                                                <SelectItem value="equity">EKUITAS</SelectItem>
                                                <SelectItem value="revenue">PENDAPATAN</SelectItem>
                                                <SelectItem value="expense">BEBAN</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-desc" className="text-right">Deskripsi</Label>
                                    <Input
                                        id="edit-desc"
                                        value={editingAccount.description || ''}
                                        onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Status</Label>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant={editingAccount.is_active ? "default" : "outline"}
                                            size="sm"
                                            className={editingAccount.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                                            onClick={() => setEditingAccount({ ...editingAccount, is_active: !editingAccount.is_active })}
                                        >
                                            {editingAccount.is_active ? "Aktif" : "Non-aktif"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-accounting hover:bg-accounting-dark text-white" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Perbarui Akun
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-gray-100 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari akun..."
                                className="pl-9 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-10">
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                            </Button>
                            <Button variant="ghost" size="sm" className="h-10" onClick={refresh}>
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accounting" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Kode</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Nama Akun</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Tipe</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100 text-right">Saldo</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredAccounts.length > 0 ? (
                                        filteredAccounts.map((account) => (
                                            <tr
                                                key={account.id}
                                                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                                onClick={() => {
                                                    setEditingAccount({ ...account });
                                                    setIsEditDialogOpen(true);
                                                }}
                                            >
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.code}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900">{account.name}</span>
                                                        {account.description && <span className="text-xs text-gray-500 line-clamp-1">{account.description}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={getTypeColor(account.type)}>
                                                        {typeLabels[account.type] || account.type.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-right font-medium">
                                                    {formatCurrency(account.balance)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={account.is_active ? 'secondary' : 'default'} className={account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                        {account.is_active ? 'Aktif' : 'Non-aktif'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                Tidak ada akun yang ditemukan
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}
