
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Phone, Calendar, MessageSquare, CheckCircle, Clock, Plus, History, Check, ChevronDown, Paperclip, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils";
import { ConsumerProfile, ConsumerFollowUp } from './MarketingTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

const QuickFollowUpAction = ({ consumer, onSend }: { consumer: ConsumerProfile, onSend: (note: string) => Promise<void> }) => {
    const [note, setNote] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!note.trim()) return;
        setLoading(true);
        await onSend(note);
        setLoading(false);
        setNote('');
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Quick Follow Up</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
                <div className="space-y-3">
                    <h4 className="font-medium leading-none text-sm">Follow Up Cepat</h4>
                    <p className="text-xs text-muted-foreground">Kirim catatan singkat untuk {consumer.name}.</p>
                    <Textarea
                        placeholder="Tulis catatan..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="text-xs h-20 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setOpen(false)} className="h-7 text-xs">Batal</Button>
                        <Button size="sm" onClick={handleSend} disabled={loading || !note} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                            {loading ? 'Mengirim...' : 'Kirim'}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default function FollowUpView() {
    const [consumers, setConsumers] = useState<ConsumerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogSearchQuery, setDialogSearchQuery] = useState('');
    const [selectedConsumerId, setSelectedConsumerId] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
    const [followUpNote, setFollowUpNote] = useState('');
    const [followUpStatus, setFollowUpStatus] = useState('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        address: '',
        occupation: ''
    });
    const { toast } = useToast();

    // Approval State
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [pendingFollowUps, setPendingFollowUps] = useState<ConsumerFollowUp[]>([]);

    // Sanction State
    const [maxFollowUpHours, setMaxFollowUpHours] = useState(24);
    const [sanctionDialogOpen, setSanctionDialogOpen] = useState(false);

    const isOverdue = (createdAt: string, remarks: string | null) => {
        if (remarks) return false; // Has follow up
        const created = new Date(createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - created) / (1000 * 60 * 60);
        return diffHours > maxFollowUpHours;
    };

    const countSanctions = () => {
        return consumers.filter(c => isOverdue(c.created_at, c.booking_remarks)).length;
    };

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsumers();
    }, []);

    const filteredConsumers = consumers.filter(consumer =>
        consumer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consumer.phone.includes(searchQuery)
    );

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // ... existing fetchConsumers ...

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSaveFollowUp = async () => {
        if (!selectedConsumerId) {
            toast({
                title: "Pilih Konsumen",
                description: "Silakan pilih nama konsumen terlebih dahulu.",
                variant: "destructive"
            });
            return;
        }

        const selectedConsumer = consumers.find(c => c.id === selectedConsumerId);
        if (!selectedConsumer) return;

        setLoading(true);
        try {
            let photoUrl = '';

            // 1. Upload Photo if exists
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${selectedConsumerId} -${Date.now()}.${fileExt} `;
                const filePath = `${fileName} `;

                const { error: uploadError } = await supabase.storage
                    .from('follow_up_evidence')
                    .upload(filePath, selectedFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('follow_up_evidence')
                    .getPublicUrl(filePath);

                photoUrl = publicUrl;
            }

            // 2. Insert into consumer_follow_ups
            const { error: insertError } = await supabase
                .from('consumer_follow_ups')
                .insert({
                    consumer_id: selectedConsumerId,
                    notes: followUpNote,
                    status: 'pending', // Default status for approval
                    photo_url: photoUrl
                });

            if (insertError) throw insertError;

            // 3. (Optional) Legacy support - append to booking_remarks for quick view in main table
            const newNote = `[${followUpStatus || 'Pending Approval'}] ${followUpNote} ${photoUrl ? '(Foto Terlampir)' : ''} (${new Date().toLocaleString('id-ID')})`;
            const existingNotes = selectedConsumer.booking_remarks || '';
            const updatedRemarks = existingNotes ? `${newNote} \n\n${existingNotes} ` : newNote;

            await supabase
                .from('consumer_profiles')
                .update({ booking_remarks: updatedRemarks })
                .eq('id', selectedConsumerId);


            toast({
                title: "Follow-up Tersimpan",
                description: `Catatan dan foto telah dikirim untuk approval.`,
            });

            setIsDialogOpen(false);
            setFollowUpNote('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSelectedConsumerId('');
            fetchConsumers();
        } catch (error: any) {
            toast({
                title: "Gagal Menyimpan",
                description: error.message || "Terjadi kesalahan saat menyimpan data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!selectedConsumerId) return;

        try {
            const { error } = await supabase
                .from('consumer_profiles')
                .update({
                    name: editForm.name,
                    phone: editForm.phone,
                    address: editForm.address,
                    occupation: editForm.occupation
                })
                .eq('id', selectedConsumerId);

            if (error) throw error;

            toast({
                title: "Profil Diperbarui",
                description: "Data konsumen berhasil diubah.",
            });

            setIsEditingProfile(false);
            fetchConsumers(); // Refresh list
        } catch (error) {
            toast({
                title: "Gagal Update Profil",
                description: "Terjadi kesalahan saat menyimpan perubahan profil.",
                variant: "destructive"
            });
        }
    };

    const openFollowUpDialog = (consumer?: ConsumerProfile) => {
        if (consumer) {
            setSelectedConsumerId(consumer.id);
            setFollowUpNote(''); // Start with empty note for new entry
            setFollowUpStatus('');
            setEditForm({
                name: consumer.name,
                phone: consumer.phone || '',
                address: consumer.address || '',
                occupation: consumer.occupation || ''
            });
            setIsEditingProfile(false);
        } else {
            setSelectedConsumerId('');
            setFollowUpNote('');
            setFollowUpStatus('');
        }
        setIsDialogOpen(true);
    };

    const fetchPendingFollowUps = async () => {
        const { data, error } = await supabase
            .from('consumer_follow_ups')
            .select(`
                *,
                consumer:consumer_profiles(name, created_at)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pending follow ups:', error);
            return;
        }

        // Map the joined data to include consumer_name
        const mappedData = data.map((item: any) => ({
            ...item,
            consumer_name: item.consumer?.name || 'Unknown',
            consumer_created_at: item.consumer?.created_at
        }));

        setPendingFollowUps(mappedData);
    };

    const calculateDuration = (startDate: string, endDate: string) => {
        if (!startDate || !endDate) return '-';
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const diff = end - start;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days} hari ${hours} jam`;
        return `${hours} jam`;
    };

    const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('consumer_follow_ups')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: status === 'approved' ? "Disetujui" : "Ditolak",
                description: `Follow up telah ${status === 'approved' ? 'disetujui' : 'ditolak'}.`,
            });

            // Refresh list
            fetchPendingFollowUps();

            // Allow refresh of main list if needed, though status updates might not reflect immediately there without fetchConsumers
            if (status === 'approved') fetchConsumers();

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleQuickFollowUp = async (consumerId: string, note: string) => {
        if (!note.trim()) return;

        try {
            const { error: insertError } = await supabase
                .from('consumer_follow_ups')
                .insert({
                    consumer_id: consumerId,
                    notes: note,
                    status: 'pending',
                    photo_url: ''
                });

            if (insertError) throw insertError;

            // Legacy Support
            const newNote = `[Quick Follow Up] ${note} (${new Date().toLocaleString('id-ID')})`;
            const existingConsumer = consumers.find(c => c.id === consumerId);
            const existingNotes = existingConsumer?.booking_remarks || '';
            const updatedRemarks = existingNotes ? `${newNote}\n\n${existingNotes}` : newNote;

            await supabase
                .from('consumer_profiles')
                .update({ booking_remarks: updatedRemarks })
                .eq('id', consumerId);

            toast({
                title: "Follow Up Terkirim",
                description: "Catatan berhasil ditambahkan ke antrian approval.",
            });
            fetchConsumers();
            fetchPendingFollowUps();
        } catch (error: any) {
            toast({
                title: "Gagal Kirim",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Follow Up Konsumen (V3 - {new Date().toLocaleTimeString()})</h2>
                    <p className="text-muted-foreground">
                        Kelola dan pantau interaksi dengan calon konsumen
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
                        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Approval Follow Up (HRD)</DialogTitle>
                                <DialogDescription>
                                    Daftar follow up yang menunggu persetujuan dari HRD/Manager.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-auto py-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu Follow Up</TableHead>
                                            <TableHead>Konsumen</TableHead>
                                            <TableHead>Durasi Respon</TableHead>
                                            <TableHead>Catatan</TableHead>
                                            <TableHead>Foto</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingFollowUps.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Tidak ada data pending approval.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            pendingFollowUps.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-xs whitespace-nowrap">
                                                        {new Date(item.created_at).toLocaleString('id-ID')}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        <div>{item.consumer_name}</div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            Reg: {item.consumer_created_at ? new Date(item.consumer_created_at).toLocaleDateString('id-ID') : '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {calculateDuration(item.consumer_created_at || '', item.created_at)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[300px] text-sm">{item.notes}</TableCell>
                                                    <TableCell>
                                                        {item.photo_url ? (
                                                            <a href={item.photo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                                                                Lihat Foto
                                                            </a>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleApproval(item.id, 'rejected')}
                                                        >
                                                            Tolak
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleApproval(item.id, 'approved')}
                                                        >
                                                            Setuju
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>Tutup</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Sanction Settings Dialog */}
                    <Dialog open={sanctionDialogOpen} onOpenChange={setSanctionDialogOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Pengaturan Sanksi Keterlambatan</DialogTitle>
                                <DialogDescription>
                                    Konfigurasi batas waktu follow up sebelum sanksi diterapkan.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="hours" className="text-right col-span-2">
                                        Batas Waktu (Jam)
                                    </Label>
                                    <Input
                                        id="hours"
                                        type="number"
                                        value={maxFollowUpHours}
                                        onChange={(e) => setMaxFollowUpHours(Number(e.target.value))}
                                        className="col-span-2"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    Jika follow up tidak dilakukan dalam {maxFollowUpHours} jam sejak data masuk, marketing akan terkena sanksi (Badge Merah).
                                </p>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setSanctionDialogOpen(false)}>Simpan Pengaturan</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={async () => {
                        const { error } = await supabase.from('consumer_profiles').insert({
                            code: `C-${Date.now()}`,
                            name: 'Budi Santoso (Sample)',
                            phone: '081234567890',
                            address: 'Jl. Merdeka No. 45, Jakarta',
                            occupation: 'Wiraswasta',
                            sales_person: 'Andi'
                        });
                        if (error) {
                            alert('Gagal seed: ' + error.message);
                        } else {
                            alert('Data sample berhasil ditambahkan. Refresh halaman.');
                            fetchConsumers();
                        }
                    }} variant="secondary" size="sm">
                        + Isi Data Contoh (Seed)
                    </Button>
                    <Button onClick={() => openFollowUpDialog()} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Follow Up
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama atau telepon..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setSanctionDialogOpen(true)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        Pengaturan Sanksi
                        {countSanctions() > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{countSanctions()}</Badge>}
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter Status
                    </Button>
                </div>
            </div>

            {/* Consumer Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-[200px]">Nama Konsumen</TableHead>
                            <TableHead className="w-[150px]">Kontak</TableHead>
                            <TableHead className="w-[150px]">Sales</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[120px]">Durasi Lead</TableHead>
                            <TableHead>Catatan Terakhir</TableHead>
                            <TableHead className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                        onClick={() => {
                                            fetchPendingFollowUps();
                                            setApprovalDialogOpen(true);
                                        }}
                                    >
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Approval
                                    </Button>
                                    Aksi
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <History className="h-4 w-4 animate-spin" />
                                        Memuat data...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredConsumers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Tidak ada data konsumen ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredConsumers.map((consumer) => {
                                const overdue = isOverdue(consumer.created_at, consumer.booking_remarks);
                                return (
                                    <TableRow key={consumer.id} className={cn("hover:bg-slate-50/50", overdue ? "bg-red-50 hover:bg-red-100/50" : "")}>
                                        <TableCell className="font-medium">
                                            <div>{consumer.name}</div>
                                            <div className="text-xs text-muted-foreground">{consumer.occupation}</div>
                                            {overdue && (
                                                <Badge variant="destructive" className="mt-1 text-[10px] h-4 px-1">Sanksi Keterlambatan</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Phone className="h-3 w-3" />
                                                {consumer.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>{consumer.sales_person || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={consumer.booking_fee_status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                                                {consumer.booking_fee_status === 'paid' ? 'Booking' : 'Prospek'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("text-xs font-normal", overdue ? "border-red-200 text-red-700 bg-red-100" : "")}>
                                                {calculateDuration(consumer.created_at, new Date().toISOString())}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <p className="truncate text-sm text-muted-foreground" title={consumer.booking_remarks}>
                                                {consumer.booking_remarks || '-'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-1">
                                            <QuickFollowUpAction
                                                consumer={consumer}
                                                onSend={(note) => handleQuickFollowUp(consumer.id, note)}
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => openFollowUpDialog(consumer)} className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600">
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="sr-only">Open Detail</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Follow Up Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-3 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-sm font-medium">
                            Follow Up Konsumen
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Form untuk menambahkan catatan follow up baru.
                        </DialogDescription>
                        {selectedConsumerId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-slate-400"
                                onClick={() => setSelectedConsumerId('')}
                            >
                                Ganti
                            </Button>
                        )}
                    </DialogHeader>

                    <div className="p-3 space-y-3">
                        {/* Compact Consumer Selector / Info */}
                        {!selectedConsumerId ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal text-muted-foreground"
                                onClick={() => setIsSearchDialogOpen(true)}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Cari Data Master Konsumen...
                            </Button>
                        ) : (() => {
                            const c = consumers.find(x => x.id === selectedConsumerId);
                            if (!c) return null;
                            return (
                                <div className="bg-blue-50/50 p-2 rounded border border-blue-100 text-xs">
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-slate-700">{c.name}</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 text-slate-400 hover:text-indigo-600"
                                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                                            title="Edit Info"
                                        >
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {isEditingProfile ? (
                                        <div className="grid gap-2 mt-2 bg-white p-2 rounded border">
                                            <div className="grid gap-1">
                                                <Input
                                                    placeholder="Nama"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    className="h-7 text-xs"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    placeholder="Telepon"
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    className="h-7 text-xs"
                                                />
                                                <Input
                                                    placeholder="Pekerjaan"
                                                    value={editForm.occupation}
                                                    onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                                                    className="h-7 text-xs"
                                                />
                                            </div>
                                            <Input
                                                placeholder="Alamat"
                                                value={editForm.address}
                                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                className="h-7 text-xs"
                                            />
                                            <Button size="sm" onClick={handleSaveProfile} className="h-7 text-xs bg-indigo-600">Simpan</Button>
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-slate-500 flex flex-wrap gap-x-3 gap-y-1 items-center">
                                            <div className="flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {c.phone}
                                            </div>
                                            <div>{c.occupation}</div>
                                            <div className="truncate max-w-[200px]">{c.address}</div>
                                            <Badge variant={c.booking_fee_status === 'paid' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1 py-0">
                                                {c.booking_fee_status === 'paid' ? 'Booking' : 'Prospek'}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Chat History Area */}
                        <div className="flex-1 min-h-[100px] max-h-[200px] overflow-y-auto space-y-2 bg-slate-50 p-2 rounded border">
                            {!consumers.find(c => c.id === selectedConsumerId)?.booking_remarks ? (
                                <div className="text-center text-xs text-muted-foreground py-4">Belum ada riwayat catatan.</div>
                            ) : (
                                <div className="text-xs text-slate-600 whitespace-pre-wrap">
                                    {consumers.find(c => c.id === selectedConsumerId)?.booking_remarks}
                                </div>
                            )}
                        </div>

                        {/* Input & Toolbar */}
                        <div className="space-y-2 pt-2">
                            <div className="flex gap-1 overflow-x-auto pb-1">
                                {['Tertarik', 'Pikir-pikir', 'Tidak Respon', 'Booking'].map((status) => (
                                    <Badge
                                        key={status}
                                        variant={followUpStatus === status ? 'default' : 'outline'}
                                        className="cursor-pointer hover:bg-slate-100 text-[10px] px-2 h-5 font-normal whitespace-nowrap"
                                        onClick={() => setFollowUpStatus(status)}
                                    >
                                        {status}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex gap-2 items-end">
                                <Textarea
                                    placeholder="Ketik catatan..."
                                    value={followUpNote}
                                    onChange={(e) => setFollowUpNote(e.target.value)}
                                    className="min-h-[40px] max-h-[100px] text-sm py-2 px-3 resize-none flex-1"
                                />
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <Button
                                        variant={selectedFile ? "default" : "ghost"}
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => fileInputRef.current?.click()}
                                        title={selectedFile ? selectedFile.name : "Upload Foto"}
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700"
                                        onClick={handleSaveFollowUp}
                                        disabled={loading || !selectedConsumerId}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            {selectedFile && (
                                <div className="text-[10px] text-indigo-600 truncate px-1">
                                    📎 {selectedFile.name}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Consumer Search Dialog (Table View) */}
            <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Cari Data Master Konsumen</DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama, telepon, atau alamat..."
                                className="pl-9"
                                value={dialogSearchQuery}
                                onChange={(e) => setDialogSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="border rounded-md overflow-auto flex-1">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 sticky top-0">
                                        <TableHead>Nama Konsumen</TableHead>
                                        <TableHead>Telepon</TableHead>
                                        <TableHead>Alamat</TableHead>
                                        <TableHead>Pekerjaan</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {consumers.filter(c =>
                                        c.name.toLowerCase().includes(dialogSearchQuery.toLowerCase()) ||
                                        c.phone.includes(dialogSearchQuery) ||
                                        (c.address && c.address.toLowerCase().includes(dialogSearchQuery.toLowerCase()))
                                    ).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                Tidak ada data ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        consumers.filter(c =>
                                            c.name.toLowerCase().includes(dialogSearchQuery.toLowerCase()) ||
                                            c.phone.includes(dialogSearchQuery) ||
                                            (c.address && c.address.toLowerCase().includes(dialogSearchQuery.toLowerCase()))
                                        ).map((consumer) => (
                                            <TableRow key={consumer.id} className="hover:bg-slate-50">
                                                <TableCell className="font-medium">{consumer.name}</TableCell>
                                                <TableCell>{consumer.phone}</TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={consumer.address}>{consumer.address || '-'}</TableCell>
                                                <TableCell>{consumer.occupation || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedConsumerId(consumer.id);
                                                            setFollowUpNote(consumer.booking_remarks || '');
                                                            setIsSearchDialogOpen(false);
                                                            setDialogSearchQuery('');
                                                        }}
                                                    >
                                                        Pilih
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSearchDialogOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

