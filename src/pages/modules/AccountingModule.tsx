import React from 'react';
import ModuleLayout from '../../components/layout/ModuleLayout';
import { CoAView } from '../../components/accounting/CoAView';
import { JournalEntryView } from '../../components/accounting/JournalEntry';
import { ReportsView } from '../../components/accounting/ReportsView';
import { LedgerView } from '../../components/accounting/LedgerView';
import { CashInView } from '../../components/accounting/CashInView';
import { CashOutView } from '../../components/accounting/CashOutView';
import { CashBookView } from '../../components/accounting/CashBookView';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
    LineChart,
    Wallet,
    FileText,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    LayoutDashboard,
    Calculator,
    BookOpen,
    Plus,
    Loader2,
    Settings
} from 'lucide-react';
import { useAccountingReports, useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

import { Routes, Route, Navigate } from 'react-router-dom';

export default function AccountingModule() {
    const navItems = [
        { label: 'Dashboard', href: '/accounting', icon: LayoutDashboard },
        { label: 'Buku Kas', href: '/accounting/cash-book', icon: Wallet },
        { label: 'Buku Besar', href: '/accounting/ledger', icon: BookOpen },
        { label: 'Jurnal Umum', href: '/accounting/journal', icon: FileText },
        { label: 'Laporan', href: '/accounting/reports', icon: BarChart3 },
        { label: 'Daftar Akun', href: '/accounting/coa', icon: Settings },
    ];

    return (
        <ModuleLayout
            title="Accounting Management"
            moduleId="accounting"
            navItems={navItems}
        >
            <div className="p-6 md:p-8 space-y-8 print:p-0 print:m-0">
                <Routes>
                    <Route index element={<AccountingDashboard />} />
                    <Route path="cash-book" element={<CashBookView />} />
                    <Route path="cash-in" element={<CashInView />} />
                    <Route path="cash-out" element={<CashOutView />} />
                    <Route path="coa" element={<CoAView />} />
                    <Route path="ledger" element={<LedgerView />} />
                    <Route path="journal" element={<JournalEntryView />} />
                    <Route path="reports" element={<ReportsView />} />
                    {/* Catch all for accounting sub-routes */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </div>
        </ModuleLayout>
    );
}



function AccountingDashboard() {
    const navigate = useNavigate();
    const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const { pl, bs, loading: loadingReports } = useAccountingReports(startDate, endDate);
    const { accounts, loading: loadingAccounts } = useAccounts();
    const { entries, loading: loadingEntries } = useJournalEntries();

    // Calculate Cash Balance
    const cashBalance = accounts
        .filter(acc => acc.type === 'asset' && (acc.name.toLowerCase().includes('kas') || acc.name.toLowerCase().includes('bank')))
        .reduce((sum, acc) => sum + acc.balance, 0);

    const stats = [
        {
            label: 'Total Saldo Kas & Bank',
            value: cashBalance || 0,
            icon: Wallet,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            trend: 'Real-time',
            isPositive: true,
        },
        {
            label: 'Pendapatan (YTD)',
            value: pl?.total_revenue || 0,
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            trend: '+8.2%',
            isPositive: true,
        },
        {
            label: 'Beban (YTD)',
            value: pl?.total_expense || 0,
            icon: ArrowDownRight,
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
            trend: '+2.4%',
            isPositive: false,
        },
        {
            label: 'Laba Bersih',
            value: pl?.net_profit || 0,
            icon: Calculator,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            trend: '+15.3%',
            isPositive: true,
        },
    ];

    // Get Recent Transactions (Cash mutations)
    const recentTransactions = entries.flatMap(entry => {
        return (entry.items || [])
            .filter(item => {
                const acc = accounts.find(a => a.id === item.account_id);
                return acc?.type === 'asset' && (acc.name.toLowerCase().includes('kas') || acc.name.toLowerCase().includes('bank'));
            })
            .map(item => ({
                id: `${entry.id}-${item.account_id}`,
                date: entry.date,
                description: item.description || entry.description,
                amount: item.debit - item.credit,
                account_name: item.account_name
            }));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${stat.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <Badge variant="outline" className={`${stat.isPositive ? 'text-green-600 border-green-100' : 'text-rose-600 border-rose-100'} font-bold text-[10px]`}>
                                    {stat.trend}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-gray-900 font-mono">
                                    {loadingReports || loadingAccounts ? '...' : formatCurrency(stat.value)}
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <Card className="border-none shadow-sm p-6 bg-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <h4 className="text-lg font-bold text-gray-900 mb-6 relative">Quick Actions</h4>
                    <div className="grid grid-cols-1 gap-4 relative">
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white h-16 justify-start text-lg px-6 shadow-sm shadow-green-100 group"
                            onClick={() => navigate('/accounting/cash-in')}
                        >
                            <div className="p-2 bg-white/20 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                                <ArrowUpRight className="w-6 h-6" />
                            </div>
                            Catat Kas Masuk
                        </Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white h-16 justify-start text-lg px-6 shadow-sm shadow-rose-100 group"
                            onClick={() => navigate('/accounting/cash-out')}
                        >
                            <div className="p-2 bg-white/20 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                                <ArrowDownRight className="w-6 h-6" />
                            </div>
                            Catat Kas Keluar
                        </Button>
                        <Button
                            variant="outline"
                            className="h-16 justify-start text-lg px-6 border-gray-100 hover:bg-gray-50 group"
                            onClick={() => navigate('/accounting/journal')}
                        >
                            <div className="p-2 bg-gray-100 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-gray-400" />
                            </div>
                            Jurnal Umum Baru
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-16 justify-start text-lg px-6 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none group"
                            onClick={() => navigate('/accounting/coa')}
                        >
                            <div className="p-2 bg-blue-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            Pengaturan Daftar Akun
                        </Button>
                    </div>
                </Card>

                {/* Recent Cash Transactions */}
                <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden bg-white">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h4 className="text-lg font-bold text-gray-900">Mutasi Kas Terbaru</h4>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/accounting/cash-book')} className="text-blue-600">
                            Lihat Semua
                        </Button>
                    </div>
                    <CardContent className="p-0">
                        {loadingEntries ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                            </div>
                        ) : recentTransactions.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {recentTransactions.map((tx) => (
                                    <div key={tx.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900 line-clamp-1">{tx.description}</span>
                                            <div className="flex items-center text-xs text-gray-500 gap-2">
                                                <span>{new Date(tx.date).toLocaleDateString('id-ID')}</span>
                                                <span>•</span>
                                                <span className="font-medium text-blue-600">{tx.account_name}</span>
                                            </div>
                                        </div>
                                        <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500">Belum ada transaksi kas terbaru.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
