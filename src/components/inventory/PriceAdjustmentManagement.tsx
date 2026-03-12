import { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    History,
    Save,
    CheckCircle2,
    Package,
    Plus,
    Minus,
    Percent,
    Banknote,
    MoreHorizontal,
    Calendar,
    Trash2,
    Edit2,
    Check,
    X,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useProducts } from '@/hooks/useInventory';
import { priceService } from '@/services/priceService';
import { formatCurrency, cn } from '@/lib/utils';
import type { Product } from '@/lib/supabase';

export function PriceAdjustmentManagement() {
    const { products, loading: productsLoading, refetch: refetchProducts } = useProducts();
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editNoteValue, setEditNoteValue] = useState("");
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [showBatchDialog, setShowBatchDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
    const [manualEntryForm, setManualEntryForm] = useState({
        productId: '',
        oldCost: 0,
        newCost: 0,
        oldPrice: 0,
        newPrice: 0,
        notes: ''
    });
    const [manualProductSearch, setManualProductSearch] = useState('');

    // Batch Form State
    const [batchForm, setBatchForm] = useState({
        target: 'price' as 'cost' | 'price' | 'both',
        type: 'percentage' as 'percentage' | 'fixed',
        direction: 'increase' as 'increase' | 'decrease',
        value: 0,
        notes: ''
    });

    // Per-product state for the spreadsheet-style form
    const [productLineState, setProductLineState] = useState<Record<string, {
        initialCost: number;
        currentCost: number;
        initialPrice: number;
        currentPrice: number;
    }>>({});

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const data = await priceService.getPriceHistory();
            setHistory(data || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: `Gagal mengambil riwayat harga: ${error.message || 'Error tidak diketahui'}`,
                variant: 'destructive'
            });
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleProductSelection = (id: string) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedProductIds.length === filteredProducts.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        }
    };

    // Initialize line state when dialog opens
    useEffect(() => {
        if (showBatchDialog && selectedProductIds.length > 0) {
            const newState: Record<string, any> = {};
            selectedProductIds.forEach(id => {
                const p = products.find(prod => prod.id === id);
                if (p) {
                    newState[id] = {
                        initialCost: p.initial_cost || p.cost || 0,
                        currentCost: 0, // Start empty/0 as requested
                        initialPrice: p.initial_price || p.price || 0,
                        currentPrice: 0 // Start empty/0 as requested
                    };
                }
            });
            setProductLineState(newState);
        }
    }, [showBatchDialog, selectedProductIds, products]);

    // Apply batch rules to all lines
    useEffect(() => {
        if (batchForm.value > 0) {
            const multiplier = batchForm.direction === 'increase' ? 1 : -1;
            const val = batchForm.value * multiplier;

            setProductLineState(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(id => {
                    const line = next[id];

                    if (batchForm.target === 'cost' || batchForm.target === 'both') {
                        line.currentCost = batchForm.type === 'percentage'
                            ? line.currentCost * (1 + val / 100)
                            : line.currentCost + val;
                    }
                    if (batchForm.target === 'price' || batchForm.target === 'both') {
                        line.currentPrice = batchForm.type === 'percentage'
                            ? line.currentPrice * (1 + val / 100)
                            : line.currentPrice + val;
                    }
                });
                return next;
            });

            // Reset batch value after applying to lines to avoid infinite loops or double apps
            // BUT we want it reactive. So maybe just let it be. 
            // Better: only apply when batchForm changes significantly.
        }
    }, [batchForm.target, batchForm.type, batchForm.direction, batchForm.value]);

    const handleApplyBatch = async () => {
        if (selectedProductIds.length === 0) return;
        // Removed mandatory batch value check to allow manual entries in the table
        // if (batchForm.value <= 0) {
        //     toast({ title: 'Peringatan', description: 'Nilai penyesuaian harus lebih dari 0', variant: 'destructive' });
        //     return;
        // }

        setIsSubmitting(true);
        try {
            // Transform line state into the format service expects
            const granularUpdates = Object.entries(productLineState).map(([id, state]) => ({
                productId: id,
                initialCost: state.initialCost,
                currentCost: state.currentCost,
                initialPrice: state.initialPrice,
                currentPrice: state.currentPrice,
                notes: batchForm.notes
            }));

            await priceService.applyGranularAdjustments(granularUpdates);

            toast({
                title: 'Berhasil',
                description: `${selectedProductIds.length} produk berhasil disesuaikan harganya`,
            });

            setShowBatchDialog(false);
            setSelectedProductIds([]);
            refetchProducts();
            fetchHistory();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Gagal menyesuaikan harga',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHistory = async (id: string) => {
        if (!confirm('Hapus riwayat ini?')) return;

        // Simpan data lama untuk rollback jika gagal
        const previousHistory = [...history];

        // Update optimistik: hapus dari UI segera
        setHistory(prev => prev.filter(h => h.id !== id));

        try {
            await priceService.deletePriceHistory(id);
            toast({ title: 'Berhasil', description: 'Riwayat berhasil dihapus' });
            // Tidak perlu fetchHistory() lagi karena sudah diupdate secara optimistik
            // Kecuali jika ingin sinkronisasi total, bisa ditambahkan await fetchHistory()
        } catch (error: any) {
            // Rollback jika gagal
            setHistory(previousHistory);
            toast({
                title: 'Error',
                description: `Gagal menghapus riwayat: ${error.message || 'Hapus baris gagal'}`,
                variant: 'destructive'
            });
        }
    };

    const handleUpdateNote = async (id: string) => {
        try {
            await priceService.updatePriceHistory(id, { notes: editNoteValue });
            toast({ title: 'Berhasil', description: 'Catatan diperbarui' });
            setEditingNoteId(null);
            fetchHistory();
        } catch (error: any) {
            toast({ title: 'Error', description: `Gagal memperbarui catatan: ${error.message || ''}`, variant: 'destructive' });
        }
    };

    const handleCreateManualEntry = async () => {
        if (!manualEntryForm.productId) {
            toast({ title: 'Peringatan', description: 'Pilih produk terlebih dahulu', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            await priceService.createManualHistoryEntry(manualEntryForm);
            toast({ title: 'Berhasil', description: 'Riwayat manual berhasil ditambahkan' });
            setShowManualEntryDialog(false);
            setManualEntryForm({
                productId: '',
                oldCost: 0,
                newCost: 0,
                oldPrice: 0,
                newPrice: 0,
                notes: ''
            });
            fetchHistory();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Gagal menambahkan riwayat', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Penyesuaian Harga Material</h1>
                    <p className="text-muted-foreground font-body">Kelola kenaikan dan penurunan harga material secara massal</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                        <DialogTrigger asChild>
                            <Button
                                disabled={selectedProductIds.length === 0}
                                className="bg-inventory hover:bg-inventory-dark font-body"
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Sesuaikan Harga Masal ({selectedProductIds.length})
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Penyesuaian Harga Massal</DialogTitle>
                                <DialogDescription className="text-xs">
                                    Kelola harga awal dan harga baru secara langsung dalam tabel.
                                </DialogDescription>
                            </DialogHeader>

                            <Card className="bg-muted/30 border-none">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        <Save className="w-3 h-3" />
                                        Aksi Massal (Opsional)
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Target</Label>
                                            <Select
                                                value={batchForm.target}
                                                onValueChange={(v: any) => setBatchForm(prev => ({ ...prev, target: v }))}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="price">Harga Jual</SelectItem>
                                                    <SelectItem value="cost">Harga Beli</SelectItem>
                                                    <SelectItem value="both">Keduanya</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Jenis</Label>
                                            <Select
                                                value={batchForm.direction}
                                                onValueChange={(v: any) => setBatchForm(prev => ({ ...prev, direction: v }))}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="increase">Naik (+)</SelectItem>
                                                    <SelectItem value="decrease">Turun (-)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Nilai (Ubah Semua)</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={batchForm.value || ''}
                                                    onChange={(e) => setBatchForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                                    className="h-8 text-xs pr-6"
                                                />
                                                <div className="absolute inset-y-0 right-1 flex items-center text-[10px] text-muted-foreground">
                                                    {batchForm.type === 'percentage' ? '%' : 'Rp'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-3 h-3" />
                                        Daftar Isian Produk
                                    </div>
                                    <div className="flex gap-4">
                                        <Badge variant="outline" className="text-[9px] font-normal italic">Ketik langsung untuk ubah</Badge>
                                    </div>
                                </div>

                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-gray-50/80">
                                            <TableRow className="h-9 border-b border-gray-100">
                                                <TableHead className="text-[10px] font-extrabold text-gray-600">Material / SKU</TableHead>
                                                <TableHead className="text-[10px] font-extrabold text-gray-600 text-center w-[40px]">Tipe</TableHead>
                                                <TableHead className="text-[10px] font-extrabold text-gray-600 text-center w-[120px]">Harga Awal</TableHead>
                                                <TableHead className="text-[10px] font-extrabold text-gray-600 text-center w-[120px]">Harga Baru</TableHead>
                                                <TableHead className="text-[10px] font-extrabold text-gray-600 text-center w-[80px]">Perubahan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-gray-50">
                                            {selectedProductIds.map(id => {
                                                const p = products.find(prod => prod.id === id);
                                                const state = productLineState[id];
                                                if (!p || !state) return null;

                                                const costDiff = state.currentCost ? state.currentCost - state.initialCost : 0;
                                                const costPerc = state.initialCost && state.currentCost ? (costDiff / state.initialCost) * 100 : 0;
                                                const priceDiff = state.currentPrice ? state.currentPrice - state.initialPrice : 0;
                                                const pricePerc = state.initialPrice && state.currentPrice ? (priceDiff / state.initialPrice) * 100 : 0;

                                                return (
                                                    <Fragment key={id}>
                                                        {/* Row for Purchase Price (B) */}
                                                        <TableRow className="h-10 hover:bg-inventory/5 transition-colors border-b-0">
                                                            <TableCell rowSpan={2} className="py-2 border-r border-gray-100">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-bold text-[10px] leading-tight text-gray-700 line-clamp-1 w-[150px]">{p.name}</span>
                                                                    <span className="text-[8px] font-mono text-muted-foreground uppercase">{p.sku}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-1.5 text-center font-bold text-inventory text-[10px] bg-inventory/5">B</TableCell>
                                                            <TableCell className="p-1.5 text-right font-mono text-[10px] text-gray-500">
                                                                {formatCurrency(state.initialCost)}
                                                            </TableCell>
                                                            <TableCell className="p-1.5">
                                                                <Input
                                                                    type="number"
                                                                    value={state.currentCost || ''}
                                                                    onChange={(e) => setProductLineState(prev => ({
                                                                        ...prev,
                                                                        [id]: { ...prev[id], currentCost: parseFloat(e.target.value) || 0 }
                                                                    }))}
                                                                    className="h-7 text-[10px] text-right font-mono font-bold bg-white border-gray-200 focus:border-inventory focus:ring-0 shadow-none"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-1.5 text-center">
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[8px] px-1 py-0 h-4 min-w-[38px] justify-center font-bold border-none",
                                                                    costPerc > 0 ? "text-green-600 bg-green-50" : costPerc < 0 ? "text-red-600 bg-red-50" : "text-gray-400"
                                                                )}>
                                                                    {state.currentCost > 0 ? (costPerc > 0 ? '+' : '') + costPerc.toFixed(0) + '%' : '-'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                        {/* Row for Selling Price (J) */}
                                                        <TableRow className="h-10 hover:bg-inventory/5 transition-colors">
                                                            <TableCell className="p-1.5 text-center font-bold text-blue-600 text-[10px] bg-blue-50/30">J</TableCell>
                                                            <TableCell className="p-1.5 text-right font-mono text-[10px] text-gray-500">
                                                                {formatCurrency(state.initialPrice)}
                                                            </TableCell>
                                                            <TableCell className="p-1.5">
                                                                <Input
                                                                    type="number"
                                                                    value={state.currentPrice || ''}
                                                                    onChange={(e) => setProductLineState(prev => ({
                                                                        ...prev,
                                                                        [id]: { ...prev[id], currentPrice: parseFloat(e.target.value) || 0 }
                                                                    }))}
                                                                    className="h-7 text-[10px] text-right font-mono font-bold bg-white border-gray-200 focus:border-inventory focus:ring-0 shadow-none"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="p-1.5 text-center">
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[8px] px-1 py-0 h-4 min-w-[38px] justify-center font-bold border-none",
                                                                    pricePerc > 0 ? "text-green-600 bg-green-50" : pricePerc < 0 ? "text-red-600 bg-red-50" : "text-gray-400"
                                                                )}>
                                                                    {state.currentPrice > 0 ? (pricePerc > 0 ? '+' : '') + pricePerc.toFixed(0) + '%' : '-'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    </Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="space-y-1 pb-4">
                                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Keterangan Riwayat</Label>
                                <Input
                                    placeholder="Contoh: Penyesuaian harga pasar bulan ini..."
                                    value={batchForm.notes}
                                    onChange={(e) => setBatchForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="h-8 text-xs font-body"
                                />
                            </div>

                            <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-3 text-xs">
                                <Button variant="ghost" onClick={() => setShowBatchDialog(false)} className="h-9 px-6 text-xs text-muted-foreground tracking-wide font-medium hover:bg-white border-none shadow-none">
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleApplyBatch}
                                    disabled={isSubmitting}
                                    className="h-9 px-10 bg-inventory hover:bg-inventory-dark text-xs font-bold tracking-widest text-white shadow-md shadow-inventory/20 border-none"
                                >
                                    {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="font-body">
                    <TabsTrigger value="products">
                        <Package className="w-4 h-4 mr-2" />
                        Daftar Produk
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="w-4 h-4 mr-2" />
                        Riwayat Perubahan
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="mt-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama produk atau SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 font-body"
                            />
                        </div>
                        <Button variant="outline" className="font-body">
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                    </div>

                    <Card className="border-gray-200">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="font-body">Produk</TableHead>
                                        <TableHead className="font-body">SKU</TableHead>
                                        <TableHead className="font-body text-right">Harga Awal</TableHead>
                                        <TableHead className="font-body text-right">Harga Sekarang</TableHead>
                                        <TableHead className="font-body text-center">% Perubahan</TableHead>
                                        <TableHead className="font-body">Kategori</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin" />
                                                    <span className="text-muted-foreground text-sm font-body">Memuat data produk...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <p className="text-muted-foreground font-body">Tidak ada produk ditemukan</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProducts.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedProductIds.includes(p.id)}
                                                        onCheckedChange={() => toggleProductSelection(p.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-body font-medium">{p.name}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground text-[10px]">Beli: {formatCurrency(p.initial_cost || p.cost || 0)}</span>
                                                        <span className="text-muted-foreground text-[10px]">Jual: {formatCurrency(p.initial_price || p.price || 0)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">Beli: {formatCurrency(p.cost || 0)}</span>
                                                        <span className="font-bold">Jual: {formatCurrency(p.price || 0)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(() => {
                                                        const priceDiff = (p.price || 0) - (p.initial_price || p.price || 0);
                                                        const pricePerc = (p.initial_price || p.price) ? (priceDiff / (p.initial_price || p.price)) * 100 : 0;

                                                        return (
                                                            <Badge
                                                                variant={pricePerc > 0 ? "default" : pricePerc < 0 ? "destructive" : "secondary"}
                                                                className={cn(
                                                                    "text-[10px] px-1 py-0 h-4 min-w-[3rem] justify-center",
                                                                    pricePerc > 0 && "bg-green-100 text-green-700 hover:bg-green-100",
                                                                    pricePerc === 0 && "bg-gray-100 text-gray-500 hover:bg-gray-100"
                                                                )}
                                                            >
                                                                {pricePerc > 0 ? '+' : ''}{pricePerc.toFixed(1)}%
                                                            </Badge>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="font-body text-xs">{p.product_categories?.name || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <Card className="border-gray-200">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="font-display text-lg">Log Perubahan Harga</CardTitle>
                                    <CardDescription className="font-body italic text-xs">Menampilkan riwayat penyesuaian harga terbaru</CardDescription>
                                </div>
                                <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="text-xs h-8 border-inventory text-inventory hover:bg-inventory/10 font-bold">
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            Tambah Riwayat Manual
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Tambah Riwayat Harga Manual</DialogTitle>
                                            <DialogDescription>
                                                Catat perubahan harga tanpa mengubah data produk saat ini.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label className="text-xs font-bold">Produk</Label>
                                                <Select
                                                    value={manualEntryForm.productId}
                                                    onValueChange={(id) => {
                                                        const p = products.find(prod => prod.id === id);
                                                        if (p) {
                                                            setManualEntryForm(prev => ({
                                                                ...prev,
                                                                productId: id,
                                                                oldCost: p.cost || 0,
                                                                newCost: p.cost || 0,
                                                                oldPrice: p.price || 0,
                                                                newPrice: p.price || 0
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="text-xs">
                                                        <SelectValue placeholder="Pilih Produk" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <div className="p-2 sticky top-0 bg-white">
                                                            <Input
                                                                placeholder="Cari..."
                                                                className="h-8 text-xs"
                                                                value={manualProductSearch}
                                                                onChange={(e) => setManualProductSearch(e.target.value)}
                                                            />
                                                        </div>
                                                        {products
                                                            .filter(p => p.name.toLowerCase().includes(manualProductSearch.toLowerCase()) || p.sku.toLowerCase().includes(manualProductSearch.toLowerCase()))
                                                            .slice(0, 50)
                                                            .map(p => (
                                                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                                                    {p.name} ({p.sku})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Harga Beli Lama</Label>
                                                    <Input
                                                        type="number"
                                                        value={manualEntryForm.oldCost || ''}
                                                        onChange={(e) => setManualEntryForm(prev => ({ ...prev, oldCost: parseFloat(e.target.value) || 0 }))}
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-[10px] font-bold uppercase text-inventory">Harga Beli Baru</Label>
                                                    <Input
                                                        type="number"
                                                        value={manualEntryForm.newCost || ''}
                                                        onChange={(e) => setManualEntryForm(prev => ({ ...prev, newCost: parseFloat(e.target.value) || 0 }))}
                                                        className="h-8 text-xs font-mono border-inventory/50"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Harga Jual Lama</Label>
                                                    <Input
                                                        type="number"
                                                        value={manualEntryForm.oldPrice || ''}
                                                        onChange={(e) => setManualEntryForm(prev => ({ ...prev, oldPrice: parseFloat(e.target.value) || 0 }))}
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-[10px] font-bold uppercase text-blue-600">Harga Jual Baru</Label>
                                                    <Input
                                                        type="number"
                                                        value={manualEntryForm.newPrice || ''}
                                                        onChange={(e) => setManualEntryForm(prev => ({ ...prev, newPrice: parseFloat(e.target.value) || 0 }))}
                                                        className="h-8 text-xs font-mono border-blue-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs font-bold">Keterangan</Label>
                                                <Input
                                                    placeholder="Alasan perubahan..."
                                                    value={manualEntryForm.notes}
                                                    onChange={(e) => setManualEntryForm(prev => ({ ...prev, notes: e.target.value }))}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleCreateManualEntry} disabled={isSubmitting} className="bg-inventory hover:bg-inventory-dark text-xs font-bold w-full">
                                                {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN RIWAYAT'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="px-6 pb-4 flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari riwayat berdasarkan produk atau manual..."
                                        value={historySearchQuery}
                                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                                        className="pl-10 h-9 text-xs font-body"
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 text-gray-500"
                                    onClick={fetchHistory}
                                    disabled={historyLoading}
                                >
                                    <RefreshCw className={cn("w-4 h-4", historyLoading && "animate-spin")} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-body">Tanggal</TableHead>
                                        <TableHead className="font-body">Produk</TableHead>
                                        <TableHead className="font-body">Perubahan</TableHead>
                                        <TableHead className="font-body text-right">Beli (Lama → Baru)</TableHead>
                                        <TableHead className="font-body text-right">Jual (Lama → Baru)</TableHead>
                                        <TableHead className="font-body">Keterangan</TableHead>
                                        <TableHead className="font-body text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <div className="w-6 h-6 border-2 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : history.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12">
                                                <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                <p className="text-muted-foreground font-body">Belum ada riwayat penyesuaian harga</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        history
                                            .filter(h =>
                                                h.products?.name?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                                                h.products?.sku?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                                                h.notes?.toLowerCase().includes(historySearchQuery.toLowerCase())
                                            )
                                            .map(h => {
                                                const costDiff = (h.new_cost || 0) - (h.old_cost || 0);
                                                const costPerc = (h.old_cost > 0) ? (costDiff / h.old_cost) * 100 : 0;

                                                const priceDiff = (h.new_price || 0) - (h.old_price || 0);
                                                const pricePerc = (h.old_price > 0) ? (priceDiff / h.old_price) * 100 : 0;

                                                return (
                                                    <TableRow key={h.id}>
                                                        <TableCell className="font-body text-xs whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                                {new Date(h.created_at).toLocaleString('id-ID')}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-body font-medium text-xs">{h.products?.name}</p>
                                                                <p className="font-mono text-[10px] text-muted-foreground">{h.products?.sku}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1.5">
                                                                {h.new_cost > 0 && h.new_cost !== h.old_cost && (
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-[9px] px-1 h-3.5 bg-blue-50 text-blue-700 border-blue-200">B</Badge>
                                                                        <div className="flex items-center gap-0.5 font-mono text-[10px]">
                                                                            {costPerc > 0 ? <TrendingUp className="w-2.5 h-2.5 text-green-600" /> : <ArrowDownRight className="w-2.5 h-2.5 text-red-600" />}
                                                                            <span className={costPerc > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                                {costPerc > 0 ? '+' : ''}{costPerc.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {h.new_price > 0 && h.new_price !== h.old_price && (
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-[9px] px-1 h-3.5 bg-purple-50 text-purple-700 border-purple-200">J</Badge>
                                                                        <div className="flex items-center gap-0.5 font-mono text-[10px]">
                                                                            {pricePerc > 0 ? <TrendingUp className="w-2.5 h-2.5 text-green-600" /> : <ArrowDownRight className="w-2.5 h-2.5 text-red-600" />}
                                                                            <span className={pricePerc > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                                {pricePerc > 0 ? '+' : ''}{pricePerc.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col font-mono text-[10px]">
                                                                <span className="text-muted-foreground line-through opacity-50">{formatCurrency(h.old_cost || 0)}</span>
                                                                <span className="font-bold text-blue-700">{formatCurrency(h.new_cost || 0)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col font-mono text-[10px]">
                                                                <span className="text-muted-foreground line-through opacity-50">{formatCurrency(h.old_price || 0)}</span>
                                                                <span className="font-bold text-purple-700">{formatCurrency(h.new_price || 0)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-body text-[10px] text-muted-foreground">
                                                            {editingNoteId === h.id ? (
                                                                <Input
                                                                    value={editNoteValue}
                                                                    onChange={(e) => setEditNoteValue(e.target.value)}
                                                                    className="h-7 text-[10px] w-full"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <span className="truncate block max-w-[150px]">{h.notes || '-'}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {editingNoteId === h.id ? (
                                                                    <>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleUpdateNote(h.id)}>
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => setEditingNoteId(null)}>
                                                                            <X className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 w-7 text-gray-500 hover:text-inventory"
                                                                            onClick={() => {
                                                                                setEditingNoteId(h.id);
                                                                                setEditNoteValue(h.notes || "");
                                                                            }}
                                                                        >
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 w-7 text-gray-400 hover:text-destructive"
                                                                            onClick={() => handleDeleteHistory(h.id)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}
