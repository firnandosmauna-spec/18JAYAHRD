import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Truck, 
  Package, 
  FileText, 
  Receipt,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Plus
} from 'lucide-react';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseStats, useSuppliers, usePurchaseOrders, usePurchaseInvoices } from '@/hooks/usePurchase';
import { useProducts } from '@/hooks/useSales';
import { SupplierManagement } from '@/components/purchase/SupplierManagement';
import { PurchaseOrderManagement } from '@/components/purchase/PurchaseOrderManagement';
import { PurchaseInvoiceManagement } from '@/components/purchase/PurchaseInvoiceManagement';

function PurchaseDashboard() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = usePurchaseStats();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { orders } = usePurchaseOrders();
  const { invoices } = usePurchaseInvoices();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat statistik pembelian...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Pembelian</h1>
          <p className="text-gray-600">Kelola pembelian, supplier, dan invoice</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            PO Baru
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +8% dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PO</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(stats?.totalOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {orders.filter(o => o.status === 'confirmed').length} dikonfirmasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatNumber(stats?.pendingInvoices || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdueInvoices || 0} terlambat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supplier Aktif</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(suppliers.filter(s => s.status === 'active').length)}
            </div>
            <p className="text-xs text-muted-foreground">
              {suppliers.length} total supplier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Supplier</CardTitle>
                <CardDescription className="text-xs">Kelola data supplier</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Produk</CardTitle>
                <CardDescription className="text-xs">Kelola katalog produk</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Purchase Order</CardTitle>
                <CardDescription className="text-xs">Kelola PO pembelian</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Invoice</CardTitle>
                <CardDescription className="text-xs">Kelola invoice pembelian</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PO Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-gray-600">{order.supplier?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                    <Badge 
                      variant={
                        order.status === 'confirmed' ? 'default' :
                        order.status === 'received' ? 'secondary' :
                        order.status === 'cancelled' ? 'destructive' : 'outline'
                      }
                      className="text-xs"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">{invoice.supplier?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                    <Badge 
                      variant={
                        invoice.payment_status === 'paid' ? 'secondary' :
                        invoice.payment_status === 'partial' ? 'outline' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {invoice.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const navItems = [
  { label: 'Dashboard', href: '/purchase', icon: TrendingDown },
  { label: 'Supplier', href: '/purchase/suppliers', icon: Truck },
  { label: 'Purchase Order', href: '/purchase/orders', icon: ShoppingBag },
  { label: 'Invoice', href: '/purchase/invoices', icon: Receipt },
];

export default function PurchaseModule() {
  return (
    <ModuleLayout moduleId="purchase" title="Pembelian" navItems={navItems}>
      <Routes>
        <Route index element={<PurchaseDashboard />} />
        <Route path="suppliers" element={<SupplierManagement />} />
        <Route path="orders" element={<PurchaseOrderManagement />} />
        <Route path="invoices" element={<PurchaseInvoiceManagement />} />
        <Route path="*" element={<Navigate to="/purchase" replace />} />
      </Routes>
    </ModuleLayout>
  );
}