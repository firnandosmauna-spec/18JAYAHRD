import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { HousingUnit, ConsumerProfile } from './MarketingTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useProjectLocations } from '@/hooks/useInventory';
import { Search, Plus, Loader2, Home, MapPin, CheckCircle2, XCircle, AlertCircle, Pencil, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HousingStockView() {
    const [units, setUnits] = useState<HousingUnit[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const { toast } = useToast();
    const { locations, projectNames } = useProjectLocations();

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Partial<HousingUnit> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkData, setBulkData] = useState({
        prefix: '',
        start: 1,
        end: 1
    });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Projects
            const { data: projectData } = await supabase
                .from('projects')
                .select('id, name')
                .order('name');
            setProjects(projectData || []);

            // Fetch Consumers (for mapping)
            const { data: consumerData } = await supabase
                .from('consumer_profiles')
                .select('id, name');
            setConsumers(consumerData || []);

            // Fetch Units
            const { data: unitData, error: unitError } = await supabase
                .from('housing_units')
                .select(`
                    *,
                    projects(name),
                    consumer_profiles(name)
                `)
                .order('block_number');

            if (unitError) throw unitError;

            const formattedUnits = (unitData || []).map(u => ({
                ...u,
                project_name: u.location_name || u.projects?.name,
                consumer_name: u.consumer_profiles?.name
            })).sort((a, b) => {
                // Sort by project/location name first
                const locCompare = (a.project_name || "").localeCompare(b.project_name || "");
                if (locCompare !== 0) return locCompare;
                
                // Then sort by block number naturally (A-1, A-2, A-10)
                return a.block_number.localeCompare(b.block_number, undefined, { 
                    numeric: true, 
                    sensitivity: 'base' 
                });
            });

            setUnits(formattedUnits);
        } catch (error: any) {
            console.error('Error fetching housing units:', error);
            toast({
                title: "Error",
                description: "Gagal memuat data stok rumah",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Find project ID if it's an actual project
            const { data: proj } = await supabase
                .from('projects')
                .select('id')
                .eq('name', editingUnit?.location_name)
                .single();

            const payload = {
                project_id: proj?.id || null,
                location_name: editingUnit?.location_name,
                block_number: editingUnit?.block_number,
                status: editingUnit?.status || 'available',
                construction_progress: editingUnit?.construction_progress || 0,
                notes: editingUnit?.notes,
                consumer_id: editingUnit?.consumer_id || null
            };

            if (editingUnit?.id) {
                const { error } = await supabase
                    .from('housing_units')
                    .update(payload)
                    .eq('id', editingUnit.id);
                if (error) throw error;
                toast({ title: "Berhasil", description: "Data unit berhasil diperbarui" });
            } else {
                if (isBulkMode) {
                    const unitsToInsert = [];
                    for (let i = bulkData.start; i <= bulkData.end; i++) {
                        unitsToInsert.push({
                            ...payload,
                            block_number: `${bulkData.prefix}${i}`
                        });
                    }

                    if (unitsToInsert.length === 0) {
                        throw new Error("Nomor awal harus lebih kecil atau sama dengan nomor akhir");
                    }

                    const { error } = await supabase
                        .from('housing_units')
                        .insert(unitsToInsert);
                    
                    if (error) throw error;
                    toast({ title: "Berhasil", description: `${unitsToInsert.length} unit berhasil ditambahkan` });
                } else {
                    const { error } = await supabase
                        .from('housing_units')
                        .insert([payload]);
                    if (error) throw error;
                    toast({ title: "Berhasil", description: "Unit baru berhasil ditambahkan" });
                }
            }

            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal menyimpan data",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUnit = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus unit ini?')) return;
        try {
            const { error } = await supabase
                .from('housing_units')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast({ title: "Berhasil", description: "Unit telah dihapus" });
            fetchData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal menghapus unit",
                variant: "destructive"
            });
        }
    };
    
    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} unit yang dipilih?`)) return;
        
        try {
            const { error } = await supabase
                .from('housing_units')
                .delete()
                .in('id', selectedIds);
                
            if (error) throw error;
            toast({ title: "Berhasil", description: `${selectedIds.length} unit telah dihapus` });
            setSelectedIds([]);
            fetchData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal menghapus unit terpilih",
                variant: "destructive"
            });
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredUnits.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredUnits.map(u => u.id));
        }
    };

    const toggleSelectUnit = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredUnits = units.filter(u => {
        const matchesSearch = u.block_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.consumer_name && u.consumer_name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesProject = selectedProject === 'all' || u.location_name === selectedProject;
        const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;

        return matchesSearch && matchesProject && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Tersedia</Badge>;
            case 'booked':
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"><AlertCircle className="w-3 h-3 mr-1" /> Booked</Badge>;
            case 'sold':
                return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100"><XCircle className="w-3 h-3 mr-1" /> Terjual</Badge>;
            case 'blocked':
                return <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">Diblokir</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Daftar Stok Rumah</h2>
                    <p className="text-sm text-slate-500">Kelola ketersediaan unit dan progress pembangunan setiap proyek</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus {selectedIds.length} Terpilih
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => { setIsBulkMode(true); setEditingUnit({}); setIsDialogOpen(true); }} className="border-blue-200 text-blue-600 hover:bg-blue-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Bulk (Otomatis)
                    </Button>
                    <Button onClick={() => { setIsBulkMode(false); setEditingUnit({}); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Unit
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative md:col-span-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cari blok atau konsumen..."
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Pilih Proyek" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Lokasi</SelectItem>
                                {locations.map(loc => (
                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="available">Tersedia</SelectItem>
                                <SelectItem value="booked">Booked</SelectItem>
                                <SelectItem value="sold">Terjual</SelectItem>
                                <SelectItem value="blocked">Diblokir</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center justify-end">
                            <Badge variant="secondary" className="px-3 py-1 font-semibold">
                                Total: {filteredUnits.length} Unit
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                            <p>Memuat data stok rumah...</p>
                        </div>
                    ) : filteredUnits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Home className="w-12 h-12 mb-4 opacity-20" />
                            <p>Tidak ada data unit ditemukan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-600 border-b">
                                    <tr>
                                        <th className="px-4 py-4 w-10">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={filteredUnits.length > 0 && selectedIds.length === filteredUnits.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">LOKASI/PROYEK</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">NO/BLOK</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">STATUS</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">KONSUMEN</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">PROGRESS</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">KETERANGAN</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">AKSI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUnits.map((unit) => (
                                        <tr key={unit.id} className={cn(
                                            "hover:bg-slate-50/50 transition-colors group",
                                            selectedIds.includes(unit.id) && "bg-blue-50/30"
                                        )}>
                                            <td className="px-4 py-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    checked={selectedIds.includes(unit.id)}
                                                    onChange={() => toggleSelectUnit(unit.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-50 rounded-lg">
                                                        <MapPin className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <span className="font-semibold text-slate-800">{unit.project_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="font-mono text-sm bg-slate-50 border-slate-200">
                                                    {unit.block_number}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(unit.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {unit.consumer_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="font-medium text-slate-700">{unit.consumer_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 min-w-[150px]">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-slate-500">Pembangunan</span>
                                                        <span className={unit.construction_progress >= 100 ? "text-emerald-600" : "text-blue-600"}>
                                                            {unit.construction_progress}%
                                                        </span>
                                                    </div>
                                                    <Progress value={unit.construction_progress} className="h-1.5" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-slate-500 line-clamp-1 text-xs" title={unit.notes}>
                                                    {unit.notes || '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                                        onClick={() => { setEditingUnit(unit); setIsDialogOpen(true); }}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                        onClick={() => handleDeleteUnit(unit.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingUnit?.id ? 'Edit Unit Rumah' : isBulkMode ? 'Tambah Unit Rumah (Bulk)' : 'Tambah Unit Rumah Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            {isBulkMode 
                                ? 'Masukkan rentang nomor untuk membuat banyak unit sekaligus.' 
                                : 'Isi detail informasi unit rumah di bawah ini.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveUnit} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Lokasi / Proyek</Label>
                                <Select
                                    value={editingUnit?.location_name}
                                    onValueChange={(val) => setEditingUnit({ ...editingUnit, location_name: val })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Lokasi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map(loc => (
                                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {isBulkMode && !editingUnit?.id ? (
                                <>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Awalan Blok (Prefix)</Label>
                                        <Input
                                            placeholder="Contoh: Blok A No. "
                                            value={bulkData.prefix}
                                            onChange={(e) => setBulkData({ ...bulkData, prefix: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nomor Awal</Label>
                                        <Input
                                            type="number"
                                            value={bulkData.start}
                                            onChange={(e) => setBulkData({ ...bulkData, start: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nomor Akhir</Label>
                                        <Input
                                            type="number"
                                            value={bulkData.end}
                                            onChange={(e) => setBulkData({ ...bulkData, end: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-[11px] text-blue-700">
                                        <strong>Preview:</strong> Unit yang akan dibuat adalah {bulkData.prefix}{bulkData.start} sampai {bulkData.prefix}{bulkData.end}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2 col-span-2">
                                    <Label>No / Blok Rumah</Label>
                                    <Input
                                        placeholder="Contoh: A1-01"
                                        value={editingUnit?.block_number || ''}
                                        onChange={(e) => setEditingUnit({ ...editingUnit, block_number: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={editingUnit?.status || 'available'}
                                    onValueChange={(val: any) => setEditingUnit({ ...editingUnit, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Tersedia</SelectItem>
                                        <SelectItem value="booked">Booked</SelectItem>
                                        <SelectItem value="sold">Terjual</SelectItem>
                                        <SelectItem value="blocked">Diblokir</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Progress Pembangunan (%)</Label>
                                <div className="flex gap-4 items-center">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editingUnit?.construction_progress || 0}
                                        onChange={(e) => setEditingUnit({ ...editingUnit, construction_progress: Number(e.target.value) })}
                                    />
                                    <span className="text-sm font-bold text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Konsumen (Opsional)</Label>
                                <Select
                                    value={editingUnit?.consumer_id || 'none'}
                                    onValueChange={(val) => setEditingUnit({ ...editingUnit, consumer_id: val === 'none' ? undefined : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Konsumen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Belum Terjual</SelectItem>
                                        {consumers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Keterangan</Label>
                                <Textarea
                                    placeholder="Catatan tambahan mengenai unit ini..."
                                    value={editingUnit?.notes || ''}
                                    onChange={(e) => setEditingUnit({ ...editingUnit, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Simpan Data
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
