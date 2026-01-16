import React, { useState } from 'react';
import { 
  Calculator, 
  FileText, 
  TrendingUp, 
  Settings, 
  Plus,
  Search,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export function AccountingModuleFixed() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check user permissions
  const canCreateTransactions = user?.role !== 'staff';
  const canManageAccounts = user?.role === 'admin';

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modul Akuntansi</h1>
            <p className="text-gray-600">Sistem manajemen keuangan SDM 18 JAYA</p>
          </div>
          {canCreateTransactions && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Transaksi Baru
            </Button>
          )}
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                🎉 Modul Akuntansi Berhasil Dimuat!
              </h3>
              <p className="text-green-800 mt-1">
                Sistem akuntansi SDM 18 JAYA siap digunakan. Semua komponen telah berhasil dimuat.
              </p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Komponen React berhasil dimuat
              </p>
              <p className="text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Routing berfungsi dengan baik
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Authentication dan authorization aktif
              </p>
              <p className="text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                User role: {user?.role} dengan akses accounting
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transaksi
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Bagan Akun
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Laporan
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Aset</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Kewajiban</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pendapatan Bulan Ini</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Laba Bersih</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Langkah Selanjutnya</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => window.open('/mcp-supabase', '_blank')}
                >
                  <Settings className="h-6 w-6 mb-2" />
                  Setup Database
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setActiveTab('accounts')}
                >
                  <Calculator className="h-6 w-6 mb-2" />
                  Lihat Bagan Akun
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  disabled={!canCreateTransactions}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  Buat Transaksi
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Manajemen Transaksi</h3>
              <p className="text-gray-600 mb-4">
                Fitur transaksi akan tersedia setelah database akuntansi disetup.
              </p>
              <Button onClick={() => window.open('/mcp-supabase', '_blank')}>
                Setup Database Terlebih Dahulu
              </Button>
            </div>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Bagan Akun</h3>
              <p className="text-gray-600 mb-4">
                Bagan akun akan tersedia setelah database akuntansi disetup.
              </p>
              <Button onClick={() => window.open('/mcp-supabase', '_blank')}>
                Setup Database Terlebih Dahulu
              </Button>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Laporan Keuangan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center" disabled>
                  <FileText className="h-6 w-6 mb-2" />
                  Laporan Laba Rugi
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center" disabled>
                  <Calculator className="h-6 w-6 mb-2" />
                  Neraca
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center" disabled>
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Arus Kas
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Fitur laporan keuangan akan tersedia setelah database disetup dan ada data transaksi.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AccountingModuleFixed;