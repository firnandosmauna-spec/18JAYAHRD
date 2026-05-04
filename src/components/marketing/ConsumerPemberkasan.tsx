import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, Circle, Upload, FileText, X, Eye, Paperclip, Printer, Receipt } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConsumerPemberkasan as ConsumerPemberkasanType, ConsumerPemberkasanLog } from './MarketingTypes';
import { format, differenceInDays, differenceInHours, parseISO, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { ConsumerProfileForm } from './ConsumerProfileForm';
import BookingPOS from './BookingPOS';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsContext } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { Check, RotateCcw, ThumbsUp, ThumbsDown, Clock, History, Calendar } from 'lucide-react';

interface ConsumerPemberkasanProps {
    consumerId: string;
    consumerName: string;
    housingProject?: string;
    housingBlockNo?: string;
    onUpdate?: () => void;
}

const CHECKLIST_ITEMS = [
    { key: 'booking', label: 'Booking' },
    { key: 'slik_ojk', label: 'Slik OJK' },
    { key: 'proses_berkas', label: 'Proses Berkas' },
    { key: 'ots', label: 'OTS' },
    { key: 'penginputan', label: 'Penginputan' },
    { key: 'sp3k', label: 'SP3K' },
    { key: 'analis_data', label: 'Analis Data (Bank)' },
    { key: 'lpa_aprasial', label: 'LPA dan Aprasial' },
    { key: 'pip', label: 'PIP' },
    { key: 'pk', label: 'PK' },
    { key: 'akad', label: 'Akad' },
    { key: 'pencairan_akad', label: 'Pencairan Akad' },
];

