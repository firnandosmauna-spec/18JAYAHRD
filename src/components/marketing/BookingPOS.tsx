import React, { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, DollarSign, Receipt, Loader2, Upload } from 'lucide-react';
import { ConsumerProfile } from './MarketingTypes';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';

interface BookingPOSProps {
    consumer: ConsumerProfile | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BookingPOS({ consumer, isOpen, onClose, onSuccess }: BookingPOSProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        amount: 0,
        transaction_type: 'booking_fee' as 'booking_fee' | 'dp' | 'installment',
        payment_method: 'transfer' as 'cash' | 'transfer' | 'edc',
        notes: '',
        payment_date: format(new Date(), 'yyyy-MM-dd')
    });
    const [attachment, setAttachment] = useState<File | null>(null);

    const handleProcess = async () => {
        if (!consumer) return;
        if (form.amount <= 0) {
            toast({ title: "Nominal tidak valid", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            let attachment_url = '';

            // 1. Upload Attachment if any
            if (attachment) {
                const fileExt = attachment.name.split('.').pop();
                const fileName = `tx_${consumer.id}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('transaction_proofs')
                    .upload(fileName, attachment);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('transaction_proofs')
                    .getPublicUrl(fileName);
                
                attachment_url = publicUrl;
            }

            // 2. Generate Receipt Number (using RPC or manual logic)
            // For now, we use a simple format or let DB handle it if possible
            const receipt_number = `RCP-${format(new Date(), 'yyyyMMdd')}-${Math.floor(1000 + Math.random() * 9000)}`;

            // 3. Save Transaction
            const { error: txError } = await supabase
                .from('consumer_transactions')
                .insert({
                    consumer_id: consumer.id,
                    amount: form.amount,
                    transaction_type: form.transaction_type,
                    payment_method: form.payment_method,
                    payment_date: new Date(form.payment_date).toISOString(),
                    receipt_number,
                    notes: form.notes,
                    attachment_url
                });

            if (txError) throw txError;

            // 4. Update Consumer Status
            if (form.transaction_type === 'booking_fee') {
                await supabase
                    .from('consumer_profiles')
                    .update({ booking_fee_status: 'paid' })
                    .eq('id', consumer.id);
                
                // Also update pemberkasan date if exists
                const { data: pData } = await supabase
                    .from('consumer_pemberkasan')
                    .select('id')
                    .eq('consumer_id', consumer.id)
                    .single();
                
                if (pData) {
                    await supabase
                        .from('consumer_pemberkasan')
                        .update({ booking_date: new Date(form.payment_date).toISOString() })
                        .eq('id', pData.id);
                } else {
                    await supabase
                        .from('consumer_pemberkasan')
                        .insert({
                            consumer_id: consumer.id,
                            booking_date: new Date(form.payment_date).toISOString()
                        });
                }
            }

            toast({
                title: "Transaksi Berhasil",
                description: `Pembayaran ${form.transaction_type} telah dicatat dengan No. Kwitansi ${receipt_number}`,
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('POS Error:', error);
            toast({
                title: "Gagal memproses transaksi",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (!consumer) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-blue-600" />
                        POS Booking & Pembayaran
                    </DialogTitle>
                    <DialogDescription>
                        Proses pembayaran untuk konsumen: <span className="font-bold text-slate-900">{consumer.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipe Transaksi</Label>
                            <Select 
                                value={form.transaction_type}
                                onValueChange={(val: any) => setForm({ ...form, transaction_type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="booking_fee">Booking Fee</SelectItem>
                                    <SelectItem value="dp">Down Payment (DP)</SelectItem>
                                    <SelectItem value="installment">Angsuran</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Bayar</Label>
                            <Input 
                                type="date"
                                value={form.payment_date}
                                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nominal Pembayaran (Rp)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                            <Input 
                                type="number"
                                className="pl-9 text-lg font-bold text-blue-700"
                                placeholder="0"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Metode Pembayaran</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Button 
                                variant={form.payment_method === 'cash' ? 'default' : 'outline'}
                                className="h-20 flex-col gap-2"
                                onClick={() => setForm({ ...form, payment_method: 'cash' })}
                            >
                                <DollarSign className="w-6 h-6" />
                                <span>Tunai</span>
                            </Button>
                            <Button 
                                variant={form.payment_method === 'transfer' ? 'default' : 'outline'}
                                className="h-20 flex-col gap-2"
                                onClick={() => setForm({ ...form, payment_method: 'transfer' })}
                            >
                                <CreditCard className="w-6 h-6" />
                                <span>Transfer</span>
                            </Button>
                            <Button 
                                variant={form.payment_method === 'edc' ? 'default' : 'outline'}
                                className="h-20 flex-col gap-2"
                                onClick={() => setForm({ ...form, payment_method: 'edc' })}
                            >
                                <Receipt className="w-6 h-6" />
                                <span>EDC</span>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Bukti Bayar (Optional)</Label>
                        <div 
                            className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => document.getElementById('pos-attachment')?.click()}
                        >
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-xs text-slate-500">
                                {attachment ? attachment.name : "Klik untuk unggah foto/bukti transfer"}
                            </span>
                            <input 
                                id="pos-attachment"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => e.target.files && setAttachment(e.target.files[0])}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Catatan</Label>
                        <Textarea 
                            placeholder="Keterangan tambahan..."
                            className="h-20 resize-none"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
                    <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleProcess}
                        disabled={loading || form.amount <= 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <Receipt className="w-4 h-4 mr-2" />
                                Simpan Transaksi & Cetak
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
