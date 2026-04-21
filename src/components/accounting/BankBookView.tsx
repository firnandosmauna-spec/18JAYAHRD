import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    Edit,
    Landmark,
    Loader2,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';
import { useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { accountingService } from '../../services/accountingService';
import { formatCurrency } from '../../lib/utils';
import { toast } from '../../components/ui/use-toast';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { DatePreset, getDatePresetRange, getDateRangeLabel, SortOrder, TransactionFilterType } from './bookDateUtils';

function FilterSelect({
    value,
    onChange,
    children,
}: {
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </select>
    );
}

export function BankBookView() {
    const navigate = useNavigate();
    const { accounts, loading: loadingAccounts } = useAccounts();
    const { entries, loading: loadingEntries, refresh } = useJournalEntries(2000);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedAccountId, setSelectedAccountId] = React.useState<string>('all');
    const [filterType, setFilterType] = React.useState<TransactionFilterType>('all');
    const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [datePreset, setDatePreset] = React.useState<DatePreset>('all');

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

    const bankAccounts = React.useMemo(
        () =>
            accounts.filter(
                (acc) =>
                    acc.type === 'asset' &&
                    (acc.name.toLowerCase().includes('bank') ||
                        acc.code.startsWith('11') ||
                        acc.code.startsWith('1-1'))
            ),
        [accounts]
    );

    const totalBankBalance = React.useMemo(
        () => bankAccounts.reduce((sum, acc) => sum + acc.balance, 0),
        [bankAccounts]
    );

    const bankTransactions = React.useMemo(() => {
        const raw = entries
            .flatMap((entry) =>
                (entry.items || [])
                    .filter((item) => {
                        const isBankAcc = bankAccounts.some((bankAccount) => bankAccount.id === item.account_id);
                        const matchesSelection = selectedAccountId === 'all' || item.account_id === selectedAccountId;
                        return isBankAcc && matchesSelection;
                    })
                    .map((item) => ({
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
                        created_at: entry.created_at,
                    }))
            )
            .sort((a, b) => {
                const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateCompare !== 0) return dateCompare;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

        const balancesMap = new Map<string, number>();
        bankAccounts.forEach((account) => balancesMap.set(account.id, Number(account.balance || 0)));

        return raw.map((tx) => {
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
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = bankTransactions.filter((tx) => {
            const txDate = tx.date?.slice(0, 10) || '';

            const matchesSearch =
                !normalizedSearch ||
                tx.description.toLowerCase().includes(normalizedSearch) ||
                tx.reference?.toLowerCase().includes(normalizedSearch) ||
                tx.account_name?.toLowerCase().includes(normalizedSearch);

            const matchesType =
                filterType === 'all' ||
                (filterType === 'in' && tx.debit > 0) ||
                (filterType === 'out' && tx.credit > 0);

            const matchesStartDate = !startDate || txDate >= startDate;
            const matchesEndDate = !endDate || txDate <= endDate;

            return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
        });

        return [...filtered].sort((a, b) => {
            const factor = sortOrder === 'desc' ? 1 : -1;
            const dateCompare = (new Date(b.date).getTime() - new Date(a.date).getTime()) * factor;
            if (dateCompare !== 0) return dateCompare;
            return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * factor;
        });
    }, [bankTransactions, searchTerm, filterType, startDate, endDate, sortOrder]);

    const viewTotalDebit = React.useMemo(
        () => filteredTransactions.reduce((sum, tx) => sum + tx.debit, 0),
        [filteredTransactions]
    );

    const viewTotalCredit = React.useMemo(
        () => filteredTransactions.reduce((sum, tx) => sum + tx.credit, 0),
        [filteredTransactions]
    );

    const selectedAccount = selectedAccountId === 'all'
        ? null
        : bankAccounts.find((acc) => acc.id === selectedAccountId) ?? null;

    const activeFilterCount = [
        selectedAccountId !== 'all',
        filterType !== 'all',
        Boolean(searchTerm.trim()),
        Boolean(startDate),
        Boolean(endDate),
    ].filter(Boolean).length;

    const handleApplyDatePreset = (preset: DatePreset) => {
        setDatePreset(preset);

        if (preset === 'all') {
            setStartDate('');
            setEndDate('');
            return;
        }

        const range = getDatePresetRange(preset);
        setStartDate(range.startDate);
        setEndDate(range.endDate);
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        setDatePreset('all');

        if (type === 'start') {
            setStartDate(value);
            return;
        }

        setEndDate(value);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedAccountId('all');
        setFilterType('all');
        setSortOrder('desc');
        setStartDate('');
        setEndDate('');
        setDatePreset('all');
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Buku Bank</h2>
                            <p className="text-sm text-muted-foreground">Mutasi bank dengan filter rekening, jenis, dan periode transaksi.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={() => navigate('/accounting/cash-in')}
                    >
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Kas Masuk
                    </Button>
                    <Button
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => navigate('/accounting/cash-out')}
                    >
                        <ArrowDownRight className="mr-2 h-4 w-4" />
                        Kas Keluar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Saldo Bank</p>
                        <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
                            {loadingAccounts ? '...' : formatCurrency(totalBankBalance)}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {selectedAccount ? selectedAccount.name : `${bankAccounts.length} rekening bank`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-emerald-50/60 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Bank Masuk</p>
                        <div className="mt-2 text-xl font-bold text-emerald-700 font-mono">{formatCurrency(viewTotalDebit)}</div>
                        <p className="mt-1 text-xs text-emerald-700/80">Sesuai filter aktif</p>
                    </CardContent>
                </Card>

                <Card className="border-rose-100 bg-rose-50/60 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Bank Keluar</p>
                        <div className="mt-2 text-xl font-bold text-rose-700 font-mono">{formatCurrency(viewTotalCredit)}</div>
                        <p className="mt-1 text-xs text-rose-700/80">Sesuai filter aktif</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Baris Ditampilkan</p>
                        <div className="mt-2 text-xl font-bold text-slate-900 font-mono">{filteredTransactions.length}</div>
                        <p className="mt-1 text-xs text-slate-500">{getDateRangeLabel(startDate, endDate)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-slate-200 text-slate-600">
                                {activeFilterCount > 0 ? `${activeFilterCount} filter aktif` : 'Tanpa filter tambahan'}
                            </Badge>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                {getDateRangeLabel(startDate, endDate)}
                            </Badge>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start text-slate-600 hover:text-slate-900"
                            onClick={handleResetFilters}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset Filter
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                        <div className="relative lg:col-span-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari keterangan, referensi, atau rekening"
                                className="pl-9"
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <FilterSelect value={selectedAccountId} onChange={setSelectedAccountId}>
                                <option value="all">Semua Rekening</option>
                                {bankAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </option>
                                ))}
                            </FilterSelect>
                        </div>

                        <div className="lg:col-span-2">
                            <FilterSelect value={filterType} onChange={(value) => setFilterType(value as TransactionFilterType)}>
                                <option value="all">Semua Jenis</option>
                                <option value="in">Bank Masuk</option>
                                <option value="out">Bank Keluar</option>
                            </FilterSelect>
                        </div>

                        <div className="lg:col-span-2">
                            <Input
                                type="date"
                                value={startDate}
                                max={endDate || undefined}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <Input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => handleDateChange('end', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant={datePreset === 'today' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleApplyDatePreset('today')}
                                className={datePreset === 'today' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                            >
                                Hari Ini
                            </Button>
                            <Button
                                type="button"
                                variant={datePreset === '7days' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleApplyDatePreset('7days')}
                                className={datePreset === '7days' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                            >
                                7 Hari
                            </Button>
                            <Button
                                type="button"
                                variant={datePreset === 'month' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleApplyDatePreset('month')}
                                className={datePreset === 'month' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                            >
                                Bulan Ini
                            </Button>
                            <Button
                                type="button"
                                variant={datePreset === 'year' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleApplyDatePreset('year')}
                                className={datePreset === 'year' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                            >
                                Tahun Ini
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleApplyDatePreset('all')}>
                                Semua Tanggal
                            </Button>
                        </div>

                        <div className="text-xs text-slate-500">
                            Urutan: {sortOrder === 'desc' ? 'terbaru ke terlama' : 'terlama ke terbaru'}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-slate-50">
                                    <TableHead className="w-[60px] px-4">No</TableHead>
                                    <TableHead className="w-[130px] px-4">
                                        <button
                                            className="flex items-center gap-1 text-left font-medium text-slate-600 hover:text-slate-900"
                                            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                                        >
                                            Tanggal
                                            {sortOrder === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                        </button>
                                    </TableHead>
                                    <TableHead className="min-w-[280px] px-4">Keterangan</TableHead>
                                    <TableHead className="w-[150px] px-4 text-right">Masuk</TableHead>
                                    <TableHead className="w-[150px] px-4 text-right">Keluar</TableHead>
                                    <TableHead className="w-[170px] px-4 text-right">Saldo</TableHead>
                                    <TableHead className="w-[90px] px-4 text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loadingEntries ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                                                <span className="text-sm text-slate-500">Memuat transaksi bank...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((tx, idx) => (
                                        <TableRow key={tx.id} className="group border-slate-100">
                                            <TableCell className="px-4 font-mono text-xs text-slate-400">{idx + 1}</TableCell>
                                            <TableCell className="px-4 text-sm text-slate-700">
                                                {new Date(tx.date).toLocaleDateString('id-ID')}
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="space-y-1">
                                                    <div className="text-sm font-medium leading-snug text-slate-900">{tx.description}</div>
                                                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                                            {tx.account_name}
                                                        </span>
                                                        {tx.reference ? (
                                                            <span className="font-mono text-slate-500">#{tx.reference}</span>
                                                        ) : null}
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                tx.status === 'posted'
                                                                    ? 'border-indigo-200 text-indigo-700'
                                                                    : 'border-amber-200 text-amber-700'
                                                            }
                                                        >
                                                            {tx.status === 'posted' ? 'Posted' : tx.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 text-right font-mono text-sm font-semibold text-emerald-600">
                                                {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                            </TableCell>
                                            <TableCell className="px-4 text-right font-mono text-sm font-semibold text-rose-600">
                                                {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                            </TableCell>
                                            <TableCell className="px-4 text-right font-mono text-sm font-bold text-slate-900">
                                                {formatCurrency(tx.running_balance)}
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                                                        onClick={() => navigate(`/accounting/journal?edit=${tx.journal_id}`)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                                        onClick={() => handleDelete(tx.journal_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-56 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                    <Building2 className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-slate-700">Tidak ada transaksi untuk filter ini.</p>
                                                    <p className="text-xs text-slate-500">Coba ubah rekening, jenis transaksi, atau rentang tanggal.</p>
                                                </div>
                                            </div>
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
