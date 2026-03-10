import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { useProducts, useProductCategories, useWarehouses, useStockMovements, useLowStockProducts, useInventoryUnits } from '@/hooks/useInventory';
import { useToast } from '@/components/ui/use-toast';
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
  MapPin
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
import { SupplierManagement } from '@/components/purchase/SupplierManagement';
import { CategoryManagement } from '@/components/inventory/CategoryManagement';
import { WarehouseManagement } from '@/components/inventory/WarehouseManagement';
import { UnitManagement } from '@/components/inventory/UnitManagement';
import { VolumeManagement } from '@/components/inventory/VolumeManagement';
import { ProjectLocationManagement } from '@/components/inventory/ProjectLocationManagement';
import { AddProductDialog } from '@/components/inventory/AddProductDialog';
import { StockInManagement } from '@/components/inventory/StockInManagement';
import { StockOutManagement } from '@/components/inventory/StockOutManagement';
import { AddStockMovementDialog } from '@/components/inventory/AddStockMovementDialog';
import { InventoryReports } from '@/components/inventory/InventoryReports';

const navItems = [
  { label: 'Dashboard', href: '/inventory', icon: Package },
  { label: 'Produk', href: '/inventory/products', icon: Package },
  { label: 'Stok Masuk', href: '/inventory/stock-in', icon: ArrowDownRight },
  { label: 'Stok Keluar', href: '/inventory/stock-out', icon: ArrowUpRight },
  { label: 'Supplier', href: '/inventory/suppliers', icon: Truck },
  { label: 'Satuan', href: '/inventory/units', icon: Scale },
  { label: 'Volume', href: '/inventory/volumes', icon: Box },
  { label: 'Lokasi Proyek', href: '/inventory/locations', icon: MapPin },
  { label: 'Kategori', href: '/inventory/categories', icon: Tags },
  { label: 'Gudang', href: '/inventory/warehouse', icon: Warehouse },
  { label: 'Laporan', href: '/inventory/reports', icon: BarChart3 },
];

// Helper function to determine product status
function getProductStatus(product: Product): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (product.stock === 0) return 'out-of-stock'
  if (product.stock <= product.min_stock) return 'low-stock'
  return 'in-stock'
}

// Satuan produk (moved to useInventoryUnits hook)

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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
      label: 'Stok Masuk',
      value: movements.filter(m => m.movement_type === 'in').length,
      icon: TrendingUp,
      change: '+12%'
    },
    {
      label: 'Stok Keluar',
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
                      <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
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
                    <Badge variant="secondary" className="font-body text-xs">
                      {movement.movement_type === 'in' ? 'Masuk' : movement.movement_type === 'out' ? 'Keluar' : movement.movement_type}
                    </Badge>
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
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setShowAddProductDialog(true);
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
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Daftar Produk</h1>
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
        <Button variant="outline" className="font-body">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="font-body">
          <TabsTrigger value="all">Semua ({products.length})</TabsTrigger>
          <TabsTrigger value="in-stock">Tersedia</TabsTrigger>
          <TabsTrigger value="low-stock">Stok Rendah</TabsTrigger>
          <TabsTrigger value="out-of-stock">Habis</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Produk</TableHead>
                    <TableHead className="font-body">SKU</TableHead>
                    <TableHead className="font-body">Kategori</TableHead>
                    <TableHead className="font-body">Gudang</TableHead>
                    <TableHead className="font-body">Supplier</TableHead>
                    <TableHead className="font-body">Stok</TableHead>
                    <TableHead className="font-body">Harga</TableHead>
                    <TableHead className="font-body">Metode Bayar</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-body font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-body">{(product as any).product_categories?.name || '-'}</TableCell>
                      <TableCell className="font-body">{(product as any).warehouses?.name || '-'}</TableCell>
                      <TableCell className="font-body">{(product as any).suppliers?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{product.stock}</span>
                          <Progress
                            value={Math.min((product.stock / ((product as any).min_stock || 1)) * 100, 100)}
                            className="w-16 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{formatCurrency(product.price)}</TableCell>
                      <TableCell className="font-body">
                        <Badge variant="outline" className="font-body bg-gray-50">
                          {product.purchase_payment_method || 'CASH'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.stock === 0 ? 'destructive' : product.stock <= ((product as any).min_stock || 5) ? 'secondary' : 'default'}
                          className="font-body"
                        >
                          {product.stock === 0 ? 'Habis' : product.stock <= ((product as any).min_stock || 5) ? 'Stok Rendah' : 'Tersedia'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="font-body">Lihat Detail</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)} className="font-body">Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="font-body"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowStockInDialog(true);
                              }}
                            >
                              Tambah Stok
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(product.id)} className="font-body text-destructive">Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <AddStockMovementDialog
              open={showStockInDialog}
              onOpenChange={setShowStockInDialog}
              onSuccess={() => {
                refetch();
                toast({ title: 'Berhasil', description: 'Stok berhasil ditambahkan' });
              }}
              product={selectedProduct}
            />
          </Card>
        </TabsContent>

        <TabsContent value="in-stock" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.stock > ((p as any).min_stock || 5)).map((product) => (
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
                    <span className="font-mono text-lg font-bold text-[#1C1C1E]">{product.stock} unit</span>
                    <span className="font-mono text-sm text-muted-foreground">{formatCurrency(product.price)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="low-stock" className="mt-6">
          <div className="space-y-4">
            {products.filter(p => p.stock <= ((p as any).min_stock || 5) && p.stock > 0).map((product) => (
              <Card key={product.id} className="border-gray-200 border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{product.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-semibold text-orange-600">
                          {product.stock} / {(product as any).min_stock} unit
                        </p>
                        <p className="text-xs text-muted-foreground font-body">Min. stok: {(product as any).min_stock}</p>
                      </div>
                      <Button className="bg-inventory hover:bg-inventory-dark font-body">
                        Restok
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="out-of-stock" className="mt-6">
          <div className="space-y-4">
            {products.filter(p => p.stock === 0).map((product) => (
              <Card key={product.id} className="border-gray-200 border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{product.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="destructive" className="font-body">Stok Habis</Badge>
                      <Button className="bg-red-600 hover:bg-red-700 font-body">
                        Pesan Sekarang
                      </Button>
                    </div>
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

export default function InventoryModule() {
  return (
    <ModuleLayout moduleId="inventory" title="Persediaan" navItems={navItems}>
      <Routes>
        <Route index element={<InventoryDashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="stock-in" element={<StockInManagement />} />
        <Route path="stock-out" element={<StockOutManagement />} />
        <Route path="suppliers" element={<SupplierManagement />} />
        <Route path="units" element={<UnitManagement />} />
        <Route path="volumes" element={<VolumeManagement />} />
        <Route path="locations" element={<ProjectLocationManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="warehouse" element={<WarehouseManagement />} />
        <Route path="reports" element={<InventoryReports />} />
      </Routes>
    </ModuleLayout>
  );
}
