import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Wallet,
  FileText,
  RefreshCw,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Settings2,
  User,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/usePurchase';
import type { Supplier } from '@/types/purchase';
import { PurchaseService } from '@/services/purchaseService';
import { supplierDebtService } from '@/services/supplierDebtService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierBalanceDialog } from './SupplierBalanceDialog';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function SupplierManagement() {
  const { suppliers, loading, refetch } = useSuppliers();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);

  const fetchRecentDeposits = async () => {
    try {
      const { data } = await supabase.from('supplier_deposits').select('*, suppliers(name)').order('created_at', { ascending: false }).limit(10);
      setRecentDeposits(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRecentDeposits(); }, [suppliers]);

  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'deposit_balance' | 'total_debt'>>({ 
    name: '', 
    code: '', 
    contact_person: '', 
    phone: '', 
    email: '', 
    address: '', 
    payment_method: 'CASH', 
    payment_terms: 30, 
    is_active: true,
    status: 'active'
  });

  // STRICT FILTER LOGIC
  const getFilteredData = (tabValue: string) => {
    return suppliers.filter(s => {
      // 1. Search Filter
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (tabValue === 'all' || tabValue === 'riwayat_global') return true;
      
      const method = (s.payment_method || '').toLowerCase();
      const hasDeposit = (s.deposit_balance || 0) > 0;
      const hasDebt = (s.total_debt || 0) > 0;

      if (tabValue === 'cash') {
        // ONLY SHOW CASH IF NO DEPOSIT AND NO DEBT
        return (method.includes('cash') || method.includes('tunai') || method === '') && !hasDeposit && !hasDebt;
      }
      
      if (tabValue === 'deposit') {
        // SHOW IF HAS DEPOSIT BALANCE OR METHOD IS DEPOSIT
        return hasDeposit || method.includes('deposit');
      }
      
      if (tabValue === 'hutang') {
        // SHOW IF HAS DEBT BALANCE OR METHOD IS DEBT/TEMPO
        return hasDebt || method.includes('hutang') || method.includes('tempo') || method.includes('kredit');
      }
      
      return true;
    });
  };

  const handleEdit = (s: any) => {
    setSelectedSupplier(s);
    setFormData({ 
      name: s.name, 
      code: s.code, 
      contact_person: s.contact_person || '', 
      phone: s.phone || '', 
      email: s.email || '', 
      address: s.address || '', 
      payment_method: (s.payment_method as 'CASH' | 'Hutang') || 'CASH', 
      payment_terms: s.payment_terms || 30, 
      is_active: s.is_active,
      status: s.status || 'active'
    });
    setShowFormDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus supplier ini?')) return;
    try {
      await PurchaseService.deleteSupplier(id);
      toast({ title: 'Berhasil', description: 'Supplier dihapus' });
      refetch();
    } catch (error: any) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (selectedSupplier) {
        await PurchaseService.updateSupplier(selectedSupplier.id, formData);
        toast({ title: 'Berhasil', description: 'Supplier diperbarui' });
      } else {
        await PurchaseService.createSupplier(formData);
        toast({ title: 'Berhasil', description: 'Supplier ditambahkan' });
      }
      setShowFormDialog(false);
      refetch();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); } finally { setIsSubmitting(false); }
  };

  const SupplierTable = ({ data }: { data: any[] }) => (
    <Table>
      <TableHeader className="bg-slate-50/50">
        <TableRow className="hover:bg-transparent">
          <TableHead className="py-4 pl-6 text-slate-400 uppercase text-[10px] font-black tracking-widest">Identitas</TableHead>
          <TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Metode</TableHead>
          <TableHead className="text-right text-slate-400 uppercase text-[10px] font-black tracking-widest">Deposit</TableHead>
          <TableHead className="text-right text-slate-400 uppercase text-[10px] font-black tracking-widest">Hutang</TableHead>
          <TableHead className="text-right text-slate-400 uppercase text-[10px] font-black tracking-widest">Tgl Terakhir</TableHead>
          <TableHead className="text-right pr-6 text-slate-400 uppercase text-[10px] font-black tracking-widest">Kelola</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Tidak ada data di kategori ini</TableCell></TableRow> : 
          data.map(s => (
            <TableRow key={s.id} className="group hover:bg-slate-50 border-slate-50">
              <TableCell className="py-5 pl-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors uppercase">{s.name.charAt(0)}</div>
                  <div><p className="font-bold text-slate-900">{s.name}</p><p className="text-[10px] font-bold text-blue-500 font-mono tracking-tighter">{s.code}</p></div>
                </div>
              </TableCell>
              <TableCell><Badge variant="outline" className="rounded-lg px-2 border-slate-200 text-slate-500 bg-white font-bold text-[10px] uppercase">{s.payment_method || 'CASH'}</Badge></TableCell>
              <TableCell className="text-right font-mono font-bold text-emerald-600">{formatCurrency(s.deposit_balance || 0)}</TableCell>
              <TableCell className="text-right font-mono font-bold text-rose-600">{formatCurrency(s.total_debt || 0)}</TableCell>
              <TableCell className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.updated_at ? format(new Date(s.updated_at), 'dd/MM/yy') : '-'}</p>
                <p className="text-[9px] text-slate-400 font-mono">{s.updated_at ? format(new Date(s.updated_at), 'HH:mm') : ''}</p>
              </TableCell>
              <TableCell className="text-right pr-6">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedSupplier(s); setShowBalanceDialog(true); }} className="h-9 w-9 rounded-xl text-orange-600 hover:bg-orange-50"><Wallet className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100"><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-9 w-9 rounded-xl text-rose-400 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        }
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">Suppliers</h1>
          <p className="text-slate-500 text-sm font-medium">Manajemen data pemasok dan pengelolaan deposit saldo.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => supplierDebtService.syncAllSupplierDeposits().then(() => refetch())} className="h-10 px-4 rounded-xl bg-white border-slate-200 shadow-sm">
            <RefreshCw className="w-4 h-4 mr-2 text-slate-400" /> Sinkron Data
          </Button>
          <Button onClick={() => { setSelectedSupplier(null); setShowFormDialog(true); }} className="h-10 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 font-semibold transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" /> Supplier Baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Supplier', val: suppliers.length, icon: User, color: 'blue' },
          { label: 'Saldo Deposit', val: formatCurrency(suppliers.reduce((a, s) => a + (s.deposit_balance || 0), 0)), icon: Wallet, color: 'emerald' },
          { label: 'Total Hutang', val: formatCurrency(suppliers.reduce((a, s) => a + (s.total_debt || 0), 0)), icon: FileText, color: 'rose' }
        ].map((st, i) => (
          <Card key={i} className="relative overflow-hidden border-none shadow-sm bg-white rounded-3xl p-6 group transition-all hover:shadow-md">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl bg-${st.color}-50 text-${st.color}-600`}><st.icon className="w-6 h-6" /></div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{st.label}</p>
                <p className="text-3xl font-black text-slate-900">{st.val}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1">
            {['all', 'cash', 'hutang', 'deposit', 'riwayat_global'].map((t) => (
              <TabsTrigger 
                key={t} 
                value={t} 
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white ${t === 'riwayat_global' ? 'text-orange-600 hover:bg-orange-50' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t === 'riwayat_global' ? 'Riwayat Deposit' : t.charAt(0).toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari nama atau kode..." className="pl-10 h-11 border-none bg-slate-50 focus-visible:ring-0 rounded-xl font-medium" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <TabsContent value="all" className="m-0 focus-visible:ring-0"><SupplierTable data={getFilteredData('all')} /></TabsContent>
          <TabsContent value="cash" className="m-0 focus-visible:ring-0"><SupplierTable data={getFilteredData('cash')} /></TabsContent>
          <TabsContent value="hutang" className="m-0 focus-visible:ring-0"><SupplierTable data={getFilteredData('hutang')} /></TabsContent>
          <TabsContent value="deposit" className="m-0 focus-visible:ring-0"><SupplierTable data={getFilteredData('deposit')} /></TabsContent>
          <TabsContent value="riwayat_global" className="m-0 focus-visible:ring-0">
             <Table>
               <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="py-4 pl-6 text-slate-400 uppercase text-[10px] font-black tracking-widest">Waktu</TableHead><TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Pemasok</TableHead><TableHead className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Keterangan</TableHead><TableHead className="text-right pr-6 text-slate-400 uppercase text-[10px] font-black tracking-widest">Nominal</TableHead></TableRow></TableHeader>
               <TableBody>
                 {recentDeposits.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">Belum ada riwayat transaksi</TableCell></TableRow> : 
                   recentDeposits.map(d => {
                     const isOut = ['usage', 'payment', 'out', 'bayar', 'penggunaan'].includes(d.type?.toLowerCase());
                     return (
                       <TableRow key={d.id} className="group hover:bg-slate-50 transition-colors border-slate-50">
                         <TableCell className="py-4 pl-6 text-xs font-semibold text-slate-400">{format(new Date(d.created_at), 'dd MMM, HH:mm')}</TableCell>
                         <TableCell className="font-bold text-slate-900">{d.suppliers?.name}</TableCell>
                         <TableCell className="text-sm font-medium text-slate-500">{d.description || 'Deposit'}</TableCell>
                         <TableCell className={`text-right pr-6 font-mono font-bold ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>{isOut ? '-' : '+'}{formatCurrency(Number(String(d.amount).replace(/[^0-9]/g, '')))}</TableCell>
                       </TableRow>
                     );
                   })
                 }
               </TableBody>
             </Table>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl p-8">
           <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Form Pemasok</DialogTitle></DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-6 pt-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Kode</Label><Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none font-bold font-mono" required /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Nama Supplier</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none font-bold" required /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Telepon</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
               <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 pl-1">Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
             </div>
             <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-lg shadow-xl shadow-slate-200 transition-all active:scale-95">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</Button>
           </form>
        </DialogContent>
      </Dialog>

      {selectedSupplier && <SupplierBalanceDialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog} supplier={selectedSupplier} />}
    </div>
  );
}