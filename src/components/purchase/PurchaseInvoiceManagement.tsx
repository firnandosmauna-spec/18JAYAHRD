import React from 'react';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PurchaseInvoiceManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Invoice Pembelian</h2>
          <p className="text-gray-600">Kelola invoice dan pembayaran supplier</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Purchase Invoice Management
          </CardTitle>
          <CardDescription>
            Fitur manajemen invoice pembelian akan segera tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Komponen ini sedang dalam pengembangan. Anda akan dapat mengelola:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
            <li>Invoice dari supplier</li>
            <li>Verifikasi invoice</li>
            <li>Jadwal pembayaran</li>
            <li>Laporan pembelian</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}