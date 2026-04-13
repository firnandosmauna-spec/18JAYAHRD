import React from 'react';
import { useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Landmark, ArrowUpRight, ArrowDownRight, Filter, Download, Loader2, Trash2, Edit, ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { accountingService } from '../../services/accountingService';
import { toast } from '../../components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export function BankBookView() {
    const navigate = useNavigate();
    const { accounts, loading: loadingAccounts } = useAccounts();
    const { entries, loading: loadingEntries, refresh } = useJournalEntries(2000); // Higher limit for full view
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

    // Filter only bank accounts (Asset type)
    const bankAccounts = accounts.filter(acc =>
        acc.type === 'asset' &&
        (acc.name.toLowerCase().includes('bank') ||
            acc.code.startsWith('11') ||
            acc.code.startsWith('1-1'))
    );

    const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Simplified and robust transaction processing
    const bankTransactions = React.useMemo(() => {
        const raw = entries.flatMap(entry => 
            (entry.items || [])
                .filter(item => {
                    const isBankAcc = bankAccounts.some(ca => ca.id === item.account_id);
                    const matchesSelection = selectedAccountId === 'all' || item.account_id === selectedAccountId;
                    return isBankAcc && matchesSelection;
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

        const balancesMap = new Map<string, number>();
        bankAccounts.forEach(acc => balancesMap.set(acc.id, Number(acc.balance || 0)));

        return raw.map(tx => {
            const currentBalance = balancesMap.get(tx.account_id) || 0;
            const entryWithBalance = { ...tx, running_balance: currentBalance };

            if (tx.status === 'posted') {
                const diff = tx.debit - tx.credit;
                balancesMap.set(tx.account_id, currentBalance - diff);
            }

            return entryWithBalance;
        });
    }, [entries, bankAccounts, selectedAccountId]);

    const filteredTransactions = React.useMemo(() => {
        const filtered = bankTransactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === 'all' ||
                (filterType === 'in' && tx.debit > 0) ||
                (filterType === 'out' && tx.credit > 0);

            return matchesSearch && matchesType;
        });

        return [...filtered].sort((a, b) => {
            const factor = sortOrder === 'desc' ? 1 : -1;
            const dateCompare = (new Date(b.date).getTime() - new Date(a.date).getTime()) * factor;
            if (dateCompare !== 0) return dateCompare;
            return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * factor;
        });
    }, [bankTransactions, searchTerm, filterType, sortOrder]);

    const viewTotalDebit = filteredTransactions.reduce((sum, tx) => sum + tx.debit, 0);
    const viewTotalCredit = filteredTransactions.reduce((sum, tx) => sum + tx.credit, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Buku Bank</h2>
                    <p className="text-muted-foreground">Rincian mutasi rekening bank secara real-time</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        onClick={() => navigate('/accounting/cash-in')}
                    >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Kas Masuk
                    </Button>
                    <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                        onClick={() => navigate('/accounting/cash-out')}
                    >
                        <ArrowDownRight className="w-4 h-4 mr-2" />
                        Kas Keluar
                    </Button>
                </div>
            </div>

            {/* Bank Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-lg col-span-1 md:col-span-1">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Landmark className="w-4 h-4 text-indigo-100" />
                            <p className="text-indigo-100 text-xs font-medium">Total Dana di Bank</p>
                        </div>
                        <h3 className="text-xl font-bold font-mono">
                            {loadingAccounts ? '...' : formatCurrency(totalBankBalance)}
                        </h3>
                    </CardContent>
                </Card>

                {bankAccounts.map(acc => (
                    <Card key={acc.id} className="border-none shadow-sm bg-white hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedAccountId(acc.id)}>
                        <CardContent className="p-4">
                           <div className="flex items-center justify-between mb-1">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{acc.code}</p>
                                <Building2 className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                           </div>
                           <h4 className="text-sm font-semibold text-slate-900 truncate mb-1">{acc.name}</h4>
                           <p className="text-lg font-bold text-indigo-600 font-mono">{formatCurrency(acc.balance)}</p>
                        </CardContent>
                    </Card>
                )).slice(0, 3)}
            </div>

            <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)} className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <TabsList className="bg-white border border-gray-100 p-1">
                        <TabsTrigger value="all" className="px-6 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">Semua</TabsTrigger>
                        <TabsTrigger value="in" className="px-6 data-[state=active]:bg-green-50 data-[state=active]:text-green-600">Masuk</TabsTrigger>
                        <TabsTrigger value="out" className="px-6 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600">Keluar</TabsTrigger>
                    </TabsList>

                    <div className="flex flex-1 items-center gap-2 justify-end">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari transaksi bank..."
                                className="pl-9 h-9 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger className="h-9 w-full md:w-48 bg-white border-slate-200">
                                <SelectValue placeholder="Pilih Bank" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Rekening</SelectItem>
                                {bankAccounts.map(acc => (
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
                                                {sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
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
                                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                                    <span className="text-sm text-slate-400">Memuat data transaksi...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTransactions.length > 0 ? (
                                        filteredTransactions.map((tx, idx) => (
                                            <TableRow key={tx.id} className="hover:bg-indigo-50/30 transition-colors border-slate-100 group">
                                                <TableCell className="px-6 font-mono text-[13px] text-slate-400">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="px-6 text-[13px] font-medium text-slate-600">
                                                    {new Date(tx.date).toLocaleDateString('id-ID')}
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">{tx.description}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{tx.account_name}</span>
                                                            {tx.reference && <span className="text-[10px] text-indigo-400 font-mono italic">#{tx.reference}</span>}
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
                                                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
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
                                                        <Landmark className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-sm text-slate-400">Tidak ada mutasi bank untuk filter ini.</p>
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
