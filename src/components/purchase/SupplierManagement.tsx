import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Undo2
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSuppliers } from '@/hooks/usePurchase';
import { useProducts } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PurchaseService } from '@/services/purchaseService';
import { formatCurrency } from '@/lib/utils';
import type { Supplier, SupplierDeposit } from '@/types/purchase';

export function SupplierManagement() {
  const location = useLocation();
  const isInventory = location.pathname.includes('/inventory');
  const primaryColor = isInventory ? 'bg-inventory' : 'bg-orange-600';
  const primaryHover = isInventory ? 'hover:bg-inventory-dark' : 'hover:bg-orange-700';
  const primaryText = isInventory ? 'text-inventory' : 'text-orange-600';
  const primaryBorder = isInventory ? 'border-t-inventory' : 'border-t-orange-600';

  const { suppliers, loading, refetch, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    tax_number: '',
    payment_terms: 30,
    status: 'active',
    payment_method: 'CASH' as 'CASH' | 'Hutang'
  });

  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState('all');

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;

    // Filter suppliers by their own payment method if set, fallback to product check
    if (supplier.payment_method) {
      return supplier.payment_method.toLowerCase() === activeTab.toLowerCase();
    }

    const supplierProducts = products.filter(p => p.supplier_id === supplier.id);
    const paymentMethod = activeTab === 'cash' ? 'CASH' : 'Hutang';

    return supplierProducts.some(p => p.purchase_payment_method === paymentMethod);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Nama supplier wajib diisi',
        variant: 'destructive'
      });
      return;
    }

    // Auto-generate code if empty
    let finalFormData = { ...formData };
    if (!finalFormData.code.trim()) {
      const timestamp = new Date().getTime().toString().slice(-4);
      finalFormData.code = `SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${timestamp}`;
    }

    try {
      setIsSubmitting(true);
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, finalFormData);
        toast({ title: 'Berhasil', description: 'Data supplier berhasil diperbarui' });
      } else {
        await createSupplier(finalFormData);
        toast({ title: 'Berhasil', description: 'Supplier baru berhasil ditambahkan' });
      }
      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan data supplier',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      postal_code: supplier.postal_code || '',
      tax_number: supplier.tax_number || '',
      payment_terms: supplier.payment_terms || 30,
      status: supplier.status || 'active',
      payment_method: (supplier.payment_method as any) || 'CASH'
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus supplier ini?')) {
      try {
        await deleteSupplier(id);
        toast({ title: 'Berhasil', description: 'Supplier berhasil dihapus' });
      } catch (error: any) {
        console.error('Error deleting supplier:', error);
        toast({
          title: 'Error',
          description: error.message || 'Gagal menghapus supplier',
          variant: 'destructive'
        });
      }
    }
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      code: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      tax_number: '',
      payment_terms: 30,
      status: 'active'
    });
  };

  const [selectedSupplierForDeposit, setSelectedSupplierForDeposit] = useState<Supplier | null>(null);
  const [showDepositDialog, setShowDepositDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`w-8 h-8 border-4 ${isInventory ? 'border-inventory/30 border-t-inventory' : 'border-orange-600/30 border-t-orange-600'} rounded-full animate-spin mx-auto mb-4`} />
          <p className="text-gray-600">Memuat data supplier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Supplier</h2>
          <p className="text-gray-600">Kelola data supplier dan informasi kontak</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className={`${primaryColor} ${primaryHover}`}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
              </DialogTitle>
              <DialogDescription>
                Lengkapi informasi supplier di bawah ini
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Supplier</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Supplier *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Kode Pos</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">NPWP</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">Termin Pembayaran (hari)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
                <Label htmlFor="status">Supplier Aktif</Label>
              </div>

              <div className="grid gap-2">
                <Label className="font-body">Metode Pembayaran Default</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="pm-cash"
                      name="payment_method"
                      className="w-4 h-4"
                      checked={formData.payment_method === 'CASH'}
                      onChange={() => setFormData({ ...formData, payment_method: 'CASH' })}
                    />
                    <Label htmlFor="pm-cash">CASH</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="pm-debt"
                      name="payment_method"
                      className="w-4 h-4"
                      checked={formData.payment_method === 'Hutang'}
                      onChange={() => setFormData({ ...formData, payment_method: 'Hutang' })}
                    />
                    <Label htmlFor="pm-debt">Hutang</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className={`${primaryColor} ${primaryHover}`}>
                  {isSubmitting ? 'Menyimpan...' : (editingSupplier ? 'Update' : 'Simpan')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {filteredSuppliers.length} supplier {activeTab !== 'all' ? `(${activeTab.toUpperCase()})` : ''}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="font-body">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="cash">CASH</TabsTrigger>
          <TabsTrigger value="debt">Hutang</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  <CardDescription className="font-mono">{supplier.code}</CardDescription>
                </div>
                <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                  {supplier.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {supplier.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{supplier.email}</span>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.city && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{supplier.city}</span>
                </div>
              )}
              {supplier.payment_terms && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Termin: {supplier.payment_terms} hari</span>
                </div>
              )}

              <div className={`mt-4 p-3 rounded-lg ${isInventory ? 'bg-inventory/5' : 'bg-orange-50'} border border-dashed ${isInventory ? 'border-inventory/20' : 'border-orange-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Saldo Deposit
                  </span>
                  <Badge variant="outline" className={`text-xs font-mono font-bold ${isInventory ? 'text-inventory-dark' : 'text-orange-700'}`}>
                    {formatCurrency(supplier.deposit_balance || 0)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full h-7 text-[10px] mt-2 ${isInventory ? 'hover:bg-inventory/10 text-inventory' : 'hover:bg-orange-100 text-orange-600'}`}
                  onClick={() => {
                    setSelectedSupplierForDeposit(supplier);
                    setShowDepositDialog(true);
                  }}
                >
                  <History className="w-3 h-3 mr-1" />
                  Kelola & Riwayat
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(supplier)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(supplier.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada supplier</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'Tidak ada supplier yang sesuai dengan pencarian' : 'Mulai dengan menambahkan supplier pertama'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowDialog(true)} className={`${primaryColor} ${primaryHover}`}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Supplier
            </Button>
          )}
        </div>
      )}

      {selectedSupplierForDeposit && (
        <DepositManagementDialog
          open={showDepositDialog}
          onOpenChange={setShowDepositDialog}
          supplier={selectedSupplierForDeposit}
          onSuccess={() => {
            refetch();
          }}
          isInventory={isInventory}
        />
      )}
    </div>
  );
}

