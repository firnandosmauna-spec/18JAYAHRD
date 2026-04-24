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
    MoreHorizontal,
    Edit2,
    CheckCircle,
    User,
    Building,
    Calendar,
    ArrowUpRight
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface RetentionFund {
    id: string;
    consumer_id: string;
    housing_project: string;
    amount: number;
    status: 'pending' | 'claimed';
    claim_date?: string;
    notes?: string;
    created_at: string;
    consumer_profiles?: {
        name: string;
        code: string;
    };
}

export default function RetentionFundView() {
    const [funds, setFunds] = useState<RetentionFund[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const { toast } = useToast();

    // Edit Dialog State
    const [editingFund, setEditingFund] = useState<RetentionFund | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        amount: 0,
        notes: '',
        status: 'pending' as 'pending' | 'claimed',
        claim_date: ''
    });

    const [projectList, setProjectList] = useState<string[]>([]);

    const fetchFunds = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('retention_funds')
                .select('*, consumer_profiles(name, code)')
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setFunds(data || []);

            // Extract unique projects for filter
            const projects = Array.from(new Set((data || []).map(f => f.housing_project))).filter(Boolean);
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

    useEffect(() => {
        fetchFunds();
    }, []);

    const handleUpdateFund = async () => {
        if (!editingFund) return;

        try {
            const { error } = await supabase
                .from('retention_funds')
                .update({
                    amount: editForm.amount,
                    notes: editForm.notes,
                    status: editForm.status,
                    claim_date: editForm.status === 'claimed' ? (editForm.claim_date || new Date().toISOString()) : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingFund.id);

            if (error) throw error;

            toast({
                title: "Berhasil",
                description: "Data dana retensi diperbarui.",
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const filteredFunds = funds.filter(f => {
        const matchesSearch = 
            f.consumer_profiles?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.consumer_profiles?.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesProject = projectFilter === 'all' || f.housing_project === projectFilter;
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        return matchesSearch && matchesProject && matchesStatus;
    });

    const totalRetention = filteredFunds.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const claimedRetention = filteredFunds.filter(f => f.status === 'claimed').reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const pendingRetention = totalRetention - claimedRetention;

    return (
        <div className="space-y-6">
            {/* Header Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Total Dana Retensi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalRetention)}</div>
                        <p className="text-xs text-blue-500 mt-1">Total dari {filteredFunds.length} konsumen</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Sudah Diklaim
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">{formatCurrency(claimedRetention)}</div>
                        <p className="text-xs text-emerald-500 mt-1">{filteredFunds.filter(f => f.status === 'claimed').length} Record</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Belum Diklaim (Pending)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">{formatCurrency(pendingRetention)}</div>
                        <p className="text-xs text-amber-500 mt-1">{filteredFunds.filter(f => f.status === 'pending').length} Record</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full lg:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cari nama atau kode konsumen..."
                        className="pl-9"
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
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="claimed">Claimed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchFunds}>
                        <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Konsumen</TableHead>
                            <TableHead>Proyek</TableHead>
                            <TableHead>Dana Retensi</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tanggal Akad</TableHead>
                            <TableHead>Tgl Klaim</TableHead>
                            <TableHead>Aksi</TableHead>
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
                        ) : filteredFunds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                    Tidak ada data dana retensi ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredFunds.map((fund) => (
                                <TableRow key={fund.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">{fund.consumer_profiles?.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{fund.consumer_profiles?.code}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                            <Building className="w-3 h-3 mr-1" /> {fund.housing_project || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-900">{formatCurrency(fund.amount || 0)}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            className={cn(
                                                "font-medium",
                                                fund.status === 'claimed' 
                                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                                                    : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                            )}
                                        >
                                            {fund.status === 'claimed' ? 'Claimed' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(fund.created_at), 'dd/MM/yyyy', { locale: id })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {fund.claim_date ? (
                                            <div className="flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                {format(new Date(fund.claim_date), 'dd/MM/yyyy', { locale: id })}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="hover:bg-blue-50 text-blue-600"
                                            onClick={() => {
                                                setEditingFund(fund);
                                                setEditForm({
                                                    amount: fund.amount || 0,
                                                    notes: fund.notes || '',
                                                    status: fund.status,
                                                    claim_date: fund.claim_date ? fund.claim_date.split('T')[0] : ''
                                                });
                                                setIsEditDialogOpen(true);
                                            }}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Dana Retensi</DialogTitle>
                        <DialogDescription>
                            Input nominal dana retensi dan status klaim untuk konsumen ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Nominal Dana Retensi (Rp)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status Klaim</Label>
                            <Select 
                                value={editForm.status} 
                                onValueChange={(val: 'pending' | 'claimed') => setEditForm({ ...editForm, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="claimed">Sudah Diklaim</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {editForm.status === 'claimed' && (
                            <div className="space-y-2">
                                <Label htmlFor="claim_date">Tanggal Klaim</Label>
                                <Input
                                    id="claim_date"
                                    type="date"
                                    value={editForm.claim_date}
                                    onChange={(e) => setEditForm({ ...editForm, claim_date: e.target.value })}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Catatan / Keterangan</Label>
                            <Input
                                id="notes"
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Contoh: Klaim retensi 5% dari dev"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleUpdateFund}>Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
