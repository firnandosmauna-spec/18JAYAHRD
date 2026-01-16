import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  FileText, 
  Receipt,
  TrendingUp,
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
import { useSalesStats, useCustomers, useProducts, useSalesOrders, useSalesInvoices } from '@/hooks/useSales';
import { CustomerManagement } from '@/components/sales/CustomerManagement';
import { ProductManagement } from '@/components/sales/ProductManagement';
import { SalesOrderManagement } from '@/components/sales/SalesOrderManagement';
import { SalesInvoiceManagement } from '@/components/sales/SalesInvoiceManagement';

function SalesDashboard() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useSalesStats();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { orders } = useSalesOrders();
  const { invoices } = useSalesInvoices();

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
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat statistik penjualan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Penjualan</h1>
          <p className="text-gray-600">Kelola penjualan, pelanggan, dan produk</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Pesanan Baru
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
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
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(stats?.pendingInvoices || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdueInvoices || 0} terlambat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggan Aktif</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(customers.filter(c => c.status === 'active').length)}
            </div>
            <p className="text-xs text-muted-foreground">
              {customers.length} total pelanggan
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
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Pelanggan</CardTitle>
                <CardDescription className="text-xs">Kelola data pelanggan</CardDescription>
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
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Pesanan</CardTitle>
                <CardDescription className="text-xs">Kelola pesanan penjualan</CardDescription>
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
                <CardDescription className="text-xs">Kelola invoice penjualan</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pesanan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-gray-600">{order.customer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                    <Badge 
                      variant={
                        order.status === 'confirmed' ? 'default' :
                        order.status === 'delivered' ? 'secondary' :
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
                    <p className="text-sm text-gray-600">{invoice.customer?.name}</p>
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
  { label: 'Dashboard', href: '/sales', icon: TrendingUp },
  { label: 'Pelanggan', href: '/sales/customers', icon: Users },
  { label: 'Produk', href: '/sales/products', icon: Package },
  { label: 'Pesanan', href: '/sales/orders', icon: ShoppingCart },
  { label: 'Invoice', href: '/sales/invoices', icon: Receipt },
];

export default function SalesModule() {
  return (
    <ModuleLayout moduleId="sales" title="Penjualan" navItems={navItems}>
      <Routes>
        <Route index element={<SalesDashboard />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="orders" element={<SalesOrderManagement />} />
        <Route path="invoices" element={<SalesInvoiceManagement />} />
        <Route path="*" element={<Navigate to="/sales" replace />} />
      </Routes>
    </ModuleLayout>
  );
}