export function ConsumerPemberkasan({ consumerId, consumerName, housingProject, housingBlockNo, onUpdate }: ConsumerPemberkasanProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [data, setData] = useState<ConsumerPemberkasanType | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'edit' | 'preview'>('edit');
    const { user } = useAuth();
    const { addNotification } = useNotificationsContext();
    const isAdmin = user?.role === 'Administrator';
    const [logs, setLogs] = useState<ConsumerPemberkasanLog[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPOSOpen, setIsPOSOpen] = useState(false);
    const [consumerProfile, setConsumerProfile] = useState<any>(null);

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
                const consumerData = results[0];
                setData(consumerData);
                // Also fetch full profile for POS
                const { data: profile } = await supabase
                    .from('consumer_profiles')
                    .select('*')
                    .eq('id', consumerId)
                    .single();
                setConsumerProfile(profile);
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

    const fetchLogs = async () => {
        if (!data?.id) return;
        
        let logData: any[] = [];
        try {
            // Try with join first
            const { data: fetched, error: joinError } = await supabase
                .from('consumer_pemberkasan_logs')
                .select(`
                    *,
                    profiles:created_by (
                        name
                    )
                `)
                .eq('pemberkasan_id', data.id)
                .order('created_at', { ascending: false });

            if (joinError) {
                const { data: simpleData, error: simpleError } = await supabase
                    .from('consumer_pemberkasan_logs')
                    .select('*')
                    .eq('pemberkasan_id', data.id)
                    .order('created_at', { ascending: false });
                
                if (simpleError) throw simpleError;
                logData = simpleData || [];
            } else {
                logData = fetched || [];
            }
        } catch (dbError: any) {
            console.error('Database error in fetchLogs:', dbError);
        }

        const finalLogs: ConsumerPemberkasanLog[] = logData.map((item: any) => ({
            ...item,
            user_name: item.profiles?.name || 'System',
        }));

        // ALWAYS compute synthetic logs from existing dates in 'data'
        const syntheticLogs: ConsumerPemberkasanLog[] = [];
        if (data) {
            CHECKLIST_ITEMS.forEach(item => {
                const dateVal = (data as any)[`${item.key}_date`];
                const isCompleted = (data as any)[item.key];
                
                if (isCompleted && dateVal) {
                    const hasLog = logData.some(l => l.stage_key === item.key && l.status === true);
                    if (!hasLog) {
                        syntheticLogs.push({
                            id: `syn-${item.key}`,
                            pemberkasan_id: data.id,
                            stage_key: item.key,
                            status: true,
                            notes: `${item.label} (Data Migrasi)`,
                            created_at: dateVal,
                            user_name: 'System'
                        });
                    }
                }
            });
        }
        
        const combined = [...finalLogs, ...syntheticLogs].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setLogs(combined);
    };

    const logMovement = async (key: string, value: boolean, notes?: string) => {
        if (!data) return;
        try {
            await supabase
                .from('consumer_pemberkasan_logs')
                .insert({
                    pemberkasan_id: data.id,
                    stage_key: key,
                    status: value,
                    notes: notes || `${CHECKLIST_ITEMS.find(i => i.key === key)?.label} ${value ? 'Selesai' : 'Dibatalkan'}`,
                    created_by: user?.id
                });
            fetchLogs();
        } catch (error) {
            console.error('Error logging movement:', error);
        }
    };

    useEffect(() => {
        fetchPemberkasan();
    }, [consumerId]);

    useEffect(() => {
        if (data?.id) {
            fetchLogs();
        }
    }, [data?.id]);

    const handleToggle = async (key: string, value: boolean) => {
        if (!data) return;

        try {
            setSaving(true);

            const updates: any = { [key]: value };
            if (value) {
                // Saat dicentang, set tanggal ke hari ini (format ISO)
                updates[`${key}_date`] = new Date().toISOString();
            } else {
                updates[`${key}_date`] = null;
            }

            console.log('Updating pemberkasan with payload:', updates);
            
            // Sanitize payload: convert empty strings to null to satisfy DB/Zod constraints
            const sanitizedUpdates = Object.fromEntries(
                Object.entries(updates).map(([k, v]) => [k, v === "" ? null : v])
            );

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(sanitizedUpdates)
                .eq('consumer_id', consumerId);

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            setData(prev => prev ? { ...prev, ...updates } : null);
            await logMovement(key, value);

            toast({
                title: "Tersimpan",
                description: `Status ${CHECKLIST_ITEMS.find(i => i.key === key)?.label} diperbarui`,
            });

            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error updating pemberkasan:', error);
            console.error('Detailed error object:', JSON.stringify(error, null, 2));
            toast({
                title: "Gagal menyimpan",
                description: error.message || "Terjadi kesalahan saat menyimpan data",
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleApproveSlik = async () => {
        if (!data || !isAdmin) return;

        try {
            setSaving(true);
            const updates: any = {
                slik_ojk: true,
                slik_ojk_date: new Date().toISOString(),
                slik_ojk_status: 'approved',
                slik_ojk_approved_by: user?.id,
                slik_ojk_approved_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(updates)
                .eq('consumer_id', consumerId);

            if (error) throw error;

            setData(prev => prev ? { ...prev, ...updates } : null);
            await logMovement('slik_ojk', true, 'SLIK OJK Disetujui Admin');

            toast({
                title: "SLIK OJK Disetujui",
                description: "Status persetujuan SLIK OJK berhasil diperbarui oleh Administrator",
            });
            
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error approving slik:', error);
            toast({
                title: "Gagal menyetujui",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleRejectSlik = async () => {
        if (!data || !isAdmin) return;

        try {
            setSaving(true);
            const updates: any = {
                slik_ojk: false,
                slik_ojk_date: null,
                slik_ojk_status: 'rejected',
            };

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(updates)
                .eq('consumer_id', consumerId);

            if (error) throw error;

            setData(prev => prev ? { ...prev, ...updates } : null);
            await logMovement('slik_ojk', false, 'SLIK OJK Ditolak Admin');

            toast({
                title: "SLIK OJK Ditolak",
                description: "Status SLIK OJK telah ditandai sebagai ditolak",
            });
            
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error rejecting slik:', error);
            toast({
                title: "Gagal menolak",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDateChange = async (key: string, dateStr: string) => {
        if (!data) return;

        try {
            setSaving(true);
            const updates = { [`${key}_date`]: dateStr ? new Date(dateStr).toISOString() : null };
            
            // Sanitize
            const sanitizedUpdates = Object.fromEntries(
                Object.entries(updates).map(([k, v]) => [k, v === "" ? null : v])
            );

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(sanitizedUpdates)
                .eq('consumer_id', consumerId);

            if (error) throw error;

            setData(prev => prev ? { ...prev, ...updates } : null);
            await logMovement(key, true, `Tanggal diperbarui ke ${dateStr}`);

            toast({
                title: "Tanggal Diperbarui",
                description: `Tanggal untuk ${CHECKLIST_ITEMS.find(i => i.key === key)?.label} berhasil diubah`,
            });
            
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error updating date:', error);
            toast({
                title: "Gagal mengubah tanggal",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeKey || !data) return;

        try {
            setUploadingKey(activeKey);
            const fileExt = file.name.split('.').pop();
            const fileName = `${activeKey}_${Date.now()}.${fileExt}`;
            const filePath = `consumers/pemberkasan/${consumerId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('pipeline-uploads')
                .upload(filePath, file, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('pipeline-uploads')
                .getPublicUrl(filePath);

            const updates: any = {
                [`${activeKey}_file_url`]: publicUrl,
            };

            if (activeKey === 'slik_ojk') {
                updates.slik_ojk = false; 
                updates.slik_ojk_status = 'pending';
                updates.slik_ojk_date = new Date().toISOString(); 
            } else {
                updates[activeKey] = true; 
                if (!(data as any)[activeKey]) {
                    updates[`${activeKey}_date`] = new Date().toISOString();
                }
            }

            const { error: dbError } = await supabase
                .from('consumer_pemberkasan')
                .update(updates)
                .eq('consumer_id', consumerId);

            if (dbError) throw dbError;

            setData(prev => prev ? { ...prev, ...updates } : null);
            await logMovement(activeKey, true, `File dokumen diunggah`);

            if (activeKey === 'slik_ojk') {
                addNotification({
                    title: "Pengajuan SLIK OJK Baru",
                    message: `Konsumen ${consumerName} telah mengunggah dokumen SLIK OJK. Mohon segera diperiksa.`,
                    type: 'warning',
                    module: 'Marketing',
                });
            }

            toast({
                title: "File Terunggah",
                description: `Dokumen untuk ${CHECKLIST_ITEMS.find(i => i.key === activeKey)?.label} berhasil disimpan`,
            });
            
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Error uploading file:', error);
            const errorMsg = error.message || error.error_description || "Terjadi kesalahan upload";
            toast({
                title: "Gagal mengunggah",
                description: `Pesan: ${errorMsg}`,
                variant: 'destructive'
            });
        } finally {
            setUploadingKey(null);
            setActiveKey(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeFile = async (key: string) => {
        if (!data) return;

        try {
            setSaving(true);
            const updates: any = { 
                [`${key}_file_url`]: null,
                [key]: false 
            };

            if (key === 'slik_ojk') {
                updates.slik_ojk_status = 'none';
                updates.slik_ojk_date = null;
                updates.slik_ojk_approved_by = null;
                updates.slik_ojk_approved_at = null;
            }

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(updates)
                .eq('consumer_id', consumerId);

            if (error) throw error;

            setData(prev => prev ? { ...prev, ...updates } : null);
            await logMovement(key, false, 'File dokumen dihapus');

            toast({
                title: "File Dihapus",
                description: `Lampiran untuk ${CHECKLIST_ITEMS.find(i => i.key === key)?.label} telah dilepas`,
            });
        } catch (error: any) {
            console.error('Error removing file:', error);
            toast({
                title: "Gagal menghapus",
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

    const completedCount = CHECKLIST_ITEMS.filter(item => (data as any)[item.key]).length;
    const progressPercentage = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{consumerName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 py-0 h-5 font-bold">
                                {housingProject || 'Tanpa Proyek'}
                            </Badge>
                            {housingBlockNo && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 py-0 h-5 font-bold">
                                    {housingBlockNo}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <div className="text-right px-2">
                        <div className="text-sm font-black text-blue-600">{progressPercentage}%</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{completedCount}/{CHECKLIST_ITEMS.length} Selesai</div>
                    </div>
                    <div className="w-24 md:w-40 h-3 bg-slate-200/50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out",
                                progressPercentage === 100 ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                            )}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsPreviewOpen(true)}
                        className="h-9 px-4 font-black text-[11px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    >
                        <Printer className="w-4 h-4" />
                        Preview
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={cn(
                            "h-9 px-4 font-black text-[11px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-2",
                            isHistoryOpen 
                                ? "bg-slate-900 text-white border-slate-900 hover:bg-black" 
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                        )}
                    >
                        <History className={cn("w-4 h-4", isHistoryOpen ? "text-blue-400" : "text-blue-500")} />
                        {isHistoryOpen ? "Tutup" : "Riwayat"}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start relative">
                <div className={cn(
                    "transition-all duration-500 ease-in-out",
                    isHistoryOpen ? "w-full lg:w-[75%]" : "w-full"
                )}>
                    <div className={cn(
                        "grid gap-3 md:gap-4",
                        isHistoryOpen ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    )}>
                        {CHECKLIST_ITEMS.map((item, index) => {
                            const isCompleted = (data as any)[item.key];
                            const fileUrl = (data as any)[`${item.key}_file_url`];
                            const isUploading = uploadingKey === item.key;

                            return (
                                <div
                                    key={item.key}
                                    className={cn(
                                        "flex flex-col p-4 rounded-xl border transition-all hover:shadow-md group relative overflow-hidden",
                                        isCompleted
                                            ? "bg-emerald-50/40 border-emerald-100/60 ring-1 ring-emerald-100/50"
                                            : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 cursor-pointer" onClick={() => handleToggle(item.key, !isCompleted)}>
                                            {isCompleted ? (
                                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                            ) : (
                                                <Circle className="h-6 w-6 text-slate-200 group-hover:text-blue-400 transition-colors" />
                                            )}
                                        </div>
                                        <div className="flex-grow cursor-pointer" onClick={() => handleToggle(item.key, !isCompleted)}>
                                            <Label
                                                className={cn(
                                                    "font-bold text-sm cursor-pointer transition-colors block",
                                                    isCompleted ? "text-emerald-900" : "text-slate-600 group-hover:text-slate-900"
                                                )}
                                            >
                                                {item.label}
                                            </Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                                                    Tahap {index + 1}
                                                </span>
                                                {isCompleted && (
                                                    <div className="flex items-center gap-1 bg-white/80 border border-emerald-100 rounded px-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
                                                        <Calendar className="w-2.5 h-2.5 text-emerald-400" />
                                                        <input
                                                            type="date"
                                                            value={(data as any)[`${item.key}_date`] ? new Date((data as any)[`${item.key}_date`]).toISOString().split('T')[0] : ''}
                                                            onChange={(e) => handleDateChange(item.key, e.target.value)}
                                                            className="text-[9px] bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-emerald-700 font-medium"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Checkbox
                                                checked={isCompleted}
                                                disabled={item.key === 'slik_ojk' && !isAdmin}
                                                onCheckedChange={(checked) => handleToggle(item.key, !!checked)}
                                                className={cn(
                                                    "rounded-md h-5 w-5 border-2 transition-all",
                                                    isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {item.key === 'slik_ojk' && (data as any).slik_ojk_status && (data as any).slik_ojk_status !== 'none' && (
                                        <div className="mt-3 bg-white/60 p-2 rounded-lg border border-slate-100">
                                            <div className="flex items-center justify-between gap-2">
                                                {(data as any).slik_ojk_status === 'pending' ? (
                                                    <>
                                                        <Badge variant="outline" className="text-[8px] bg-amber-50 text-amber-700 border-amber-200">
                                                            <Clock className="w-2 h-2 mr-1" /> Menunggu Admin
                                                        </Badge>
                                                        {isAdmin && (
                                                            <div className="flex gap-1">
                                                                <Button size="sm" className="h-6 px-2 text-[8px] bg-emerald-600" onClick={() => handleApproveSlik()}>SETUJU</Button>
                                                                <Button size="sm" className="h-6 px-2 text-[8px] bg-red-600" onClick={() => handleRejectSlik()}>TOLAK</Button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (data as any).slik_ojk_status === 'approved' ? (
                                                    <Badge className="text-[8px] bg-emerald-500 text-white border-none"><ThumbsUp className="w-2 h-2 mr-1" /> Approved</Badge>
                                                ) : (
                                                    <Badge className="text-[8px] bg-red-500 text-white border-none"><ThumbsDown className="w-2 h-2 mr-1" /> Rejected</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                                        <div className="flex gap-2">
                                            {item.key === 'booking' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-[9px] text-emerald-600 hover:bg-emerald-50 font-bold border border-emerald-100"
                                                    onClick={() => setIsPOSOpen(true)}
                                                >
                                                    <Receipt className="w-3 h-3 mr-1" /> Bayar Booking
                                                </Button>
                                            )}
                                            {item.key === 'penginputan' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-[9px] text-blue-600 hover:bg-blue-50 font-bold"
                                                    onClick={() => { setFormMode('edit'); setIsMasterFormOpen(true); }}
                                                >
                                                    <FileText className="w-3 h-3 mr-1" /> Form Master
                                                </Button>
                                            )}
                                        </div>

                                        {fileUrl ? (
                                            <div className="flex items-center gap-2">
                                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors">
                                                    <Eye className="w-3.5 h-3.5" />
                                                </a>
                                                <button onClick={() => removeFile(item.key)} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-[9px] bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 ml-auto border border-slate-100"
                                                onClick={() => { setActiveKey(item.key); fileInputRef.current?.click(); }}
                                            >
                                                {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                                Upload Berkas
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {isHistoryOpen && (
                    <div className="w-full lg:w-[25%] sticky top-6 self-start animate-in slide-in-from-right-4 duration-500">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col max-h-[calc(100vh-100px)] overflow-hidden">
                            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                                        <History className="h-4 w-4 text-white" />
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-sm">Riwayat Aktivitas</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => setIsPreviewOpen(true)} 
                                        className="h-8 w-8 rounded-full border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                        title="Preview Kertas Putih"
                                    >
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)} className="h-8 w-8 rounded-full">
                                        <X className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>
                            </div>

                            {logs.length > 1 && (
                                <div className="mx-5 mt-4 p-3 bg-slate-900 rounded-xl text-white flex items-center justify-between shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-blue-400" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider">Total Durasi</span>
                                    </div>
                                    <span className="text-xs font-black">
                                        {(() => {
                                            const first = parseISO(logs[logs.length - 1].created_at);
                                            const last = parseISO(logs[0].created_at);
                                            const days = differenceInDays(last, first);
                                            return days > 0 ? `${days} Hari` : "Hari yang sama";
                                        })()}
                                    </span>
                                </div>
                            )}

                            <div className="flex-grow overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-200">
                                {logs.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <History className="w-12 h-12 mx-auto text-slate-100" />
                                        <p className="text-xs text-slate-400">Belum ada riwayat tercatat</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-3 border-l-2 border-slate-100 space-y-6">
                                        {logs.map((log, index) => {
                                            const stage = CHECKLIST_ITEMS.find(i => i.key === log.stage_key);
                                            let diffText = null;
                                            if (index < logs.length - 1) {
                                                const cur = parseISO(log.created_at);
                                                const pre = parseISO(logs[index + 1].created_at);
                                                const d = differenceInDays(cur, pre);
                                                const h = differenceInHours(cur, pre) % 24;
                                                diffText = d > 0 ? `+${d}h ${h}j` : h > 0 ? `+${h}j` : `< 1j`;
                                            }

                                            return (
                                                <div key={log.id} className="relative">
                                                    <div className={cn(
                                                        "absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-white ring-2 ring-slate-50",
                                                        log.status ? "bg-emerald-500" : "bg-red-500"
                                                    )} />
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h5 className="text-[11px] font-black text-slate-800">{stage?.label || log.stage_key}</h5>
                                                        <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                            {format(parseISO(log.created_at), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white transition-all group">
                                                        <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{log.notes}</p>
                                                        <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-100/50">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[7px] font-bold text-blue-700 uppercase">
                                                                    {log.user_name.charAt(0)}
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-400">{log.user_name}</span>
                                                            </div>
                                                            {diffText && (
                                                                <Badge variant="outline" className="text-[8px] h-4 px-1 bg-white text-blue-600 border-blue-100 font-black">
                                                                    {diffText}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
                <DialogContent className="max-w-[95vw] xl:max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50">
                    <DialogHeader className="p-6 bg-white border-b shrink-0">
                        <DialogTitle>Form Master Data Konsumen</DialogTitle>
                        <DialogDescription>Bandingkan data Real dan Bank secara berdampingan</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
                        <div className="flex-1 h-full bg-white rounded-xl border overflow-y-auto">
                            <ConsumerProfileForm 
                                consumerId={consumerId} 
                                readOnly={formMode === 'preview'} 
                                onSuccess={() => fetchPemberkasan()} 
                                onCancel={() => setIsMasterFormOpen(false)}
                            />
                        </div>
                        <div className="flex-1 h-full bg-white rounded-xl border-2 border-blue-100 overflow-y-auto">
                            <ConsumerProfileForm 
                                consumerId={consumerId} 
                                readOnly={formMode === 'preview'} 
                                isUnrealData={true} 
                                onSuccess={() => fetchPemberkasan()}
                                onCancel={() => setIsMasterFormOpen(false)}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-slate-800 border-none shadow-2xl">
                    <div className="sticky top-0 z-10 bg-slate-900 p-4 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Printer className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Preview Kertas Putih</h3>
                                <p className="text-slate-400 text-[10px]">Siap untuk dicetak atau disimpan sebagai PDF</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                                onClick={() => window.print()}
                            >
                                <Printer className="w-3.5 h-3.5 mr-2" /> CETAK SEKARANG
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsPreviewOpen(false)} 
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="p-12 bg-slate-800 flex justify-center">
                        <div id="printable-history" className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-[0_0_50px_rgba(0,0,0,0.3)] p-12 text-slate-900 print:shadow-none print:p-0 print:m-0">
                            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                                <div>
                                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Riwayat Aktivitas Pemberkasan</h1>
                                    <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">Sistem Manajemen Property JAYA TEMPO</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase">Tanggal Cetak</div>
                                    <div className="text-xs font-bold">{format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Nama Konsumen</div>
                                        <div className="text-sm font-bold text-slate-900">{consumerName}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">ID Konsumen</div>
                                        <div className="text-sm font-mono font-bold text-slate-600">{consumerId.split('-')[0].toUpperCase()}...</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Proyek Perumahan</div>
                                        <div className="text-sm font-bold text-slate-900">{housingProject || 'Data belum diisi'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Blok / No</div>
                                        <div className="text-sm font-bold text-slate-900">{housingBlockNo || 'Data belum diisi'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-12">
                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                    Detail Aktivitas Checklist
                                </h2>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-900 text-white">
                                                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">No</th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Tahap Pemberkasan</th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Tanggal & Waktu</th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Durasi</th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Status</th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider">Petugas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {logs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 italic">Belum ada riwayat aktivitas yang tercatat</td>
                                                </tr>
                                            ) : (
                                                logs.map((log, idx) => {
                                                    const stage = CHECKLIST_ITEMS.find(i => i.key === log.stage_key);
                                                    let duration = "-";
                                                    if (idx < logs.length - 1) {
                                                        try {
                                                            const cur = parseISO(log.created_at);
                                                            const prev = parseISO(logs[idx + 1].created_at);
                                                            if (isValid(cur) && isValid(prev)) {
                                                                const days = differenceInDays(cur, prev);
                                                                const hours = differenceInHours(cur, prev) % 24;
                                                                if (days > 0) duration = `${days}h ${hours}j`;
                                                                else if (hours > 0) duration = `${hours} jam`;
                                                                else duration = "< 1 jam";
                                                            }
                                                        } catch (e) { duration = "-"; }
                                                    }
                                                    return (
                                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-3 px-4 text-xs font-bold text-slate-400">{logs.length - idx}</td>
                                                            <td className="py-3 px-4">
                                                                <div className="text-xs font-bold text-slate-900">{stage?.label || log.stage_key}</div>
                                                                <div className="text-[9px] text-slate-500 mt-0.5 italic">{log.notes}</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="text-xs font-medium text-slate-700">{format(parseISO(log.created_at), 'dd/MM/yyyy')}</div>
                                                                <div className="text-[10px] font-bold text-slate-400">{format(parseISO(log.created_at), 'HH:mm')}</div>
                                                            </td>
                                                            <td className="py-3 px-4 text-[10px] font-black text-blue-600">{duration}</td>
                                                            <td className="py-3 px-4">
                                                                {log.status ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase">Selesai</span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-700 uppercase">Dibatalkan</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-bold text-slate-600">{log.user_name}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mt-16 grid grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">Statistik Pemberkasan</div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-600">Total Selesai</span>
                                            <span className="text-xs font-black text-slate-900">{completedCount} dari {CHECKLIST_ITEMS.length}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600" style={{ width: `${progressPercentage}%` }} />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-relaxed">
                                        * Dokumen ini merupakan riwayat aktivitas digital yang dihasilkan secara otomatis oleh sistem. Segala perubahan data tercatat dengan identitas petugas terkait.
                                    </p>
                                </div>
                                <div className="flex flex-col items-center justify-end">
                                    <div className="text-xs font-bold text-slate-900 mb-20 text-center">
                                        Diketahui Oleh,<br/>
                                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Admin Marketing</span>
                                    </div>
                                    <div className="w-48 border-b-2 border-slate-900" />
                                    <div className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Tanda Tangan & Cap</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BookingPOS 
                consumer={consumerProfile}
                isOpen={isPOSOpen}
                onClose={() => setIsPOSOpen(false)}
                onSuccess={() => {
                    fetchPemberkasan();
                    fetchLogs();
                }}
            />

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    #printable-history, #printable-history * { visibility: visible; }
                    #printable-history { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; }
                    @page { size: A4; margin: 1.5cm; }
                }
            ` }} />
        </div>
    );
}
