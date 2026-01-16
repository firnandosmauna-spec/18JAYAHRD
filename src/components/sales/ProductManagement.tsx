import React from 'react';
import { Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProductManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Produk</h2>
          <p className="text-gray-600">Kelola katalog produk dan harga</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produk Management
          </CardTitle>
          <CardDescription>
            Fitur manajemen produk akan segera tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Komponen ini sedang dalam pengembangan. Anda akan dapat mengelola:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
            <li>Katalog produk</li>
            <li>Harga jual dan beli</li>
            <li>Stok produk</li>
            <li>Kategori produk</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}