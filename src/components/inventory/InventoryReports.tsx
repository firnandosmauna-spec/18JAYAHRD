import React, { useState, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Package,
    Calendar,
    Search,
    Filter,
    FileText,
    ArrowDownRight,
    ArrowUpRight,
    Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { useProducts, useStockMovements } from '@/hooks/useInventory';

export function InventoryReports() {
    const [dateRange, setDateRange] = useState('7d');
    const [searchQuery, setSearchQuery] = useState('');
    const [movementType, setMovementType] = useState('all');

    const getDateRange = () => {
        if (dateRange === 'all') return { start: undefined, end: undefined };

        const end = new Date();
        const start = new Date();
        if (dateRange === '7d') start.setDate(end.getDate() - 7);
        else if (dateRange === '30d') start.setDate(end.getDate() - 30);
        else if (dateRange === '90d') start.setDate(end.getDate() - 90);
        return {
            start: start.toISOString().split('T')[0],
            end: undefined // Include everything up to now
        };
    };

    const range = getDateRange();
    const { products, loading: productsLoading } = useProducts();
    const { movements, loading: movementsLoading } = useStockMovements(range.start, range.end);

    // Calculations
    const totalValuation = useMemo(() => {
        return products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
    }, [products]);

    const stats = useMemo(() => {
        const inMovements = movements.filter(m => m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0));
        const outMovements = movements.filter(m => m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0));

        const totalIn = inMovements.reduce((acc, m) => acc + m.quantity, 0);
        const totalOut = outMovements.reduce((acc, m) => acc + Math.abs(m.quantity), 0);

        const totalInValue = inMovements.reduce((acc, m) => {
            const price = (m as any).products?.price || 0;
            return acc + (m.quantity * price);
        }, 0);

        const totalOutValue = outMovements.reduce((acc, m) => {
            const price = (m as any).products?.price || 0;
            return acc + (Math.abs(m.quantity) * price);
        }, 0);

        return {
            totalIn,
            totalOut,
            totalInValue,
            totalOutValue,
            netChange: totalIn - totalOut,
            lowStockCount: products.filter(p => (p.stock || 0) <= (p.min_stock || 0)).length
        };
    }, [movements, products]);

    const filteredMovements = movements.filter(m => {
        const productName = (m as any).products?.name || '';
        const sku = (m as any).products?.sku || '';
        const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sku.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesType = true;
        if (movementType === 'in') {
            matchesType = m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0);
        } else if (movementType === 'out') {
            matchesType = m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0);
        }

        return matchesSearch && matchesType;
    });

    const filteredTotalValue = useMemo(() => {
        return filteredMovements.reduce((acc, m) => {
            const price = (m as any).products?.price || 0;
            const qty = (m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0))
                ? Math.abs(m.quantity)
                : m.quantity;
            return acc + (qty * price);
        }, 0);
    }, [filteredMovements]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handleExport = () => {
        // Logic for export could go here (e.g., CSV generation)
        console.log("Exporting reports...");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] font-display">Laporan Persediaan</h2>
                    <p className="text-muted-foreground font-body">Analisis pergerakan stok dan nilai aset</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px] font-body">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Rentang Waktu" />
                        </SelectTrigger>
                        <SelectContent className="font-body">
                            <SelectItem value="all">Semua Waktu</SelectItem>
                            <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                            <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                            <SelectItem value="90d">90 Hari Terakhir</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExport} className="font-body">
                        <Download className="w-4 h-4 mr-2" />
                        Ekspor
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Nilai Persediaan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-inventory">
                            {formatCurrency(totalValuation)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-body">
                            Berdasarkan stok saat ini & harga beli
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            Total Barang Masuk
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-green-600">
                            +{stats.totalIn} unit
                        </div>
                        <div className="text-sm font-semibold text-green-700 mt-1">
                            {formatCurrency(stats.totalInValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-body">
                            Dalam {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} hari terakhir
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-blue-600" />
                            Total Barang Keluar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-blue-600">
                            -{stats.totalOut} unit
                        </div>
                        <div className="text-sm font-semibold text-blue-700 mt-1">
                            {formatCurrency(stats.totalOutValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-body">
                            Dalam {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} hari terakhir
                        </p>
                    </CardContent>
                </Card>

                <Card className={`border-gray-200 ${stats.lowStockCount > 0 ? 'border-l-4 border-l-orange-500' : ''}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Produk Stok Rendah
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold font-mono ${stats.lowStockCount > 0 ? 'text-orange-600' : 'text-[#1C1C1E]'}`}>
                            {stats.lowStockCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-body">
                            Segera lakukan pemesanan ulang
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-gray-200">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="font-display text-lg">Detail Pergerakan Stok</CardTitle>
                            <CardDescription className="font-body">Riwayat masuk dan keluar barang periode ini</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Cari produk..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 font-body"
                                />
                            </div>
                            <Tabs value={movementType} onValueChange={setMovementType} className="w-full sm:w-auto">
                                <TabsList className="font-body">
                                    <TabsTrigger value="all">Semua</TabsTrigger>
                                    <TabsTrigger value="in" className="text-green-600">Masuk</TabsTrigger>
                                    <TabsTrigger value="out" className="text-blue-600">Keluar</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-body">Tanggal</TableHead>
                                <TableHead className="font-body">Produk</TableHead>
                                <TableHead className="font-body">Tipe</TableHead>
                                <TableHead className="font-body text-right">Jumlah</TableHead>
                                <TableHead className="font-body text-right">Harga Satuan</TableHead>
                                <TableHead className="font-body text-right">Total Harga</TableHead>
                                <TableHead className="font-body">Referensi</TableHead>
                                <TableHead className="font-body">Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movementsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                            <span className="font-body text-muted-foreground">Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMovements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="font-body text-muted-foreground">Tidak ada data pergerakan stok ditemukan</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMovements.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-body whitespace-nowrap">
                                            {new Date(m.created_at).toLocaleDateString('id-ID')}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold font-body text-[#1C1C1E]">{(m as any).products?.name || '-'}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{(m as any).products?.sku || '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? (
                                                <Badge className="bg-green-50 text-green-700 border-none hover:bg-green-50 font-body">
                                                    <ArrowDownRight className="w-3 h-3 mr-1" /> Masuk
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-50 text-blue-700 border-none hover:bg-blue-50 font-body">
                                                    <ArrowUpRight className="w-3 h-3 mr-1" /> Keluar
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold font-mono ${m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? 'text-green-600' : 'text-blue-600'}`}>
                                            {m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? '+' : '-'}{Math.abs(m.quantity)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {formatCurrency((m as any).products?.price || 0)}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold font-mono ${m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? 'text-green-600' : 'text-blue-600'}`}>
                                            {formatCurrency(Math.abs(m.quantity) * ((m as any).products?.price || 0))}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {m.reference || '-'}
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate font-body text-sm text-gray-600">
                                            {m.notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {filteredMovements.length > 0 && (
                                <TableRow className="bg-gray-50/50 font-bold">
                                    <TableCell colSpan={3} className="text-right font-display text-gray-900 px-4 py-4">
                                        TOTAL
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {filteredMovements.reduce((acc, m) => {
                                            const qty = (m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0))
                                                ? Math.abs(m.quantity)
                                                : m.quantity;
                                            return acc + qty;
                                        }, 0)} unit
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-mono text-inventory">
                                        {formatCurrency(filteredTotalValue)}
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
