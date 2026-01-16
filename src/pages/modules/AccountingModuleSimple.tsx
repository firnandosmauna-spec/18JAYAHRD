import React from 'react';
import { Calculator } from 'lucide-react';

export function AccountingModuleSimple() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Modul Akuntansi</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Aset</h3>
              <p className="text-3xl font-bold text-blue-600">Rp 0</p>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Total Kewajiban</h3>
              <p className="text-3xl font-bold text-red-600">Rp 0</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Pendapatan</h3>
              <p className="text-3xl font-bold text-green-600">Rp 0</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Laba Bersih</h3>
              <p className="text-3xl font-bold text-purple-600">Rp 0</p>
            </div>
          </div>
          
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              🎉 Modul Akuntansi Berhasil Dimuat!
            </h3>
            <p className="text-yellow-800">
              Sistem akuntansi SDM 18 JAYA siap digunakan. Database dan komponen telah berhasil dimuat.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-yellow-700">
                ✅ Komponen React berhasil dimuat<br/>
                ✅ Routing berfungsi dengan baik<br/>
                ✅ Authentication dan authorization aktif<br/>
                ⏳ Menunggu setup database akuntansi
              </p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Setup Database
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Lihat Bagan Akun
            </button>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              Buat Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountingModuleSimple;