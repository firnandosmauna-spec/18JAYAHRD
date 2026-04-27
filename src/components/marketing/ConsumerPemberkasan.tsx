import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, Circle, Upload, FileText, X, Eye, Paperclip, Printer } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConsumerPemberkasan as ConsumerPemberkasanType } from './MarketingTypes';
import { cn } from "@/lib/utils";
import { ConsumerProfileForm } from './ConsumerProfileForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsContext } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { Check, RotateCcw, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

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
    const isAdmin = user?.role?.toLowerCase() === 'administrator' || user?.role === 'Administrator';

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
                // Saat dicentang, set tanggal ke hari ini (format ISO)
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

            if (onUpdate) onUpdate();
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

            const { error } = await supabase
                .from('consumer_pemberkasan')
                .update(updates)
                .eq('consumer_id', consumerId);

            if (error) throw error;

            setData(prev => prev ? { ...prev, ...updates } : null);

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
            // Use 'consumers/' prefix because it's established in other components (likely for RLS policies)
            const filePath = `consumers/pemberkasan/${consumerId}/${fileName}`;

            // Upload to Supabase Storage
            // Using 'pipeline-uploads' bucket
            const { error: uploadError } = await supabase.storage
                .from('pipeline-uploads')
                .upload(filePath, file, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('pipeline-uploads')
                .getPublicUrl(filePath);

            // Update Database
            const updates: any = {
                [`${activeKey}_file_url`]: publicUrl,
            };

            // Business logic: slik_ojk requires admin approval
            if (activeKey === 'slik_ojk') {
                updates.slik_ojk = false; // Stay false until approved
                updates.slik_ojk_status = 'pending';
                updates.slik_ojk_date = new Date().toISOString(); // Still record upload date
            } else {
                updates[activeKey] = true; // Automatically check if file is uploaded for other items
                // If it wasn't checked before, add timestamp
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

            // Trigger notification for SLIK OJK upload
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
            // Show more detailed error message
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
                [key]: false // Reset completion if file is removed
            };

            // Reset SLIK OJK specific fields
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

    if (!data) return <div className="p-4 text-center text-slate-500">Data tidak ditemukan.</div>;

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

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">{consumerName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 py-0 h-5">
                            {housingProject || 'Tanpa Proyek'}
                        </Badge>
                        {housingBlockNo && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 py-0 h-5">
                                {housingBlockNo}
                            </Badge>
                        )}
                        <span className="text-xs text-slate-400 ml-1">Status Pengerjaan Pemberkasan</span>
                    </div>
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
                    const fileUrl = (data as any)[`${item.key}_file_url`];
                    const isUploading = uploadingKey === item.key;

                    return (
                        <div
                            key={item.key}
                            className={cn(
                                "flex flex-col p-4 rounded-xl border transition-all hover:shadow-md group relative",
                                isCompleted
                                    ? "bg-emerald-50/50 border-emerald-100 ring-1 ring-emerald-100"
                                    : "bg-white border-slate-100 hover:border-blue-200 shadow-sm"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 cursor-pointer" onClick={() => handleToggle(item.key, !isCompleted)}>
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    ) : (
                                        <Circle className="h-6 w-6 text-slate-300 group-hover:text-blue-400" />
                                    )}
                                </div>
                                <div className="flex-grow cursor-pointer" onClick={() => handleToggle(item.key, !isCompleted)}>
                                    <Label
                                        className={cn(
                                            "font-medium cursor-pointer transition-colors block",
                                            isCompleted ? "text-emerald-900" : "text-slate-600 group-hover:text-slate-900"
                                        )}
                                    >
                                        {item.label}
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[10px] text-slate-400">
                                            Tahap {index + 1}
                                        </p>
                                        {isCompleted && (
                                            <div className="flex items-center gap-1 bg-white/50 border border-slate-100 rounded px-1 group/date" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="date"
                                                    value={(data as any)[`${item.key}_date`] ? new Date((data as any)[`${item.key}_date`]).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleDateChange(item.key, e.target.value)}
                                                    className="text-[9px] bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-slate-500 hover:text-blue-600"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <Checkbox
                                        checked={isCompleted}
                                        disabled={item.key === 'slik_ojk' && !isAdmin}
                                        onCheckedChange={(checked) => {
                                            if (item.key === 'slik_ojk' && !isAdmin) {
                                                toast({
                                                    title: "Akses Dibatasi",
                                                    description: "Hanya Administrator yang dapat menyetujui SLIK OJK",
                                                });
                                                return;
                                            }
                                            handleToggle(item.key, !!checked);
                                        }}
                                        className={cn(
                                            "rounded-full h-5 w-5 border-2",
                                            isCompleted ? "border-emerald-500 bg-emerald-500" : "border-slate-200"
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Approval Status Overlay for Slik OJK */}
                            {item.key === 'slik_ojk' && (data as any).slik_ojk_status && (data as any).slik_ojk_status !== 'none' && (
                                <div className="mt-2 flex items-center gap-2">
                                    {(data as any).slik_ojk_status === 'pending' && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] flex items-center gap-1 shrink-0",
                                                isAdmin ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}>
                                                <Clock className="w-2.5 h-2.5" /> 
                                                {isAdmin ? 'Butuh Verifikasi Anda' : 'Menunggu Persetujuan Admin'}
                                            </Badge>
                                            
                                            {isAdmin && (
                                                <div className="flex gap-1.5">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-6 px-2 text-[8px] bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 font-bold"
                                                        onClick={(e) => { e.stopPropagation(); handleApproveSlik(); }}
                                                        disabled={saving}
                                                    >
                                                        <Check className="w-2.5 h-2.5 mr-1" /> SETUJUI
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-6 px-2 text-[8px] bg-red-600 text-white border-red-500 hover:bg-red-700 font-bold"
                                                        onClick={(e) => { e.stopPropagation(); handleRejectSlik(); }}
                                                        disabled={saving}
                                                    >
                                                        <X className="w-2.5 h-2.5 mr-1" /> TOLAK
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(data as any).slik_ojk_status === 'approved' && (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] flex items-center gap-1">
                                            <ThumbsUp className="w-2.5 h-2.5" /> Disetujui Admin
                                        </Badge>
                                    )}
                                    {(data as any).slik_ojk_status === 'rejected' && (
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px] flex items-center gap-1">
                                            <ThumbsDown className="w-2.5 h-2.5" /> Ditolak Admin
                                        </Badge>
                                    )}
                                </div>
                            )}

                            {/* File Upload Section */}
                            <div className="mt-3 flex flex-col gap-2 border-t border-dashed border-slate-200 pt-3">
                                {item.key === 'penginputan' && (
                                    <>
                                        {!isCompleted ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-[10px] h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 mb-1"
                                                onClick={() => { setFormMode('edit'); setIsMasterFormOpen(true); }}
                                            >
                                                <FileText className="h-3 w-3 mr-1" />
                                                Lengkapi Form Master
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col gap-2 mb-1 w-full">
                                                <div className="flex gap-2 w-full">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-1/2 text-[10px] h-8 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                        onClick={() => { setFormMode('preview'); setIsMasterFormOpen(true); }}
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        Preview
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-1/2 text-[10px] h-8 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                        onClick={() => { setFormMode('edit'); setIsMasterFormOpen(true); }}
                                                    >
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-[10px] h-8 bg-slate-800 text-white border-slate-700 hover:bg-slate-900"
                                                    onClick={() => { setFormMode('preview'); setIsMasterFormOpen(true); }}
                                                >
                                                    <Printer className="h-3 w-3 mr-1" />
                                                    Cetak Data Konsumen
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {fileUrl ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 max-w-full overflow-hidden">
                                            <div className="bg-emerald-100 p-1.5 rounded-md">
                                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[10px] font-medium text-emerald-700 truncate">Dokumen Terlampir</span>
                                                <div className="flex gap-2 mt-0.5">
                                                    <a
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <Eye className="h-2.5 w-2.5" /> Lihat
                                                    </a>
                                                    <button
                                                        onClick={() => removeFile(item.key)}
                                                        className="text-[9px] text-red-500 hover:text-red-700 flex items-center gap-1"
                                                    >
                                                        <X className="h-2.5 w-2.5" /> Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                                            <Paperclip className="h-2.5 w-2.5" /> Belum ada file
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isUploading}
                                            className="h-7 px-2 text-[10px] bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200"
                                            onClick={() => {
                                                setActiveKey(item.key);
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            {isUploading ? (
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            ) : (
                                                <Upload className="h-3 w-3 mr-1" />
                                            )}
                                            Upload
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {(saving || uploadingKey) && (
                <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                        {uploadingKey ? 'Mengunggah file...' : 'Menyimpan...'}
                    </span>
                </div>
            )}

            <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
                <DialogContent className="max-w-[95vw] xl:max-w-[1400px] h-[95vh] flex flex-col p-4 md:p-6 bg-slate-50/50 backdrop-blur-sm overflow-hidden">
                    <DialogHeader className="shrink-0 bg-white p-4 rounded-xl mb-4 shadow-sm border border-slate-200">
                        <DialogTitle className="text-xl">
                            {formMode === 'preview' ? 'Preview Perbandingan Data Konsumen' : 'Lengkapi & Bandingkan Data Master Konsumen'}
                        </DialogTitle>
                        <DialogDescription>
                            {formMode === 'preview'
                                ? 'Lihat perbandingan data profil asli (real) dan profil bank (un-real).'
                                : 'Sinkronisasi data profil konsumen untuk tahap Penginputan secara bersebelahan.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-grow overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
                        {/* Kiri: Data Real */}
                        <div className="w-full lg:w-1/2 h-full overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200 relative flex flex-col">
                            <div className="sticky top-0 bg-slate-800 text-white z-20 p-3 px-6 shadow-sm flex items-center justify-between shrink-0">
                                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Form Data Asli (Real)</h3>
                                <span className="text-[10px] bg-slate-700 px-2.5 py-1 rounded-full font-medium tracking-wider">DATA UTAMA</span>
                            </div>
                            <div className="p-4 md:p-6 flex-grow">
                                <ConsumerProfileForm
                                    consumerId={consumerId}
                                    readOnly={formMode === 'preview'}
                                    onSuccess={async () => {
                                        if (data && !data.penginputan) {
                                            await handleToggle('penginputan', true);
                                        }
                                        toast({
                                            title: "Sinkronisasi Berhasil",
                                            description: "Data master utama diperbarui.",
                                        });
                                        // Tidak langsung menutup dialog agar user bisa mensubmit data unreal juga
                                    }}
                                    onCancel={() => setIsMasterFormOpen(false)}
                                />
                            </div>
                        </div>

                        {/* Kanan: Data Un-Real */}
                        <div className="w-full lg:w-1/2 h-full overflow-y-auto bg-white rounded-xl shadow-sm border-2 border-blue-200 relative flex flex-col">
                            <div className="sticky top-0 bg-blue-600 text-white z-20 p-3 px-6 shadow-sm flex items-center justify-between shrink-0">
                                <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-blue-200" /> Form Data Bank (Un-Real)</h3>
                                <span className="text-[10px] bg-blue-500 px-2.5 py-1 rounded-full font-medium tracking-wider">PERBANDINGAN</span>
                            </div>
                            <div className="p-4 md:p-6 flex-grow bg-blue-50/10">
                                <ConsumerProfileForm
                                    consumerId={consumerId}
                                    readOnly={formMode === 'preview'}
                                    isUnrealData={true}
                                    onSuccess={async () => {
                                        toast({
                                            title: "Sinkronisasi Berhasil",
                                            description: "Data perbandingan (un-real) disimpan.",
                                        });
                                    }}
                                    onCancel={() => setIsMasterFormOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
