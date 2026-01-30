import React from 'react';
import { useJournalEntries, useAccounts } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Trash2, Save, Loader2, ArrowLeft, History } from 'lucide-react';
import { toast } from '../../components/ui/use-toast';
import { accountingService } from '../../services/accountingService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { formatCurrency, cn } from '../../lib/utils';
import { JournalItem } from '../../types/accounting';
import { Badge } from '../../components/ui/badge';

export function JournalEntryView() {
    const { entries, loading: loadingEntries, refresh } = useJournalEntries();
    const { accounts } = useAccounts();
    const [showForm, setShowForm] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [formData, setFormData] = React.useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        items: [
            { account_id: '', debit: 0, credit: 0 },
            { account_id: '', debit: 0, credit: 0 },
        ] as any[],
    });

    const totalDebit = formData.items.reduce((sum, item) => sum + Number(item.debit), 0);
    const totalCredit = formData.items.reduce((sum, item) => sum + Number(item.credit), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { account_id: '', debit: 0, credit: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        if (formData.items.length <= 2) return;
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // If setting debit, set credit to 0 and vice-versa (standard simple entry behavior)
        if (field === 'debit' && value > 0) newItems[index].credit = 0;
        if (field === 'credit' && value > 0) newItems[index].debit = 0;

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            toast({
                title: 'Entry tidak seimbang',
                description: 'Total Debit harus sama dengan Total Kredit.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setIsSubmitting(true);
            // Map item names for display if needed or let service handle it
            const formattedItems = formData.items.map(item => {
                const acc = accounts.find(a => a.id === item.account_id);
                return {
                    ...item,
                    account_name: acc?.name || '',
                    account_code: acc?.code || '',
                    debit: Number(item.debit),
                    credit: Number(item.credit)
                };
            });

            await accountingService.createJournalEntry({
                ...formData,
                items: formattedItems as any,
                created_by: 'Administrator', // Dummy for now
            } as any);

            toast({
                title: 'Jurnal Umum berhasil disimpan',
                variant: 'default',
            });
            setShowForm(false);
            refresh();
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                reference: '',
                items: [
                    { account_id: '', debit: 0, credit: 0 },
                    { account_id: '', debit: 0, credit: 0 },
                ],
            });
        } catch (err: any) {
            toast({
                title: 'Gagal menyimpan jurnal',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showForm) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Input Jurnal Umum</h2>
                        <p className="text-muted-foreground">Catat transaksi keuangan baru</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Informasi Umum</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="date">Tanggal</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">Keterangan / Memo</Label>
                                <Input
                                    id="description"
                                    placeholder="Contoh: Pembayaran sewa kantor Januari"
                                    value={formData.description}
                                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reference">Referensi (Opsional)</Label>
                                <Input
                                    id="reference"
                                    placeholder="No. Invoice / Kwitansi"
                                    value={formData.reference}
                                    onChange={(e) => setFormData(p => ({ ...p, reference: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-white border-b border-gray-100">
                            <CardTitle>Detail Transaksi</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Akun</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Debit</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100">Kredit</th>
                                        <th className="px-6 py-4 text-sm font-semibold text-gray-900 border-b border-gray-100 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {formData.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <Select
                                                    value={item.account_id}
                                                    onValueChange={(val) => updateItem(index, 'account_id', val)}
                                                >
                                                    <SelectTrigger className="border-none shadow-none bg-transparent hover:bg-gray-100 text-left">
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
                                            </td>
                                            <td className="px-6 py-4">
                                                <Input
                                                    type="number"
                                                    className="border-none shadow-none bg-transparent text-right font-mono"
                                                    value={item.debit || ''}
                                                    onChange={(e) => updateItem(index, 'debit', Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Input
                                                    type="number"
                                                    className="border-none shadow-none bg-transparent text-right font-mono"
                                                    value={item.credit || ''}
                                                    onChange={(e) => updateItem(index, 'credit', Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-rose-500"
                                                    onClick={() => removeItem(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/80 font-bold">
                                        <td className="px-6 py-4 text-right text-sm">TOTAL</td>
                                        <td className="px-6 py-4 text-right text-sm font-mono">{formatCurrency(totalDebit)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-mono">{formatCurrency(totalCredit)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addItem}
                            className="border-dashed border-gray-300 hover:border-accounting hover:text-accounting"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Baris
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium",
                                isBalanced ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                            )}>
                                {isBalanced ? "Seimbang" : "Belum Seimbang"}
                            </div>
                            <Button
                                type="submit"
                                className="bg-accounting hover:bg-accounting-dark text-white min-w-[120px]"
                                disabled={!isBalanced || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Simpan Jurnal
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Jurnal Umum</h2>
                    <p className="text-muted-foreground">Daftar transaksi akuntansi yang telah diposting</p>
                </div>
                <Button
                    className="bg-accounting hover:bg-accounting-dark text-white"
                    onClick={() => setShowForm(true)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Jurnal Baru
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {loadingEntries ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accounting" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {entries.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {entries.map((entry) => (
                                        <div key={entry.id} className="p-6 transition-colors hover:bg-gray-50/50">
                                            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-gray-100 rounded-lg">
                                                        <History className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{entry.description}</h4>
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(entry.date).toLocaleDateString('id-ID', { dateStyle: 'long' })} • {entry.reference || 'Tanpa referensi'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 capitalize">
                                                        {entry.status}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50/50">
                                                        <tr>
                                                            <th className="px-4 py-2 border-b border-gray-100">Akun</th>
                                                            <th className="px-4 py-2 border-b border-gray-100 text-right">Debit</th>
                                                            <th className="px-4 py-2 border-b border-gray-100 text-right">Kredit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {entry.items?.map((item: any, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-2">
                                                                    <span className="font-medium text-gray-700">{item.account_code}</span> - {item.account_name}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-mono">
                                                                    {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-mono">
                                                                    {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Plus className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Belum Ada Jurnal</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto mb-6">Mulai dengan mencatat transaksi keuangan pertama Anda.</p>
                                    <Button variant="outline" onClick={() => setShowForm(true)}>Buat Jurnal Pertama</Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
