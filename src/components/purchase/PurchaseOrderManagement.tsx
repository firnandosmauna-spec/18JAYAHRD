import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Eye, 
  MoreVertical, 
  Trash2, 
  Send, 
  CheckCircle, 
  XCircle, 
  PlusCircle, 
  MinusCircle,
  FileText,
  Truck,
  Calendar,
  AlertCircle,
  Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePurchaseOrders, useSuppliers } from '@/hooks/usePurchase';
import { useProducts } from '@/hooks/useSales';
import { PurchaseService } from '@/services/purchaseService';
import type { PurchaseOrder } from '@/types/purchase';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

import { useAuth } from '@/contexts/AuthContext';

export function PurchaseOrderManagement() {
  const { user } = useAuth();
  const { orders, loading, error, createOrder, updateOrder, deleteOrder } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Handle shortcut to open create dialog
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateDialogOpen(true);
      // Remove the parameter after opening
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('new');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_delivery_date: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      draft: orders.filter(o => o.status === 'draft').length,
      sent: orders.filter(o => o.status === 'sent').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      received: orders.filter(o => o.status === 'received').length,
    };
  }, [orders]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].unit_price = (product as any).cost_price || 0;
      }
    }
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleCreatePO = async () => {
    try {
      if (!formData.supplier_id) {
        toast({ title: "Error", description: "Pilih supplier terlebih dahulu", variant: "destructive" });
        return;
      }
      if (orderItems.length === 0) {
        toast({ title: "Error", description: "Tambah minimal satu item", variant: "destructive" });
        return;
      }

      const totalAmount = calculateTotal();
      const poData = {
        order_number: PurchaseService.generateOrderNumber(),
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        status: 'draft' as const,
        subtotal: totalAmount,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: totalAmount,
        notes: formData.notes,
        created_by: user?.id || null, 
      };

      const finalItems = orderItems.map(item => ({
        ...item,
        line_total: item.quantity * item.unit_price
      }));

      await createOrder(poData, finalItems);
      setIsCreateDialogOpen(false);
      setOrderItems([]);
      setFormData({
        supplier_id: '',
        order_date: format(new Date(), 'yyyy-MM-dd'),
        expected_delivery_date: '',
        notes: '',
      });
      toast({ title: "Sukses", description: "Purchase Order berhasil dibuat" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: PurchaseOrder['status']) => {
    try {
      await updateOrder(id, { status: newStatus });
      toast({ title: "Sukses", description: `Status PO berhasil diperbarui menjadi ${newStatus}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePO = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus PO ini?')) return;
    try {
      await deleteOrder(id);
      toast({ title: "Sukses", description: "PO berhasil dihapus" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
      case 'sent': return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Dikirim</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">Dikonfirmasi</Badge>;
      case 'received': return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Diterima</Badge>;
      case 'cancelled': return <Badge variant="destructive">Dibatalkan</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && orders.length === 0) {
    return <div className="flex items-center justify-center h-64">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Purchase Order</h2>
          <p className="text-gray-600">Kelola pesanan pembelian ke supplier</p>
        </div>
        <Button 
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          PO Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total PO</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-blue-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Draft</p>
                <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Dikonfirmasi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-indigo-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Selesai/Diterima</p>
                <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
              </div>
              <Truck className="w-8 h-8 text-green-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Cari nomor PO atau supplier..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Dikirim</SelectItem>
                  <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                  <SelectItem value="received">Diterima</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor PO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Tidak ada Purchase Order ditemukan
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{format(new Date(order.order_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{order.supplier?.name || 'Unknown'}</TableCell>
                  <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsDialogOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" /> Detail
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          disabled={order.status !== 'draft'}
                          onClick={() => handleUpdateStatus(order.id, 'sent')}
                        >
                          <Send className="w-4 h-4 mr-2" /> Kirim ke Supplier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled={order.status !== 'sent'}
                          onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Konfirmasi Supplier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled={order.status !== 'confirmed'}
                          onClick={() => handleUpdateStatus(order.id, 'received')}
                        >
                          <Truck className="w-4 h-4 mr-2" /> Tandai Diterima
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeletePO(order.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Hapus PO
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Baru</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah untuk membuat pesanan pembelian baru
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(val) => setFormData({...formData, supplier_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Order</Label>
              <Input 
                type="date" 
                value={formData.order_date}
                onChange={(e) => setFormData({...formData, order_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimasi Pengiriman (Opsional)</Label>
              <Input 
                type="date" 
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Tambahkan catatan PO..." 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Item Pesanan</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <PlusCircle className="w-4 h-4 mr-2" /> Tambah Produk
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Produk</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select 
                        value={item.product_id} 
                        onValueChange={(val) => handleItemChange(index, 'product_id', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        min="1" 
                        className="text-right"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        className="text-right"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                        <MinusCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end p-4 bg-gray-50 rounded-lg">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Keseluruhan</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Batal</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleCreatePO}>Simpan & Buat PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        {selectedOrder && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <div>
                  <DialogTitle>{selectedOrder.order_number}</DialogTitle>
                  <DialogDescription>
                    Detail Purchase Order ke {selectedOrder.supplier?.name}
                  </DialogDescription>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-gray-100 my-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Informasi Supplier</p>
                <p className="font-medium text-gray-900">{selectedOrder.supplier?.name}</p>
                <p className="text-sm text-gray-600">{selectedOrder.supplier?.address || '-'}</p>
                <p className="text-sm text-gray-600">{selectedOrder.supplier?.phone || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Detail Pengiriman</p>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Order: {format(new Date(selectedOrder.order_date), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span>Estimasi: {selectedOrder.expected_delivery_date ? format(new Date(selectedOrder.expected_delivery_date), 'dd MMM yyyy') : '-'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">Ringkasan Biaya</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-1 mt-1">
                  <span>Total:</span>
                  <span className="text-orange-600">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" /> Item Pesanan
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name || 'Unknown Product'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedOrder.notes && (
              <div className="mt-6 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase">Catatan PO</p>
                  <p className="text-sm text-blue-700">{selectedOrder.notes}</p>
                </div>
              </div>
            )}

            <DialogFooter className="mt-8 gap-2">
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Tutup</Button>
              {selectedOrder.status === 'draft' && (
                <Button onClick={() => handleUpdateStatus(selectedOrder.id, 'sent')}>Kirim PO Sekarang</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}