import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ConsumerProfile } from './MarketingTypes';
import { ConsumerPemberkasan } from './ConsumerPemberkasan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function PemberkasanView() {
    const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConsumer, setSelectedConsumer] = useState<ConsumerProfile | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const runSelfHealingSync = async () => {
        try {
            console.log("Self-healing sync: starting...");
            // 1. Fetch all completed pencairan_akad pemberkasan
            const { data: completedAkad, error: akadError } = await supabase
                .from('consumer_pemberkasan')
                .select('consumer_id')
                .eq('pencairan_akad', true);
            
            if (akadError) {
                console.error("Self-healing sync: completedAkad fetch error:", akadError);
                return;
            }
            console.log("Self-healing sync: completedAkad found:", completedAkad);
            
            if (!completedAkad || completedAkad.length === 0) return;
            const completedConsumerIds = completedAkad.map(item => item.consumer_id);

            // 2. Fetch consumer profiles for these IDs
            const { data: profiles, error: profileError } = await supabase
                .from('consumer_profiles')
                .select('id, name, housing_project, housing_block_no')
                .in('id', completedConsumerIds);
            
            if (profileError) {
                console.error("Self-healing sync: profiles fetch error:", profileError);
                return;
            }
            console.log("Self-healing sync: profiles found:", profiles);
            
            if (!profiles || profiles.length === 0) return;

            // 3. Fetch housing units to compare
            const { data: units, error: unitError } = await supabase
                .from('housing_units')
                .select('id, status, consumer_id, location_name, block_number');

            if (unitError) {
                console.error("Self-healing sync: units fetch error:", unitError);
                return;
            }
            console.log("Self-healing sync: units found:", units);

            if (!units) return;

            // Helper to normalize strings for fuzzy matching
            const normalizeString = (str: string, isBlock = false) => {
                if (!str) return '';
                let normalized = str.toLowerCase();
                normalized = normalized.replace(/[-./#_]/g, '');
                if (isBlock) {
                    normalized = normalized.replace(/(blok|no|nomor|kav|kavling)/gi, '');
                } else {
                    normalized = normalized.replace(/(residence|indah|permai|cluster|regency|griya|perumahan|dama|asri|hijau|land)/gi, '');
                }
                return normalized.replace(/\s+/g, '');
            };

            // 4. Find matches that need healing
            for (const profile of profiles) {
                const idLinkedUnits = units.filter(u => u.consumer_id === profile.id);
                
                // Fuzzy matching for location and block number
                const locationLinkedUnits = units.filter(u => {
                    if (!profile.housing_project || !profile.housing_block_no) return false;
                    if (!u.location_name || !u.block_number) return false;

                    const normProj1 = normalizeString(profile.housing_project);
                    const normProj2 = normalizeString(u.location_name);
                    const normBlock1 = normalizeString(profile.housing_block_no, true);
                    const normBlock2 = normalizeString(u.block_number, true);

                    const projectsMatch = normProj1 === normProj2 || normProj1.includes(normProj2) || normProj2.includes(normProj1);
                    const blocksMatch = normBlock1 === normBlock2;

                    return projectsMatch && blocksMatch;
                });

                const allAssociatedUnits = [...idLinkedUnits, ...locationLinkedUnits];
                const uniqueUnits = allAssociatedUnits.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                console.log(`Self-healing sync: Consumer "${profile.name}" has ${uniqueUnits.length} matching units:`, uniqueUnits);

                for (const unit of uniqueUnits) {
                    if (unit.status !== 'sold' || !unit.consumer_id) {
                        console.log(`Self-healing sync: HEALING unit ${unit.block_number} to 'sold' for ${profile.name}`);
                        const { error: updateErr } = await supabase
                            .from('housing_units')
                            .update({ 
                                status: 'sold',
                                consumer_id: profile.id
                            })
                            .eq('id', unit.id);
                        if (updateErr) {
                            console.error(`Self-healing sync: Update error for unit ${unit.block_number}:`, updateErr);
                        } else {
                            console.log(`Self-healing sync: Successfully healed unit ${unit.block_number}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error running self-healing sync:', e);
        }
    };

    const fetchConsumers = async () => {
        setLoading(true);
        try {
            // Run self-healing background sync first
            await runSelfHealingSync();

            const { data, error } = await supabase
                .from('consumer_profiles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            const fetchedConsumers = data || [];
            setConsumers(fetchedConsumers);

            // Auto-select if consumerId is in URL
            const consumerId = searchParams.get('consumerId');
            if (consumerId) {
                const consumer = fetchedConsumers.find(c => c.id === consumerId);
                if (consumer) {
                    setSelectedConsumer(consumer);
                }
                // Clear the param after selection to avoid re-selecting on refresh
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('consumerId');
                setSearchParams(newParams, { replace: true });
            }
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
                    className="mb-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-bold"
                    onClick={() => setSelectedConsumer(null)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali ke Daftar
                </Button>

                <div className="bg-white p-2 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                    <ConsumerPemberkasan
                        consumerId={selectedConsumer.id}
                        consumerName={selectedConsumer.name}
                        housingProject={selectedConsumer.housing_project}
                        housingBlockNo={selectedConsumer.housing_block_no}
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
                            <TableHead>Blok/No</TableHead>
                            <TableHead>Sales / Marketing</TableHead>
                            <TableHead>Proses Bank</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex justify-center items-center gap-2 text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredConsumers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
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
                                    <TableCell className="text-sm font-bold text-slate-700">
                                        {consumer.housing_block_no || '-'}
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
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
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