interface DepositManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  onSuccess: () => void;
  isInventory: boolean;
}

function DepositManagementDialog({ open, onOpenChange, supplier, onSuccess, isInventory }: DepositManagementDialogProps) {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<SupplierDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'deposit' as 'deposit' | 'usage' | 'refund',
    description: ''
  });

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const data = await PurchaseService.getSupplierDeposits(supplier.id);
      setDeposits(data);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Gagal memuat riwayat deposit', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchDeposits();
    }
  }, [open, supplier.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast({ title: 'Error', description: 'Jumlah harus lebih dari 0', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await PurchaseService.updateSupplierDeposit(editingId, {
          amount: Number(formData.amount),
          type: formData.type,
          description: formData.description
        });
        toast({ title: 'Berhasil', description: 'Transaksi deposit berhasil diperbarui' });
      } else {
        await PurchaseService.addSupplierDeposit({
          supplier_id: supplier.id,
          amount: Number(formData.amount),
          type: formData.type,
          description: formData.description
        });
        toast({ title: 'Berhasil', description: 'Transaksi deposit berhasil dicatat' });
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormData({ amount: '', type: 'deposit', description: '' });
      fetchDeposits();
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menyimpan transaksi', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (dep: SupplierDeposit) => {
    setEditingId(dep.id);
    setFormData({
      amount: dep.amount.toString(),
      type: dep.type,
      description: dep.description || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data deposit ini? Saldo akan disesuaikan otomatis.')) return;

    try {
      setIsSubmitting(true);
      await PurchaseService.deleteSupplierDeposit(id);
      toast({ title: 'Berhasil', description: 'Transaksi deposit dihapus' });
      fetchDeposits();
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus transaksi', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = isInventory ? 'bg-inventory' : 'bg-orange-600';
  const primaryHover = isInventory ? 'hover:bg-inventory-dark' : 'hover:bg-orange-700';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-inventory" />
              Kelola Deposit: {supplier.name}
            </div>
            <Badge variant="secondary" className="font-mono text-lg py-1 px-3">
              {formatCurrency(supplier.deposit_balance || 0)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Kelola saldo titipan dan riwayat penggunaan dana pada supplier ini.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!showAddForm ? (
            <Button
              className={`w-full ${primaryColor} ${primaryHover}`}
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Catat Deposit / Penggunaan Baru
            </Button>
          ) : (
            <Card className="border-inventory/20 bg-inventory/5">
              <CardContent className="p-4">
                <h5 className="text-xs font-bold mb-3 flex items-center gap-1 text-inventory-dark">
                  {editingId ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {editingId ? 'Edit Transaksi' : 'Transaksi Baru'}
                </h5>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jenis Transaksi</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      >
                        <option value="deposit">Deposit Baru (+)</option>
                        <option value="usage">Penggunaan Saldo (-)</option>
                        <option value="refund">Refund / Pengembalian (-)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Jumlah (Rp)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Keterangan</Label>
                    <Input
                      placeholder="Misal: Deposit untuk order PO-001"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setShowAddForm(false);
                      setEditingId(null);
                      setFormData({ amount: '', type: 'deposit', description: '' });
                    }}>
                      Batal
                    </Button>
                    <Button type="submit" size="sm" className={primaryColor} disabled={isSubmitting}>
                      {isSubmitting ? 'Memproses...' : editingId ? 'Perbarui Transaksi' : 'Simpan Transaksi'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat Transaksi
            </h4>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Memuat riwayat...</div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border rounded-lg border-dashed">
                Belum ada riwayat transaksi deposit
              </div>
            ) : (
              <div className="space-y-2">
                {deposits.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${dep.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                        {dep.type === 'deposit' ? (
                          <ArrowUpCircle className={`w-4 h-4 ${isInventory ? 'text-inventory-dark' : 'text-green-700'}`} />
                        ) : dep.type === 'usage' ? (
                          <ArrowDownCircle className="w-4 h-4 text-red-700" />
                        ) : (
                          <Undo2 className="w-4 h-4 text-orange-700" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dep.description || (dep.type === 'deposit' ? 'Setoran Deposit' : 'Penggunaan Saldo')}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(dep.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-sm font-bold ${dep.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {dep.type === 'deposit' ? '+' : '-'}{formatCurrency(dep.amount)}
                      </p>
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {dep.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-1 ml-4 border-l pl-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-inventory/10 text-inventory"
                        onClick={() => handleEdit(dep)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-red-50 text-red-600"
                        onClick={() => handleDelete(dep.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}