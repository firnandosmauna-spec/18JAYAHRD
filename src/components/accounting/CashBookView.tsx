import React from 'react';
import { useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Wallet, ArrowUpRight, ArrowDownRight, Filter, Download, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export function CashBookView() {
    const navigate = useNavigate();
    const { accounts, loading: loadingAccounts } = useAccounts();
    const { entries, loading: loadingEntries } = useJournalEntries();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedAccountId, setSelectedAccountId] = React.useState<string>('all');

    // Filter cash and bank accounts (Asset type)
    const cashAccounts = accounts.filter(acc =>
        acc.type === 'asset' &&
        (acc.name.toLowerCase().includes('kas') || acc.name.toLowerCase().includes('bank'))
    );

    const totalCashBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Get journal items related to these cash accounts
    const cashTransactions = entries.flatMap(entry => {
        return (entry.items || [])
            .filter(item => {
                const isCashAcc = cashAccounts.some(ca => ca.id === item.account_id);
                const matchesSelection = selectedAccountId === 'all' || item.account_id === selectedAccountId;
                return isCashAcc && matchesSelection;
            })
            .map(item => ({
                id: `${entry.id}-${item.account_id}`,
                date: entry.date,
                reference: entry.reference,
                description: item.description || entry.description,
                account_name: item.account_name,
                debit: item.debit,   // Cash In
                credit: item.credit, // Cash Out
                status: entry.status
            }));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredTransactions = cashTransactions.filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Buku Kas & Bank</h2>
                    <p className="text-muted-foreground">Rincian mutasi kas dan bank secara real-time</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => navigate('/accounting/cash-in')}
                    >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Kas Masuk
                    </Button>
                    <Button
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => navigate('/accounting/cash-out')}
                    >
                        <ArrowDownRight className="w-4 h-4 mr-2" />
                        Kas Keluar
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-blue-100 text-sm font-medium">Total Saldo Kas & Bank</p>
                            <Wallet className="w-5 h-5 text-blue-200" />
                        </div>
                        <h3 className="text-2xl font-bold font-mono">
                            {loadingAccounts ? '...' : formatCurrency(totalCashBalance)}
                        </h3>
                    </CardContent>
                </Card>

                {cashAccounts.slice(0, 2).map(acc => (
                    <Card key={acc.id} className="border-none shadow-sm h-full">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-gray-500 text-sm font-medium">{acc.name}</p>
                                <div className="p-1 bg-gray-50 rounded">
                                    <Wallet className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 font-mono">
                                {formatCurrency(acc.balance)}
                            </h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter & List */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-1 items-center gap-4">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Cari transaksi..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger className="w-full md:w-56">
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
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Ekspor
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="px-6 font-semibold">Tanggal</TableHead>
                                    <TableHead className="px-6 font-semibold">Akun</TableHead>
                                    <TableHead className="px-6 font-semibold">Keterangan</TableHead>
                                    <TableHead className="px-6 font-semibold text-right">Masuk (Debit)</TableHead>
                                    <TableHead className="px-6 font-semibold text-right">Keluar (Kredit)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingEntries ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
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
                                                    <span className="text-sm text-gray-900">{tx.description}</span>
                                                    {tx.reference && <span className="text-xs text-gray-500 font-mono">{tx.reference}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 text-right text-sm font-mono text-green-600 font-medium">
                                                {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                            </TableCell>
                                            <TableCell className="px-6 text-right text-sm font-mono text-rose-600 font-medium">
                                                {tx.credit > 0 ? `(${formatCurrency(tx.credit)})` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                            Tidak ada transaksi kas ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
