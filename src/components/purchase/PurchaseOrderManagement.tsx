import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PurchaseOrderManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Purchase Order</h2>
          <p className="text-gray-600">Kelola pesanan pembelian ke supplier</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Purchase Order Management
          </CardTitle>
          <CardDescription>
            Fitur manajemen purchase order akan segera tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Komponen ini sedang dalam pengembangan. Anda akan dapat mengelola:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
            <li>Purchase order baru</li>
            <li>Konfirmasi dari supplier</li>
            <li>Status pengiriman</li>
            <li>Penerimaan barang</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}