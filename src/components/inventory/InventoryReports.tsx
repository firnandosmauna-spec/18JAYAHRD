import React, { useState, useMemo, useEffect } from 'react';
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
    Download,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Users,
    Settings2
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useProducts, useStockMovements } from '@/hooks/useInventory';
import { useSuppliers } from '@/hooks/usePurchase';

export function InventoryReports() {
    const [dateRange, setDateRange] = useState('7d');
    const [movementSearchQuery, setMovementSearchQuery] = useState('');
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [movementType, setMovementType] = useState('all');
    const [reportTab, setReportTab] = useState('movements');
    const [supplierStatusFilter, setSupplierStatusFilter] = useState('all');
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('inventory_report_visible_columns');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse visible columns from localStorage", e);
            }
        }
        return {
            date: true,
            product: true,
            type: true,
            quantity: true,
            costPrice: true,
            sellingPrice: true,
            subtotal: true,
            reference: true,
            notes: true
        };
    });

    useEffect(() => {
        localStorage.setItem('inventory_report_visible_columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

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
    const { suppliers, loading: suppliersLoading } = useSuppliers();

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
            const price = m.unit_price || (m as any).products?.cost || 0;
            return acc + (m.quantity * price);
        }, 0);

        const totalOutValue = outMovements.reduce((acc, m) => {
            const price = m.unit_price || (m as any).products?.price || 0;
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
        const matchesSearch = productName.toLowerCase().includes(movementSearchQuery.toLowerCase()) ||
            sku.toLowerCase().includes(movementSearchQuery.toLowerCase());

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
            const isOut = m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0);
            const price = m.unit_price || (isOut ? (m as any).products?.price : (m as any).products?.cost) || 0;
            const qty = isOut ? Math.abs(m.quantity) : m.quantity;
            return acc + (qty * price);
        }, 0);
    }, [filteredMovements]);

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => {
            const supplierName = s.name || '';
            const supplierCode = s.code || '';
            const matchesSearch = supplierName.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
                supplierCode.toLowerCase().includes(supplierSearchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Determine payment method for filtering
            let paymentMethod = s.payment_method;
            if (!paymentMethod) {
                const supplierProducts = products.filter(p => p.supplier_id === s.id);
                if (supplierProducts.length > 0) {
                    paymentMethod = supplierProducts[0].purchase_payment_method as any;
                }
            }
            if (!paymentMethod) paymentMethod = 'CASH';

            const debt = Number(s.total_debt || 0);
            const isHutang = debt > 0 || paymentMethod?.toLowerCase() === 'hutang';

            let matchesStatus = true;
            if (supplierStatusFilter === 'hutang') matchesStatus = isHutang;
            else if (supplierStatusFilter === 'lunas') matchesStatus = !isHutang;

            return matchesStatus;
        });
    }, [suppliers, products, supplierSearchQuery, supplierStatusFilter]);

    const supplierStats = useMemo(() => {
        const withDebt = suppliers.filter(s => Number(s.total_debt || 0) > 0);
        const totalDebtAmount = suppliers.reduce((acc, s) => acc + Number(s.total_debt || 0), 0);

        return {
            totalSuppliers: suppliers.length,
            withDebtCount: withDebt.length,
            fullyPaidCount: suppliers.length - withDebt.length,
            totalDebtAmount
        };
    }, [suppliers]);

    const supplierPurchases = useMemo(() => {
        const purchases: Record<string, { cash: number; debt: number }> = {};

        movements.forEach(m => {
            if (m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0)) {
                const product = products.find(p => p.id === m.product_id);
                if (product && product.supplier_id) {
                    if (!purchases[product.supplier_id]) {
                        purchases[product.supplier_id] = { cash: 0, debt: 0 };
                    }

                    const price = m.unit_price || product.cost || 0;
                    const value = m.quantity * price;

                    const method = product.purchase_payment_method || 'CASH';
                    if (method === 'Hutang') {
                        purchases[product.supplier_id].debt += value;
                    } else {
                        purchases[product.supplier_id].cash += value;
                    }
                }
            }
        });

        return purchases;
    }, [movements, products]);

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

            <Tabs value={reportTab} onValueChange={setReportTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="movements" className="font-display">Riwayat Pergerakan Stok ({filteredMovements.length})</TabsTrigger>
                    <TabsTrigger value="suppliers" className="font-display">Status Keuangan Supplier ({filteredSuppliers.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="movements">
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
                                            value={movementSearchQuery}
                                            onChange={(e) => setMovementSearchQuery(e.target.value)}
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

                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="font-body gap-2">
                                                <Settings2 className="w-4 h-4" />
                                                Kolom
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-4" align="end">
                                            <div className="space-y-4">
                                                <h4 className="font-medium font-display text-sm">Tampilkan Kolom</h4>
                                                <div className="grid gap-3">
                                                    {Object.entries({
                                                        date: "Tanggal",
                                                        product: "Produk",
                                                        type: "Tipe",
                                                        quantity: "Jumlah",
                                                        costPrice: "Harga Beli",
                                                        sellingPrice: "Harga Jual",
                                                        subtotal: "Subtotal",
                                                        reference: "Referensi",
                                                        notes: "Keterangan"
                                                    }).map(([key, label]) => (
                                                        <div key={key} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`col-${key}`}
                                                                checked={visibleColumns[key as keyof typeof visibleColumns]}
                                                                onCheckedChange={(checked) =>
                                                                    setVisibleColumns(prev => ({ ...prev, [key]: !!checked }))
                                                                }
                                                            />
                                                            <Label htmlFor={`col-${key}`} className="text-sm font-body cursor-pointer">{label}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {visibleColumns.date && <TableHead className="font-body">Tanggal</TableHead>}
                                        {visibleColumns.product && <TableHead className="font-body">Produk</TableHead>}
                                        {visibleColumns.type && <TableHead className="font-body">Tipe</TableHead>}
                                        {visibleColumns.quantity && <TableHead className="font-body text-right">Jumlah</TableHead>}
                                        {visibleColumns.costPrice && <TableHead className="font-body text-right">Harga Beli</TableHead>}
                                        {visibleColumns.sellingPrice && <TableHead className="font-body text-right">Harga Jual</TableHead>}
                                        {visibleColumns.subtotal && <TableHead className="font-body text-right">Subtotal</TableHead>}
                                        {visibleColumns.reference && <TableHead className="font-body">Referensi</TableHead>}
                                        {visibleColumns.notes && <TableHead className="font-body">Keterangan</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movementsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                                    <span className="font-body text-muted-foreground">Memuat data...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredMovements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-12">
                                                <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                <p className="font-body text-muted-foreground">Tidak ada data pergerakan stok ditemukan</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMovements.map((m) => (
                                            <TableRow key={m.id}>
                                                {visibleColumns.date && (
                                                    <TableCell className="font-body whitespace-nowrap">
                                                        {new Date(m.created_at).toLocaleDateString('id-ID')}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.product && (
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-bold font-body text-[#1C1C1E]">{(m as any).products?.name || '-'}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{(m as any).products?.sku || '-'}</p>
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.type && (
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
                                                )}
                                                {visibleColumns.quantity && (
                                                    <TableCell className={`text-right font-bold font-mono ${m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? 'text-green-600' : 'text-blue-600'}`}>
                                                        {m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? '+' : '-'}{Math.abs(m.quantity)}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.costPrice && (
                                                    <TableCell className="text-right font-mono text-xs">
                                                        {movementType === 'in'
                                                            ? formatCurrency(m.unit_price || (m as any).products?.cost || 0)
                                                            : formatCurrency((m as any).products?.cost || 0)}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.sellingPrice && (
                                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                        {movementType === 'in'
                                                            ? formatCurrency((m as any).products?.price || 0)
                                                            : formatCurrency(m.unit_price || (m as any).products?.price || 0)}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.subtotal && (
                                                    <TableCell className={`text-right font-bold font-mono ${m.movement_type === 'in' || (m.movement_type === 'adjustment' && m.quantity > 0) ? 'text-green-600' : 'text-blue-600'}`}>
                                                        {formatCurrency(Math.abs(m.quantity) * (m.unit_price || (m.movement_type === 'in' ? (m as any).products?.cost : (m as any).products?.price) || 0))}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.reference && (
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {m.reference || '-'}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.notes && (
                                                    <TableCell className="max-w-[150px] truncate font-body text-sm text-gray-600">
                                                        {m.notes || '-'}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                    {filteredMovements.length > 0 && (
                                        <TableRow className="bg-gray-50/50 font-bold">
                                            <TableCell colSpan={Math.max(1, (visibleColumns.date ? 1 : 0) + (visibleColumns.product ? 1 : 0) + (visibleColumns.type ? 1 : 0))} className="text-right font-display text-gray-900 px-4 py-4">
                                                TOTAL
                                            </TableCell>
                                            {visibleColumns.quantity && (
                                                <TableCell className="text-right font-mono">
                                                    {filteredMovements.reduce((acc, m) => {
                                                        const qty = (m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0))
                                                            ? Math.abs(m.quantity)
                                                            : m.quantity;
                                                        return acc + qty;
                                                    }, 0)} unit
                                                </TableCell>
                                            )}
                                            {visibleColumns.costPrice && <TableCell></TableCell>}
                                            {visibleColumns.sellingPrice && <TableCell></TableCell>}
                                            {visibleColumns.subtotal && (
                                                <TableCell className={`text-right font-mono ${movementType === 'in' ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {formatCurrency(filteredMovements.reduce((acc, m) => {
                                                        const isOut = m.movement_type === 'out' || (m.movement_type === 'adjustment' && m.quantity < 0);
                                                        const price = m.unit_price || (isOut ? (m as any).products?.price : (m as any).products?.cost) || 0;
                                                        return acc + (Math.abs(m.quantity) * price);
                                                    }, 0))}
                                                </TableCell>
                                            )}
                                            {visibleColumns.reference && <TableCell></TableCell>}
                                            {visibleColumns.notes && <TableCell></TableCell>}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suppliers">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-gray-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        Total Supplier
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold font-mono">
                                        {supplierStats.totalSuppliers}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 font-body">
                                        Supplier terdaftar di sistem
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-gray-200 border-l-4 border-l-red-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                        Supplier Belum Lunas (Hutang)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold font-mono text-red-600">
                                        {supplierStats.withDebtCount}
                                    </div>
                                    <div className="text-sm font-semibold text-red-700 mt-1">
                                        {formatCurrency(supplierStats.totalDebtAmount)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 font-body">
                                        Total kewajiban pembayaran
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-gray-200 border-l-4 border-l-green-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground font-body flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        Supplier Lunas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold font-mono text-green-600">
                                        {supplierStats.fullyPaidCount}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 font-body">
                                        Tidak ada hutang outstanding
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-gray-200">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="font-display text-lg">Daftar Status Keuangan Supplier</CardTitle>
                                        <CardDescription className="font-body">Pantau saldo hutang dan status pembayaran masing-masing supplier</CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                placeholder="Cari supplier..."
                                                value={supplierSearchQuery}
                                                onChange={(e) => setSupplierSearchQuery(e.target.value)}
                                                className="pl-10 font-body"
                                            />
                                        </div>
                                        <Select value={supplierStatusFilter} onValueChange={setSupplierStatusFilter}>
                                            <SelectTrigger className="w-[180px] font-body">
                                                <Filter className="w-4 h-4 mr-2" />
                                                <SelectValue placeholder="Semua Status" />
                                            </SelectTrigger>
                                            <SelectContent className="font-body">
                                                <SelectItem value="all">Semua Status</SelectItem>
                                                <SelectItem value="hutang" className="text-red-600">Hutang</SelectItem>
                                                <SelectItem value="lunas" className="text-green-600">Lunas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-body">Kode</TableHead>
                                            <TableHead className="font-body">Nama Supplier</TableHead>
                                            <TableHead className="font-body">Metode Utama</TableHead>
                                            <TableHead className="font-body text-right">Total Beli (CASH)</TableHead>
                                            <TableHead className="font-body text-right">Total Beli (HUTANG)</TableHead>
                                            <TableHead className="font-body text-right">Sisa Hutang</TableHead>
                                            <TableHead className="font-body text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {suppliersLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                                        <span className="font-body text-muted-foreground">Memuat data...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredSuppliers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12">
                                                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                    <p className="font-body text-muted-foreground">Tidak ada data supplier ditemukan</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSuppliers.map((s) => {
                                                const purchaseData = supplierPurchases[s.id] || { cash: 0, debt: 0 };
                                                return (
                                                    <TableRow key={s.id}>
                                                        <TableCell className="font-mono text-xs">
                                                            {s.code || '-'}
                                                        </TableCell>
                                                        <TableCell className="font-bold font-body">
                                                            {s.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-body text-[10px]">
                                                                {(() => {
                                                                    if (s.payment_method) return s.payment_method;
                                                                    const supplierProducts = products.filter(p => p.supplier_id === s.id);
                                                                    return supplierProducts.length > 0 ? supplierProducts[0].purchase_payment_method : 'CASH';
                                                                })()}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-green-600 font-semibold">
                                                            {formatCurrency(purchaseData.cash)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-blue-600 font-semibold">
                                                            {formatCurrency(purchaseData.debt)}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-bold font-mono ${(s.total_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {formatCurrency(s.total_debt || 0)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {(s.total_debt || 0) > 0 ? (
                                                                <Badge className="bg-red-50 text-red-700 border-none hover:bg-red-50 font-body text-[10px]">
                                                                    Hutang
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-green-50 text-green-700 border-none hover:bg-green-50 font-body text-[10px]">
                                                                    Lunas
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                        {filteredSuppliers.length > 0 && (
                                            <TableRow className="bg-gray-50/50 font-bold border-t-2">
                                                <TableCell colSpan={3} className="text-right font-display text-gray-900 px-4 py-4 uppercase tracking-wider">
                                                    Total Ringkasan (Hanya Data Berdasarkan Filter)
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-green-600">
                                                    {formatCurrency(filteredSuppliers.reduce((acc, s) => acc + (supplierPurchases[s.id]?.cash || 0), 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-blue-600">
                                                    {formatCurrency(filteredSuppliers.reduce((acc, s) => acc + (supplierPurchases[s.id]?.debt || 0), 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-red-600">
                                                    {formatCurrency(filteredSuppliers.reduce((acc, s) => acc + (s.total_debt || 0), 0))}
                                                </TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
