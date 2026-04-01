import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConsumerPemberkasan as ConsumerPemberkasanType } from './MarketingTypes';
import { cn } from "@/lib/utils";

interface ConsumerPemberkasanProps {
    consumerId: string;
    consumerName: string;
}

const CHECKLIST_ITEMS = [
    { key: 'booking', label: 'Booking' },
    { key: 'slik_ojk', label: 'Slik OJK' },
    { key: 'proses_berkas', label: 'Proses Berkas' },
    { key: 'ots', label: 'OTS' },
    { key: 'penginputan', label: 'Penginputan' },
    { key: 'analis_data', label: 'Analis Data (Bank)' },
    { key: 'lpa_aprasial', label: 'LPA dan Aprasial' },
    { key: 'pip', label: 'PIP' },
    { key: 'pk', label: 'PK' },
    { key: 'akad', label: 'Akad' },
    { key: 'pencairan_akad', label: 'Pencairan Akad' },
];

export function ConsumerPemberkasan({ consumerId, consumerName }: ConsumerPemberkasanProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<ConsumerPemberkasanType | null>(null);
    const { toast } = useToast();

    const fetchPemberkasan = async () => {
        try {
            setLoading(true);
            
            // First, try a simple select without .single() to avoid 406 errors on 0 rows in some environments
            const { data: results, error } = await supabase
                .from('consumer_pemberkasan')
                .select('*')
                .eq('consumer_id', consumerId);

            if (error) throw error;

            if (!results || results.length === 0) {
                // If not found, attempt to insert (upsert is safer)
                const { data: newData, error: insertError } = await supabase
                    .from('consumer_pemberkasan')
                    .upsert({ consumer_id: consumerId }, { onConflict: 'consumer_id' })
                    .select()
                    .single();

                // If another process inserted it in the meantime, just fetch it again
                if (insertError && insertError.code === '23505') {
                    const { data: retryData, error: retryError } = await supabase
                        .from('consumer_pemberkasan')
                        .select('*')
                        .eq('consumer_id', consumerId)
                        .single();
                    if (retryError) throw retryError;
                    setData(retryData);
                } else if (insertError) {
                    throw insertError;
                } else {
                    setData(newData);
                }
            } else {
                setData(results[0]);
            }
        } catch (error: any) {
            console.error('Error fetching pemberkasan:', error);
            // Only show toast if it's not a harmless duplicate key error we already handled
            if (error.code !== '23505') {
                toast({
                    title: "Error",
                    description: "Gagal memuat data pemberkasan. Pastikan tabel 'consumer_pemberkasan' sudah tersedia di database.",
                    variant: 'destructive'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPemberkasan();
    }, [consumerId]);

    const handleToggle = async (key: string, value: boolean) => {
        if (!data) return;

        try {
            setSaving(true);

            const updates: any = { [key]: value };
            if (value) {
                updates[`${key}_date`] = new Date().toISOString();
            } else {
                updates[`${key}_date`] = null;
            }

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(updates)
                .eq('consumer_id', consumerId);

            if (error) throw error;

            setData(prev => prev ? { ...prev, ...updates } : null);

            toast({
                title: "Tersimpan",
                description: `Status ${CHECKLIST_ITEMS.find(i => i.key === key)?.label} diperbarui`,
            });
        } catch (error: any) {
            console.error('Error updating pemberkasan:', error);
            toast({
                title: "Gagal menyimpan",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!data) return <div className="p-4 text-center text-slate-500">Data tidak ditemukan.</div>;

    const completedCount = CHECKLIST_ITEMS.filter(item => (data as any)[item.key]).length;
    const progressPercentage = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">{consumerName}</h3>
                    <p className="text-sm text-slate-500 mt-1">Status Pengerjaan Pemberkasan</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">{progressPercentage}% Selesai</div>
                        <div className="text-sx text-slate-400">{completedCount} dari {CHECKLIST_ITEMS.length} Tahap</div>
                    </div>
                    <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                            className={cn(
                                "h-full transition-all duration-500 ease-out",
                                progressPercentage === 100 ? "bg-emerald-500" : "bg-blue-600"
                            )}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHECKLIST_ITEMS.map((item, index) => {
                    const isCompleted = (data as any)[item.key];
                    return (
                        <div
                            key={item.key}
                            className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer group",
                                isCompleted
                                    ? "bg-emerald-50/50 border-emerald-100 ring-1 ring-emerald-100"
                                    : "bg-white border-slate-100 hover:border-blue-200"
                            )}
                            onClick={() => handleToggle(item.key, !isCompleted)}
                        >
                            <div className="flex-shrink-0">
                                {isCompleted ? (
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                ) : (
                                    <Circle className="h-6 w-6 text-slate-300 group-hover:text-blue-400" />
                                )}
                            </div>
                            <div className="flex-grow">
                                <Label
                                    className={cn(
                                        "font-medium cursor-pointer transition-colors",
                                        isCompleted ? "text-emerald-900" : "text-slate-600 group-hover:text-slate-900"
                                    )}
                                >
                                    {item.label}
                                </Label>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Tahap {index + 1}
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => handleToggle(item.key, !!checked)}
                                    // Prevent double click effect from div parent
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn(
                                        "rounded-full h-5 w-5 border-2",
                                        isCompleted ? "border-emerald-500 bg-emerald-500" : "border-slate-200"
                                    )}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {saving && (
                <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Menyimpan...</span>
                </div>
            )}
        </div>
    );
}
