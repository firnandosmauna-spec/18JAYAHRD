import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { useProducts, useProductCategories, useWarehouses, useStockMovements, useLowStockProducts, useInventoryUnits } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/supabase';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Warehouse,
  ShoppingCart,
  Truck,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Scale,
  Tags,
  Users,
  Box,
  MapPin,
  Settings2,
  GripVertical,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SupplierManagement } from '../../components/purchase/SupplierManagement';
import { CategoryManagement } from '../../components/inventory/CategoryManagement';
import { WarehouseManagement } from '../../components/inventory/WarehouseManagement';
import { UnitManagement } from '../../components/inventory/UnitManagement';
import { ProjectLocationManagement } from '../../components/inventory/ProjectLocationManagement';
import { AddProductDialog } from '../../components/inventory/AddProductDialog';
import { MaterialPurchaseManagement } from '../../components/inventory/MaterialPurchaseManagement';
import { StockOutManagement } from '../../components/inventory/StockOutManagement';
import { AddStockMovementDialog } from '../../components/inventory/AddStockMovementDialog';
import { InventoryReports } from '../../components/inventory/InventoryReports';
// WatermanSalaryManagement removed as it was unused and non-existent
import { PaymentMethodManagement } from '../../components/inventory/PaymentMethodManagement';
import { PriceAdjustmentManagement } from '../../components/inventory/PriceAdjustmentManagement';
import { SupplierDebtManagement } from '../../components/inventory/SupplierDebtManagement';

const navItems = [
  { label: 'Dashboard', href: '/inventory', icon: Package },
  {
    group: 'Master Data',
    items: [
      { label: 'Master Produk', href: '/inventory/products', icon: Package },
      { label: 'Master Supplier', href: '/inventory/suppliers', icon: Truck },
      { label: 'Satuan', href: '/inventory/units', icon: Scale },
      { label: 'Lokasi Proyek', href: '/inventory/locations', icon: MapPin },
      { label: 'Kategori', href: '/inventory/categories', icon: Tags },
      { label: 'Gudang', href: '/inventory/warehouse', icon: Warehouse },
      { label: 'Cara Pembayaran', href: '/inventory/payment-methods', icon: CreditCard },
    ]
  },
  {
    group: 'Operasional',
    items: [
      { label: 'Belanja Material', href: '/inventory/stock-in', icon: ArrowDownRight },
      { label: 'Ending material masuk dan keluar', href: '/inventory/stock-out', icon: ArrowUpRight },
      { label: 'Penyesuaian Harga', href: '/inventory/price-adjustments', icon: TrendingUp },
      { label: 'Hutang Supplier', href: '/inventory/supplier-debt', icon: DollarSign },
    ]
  },
  {
    group: 'Laporan',
    items: [
      { label: 'Laporan', href: '/inventory/reports', icon: BarChart3 },
    ]
  }
];

// Helper function to determine product status
function getProductStatus(product: Product): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (product.stock === 0) return 'out-of-stock'
  if (product.stock <= product.min_stock) return 'low-stock'
  return 'in-stock'
}

// Satuan produk (moved to useInventoryUnits hook)


