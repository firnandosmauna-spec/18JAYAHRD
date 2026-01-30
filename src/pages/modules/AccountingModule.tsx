import React from 'react';
import ModuleLayout from '../../components/layout/ModuleLayout';
import { CoAView } from '../../components/accounting/CoAView';
import { JournalEntryView } from '../../components/accounting/JournalEntry';
import { ReportsView } from '../../components/accounting/ReportsView';
import { LedgerView } from '../../components/accounting/LedgerView'; // Added LedgerView import
import { Card, CardContent } from '../../components/ui/card';
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
    BookOpen // Added BookOpen icon
} from 'lucide-react';
import { useAccountingReports } from '../../hooks/useAccounting';
import { formatCurrency } from '../../lib/utils';

import { Routes, Route, Navigate } from 'react-router-dom';

export default function AccountingModule() {
    const navItems = [
        { label: 'Dashboard', href: '/accounting', icon: LayoutDashboard },
        { label: 'Bagan Akun', href: '/accounting/coa', icon: Wallet },
        { label: 'Buku Besar', href: '/accounting/ledger', icon: BookOpen },
        { label: 'Jurnal Umum', href: '/accounting/journal', icon: FileText },
        { label: 'Laporan', href: '/accounting/reports', icon: BarChart3 },
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
    const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const { pl, bs, loading } = useAccountingReports(startDate, endDate);

    const stats = [
        {
            label: 'Total Aset',
            value: bs?.total_assets || 0,
            icon: Wallet,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            trend: '+12.5%',
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
                                <Badge variant="outline" className={`${stat.isPositive ? 'text-green-600 border-green-100' : 'text-rose-600 border-rose-100'} font-bold`}>
                                    {stat.trend}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-gray-900 font-mono">
                                    {loading ? '...' : formatCurrency(stat.value)}
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Placeholder for charts */}
                <Card className="border-none shadow-sm h-96 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-white to-gray-50/50">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <LineChart className="w-8 h-8 text-blue-500" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Arus Kas (Coming Soon)</h4>
                    <p className="text-gray-500 max-w-xs">Grafik visualisasi pendapatan dan pengeluaran bulanan akan segera hadir.</p>
                </Card>

                <Card className="border-none shadow-sm h-96 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-white to-gray-50/50">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Analisa Keuangan</h4>
                    <p className="text-gray-500 max-w-xs">Bandingkan performa keuangan Anda dengan periode sebelumnya.</p>
                </Card>
            </div>
        </div>
    );
}
