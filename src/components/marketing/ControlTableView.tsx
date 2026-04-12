import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ConsumerProfile, ConsumerPemberkasan } from './MarketingTypes';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Search, Loader2 } from 'lucide-react';

interface ConsumerWithPemberkasan extends ConsumerProfile {
    consumer_pemberkasan: ConsumerPemberkasan[];
}

export default function ControlTableView() {
    const [consumers, setConsumers] = useState<ConsumerWithPemberkasan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchControlData = async () => {
        setLoading(true);
        try {
            // Fetch consumers with their pemberkasan data
            const { data, error } = await supabase
                .from('consumer_profiles')
                .select(`
                    *,
                    consumer_pemberkasan (*)
                `)
                .order('name', { ascending: true });

            if (error) throw error;

            // Supabase returns related data as array or single object depending on relation type. 
            // In one-to-one, it might be an array of length 1 or an object. We type it safely.
            setConsumers(data || []);
        } catch (error) {
            console.error('Error fetching control data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchControlData();
    }, []);

    const filteredConsumers = consumers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.housing_project && c.housing_project.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.sales_person && c.sales_person.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
        } catch (e) {
            return '-';
        }
    };

    const getPemberkasan = (consumer: ConsumerWithPemberkasan) => {
        // Handle both array and single object returns from Supabase relational queries
        if (Array.isArray(consumer.consumer_pemberkasan)) {
            return consumer.consumer_pemberkasan[0] || null;
        }
        return consumer.consumer_pemberkasan || null;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Tabel Kontrol Pemberkasan</h2>
                    <p className="text-sm text-slate-500">Pantau tanggal penyelesaian setiap tahap pemberkasan konsumen</p>
                </div>
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari nama, proyek, atau marketing..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="whitespace-nowrap">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="sticky left-0 bg-slate-50 z-10 font-bold text-slate-900 border-r min-w-[200px]">Nama Konsumen</TableHead>
                                <TableHead className="min-w-[150px]">Proyek Lokasi</TableHead>
                                <TableHead className="min-w-[150px]">Proses Bank</TableHead>
                                <TableHead className="min-w-[150px]">Marketing / Sales</TableHead>
                                <TableHead className="text-center min-w-[120px]">Booking</TableHead>
                                <TableHead className="text-center min-w-[120px]">Slik OJK</TableHead>
                                <TableHead className="text-center min-w-[150px]">Proses Berkas (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[120px]">OTS (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[150px]">Input Data (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[120px]">Analis (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[180px]">LPA & Appraisal (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[120px]">PIP (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[120px]">PK (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[120px]">Akad (Waktu)</TableHead>
                                <TableHead className="text-center min-w-[180px]">Pencairan Akad (Waktu)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={15} className="h-32 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-500">
                                            <Loader2 className="h-5 w-5 animate-spin" /> Memuat data tabel kontrol...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredConsumers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={15} className="h-32 text-center text-slate-500">
                                        Data tidak ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredConsumers.map((consumer) => {
                                    const prep = getPemberkasan(consumer);
                                    return (
                                        <TableRow key={consumer.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="sticky left-0 bg-white font-medium text-slate-900 border-r group-hover:bg-slate-50">
                                                {consumer.name}
                                                <div className="text-[10px] text-slate-400 font-normal">{consumer.phone || '-'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100 font-normal truncate max-w-[140px]">
                                                    {consumer.housing_project || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {consumer.bank_process ? (
                                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                                                        {consumer.bank_process}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm truncate max-w-[140px]">{consumer.sales_person || '-'}</TableCell>

                                            <TableCell className="text-center text-xs font-mono text-slate-600 bg-slate-50/50">{formatDate(prep?.booking_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600">
                                                {prep?.slik_ojk_status === 'pending' ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1 py-0">
                                                        Pending
                                                    </Badge>
                                                ) : prep?.slik_ojk_status === 'rejected' ? (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1 py-0">
                                                        Rejected
                                                    </Badge>
                                                ) : (
                                                    formatDate(prep?.slik_ojk_date)
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600 bg-slate-50/50">{formatDate(prep?.proses_berkas_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600">{formatDate(prep?.ots_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600 bg-slate-50/50">{formatDate(prep?.penginputan_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600">{formatDate(prep?.analis_data_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600 bg-slate-50/50">{formatDate(prep?.lpa_aprasial_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600">{formatDate(prep?.pip_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600 bg-slate-50/50">{formatDate(prep?.pk_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600">{formatDate(prep?.akad_date)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600 bg-slate-50/50">{formatDate(prep?.pencairan_akad_date)}</TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
