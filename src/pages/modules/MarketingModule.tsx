import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Trello,
    Plus,
    MoreVertical,
    DollarSign,
    Building,
    User,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Search,
    Filter,
    Send,
    Check,
    LayoutGrid,
    List,
    Download,
    Activity,
    FileText,
    Upload,
    Trash2,
    History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
    notes?: string;
    created_by?: string;
    created_at: string;
    attachment_url?: string;
    survey_attachment_url?: string;
    booking_attachment_url?: string;
    akad_attachment_url?: string;
}

interface Attachment {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    created_at: string;
    uploaded_by: string;
}

interface LogEntry {
    id: string;
    action: string;
    details: string;
    created_at: string;
    user_id: string;
}

const STAGES: { id: Stage; label: string; color: string }[] = [
    { id: 'lead', label: 'Lead Masuk', color: 'bg-slate-100 border-slate-200 text-slate-700' },
    { id: 'qualified', label: 'Qualified', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'proposal', label: 'Proposal', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'negotiation', label: 'Negosiasi', color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { id: 'won', label: 'Deal Won', color: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'lost', label: 'Lost', color: 'bg-red-50 border-red-200 text-red-700' },
];

export default function MarketingModule() {
    const { user } = useAuth();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'board' | 'list'>('list');

    // Admin Filter State
    const [users, setUsers] = useState<{ id: string, name: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const { toast } = useToast();

    // Date Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Pipeline | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [uploading, setUploading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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

    const fetchPipelines = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('marketing_pipelines')
                .select('*')
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

        // Realtime Subscription
        const channel = supabase
            .channel('marketing_pipelines_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_pipelines' }, () => {
                fetchPipelines();
            })
            .subscribe();

    }, []);

    // Fetch Users for Admin Filter
    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            // Only fetch if admin or manager
            if (['admin', 'manager'].includes(user.role)) {
                try {
                    // Fetch users who have marketing access (role marketing OR marketing in modules)
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, name')
                        .or('role.eq.marketing,modules.cs.{"marketing"}'); // cs = contains

                    if (error) throw error;
                    setUsers(data || []);
                } catch (err) {
                    console.error('Error fetching users:', err);
                }
            }
        };
        fetchUsers();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Sanitize payload: Convert empty strings to null for Dates
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
            setIsAddOpen(false);
            setEditingItem(null);
            resetForm();
            fetchPipelines();
            toast({
                title: "Berhasil!",
                description: editingItem ? "Data deal berhasil diperbarui." : "Deal baru berhasil dibuat.",
                variant: "default",
                className: "bg-green-50 border-green-200 text-green-800"
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

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase.from('marketing_pipelines').delete().eq('id', deleteId);
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
                description: err.message || 'Unknown error',
                variant: "destructive"
            });
        } finally {
            setDeleteId(null);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    const handleMoveStage = async (id: string, newStage: Stage) => {
        try {
            const { error } = await supabase
                .from('marketing_pipelines')
                .update({ stage: newStage })
                .eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('Error moving stage:', err);
        }
    };

    const handleRequestApproval = async (id: string) => {
        // if (!confirm('Kirim deal ini ke Admin/Manager untuk persetujuan pencairan fee?')) return; 
        // Modern UI: Just do it or use a toast to confirm. For now, proceeding directly.
        try {
            const { error } = await supabase
                .from('marketing_pipelines')
                .update({ approval_status: 'pending' })
                .eq('id', id);
            if (error) throw error;
            toast({ title: "Pengajuan Terkirim", description: "Menunggu persetujuan Admin/Manager." });
            fetchPipelines();
        } catch (err) {
            console.error('Error requesting approval:', err);
            toast({ title: "Gagal Mengirim", description: "Terjadi kesalahan.", variant: "destructive" });
        }
    };

    const handleApproveDeal = async (id: string) => {
        // if (!confirm('Setujui deal ini dan cairkan fee?')) return;
        try {
            const { error } = await supabase
                .from('marketing_pipelines')
                .update({ approval_status: 'approved' })
                .eq('id', id);
            if (error) throw error;
            toast({ title: "Deal Disetujui", description: "Fee siap dicairkan.", className: "bg-blue-50 text-blue-800 border-blue-200" });
            fetchPipelines();
        } catch (err) {
            console.error('Error approving:', err);
            toast({ title: "Gagal Menyetujui", variant: "destructive" });
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
            survey_date: item.survey_date ? item.survey_date.split('T')[0] : '', // Format YYYY-MM-DD
            booking_date: item.booking_date ? item.booking_date.split('T')[0] : '',
            booking_fee: item.booking_fee || 0,
            akad_date: item.akad_date ? item.akad_date.split('T')[0] : '',
            notes: item.notes || '',
            attachment_url: item.attachment_url || '',
            survey_attachment_url: item.survey_attachment_url || '',
            booking_attachment_url: item.booking_attachment_url || '',
            akad_attachment_url: item.akad_attachment_url || ''
        });
        fetchAttachments(item.id);
        fetchLogs(item.id);
        setIsAddOpen(true);
    };

    const fetchAttachments = async (pipelineId: string) => {
        const { data } = await supabase
            .from('marketing_attachments')
            .select('*')
            .eq('pipeline_id', pipelineId)
            .order('created_at', { ascending: false });
        setAttachments(data || []);
    };

    const fetchLogs = async (pipelineId: string) => {
        const { data } = await supabase
            .from('marketing_logs')
            .select('*')
            .eq('pipeline_id', pipelineId)
            .order('created_at', { ascending: false });
        setLogs(data || []);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string = 'attachment_url') => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id || 'admin'}/${fileName}`;

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

            toast({ title: "Upload Berhasil", description: "Gambar berhasil diunggah" });
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast({ title: "Upload Gagal", description: error.message, variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !editingItem) return;

        try {
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${editingItem.id}/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('marketing-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Save Metadata
            const { error: dbError } = await supabase
                .from('marketing_attachments')
                .insert([{
                    pipeline_id: editingItem.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size,
                    uploaded_by: user?.id
                }]);

            if (dbError) throw dbError;

            // Refresh
            fetchAttachments(editingItem.id);
            toast({ title: "Upload Berhasil", description: file.name });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({ title: "Upload Gagal", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = async (id: string, filePath: string) => {
        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('marketing-files')
                .remove([filePath]);

            if (storageError) console.error('Storage delete error:', storageError);

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from('marketing_attachments')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            if (editingItem) fetchAttachments(editingItem.id);
            toast({ title: "File Terhapus" });
        } catch (error) {
            console.error('Delete error:', error);
            toast({ title: "Gagal Menghapus File", variant: "destructive" });
        }
    };

    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('marketing-files').getPublicUrl(path);
        return data.publicUrl;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    const filteredPipelines = pipelines.filter(p => {
        // 1. Search Query Filter
        const matchesSearch =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.contact_name.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. User Filter (Admin Only)
        const matchesUser = selectedUser === 'all' || p.created_by === selectedUser;

        // 3. Date Filter
        let matchesDate = true;
        if (startDate || endDate) {
            const itemDate = new Date(p.created_at).getTime();
            const start = startDate ? new Date(startDate).getTime() : 0;
            // End date should be end of day (23:59:59)
            const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;

            matchesDate = itemDate >= start && itemDate <= end;
        }

        return matchesSearch && matchesUser && matchesDate;
    });

    const downloadCSV = () => {
        if (filteredPipelines.length === 0) return alert('Tidak ada data untuk diexport');

        const headers = ['Judul Deal', 'Client', 'Perusahaan', 'Nilai (Rp)', 'Status', 'Sumber', 'Survey', 'Booking', 'Akad', 'Created At'];
        const rows = filteredPipelines.map(p => [
            `"${p.title}"`,
            `"${p.contact_name}"`,
            `"${p.company || '-'}"`,
            p.value,
            p.stage,
            `"${p.source || '-'}"`,
            p.survey_date ? p.survey_date.split('T')[0] : '-',
            p.booking_date ? p.booking_date.split('T')[0] : '-',
            p.akad_date ? p.akad_date.split('T')[0] : '-',
            p.created_at.split('T')[0]
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `marketing_deals_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <ModuleLayout
            moduleId="marketing"
            title="Marketing Pipeline"
            navItems={[
                { label: 'Pipeline', href: '/marketing', icon: Trello }
            ]}
        >
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deals</div>
                            <Trello className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{filteredPipelines.length}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            {filteredPipelines.filter(p => p.stage === 'lead').length} Lead Baru
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Potensi Omzet</div>
                            <DollarSign className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, notation: 'compact' }).format(
                                filteredPipelines.reduce((sum, p) => sum + (p.stage !== 'lost' ? p.value : 0), 0)
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">exclude Lost deals</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue (Won)</div>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, notation: 'compact' }).format(
                                filteredPipelines.filter(p => p.stage === 'won').reduce((sum, p) => sum + p.value, 0)
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Rate</div>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                            {filteredPipelines.length > 0
                                ? Math.round((filteredPipelines.filter(p => p.stage === 'won').length / filteredPipelines.length) * 100)
                                : 0}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Header Actions - Modern Toolbar */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    {/* Left: Search & Date */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full md:w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cari deal, client, atau perusahaan..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="date"
                                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-[140px] transition-all"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <span className="text-slate-400 font-medium">-</span>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="date"
                                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-[140px] transition-all"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Filters, Export, Add */}
                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                        {filteredPipelines.length > 0 && (
                            <Button variant="outline" size="icon" onClick={downloadCSV} title="Export to CSV" className="border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                <Download className="w-4 h-4" />
                            </Button>
                        )}

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        {/* Admin Filter: Salesperson */}
                        {['admin', 'manager'].includes(user?.role || '') && (
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Semua Sales" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Sales</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setViewMode('board')}
                                title="Board View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setViewMode('list')}
                                title="Table View"
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>

                        <Button onClick={() => { resetForm(); setEditingItem(null); setIsAddOpen(true); }} className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            Deal Baru
                        </Button>
                    </div>
                </div>
            </div>

            {/* View Content */}
            {viewMode === 'board' ? (
                /* Kanban Board Modern */
                <div className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-280px)] px-2">
                    {STAGES.map(stage => {
                        const items = filteredPipelines.filter(p => p.stage === stage.id);
                        const totalValue = items.reduce((sum, item) => sum + item.value, 0);

                        return (
                            <div key={stage.id} className="min-w-[320px] w-[320px] flex flex-col h-full">
                                {/* Column Header */}
                                <div className={`flex items-center justify-between p-3 mb-3 bg-white rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10 border-l-4 ${stage.color.replace('bg-', 'border-').split(' ')[0]
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-tight">{stage.label}</h3>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono text-[10px] h-5 min-w-[20px] justify-center">{items.length}</Badge>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-500">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(totalValue)}
                                    </div>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 space-y-3 pb-4">
                                    {items.map(item => (
                                        <div key={item.id} className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-200 transition-all duration-300 relative">

                                            {/* Top Actions (Hidden by default, shown on hover) */}
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100"><MoreVertical className="w-3.5 h-3.5 text-slate-500" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onClick={() => openEdit(item)}>
                                                            <FileText className="w-3.5 h-3.5 mr-2" /> Detail / Edit
                                                        </DropdownMenuItem>
                                                        {STAGES.map(s => (
                                                            s.id !== item.stage && (
                                                                <DropdownMenuItem key={s.id} onClick={() => handleMoveStage(item.id, s.id)}>
                                                                    Move to {s.label}
                                                                </DropdownMenuItem>
                                                            )
                                                        ))}
                                                        <div className="border-t my-1" />
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(item.id)}>
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Card Content */}
                                            <div onClick={() => openEdit(item)} className="cursor-pointer">
                                                {/* Title & Company */}
                                                <div className="pr-6 mb-3">
                                                    <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-1">{item.title}</h4>
                                                    {item.company && (
                                                        <div className="flex items-center text-xs text-slate-500 font-medium">
                                                            <Building className="w-3 h-3 mr-1.5 opacity-70" />
                                                            {item.company}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Source Badge */}
                                                {item.source && (
                                                    <Badge variant="outline" className="mb-3 text-[10px] font-normal py-0 px-2 h-5 bg-slate-50 border-slate-200 text-slate-500">
                                                        {item.source}
                                                    </Badge>
                                                )}

                                                {/* Value & Contact */}
                                                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nilai Deal</span>
                                                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">
                                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, notation: 'compact' }).format(item.value)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-slate-600 border-t border-slate-100 pt-2">
                                                        <User className="w-3 h-3 mr-1.5 text-slate-400" />
                                                        <span className="truncate">{item.contact_name}</span>
                                                    </div>
                                                </div>

                                                {/* Progress/Approval Footer (for WON stage) */}
                                                {item.stage === 'won' && (
                                                    <div className="mt-3 pt-2">
                                                        {(!item.approval_status || item.approval_status === 'draft') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full text-xs h-7 bg-white hover:bg-blue-50 text-blue-600 border-dashed border-blue-200 shadow-sm"
                                                                onClick={(e) => { e.stopPropagation(); handleRequestApproval(item.id); }}
                                                            >
                                                                <Send className="w-3 h-3 mr-1.5" />
                                                                Kirim Approval
                                                            </Button>
                                                        )}

                                                        {item.approval_status === 'pending' && (
                                                            <div className="flex items-center gap-2 justify-between bg-yellow-50 p-2 rounded border border-yellow-100">
                                                                <span className="text-[10px] font-medium text-yellow-700 flex items-center">
                                                                    <Activity className="w-3 h-3 mr-1" /> Menunggu
                                                                </span>

                                                                {['admin', 'manager'].includes(user?.role || '') && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-6 text-[10px] px-2 bg-yellow-600 hover:bg-yellow-700"
                                                                        onClick={(e) => { e.stopPropagation(); handleApproveDeal(item.id); }}
                                                                    >
                                                                        Setujui
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {item.approval_status === 'approved' && (
                                                            <div className="w-full bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5 flex items-center justify-center text-xs text-emerald-700 font-bold shadow-sm">
                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                                Fee Disetujui
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {items.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                                            <div className="bg-slate-50 p-3 rounded-full mb-2">
                                                <Trello className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium text-center">Kosong</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table View (Grid) */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Rencana Penjualan</th>
                                    <th className="px-6 py-4">Asal Konsumen</th>
                                    <th className="px-6 py-4">Data Konsumen</th>
                                    <th className="px-6 py-4">Survey / Waktu</th>
                                    <th className="px-6 py-4">Booking</th>
                                    <th className="px-6 py-4">Akad</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPipelines.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                            Tidak ada data ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPipelines.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-slate-900">{item.title}</span>
                                                    <div className="text-emerald-600 font-medium text-xs">
                                                        {formatCurrency(item.value)}
                                                    </div>
                                                    <Badge className={`w-fit mt-1 ${STAGES.find(s => s.id === item.stage)?.color}`}>
                                                        {STAGES.find(s => s.id === item.stage)?.label}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {item.source ? (
                                                    <Badge variant="outline" className="font-normal text-slate-600">
                                                        {item.source}
                                                    </Badge>
                                                ) : <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 align-top">
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
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {item.survey_date ? (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {format(new Date(item.survey_date), 'dd MMM yyyy', { locale: id })}
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
                                                ) : <span className="text-slate-400 text-xs">-</span>}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="space-y-1">
                                                    {item.booking_date ? (
                                                        <div className="flex items-center gap-1.5 text-slate-700">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {format(new Date(item.booking_date), 'dd MMM yyyy', { locale: id })}
                                                        </div>
                                                    ) : <span className="text-slate-400 text-xs">-</span>}
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
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="space-y-2">
                                                    {item.akad_date ? (
                                                        <div className="flex items-center gap-1.5 font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100 w-fit">
                                                            <FileText className="h-3.5 w-3.5" />
                                                            {format(new Date(item.akad_date), 'dd MMM yyyy', { locale: id })}
                                                        </div>
                                                    ) : <span className="text-slate-400 text-xs">Belum dijadwalkan</span>}

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

                                                {/* Approval UI included in Action or separate? Keeping simple for now */}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEdit(item)}>Edit Detail</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item.id)}>Hapus</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Deal' : 'Buat Deal Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Section 1: Data Utama */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Deal / Proyek</Label>
                                <Input required placeholder="Ex: Rumdis Type 36" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
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
                                        <SelectValue placeholder="Pilih Source" />
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
                                    <Label className="flex items-center gap-2 text-xs text-slate-500"><Upload className="w-3 h-3" /> Bukti Survey</Label>
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
                                    <Label className="flex items-center gap-2 text-xs text-slate-500"><Upload className="w-3 h-3" /> Bukti Booking</Label>
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
                                    <Label className="flex items-center gap-2 text-xs text-slate-500"><Upload className="w-3 h-3" /> Bukti Akad</Label>
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
                            <Input placeholder="Keterangan lain..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        </div>

                        {/* Image Upload for Thumbnail (New) */}
                        <div className="space-y-2">
                            <Label>Upload Foto/Dokumen (Thumbnail)</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    className="cursor-pointer bg-white"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'attachment_url')}
                                    disabled={uploading}
                                />
                                {uploading && <div className="text-xs text-slate-500">Uploading...</div>}
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
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section 5: Attachments (Only when editing existing deal) */}
                        {editingItem && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <Label className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Dokumen & Lampiran
                                </Label>

                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    {/* List */}
                                    <div className="space-y-2 mb-4">
                                        {attachments.map(file => (
                                            <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 text-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    <a href={getPublicUrl(file.file_path)} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:underline">
                                                        {file.file_name}
                                                    </a>
                                                    <span className="text-xs text-slate-400">({Math.round(file.file_size / 1024)} KB)</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDeleteAttachment(file.id, file.file_path)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        {attachments.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada file.</p>}
                                    </div>

                                    {/* Upload */}
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={uploading}
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                        >
                                            <Upload className="w-3 h-3 mr-2" />
                                            {uploading ? 'Uploading...' : 'Upload File'}
                                        </Button>
                                        <span className="text-xs text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
                                    </div>
                                </div>
                            </div>

                        )}

                        {/* Section 6: Activity Logs */}
                        {editingItem && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <Label className="flex items-center gap-2">
                                    <History className="w-4 h-4" /> Riwayat Aktivitas
                                </Label>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 h-40 overflow-y-auto space-y-3">
                                    {logs.map(log => (
                                        <div key={log.id} className="flex gap-3 text-sm">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                            </div>
                                            <div>
                                                <p className="text-slate-700 font-medium">{log.details}</p>
                                                <p className="text-xs text-slate-400">
                                                    {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: id })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {logs.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada aktivitas tercatat.</p>}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto px-8">Simpan Data</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Data deal ini akan dihapus permanen dari database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Hapus Permanen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </ModuleLayout >
    );
}