function InventoryDashboard() {
  const { products, loading: productsLoading, addProduct, refetch: refetchProducts } = useProducts();
  const { categories } = useProductCategories();
  const { warehouses } = useWarehouses();
  const { units } = useInventoryUnits();
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { movements, loading: movementsLoading } = useStockMovements(lastWeek, undefined);
  const { products: lowStockProducts } = useLowStockProducts();
  const { toast } = useToast();

  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showStockOutDialog, setShowStockOutDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Calculate stats from real data
  const stats = [
    {
      label: 'Total Produk',
      value: products.length,
      icon: Package,
      change: `+${products.filter(p => p.status === 'active').length}`
    },
    {
      label: 'Stok Rendah',
      value: lowStockProducts.length,
      icon: AlertTriangle,
      change: `+${lowStockProducts.length}`,
      warning: true
    },
    {
      label: 'Belanja Material',
      value: movements.filter(m => m.movement_type === 'in').length,
      icon: TrendingUp,
      change: '+12%'
    },
    {
      label: 'Ending material masuk dan keluar',
      value: movements.filter(m => m.movement_type === 'out').length,
      icon: TrendingDown,
      change: '+8%'
    },
  ];

  const handleAddSuccess = () => {
    refetchProducts();
    toast({ title: 'Berhasil', description: 'Data produk telah diperbarui' });
  };

  if (productsLoading || movementsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat data inventaris...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Dashboard Persediaan</h1>
          <p className="text-muted-foreground font-body">Kelola stok dan inventaris bahan bangunan</p>
        </div>
        <Button onClick={() => setShowAddProductDialog(true)} className="bg-inventory hover:bg-inventory-dark font-body">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
        <AddProductDialog
          open={showAddProductDialog}
          onOpenChange={setShowAddProductDialog}
          onSuccess={handleAddSuccess}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-gray-200 ${stat.warning ? 'border-l-4 border-l-orange-500' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${stat.warning ? 'bg-orange-100' : 'bg-inventory/10'} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.warning ? 'text-orange-600' : 'text-inventory'}`} />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stat.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Low Stock Alert */}
      <Card className="border-gray-200 border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Peringatan Stok Rendah
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lowStockProducts.map((product) => {
              const status = getProductStatus(product);
              return (
                <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'out-of-stock' ? 'bg-red-100' : 'bg-orange-100'
                      }`}>
                      <Package className={`w-5 h-5 ${status === 'out-of-stock' ? 'text-red-600' : 'text-orange-600'
                        }`} />
                    </div>
                    <div>
                      <p className="font-medium font-body text-[#1C1C1E]">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-body">
                        {product.sku} • {product.suppliers?.name || 'No Supplier'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-mono font-semibold ${status === 'out-of-stock' ? 'text-red-600' : 'text-orange-600'
                        }`}>
                        {product.stock} / {product.min_stock}
                      </p>
                      <Progress
                        value={product.min_stock > 0 ? (product.stock / product.min_stock) * 100 : 0}
                        className="w-24 h-2"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-body"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowRestockDialog(true);
                      }}
                    >
                      Restok
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Stock Movements */}
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Pergerakan Stok Terbaru</CardTitle>
          <Button variant="ghost" size="sm" className="text-inventory font-body">
            Lihat Semua
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {movements.slice(0, 5).map((movement: any) => {
              const product = movement.products;
              const productName = product?.name || 'Unknown Product';
              const movementDate = new Date(movement.created_at).toLocaleDateString('id-ID');

              return (
                <div key={movement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${movement.movement_type === 'in' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                      {movement.movement_type === 'in' ? (
                        <ArrowDownRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium font-body text-[#1C1C1E]">{productName}</p>
                      <p className="text-sm text-muted-foreground font-body">
                        {movement.reference || '-'} • {movementDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-semibold ${movement.movement_type === 'in' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                      {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity} unit
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatCurrency(movement.unit_price || (movement.movement_type === 'in' ? product?.cost : product?.price) || 0)} / unit
                    </p>
                    <p className={`text-xs font-bold font-mono ${movement.movement_type === 'in' ? 'text-green-700' : 'text-blue-700'}`}>
                      {formatCurrency(movement.quantity * (movement.unit_price || (movement.movement_type === 'in' ? product?.cost : product?.price) || 0))}
                    </p>
                  </div>
                </div>
              );
            })}
            {movements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-body">
                Belum ada pergerakan stok
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AddStockMovementDialog
        open={showRestockDialog}
        onOpenChange={setShowRestockDialog}
        onSuccess={() => {
          refetchProducts();
          toast({ title: 'Berhasil', description: 'Stok berhasil ditambahkan' });
        }}
        product={selectedProduct}
        mode="in"
      />

      <AddStockMovementDialog
        open={showStockOutDialog}
        onOpenChange={setShowStockOutDialog}
        onSuccess={() => {
          refetchProducts();
          toast({ title: 'Berhasil', description: 'Stok berhasil dikurangi' });
        }}
        product={selectedProduct}
        mode="out"
      />
    </div>
  );
}

function ProductList() {
  const { products, loading, addProduct, updateProduct, deleteProduct, refetch } = useProducts();
  const { categories } = useProductCategories();
  const { warehouses } = useWarehouses();
  const { units } = useInventoryUnits();
  const { toast } = useToast();


  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showStockInDialog, setShowStockInDialog] = useState(false);
  const [showStockOutDialog, setShowStockOutDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultCols = {
      no: true,
      date: true,
      product: true,
      sku: true,
      category: true,
      volume: true,
      satuan: true,
      warehouse: true,
      supplier: true,
      costPrice: true,
      totalPrice: true,
      actions: true
    };
    const saved = localStorage.getItem('inventory_product_list_cols_v3');
    if (saved) {
      try {
        return { ...defaultCols, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse product list columns:', e);
      }
    }
    return defaultCols;
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const defaultOrder = ['no', 'date', 'product', 'sku', 'category', 'volume', 'satuan', 'warehouse', 'supplier', 'costPrice', 'totalPrice', 'actions'];
    const saved = localStorage.getItem('inventory_product_list_order_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Map existing columns that are still valid
        const filtered = parsed.filter((col: string) => defaultOrder.includes(col));
        // Find columns in defaultOrder that are missing in the saved order (e.g. newly added columns)
        const missing = defaultOrder.filter(col => !filtered.includes(col));
        // Return saved order + any new missing default columns at the end
        return [...filtered, ...missing];
      } catch (e) {
        return defaultOrder;
      }
    }
    return defaultOrder;
  });


  const columnLabels: Record<string, string> = {
    no: 'No',
    date: 'Tanggal',
    product: 'Produk',
    sku: 'SKU',
    category: 'Kategori',
    volume: 'Volume',
    satuan: 'Satuan',
    warehouse: 'Gudang',
    supplier: 'Supplier',
    costPrice: 'Harga Beli',
    totalPrice: 'Total Harga',
    actions: 'Aksi'
  };

  useEffect(() => {
    localStorage.setItem('inventory_product_list_cols_v3', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('inventory_product_list_order_v2', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const toggleColumn = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const filteredProducts = (products || []).filter(product =>
    (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setShowAddProductDialog(true);
  };

  const renderProductTable = (items: Product[]) => {
    const getColumnClass = (colId: string) => {
      switch (colId) {
        case 'no': return 'w-12 shrink-0';
        case 'date': return 'w-24 shrink-0';
        case 'product': return 'flex-1 min-w-[200px] truncate';
        case 'sku': return 'w-32 shrink-0';
        case 'category': return 'w-32 shrink-0';
        case 'volume': return 'w-20 shrink-0';
        case 'satuan': return 'w-20 shrink-0';
        case 'warehouse': return 'w-32 shrink-0';
        case 'supplier': return 'w-40 shrink-0';
        case 'costPrice': return 'w-32 shrink-0';
        case 'totalPrice': return 'w-32 shrink-0';
        case 'actions': return 'w-16 shrink-0 text-right';
        default: return 'flex-1';
      }
    };

    return (
      <Card className="border-gray-200">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-max">
            {/* Header */}
            <div className="bg-gray-50/50 border-b">
              <Reorder.Group
                axis="x"
                values={columnOrder}
                onReorder={setColumnOrder}
                className="flex items-center px-4"
              >
                {columnOrder.map((colId) => (
                  visibleColumns[colId] && (
                    <Reorder.Item
                      key={colId}
                      value={colId}
                      className={cn(
                        "h-12 flex items-center gap-2 px-2 text-left font-medium text-muted-foreground cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors select-none",
                        getColumnClass(colId)
                      )}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/40" />
                      <span className="font-body text-xs uppercase tracking-wider">{columnLabels[colId]}</span>
                    </Reorder.Item>
                  )
                ))}
              </Reorder.Group>
            </div>

            {/* Body */}
            <div className="divide-y divide-gray-100">
              {items.map((product, index) => (
                <div key={product.id} className="flex items-center px-4 hover:bg-gray-50/50 transition-colors">
                  {columnOrder.map((colId) => {
                    if (!visibleColumns[colId]) return null;
                    const cellClass = cn("h-14 flex items-center px-2 py-3 overflow-hidden", getColumnClass(colId));

                    switch (colId) {
                      case 'no':
                        return <div key="no" className={cn(cellClass, "font-mono text-xs text-gray-500")}>{index + 1}</div>;
                      case 'date':
                        return <div key="date" className={cn(cellClass, "font-body text-xs")}>{product.date ? new Date(product.date).toLocaleDateString('id-ID') : '-'}</div>;
                      case 'product':
                        return <div key="product" className={cn(cellClass, "font-body font-medium text-gray-900")}>{product.name}</div>;
                      case 'sku':
                        return <div key="sku" className={cn(cellClass, "font-mono text-xs text-gray-600")}>{product.sku}</div>;
                      case 'category':
                        return <div key="category" className={cn(cellClass, "font-body text-sm")}>{product.product_categories?.name || '-'}</div>;
                      case 'volume':
                        return <div key="volume" className={cn(cellClass, "font-body text-sm")}>{product.volume || '-'}</div>;
                      case 'satuan':
                        return <div key="satuan" className={cn(cellClass, "font-body text-sm")}>{product.unit || '-'}</div>;
                      case 'warehouse':
                        return <div key="warehouse" className={cn(cellClass, "font-body text-sm")}>{product.warehouses?.name || '-'}</div>;
                      case 'supplier':
                        return <div key="supplier" className={cn(cellClass, "font-body text-sm")}>{product.suppliers?.name || '-'}</div>;
                      case 'costPrice':
                        return <div key="costPrice" className={cn(cellClass, "font-mono text-xs")}>{formatCurrency(product.cost || 0)}</div>;
                      case 'totalPrice':
                        const volumeNum = Number(product.volume || 0);
                        const total = volumeNum * (product.cost || 0);
                        return <div key="totalPrice" className={cn(cellClass, "font-mono text-xs font-bold text-inventory-dark")}>{formatCurrency(total)}</div>;
                      case 'actions':
                        return (
                          <div key="actions" className={cn(cellClass, "justify-end")}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(product)} className="font-body">Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(product.id)} className="font-body text-destructive">Hapus</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await deleteProduct(id);
        toast({ title: 'Berhasil', description: 'Produk berhasil dihapus' });
        refetch();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Gagal menghapus produk',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Master Produk & Supplier</h1>
          <p className="text-muted-foreground font-body">Kelola katalog bahan baku bangunan</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setShowAddProductDialog(true); }} className="bg-inventory hover:bg-inventory-dark font-body">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
        <AddProductDialog
          open={showAddProductDialog}
          onOpenChange={setShowAddProductDialog}
          onSuccess={() => { refetch(); setEditingProduct(null); }}
          existingProduct={editingProduct}
        />
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="font-body">
                <Settings2 className="w-4 h-4 mr-2" />
                Kolom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <h4 className="font-medium leading-none mb-4">Pengaturan Kolom</h4>
                <div className="space-y-3">
                  {Object.entries({
                    no: 'No',
                    date: 'Tanggal',
                    product: 'Produk',
                    sku: 'SKU',
                    category: 'Kategori',
                    volume: 'Volume',
                    satuan: 'Satuan',
                    warehouse: 'Gudang',
                    supplier: 'Supplier',
                    costPrice: 'Harga Beli',
                    totalPrice: 'Total Harga',
                    actions: 'Aksi'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${key}`}
                        checked={(visibleColumns as any)[key]}
                        onCheckedChange={() => toggleColumn(key)}
                      />
                      <Label
                        htmlFor={`col-${key}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" className="font-body">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="font-body">
          <TabsTrigger value="all">Semua ({filteredProducts.length})</TabsTrigger>
          <TabsTrigger value="in-stock">Tersedia</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderProductTable(filteredProducts)}
        </TabsContent>

        <AddStockMovementDialog
          open={showStockInDialog}
          onOpenChange={setShowStockInDialog}
          onSuccess={() => {
            refetch();
            toast({ title: 'Berhasil', description: 'Stok berhasil ditambahkan' });
          }}
          product={selectedProduct}
          mode="in"
        />
        <AddStockMovementDialog
          open={showStockOutDialog}
          onOpenChange={setShowStockOutDialog}
          onSuccess={() => {
            refetch();
            toast({ title: 'Berhasil', description: 'Stok berhasil dikurangi' });
          }}
          product={selectedProduct}
          mode="out"
        />

        <TabsContent value="in-stock" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.filter(p => (p.stock || 0) > ((p as any).min_stock || 5)).map((product) => (
              <Card key={product.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-inventory/10 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-inventory" />
                    </div>
                    <Badge className="bg-green-100 text-green-700 font-body">Tersedia</Badge>
                  </div>
                  <h3 className="font-medium font-body text-[#1C1C1E] mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono mb-4">{product.sku}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-[#1C1C1E]">{product.stock || 0} unit</span>
                    <span className="font-mono text-sm text-muted-foreground">{formatCurrency(product.price)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 bg-inventory/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Warehouse className="w-8 h-8 text-inventory" />
        </div>
        <h2 className="font-display text-xl font-bold text-[#1C1C1E] mb-2">{title}</h2>
        <p className="text-muted-foreground font-body">Halaman ini sedang dalam pengembangan</p>
      </div>
    </div>
  );
}

function InventoryModule() {
  const savedPath = localStorage.getItem('lastPath_inventory');
  console.log('🔍 InventoryModule: savedPath from localStorage:', savedPath);

  return (
    <ModuleLayout moduleId="inventory" title="Persediaan" navItems={navItems}>
      <Routes>
        <Route index element={
          savedPath && savedPath !== '/inventory' && savedPath.startsWith('/inventory') ? (
            <Navigate to={savedPath} replace />
          ) : (
            <InventoryDashboard />
          )
        } />
        <Route path="products" element={<ProductList />} />
        <Route path="stock-in" element={<MaterialPurchaseManagement />} />
        <Route path="stock-out" element={<StockOutManagement />} />
        <Route path="suppliers" element={<SupplierManagement />} />
        <Route path="units" element={<UnitManagement />} />
        <Route path="locations" element={<ProjectLocationManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="warehouse" element={<WarehouseManagement />} />
        <Route path="payment-methods" element={<PaymentMethodManagement />} />
        <Route path="price-adjustments" element={<PriceAdjustmentManagement />} />
        <Route path="supplier-debt" element={<SupplierDebtManagement />} />
        <Route path="reports" element={<InventoryReports />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </ModuleLayout>
  );
}

export default InventoryModule;
