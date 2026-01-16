import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  CreditCard
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
import { Switch } from '@/components/ui/switch';
import { useCustomers } from '@/hooks/useSales';
import type { Customer } from '@/types/sales';

export function CustomerManagement() {
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    tax_number: '',
    credit_limit: 0,
    payment_terms: 30,
    status: 'active'
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await createCustomer(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      postal_code: customer.postal_code || '',
      tax_number: customer.tax_number || '',
      credit_limit: customer.credit_limit || 0,
      payment_terms: customer.payment_terms || 30,
      status: customer.status || 'active'
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) {
      try {
        await deleteCustomer(id);
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      code: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      tax_number: '',
      credit_limit: 0,
      payment_terms: 30,
      status: 'active'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat data pelanggan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Pelanggan</h2>
          <p className="text-gray-600">Kelola data pelanggan dan informasi kontak</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pelanggan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </DialogTitle>
              <DialogDescription>
                Lengkapi informasi pelanggan di bawah ini
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Pelanggan *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="CUS001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Pelanggan *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="PT. Contoh Perusahaan"
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
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="021-1234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Contoh No. 123"
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
                    placeholder="Jakarta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Kode Pos</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">NPWP</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    placeholder="12.345.678.9-012.345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Limit Kredit</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Termin Pembayaran (hari)</Label>
                  <Input
                    id="payment_terms"
                    type="number"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
                <Label htmlFor="status">Pelanggan Aktif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingCustomer ? 'Update' : 'Simpan'}
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
            placeholder="Cari pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {filteredCustomers.length} pelanggan
        </Badge>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <CardDescription className="font-mono">{customer.code}</CardDescription>
                </div>
                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                  {customer.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.city && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{customer.city}</span>
                </div>
              )}
              {customer.credit_limit && customer.credit_limit > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="w-4 h-4" />
                  <span>Limit: {formatCurrency(customer.credit_limit)}</span>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(customer)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(customer.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada pelanggan</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'Tidak ada pelanggan yang sesuai dengan pencarian' : 'Mulai dengan menambahkan pelanggan pertama'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pelanggan
            </Button>
          )}
        </div>
      )}
    </div>
  );
}