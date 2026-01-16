import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  TrendingUp,
  Settings,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChartOfAccounts } from '@/components/accounting/ChartOfAccounts';
import { TransactionManager } from '@/components/accounting/TransactionManager';
import { SetupStatus } from '@/components/accounting/SetupStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions, useAccountBalances } from '@/hooks/useAccounting';
import type { TransactionFilter, TransactionStatus } from '@/types/accounting';

export function AccountingModule() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactions(transactionFilter);
  const { balances, loading: balancesLoading, error: balancesError } = useAccountBalances();


  // Check user permissions
  const canCreateTransactions = user?.role !== 'staff';
  const canViewReports = true; // All users can view reports
  const canManageAccounts = user?.role === 'admin';

  // Calculate dashboard metrics
  const totalAssets = (balances || [])
    .filter(b => b.type === 'asset')
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const totalLiabilities = (balances || [])
    .filter(b => b.type === 'liability')
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const totalEquity = (balances || [])
    .filter(b => b.type === 'equity')
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const monthlyRevenue = (balances || [])
    .filter(b => b.type === 'revenue')
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const monthlyExpenses = (balances || [])
    .filter(b => b.type === 'expense')
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  const netIncome = monthlyRevenue - monthlyExpenses;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants = {
      draft: 'secondary',
      posted: 'default',
      reversed: 'destructive'
    } as const;

    const labels = {
      draft: 'Draft',
      posted: 'Posted',
      reversed: 'Dibatalkan'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const filteredTransactions = (transactions || []).filter(transaction =>
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.reference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showTransactionForm) {
    return (
      <TransactionManager
        transactionId={editingTransactionId || undefined}
        mode={editingTransactionId ? 'edit' : 'create'}
        onSave={() => {
          setShowTransactionForm(false);
          setEditingTransactionId(null);
          toast({
            title: "Transaksi Berhasil Disimpan",
            description: "Data transaksi telah berhasil diperbarui.",
          });
        }}
        onCancel={() => {
          setShowTransactionForm(false);
          setEditingTransactionId(null);
        }}
      />
    );
  }

  if (transactionsLoading || balancesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground font-body">Memuat data akuntansi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modul Akuntansi</h1>
          <p className="text-gray-600">Sistem manajemen keuangan SDM 18 JAYA</p>
        </div>
        {canCreateTransactions && (
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Transaksi Baru
          </Button>
        )}
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
          {/* Setup Status Check */}
          {(balancesError || transactionsError) ? (
            <SetupStatus onSetupComplete={() => window.location.reload()} />
          ) : (
            <>
              {/* Welcome Message for First Time Users */}
              {!balancesLoading && (!balances || balances.length === 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Selamat Datang di Modul Akuntansi!
                  </h3>
                  <p className="text-blue-800 mb-4">
                    Sistem akuntansi SDM 18 JAYA siap digunakan. Mulai dengan membuat transaksi pertama atau mengelola bagan akun.
                  </p>
                  <div className="flex gap-2">
                    {canCreateTransactions && (
                      <Button onClick={() => setShowTransactionForm(true)}>
                        Buat Transaksi Pertama
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setActiveTab('accounts')}>
                      Lihat Bagan Akun
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Financial Metrics Cards */}
                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Aset</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalAssets)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Kewajiban</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(totalLiabilities)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pendapatan Bulan Ini</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(monthlyRevenue)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calculator className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Laba Bersih</p>
                      <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netIncome)}
                      </p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                      <TrendingUp className={`h-6 w-6 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Transaksi Terbaru</h3>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(transactions || []).slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.date).toLocaleDateString('id-ID')}
                            {transaction.reference && ` • ${transaction.reference}`}
                          </p>
                        </div>
                        {getStatusBadge(transaction.status)}
                      </div>
                    ))}
                    {(!transactions || transactions.length === 0) && !transactionsLoading && (
                      <div className="text-center text-gray-500 py-8">
                        <p>Belum ada transaksi</p>
                        {canCreateTransactions && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setShowTransactionForm(true)}
                          >
                            Buat Transaksi Pertama
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari transaksi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={transactionFilter.startDate}
                  onChange={(e) => setTransactionFilter({ ...transactionFilter, startDate: e.target.value })}
                />
                <Input
                  type="date"
                  value={transactionFilter.endDate}
                  onChange={(e) => setTransactionFilter({ ...transactionFilter, endDate: e.target.value })}
                />
              </div>
              <Select
                value={transactionFilter.status || 'all'}
                onValueChange={(value) => setTransactionFilter({
                  ...transactionFilter,
                  status: value === 'all' ? undefined : value as TransactionStatus
                })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="reversed">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-lg border">
            {transactionsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{transaction.description}</h4>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{new Date(transaction.date).toLocaleDateString('id-ID')}</span>
                          {transaction.reference && <span>Ref: {transaction.reference}</span>}
                          <span>{transaction.entries?.length || 0} entries</span>
                        </div>
                      </div>
                      {canCreateTransactions && transaction.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTransactionId(transaction.id);
                            setShowTransactionForm(true);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery ? 'Tidak ada transaksi yang sesuai dengan pencarian' : 'Belum ada transaksi'}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <ChartOfAccounts editable={canManageAccounts} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Laporan Keuangan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                <FileText className="h-6 w-6 mb-2" />
                Laporan Laba Rugi
              </Button>
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                <Calculator className="h-6 w-6 mb-2" />
                Neraca
              </Button>
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                <TrendingUp className="h-6 w-6 mb-2" />
                Arus Kas
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Fitur laporan keuangan akan segera tersedia
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AccountingModule;