import React from 'react';
import { useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Wallet, ArrowUpRight, ArrowDownRight, Filter, Download, Loader2, Trash2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { accountingService } from '../../services/accountingService';
import { toast } from '../../components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export function CashBookView() {
    const navigate = useNavigate();
    const { accounts, loading: loadingAccounts } = useAccounts();
    const { entries, loading: loadingEntries, refresh } = useJournalEntries();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedAccountId, setSelectedAccountId] = React.useState<string>('all');
    const [filterType, setFilterType] = React.useState<'all' | 'in' | 'out'>('all');
    const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc');

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
        try {
            await accountingService.deleteJournalEntry(id);
            toast({ title: 'Transaksi berhasil dihapus' });
            refresh();
        } catch (err: any) {
            toast({ title: 'Gagal menghapus', description: err.message, variant: 'destructive' });
        }
    };

    // Filter cash and bank accounts (Asset type)
    const cashAccounts = accounts.filter(acc =>
        acc.type === 'asset' &&
        (acc.name.toLowerCase().includes('kas') ||
            acc.name.toLowerCase().includes('bank') ||
            acc.name.toLowerCase().includes('cash') ||
            acc.code.startsWith('10') ||
            acc.code.startsWith('11') ||
            acc.code.startsWith('1-0') ||
            acc.code.startsWith('1-1'))
    );

    const totalCashBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Simplified and robust transaction processing
    const cashTransactions = React.useMemo(() => {
        // 1. Map entries to items and filter by cash accounts
        const raw = entries.flatMap(entry => 
            (entry.items || [])
                .filter(item => {
                    const isCashAcc = cashAccounts.some(ca => ca.id === item.account_id);
                    const matchesSelection = selectedAccountId === 'all' || item.account_id === selectedAccountId;
                    return isCashAcc && matchesSelection;
                })
                .map(item => ({
                    id: `${entry.id}-${item.id || item.account_id}`,
                    journal_id: entry.id,
                    account_id: item.account_id,
                    date: entry.date,
                    reference: entry.reference,
                    description: item.description || entry.description,
                    account_name: item.account_name,
                    debit: Number(item.debit || 0),
                    credit: Number(item.credit || 0),
                    status: entry.status || 'posted',
                    created_at: entry.created_at
                }))
        ).sort((a, b) => {
            const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // 2. Calculate running balance backwards from current account balances
        const balancesMap = new Map<string, number>();
        cashAccounts.forEach(acc => balancesMap.set(acc.id, Number(acc.balance || 0)));

        return raw.map(tx => {
            const currentBalance = balancesMap.get(tx.account_id) || 0;
            const entryWithBalance = { ...tx, running_balance: currentBalance };

            // Only posted entries should have affected the stored balance
            if (tx.status === 'posted') {
                const diff = tx.debit - tx.credit;
                balancesMap.set(tx.account_id, currentBalance - diff);
            }

            return entryWithBalance;
        });
    }, [entries, cashAccounts, selectedAccountId]);

    const filteredTransactions = React.useMemo(() => {
        const filtered = cashTransactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === 'all' ||
                (filterType === 'in' && tx.debit > 0) ||
                (filterType === 'out' && tx.credit > 0);

            return matchesSearch && matchesType;
        });

        // Apply sort order for display
        return [...filtered].sort((a, b) => {
            const factor = sortOrder === 'desc' ? 1 : -1;
            const dateCompare = (new Date(b.date).getTime() - new Date(a.date).getTime()) * factor;
            if (dateCompare !== 0) return dateCompare;
            return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * factor;
        });
    }, [cashTransactions, searchTerm, filterType, sortOrder]);

    // Calculate totals for currently filtered view
    const viewTotalDebit = filteredTransactions.reduce((sum, tx) => sum + tx.debit, 0);
    const viewTotalCredit = filteredTransactions.reduce((sum, tx) => sum + tx.credit, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Buku Kas & Bank</h2>
                    <p className="text-muted-foreground">Rincian mutasi kas dan bank secara real-time</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        onClick={() => navigate('/accounting/cash-in')}
                    >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Kas Masuk
                    </Button>
                    <Button
                        className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                        onClick={() => navigate('/accounting/cash-out')}
                    >
                        <ArrowDownRight className="w-4 h-4 mr-2" />
                        Kas Keluar
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg col-span-1 md:col-span-1">
                    <CardContent className="p-4">
                        <p className="text-blue-100 text-xs font-medium mb-1">Total Saldo</p>
                        <h3 className="text-xl font-bold font-mono">
                            {loadingAccounts ? '...' : formatCurrency(totalCashBalance)}
                        </h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-green-50/50">
                    <CardContent className="p-4">
                        <p className="text-green-600 text-xs font-medium mb-1">Total Masuk (View)</p>
                        <h3 className="text-xl font-bold text-green-700 font-mono">
                            {formatCurrency(viewTotalDebit)}
                        </h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-rose-50/50">
                    <CardContent className="p-4">
                        <p className="text-rose-600 text-xs font-medium mb-1">Total Keluar (View)</p>
                        <h3 className="text-xl font-bold text-rose-700 font-mono">
                            {formatCurrency(viewTotalCredit)}
                        </h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white hidden md:block">
                    <CardContent className="p-4">
                        <p className="text-gray-500 text-xs font-medium mb-1">Jumlah Transaksi</p>
                        <h3 className="text-xl font-bold text-gray-900 font-mono">
                            {filteredTransactions.length}
                        </h3>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)} className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <TabsList className="bg-white border border-gray-100 p-1">
                        <TabsTrigger value="all" className="px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">Semua</TabsTrigger>
                        <TabsTrigger value="in" className="px-6 data-[state=active]:bg-green-50 data-[state=active]:text-green-600">Masuk</TabsTrigger>
                        <TabsTrigger value="out" className="px-6 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600">Keluar</TabsTrigger>
                    </TabsList>

                    <div className="flex flex-1 items-center gap-2 justify-end">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger className="h-9 w-full md:w-48 bg-white">
                                <SelectValue placeholder="Semua Akun" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Akun</SelectItem>
                                {cashAccounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="border-none shadow-sm overflow-hidden min-h-[400px] bg-white rounded-xl">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[60px] px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider">No</TableHead>
                                        <TableHead className="w-[120px] px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                                            <button 
                                                className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                            >
                                                Tanggal
                                                {sortOrder === 'desc' ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                    <ChevronUp className="w-3 h-3" />
                                                )}
                                            </button>
                                        </TableHead>
                                        <TableHead className="px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider">Keterangan</TableHead>
                                        <TableHead className="w-[140px] px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider text-right">Debit</TableHead>
                                        <TableHead className="w-[140px] px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider text-right">Kredit</TableHead>
                                        <TableHead className="w-[160px] px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider text-right">Saldo</TableHead>
                                        <TableHead className="w-[80px] px-6 text-slate-500 font-bold uppercase text-[11px] tracking-wider text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingEntries ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                    <span className="text-sm text-slate-400 font-body">Memuat data transaksi...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTransactions.length > 0 ? (
                                        filteredTransactions.map((tx, idx) => (
                                            <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                                                <TableCell className="px-6 font-mono text-[13px] text-slate-400">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="px-6 text-[13px] font-medium text-slate-600">
                                                    {new Date(tx.date).toLocaleDateString('id-ID')}
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug font-body">{tx.description}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-medium">{tx.account_name}</span>
                                                            {tx.reference && <span className="text-[10px] text-blue-400 font-mono italic">#{tx.reference}</span>}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 text-right font-mono text-[14px] text-emerald-600 font-bold">
                                                    {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                                </TableCell>
                                                <TableCell className="px-6 text-right font-mono text-[14px] text-rose-500 font-bold">
                                                    {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                                </TableCell>
                                                <TableCell className="px-6 text-right font-mono text-[14px] text-slate-900 font-black">
                                                    {formatCurrency(tx.running_balance)}
                                                </TableCell>
                                                <TableCell className="px-6">
                                                    <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                            onClick={() => navigate(`/accounting/journal?edit=${tx.journal_id}`)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                            onClick={() => handleDelete(tx.journal_id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-64 text-center items-center py-12">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                        <Search className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-body">Tidak ada mutasi kas untuk filter ini.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}
