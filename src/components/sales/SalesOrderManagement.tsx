import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SalesOrderManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Pesanan Penjualan</h2>
          <p className="text-gray-600">Kelola pesanan dari pelanggan</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Sales Order Management
          </CardTitle>
          <CardDescription>
            Fitur manajemen pesanan penjualan akan segera tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Komponen ini sedang dalam pengembangan. Anda akan dapat mengelola:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
            <li>Pesanan penjualan baru</li>
            <li>Konfirmasi pesanan</li>
            <li>Status pengiriman</li>
            <li>Riwayat pesanan</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}