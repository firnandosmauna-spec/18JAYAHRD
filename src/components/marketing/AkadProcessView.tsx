import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Pipeline, Stage } from './MarketingTypes';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

interface AkadProcessViewProps {
    pipelines: Pipeline[];
    onUpdate: () => void;
}

export default function AkadProcessView({ pipelines, onUpdate }: AkadProcessViewProps) {
    const { toast } = useToast();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Filter for deals relevant to Akad: Won or Negotiation (potential)
    // Or specifically deals where akad_date is set, or stage is 'won' (ready for akad)
    const akadDeals = pipelines.filter(p =>
        p.stage === 'won' ||
        (p.stage === 'negotiation' && p.booking_fee && p.booking_fee > 0)
    );

    const handleDateUpdate = async (id: string, date: string) => {
        try {
            setUpdatingId(id);
            const { error } = await supabase
                .from('marketing_pipelines')
                .update({ akad_date: date })
                .eq('id', id);

            if (error) throw error;

            toast({ title: "Jadwal Akad Diperbarui", description: "Tanggal akad telah disimpan." });
            onUpdate();
        } catch (error) {
            console.error('Error updating akad date:', error);
            toast({ title: "Gagal menyimpan", variant: "destructive" });
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Proses Akad</h2>
                    <p className="text-sm text-slate-500">
                        {akadDeals.length} deal siap atau dalam proses akad
                    </p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Deal & Konsumen</TableHead>
                                <TableHead>Nilai Deal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Jadwal Akad</TableHead>
                                <TableHead>Booking Fee</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {akadDeals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        Tidak ada data akad saat ini
                                    </TableCell>
                                </TableRow>
                            ) : (
                                akadDeals.map(deal => (
                                    <TableRow key={deal.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{deal.title}</div>
                                            <div className="text-xs text-slate-500">{deal.contact_name}</div>
                                            <div className="text-xs text-slate-400">{deal.company}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-emerald-600">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(deal.value)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={deal.stage === 'won' ? 'default' : 'outline'} className={deal.stage === 'won' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                                                {deal.stage === 'won' ? 'Ready for Akad' : 'Negosiasi (Booking)'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                                <input
                                                    type="date"
                                                    className="text-sm border rounded px-2 py-1"
                                                    value={deal.akad_date ? deal.akad_date.split('T')[0] : ''}
                                                    onChange={(e) => handleDateUpdate(deal.id, e.target.value)}
                                                    disabled={updatingId === deal.id}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {deal.booking_fee ? (
                                                <span className="text-sm font-medium">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(deal.booking_fee)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Belum ada BF</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" className="h-8">
                                                <FileText className="w-3 h-3 mr-2" />
                                                Dokumen
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

