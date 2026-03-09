import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ConsumerProfile } from './MarketingTypes';
import { ConsumerPemberkasan } from './ConsumerPemberkasan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function PemberkasanView() {
    const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConsumer, setSelectedConsumer] = useState<ConsumerProfile | null>(null);

    const fetchConsumers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('consumer_profiles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setConsumers(data || []);
        } catch (error) {
            console.error('Error fetching consumers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsumers();
    }, []);

    const filteredConsumers = consumers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (selectedConsumer) {
        return (
            <div className="space-y-6">
                <Button
                    variant="outline"
                    size="sm"
                    className="mb-4"
                    onClick={() => setSelectedConsumer(null)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali ke Daftar
                </Button>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <ConsumerPemberkasan
                        consumerId={selectedConsumer.id}
                        consumerName={selectedConsumer.name}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Pengerjaan Pemberkasan Konsumen</h2>
                    <p className="text-sm text-slate-500">Kelola dan pantau progres dokumen seluruh konsumen</p>
                </div>
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari nama atau kode konsumen..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Kode</TableHead>
                            <TableHead>Nama Konsumen</TableHead>
                            <TableHead>Proyek</TableHead>
                            <TableHead>Sales / Marketing</TableHead>
                            <TableHead>Proses Bank</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex justify-center items-center gap-2 text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredConsumers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    Data konsumen tidak ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredConsumers.map((consumer) => (
                                <TableRow key={consumer.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-mono text-xs">{consumer.code}</TableCell>
                                    <TableCell className="font-medium text-slate-900">{consumer.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100 font-normal">
                                            {consumer.housing_project || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-600 text-sm">{consumer.sales_person || '-'}</TableCell>
                                    <TableCell>
                                        {consumer.bank_process ? (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                                                {consumer.bank_process}
                                            </Badge>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-100"
                                            onClick={() => setSelectedConsumer(consumer)}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Proses Berkas
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
