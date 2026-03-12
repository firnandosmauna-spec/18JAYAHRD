import React from 'react';
import { useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Wallet, ArrowUpRight, ArrowDownRight, Filter, Download, Loader2, Trash2, Edit } from 'lucide-react';
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

    // Get journal items related to these cash accounts
    const cashTransactionsRaw = entries.flatMap(entry => {
        return (entry.items || [])
            .filter(item => {
                const isCashAcc = cashAccounts.some(ca => ca.id === item.account_id);
                const matchesSelection = selectedAccountId === 'all' || item.account_id === selectedAccountId;
                return isCashAcc && matchesSelection;
            })
            .map(item => ({
                id: `${entry.id}-${item.account_id}`,
                journal_id: entry.id,
                account_id: item.account_id,
                date: entry.date,
                reference: entry.reference,
                description: item.description || entry.description,
                account_name: item.account_name,
                debit: item.debit,   // Cash In
                credit: item.credit, // Cash Out
                fullEntry: entry,
                created_at: entry.created_at
            }));
    }).sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        // If same date, use created_at as tie-breaker (DESC)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Calculate running balance working backwards from current balance
    const accountBalancesMap = new Map<string, number>();
    cashAccounts.forEach(acc => accountBalancesMap.set(acc.id, acc.balance));

    const cashTransactions = cashTransactionsRaw.map(tx => {
        const currentBalance = accountBalancesMap.get(tx.account_id) || 0;
        const txWithBalance = { ...tx, running_balance: currentBalance };

        // Only 'posted' transactions should impact the running balance
        if (tx.fullEntry.status === 'posted') {
            const newBalance = currentBalance - (tx.debit - tx.credit);
            accountBalancesMap.set(tx.account_id, newBalance);
        }

        return txWithBalance;
    });

    const filteredTransactions = cashTransactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' ||
            (filterType === 'in' && tx.debit > 0) ||
            (filterType === 'out' && tx.credit > 0);

        return matchesSearch && matchesType;
    });

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

                <Card className="border-none shadow-sm overflow-hidden min-h-[400px]">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="px-6 font-semibold">Tanggal</TableHead>
                                        <TableHead className="px-6 font-semibold">Akun</TableHead>
                                        <TableHead className="px-6 font-semibold">Keterangan</TableHead>
                                        <TableHead className="px-6 font-semibold text-right">Debit (+)</TableHead>
                                        <TableHead className="px-6 font-semibold text-right">Kredit (-)</TableHead>
                                        <TableHead className="px-6 font-semibold text-right">Saldo</TableHead>
                                        <TableHead className="px-6 font-semibold text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingEntries ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-64 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTransactions.length > 0 ? (
                                        filteredTransactions.map((tx) => (
                                            <TableRow key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <TableCell className="px-6 text-sm text-gray-600">
                                                    {new Date(tx.date).toLocaleDateString('id-ID')}
                                                </TableCell>
                                                <TableCell className="px-6">
                                                    <span className="text-sm font-medium text-gray-900">{tx.account_name}</span>
                                                </TableCell>
                                                <TableCell className="px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-900 line-clamp-1">{tx.description}</span>
                                                        {tx.reference && <span className="text-xs text-gray-500 font-mono">{tx.reference}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 text-right text-sm font-mono text-green-600 font-bold">
                                                    {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                                </TableCell>
                                                <TableCell className="px-6 text-right text-sm font-mono text-rose-600 font-bold">
                                                    {tx.credit > 0 ? `(${formatCurrency(tx.credit)})` : '-'}
                                                </TableCell>
                                                <TableCell className="px-6 text-right text-sm font-mono text-gray-900 font-bold">
                                                    {formatCurrency(tx.running_balance)}
                                                </TableCell>
                                                <TableCell className="px-6 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                                            onClick={() => navigate(`/accounting/journal?edit=${tx.journal_id}`)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-rose-600"
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
                                            <TableCell colSpan={7} className="h-64 text-center text-gray-500 underline decoration-gray-200">
                                                Tidak ada transaksi kas ditemukan.
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
