import React from 'react';
import { useAccounts, useJournalEntries } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Loader2, ArrowDownRight } from 'lucide-react';
import { toast } from '../../components/ui/use-toast';
import { accountingService } from '../../services/accountingService';
import { formatCurrency } from '../../lib/utils';
import { AccountingNativeSelect } from './AccountingNativeSelect';

import { useAuth } from '../../contexts/AuthContext';

export function CashOutView() {
    const { user } = useAuth();
    const { accounts, loading: loadingAccounts } = useAccounts();
    const { refresh } = useJournalEntries(500);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [formData, setFormData] = React.useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        amount: 0,
        source_account_id: '',      // Assets (Cash/Bank) - CREDIT
        destination_account_id: '', // Expense/Asset/Liability - DEBIT
    });

    // Filter accounts for source (Cash/Bank usually under assets)
    const assetAccounts = accounts.filter(a => a.type === 'asset');
    // Filter accounts for destination (Any account)
    const destAccounts = accounts.filter(a => ['expense', 'asset', 'liability', 'equity'].includes(a.type));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.source_account_id || !formData.destination_account_id || formData.amount <= 0 || isNaN(Number(formData.amount))) {
            toast({
                title: 'Input tidak valid',
                description: 'Mohon lengkapi semua data dan pastikan jumlah lebih dari 0.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setIsSubmitting(true);

            const srcAccount = accounts.find(a => a.id === formData.source_account_id);
            const destAccount = accounts.find(a => a.id === formData.destination_account_id);

            const journalData = {
                date: formData.date,
                description: formData.description,
                reference: formData.reference,
                items: [
                    {
                        account_id: formData.destination_account_id,
                        account_code: destAccount?.code || '',
                        account_name: destAccount?.name || '',
                        debit: Number(formData.amount),
                        credit: 0
                    },
                    {
                        account_id: formData.source_account_id,
                        account_code: srcAccount?.code || '',
                        account_name: srcAccount?.name || '',
                        debit: 0,
                        credit: Number(formData.amount)
                    }
                ],
                created_by: user?.id || null
            };

            await accountingService.createJournalEntry(journalData as any);

            toast({
                title: 'Kas Keluar berhasil dicatat',
                description: `Pengeluaran sebesar ${formatCurrency(formData.amount)} telah disimpan.`,
                variant: 'default',
            });

            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                reference: '',
                amount: 0,
                source_account_id: '',
                destination_account_id: '',
            });
            refresh();
        } catch (err: any) {
            console.error('Error recording Cash Out:', err);
            toast({
                title: 'Gagal mencatat kas keluar',
                description: err.message || 'Terjadi kesalahan pada server (400)',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-rose-50 rounded-lg">
                    <ArrowDownRight className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Kas Keluar</h2>
                    <p className="text-muted-foreground">Catat pengeluaran kas atau bank</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Detail Transaksi</CardTitle>
                        <CardDescription>Masukan informasi pengeluaran dana</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="space-y-2">
                                <Label htmlFor="reference">No. Referensi (Opsional)</Label>
                                <Input
                                    id="reference"
                                    placeholder="Contoh: KK-001, No. Invoice"
                                    value={formData.reference}
                                    onChange={(e) => setFormData(p => ({ ...p, reference: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Keterangan</Label>
                            <Input
                                id="description"
                                placeholder="Contoh: Pembayaran listrik, Pembelian ATK, Gaji karyawan"
                                value={formData.description}
                                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Sumber Dana (Kas/Bank)</Label>
                                <AccountingNativeSelect
                                    value={formData.source_account_id}
                                    onChange={(e) => setFormData(p => ({ ...p, source_account_id: e.target.value }))}
                                >
                                    <option value="">Pilih akun kas...</option>
                                    {assetAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </AccountingNativeSelect>
                                {formData.source_account_id && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Saldo Sekarang:</span>
                                            <span className="text-xs font-bold text-rose-600">
                                                {formatCurrency(accounts.find(a => a.id === formData.source_account_id)?.balance || 0)}
                                            </span>
                                        </div>
                                        {formData.amount > (accounts.find(a => a.id === formData.source_account_id)?.balance || 0) && (
                                            <span className="text-[10px] font-bold text-rose-500 animate-pulse">
                                                ⚠ Saldo tidak mencukupi
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Tujuan / Beban (Akun Debit)</Label>
                                <AccountingNativeSelect
                                    value={formData.destination_account_id}
                                    onChange={(e) => setFormData(p => ({ ...p, destination_account_id: e.target.value }))}
                                >
                                    <option value="">Pilih tujuan...</option>
                                    {destAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </AccountingNativeSelect>
                                {formData.destination_account_id && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Saldo Sekarang:</span>
                                        <span className="text-xs font-bold text-gray-700">
                                            {formatCurrency(accounts.find(a => a.id === formData.destination_account_id)?.balance || 0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Jumlah (IDR)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="any"
                                placeholder="0"
                                className="text-lg font-mono text-rose-600"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData(p => ({ ...p, amount: Number(e.target.value) }))}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button
                        type="submit"
                        className="bg-rose-600 hover:bg-rose-700 text-white min-w-[150px]"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Simpan Kas Keluar
                    </Button>
                </div>
            </form>
        </div>
    );
}
