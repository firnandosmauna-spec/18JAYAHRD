import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Printer,
  RefreshCw,
  Calendar,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { PurchaseService } from '@/services/purchaseService';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface SupplierBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any;
}

export function SupplierBalanceDialog({ open, onOpenChange, supplier }: SupplierBalanceDialogProps) {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(supplier.deposit_balance || 0);
  const printRef = useRef<HTMLDivElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: sups } = await supabase.from('suppliers').select('id').ilike('name', supplier.name);
      const ids = sups?.map(x => x.id) || [supplier.id];
      const { data: depData } = await supabase.from('supplier_deposits').select('*').in('supplier_id', ids).order('created_at', { ascending: false });
      setDeposits(depData || []);
      const { data: latest } = await supabase.from('suppliers').select('deposit_balance').eq('id', supplier.id).single();
      if (latest) setCurrentBalance(latest.deposit_balance || 0);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAddDeposit = async () => {
    if (!newAmount || Number(newAmount) <= 0) return;
    try {
      setIsSubmitting(true);
      await PurchaseService.addSupplierDeposit({
        supplier_id: supplier.id,
        amount: Number(newAmount),
        type: 'deposit',
        description: newDesc || 'Setoran Deposit Manual'
      });
      setNewAmount('');
      setNewDesc('');
      setIsAdding(false);
      await fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { if (open && supplier?.id) fetchData(); }, [open, supplier?.id]);

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowUrl = '';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
    
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Laporan Riwayat - ${supplier.name}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
              .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .info { margin-bottom: 30px; display: flex; justify-content: space-between; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #f0f0f0; text-align: left; padding: 12px; border: 1px solid #ddd; font-size: 12px; text-transform: uppercase; }
              td { padding: 12px; border: 1px solid #ddd; font-size: 13px; }
              .amt-in { color: green; font-weight: bold; }
              .amt-out { color: red; font-weight: bold; }
              .footer { margin-top: 50px; display: flex; justify-content: space-between; }
              .sig { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 10px; margin-top: 60px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title uppercase">LAPORAN RIWAYAT AKTIVITAS SUPPLIER</div>
              <div>${supplier.name}</div>
            </div>
            <div class="info">
              <div>
                <strong>ID Supplier:</strong> ${supplier.code}<br>
                <strong>Kontak:</strong> ${supplier.phone || '-'}<br>
                <strong>Dicetak pada:</strong> ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })}
              </div>
              <div style="text-align: right">
                <strong>SALDO AKHIR:</strong><br>
                <span style="font-size: 20px; font-weight: bold">Rp ${currentBalance.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Tipe</th>
                  <th style="text-align: right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                ${deposits.map(d => {
                  const isOut = ['usage', 'payment', 'out', 'bayar', 'penggunaan'].includes(d.type?.toLowerCase());
                  return `
                    <tr>
                      <td>${format(new Date(d.created_at), 'dd/MM/yyyy HH:mm')}</td>
                      <td>${d.description || '-'}</td>
                      <td>${isOut ? 'Keluar' : 'Masuk'}</td>
                      <td style="text-align: right" class="${isOut ? 'amt-out' : 'amt-in'}">
                        ${isOut ? '-' : '+'}${Number(String(d.amount).replace(/[^0-9]/g, '')).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <div class="footer">
              <div class="sig">Bagian Keuangan</div>
              <div class="sig">Penerima / Supplier</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 pb-4 bg-slate-900 text-white rounded-t-3xl">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Wallet className="w-8 h-8 text-orange-400" /></div>
              <div>
                <div className="text-3xl font-black tracking-tight">{supplier.name}</div>
                <div className="text-white/50 text-sm font-medium flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-white/20 text-white/70 font-mono">{supplier.code}</Badge>
                  • Riwayat Keuangan
                </div>

          {isAdding && (
            <Card className="mb-8 border-none shadow-xl bg-white rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Setoran (Rp)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</div>
                      <input 
                        type="number" 
                        value={newAmount} 
                        onChange={e => setNewAmount(e.target.value)}
                        placeholder="0" 
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-4 font-mono font-black text-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Referensi</label>
                    <input 
                      type="text" 
                      value={newDesc} 
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="Contoh: Setoran tunai, transfer Bank ABC, dll." 
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleAddDeposit} 
                    disabled={isSubmitting || !newAmount}
                    className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95"
                  >
                    {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
                    Simpan Setoran
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Saldo Deposit</div>
              <div className="text-4xl font-black text-orange-400 font-mono tracking-tighter">{formatCurrency(currentBalance)}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="flex items-center justify-between mb-8">
             <div className="space-y-1">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                  <History className="w-5 h-5 text-slate-400" /> AKTIVITAS TERBARU
                </h3>
                <p className="text-xs text-slate-400 font-medium">Daftar semua transaksi setoran dan penggunaan saldo.</p>
             </div>
             <div className="flex gap-2">
                <Button onClick={() => setIsAdding(!isAdding)} className={`h-10 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isAdding ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
                  {isAdding ? <X className="w-4 h-4 mr-2" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                  {isAdding ? 'Batal' : 'Tambah Saldo'}
                </Button>
                <Button onClick={fetchData} variant="outline" size="sm" className="h-10 rounded-xl bg-white border-slate-200 text-slate-600 hover:bg-slate-100 transition-all active:scale-95">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sinkron
                </Button>
                <Button onClick={handlePrint} className="h-10 rounded-xl bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 font-bold">
                  <Printer className="w-4 h-4 mr-2" /> Cetak Laporan
                </Button>
             </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="w-12 h-12 text-slate-300 animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">Memuat riwayat transaksi...</p>
            </div>
          ) : deposits.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <FileText className="w-16 h-16 text-slate-100 mx-auto mb-4" />
               <p className="text-slate-400 font-bold">Belum ada aktivitas transaksi yang tercatat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deposits.map((d) => {
                const isOut = ['usage', 'payment', 'out', 'bayar', 'penggunaan'].includes(d.type?.toLowerCase());
                return (
                  <Card key={d.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-xl ${isOut ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {isOut ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-lg">{d.description || (isOut ? 'Penggunaan Saldo' : 'Setoran Deposit')}</div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(d.created_at), 'dd MMMM yyyy, HH:mm', { locale: idLocale })}
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className={isOut ? 'text-rose-400' : 'text-emerald-400'}>{d.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-black font-mono tracking-tighter ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isOut ? '-' : '+'}{formatCurrency(Number(String(d.amount).replace(/[^0-9]/g, '')))}
                        </div>
                        {!isOut && <div className="text-[10px] font-black text-emerald-500 flex items-center justify-end gap-1 mt-1 uppercase"><CheckCircle2 className="w-3 h-3" /> Terverifikasi</div>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dokumen Elektronik • Terintegrasi Supabase DB</p>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold hover:bg-slate-200 transition-colors">
            Tutup Jendela
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
