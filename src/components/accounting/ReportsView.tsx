import React from 'react';
import { useAccountingReports } from '../../hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Download, FileText, Calendar, Loader2, Printer } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';

export function ReportsView() {
    const [dateRange, setDateRange] = React.useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const { pl, bs, loading } = useAccountingReports(dateRange.start, dateRange.end);

    const ReportHeader = ({ title, subtitle, type }: { title: string; subtitle: string, type: 'pl' | 'bs' }) => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <p className="text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={() => {
                    let csvContent = "data:text/csv;charset=utf-8,";
                    if (type === 'pl') {
                        csvContent += "Kategori,Akun,Saldo\n" +
                            pl?.revenue.map(r => `Pendapatan,${r.account_code} - ${r.account_name},${r.balance}`).join("\n") + "\n" +
                            pl?.expense.map(e => `Beban,${e.account_code} - ${e.account_name},${e.balance}`).join("\n");
                    } else {
                        csvContent += "Kategori,Akun,Saldo\n" +
                            bs?.assets.map(a => `Aset,${a.account_code} - ${a.account_name},${a.balance}`).join("\n") + "\n" +
                            bs?.liabilities.map(l => `Kewajiban,${l.account_code} - ${l.account_name},${l.balance}`).join("\n") + "\n" +
                            bs?.equity.map(e => `Ekuitas,${e.account_code} - ${e.account_name},${e.balance}`).join("\n");
                    }
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `${title.replace(/\s+/g, '_')}.csv`);
                    document.body.appendChild(link);
                    link.click();
                }}>
                    <Download className="w-4 h-4 mr-2" />
                    Ekspor CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Cetak
                </Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 print:p-0">
            <Tabs defaultValue="pl" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 print:hidden">
                    <TabsList className="bg-gray-100/80 p-1">
                        <TabsTrigger value="pl" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Laba Rugi
                        </TabsTrigger>
                        <TabsTrigger value="bs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Neraca
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs uppercase text-gray-400 font-bold">Dari</Label>
                            <input
                                type="date"
                                className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-accounting"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs uppercase text-gray-400 font-bold">Sampai</Label>
                            <input
                                type="date"
                                className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-accounting"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-24">
                        <Loader2 className="w-8 h-8 animate-spin text-accounting" />
                    </div>
                ) : (
                    <>
                        <TabsContent value="pl" className="mt-0 space-y-6">
                            <ReportHeader
                                title="Laporan Laba Rugi"
                                subtitle={`Periode ${new Date(dateRange.start).toLocaleDateString('id-ID', { dateStyle: 'long' })} s/d ${new Date(dateRange.end).toLocaleDateString('id-ID', { dateStyle: 'long' })}`}
                                type="pl"
                            />

                            <div className="grid grid-cols-1 gap-6">
                                {/* Revenue Section */}
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="bg-green-50/50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                                        <h3 className="font-bold text-green-900 uppercase tracking-wider text-sm">Pendapatan</h3>
                                        <Badge className="bg-green-100 text-green-800 border-none">Total: {formatCurrency(pl?.total_revenue || 0)}</Badge>
                                    </div>
                                    <CardContent className="p-0">
                                        <table className="w-full">
                                            <tbody className="divide-y divide-gray-100">
                                                {pl?.revenue.map((acc) => (
                                                    <tr key={acc.account_id} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{acc.account_code} - {acc.account_name}</td>
                                                        <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(acc.balance)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>

                                {/* Expense Section */}
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="bg-rose-50/50 px-6 py-4 border-b border-rose-100 flex justify-between items-center">
                                        <h3 className="font-bold text-rose-900 uppercase tracking-wider text-sm">Beban & Biaya</h3>
                                        <Badge className="bg-rose-100 text-rose-800 border-none">Total: {formatCurrency(pl?.total_expense || 0)}</Badge>
                                    </div>
                                    <CardContent className="p-0">
                                        <table className="w-full">
                                            <tbody className="divide-y divide-gray-100">
                                                {pl?.expense.map((acc) => (
                                                    <tr key={acc.account_id} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{acc.account_code} - {acc.account_name}</td>
                                                        <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(acc.balance)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>

                                {/* Net Income */}
                                <div className={cn(
                                    "p-8 rounded-xl flex justify-between items-center shadow-sm",
                                    (pl?.net_profit || 0) >= 0 ? "bg-slate-900 text-white" : "bg-rose-600 text-white"
                                )}>
                                    <div>
                                        <h4 className="text-lg font-bold">Laba (Rugi) Bersih</h4>
                                        <p className="text-white/60 text-sm">Hasil operasional setelah dikurangi seluruh beban</p>
                                    </div>
                                    <div className="text-3xl font-bold font-mono">
                                        {formatCurrency(pl?.net_profit || 0)}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="bs" className="mt-0 space-y-6">
                            <ReportHeader title="Laporan Neraca" subtitle={`Per Tanggal ${new Date(dateRange.end).toLocaleDateString('id-ID', { dateStyle: 'long' })}`} type="bs" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Assets Side */}
                                <div className="space-y-6">
                                    <Card className="border-none shadow-sm overflow-hidden h-full flex flex-col">
                                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Aset (Harta)</h3>
                                            <Badge variant="outline" className="text-white border-white/20 whitespace-nowrap">Total Asset</Badge>
                                        </div>
                                        <CardContent className="p-0 flex-1">
                                            <table className="w-full">
                                                <tbody className="divide-y divide-gray-100">
                                                    {bs?.assets.map((acc) => (
                                                        <tr key={acc.account_id}>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-700">{acc.account_code} - {acc.account_name}</td>
                                                            <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(acc.balance)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                        <div className="bg-gray-50 px-6 py-6 border-t border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-900">TOTAL ASET</span>
                                                <span className="text-xl font-bold font-mono text-gray-900">{formatCurrency(bs?.total_assets || 0)}</span>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Liabilities & Equity Side */}
                                <div className="space-y-6">
                                    {/* Liabilities */}
                                    <Card className="border-none shadow-sm overflow-hidden">
                                        <div className="bg-orange-50/80 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                                            <h3 className="font-bold text-orange-900 uppercase tracking-wider text-sm">Kewajiban (Utang)</h3>
                                            <span className="text-sm font-bold text-orange-900">{formatCurrency(bs?.total_liabilities || 0)}</span>
                                        </div>
                                        <CardContent className="p-0">
                                            <table className="w-full">
                                                <tbody className="divide-y divide-gray-100">
                                                    {bs?.liabilities.map((acc) => (
                                                        <tr key={acc.account_id}>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-700">{acc.account_code} - {acc.account_name}</td>
                                                            <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(acc.balance)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>

                                    {/* Equity */}
                                    <Card className="border-none shadow-sm overflow-hidden">
                                        <div className="bg-purple-50/80 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
                                            <h3 className="font-bold text-purple-900 uppercase tracking-wider text-sm">Ekuitas (Modal)</h3>
                                            <span className="text-sm font-bold text-purple-900">{formatCurrency(bs?.total_equity || 0)}</span>
                                        </div>
                                        <CardContent className="p-0">
                                            <table className="w-full">
                                                <tbody className="divide-y divide-gray-100">
                                                    {bs?.equity.map((acc) => (
                                                        <tr key={acc.account_id}>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-700">{acc.account_code} - {acc.account_name}</td>
                                                            <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(acc.balance)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>

                                    {/* Total Liab + Equity */}
                                    <div className="bg-slate-900 p-6 rounded-xl shadow-sm text-white">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold">Total Pasiva</h4>
                                                <p className="text-white/60 text-xs">Total Kewajiban + Ekuitas</p>
                                            </div>
                                            <div className="text-xl font-bold font-mono">
                                                {formatCurrency((bs?.total_liabilities || 0) + (bs?.total_equity || 0))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
