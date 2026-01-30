import React from 'react';
import { useAccounts, useLedger } from '../../hooks/useAccounting';
import { accountingService } from '../../services/accountingService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Calendar, Download, Printer, Search, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function LedgerView() {
    const { accounts } = useAccounts();
    const [selectedAccountId, setSelectedAccountId] = React.useState<string>('');
    const [dateRange, setDateRange] = React.useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const { ledgerItems, loading, refresh } = useLedger(selectedAccountId, dateRange.start, dateRange.end);
    const [openingBalance, setOpeningBalance] = React.useState(0);
    const [fetchingOpening, setFetchingOpening] = React.useState(false);

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    React.useEffect(() => {
        const fetchOpening = async () => {
            if (!selectedAccountId) return;
            setFetchingOpening(true);
            try {
                const bal = await accountingService.getOpeningBalance(selectedAccountId, dateRange.start);
                setOpeningBalance(bal);
            } catch (err) {
                console.error('Error fetching opening balance:', err);
            } finally {
                setFetchingOpening(false);
            }
        };
        fetchOpening();
    }, [selectedAccountId, dateRange.start]);

    let runningBalance = openingBalance;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Buku Besar</h2>
                    <p className="text-muted-foreground">Rincian transaksi per akun</p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Tanggal,Ref,Memo,Debit,Kredit,Saldo\n" +
                            ledgerItems.map(item => `${item.journal.date},${item.journal.reference},${item.description || item.journal.description},${item.debit},${item.credit}`).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `Buku_Besar_${selectedAccount?.name || 'Akun'}.csv`);
                        document.body.appendChild(link);
                        link.click();
                    }}>
                        <Download className="w-4 h-4 mr-2" />
                        Ekspor
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" />
                        Cetak
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Pilih Akun</Label>
                            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih akun..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.code} - {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Mulai</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Selesai</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!selectedAccountId ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Pilih Akun</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">Silakan pilih akun terlebih dahulu untuk melihat rincian buku besar.</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accounting" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">Tanggal</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">Referensi</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">Keterangan</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100 text-right">Debit</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100 text-right">Kredit</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-gray-50/30">
                                        <td className="px-4 py-3 text-sm text-gray-500 italic" colSpan={3}>Saldo Awal per {new Date(dateRange.start).toLocaleDateString('id-ID')}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-400">-</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-400">-</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono font-medium text-gray-900">
                                            {fetchingOpening ? '...' : formatCurrency(openingBalance)}
                                        </td>
                                    </tr>
                                    {ledgerItems.length > 0 ? (
                                        ledgerItems.map((item, idx) => {
                                            const type = selectedAccount?.type;
                                            const adjustment = (type === 'asset' || type === 'expense')
                                                ? (item.debit - item.credit)
                                                : (item.credit - item.debit);
                                            runningBalance += adjustment;

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                        {new Date(item.journal.date).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                                                        {item.journal.reference || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        <div className="flex flex-col">
                                                            <span>{item.description || item.journal.description}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">
                                                        {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">
                                                        {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-gray-900">
                                                        {formatCurrency(runningBalance)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                Tidak ada transaksi untuk periode ini
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
