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
import { CreditCard, Banknote, Wallet, Receipt, Loader2, Upload, Printer, CheckCircle2 } from 'lucide-react';
import { ConsumerProfile } from './MarketingTypes';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import KwitansiReceipt from './KwitansiReceipt';
import { useAuth } from '@/contexts/AuthContext';

interface BookingPOSProps {
    consumer: ConsumerProfile | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BookingPOS({ consumer, isOpen, onClose, onSuccess }: BookingPOSProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [processedReceipt, setProcessedReceipt] = useState<{
        receiptNumber: string;
        amount: number;
        description: string;
        date: Date;
    } | null>(null);

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

            // 2. Generate Receipt Number (using a more professional format)
            const year = format(new Date(), 'yyyy');
            const month = format(new Date(), 'MM');
            const random = Math.floor(1000 + Math.random() * 9000);
            const receipt_number = `${year}${month}${random}`;

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
                    attachment_url,
                    created_by: user?.id
                });

            if (txError) throw txError;

            // 4. Update Consumer Status
            if (form.transaction_type === 'booking_fee') {
                await supabase
                    .from('consumer_profiles')
                    .update({ booking_fee_status: 'paid' })
                    .eq('id', consumer.id);
                
                // Also update pemberkasan date
                const { data: pData } = await supabase
                    .from('consumer_pemberkasan')
                    .select('id')
                    .eq('consumer_id', consumer.id)
                    .single();
                
                const updates = { 
                    booking: true,
                    booking_date: new Date(form.payment_date).toISOString() 
                };

                if (pData) {
                    await supabase
                        .from('consumer_pemberkasan')
                        .update(updates)
                        .eq('id', pData.id);
                } else {
                    await supabase
                        .from('consumer_pemberkasan')
                        .insert({
                            consumer_id: consumer.id,
                            ...updates
                        });
                }

                // Log movement
                const { data: pDataNew } = await supabase
                    .from('consumer_pemberkasan')
                    .select('id')
                    .eq('consumer_id', consumer.id)
                    .single();
                
                if (pDataNew) {
                    await supabase
                        .from('consumer_pemberkasan_logs')
                        .insert({
                            pemberkasan_id: pDataNew.id,
                            stage_key: 'booking',
                            status: true,
                            notes: `Booking Fee Sebesar Rp ${form.amount.toLocaleString()} telah lunas`,
                            created_by: user?.id
                        });
                }
            }

            // 5. Set receipt info for preview
            const description = `${form.transaction_type === 'booking_fee' ? 'Pembayaran Booking Fee' : 
                                   form.transaction_type === 'dp' ? 'Pembayaran Down Payment (DP)' : 
                                   'Pembayaran Angsuran'} Unit ${consumer.housing_project || ''} Blok ${consumer.housing_block_no || ''}. ${form.notes}`;
            
            setProcessedReceipt({
                receiptNumber: receipt_number,
                amount: form.amount,
                description,
                date: new Date(form.payment_date)
            });

            toast({
                title: "Transaksi Berhasil",
                description: `Pembayaran telah dicatat dengan No. Kwitansi ${receipt_number}`,
            });

            setShowReceipt(true);
            onSuccess();
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

    const handlePrint = () => {
        window.print();
    };

    if (!consumer) return null;

    return (
        <>
            <Dialog open={isOpen && !showReceipt} onOpenChange={onClose}>
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
                                    <div className="flex items-center gap-1">
                                        <Banknote className="w-6 h-6" />
                                        <span className="font-bold text-xs">Rp</span>
                                    </div>
                                    <span>Tunai (Cash)</span>
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
                                <span className="text-xs text-slate-500 text-center">
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

            {/* Receipt Preview Dialog */}
            <Dialog open={showReceipt} onOpenChange={(open) => !open && setShowReceipt(false)}>
                <DialogContent className="max-w-[850px] p-0 bg-slate-100 border-none">
                    <div className="p-4 bg-white border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 rounded-full">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="font-bold">Transaksi Berhasil Dicatat</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="w-4 h-4 mr-2" />
                                Cetak Kwitansi
                            </Button>
                            <Button size="sm" onClick={onClose}>
                                Tutup
                            </Button>
                        </div>
                    </div>
                    <div className="p-8 flex justify-center overflow-y-auto max-h-[80vh]">
                        {processedReceipt && (
                            <KwitansiReceipt 
                                receiptNumber={processedReceipt.receiptNumber}
                                receivedFrom={consumer.name}
                                amount={processedReceipt.amount}
                                description={processedReceipt.description}
                                date={processedReceipt.date}
                                recipientName={user?.name || 'HASANUDDIN'}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
