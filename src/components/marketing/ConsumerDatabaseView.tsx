import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Phone, Mail, User, MapPin, Plus, Loader2, Briefcase, Heart, Users, LayoutGrid, List, Pencil, Trash, CheckCircle2, Upload, X, FileText, Eye as EyeIcon, Download, Receipt, Printer } from 'lucide-react';
import { ConsumerPemberkasan } from './ConsumerPemberkasan';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { ConsumerProfile, HOUSING_PROJECTS } from './MarketingTypes';
import { useToast } from '@/components/ui/use-toast';
import { useProjectLocations } from '@/hooks/useInventory';
import { ConsumerProfileForm } from './ConsumerProfileForm';
import BookingPOS from './BookingPOS';
import ConsumerBioData from './ConsumerBioData';

export default function ConsumerDatabaseView() {
    const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchConsumers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('consumer_profiles')
                .select('*, consumer_pemberkasan(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setConsumers(data || []);
        } catch (error) {
            console.error('Error fetching consumers:', error);
            toast({
                title: "Error",
                description: "Gagal memuat data konsumen",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsumers();
    }, []);

    const [selectedConsumer, setSelectedConsumer] = useState<ConsumerProfile | null>(null);
    const [pemberkasanConsumer, setPemberkasanConsumer] = useState<ConsumerProfile | null>(null);
    const [posConsumer, setPosConsumer] = useState<ConsumerProfile | null>(null);
    const [bioDataConsumer, setBioDataConsumer] = useState<ConsumerProfile | null>(null);

    const handleEdit = (consumer: ConsumerProfile) => {
        setEditingId(consumer.id);
        setIsAddDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus data konsumen "${name}"? Data yang dihapus tidak dapat dikembalikan.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('consumer_profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Berhasil",
                description: "Data konsumen telah dihapus",
            });
            fetchConsumers();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal menghapus data",
                variant: "destructive"
            });
        }
    };

    // Form logic is handled by ConsumerProfileForm component
    const handleFormSuccess = () => {
        setIsAddDialogOpen(false);
        setEditingId(null);
        fetchConsumers();
    };

    const handleFormCancel = () => {
        setIsAddDialogOpen(false);
        setEditingId(null);
    };


    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const { locations: projectLocations } = useProjectLocations();

    const calculateProgress = (pemberkasan: any) => {
        if (!pemberkasan) return 0;
        
        // Handle both array (joined) and single object formats
        const p = Array.isArray(pemberkasan) ? pemberkasan[0] : pemberkasan;
        if (!p) return 0;

        const stages = [
            'booking', 
            'slik_ojk', 
            'proses_berkas', 
            'ots', 
            'penginputan', 
            'analis_data', 
            'lpa_aprasial', 
            'pip', 
            'pk', 
            'akad', 
            'pencairan_akad'
        ];
        
        const completed = stages.filter(stage => !!p[stage]).length;
        return Math.round((completed / stages.length) * 100);
    };

    const filteredConsumers = consumers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesProject = selectedProject === 'all' || c.housing_project === selectedProject;

        return matchesSearch && matchesProject;
    });

    const groupedData = filteredConsumers.reduce((acc, consumer) => {
        const project = consumer.housing_project || 'Tanpa Proyek';
        if (!acc[project]) acc[project] = [];
        acc[project].push(consumer);
        return acc;
    }, {} as Record<string, typeof consumers>);

    const sortedProjects = Object.keys(groupedData).sort((a, b) => {
        if (a === 'Tanpa Proyek') return 1;
        if (b === 'Tanpa Proyek') return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Database Konsumen</h2>
                    <p className="text-sm text-slate-500">Total {consumers.length} kontak terdaftar</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'shadow-sm' : 'text-slate-500'}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'shadow-sm' : 'text-slate-500'}`}
                            onClick={() => setViewMode('table')}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>

                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="w-[180px] mr-2">
                            <SelectValue placeholder="Semua Proyek" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Proyek</SelectItem>
                            {projectLocations && projectLocations.length > 0 ? (
                                projectLocations.map(project => (
                                    <SelectItem key={project} value={project}>{project}</SelectItem>
                                ))
                            ) : (
                                HOUSING_PROJECTS && HOUSING_PROJECTS.map(project => (
                                    <SelectItem key={project} value={project}>{project}</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Cari nama, kode, atau email..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                        setIsAddDialogOpen(open);
                        if (!open) setEditingId(null);
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => {
                                setEditingId(null);
                                // Reset form logic handled by useEffect/Dialog close, but can be explicit here
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Konsumen
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Edit Data Konsumen' : 'Tambah Data Konsumen Lengkap'}</DialogTitle>
                                <DialogDescription>
                                    {editingId ? 'Perbaharui informasi data konsumen di bawah ini.' : 'Isi formulir lengkap untuk menambahkan data konsumen baru ke dalam sistem.'}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-4">
                                <ConsumerProfileForm
                                    consumerId={editingId}
                                    onSuccess={handleFormSuccess}
                                    onCancel={handleFormCancel}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* DETAIL DIALOG WITH ACTIONS */}
            <Dialog open={!!selectedConsumer} onOpenChange={(open) => {
                if (!open) setSelectedConsumer(null);
            }}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Data Konsumen</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap profil, pekerjaan, dan keluarga konsumen.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedConsumer && (
                        <>
                            <Tabs defaultValue="data-diri" className="w-full mt-4">
                                <TabsList className="grid w-full grid-cols-5 mb-4">
                                    <TabsTrigger value="data-diri">Data Diri</TabsTrigger>
                                    <TabsTrigger value="pekerjaan">Pekerjaan</TabsTrigger>
                                    <TabsTrigger value="pasangan">Pasangan</TabsTrigger>
                                    <TabsTrigger value="keluarga">Keluarga</TabsTrigger>
                                    <TabsTrigger value="lampiran">Lampiran</TabsTrigger>
                                </TabsList>

                                <TabsContent value="data-diri" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-slate-500 text-xs">Kode Konsumen</Label>
                                            <p className="font-medium">{selectedConsumer.code || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs">NPWP</Label>
                                            <p className="font-medium">{selectedConsumer.npwp || '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Nama Lengkap</Label>
                                        <p className="font-medium text-lg">{selectedConsumer.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-slate-500 text-xs">HP / WA</Label>
                                            <p className="font-medium">{selectedConsumer.phone || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs">ID Perusahaan</Label>
                                            <p className="font-medium">{selectedConsumer.company_id_number || '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Nomor KTP (NIK)</Label>
                                        <p className="font-medium">{selectedConsumer.id_card_number || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Alamat Lengkap</Label>
                                        <p className="font-medium">{selectedConsumer.address || '-'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-slate-500 text-xs">Email</Label>
                                            <p className="font-medium">{selectedConsumer.email || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs">Proyek Perumahan</Label>
                                            <p className="font-medium text-blue-600">{selectedConsumer.housing_project || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs">Sumber Konsumen</Label>
                                            <p className="font-medium">{selectedConsumer.source || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs">Proses Bank</Label>
                                            <Badge variant="outline" className="font-medium bg-orange-50 text-orange-700 border-orange-200">
                                                {selectedConsumer.bank_process || '-'}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Label className="text-slate-500 text-xs">Gaji / Penghasilan</Label>
                                            <p className="font-medium">
                                                {selectedConsumer.salary ? `Rp ${selectedConsumer.salary.toLocaleString()}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Keterangan / Booking</Label>
                                        <p className="font-medium">{selectedConsumer.booking_remarks || '-'}</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="pekerjaan" className="space-y-4">
                                    <div>
                                        <Label className="text-slate-500 text-xs">Pekerjaan</Label>
                                        <p className="font-medium">{selectedConsumer.occupation || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Nama Perusahaan / Usaha</Label>
                                        <p className="font-medium">{selectedConsumer.employer_name || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Alamat Perusahaan / Usaha</Label>
                                        <p className="font-medium">{selectedConsumer.employer_address || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">No. Telp Perusahaan</Label>
                                        <p className="font-medium">{selectedConsumer.employer_phone || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Keterangan Pekerjaan</Label>
                                        <p className="font-medium">{selectedConsumer.employer_remarks || '-'}</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="pasangan" className="space-y-4">
                                    <div>
                                        <Label className="text-slate-500 text-xs">Status Pernikahan</Label>
                                        <p className="font-medium capitalize">{selectedConsumer.marital_status?.replace('_', ' ') || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Nama Pasangan</Label>
                                        <p className="font-medium">{selectedConsumer.spouse_name || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">HP / WA Pasangan</Label>
                                        <p className="font-medium">{selectedConsumer.spouse_phone || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Pekerjaan Pasangan</Label>
                                        <p className="font-medium">{selectedConsumer.spouse_occupation || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Alamat Kantor Pasangan</Label>
                                        <p className="font-medium">{selectedConsumer.spouse_office_address || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Keterangan Tambahan</Label>
                                        <p className="font-medium">{selectedConsumer.spouse_remarks || '-'}</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="keluarga" className="space-y-4">
                                    <div>
                                        <Label className="text-slate-500 text-xs">Nama Keluarga (Kontak Darurat)</Label>
                                        <p className="font-medium">{selectedConsumer.family_name || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Hubungan</Label>
                                        <p className="font-medium capitalize">{selectedConsumer.family_relationship?.replace('_', ' ') || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">HP / WA Keluarga</Label>
                                        <p className="font-medium">{selectedConsumer.family_phone || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs">Alamat Keluarga</Label>
                                        <p className="font-medium">{selectedConsumer.family_address || '-'}</p>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <Label className="text-slate-500 text-xs">Sales / Marketing</Label>
                                        <p className="font-medium">{selectedConsumer.sales_person || '-'}</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="lampiran" className="space-y-4">
                                    <div className="space-y-4">
                                        {selectedConsumer.document_urls && selectedConsumer.document_urls.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {selectedConsumer.document_urls.map((url, idx) => {
                                                    const fileName = url.split('/').pop()?.split('_').slice(1).join('_') || 'Dokumen';
                                                    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                                                    
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                {isImage ? (
                                                                    <div className="flex-shrink-0">
                                                                        <img 
                                                                            src={url} 
                                                                            alt="Preview" 
                                                                            className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity" 
                                                                            onClick={() => window.open(url, '_blank')}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                        <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded border">
                                                                        <FileText className="w-6 h-6 text-slate-400" />
                                                                    </div>
                                                                )}
                                                                <div className="overflow-hidden">
                                                                    <p className="text-sm font-medium text-slate-700 truncate max-w-[150px]" title={fileName}>{fileName}</p>
                                                                    <p className="text-[10px] text-slate-400">Lampiran {idx + 1}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button 
                                                                    type="button" 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-8 px-2 text-xs flex items-center gap-1"
                                                                    onClick={() => window.open(url, '_blank')}
                                                                >
                                                                    <EyeIcon className="w-3.5 h-3.5" />
                                                                    Lihat
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <div className="bg-white p-3 rounded-full shadow-sm w-fit mx-auto mb-3">
                                                    <FileText className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-slate-500 text-sm">Tidak ada lampiran dokumen</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="flex justify-between mt-6 pt-4 border-t">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => {
                                            handleEdit(selectedConsumer);
                                            setSelectedConsumer(null);
                                        }}
                                    >
                                        Edit Data
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDelete(selectedConsumer.id, selectedConsumer.name)}
                                    >
                                        Hapus
                                    </Button>
                                </div>
                                <Button onClick={() => setSelectedConsumer(null)}>Tutup</Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Booking POS Dialog */}
            <BookingPOS 
                consumer={posConsumer}
                isOpen={!!posConsumer}
                onClose={() => setPosConsumer(null)}
                onSuccess={() => fetchConsumers()}
            />

            {/* Consumer Bio Data (Print View) */}
            <ConsumerBioData 
                consumer={bioDataConsumer}
                isOpen={!!bioDataConsumer}
                onClose={() => setBioDataConsumer(null)}
            />

            {/* Pemberkasan Dialog */}
            <Dialog open={!!pemberkasanConsumer} onOpenChange={(open) => !open && setPemberkasanConsumer(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-900 text-white">
                        <DialogTitle className="text-xl">Progres Pemberkasan</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Kelola checklist dokumen untuk {pemberkasanConsumer?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50">
                        {pemberkasanConsumer && (
                            <ConsumerPemberkasan
                                consumerId={pemberkasanConsumer.id}
                                consumerName={pemberkasanConsumer.name}
                                onUpdate={fetchConsumers}
                            />
                        )}
                    </div>
                    <DialogFooter className="p-4 bg-white border-t">
                        <Button onClick={() => setPemberkasanConsumer(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {
                loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : filteredConsumers.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-slate-500">
                        Tidak ada data konsumen ditemukan.
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredConsumers.map((consumer) => (
                            <Card key={consumer.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium truncate w-[180px]" title={consumer.name}>
                                        {consumer.name}
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[10px]">
                                        {consumer.code}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 text-sm mt-2">
                                        {consumer.address && (
                                            <div className="flex items-start gap-2 text-slate-500">
                                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span className="line-clamp-2 text-xs">{consumer.address}</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-1.5 pt-2">
                                            {consumer.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs">{consumer.phone}</span>
                                                </div>
                                            )}
                                            {consumer.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs truncate">{consumer.email}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs text-slate-600 truncate">{consumer.occupation || 'Belum diisi'}</span>
                                            </div>
                                            {consumer.bank_process && (
                                                <div className="mt-1">
                                                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                                        {consumer.bank_process}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-8 text-xs"
                                            onClick={() => setSelectedConsumer(consumer)}
                                        >
                                            Detail
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                                            title="Pemberkasan"
                                            onClick={() => setPemberkasanConsumer(consumer)}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-blue-600 border-blue-100 hover:bg-blue-50"
                                            title="Bayar Booking"
                                            onClick={() => setPosConsumer(consumer)}
                                        >
                                            <Receipt className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-slate-600 border-slate-100 hover:bg-slate-50"
                                            title="Cetak Biodata"
                                            onClick={() => setBioDataConsumer(consumer)}
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                            onClick={() => handleEdit(consumer)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                            onClick={() => handleDelete(consumer.id, consumer.name)}
                                        >
                                            <Trash className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    // TABLE VIEW MODE
                    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Profil Konsumen</th>
                                    <th className="px-4 py-3 font-semibold">Kontak & Proyek</th>
                                    <th className="px-4 py-3 font-semibold">Progress</th>
                                    <th className="px-4 py-3 font-semibold">Proses Bank</th>
                                    <th className="px-4 py-3 font-semibold">Sales</th>
                                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedProject === 'all' ? (
                                    sortedProjects.map(project => (
                                        <React.Fragment key={project}>
                                            <tr className="bg-blue-600 shadow-sm">
                                                <td colSpan={6} className="px-4 py-2.5 text-[11px] font-extrabold text-white uppercase tracking-widest border-b border-blue-700">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-blue-200 fill-blue-200/20" />
                                                        {project}
                                                        <Badge variant="outline" className="ml-2 bg-blue-500/30 text-white border-blue-400/50 text-[9px] py-0 h-4">
                                                            {groupedData[project].length} KONSUMEN
                                                        </Badge>
                                                    </div>
                                                </td>
                                            </tr>
                                            {groupedData[project].map((consumer) => (
                                                <tr key={consumer.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{consumer.name}</span>
                                                            <span className="text-[10px] font-mono text-slate-500">{consumer.code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                                <Phone className="w-3 h-3 text-slate-400" />
                                                                {consumer.phone || '-'}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                                {consumer.email || '-'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 min-w-[120px]">
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-[10px] font-medium">
                                                                <span className={calculateProgress(consumer.consumer_pemberkasan || []) === 100 ? "text-emerald-600" : "text-slate-500"}>
                                                                    {calculateProgress(consumer.consumer_pemberkasan || [])}% Lengkap
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-500 ${
                                                                        calculateProgress(consumer.consumer_pemberkasan || []) === 100 ? "bg-emerald-500" : 
                                                                        calculateProgress(consumer.consumer_pemberkasan || []) > 50 ? "bg-blue-500" : "bg-orange-400"
                                                                    }`}
                                                                    style={{ width: `${calculateProgress(consumer.consumer_pemberkasan || [])}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {consumer.bank_process ? (
                                                            <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 py-0 h-5">
                                                                {consumer.bank_process}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                                                        {consumer.sales_person || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                                                title="Pemberkasan"
                                                                onClick={() => setPemberkasanConsumer(consumer)}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                                title="Bayar Booking"
                                                                onClick={() => setPosConsumer(consumer)}
                                                            >
                                                                <Receipt className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-600 hover:bg-slate-50"
                                                                title="Cetak Biodata"
                                                                onClick={() => setBioDataConsumer(consumer)}
                                                            >
                                                                <Printer className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setSelectedConsumer(consumer)}
                                                                className="h-8 w-8 p-0 hover:bg-slate-100"
                                                                title="Lihat Detail"
                                                            >
                                                                <Users className="w-4 h-4 text-slate-500" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleEdit(consumer)}
                                                                className="h-8 w-8 p-0 hover:bg-blue-50"
                                                                title="Edit Data"
                                                            >
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(consumer.id, consumer.name)}
                                                                className="h-8 w-8 p-0 hover:bg-red-50"
                                                                title="Hapus Data"
                                                            >
                                                                <Trash className="w-4 h-4 text-red-600" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    filteredConsumers.map((consumer) => (
                                        <tr key={consumer.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{consumer.name}</span>
                                                    <span className="text-[10px] font-mono text-slate-500">{consumer.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        {consumer.phone || '-'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                        {consumer.email || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 min-w-[120px]">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-[10px] font-medium">
                                                        <span className={calculateProgress(consumer.consumer_pemberkasan || []) === 100 ? "text-emerald-600" : "text-slate-500"}>
                                                            {calculateProgress(consumer.consumer_pemberkasan || [])}% Lengkap
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${
                                                                calculateProgress(consumer.consumer_pemberkasan || []) === 100 ? "bg-emerald-500" : 
                                                                calculateProgress(consumer.consumer_pemberkasan || []) > 50 ? "bg-blue-500" : "bg-orange-400"
                                                            }`}
                                                            style={{ width: `${calculateProgress(consumer.consumer_pemberkasan || [])}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {consumer.bank_process ? (
                                                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 py-0 h-5">
                                                        {consumer.bank_process}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-600">
                                                {consumer.sales_person || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                                        title="Pemberkasan"
                                                        onClick={() => setPemberkasanConsumer(consumer)}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                        title="Bayar Booking"
                                                        onClick={() => setPosConsumer(consumer)}
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-600 hover:bg-slate-50"
                                                        title="Cetak Biodata"
                                                        onClick={() => setBioDataConsumer(consumer)}
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setSelectedConsumer(consumer)}
                                                        className="h-8 w-8 p-0 hover:bg-slate-100"
                                                        title="Lihat Detail"
                                                    >
                                                        <Users className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(consumer)}
                                                        className="h-8 w-8 p-0 hover:bg-blue-50"
                                                        title="Edit Data"
                                                    >
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(consumer.id, consumer.name)}
                                                        className="h-8 w-8 p-0 hover:bg-red-50"
                                                        title="Hapus Data"
                                                    >
                                                        <Trash className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            }
        </div>
    );
}
