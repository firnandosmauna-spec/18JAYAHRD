import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { useProducts, useProductCategories, useWarehouses, useStockMovements, useLowStockProducts } from '@/hooks/useInventory';
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
  X
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

const navItems = [
  { label: 'Dashboard', href: '/inventory', icon: Package },
  { label: 'Produk', href: '/inventory/products', icon: Package },
  { label: 'Stok Masuk', href: '/inventory/stock-in', icon: ArrowDownRight },
  { label: 'Stok Keluar', href: '/inventory/stock-out', icon: ArrowUpRight },
  { label: 'Gudang', href: '/inventory/warehouse', icon: Warehouse },
  { label: 'Laporan', href: '/inventory/reports', icon: BarChart3 },
];

// Helper function to determine product status
function getProductStatus(product: Product): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (product.stock === 0) return 'out-of-stock'
  if (product.stock <= product.min_stock) return 'low-stock'
  return 'in-stock'
}

// Satuan produk (static list)
const productUnits = [
  'sak',
  'batang',
  'buah',
  'm³',
  'dus',
  'kaleng',
  'kg',
  'lembar',
  'meter',
  'roll',
  'set',
];

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
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { movements, loading: movementsLoading } = useStockMovements(lastWeek, today);
  const { products: lowStockProducts } = useLowStockProducts();
  const { toast } = useToast();

  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category_id: '',
    stock: '',
    min_stock: '',
    price: '',
    unit: '',
    warehouse_id: '',
    cost: '',
    description: '',
    barcode: '',
  });

  // Reset form function
  const resetForm = () => {
    setNewProduct({
      name: '',
      sku: '',
      category_id: '',
      stock: '',
      min_stock: '',
      price: '',
      unit: '',
      warehouse_id: '',
      cost: '',
      description: '',
      barcode: '',
    });
  };

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

  const handleAddProduct = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      console.log('handleAddProduct called (Dashboard)', { newProduct, isSubmitting });
      setIsSubmitting(true);

      // Validasi field wajib
      if (!newProduct.name || !newProduct.sku || !newProduct.unit || !newProduct.price) {
        toast({
          title: 'Error',
          description: 'Mohon lengkapi semua field yang wajib diisi (Nama, SKU, Satuan, Harga Jual)',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi format SKU (minimal 3 karakter)
      if (newProduct.sku.trim().length < 3) {
        toast({
          title: 'Error',
          description: 'SKU minimal 3 karakter',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi SKU unik
      const existingProduct = products.find(p => p.sku.toLowerCase() === newProduct.sku.trim().toLowerCase());
      if (existingProduct) {
        toast({
          title: 'Error',
          description: `SKU "${newProduct.sku}" sudah digunakan oleh produk lain`,
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi dan parse angka
      const stock = newProduct.stock ? parseFloat(newProduct.stock) : 0;
      const minStock = newProduct.min_stock ? parseFloat(newProduct.min_stock) : 0;
      const price = parseFloat(newProduct.price);
      const cost = newProduct.cost ? parseFloat(newProduct.cost) : 0;

      // Validasi angka valid
      if (isNaN(price) || price <= 0) {
        toast({
          title: 'Error',
          description: 'Harga jual harus lebih besar dari 0',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      if (!isNaN(stock) && stock < 0) {
        toast({
          title: 'Error',
          description: 'Stok awal tidak boleh negatif',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      if (!isNaN(minStock) && minStock < 0) {
        toast({
          title: 'Error',
          description: 'Stok minimum tidak boleh negatif',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      if (!isNaN(cost) && cost < 0) {
        toast({
          title: 'Error',
          description: 'Harga beli tidak boleh negatif',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Simpan produk - hapus undefined values untuk menghindari error
      const productData: any = {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim().toUpperCase(),
        stock: stock || 0,
        min_stock: minStock || 0,
        price: price,
        cost: cost || 0,
        unit: newProduct.unit,
        status: 'active',
      };

      // Hanya tambahkan field optional jika ada nilainya
      if (newProduct.category_id) {
        productData.category_id = newProduct.category_id;
      }
      if (newProduct.warehouse_id) {
        productData.warehouse_id = newProduct.warehouse_id;
      }
      if (newProduct.description?.trim()) {
        productData.description = newProduct.description.trim();
      }
      if (newProduct.barcode?.trim()) {
        productData.barcode = newProduct.barcode.trim();
      }

      console.log('Saving product with data (Dashboard):', productData);
      console.log('Available categories:', categories);
      console.log('Available warehouses:', warehouses);

      const savedProduct = await addProduct(productData);
      console.log('Product saved successfully (Dashboard):', savedProduct);

      // Refresh data
      await refetchProducts();

      // Tutup dialog dan reset form
      setShowAddProductDialog(false);
      resetForm();

      toast({
        title: 'Berhasil',
        description: `Produk "${newProduct.name}" berhasil ditambahkan`,
      });
    } catch (error: any) {
      console.error('Failed to add product:', error);

      // Error handling yang lebih spesifik
      let errorMessage = 'Gagal menambahkan produk';
      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'SKU sudah digunakan. Silakan gunakan SKU lain.';
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Kategori atau gudang yang dipilih tidak valid';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
          <DialogTrigger asChild>
            <Button className="bg-inventory hover:bg-inventory-dark font-body">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Tambah Produk Baru</DialogTitle>
              <DialogDescription className="font-body">
                Tambahkan bahan baku bangunan ke inventaris
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-body">Nama Produk <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="Contoh: Semen Portland 50kg"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="font-body"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku" className="font-body">SKU <span className="text-red-500">*</span></Label>
                  <Input
                    id="sku"
                    placeholder="SMN-PRT-50"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                    className="font-mono"
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground font-body">Minimal 3 karakter, akan otomatis diubah ke huruf besar</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category" className="font-body">Kategori</Label>
                  <Select
                    value={newProduct.category_id}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground font-body">
                          Tidak ada kategori tersedia
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="font-body">
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock" className="font-body">Stok Awal</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setNewProduct({ ...newProduct, stock: value });
                      }
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock" className="font-body">Stok Minimum</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="10"
                    value={newProduct.min_stock}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setNewProduct({ ...newProduct, min_stock: value });
                      }
                    }}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price" className="font-body">Harga Jual (Rp) <span className="text-red-500">*</span></Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="75000"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit" className="font-body">Satuan <span className="text-red-500">*</span></Label>
                  <Select
                    value={newProduct.unit}
                    onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {productUnits.map((unit) => (
                        <SelectItem key={unit} value={unit} className="font-body">
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="warehouse" className="font-body">Gudang</Label>
                  <Select
                    value={newProduct.warehouse_id || undefined}
                    onValueChange={(value) => setNewProduct({ ...newProduct, warehouse_id: value || '' })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih gudang (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground font-body">
                          Tidak ada gudang tersedia
                        </div>
                      ) : (
                        warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id} className="font-body">
                            {wh.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost" className="font-body">Harga Beli (Cost)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="font-body">Deskripsi</Label>
                <Input
                  id="description"
                  placeholder="Deskripsi produk (opsional)"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="font-body"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode" className="font-body">Barcode</Label>
                <Input
                  id="barcode"
                  placeholder="Barcode produk (opsional)"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddProductDialog(false);
                  resetForm();
                }}
                className="font-body"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddProduct(e);
                }}
                className="bg-inventory hover:bg-inventory-dark font-body"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Simpan Produk
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    <Button size="sm" variant="outline" className="font-body">
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
    </div>
  );
}

function ProductList() {
  const { products, loading, addProduct, updateProduct, deleteProduct, refetch } = useProducts();
  const { categories } = useProductCategories();
  const { warehouses } = useWarehouses();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category_id: '',
    stock: '',
    min_stock: '',
    price: '',
    unit: '',
    warehouse_id: '',
    cost: '',
    description: '',
    barcode: '',
  });

  // Reset form function
  const resetForm = () => {
    setNewProduct({
      name: '',
      sku: '',
      category_id: '',
      stock: '',
      min_stock: '',
      price: '',
      unit: '',
      warehouse_id: '',
      cost: '',
      description: '',
      barcode: '',
    });
  };

  const handleAddProduct = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      console.log('handleAddProduct called (ProductList)', { newProduct, isSubmitting });
      setIsSubmitting(true);

      // Validasi field wajib
      if (!newProduct.name || !newProduct.sku || !newProduct.unit || !newProduct.price) {
        console.log('Validation failed - missing required fields');
        toast({
          title: 'Error',
          description: 'Mohon lengkapi semua field yang wajib diisi (Nama, SKU, Satuan, Harga Jual)',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi format SKU (minimal 3 karakter)
      if (newProduct.sku.trim().length < 3) {
        toast({
          title: 'Error',
          description: 'SKU minimal 3 karakter',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi SKU unik
      const existingProduct = products.find(p => p.sku.toLowerCase() === newProduct.sku.trim().toLowerCase());
      if (existingProduct) {
        toast({
          title: 'Error',
          description: `SKU "${newProduct.sku}" sudah digunakan oleh produk lain`,
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi dan parse angka
      const stock = newProduct.stock ? parseFloat(newProduct.stock) : 0;
      const minStock = newProduct.min_stock ? parseFloat(newProduct.min_stock) : 0;
      const price = parseFloat(newProduct.price);
      const cost = newProduct.cost ? parseFloat(newProduct.cost) : 0;

      // Validasi angka valid
      if (isNaN(price) || price <= 0) {
        toast({
          title: 'Error',
          description: 'Harga jual harus lebih besar dari 0',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      if (!isNaN(stock) && stock < 0) {
        toast({
          title: 'Error',
          description: 'Stok awal tidak boleh negatif',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      if (!isNaN(minStock) && minStock < 0) {
        toast({
          title: 'Error',
          description: 'Stok minimum tidak boleh negatif',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      if (!isNaN(cost) && cost < 0) {
        toast({
          title: 'Error',
          description: 'Harga beli tidak boleh negatif',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Simpan produk - hapus undefined values untuk menghindari error
      const productData: any = {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim().toUpperCase(),
        stock: stock || 0,
        min_stock: minStock || 0,
        price: price,
        cost: cost || 0,
        unit: newProduct.unit,
        status: 'active',
      };

      // Hanya tambahkan field optional jika ada nilainya
      if (newProduct.category_id) {
        productData.category_id = newProduct.category_id;
      }
      if (newProduct.warehouse_id) {
        productData.warehouse_id = newProduct.warehouse_id;
      }
      if (newProduct.description?.trim()) {
        productData.description = newProduct.description.trim();
      }
      if (newProduct.barcode?.trim()) {
        productData.barcode = newProduct.barcode.trim();
      }

      console.log('Saving product with data (ProductList):', productData);
      console.log('Available categories:', categories);
      console.log('Available warehouses:', warehouses);

      const savedProduct = await addProduct(productData);
      console.log('Product saved successfully (ProductList):', savedProduct);

      // Refresh data
      await refetch();

      // Tutup dialog dan reset form
      setShowAddProductDialog(false);
      resetForm();

      toast({
        title: 'Berhasil',
        description: `Produk "${newProduct.name}" berhasil ditambahkan`,
      });
    } catch (error: any) {
      console.error('Failed to add product (ProductList):', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });

      // Error handling yang lebih spesifik
      let errorMessage = 'Gagal menambahkan produk';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        switch (error.code) {
          case '23505':
            errorMessage = 'SKU sudah digunakan. Silakan gunakan SKU lain.';
            break;
          case '23503':
            errorMessage = 'Kategori atau gudang yang dipilih tidak valid.';
            break;
          case '23502':
            errorMessage = 'Field wajib tidak boleh kosong.';
            break;
          case 'PGRST116':
          case '42P01':
            errorMessage = 'Tabel products belum dibuat. Silakan jalankan INVENTORY_SCHEMA.sql di Supabase SQL Editor.';
            break;
          default:
            errorMessage = `Error: ${error.code}. ${error.message || 'Silakan coba lagi.'}`;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-inventory/30 border-t-inventory rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat data produk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Daftar Produk</h1>
          <p className="text-muted-foreground font-body">Kelola katalog bahan baku bangunan</p>
        </div>
        <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
          <DialogTrigger asChild>
            <Button className="bg-inventory hover:bg-inventory-dark font-body">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Tambah Produk Baru</DialogTitle>
              <DialogDescription className="font-body">
                Tambahkan bahan baku bangunan ke inventaris
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name2" className="font-body">Nama Produk <span className="text-red-500">*</span></Label>
                <Input
                  id="name2"
                  placeholder="Contoh: Semen Portland 50kg"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="font-body"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku2" className="font-body">SKU <span className="text-red-500">*</span></Label>
                  <Input
                    id="sku2"
                    placeholder="SMN-PRT-50"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                    className="font-mono"
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground font-body">Minimal 3 karakter, akan otomatis diubah ke huruf besar</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category2" className="font-body">Kategori</Label>
                  <Select
                    value={newProduct.category_id}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground font-body">
                          Tidak ada kategori tersedia
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="font-body">
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock2" className="font-body">Stok Awal</Label>
                  <Input
                    id="stock2"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setNewProduct({ ...newProduct, stock: value });
                      }
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock2" className="font-body">Stok Minimum</Label>
                  <Input
                    id="minStock2"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="10"
                    value={newProduct.min_stock}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setNewProduct({ ...newProduct, min_stock: value });
                      }
                    }}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price2" className="font-body">Harga Jual (Rp) <span className="text-red-500">*</span></Label>
                  <Input
                    id="price2"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="75000"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit2" className="font-body">Satuan <span className="text-red-500">*</span></Label>
                  <Select
                    value={newProduct.unit}
                    onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {productUnits.map((unit) => (
                        <SelectItem key={unit} value={unit} className="font-body">
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="warehouse2" className="font-body">Gudang</Label>
                  <Select
                    value={newProduct.warehouse_id || undefined}
                    onValueChange={(value) => setNewProduct({ ...newProduct, warehouse_id: value || '' })}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Pilih gudang (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground font-body">
                          Tidak ada gudang tersedia
                        </div>
                      ) : (
                        warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id} className="font-body">
                            {wh.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost2" className="font-body">Harga Beli (Cost)</Label>
                  <Input
                    id="cost2"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description2" className="font-body">Deskripsi</Label>
                <Input
                  id="description2"
                  placeholder="Deskripsi produk (opsional)"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="font-body"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode2" className="font-body">Barcode</Label>
                <Input
                  id="barcode2"
                  placeholder="Barcode produk (opsional)"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddProductDialog(false);
                  resetForm();
                }}
                className="font-body"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddProduct(e);
                }}
                className="bg-inventory hover:bg-inventory-dark font-body"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Simpan Produk
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    <TableHead className="font-body">Stok</TableHead>
                    <TableHead className="font-body">Harga</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    <TableHead className="font-body text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-body font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-body">{(product as any).category || '-'}</TableCell>
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
                            <DropdownMenuItem className="font-body">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="font-body">Tambah Stok</DropdownMenuItem>
                            <DropdownMenuItem className="font-body text-destructive">Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
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
        <Route path="stock-in" element={<PlaceholderPage title="Stok Masuk" />} />
        <Route path="stock-out" element={<PlaceholderPage title="Stok Keluar" />} />
        <Route path="warehouse" element={<PlaceholderPage title="Manajemen Gudang" />} />
        <Route path="reports" element={<PlaceholderPage title="Laporan Persediaan" />} />
      </Routes>
    </ModuleLayout>
  );
}
