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
  Calendar
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
import { useSuppliers } from '@/hooks/usePurchase';
import type { Supplier } from '@/types/purchase';

export function SupplierManagement() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
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
    status: 'active'
  });

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving supplier:', error);
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
      status: supplier.status || 'active'
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus supplier ini?')) {
      try {
        await deleteSupplier(id);
      } catch (error) {
        console.error('Error deleting supplier:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
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
            <Button onClick={resetForm} className="bg-orange-600 hover:bg-orange-700">
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
                  <Label htmlFor="code">Kode Supplier *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="SUP001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Supplier *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="PT. Supplier Contoh"
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
                    placeholder="supplier@example.com"
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
                  placeholder="Jl. Supplier No. 123"
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
                <Label htmlFor="status">Supplier Aktif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  {editingSupplier ? 'Update' : 'Simpan'}
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
          {filteredSuppliers.length} supplier
        </Badge>
      </div>

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
            <Button onClick={() => setShowDialog(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Supplier
            </Button>
          )}
        </div>
      )}
    </div>
  );
}