import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Phone, Mail, User, MapPin, Plus, Loader2, Briefcase, Heart, Users, LayoutGrid, List, Pencil, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { ConsumerProfile, HOUSING_PROJECTS } from './MarketingTypes';
import { useToast } from '@/components/ui/use-toast';

export default function ConsumerDatabaseView() {
    const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState<Partial<ConsumerProfile>>({
        code: '',
        name: '',
        id_card_number: '',
        address: '',
        phone: '',
        email: '',
        sales_person: '',
        housing_project: '',
        npwp: '',
        company_id_number: '',
        booking_remarks: '',
        salary: 0,
        occupation: '',
        employer_name: '',
        employer_address: '',
        employer_phone: '',
        employer_remarks: '',
        marital_status: '',
        spouse_name: '',
        spouse_phone: '',
        spouse_occupation: '',
        spouse_office_address: '',
        spouse_remarks: '',
        family_name: '',
        family_relationship: '',
        family_phone: '',
        family_address: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('data-diri');

    const fetchConsumers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('consumer_profiles')
                .select('*')
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
        fetchProjects();
    }, []);

    const [projectList, setProjectList] = useState<string[]>([]);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('name')
                .eq('status', 'in-progress'); // Optional: filter active projects only?

            if (data) {
                setProjectList(data.map(p => p.name));
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);

    const [selectedConsumer, setSelectedConsumer] = useState<ConsumerProfile | null>(null);

    const handleEdit = (consumer: ConsumerProfile) => {
        setFormData({
            code: consumer.code,
            name: consumer.name,
            id_card_number: consumer.id_card_number,
            address: consumer.address,
            phone: consumer.phone,
            email: consumer.email,
            sales_person: consumer.sales_person,
            housing_project: consumer.housing_project,
            npwp: consumer.npwp,
            company_id_number: consumer.company_id_number,
            booking_remarks: consumer.booking_remarks,
            salary: consumer.salary,
            occupation: consumer.occupation,
            employer_name: consumer.employer_name,
            employer_address: consumer.employer_address,
            employer_phone: consumer.employer_phone,
            employer_remarks: consumer.employer_remarks,
            marital_status: consumer.marital_status || '',
            spouse_name: consumer.spouse_name,
            spouse_phone: consumer.spouse_phone,
            spouse_occupation: consumer.spouse_occupation,
            spouse_office_address: consumer.spouse_office_address,
            spouse_remarks: consumer.spouse_remarks,
            family_name: consumer.family_name,
            family_relationship: consumer.family_relationship || '',
            family_phone: consumer.family_phone,
            family_address: consumer.family_address
        });
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
                description: `Data konsumen ${name} berhasil dihapus`,
            });

            // If the deleted consumer was selected, deselect it
            if (selectedConsumer?.id === id) {
                setSelectedConsumer(null);
            }

            fetchConsumers();
        } catch (error: any) {
            console.error('Error deleting consumer:', error);
            toast({
                title: "Error",
                description: "Gagal menghapus data konsumen",
                variant: "destructive"
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                // Update existing consumer
                const { error } = await supabase
                    .from('consumer_profiles')
                    .update(formData)
                    .eq('id', editingId);

                if (error) throw error;

                toast({
                    title: "Berhasil",
                    description: "Data konsumen berhasil diperbarui",
                });
            } else {
                // Insert new consumer
                const { error } = await supabase
                    .from('consumer_profiles')
                    .insert([formData]);

                if (error) throw error;

                toast({
                    title: "Berhasil",
                    description: "Data konsumen lengkap berhasil ditambahkan",
                });
            }

            setIsAddDialogOpen(false);
            setEditingId(null);
            setFormData({
                code: '',
                name: '',
                id_card_number: '',
                address: '',
                phone: '',
                email: '',
                sales_person: '',
                npwp: '',
                company_id_number: '',
                booking_remarks: '',
                salary: 0,
                occupation: '',
                employer_name: '',
                employer_address: '',
                employer_phone: '',
                employer_remarks: '',
                marital_status: '',
                spouse_name: '',
                spouse_phone: '',
                spouse_occupation: '',
                spouse_office_address: '',
                spouse_remarks: '',
                family_name: '',
                family_relationship: '',
                family_phone: '',
                family_address: ''
            });
            setActiveTab('data-diri');
            fetchConsumers();
        } catch (error: any) {
            console.error('Error saving consumer:', error);
            toast({
                title: "Error",
                description: error.message || "Gagal menyimpan data konsumen",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    // UseEffect to reset form when dialog closes if not editing
    useEffect(() => {
        if (!isAddDialogOpen && !editingId) {
            setFormData({
                code: '',
                name: '',
                id_card_number: '',
                address: '',
                phone: '',
                email: '',
                sales_person: '',
                npwp: '',
                company_id_number: '',
                booking_remarks: '',
                salary: 0,
                occupation: '',
                employer_name: '',
                employer_address: '',
                employer_phone: '',
                employer_remarks: '',
                marital_status: '',
                spouse_name: '',
                spouse_phone: '',
                spouse_occupation: '',
                spouse_office_address: '',
                spouse_remarks: '',
                family_name: '',
                family_relationship: '',
                family_phone: '',
                family_address: ''
            });
            setEditingId(null);
        }
    }, [isAddDialogOpen, editingId]);


    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [selectedProject, setSelectedProject] = useState<string>('all');

    const filteredConsumers = consumers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesProject = selectedProject === 'all' || c.housing_project === selectedProject;

        return matchesSearch && matchesProject;
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
                            {projectList.length > 0 ? (
                                projectList.map(project => (
                                    <SelectItem key={project} value={project}>{project}</SelectItem>
                                ))
                            ) : (
                                HOUSING_PROJECTS.map(project => (
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

                            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-4 mb-4">
                                        <TabsTrigger value="data-diri">Data Diri</TabsTrigger>
                                        <TabsTrigger value="pekerjaan">Pekerjaan</TabsTrigger>
                                        <TabsTrigger value="pasangan">Pasangan</TabsTrigger>
                                        <TabsTrigger value="keluarga">Keluarga</TabsTrigger>
                                    </TabsList>

                                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                                        {/* DATA DIRI */}
                                        <TabsContent value="data-diri" className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="code">Kode Konsumen <span className="text-red-500">*</span></Label>
                                                    <Input id="code" name="code" value={formData.code} onChange={handleInputChange} required placeholder="Cth: CUST-001" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="npwp">NPWP</Label>
                                                    <Input id="npwp" name="npwp" value={formData.npwp} onChange={handleInputChange} placeholder="Nomor NPWP" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="name">Nama Lengkap <span className="text-red-500">*</span></Label>
                                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Nama lengkap sesuai KTP" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone">No. HP / WA <span className="text-red-500">*</span></Label>
                                                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="08xxxxxxxxxx" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="company_id_number">ID Perusahaan / NIK Karyawan</Label>
                                                    <Input id="company_id_number" name="company_id_number" value={formData.company_id_number} onChange={handleInputChange} placeholder="ID Karyawan jika ada" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="id_card_number">Nomor KTP (NIK)</Label>
                                                    <Input id="id_card_number" name="id_card_number" value={formData.id_card_number} onChange={handleInputChange} placeholder="16 digit NIK" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="address">Alamat Lengkap Domisili</Label>
                                                    <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="Alamat tempat tinggal saat ini" rows={3} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="salary">Gaji / Penghasilan Per Bulan</Label>
                                                    <Input
                                                        id="salary"
                                                        name="salary"
                                                        type="number"
                                                        value={formData.salary}
                                                        onChange={handleInputChange}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="booking_remarks">Keterangan / Booking</Label>
                                                    <Textarea id="booking_remarks" name="booking_remarks" value={formData.booking_remarks} onChange={handleInputChange} placeholder="Catatan booking atau keterangan lainnya" rows={2} />
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t mt-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="housing_project">Proyek Perumahan</Label>
                                                        <div className="relative">
                                                            <Select
                                                                value={formData.housing_project || ''}
                                                                onValueChange={(value) => setFormData({ ...formData, housing_project: value })}
                                                            >
                                                                <SelectTrigger className="pl-3">
                                                                    <SelectValue placeholder="Pilih Proyek" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {projectList.length > 0 ? (
                                                                        projectList.map((project) => (
                                                                            <SelectItem key={project} value={project}>
                                                                                {project}
                                                                            </SelectItem>
                                                                        ))
                                                                    ) : (
                                                                        HOUSING_PROJECTS.map((project) => (
                                                                            <SelectItem key={project} value={project}>
                                                                                {project}
                                                                            </SelectItem>
                                                                        ))
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="sales_person">Nama Sales / Marketing</Label>
                                                        <Input id="sales_person" name="sales_person" value={formData.sales_person} onChange={handleInputChange} placeholder="Nama sales yang menangani" />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* PEKERJAAN */}
                                        <TabsContent value="pekerjaan" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="occupation">Pekerjaan</Label>
                                                    <Input id="occupation" name="occupation" value={formData.occupation} onChange={handleInputChange} placeholder="Jenis pekerjaan" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="employer_name">Nama Perusahaan / Usaha</Label>
                                                    <Input id="employer_name" name="employer_name" value={formData.employer_name} onChange={handleInputChange} placeholder="Tempat bekerja" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="employer_address">Alamat Perusahaan / Usaha</Label>
                                                    <Textarea id="employer_address" name="employer_address" value={formData.employer_address} onChange={handleInputChange} placeholder="Alamat tempat kerja" rows={3} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="employer_phone">No. Telp Perusahaan</Label>
                                                    <Input id="employer_phone" name="employer_phone" value={formData.employer_phone} onChange={handleInputChange} placeholder="Nomor telepon kantor" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="employer_remarks">Keterangan Pekerjaan</Label>
                                                    <Textarea id="employer_remarks" name="employer_remarks" value={formData.employer_remarks} onChange={handleInputChange} placeholder="Catatan tambahan mengenai pekerjaan" rows={2} />
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* PASANGAN */}
                                        <TabsContent value="pasangan" className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="marital_status">Status Pernikahan</Label>
                                                    <Select
                                                        value={formData.marital_status}
                                                        onValueChange={(val) => handleSelectChange('marital_status', val)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="single">Belum Menikah</SelectItem>
                                                            <SelectItem value="married">Menikah</SelectItem>
                                                            <SelectItem value="divorced">Cerai</SelectItem>
                                                            <SelectItem value="widowed">Duda/Janda</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="spouse_name">Nama Pasangan</Label>
                                                    <Input id="spouse_name" name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} placeholder="Nama suami/istri" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="spouse_phone">No. HP / WA Pasangan</Label>
                                                    <Input id="spouse_phone" name="spouse_phone" value={formData.spouse_phone} onChange={handleInputChange} placeholder="Kontak pasangan" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="spouse_occupation">Pekerjaan Pasangan</Label>
                                                    <Input id="spouse_occupation" name="spouse_occupation" value={formData.spouse_occupation} onChange={handleInputChange} placeholder="Pekerjaan pasangan" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="spouse_office_address">Alamat Kantor Pasangan</Label>
                                                    <Textarea id="spouse_office_address" name="spouse_office_address" value={formData.spouse_office_address} onChange={handleInputChange} placeholder="Alamat tempat kerja pasangan" rows={2} />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="spouse_remarks">Keterangan Tambahan</Label>
                                                    <Textarea id="spouse_remarks" name="spouse_remarks" value={formData.spouse_remarks} onChange={handleInputChange} placeholder="Catatan lain tentang pasangan" rows={2} />
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* KELUARGA */}
                                        <TabsContent value="keluarga" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="family_name">Nama Keluarga (Kontak Darurat)</Label>
                                                    <Input id="family_name" name="family_name" value={formData.family_name} onChange={handleInputChange} placeholder="Nama kerabat yang tidak serumah" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="family_relationship">Hubungan</Label>
                                                    <Select
                                                        value={formData.family_relationship}
                                                        onValueChange={(val) => handleSelectChange('family_relationship', val)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih hubungan" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="parent">Orang Tua</SelectItem>
                                                            <SelectItem value="sibling">Saudara Kandung</SelectItem>
                                                            <SelectItem value="relative">Kerabat Lain</SelectItem>
                                                            <SelectItem value="friend">Teman</SelectItem>
                                                            <SelectItem value="other">Lainnya</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="family_phone">No. HP / WA Keluarga</Label>
                                                    <Input id="family_phone" name="family_phone" value={formData.family_phone} onChange={handleInputChange} placeholder="Kontak kerabat" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="family_address">Alamat Keluarga</Label>
                                                    <Textarea id="family_address" name="family_address" value={formData.family_address} onChange={handleInputChange} placeholder="Alamat tinggal kerabat" rows={3} />
                                                </div>

                                            </div>
                                        </TabsContent>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                'Simpan Data Lengkap'
                                            )}
                                        </Button>
                                    </div>
                                </Tabs>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* DETAIL DIALOG WITH ACTIONS */}
                    <Dialog open={!!selectedConsumer} onOpenChange={(open) => !open && setSelectedConsumer(null)}>
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
                                        <TabsList className="grid w-full grid-cols-4 mb-4">
                                            <TabsTrigger value="data-diri">Data Diri</TabsTrigger>
                                            <TabsTrigger value="pekerjaan">Pekerjaan</TabsTrigger>
                                            <TabsTrigger value="pasangan">Pasangan</TabsTrigger>
                                            <TabsTrigger value="keluarga">Keluarga</TabsTrigger>
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

                </div>
            </div>

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
                    <div className="border rounded-lg overflow-x-auto bg-white">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Kode</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Nama Konsumen</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Kontak (HP/WA)</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Alamat Domisili</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Pekerjaan</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Nama Perusahaan</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status Nikah</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Nama Pasangan</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Kontak Darurat</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Proyek</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Sales</th>
                                    <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredConsumers.map((consumer) => (
                                    <tr key={consumer.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-xs">{consumer.code}</td>
                                        <td className="px-4 py-3 font-medium">{consumer.name}</td>
                                        <td className="px-4 py-3">{consumer.phone || '-'}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={consumer.address}>{consumer.address || '-'}</td>
                                        <td className="px-4 py-3">{consumer.occupation || '-'}</td>
                                        <td className="px-4 py-3">{consumer.employer_name || '-'}</td>
                                        <td className="px-4 py-3 capitalize">{consumer.marital_status?.replace('_', ' ') || '-'}</td>
                                        <td className="px-4 py-3">{consumer.spouse_name || '-'}</td>
                                        <td className="px-4 py-3">
                                            {consumer.family_name ? (
                                                <div className="flex flex-col">
                                                    <span>{consumer.family_name}</span>
                                                    <span className="text-[10px] text-slate-500 capitalize">{consumer.family_relationship}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">{consumer.housing_project || '-'}</td>
                                        <td className="px-4 py-3">{consumer.sales_person || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
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
                            </tbody>
                        </table>
                    </div>
                )
            }
        </div >
    );
}
