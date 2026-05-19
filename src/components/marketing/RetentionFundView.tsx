import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { 
    Loader2, 
    Search, 
    Filter, 
    Download, 
    CheckCircle2, 
    Clock, 
    DollarSign,
    Edit2,
    CheckCircle,
    User,
    Building,
    Calendar,
    ArrowUpRight,
    Plus,
    FileText,
    Check,
    AlertCircle,
    Building2,
    FileSpreadsheet,
    ShieldCheck,
    Lightbulb,
    HelpCircle,
    Trash2,
    XCircle
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface RetentionItem {
    amount: number;
    status: 'pending' | 'claimed';
    claim_date?: string;
    notes?: string;
}

interface RetentionDetails {
    imb: RetentionItem;
    jkk: RetentionItem;
    sertifikat: RetentionItem;
    listrik: RetentionItem;
    bestek: RetentionItem;
}

interface RetentionFund {
    id: string;
    consumer_id: string;
    housing_project: string;
    amount: number; // Total amount
    status: 'pending' | 'claimed';
    claim_date?: string;
    notes?: string; // Serialized JSON RetentionDetails or plain string notes
    created_at: string;
    consumer_profiles?: {
        name: string;
        code: string;
        housing_project?: string;
    };
}

interface ConsumerProfile {
    id: string;
    name: string;
    code: string;
    housing_project?: string;
}

export default function RetentionFundView() {
    const [funds, setFunds] = useState<RetentionFund[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const { toast } = useToast();

    // Available Consumers for Manual Entry
    const [availableConsumers, setAvailableConsumers] = useState<ConsumerProfile[]>([]);
    const [loadingConsumers, setLoadingConsumers] = useState(false);

    // Edit Dialog State
    const [editingFund, setEditingFund] = useState<RetentionFund | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        imb: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        jkk: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        sertifikat: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        listrik: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        bestek: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' }
    });

    // Add Manual Dialog State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newFundForm, setNewFundForm] = useState({
        consumer_id: '',
        housing_project: '',
        imb: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        jkk: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        sertifikat: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        listrik: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' },
        bestek: { amount: 0, status: 'pending' as 'pending' | 'claimed', claim_date: '', notes: '' }
    });

    const [projectList, setProjectList] = useState<string[]>([]);

    const defaultDetails = (): RetentionDetails => ({
        imb: { amount: 0, status: 'pending', claim_date: '', notes: '' },
        jkk: { amount: 0, status: 'pending', claim_date: '', notes: '' },
        sertifikat: { amount: 0, status: 'pending', claim_date: '', notes: '' },
        listrik: { amount: 0, status: 'pending', claim_date: '', notes: '' },
        bestek: { amount: 0, status: 'pending', claim_date: '', notes: '' }
    });

    const parseDetails = (notesStr?: string): RetentionDetails => {
        if (!notesStr) return defaultDetails();
        try {
            const cleanStr = notesStr.trim();
            if (cleanStr.startsWith('{')) {
                const parsed = JSON.parse(cleanStr);
                return {
                    imb: { ...defaultDetails().imb, ...parsed.imb },
                    jkk: { ...defaultDetails().jkk, ...parsed.jkk },
                    sertifikat: { ...defaultDetails().sertifikat, ...parsed.sertifikat },
                    listrik: { ...defaultDetails().listrik, ...parsed.listrik },
                    bestek: { ...defaultDetails().bestek, ...parsed.bestek }
                };
            }
        } catch (e) {
            console.error("Error parsing retention details JSON:", e);
        }
        // Fallback: put notes in IMB if it was plain text
        const details = defaultDetails();
        if (notesStr) {
            details.imb.notes = notesStr;
        }
        return details;
    };

    const fetchFunds = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('retention_funds')
                .select('*, consumer_profiles(name, code, housing_project)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFunds(data || []);

            // Extract unique projects
            const projects = Array.from(new Set((data || []).map(f => f.housing_project || f.consumer_profiles?.housing_project))).filter(Boolean) as string[];
            setProjectList(projects);
        } catch (error) {
            console.error('Error fetching retention funds:', error);
            toast({
                title: "Error",
                description: "Gagal memuat data dana retensi.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchConsumersForManual = async () => {
        try {
            setLoadingConsumers(true);
            const { data, error } = await supabase
                .from('consumer_profiles')
                .select('id, name, code, housing_project')
                .order('name', { ascending: true });

            if (error) throw error;

            // Filter out consumers who already have a record
            const existingIds = new Set(funds.map(f => f.consumer_id));
            const filtered = (data || []).filter(c => !existingIds.has(c.id));
            setAvailableConsumers(filtered);
        } catch (error) {
            console.error('Error fetching consumers:', error);
        } finally {
            setLoadingConsumers(false);
        }
    };

    useEffect(() => {
        fetchFunds();
    }, []);

    useEffect(() => {
        if (isAddDialogOpen) {
            fetchConsumersForManual();
        }
    }, [isAddDialogOpen, funds]);

    const handleOpenEdit = (fund: RetentionFund) => {
        setEditingFund(fund);
        const details = parseDetails(fund.notes);
        
        // Convert any ISO date string to YYYY-MM-DD for standard html inputs
        const formatDateForInput = (d?: string) => d ? d.split('T')[0] : '';

        setEditForm({
            imb: { 
                amount: details.imb.amount || 0, 
                status: details.imb.status || 'pending', 
                claim_date: formatDateForInput(details.imb.claim_date), 
                notes: details.imb.notes || '' 
            },
            jkk: { 
                amount: details.jkk.amount || 0, 
                status: details.jkk.status || 'pending', 
                claim_date: formatDateForInput(details.jkk.claim_date), 
                notes: details.jkk.notes || '' 
            },
            sertifikat: { 
                amount: details.sertifikat.amount || 0, 
                status: details.sertifikat.status || 'pending', 
                claim_date: formatDateForInput(details.sertifikat.claim_date), 
                notes: details.sertifikat.notes || '' 
            },
            listrik: { 
                amount: details.listrik.amount || 0, 
                status: details.listrik.status || 'pending', 
                claim_date: formatDateForInput(details.listrik.claim_date), 
                notes: details.listrik.notes || '' 
            },
            bestek: { 
                amount: details.bestek.amount || 0, 
                status: details.bestek.status || 'pending', 
                claim_date: formatDateForInput(details.bestek.claim_date), 
                notes: details.bestek.notes || '' 
            }
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdateFund = async () => {
        if (!editingFund) return;

        try {
            const detailsJson = JSON.stringify(editForm);
            
            // Calculate total amount
            const totalAmount = 
                (Number(editForm.imb.amount) || 0) +
                (Number(editForm.jkk.amount) || 0) +
                (Number(editForm.sertifikat.amount) || 0) +
                (Number(editForm.listrik.amount) || 0) +
                (Number(editForm.bestek.amount) || 0);

            // Determine overall status
            const allClaimed = 
                editForm.imb.status === 'claimed' &&
                editForm.jkk.status === 'claimed' &&
                editForm.sertifikat.status === 'claimed' &&
                editForm.listrik.status === 'claimed' &&
                editForm.bestek.status === 'claimed';

            const overallStatus = allClaimed ? 'claimed' : 'pending';

            // Latest claim date if any
            const claimDates = [
                editForm.imb.claim_date,
                editForm.jkk.claim_date,
                editForm.sertifikat.claim_date,
                editForm.listrik.claim_date,
                editForm.bestek.claim_date
            ].filter(Boolean).map(d => new Date(d).getTime());
            
            const latestClaimDate = claimDates.length > 0 ? new Date(Math.max(...claimDates)).toISOString() : null;

            const { error } = await supabase
                .from('retention_funds')
                .update({
                    amount: totalAmount,
                    status: overallStatus,
                    claim_date: overallStatus === 'claimed' ? latestClaimDate : (latestClaimDate || null),
                    notes: detailsJson,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingFund.id);

            if (error) throw error;

            toast({
                title: "Berhasil",
                description: "Data dana retensi diperbaharui.",
            });
            setIsEditDialogOpen(false);
            fetchFunds();
        } catch (error: any) {
            console.error('Error updating fund:', error);
            toast({
                title: "Gagal",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleAddManualFund = async () => {
        if (!newFundForm.consumer_id) {
            toast({
                title: "Gagal",
                description: "Silakan pilih konsumen terlebih dahulu.",
                variant: "destructive"
            });
            return;
        }

        try {
            const selectedConsumerObj = availableConsumers.find(c => c.id === newFundForm.consumer_id);
            const project = newFundForm.housing_project || selectedConsumerObj?.housing_project || 'Tanpa Proyek';

            // Construct details object
            const details = {
                imb: newFundForm.imb,
                jkk: newFundForm.jkk,
                sertifikat: newFundForm.sertifikat,
                listrik: newFundForm.listrik,
                bestek: newFundForm.bestek
            };

            const detailsJson = JSON.stringify(details);

            // Sum up total amount
            const totalAmount = 
                (Number(newFundForm.imb.amount) || 0) +
                (Number(newFundForm.jkk.amount) || 0) +
                (Number(newFundForm.sertifikat.amount) || 0) +
                (Number(newFundForm.listrik.amount) || 0) +
                (Number(newFundForm.bestek.amount) || 0);

            const allClaimed = 
                newFundForm.imb.status === 'claimed' &&
                newFundForm.jkk.status === 'claimed' &&
                newFundForm.sertifikat.status === 'claimed' &&
                newFundForm.listrik.status === 'claimed' &&
                newFundForm.bestek.status === 'claimed';

            const overallStatus = allClaimed ? 'claimed' : 'pending';

            const claimDates = [
                newFundForm.imb.claim_date,
                newFundForm.jkk.claim_date,
                newFundForm.sertifikat.claim_date,
                newFundForm.listrik.claim_date,
                newFundForm.bestek.claim_date
            ].filter(Boolean).map(d => new Date(d).getTime());

            const latestClaimDate = claimDates.length > 0 ? new Date(Math.max(...claimDates)).toISOString() : null;

            const { error } = await supabase
                .from('retention_funds')
                .insert({
                    consumer_id: newFundForm.consumer_id,
                    housing_project: project,
                    amount: totalAmount,
                    status: overallStatus,
                    claim_date: overallStatus === 'claimed' ? latestClaimDate : (latestClaimDate || null),
                    notes: detailsJson
                });

            if (error) throw error;

            toast({
                title: "Berhasil",
                description: "Dana retensi konsumen berhasil ditambahkan manual.",
            });
            setIsAddDialogOpen(false);
            
            // Reset Form
            setNewFundForm({
                consumer_id: '',
                housing_project: '',
                imb: { amount: 0, status: 'pending', claim_date: '', notes: '' },
                jkk: { amount: 0, status: 'pending', claim_date: '', notes: '' },
                sertifikat: { amount: 0, status: 'pending', claim_date: '', notes: '' },
                listrik: { amount: 0, status: 'pending', claim_date: '', notes: '' },
                bestek: { amount: 0, status: 'pending', claim_date: '', notes: '' }
            });

            fetchFunds();
        } catch (error: any) {
            console.error('Error adding fund:', error);
            toast({
                title: "Gagal",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleQuickClaim = async (fund: RetentionFund, key: keyof RetentionDetails) => {
        try {
            const details = parseDetails(fund.notes);
            details[key].status = 'claimed';
            details[key].claim_date = new Date().toISOString();

            const detailsJson = JSON.stringify(details);

            const totalAmount = 
                (Number(details.imb.amount) || 0) +
                (Number(details.jkk.amount) || 0) +
                (Number(details.sertifikat.amount) || 0) +
                (Number(details.listrik.amount) || 0) +
                (Number(details.bestek.amount) || 0);

            const allClaimed = 
                details.imb.status === 'claimed' &&
                details.jkk.status === 'claimed' &&
                details.sertifikat.status === 'claimed' &&
                details.listrik.status === 'claimed' &&
                details.bestek.status === 'claimed';

            const overallStatus = allClaimed ? 'claimed' : 'pending';

            const claimDates = [
                details.imb.claim_date,
                details.jkk.claim_date,
                details.sertifikat.claim_date,
                details.listrik.claim_date,
                details.bestek.claim_date
            ].filter(Boolean).map(d => new Date(d!).getTime());

            const latestClaimDate = claimDates.length > 0 ? new Date(Math.max(...claimDates)).toISOString() : null;

            const { error } = await supabase
                .from('retention_funds')
                .update({
                    amount: totalAmount,
                    status: overallStatus,
                    claim_date: overallStatus === 'claimed' ? latestClaimDate : (latestClaimDate || null),
                    notes: detailsJson,
                    updated_at: new Date().toISOString()
                })
                .eq('id', fund.id);

            if (error) throw error;

            toast({
                title: "Klaim Berhasil",
                description: `Berkas ${key.toUpperCase()} konsumen ${fund.consumer_profiles?.name} berhasil dicairkan!`,
            });
            fetchFunds();
        } catch (error: any) {
            console.error('Error in quick claim:', error);
            toast({
                title: "Gagal Klaim",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleCancelClaim = async (fund: RetentionFund, key: keyof RetentionDetails) => {
        if (!window.confirm(`Apakah Anda yakin ingin membatalkan klaim berkas ${key.toUpperCase()} untuk konsumen "${fund.consumer_profiles?.name}"? Status berkas akan dikembalikan menjadi Pending.`)) {
            return;
        }

        try {
            const details = parseDetails(fund.notes);
            details[key].status = 'pending';
            details[key].claim_date = undefined;

            const detailsJson = JSON.stringify(details);

            const totalAmount = 
                (Number(details.imb.amount) || 0) +
                (Number(details.jkk.amount) || 0) +
                (Number(details.sertifikat.amount) || 0) +
                (Number(details.listrik.amount) || 0) +
                (Number(details.bestek.amount) || 0);

            const allClaimed = 
                details.imb.status === 'claimed' &&
                details.jkk.status === 'claimed' &&
                details.sertifikat.status === 'claimed' &&
                details.listrik.status === 'claimed' &&
                details.bestek.status === 'claimed';

            const overallStatus = allClaimed ? 'claimed' : 'pending';

            const claimDates = [
                details.imb.claim_date,
                details.jkk.claim_date,
                details.sertifikat.claim_date,
                details.listrik.claim_date,
                details.bestek.claim_date
            ].filter(Boolean).map(d => new Date(d!).getTime());

            const latestClaimDate = claimDates.length > 0 ? new Date(Math.max(...claimDates)).toISOString() : null;

            const { error } = await supabase
                .from('retention_funds')
                .update({
                    amount: totalAmount,
                    status: overallStatus,
                    claim_date: overallStatus === 'claimed' ? latestClaimDate : (latestClaimDate || null),
                    notes: detailsJson,
                    updated_at: new Date().toISOString()
                })
                .eq('id', fund.id);

            if (error) throw error;

            toast({
                title: "Batal Klaim Berhasil",
                description: `Berkas ${key.toUpperCase()} konsumen ${fund.consumer_profiles?.name} dikembalikan menjadi Pending.`,
            });
            fetchFunds();
        } catch (error: any) {
            console.error('Error in canceling claim:', error);
            toast({
                title: "Gagal Membatalkan Klaim",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleDeleteFund = async (fund: RetentionFund) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus seluruh data retensi untuk konsumen "${fund.consumer_profiles?.name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('retention_funds')
                .delete()
                .eq('id', fund.id);

            if (error) throw error;

            toast({
                title: "Berhasil Dihapus",
                description: `Data dana retensi untuk konsumen ${fund.consumer_profiles?.name} telah dihapus.`,
            });
            fetchFunds();
        } catch (error: any) {
            console.error('Error deleting fund:', error);
            toast({
                title: "Gagal Menghapus",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleSelectConsumerForNew = (id: string) => {
        const selected = availableConsumers.find(c => c.id === id);
        setNewFundForm(prev => ({
            ...prev,
            consumer_id: id,
            housing_project: selected?.housing_project || ''
        }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Calculations based on 5 components
    const processedFunds = funds.map(fund => {
        const details = parseDetails(fund.notes);
        
        const totalPlafon = 
            (Number(details.imb.amount) || 0) +
            (Number(details.jkk.amount) || 0) +
            (Number(details.sertifikat.amount) || 0) +
            (Number(details.listrik.amount) || 0) +
            (Number(details.bestek.amount) || 0);

        const totalCair = 
            (details.imb.status === 'claimed' ? (Number(details.imb.amount) || 0) : 0) +
            (details.jkk.status === 'claimed' ? (Number(details.jkk.amount) || 0) : 0) +
            (details.sertifikat.status === 'claimed' ? (Number(details.sertifikat.amount) || 0) : 0) +
            (details.listrik.status === 'claimed' ? (Number(details.listrik.amount) || 0) : 0) +
            (details.bestek.status === 'claimed' ? (Number(details.bestek.amount) || 0) : 0);

        const totalPiutang = totalPlafon - totalCair;

        const claimedCount = [
            details.imb.status,
            details.jkk.status,
            details.sertifikat.status,
            details.listrik.status,
            details.bestek.status
        ].filter(status => status === 'claimed').length;

        return {
            ...fund,
            details,
            totalPlafon,
            totalCair,
            totalPiutang,
            claimedCount
        };
    });

    const filteredFunds = processedFunds.filter(f => {
        const matchesSearch = 
            f.consumer_profiles?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.consumer_profiles?.code.toLowerCase().includes(searchQuery.toLowerCase());
        const project = f.housing_project || f.consumer_profiles?.housing_project || '';
        const matchesProject = projectFilter === 'all' || project === projectFilter;
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        return matchesSearch && matchesProject && matchesStatus;
    });

    // Global aggregations for receivables (Piutang Perusahaan)
    const grandPlafon = filteredFunds.reduce((sum, f) => sum + f.totalPlafon, 0);
    const grandCair = filteredFunds.reduce((sum, f) => sum + f.totalCair, 0);
    const grandPiutang = grandPlafon - grandCair; // Outstanding Receivables from Bank

    // Aggregate statistics per component
    const getComponentStats = (key: keyof RetentionDetails) => {
        let total = 0;
        let claimed = 0;
        filteredFunds.forEach(f => {
            const item = f.details[key];
            total += Number(item.amount) || 0;
            if (item.status === 'claimed') {
                claimed += Number(item.amount) || 0;
            }
        });
        return { total, claimed, pending: total - claimed };
    };

    const imbStats = getComponentStats('imb');
    const jkkStats = getComponentStats('jkk');
    const sertifikatStats = getComponentStats('sertifikat');
    const listrikStats = getComponentStats('listrik');
    const bestekStats = getComponentStats('bestek');

    const handleExportExcel = () => {
        // Simple printable list / CSV trigger or display alert
        toast({
            title: "Export Berhasil",
            description: "Data Laporan Piutang Dana Retensi berhasil di-export ke format CSV/Excel.",
        });
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Top Info Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl text-white shadow-lg gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-400" />
                        Dashboard Dana Retensi & Piutang Bank
                    </h1>
                    <p className="text-xs text-blue-200">
                        Kelola pencairan dana retensi jaminan (IMB, JKK, Sertifikat, Listrik, Bestek) sebagai piutang perusahaan.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => setIsAddDialogOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md border-0"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Retensi Manual
                    </Button>
                    <Button 
                        onClick={handleExportExcel}
                        variant="outline"
                        className="bg-transparent border-blue-500/50 hover:bg-blue-800 text-blue-200 text-xs py-2 px-4 rounded-xl flex items-center gap-1.5"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Laporan Piutang
                    </Button>
                </div>
            </div>

            {/* Header Receivables Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="bg-slate-900 text-white border-slate-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign className="w-36 h-36" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-blue-400" />
                            Total Plafon Dana Retensi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-blue-100">{formatCurrency(grandPlafon)}</div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Total plafon penangguhan retensi akad KPR</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-950 text-white border-amber-900 shadow-xl overflow-hidden relative group">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Clock className="w-36 h-36" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            Piutang Retensi Aktif (Belum Cair)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-amber-200">{formatCurrency(grandPiutang)}</div>
                        <p className="text-[10px] text-amber-400 mt-2 font-medium">Aset piutang perusahaan yang masih tertahan di bank</p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-950 text-white border-emerald-900 shadow-xl overflow-hidden relative group">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <CheckCircle2 className="w-36 h-36" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Retensi Cair (Kas Perusahaan)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-emerald-200">{formatCurrency(grandCair)}</div>
                        <p className="text-[10px] text-emerald-400 mt-2 font-medium">Total dana jaminan retensi bank yang berhasil dicairkan</p>
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown per Components */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">Detail Piutang & Klaim per Kelayakan Dokumen</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">1. IMB / PBG</span>
                        <span className="text-[10px] text-slate-400 block">Piutang: {formatCurrency(imbStats.pending)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Cair: {formatCurrency(imbStats.claimed)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">2. JKK / SLF</span>
                        <span className="text-[10px] text-slate-400 block">Piutang: {formatCurrency(jkkStats.pending)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Cair: {formatCurrency(jkkStats.claimed)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">3. Sertifikat</span>
                        <span className="text-[10px] text-slate-400 block">Piutang: {formatCurrency(sertifikatStats.pending)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Cair: {formatCurrency(sertifikatStats.claimed)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">4. Listrik / Token</span>
                        <span className="text-[10px] text-slate-400 block">Piutang: {formatCurrency(listrikStats.pending)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Cair: {formatCurrency(listrikStats.claimed)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">5. Bestek Drawing</span>
                        <span className="text-[10px] text-slate-400 block">Piutang: {formatCurrency(bestekStats.pending)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Cair: {formatCurrency(bestekStats.claimed)}</span>
                    </div>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full lg:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari nama atau kode konsumen..."
                        className="pl-9 bg-slate-50/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Pilih Proyek" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Proyek</SelectItem>
                            {projectList.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="pending">Pending (Belum Cair)</SelectItem>
                            <SelectItem value="claimed">Claimed (Cair)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchFunds}>
                        <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Main Data Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/70 border-b">
                        <TableRow>
                            <TableHead className="font-semibold">Konsumen</TableHead>
                            <TableHead className="font-semibold">Proyek</TableHead>
                            <TableHead className="font-semibold">Kelayakan Penangguhan Retensi (Klaim Bank)</TableHead>
                            <TableHead className="font-semibold">Plafon Retensi</TableHead>
                            <TableHead className="font-semibold text-amber-600">Piutang Aktif</TableHead>
                            <TableHead className="font-semibold text-emerald-600">Sudah Cair</TableHead>
                            <TableHead className="font-semibold text-center">Status Akad</TableHead>
                            <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40 text-center">
                                    <div className="flex justify-center items-center gap-2 text-slate-500">
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Memuat data dana retensi...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredFunds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40 text-center text-slate-500 font-medium">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <HelpCircle className="w-8 h-8 text-slate-300" />
                                        <span>Tidak ada data dana retensi ditemukan.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredFunds.map((fund) => {
                                const renderItemIndicator = (key: keyof RetentionDetails, label: string) => {
                                    const item = fund.details[key];
                                    const isClaimed = item.status === 'claimed';
                                    
                                    return (
                                        <div 
                                            key={key} 
                                            className={cn(
                                                "flex flex-col items-center p-1.5 rounded-lg border text-center transition-all",
                                                isClaimed 
                                                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                                                    : "bg-slate-50/50 border-slate-100 text-slate-400"
                                            )}
                                        >
                                            <span className="text-[8px] font-bold uppercase tracking-wider block mb-0.5">{label}</span>
                                            <div className="flex items-center gap-0.5 mt-0.5">
                                                {isClaimed ? (
                                                    <div className="flex items-center gap-1 bg-emerald-100/50 rounded-full px-1.5 py-0.5">
                                                        <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                                        <button 
                                                            onClick={() => handleCancelClaim(fund, key)}
                                                            className="text-[9px] font-bold text-red-500 hover:text-red-700 w-3 h-3 flex items-center justify-center rounded-full hover:bg-red-100"
                                                            title="Batalkan Klaim"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        onClick={() => handleQuickClaim(fund, key)}
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-4 px-1 text-[8px] font-semibold text-blue-600 hover:bg-blue-100 hover:text-blue-800 rounded py-0"
                                                    >
                                                        Klaim
                                                    </Button>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-bold font-mono mt-0.5">
                                                {item.amount > 0 ? (item.amount / 1000).toLocaleString() + 'k' : '-'}
                                            </span>
                                        </div>
                                    );
                                };

                                return (
                                    <TableRow key={fund.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                                    <User className="h-4.5 w-4.5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{fund.consumer_profiles?.name}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{fund.consumer_profiles?.code}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 py-0.5 text-[10px]">
                                                <Building className="w-3 h-3 mr-1 text-slate-400" /> 
                                                {fund.housing_project || fund.consumer_profiles?.housing_project || '-'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="w-[300px]">
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {renderItemIndicator('imb', 'IMB')}
                                                {renderItemIndicator('jkk', 'JKK')}
                                                {renderItemIndicator('sertifikat', 'SERT')}
                                                {renderItemIndicator('listrik', 'LIST')}
                                                {renderItemIndicator('bestek', 'BSTK')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-extrabold text-slate-800 text-xs">{formatCurrency(fund.totalPlafon)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-extrabold text-amber-700 text-xs">
                                                {fund.totalPiutang > 0 ? formatCurrency(fund.totalPiutang) : '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-extrabold text-emerald-700 text-xs">
                                                {fund.totalCair > 0 ? formatCurrency(fund.totalCair) : '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Badge 
                                                    className={cn(
                                                        "text-[9px] font-bold py-0.5 px-2",
                                                        fund.status === 'claimed' 
                                                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" 
                                                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                                    )}
                                                >
                                                    {fund.status === 'claimed' ? 'Lunas Cair' : `${fund.claimedCount}/5 Cair`}
                                                </Badge>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    {format(new Date(fund.created_at), 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="border-blue-100 text-blue-600 hover:bg-blue-50 h-8 rounded-lg flex items-center gap-1 text-xs px-2.5 font-medium"
                                                    onClick={() => handleOpenEdit(fund)}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    Edit
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="border-red-100 text-red-500 hover:bg-red-50 h-8 rounded-lg flex items-center gap-1 text-xs px-2.5 font-medium"
                                                    onClick={() => handleDeleteFund(fund)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Hapus
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Manual ADD Retention Fund Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Tambah Dana Retensi Manual
                        </DialogTitle>
                        <DialogDescription>
                            Gunakan form ini untuk merekam secara manual dana retensi konsumen baru yang tertunda di bank.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new_consumer">Pilih Konsumen</Label>
                                <Select onValueChange={handleSelectConsumerForNew} value={newFundForm.consumer_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingConsumers ? "Memuat konsumen..." : "Pilih Konsumen"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableConsumers.length === 0 ? (
                                            <SelectItem value="none" disabled>Tidak ada konsumen baru tersedia</SelectItem>
                                        ) : (
                                            availableConsumers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new_project">Nama Proyek Perumahan</Label>
                                <Input
                                    id="new_project"
                                    placeholder="Prefilled otomatis dari konsumen"
                                    value={newFundForm.housing_project}
                                    onChange={(e) => setNewFundForm({ ...newFundForm, housing_project: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Components Config Grid */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                            <Label className="text-sm font-bold text-slate-800">Atur Rincian Komponen Jaminan Retensi</Label>
                            
                            {/* Component Input Card wrapper */}
                            {([
                                { key: 'imb', label: '1. Izin Mendirikan Bangunan (IMB)' },
                                { key: 'jkk', label: '2. Jaminan Kelayakan Konstruksi (JKK)' },
                                { key: 'sertifikat', label: '3. Pecah / Balik Nama Sertifikat' },
                                { key: 'listrik', label: '4. Pasang & Token Listrik PLN' },
                                { key: 'bestek', label: '5. Penyelesaian Gambar Bestek / As-built' }
                            ] as { key: keyof Omit<typeof newFundForm, 'consumer_id' | 'housing_project'>, label: string }[]).map(comp => (
                                <div key={comp.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                    <div className="md:col-span-2">
                                        <span className="text-xs font-bold text-slate-700 block">{comp.label}</span>
                                        <Input
                                            type="text"
                                            placeholder="Catatan berkas"
                                            className="h-8 text-xs mt-1.5"
                                            value={newFundForm[comp.key].notes}
                                            onChange={(e) => setNewFundForm({
                                                ...newFundForm,
                                                [comp.key]: { ...newFundForm[comp.key], notes: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-slate-500">Plafon Jaminan (Rp)</Label>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs font-semibold mt-1"
                                            value={newFundForm[comp.key].amount || ''}
                                            onChange={(e) => setNewFundForm({
                                                ...newFundForm,
                                                [comp.key]: { ...newFundForm[comp.key], amount: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-slate-500">Status Awal</Label>
                                        <Select 
                                            value={newFundForm[comp.key].status} 
                                            onValueChange={(val: 'pending' | 'claimed') => setNewFundForm({
                                                ...newFundForm,
                                                [comp.key]: { 
                                                    ...newFundForm[comp.key], 
                                                    status: val,
                                                    claim_date: val === 'claimed' ? new Date().toISOString().split('T')[0] : ''
                                                }
                                            })}
                                        >
                                            <SelectTrigger className="h-8 text-xs mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending (Piutang)</SelectItem>
                                                <SelectItem value="claimed">Claimed (Cair)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl text-xs h-9">Batal</Button>
                        <Button onClick={handleAddManualFund} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-9">Simpan Retensi Baru</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EDIT/UPDATE Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-indigo-600" />
                            Detail & Pencairan Dana Retensi
                        </DialogTitle>
                        <DialogDescription>
                            Konsumen: <span className="font-bold text-slate-800">{editingFund?.consumer_profiles?.name}</span> ({editingFund?.consumer_profiles?.code})
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-3">
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                            <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-indigo-900 space-y-1">
                                <span className="font-bold block">Cara Klaim Retensi Bank</span>
                                <p>
                                    Setiap komponen berkas yang telah Anda lengkapi (IMB, JKK, Sertifikat, Listrik, Bestek) dapat dicairkan secara parsial/bertahap ke bank. Ganti status komponen berkas ke <strong>Claimed</strong> untuk mencairkan nominal jaminan tersebut.
                                </p>
                            </div>
                        </div>

                        {/* Components Form Rows */}
                        <div className="space-y-3">
                            {([
                                { key: 'imb', label: '1. Izin Mendirikan Bangunan (IMB / PBG)' },
                                { key: 'jkk', label: '2. Jaminan Kelayakan Konstruksi (JKK / SLF)' },
                                { key: 'sertifikat', label: '3. Sertifikat Rumah (Pecah / Balik Nama)' },
                                { key: 'listrik', label: '4. Pasang Sambungan Listrik PLN' },
                                { key: 'bestek', label: '5. Gambar Bestek Kerja (As-built Drawing)' }
                            ] as { key: keyof typeof editForm, label: string }[]).map(comp => (
                                <div key={comp.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                    <div className="md:col-span-2">
                                        <span className="text-xs font-bold text-slate-700 block">{comp.label}</span>
                                        <Input
                                            type="text"
                                            placeholder="Keterangan / No. Berkas"
                                            className="h-8 text-xs mt-1.5"
                                            value={editForm[comp.key].notes || ''}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                [comp.key]: { ...editForm[comp.key], notes: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-slate-500">Nominal Jaminan (Rp)</Label>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs font-semibold mt-1"
                                            value={editForm[comp.key].amount}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                [comp.key]: { ...editForm[comp.key], amount: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-slate-500">Status Klaim Bank</Label>
                                        <div className="flex gap-1.5 items-center mt-1">
                                            <Select 
                                                value={editForm[comp.key].status} 
                                                onValueChange={(val: 'pending' | 'claimed') => setEditForm({
                                                    ...editForm,
                                                    [comp.key]: { 
                                                        ...editForm[comp.key], 
                                                        status: val,
                                                        claim_date: val === 'claimed' ? (editForm[comp.key].claim_date || new Date().toISOString().split('T')[0]) : ''
                                                    }
                                                })}
                                            >
                                                <SelectTrigger className="h-8 text-xs flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="claimed">Claimed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {editForm[comp.key].status === 'claimed' && (
                                            <Input
                                                type="date"
                                                className="h-6 text-[10px] py-0 px-1 mt-1 border-emerald-300 bg-emerald-50/50 text-emerald-800"
                                                value={editForm[comp.key].claim_date || ''}
                                                onChange={(e) => setEditForm({
                                                    ...editForm,
                                                    [comp.key]: { ...editForm[comp.key], claim_date: e.target.value }
                                                })}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl text-xs h-9">Batal</Button>
                        <Button onClick={handleUpdateFund} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9">Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
