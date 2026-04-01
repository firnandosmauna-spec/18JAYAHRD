import React, { useState, useEffect } from 'react';
import {
  Wallet,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Undo2,
  Package,
  Calendar,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { PurchaseService } from '@/services/purchaseService';
import { stockMovementService } from '@/services/inventoryService';
import type { Supplier, SupplierDeposit } from '@/types/purchase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface SupplierBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  isInventory?: boolean;
}

export function SupplierBalanceDialog({ 
  open, 
  onOpenChange, 
  supplier, 
  isInventory = true 
}: SupplierBalanceDialogProps) {
  const [deposits, setDeposits] = useState<SupplierDeposit[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [depositData, movementData] = await Promise.all([
        PurchaseService.getSupplierDeposits(supplier.id),
        stockMovementService.getBySupplier(supplier.id)
      ]);
      setDeposits(depositData);
      setMovements(movementData);
    } catch (error) {
      console.error('Error fetching supplier balance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && supplier?.id) {
      fetchData();
    }
  }, [open, supplier?.id]);

  // Combine and sort events for the running balance
  const getMergedHistory = () => {
    const events: any[] = [];

    // Add deposits
    deposits.forEach(d => {
      events.push({
        id: d.id,
        date: new Date(d.created_at),
        type: d.type, // 'deposit', 'usage', 'refund'
        amount: d.amount,
        description: d.description || (d.type === 'deposit' ? 'Setoran Deposit' : 'Penggunaan'),
        category: 'finance'
      });
    });

    // Add movements (only those that didn't already create a deposit record of type 'usage' to avoid double counting if shown together)
    // Actually, the user wants to see "stok masuk dan keluar".
    movements.forEach(m => {
      events.push({
        id: m.id,
        date: new Date(m.created_at),
        type: m.movement_type, // 'in', 'out'
        amount: m.quantity * (m.unit_price || 0),
        description: `${m.movement_type === 'in' ? 'Stok Masuk' : 'Stok Keluar'}: ${m.products?.name}`,
        category: 'stock',
        details: m
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const primaryColor = isInventory ? 'bg-inventory' : 'bg-orange-600';
  const primaryText = isInventory ? 'text-inventory-dark' : 'text-orange-700';

  const history = getMergedHistory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between text-2xl">
            <div className="flex items-center gap-2">
              <Wallet className={`w-6 h-6 ${primaryText}`} />
              Saldo & Riwayat: {supplier.name}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Deposit Saat Ini</span>
              <Badge variant="secondary" className="font-mono text-2xl py-1 px-4 mt-1 bg-green-50 text-green-700 border-green-200">
                {formatCurrency(supplier.deposit_balance || 0)}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap mengenai saldo titipan, penggunaan dana, dan mutasi barang supplier.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6 pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Riwayat Gabungan
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Daftar Stok
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Ringkasan
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="history" className="m-0 focus-visible:ring-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-inventory"></div>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border rounded-lg border-dashed">
                    Belum ada riwayat transaksi
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((event) => (
                      <Card key={`${event.category}-${event.id}`} className="overflow-hidden border-gray-100 hover:border-gray-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${
                                event.type === 'deposit' || event.type === 'in' ? 'bg-green-100 text-green-700' : 
                                event.type === 'usage' || event.type === 'out' ? 'bg-red-100 text-red-700' : 
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {event.category === 'finance' ? (
                                  event.type === 'deposit' ? <ArrowUpCircle className="w-5 h-5" /> :
                                  event.type === 'usage' ? <ArrowDownCircle className="w-5 h-5" /> :
                                  <Undo2 className="w-5 h-5" />
                                ) : (
                                  <Package className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{event.description}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(event.date, 'dd MMMM yyyy HH:mm', { locale: idLocale })}
                                  <span className="text-gray-300">|</span>
                                  <Badge variant="outline" className="text-[10px] py-0 h-4 border-gray-200">
                                    {event.category === 'finance' ? 'Keuangan' : 'Stok'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-mono font-bold ${
                                event.type === 'deposit' ? 'text-green-600' :
                                event.type === 'usage' ? 'text-red-600' :
                                event.type === 'in' ? 'text-blue-600' :
                                'text-gray-900'
                              }`}>
                                {event.type === 'deposit' || event.type === 'in' ? '+' : '-'}{' '}
                                {event.category === 'finance' ? formatCurrency(event.amount) : `${event.details?.quantity} unit`}
                              </div>
                              {event.category === 'stock' && (
                                <div className="text-xs text-gray-400 mt-1">
                                  @ {formatCurrency(event.details?.unit_price || 0)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stock" className="m-0 focus-visible:ring-0">
                <div className="rounded-md border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                      <tr>
                        <th className="px-4 py-3 text-left">Tanggal</th>
                        <th className="px-4 py-3 text-left">Produk</th>
                        <th className="px-4 py-3 text-center">Masuk</th>
                        <th className="px-4 py-3 text-center">Keluar</th>
                        <th className="px-4 py-3 text-right">Harga Satuan</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movements.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {format(new Date(m.created_at), 'dd/MM/yy HH:mm')}
                          </td>
                          <td className="px-4 py-3 font-medium">{m.products?.name}</td>
                          <td className="px-4 py-3 text-center text-green-600 font-bold">
                            {m.movement_type === 'in' ? m.quantity : '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-red-600 font-bold">
                            {m.movement_type === 'out' ? m.quantity : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {formatCurrency(m.unit_price || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(m.quantity * (m.unit_price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {movements.length === 0 && (
                    <div className="text-center py-12 text-gray-400">Belum ada riwayat stok</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                <div className="grid grid-cols-2 gap-6">
                  <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="p-6">
                      <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Statistik Stok
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Stok Masuk</span>
                          <span className="font-bold text-green-600">
                            {movements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + m.quantity, 0)} unit
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Stok Keluar</span>
                          <span className="font-bold text-red-600">
                            {movements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + m.quantity, 0)} unit
                          </span>
                        </div>
                        <div className="pt-2 border-t border-blue-100 flex justify-between items-center font-bold">
                          <span>Total Nilai Belanja</span>
                          <span>{formatCurrency(movements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + (m.quantity * (m.unit_price || 0)), 0))}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50/50 border-green-100">
                    <CardContent className="p-6">
                      <h4 className="text-sm font-bold text-green-800 mb-4 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Statistik Deposit
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Setoran</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(deposits.filter(d => d.type === 'deposit').reduce((sum, d) => sum + d.amount, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Penggunaan</span>
                          <span className="font-bold text-red-600">
                            {formatCurrency(deposits.filter(d => d.type === 'usage').reduce((sum, d) => sum + d.amount, 0))}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-green-100 flex justify-between items-center font-bold">
                          <span>Saldo Akhir</span>
                          <span className="text-2xl text-green-700">{formatCurrency(supplier.deposit_balance || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button className={primaryColor} onClick={() => window.open('/purchase/suppliers', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Kelola di Master Supplier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
