import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAccounts, useAccountBalances } from '@/hooks/useAccounting';
import { useAuth } from '@/contexts/AuthContext';
import type { Account, AccountType } from '@/types/accounting';

const accountTypeLabels: Record<AccountType, string> = {
  asset: 'Aset',
  liability: 'Kewajiban',
  equity: 'Ekuitas',
  revenue: 'Pendapatan',
  expense: 'Beban'
};

const accountTypeColors: Record<AccountType, string> = {
  asset: 'bg-green-100 text-green-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-blue-100 text-blue-800',
  revenue: 'bg-purple-100 text-purple-800',
  expense: 'bg-orange-100 text-orange-800'
};

interface ChartOfAccountsProps {
  editable?: boolean;
}

export function ChartOfAccounts({ editable = true }: ChartOfAccountsProps) {
  const { user } = useAuth();
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const { accounts, loading, error, addAccount, updateAccount, deactivateAccount } = useAccounts(showInactive);
  const { balances } = useAccountBalances();

  // Check if user can edit accounts (admin/manager only)
  const canEdit = editable && user?.role !== 'staff';

  // Filter accounts based on search and type
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.code.includes(searchQuery);
    const matchesType = selectedType === 'all' || account.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Get account balance
  const getAccountBalance = (accountId: string): number => {
    const balance = balances.find(b => b.id === accountId);
    return balance?.balance || 0;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      const accountData = {
        code: formData.get('code') as string,
        name: formData.get('name') as string,
        type: formData.get('type') as AccountType,
        parent_id: formData.get('parent_id') as string || null,
        is_active: true
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
      } else {
        await addAccount(accountData);
      }

      setIsDialogOpen(false);
      setEditingAccount(null);
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleDeactivate = async (account: Account) => {
    if (confirm(`Yakin ingin menonaktifkan akun "${account.name}"?`)) {
      try {
        await deactivateAccount(account.id);
      } catch (error) {
        console.error('Error deactivating account:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bagan Akun</h2>
          <p className="text-gray-600">Kelola struktur akun perusahaan</p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAccount(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Akun
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
                </DialogTitle>
              </DialogHeader>
              <form action={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code">Kode Akun</Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={editingAccount?.code || ''}
                    placeholder="Contoh: 1000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nama Akun</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingAccount?.name || ''}
                    placeholder="Contoh: Kas"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Jenis Akun</Label>
                  <Select name="type" defaultValue={editingAccount?.type || ''} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis akun" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="parent_id">Akun Induk (Opsional)</Label>
                  <Select name="parent_id" defaultValue={editingAccount?.parent_id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun induk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak ada</SelectItem>
                      {accounts
                        .filter(acc => acc.id !== editingAccount?.id)
                        .map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingAccount ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Cari akun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AccountType | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setShowInactive(!showInactive)}
          className="flex items-center gap-2"
        >
          {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
        </Button>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="text-center">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-mono">{account.code}</TableCell>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>
                  <Badge className={accountTypeColors[account.type]}>
                    {accountTypeLabels[account.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(getAccountBalance(account.id))}
                </TableCell>
                <TableCell>
                  <Badge variant={account.is_active ? 'default' : 'secondary'}>
                    {account.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                {canEdit && (
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAccount(account);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {account.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(account)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery || selectedType !== 'all' 
            ? 'Tidak ada akun yang sesuai dengan filter'
            : 'Belum ada akun yang dibuat'
          }
        </div>
      )}
    </div>
  );
}