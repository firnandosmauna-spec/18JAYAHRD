import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import {
    Plus,
    FileText,
    Trash2,
    Search,
    List,
    Image as ImageIcon,
    Calendar,
    DollarSign,
    User,
    Building,
    MapPin,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Types
type Stage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Pipeline {
    id: string;
    title: string;
    contact_name: string;
    company: string;
    value: number;
    stage: Stage;
    survey_date?: string;
    booking_date?: string;
    booking_fee?: number;
    akad_date?: string;
    source?: string;
    notes?: string;
    created_by?: string;
    created_at: string;
    attachment_url?: string;
    survey_attachment_url?: string;
    booking_attachment_url?: string;
    akad_attachment_url?: string;
}

const STAGES: { id: Stage; label: string; color: string }[] = [
    { id: 'lead', label: 'Lead Masuk', color: 'bg-slate-100 text-slate-700' },
    { id: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
    { id: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
    { id: 'negotiation', label: 'Negosiasi', color: 'bg-orange-100 text-orange-700' },
    { id: 'won', label: 'Deal Won', color: 'bg-green-100 text-green-700' },
    { id: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

export function UserPipeline() {
    const { user } = useAuth();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Pipeline | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        contact_name: '',
        company: '',
        value: 0,
        stage: 'lead' as Stage,
        source: '',
        survey_date: '',
        booking_date: '',
        booking_fee: 0,
        akad_date: '',
        notes: '',
        attachment_url: '',
        survey_attachment_url: '',
        booking_attachment_url: '',
        akad_attachment_url: ''
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
        } catch {
            return dateString;
        }
    };

    const fetchPipelines = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('marketing_pipelines')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPipelines(data || []);
        } catch (err) {
            console.error('Error feching pipelines:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPipelines();
    }, [user]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string = 'attachment_url') => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        try {
            setUploading(true);
            const { error: uploadError } = await supabase.storage
                .from('pipeline-uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('pipeline-uploads')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [targetField]: data.publicUrl }));

            toast({
                title: "Upload Berhasil",
                description: "Gambar berhasil diunggah",
            });
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast({
                title: "Upload Gagal",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                survey_date: formData.survey_date || null,
                booking_date: formData.booking_date || null,
                akad_date: formData.akad_date || null,
                created_by: user?.id
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('marketing_pipelines')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('marketing_pipelines')
                    .insert([payload]);
                if (error) throw error;
            }
            setIsAddOpen(false);
            setEditingItem(null);
            resetForm();
            fetchPipelines();
            toast({
                title: "Berhasil!",
                description: editingItem ? "Data deal berhasil diperbarui." : "Deal baru berhasil dibuat.",
            });
        } catch (error) {
            console.error('Error saving pipeline:', error);
            toast({
                title: "Gagal menyimpan",
                description: "Terjadi kesalahan saat menyimpan data.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus deal ini?')) return;
        try {
            const { error } = await supabase.from('marketing_pipelines').delete().eq('id', id);
            if (error) throw error;
            fetchPipelines();
            toast({
                title: "Terhapus",
                description: "Data deal berhasil dihapus.",
            });
        } catch (err: any) {
            console.error('Error deleting:', err);
            toast({
                title: "Gagal menghapus",
                description: err.message,
                variant: "destructive"
            });
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            contact_name: '',
            company: '',
            value: 0,
            stage: 'lead',
            source: '',
            survey_date: '',
            booking_date: '',
            booking_fee: 0,
            akad_date: '',
            notes: '',
            attachment_url: '',
            survey_attachment_url: '',
            booking_attachment_url: '',
            akad_attachment_url: ''
        });
    };

    const openEdit = (item: Pipeline) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            contact_name: item.contact_name,
            company: item.company,
            value: item.value,
            stage: item.stage,
            source: item.source || '',
            survey_date: item.survey_date ? item.survey_date.split('T')[0] : '',
            booking_date: item.booking_date ? item.booking_date.split('T')[0] : '',
            booking_fee: item.booking_fee || 0,
            akad_date: item.akad_date ? item.akad_date.split('T')[0] : '',
            notes: item.notes || '',
            attachment_url: item.attachment_url || '',
            survey_attachment_url: item.survey_attachment_url || '',
            booking_attachment_url: item.booking_attachment_url || '',
            akad_attachment_url: item.akad_attachment_url || ''
        });
        setIsAddOpen(true);
    };

    const filteredPipelines = pipelines.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari deal saya..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    <Button onClick={() => { resetForm(); setEditingItem(null); setIsAddOpen(true); }} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                        <Plus className="w-4 h-4 mr-2" />
                        Deal Baru
                    </Button>
                </div>
            </div>

            {/* Data Grid Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[20%]">Rencana Penjualan</TableHead>
                            <TableHead className="w-[10%]">Asal Konsumen</TableHead>
                            <TableHead className="w-[25%]">Data Konsumen</TableHead>
                            <TableHead className="w-[15%]">Survey / Waktu</TableHead>
                            <TableHead className="w-[15%]">Booking</TableHead>
                            <TableHead className="w-[10%]">Akad</TableHead>
                            <TableHead className="w-[5%]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2 text-slate-500">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredPipelines.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    Belum ada data deal.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPipelines.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50">
                                    {/* 1. Rencana Penjualan */}
                                    <TableCell className="align-top">
                                        <div className="font-semibold text-slate-900">{item.title}</div>
                                        <div className="text-emerald-600 font-medium text-xs mt-1">
                                            {formatCurrency(item.value)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`mt-2 ${STAGES.find(s => s.id === item.stage)?.color} border-0`}
                                        >
                                            {STAGES.find(s => s.id === item.stage)?.label}
                                        </Badge>
                                    </TableCell>

                                    {/* 2. Asal Konsumen */}
                                    <TableCell className="align-top">
                                        {item.source ? (
                                            <Badge variant="outline" className="font-normal text-slate-600">
                                                {item.source}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </TableCell>

                                    {/* 3. Data Konsumen */}
                                    <TableCell className="align-top">
                                        <div className="flex gap-3">
                                            {item.attachment_url && (
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={item.attachment_url}
                                                        alt="Thumbnail"
                                                        className="h-10 w-10 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(item.attachment_url, '_blank')}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-slate-900 flex items-center gap-1">
                                                    <User className="h-3 w-3 text-slate-400" /> {item.contact_name}
                                                </div>
                                                {item.company && (
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Building className="h-3 w-3 text-slate-400" /> {item.company}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic">
                                                        "{item.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* 4. Survey / Waktu */}
                                    <TableCell className="align-top">
                                        {item.survey_date ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {formatDate(item.survey_date)}
                                                </div>
                                                {item.survey_attachment_url && (
                                                    <div className="mt-1">
                                                        <img
                                                            src={item.survey_attachment_url}
                                                            alt="Bukti Survey"
                                                            className="h-10 w-10 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                                                            onClick={() => window.open(item.survey_attachment_url, '_blank')}
                                                            title="Bukti Survey"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </TableCell>

                                    {/* 5. Booking */}
                                    <TableCell className="align-top">
                                        <div className="space-y-1">
                                            {item.booking_date ? (
                                                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {formatDate(item.booking_date)}
                                                </div>
                                            ) : (
                                                <div className="text-slate-400 text-xs">-</div>
                                            )}

                                            {item.booking_fee ? (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                                                    <DollarSign className="h-3 w-3" />
                                                    {formatCurrency(item.booking_fee)}
                                                </div>
                                            ) : null}

                                            {item.booking_attachment_url && (
                                                <div className="mt-1">
                                                    <img
                                                        src={item.booking_attachment_url}
                                                        alt="Bukti Booking"
                                                        className="h-10 w-10 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(item.booking_attachment_url, '_blank')}
                                                        title="Bukti Booking"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* 6. Akad */}
                                    <TableCell className="align-top">
                                        <div className="space-y-2">
                                            {item.akad_date ? (
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100 w-fit">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    {formatDate(item.akad_date)}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Belum dijadwalkan</span>
                                            )}
                                            {item.akad_attachment_url && (
                                                <div className="mt-1">
                                                    <img
                                                        src={item.akad_attachment_url}
                                                        alt="Bukti Akad"
                                                        className="h-10 w-10 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(item.akad_attachment_url, '_blank')}
                                                        title="Bukti Akad"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="align-top">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                onClick={() => openEdit(item)}
                                            >
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Deal' : 'Tambah Deal Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Section 1: Data Utama */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Deal / Proyek</Label>
                                <Input required placeholder="Contoh: Unit A5 Cluster X" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Nama Perusahaan (Optional)</Label>
                                <Input placeholder="PT..." value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                            </div>
                        </div>

                        {/* Section 2: Kontak & Source */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Client (PIC)</Label>
                                <Input required placeholder="Nama lengkap" value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Sumber (Source)</Label>
                                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih sumber..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                                        <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                                        <SelectItem value="Instagram">Instagram</SelectItem>
                                        <SelectItem value="Tiktok">Tiktok</SelectItem>
                                        <SelectItem value="Website">Website</SelectItem>
                                        <SelectItem value="Referral">Referral</SelectItem>
                                        <SelectItem value="Pameran">Pameran</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 my-2" />

                        {/* Section 3: Nilai & Jadwal */}
                        {/* Section 3: Nilai & Jadwal */}
                        {/* Section 3: Timeline & Financials (Chronological Layout) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">

                            {/* Col 1: Tahap Survey */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span>
                                    Tahap Survey
                                </h4>
                                <div className="space-y-2">
                                    <Label>Jadwal Survey</Label>
                                    <Input type="date" value={formData.survey_date} onChange={e => setFormData({ ...formData, survey_date: e.target.value })} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs text-slate-500"><ImageIcon className="w-3 h-3" /> Bukti Survey</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                className="cursor-pointer bg-white h-8 text-xs pr-8"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'survey_attachment_url')}
                                                disabled={uploading}
                                            />
                                        </div>
                                        {formData.survey_attachment_url && (
                                            <div className="relative group flex-shrink-0">
                                                <img src={formData.survey_attachment_url} alt="Preview" className="h-8 w-8 object-cover rounded border border-slate-200" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, survey_attachment_url: '' })}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-2 h-2" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Col 2: Tahap Booking */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                                    Tahap Booking
                                </h4>
                                <div className="space-y-2">
                                    <Label>Tanggal Booking</Label>
                                    <Input type="date" value={formData.booking_date} onChange={e => setFormData({ ...formData, booking_date: e.target.value })} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Booking Fee (Rp)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">Rp</span>
                                        <Input type="number" className="pl-8 bg-white" value={formData.booking_fee} onChange={e => setFormData({ ...formData, booking_fee: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs text-slate-500"><ImageIcon className="w-3 h-3" /> Bukti Booking</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                className="cursor-pointer bg-white h-8 text-xs pr-8"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'booking_attachment_url')}
                                                disabled={uploading}
                                            />
                                        </div>
                                        {formData.booking_attachment_url && (
                                            <div className="relative group flex-shrink-0">
                                                <img src={formData.booking_attachment_url} alt="Preview" className="h-8 w-8 object-cover rounded border border-slate-200" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, booking_attachment_url: '' })}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-2 h-2" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Col 3: Tahap Akad & Final */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">3</span>
                                    Tahap Akad
                                </h4>
                                <div className="space-y-2">
                                    <Label className="text-blue-600 font-semibold">Nilai Deal (Rp)</Label>
                                    <Input type="number" className="font-semibold bg-white" required value={formData.value} onChange={e => setFormData({ ...formData, value: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rencana Akad</Label>
                                    <Input type="date" value={formData.akad_date} onChange={e => setFormData({ ...formData, akad_date: e.target.value })} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs text-slate-500"><ImageIcon className="w-3 h-3" /> Bukti Akad</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                className="cursor-pointer bg-white h-8 text-xs pr-8"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'akad_attachment_url')}
                                                disabled={uploading}
                                            />
                                        </div>
                                        {formData.akad_attachment_url && (
                                            <div className="relative group flex-shrink-0">
                                                <img src={formData.akad_attachment_url} alt="Preview" className="h-8 w-8 object-cover rounded border border-slate-200" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, akad_attachment_url: '' })}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-2 h-2" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Notes */}
                        <div className="space-y-2">
                            <Label>Catatan Tambahan</Label>
                            <Input placeholder="Catatan progress..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        </div>

                        {/* Section 5: Image Upload (Kept consistent) */}
                        <div className="space-y-2">
                            <Label>Upload Foto/Dokumen</Label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        ref={fileInputRef}
                                        className="cursor-pointer bg-white"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'attachment_url')}
                                        disabled={uploading}
                                    />
                                </div>
                                {uploading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                            </div>
                            {formData.attachment_url && (
                                <div className="mt-2 relative w-fit group">
                                    <img
                                        src={formData.attachment_url}
                                        alt="Preview"
                                        className="h-24 w-24 object-cover rounded-lg border border-slate-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, attachment_url: '' })}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={uploading}>
                                {uploading ? 'Mengupload...' : 'Simpan Data'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
