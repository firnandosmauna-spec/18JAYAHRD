import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Plus, 
  Search, 
  DollarSign, 
  Calendar, 
  User, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  History,
  Info,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Table as UITable, 
  TableBody as UITableBody, 
  TableCell as UITableCell, 
  TableHead as UITableHead, 
  TableHeader as UITableHeader, 
  TableRow as UITableRow 
} from '@/components/ui/table';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supplierDebtService } from '@/services/supplierDebtService';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

export function SupplierDebtManagement() {
  const [loading, setLoading] = useState(true);
  const [debtSummary, setDebtSummary] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'Transfer',
    reference_number: '',
    notes: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadDebtSummary();
  }, []);

  const loadDebtSummary = async () => {
    try {
      setLoading(true);
      const data = await supplierDebtService.getDebtSummary();
      setDebtSummary(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal memuat ringkasan hutang: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierInvoices = async (supplierId: string) => {
    try {
      const data = await supplierDebtService.getInvoicesBySupplier(supplierId);
      setInvoices(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal memuat invoice supplier: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const repairSupplierBalance = async (supplierId: string) => {
    try {
      setIsSyncing(true);
      
      // 1. Get raw movements
      let allMovs: any[] = [];
      let movPage = 0;
      let hasMoreMovs = true;
      while (hasMoreMovs) {
        const { data: movBatch } = await supabase
          .from('stock_movements')
          .select('product_id, quantity, unit_price, products(supplier_id)')
          .eq('movement_type', 'in')
          .range(movPage * 1000, (movPage + 1) * 1000 - 1);
        
        if (!movBatch || movBatch.length === 0) hasMoreMovs = false;
        else {
          allMovs = [...allMovs, ...movBatch];
          if (movBatch.length < 1000) hasMoreMovs = false;
          movPage++;
        }
      }

      const targetMovs = allMovs.filter(m => {
        const p = Array.isArray(m.products) ? m.products[0] : m.products;
        return p?.supplier_id === supplierId;
      });

      if (targetMovs.length === 0) {
        toast({ title: 'Selesai', description: 'Data sudah tersinkronisasi.' });
        setIsSyncing(false);
        return;
      }

      const groups: Record<string, any[]> = {};
      targetMovs.forEach(m => {
        const ref = m.reference || `FIX-${new Date().getTime()}`;
        if (!groups[ref]) groups[ref] = [];
        groups[ref].push(m);
      });

      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const dueDate = nextMonth.toISOString().split('T')[0];

      let createdCount = 0;
      
      for (const [ref, group] of Object.entries(groups)) {
        const totalAmount = group.reduce((sum, m) => sum + (m.quantity * (m.unit_price || 0)), 0);
        
        const uniqueRef = `${ref}-FIX-${Math.floor(Math.random() * 1000)}`;
        const { data: newInv } = await supabase
          .from('purchase_invoices')
          .insert({
            supplier_id: supplierId,
            invoice_number: uniqueRef,
            total_amount: totalAmount,
            paid_amount: 0,
            payment_status: 'unpaid',
            status: 'received',
            invoice_date: today,
            due_date: dueDate,
            notes: `Auto-fix balance`
          })
          .select().single();

        if (newInv) {
          createdCount++;
          for (const m of group) {
            await supabase.from('purchase_invoice_items').insert({
              purchase_invoice_id: newInv.id,
              product_id: m.product_id,
              quantity: m.quantity,
              unit_price: m.unit_price || 0,
              line_total: m.quantity * (m.unit_price || 0),
              notes: `Auto-fix: ${m.id}`
            });
          }
        }
      }
      
      toast({ 
        title: 'Berhasil', 
        description: `Sinkronisasi saldo selesai.` 
      });

      loadDebtSummary();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setExpandedInvoiceId(null);
    setInvoiceItems([]);
    loadSupplierInvoices(supplier.supplierId);
  };

  const handleToggleDetails = async (invoiceId: string) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      return;
    }

    try {
      setLoadingItems(true);
      setExpandedInvoiceId(invoiceId);
      const items = await supplierDebtService.getInvoiceItems(invoiceId);
      setInvoiceItems(items);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal memuat detail item: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleOpenPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: (invoice.total_amount - (invoice.paid_amount || 0)).toString(),
      payment_method: 'Transfer',
      reference_number: '',
      notes: ''
    });
    setShowPaymentDialog(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amountNum = Number(paymentData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Error',
        description: 'Jumlah pembayaran tidak valid',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await supplierDebtService.createPayment({
        supplier_id: selectedInvoice.supplier_id,
        invoice_id: selectedInvoice.id,
        amount: amountNum,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes
      });

      toast({
        title: 'Berhasil',
        description: 'Pembayaran berhasil dicatat',
      });

      setShowPaymentDialog(false);
      
      await supplierDebtService.syncAllSupplierDebts();
      
      loadDebtSummary();
      loadSupplierInvoices(selectedInvoice.supplier_id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Gagal mencatat pembayaran: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      const report = await supplierDebtService.syncAllSupplierDebts();
      
      toast({
        title: 'Sinkronisasi Selesai',
        description: report,
      });
      
      loadDebtSummary();
    } catch (error: any) {
      toast({
        title: 'Sinkronisasi Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Lunas</Badge>;
      case 'partial':
        return <Badge variant="outline" className="text-blue-700 border-blue-200"><History className="w-3 h-3 mr-1" /> Cicil</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Terlambat</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600"><Clock className="w-3 h-3 mr-1" /> Belum Bayar</Badge>;
    }
  };

  const filteredDebt = debtSummary.filter(item => 
    item.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-inventory" />
            Manajemen Hutang Supplier
          </h2>
          <p className="text-gray-600">Pantau dan kelola tagihan supplier yang belum terbayar</p>
        </div>
        <Button
          onClick={handleSyncAll}
          disabled={isSyncing}
          variant="outline"
          className="flex items-center gap-2 border-inventory text-inventory hover:bg-inventory hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Saldo'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-[calc(100vh-250px)] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Daftar Supplier</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-0">
            {loading ? (
              <div className="space-y-3 mt-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />)}
              </div>
            ) : filteredDebt.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Tidak ada data hutang</p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {filteredDebt.map((item) => (
                  <div 
                    key={item.supplierId}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedSupplier?.supplierId === item.supplierId 
                        ? 'border-inventory bg-inventory/5 ring-1 ring-inventory/20' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectSupplier(item)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900 truncate pr-8">{item.supplierName}</span>
                      <ChevronRight className={`w-4 h-4 mt-0.5 transition-transform ${selectedSupplier?.supplierId === item.supplierId ? 'rotate-90 text-inventory' : 'text-gray-300'}`} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-gray-500">
                        {item.invoiceCount} Tagihan Unpaid
                      </div>
                      <div className={`font-bold ${item.totalDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {formatCurrency(item.totalDebt)}
                      </div>
                    </div>
                    
                    {/* Tiny sinkron button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-8 h-6 w-6 p-0 text-inventory opacity-20 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        repairSupplierBalance(item.supplierId);
                      }}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 h-[calc(100vh-250px)] flex flex-col">
          <CardHeader className="border-b bg-gray-50/50">
            {selectedSupplier ? (
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{selectedSupplier.supplierName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="font-mono text-xs bg-white">ID: {selectedSupplier.supplierId.split('-')[0]}</Badge>
                    <span className="text-gray-400">•</span>
                    <span className="text-red-600 font-semibold">Total Hutang: {formatCurrency(selectedSupplier.totalDebt)}</span>
                  </CardDescription>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <Info className="w-8 h-8 mb-2" />
                <p>Pilih supplier untuk melihat detail tagihan</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {selectedSupplier ? (
              <UITable>
                <UITableHeader className="bg-gray-50 sticky top-0 z-10">
                  <UITableRow>
                    <UITableHead>No. Invoice</UITableHead>
                    <UITableHead>Tanggal</UITableHead>
                    <UITableHead>Jatuh Tempo</UITableHead>
                    <UITableHead className="text-right">Total Tagihan</UITableHead>
                    <UITableHead className="text-right">Sisa Hutang</UITableHead>
                    <UITableHead>Status</UITableHead>
                    <UITableHead className="w-[100px]"></UITableHead>
                  </UITableRow>
                </UITableHeader>
                <UITableBody>
                  {invoices.length === 0 ? (
                    <UITableRow>
                      <UITableCell colSpan={7} className="text-center py-20 text-gray-400">
                        Tidak ada invoice untuk supplier ini
                      </UITableCell>
                    </UITableRow>
                  ) : (
                    invoices.map((inv) => (
                      <React.Fragment key={inv.id}>
                        <UITableRow 
                          className={`hover:bg-gray-50/50 cursor-pointer ${expandedInvoiceId === inv.id ? 'bg-inventory/5' : ''}`}
                          onClick={() => handleToggleDetails(inv.id)}
                        >
                          <UITableCell className="font-medium font-mono">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`w-4 h-4 transition-transform ${expandedInvoiceId === inv.id ? 'rotate-90 text-inventory' : 'text-gray-300'}`} />
                              {inv.invoice_number}
                            </div>
                          </UITableCell>
                          <UITableCell className="text-xs text-gray-600">
                            {format(new Date(inv.invoice_date), 'dd MMM yyyy', { locale: id })}
                          </UITableCell>
                          <UITableCell className="text-xs text-gray-600">
                            {inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy', { locale: id }) : '-'}
                          </UITableCell>
                          <UITableCell className="text-right font-medium">
                            {formatCurrency(inv.total_amount)}
                          </UITableCell>
                          <UITableCell className="text-right font-bold text-red-600">
                            {formatCurrency(inv.total_amount - (inv.paid_amount || 0))}
                          </UITableCell>
                          <UITableCell>
                            {getStatusBadge(inv.payment_status)}
                          </UITableCell>
                          <UITableCell className="text-right">
                            {inv.payment_status !== 'paid' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPayment(inv);
                                }}
                                className="h-8 px-2 text-xs border-inventory text-inventory hover:bg-inventory hover:text-white"
                              >
                                Bayar <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </UITableCell>
                        </UITableRow>
                        
                        {expandedInvoiceId === inv.id && (
                          <UITableRow className="bg-gray-50/30 border-t-0">
                            <UITableCell colSpan={7} className="p-4 pt-1">
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-gray-50/80 px-4 py-2 border-b flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                  <span>Detail Item Belanja</span>
                                  <span className="text-inventory">Invoice: {inv.invoice_number}</span>
                                </div>
                                <UITable>
                                  <UITableHeader className="bg-white">
                                    <UITableRow className="hover:bg-transparent border-b">
                                      <UITableHead className="w-10 text-[10px]">No.</UITableHead>
                                      <UITableHead className="text-[10px]">Tanggal</UITableHead>
                                      <UITableHead className="text-[10px]">Produk</UITableHead>
                                      <UITableHead className="text-center text-[10px]">Volume</UITableHead>
                                      <UITableHead className="text-center text-[10px]">Satuan</UITableHead>
                                      <UITableHead className="text-right text-[10px]">Harga</UITableHead>
                                      <UITableHead className="text-right text-[10px]">Total Harga</UITableHead>
                                      <UITableHead className="text-[10px]">Lokasi Proyek</UITableHead>
                                      <UITableHead className="text-[10px]">Gudang</UITableHead>
                                    </UITableRow>
                                  </UITableHeader>
                                  <UITableBody>
                                    {loadingItems ? (
                                      <UITableRow>
                                        <UITableCell colSpan={9} className="text-center py-8">
                                          <div className="w-5 h-5 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mr-2 inline-block vertical-middle" />
                                          <span className="text-xs text-gray-400">Memuat detail...</span>
                                        </UITableCell>
                                      </UITableRow>
                                    ) : invoiceItems.length === 0 ? (
                                      <UITableRow>
                                        <UITableCell colSpan={9} className="text-center py-8 text-xs text-gray-400">
                                          Tidak ada detail item untuk invoice ini
                                        </UITableCell>
                                      </UITableRow>
                                    ) : (
                                      invoiceItems.map((item, index) => (
                                        <UITableRow key={item.id} className="text-xs">
                                          <UITableCell className="font-mono text-gray-400">{index + 1}</UITableCell>
                                          <UITableCell className="whitespace-nowrap">
                                            {format(new Date(inv.invoice_date), 'dd/MM/yyyy')}
                                          </UITableCell>
                                          <UITableCell className="font-medium">{item.product?.name || '-'}</UITableCell>
                                          <UITableCell className="text-center">{item.quantity || '-'}</UITableCell>
                                          <UITableCell className="text-center">{item.product?.unit || '-'}</UITableCell>
                                          <UITableCell className="text-right">{formatCurrency(item.unit_price)}</UITableCell>
                                          <UITableCell className="text-right font-bold text-inventory">{formatCurrency(item.line_total)}</UITableCell>
                                          <UITableCell>
                                            <Badge variant="outline" className="text-[10px] font-normal bg-gray-50">
                                              {item.project_location || '-'}
                                            </Badge>
                                          </UITableCell>
                                          <UITableCell>
                                            <span className="text-gray-600">{inv.purchase_order?.warehouse?.name || 'Gudang Utama'}</span>
                                          </UITableCell>
                                        </UITableRow>
                                      ))
                                    )}
                                  </UITableBody>
                                </UITable>
                              </div>
                            </UITableCell>
                          </UITableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </UITableBody>
              </UITable>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
                <FileText className="w-24 h-24" />
                <p className="text-xl font-semibold">Tampilan Detail Tagihan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Catat Pembayaran
            </DialogTitle>
            <DialogDescription>
              Invoice: <span className="font-mono text-gray-900 font-bold">{selectedInvoice?.invoice_number}</span>
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitPayment} className="space-y-5 py-2">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
              <div className="text-sm font-medium text-gray-600">Sisa Tagihan:</div>
              <div className="text-xl font-bold text-red-600">
                {selectedInvoice && formatCurrency(selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Pembayaran (Rp)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="pl-9 font-bold text-lg h-12 border-gray-200 focus:border-green-500 focus:ring-green-500"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">Metode Pembayaran</Label>
                  <select
                    id="method"
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="Transfer">Transfer</option>
                    <option value="Tunai">Tunai</option>
                    <option value="Giro">Giro</option>
                    <option value="Deposit">Deposit</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref">No. Ref / Bukti</Label>
                  <Input
                    id="ref"
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                    placeholder="Ref #"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Input
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Opsional..."
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowPaymentDialog(false)}>Batal</Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 font-bold"
              >
                {isSubmitting ? 'Memproses...' : 'Konfirmasi Pembayaran'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDebtManagement;
