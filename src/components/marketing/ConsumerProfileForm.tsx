import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useProjectLocations } from '@/hooks/useInventory';
import { ConsumerProfile } from './MarketingTypes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, X, FileText, Eye as EyeIcon, Printer } from 'lucide-react';

interface ConsumerProfileFormProps {
    consumerId?: string | null;
    initialData?: Partial<ConsumerProfile>;
    onSuccess: (data: any) => void;
    onCancel: () => void;
    readOnly?: boolean;
    isUnrealData?: boolean;
}

export function ConsumerProfileForm({ consumerId, initialData, onSuccess, onCancel, readOnly = false, isUnrealData = false }: ConsumerProfileFormProps) {
    const { toast } = useToast();
    const { locations: projectLocations } = useProjectLocations();
    
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('data-diri');
    const [marketingStaff, setMarketingStaff] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    
    const idPrefix = isUnrealData ? 'unreal_' : 'real_';
    
    const [formData, setFormData] = useState<Partial<ConsumerProfile>>({
        code: '',
        name: '',
        id_card_number: '',
        address: '',
        phone: '',
        email: '',
        sales_person: '',
        sales_person_id: null,
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
        family_address: '',
        source: '',
        bank_process: '',
        document_urls: [],
        ...initialData
    });

    useEffect(() => {
        const fetchMarketingStaff = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select(`
                        id, 
                        name, 
                        role,
                        employees!fk_profiles_employee(
                            position,
                            department
                        )
                    `)
                    .order('name');
                if (error) throw error;
                if (data) setMarketingStaff(data);
            } catch (error) {
                console.error('Error fetching staff:', error);
            }
        };

        const fetchExistingData = async () => {
            if (consumerId) {
                try {
                    const { data, error } = await supabase
                        .from('consumer_profiles')
                        .select('*')
                        .eq('id', consumerId)
                        .single();
                    
                    if (error) throw error;
                    if (data) {
                        if (isUnrealData) {
                            if (data.unreal_data && Object.keys(data.unreal_data).length > 0) {
                                setFormData({ ...data, ...data.unreal_data });
                            } else {
                                // Default to keeping real data for basis, but user will overwrite
                                setFormData({ ...data });
                            }
                        } else {
                            setFormData({ ...data });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching consumer profile:', error);
                }
            }
        };

        fetchMarketingStaff();
        fetchExistingData();
    }, [consumerId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateCode = async () => {
        try {
            const date = new Date();
            const year = date.getFullYear().toString().substring(2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const yyMMDD = year + month + day;
            
            // Get start of today
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();

            const { count, error } = await supabase
                .from('consumer_profiles')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', startOfDay);
            
            if (error) throw error;
            
            const sequence = ((count || 0) + 1).toString().padStart(3, '0');
            
            const newCode = `CUST-${yyMMDD}-${sequence}`;
            setFormData(prev => ({ ...prev, code: newCode }));
        } catch (error) {
            console.error('Error generating code:', error);
            const fallback = `CUST-${Date.now().toString().substring(7)}`;
            setFormData(prev => ({ ...prev, code: fallback }));
        }
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadPromises = files.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${fileExt}`;
                const filePath = `consumers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('pipeline-uploads')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('pipeline-uploads')
                    .getPublicUrl(filePath);

                return { name: file.name, url: data.publicUrl };
            });

            const uploadedFiles = await Promise.all(uploadPromises);
            const newUrls = uploadedFiles.map(f => f.url);
            
            setFormData(prev => ({
                ...prev,
                document_urls: [...(prev.document_urls || []), ...newUrls]
            }));

            toast({
                title: "Berhasil",
                description: `${files.length} file berhasil diunggah`,
            });
        } catch (error: any) {
            console.error('Error uploading files:', error);
            toast({
                title: "Upload Gagal",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (url: string) => {
        setFormData(prev => ({
            ...prev,
            document_urls: (prev.document_urls || []).filter(u => u !== url)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload: any = {
                code: formData.code,
                name: formData.name
            };

            const safeAdd = (key: string, value: any) => {
                if (value !== undefined && value !== null && value !== '') {
                    payload[key] = value;
                }
            };

            safeAdd('address', formData.address);
            safeAdd('phone', formData.phone);
            safeAdd('email', formData.email);
            safeAdd('id_card_number', formData.id_card_number);
            safeAdd('sales_person', formData.sales_person);
            safeAdd('sales_person_id', formData.sales_person_id);
            safeAdd('housing_project', formData.housing_project);
            safeAdd('npwp', formData.npwp);
            safeAdd('company_id_number', formData.company_id_number);
            safeAdd('booking_remarks', formData.booking_remarks);

            if (formData.salary !== undefined && formData.salary !== null && (formData.salary as any) !== '') {
                const numSalary = Number(formData.salary);
                payload.salary = isNaN(numSalary) ? null : numSalary;
            }

            safeAdd('occupation', formData.occupation);
            safeAdd('employer_name', formData.employer_name);
            safeAdd('employer_address', formData.employer_address);
            safeAdd('employer_phone', formData.employer_phone);
            safeAdd('employer_remarks', formData.employer_remarks);
            safeAdd('marital_status', formData.marital_status);
            safeAdd('spouse_name', formData.spouse_name);
            safeAdd('spouse_phone', formData.spouse_phone);
            safeAdd('spouse_occupation', formData.spouse_occupation);
            safeAdd('spouse_office_address', formData.spouse_office_address);
            safeAdd('spouse_remarks', formData.spouse_remarks);
            safeAdd('family_name', formData.family_name);
            safeAdd('family_relationship', formData.family_relationship);
            safeAdd('family_phone', formData.family_phone);
            safeAdd('family_address', formData.family_address);
            safeAdd('source', formData.source);
            safeAdd('bank_process', formData.bank_process);
            safeAdd('document_urls', formData.document_urls);

            if (consumerId) {
                if (isUnrealData) {
                    // Fetch existing first to not overwrite other things
                    const { data: currentData } = await supabase.from('consumer_profiles').select('unreal_data').eq('id', consumerId).single();
                    const updatedUnreal = { ...(currentData?.unreal_data || {}), ...payload };
                    
                    const { error } = await supabase
                        .from('consumer_profiles')
                        .update({ unreal_data: updatedUnreal })
                        .eq('id', consumerId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('consumer_profiles')
                        .update(payload)
                        .eq('id', consumerId);
                    if (error) throw error;
                }
            } else {
                if (isUnrealData) throw new Error("ID Konsumen tidak ditemukan untuk menyimpan data perbandingan.");
                const { data, error } = await supabase
                    .from('consumer_profiles')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                if (data) payload.id = data.id;
            }

            toast({
                title: "Berhasil",
                description: `Data konsumen berhasil ${consumerId ? 'diperbarui' : 'ditambahkan'}`,
            });
            
            onSuccess(payload);
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

    const FieldRow = ({ label, value }: { label: string, value: any }) => (
        <div className="flex border-b border-slate-100 py-1.5 md:py-2">
            <div className="w-1/3 md:w-1/4 font-semibold text-slate-600 text-[11px] md:text-xs">{label}</div>
            <div className="w-2/3 md:w-3/4 text-slate-800 text-[11px] md:text-xs">{value || <span className="text-slate-300 italic">Tidak ada</span>}</div>
        </div>
    );

    if (readOnly) {
        return (
            <div className="bg-white p-4 md:p-8 rounded-lg border shadow-sm space-y-6 max-w-4xl mx-auto relative print:p-0 print:border-none print:shadow-none w-full print:max-w-none">
                {formData.housing_project && (
                    <div className="absolute top-2 right-4 md:top-4 md:right-8 text-xl md:text-4xl font-black text-slate-100 print:text-slate-300 pointer-events-none uppercase">
                        {formData.housing_project}
                    </div>
                )}
                <div className="text-center border-b-2 border-slate-800 pb-4 mb-6 relative z-10">
                    <h2 className="text-lg md:text-xl font-bold uppercase tracking-wider text-slate-900">Formulir Profil Konsumen</h2>
                    <p className="text-slate-500 mt-1 text-xs md:text-sm">Kode Konsumen: <span className="font-semibold text-slate-700">{formData.code || '-'}</span></p>
                </div>

                <div className="space-y-2 print:space-y-1">
                    <h3 className="font-bold text-xs md:text-sm bg-slate-100 print:bg-slate-200 p-2 border-l-4 border-blue-600">A. DATA DIRI</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <FieldRow label="Nama Lengkap" value={formData.name} />
                        <FieldRow label="Nomor KTP (NIK)" value={formData.id_card_number} />
                        <FieldRow label="NPWP" value={formData.npwp} />
                        <FieldRow label="No. Handphone / WA" value={formData.phone} />
                        <FieldRow label="Email" value={formData.email} />
                        <FieldRow label="ID Karyawan" value={formData.company_id_number} />
                        <FieldRow label="Penghasilan / Bulan" value={formData.salary ? `Rp ${Number(formData.salary).toLocaleString('id-ID')}` : null} />
                    </div>
                    <FieldRow label="Alamat Domisili" value={formData.address} />
                </div>

                <div className="space-y-2 print:space-y-1">
                    <h3 className="font-bold text-xs md:text-sm bg-slate-100 print:bg-slate-200 p-2 border-l-4 border-blue-600">B. DATA PEKERJAAN</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <FieldRow label="Pekerjaan" value={formData.occupation} />
                        <FieldRow label="Nama Perusahaan" value={formData.employer_name} />
                        <FieldRow label="No. Telp Perusahaan" value={formData.employer_phone} />
                    </div>
                    <FieldRow label="Alamat Perusahaan" value={formData.employer_address} />
                    <FieldRow label="Keterangan Tambahan" value={formData.employer_remarks} />
                </div>

                <div className="space-y-2 print:space-y-1">
                    <h3 className="font-bold text-xs md:text-sm bg-slate-100 print:bg-slate-200 p-2 border-l-4 border-blue-600">C. DATA KELUARGA & PASANGAN</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <FieldRow label="Status Menikah" value={formData.marital_status === 'single' ? 'Belum Menikah' : formData.marital_status === 'married' ? 'Menikah' : formData.marital_status === 'divorced' ? 'Cerai' : formData.marital_status === 'widowed' ? 'Duda/Janda' : formData.marital_status} />
                        <FieldRow label="Nama Pasangan" value={formData.spouse_name} />
                        <FieldRow label="Pekerjaan Pasangan" value={formData.spouse_occupation} />
                        <FieldRow label="No. HP Pasangan" value={formData.spouse_phone} />
                    </div>
                    <FieldRow label="Alamat Ktr Pasangan" value={formData.spouse_office_address} />

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 border-t pt-1 border-dashed">
                        <FieldRow label="Kontak Darurat" value={formData.family_name} />
                        <FieldRow label="Hubungan" value={formData.family_relationship === 'parent' ? 'Orang Tua' : formData.family_relationship === 'sibling' ? 'Saudara Kandung' : formData.family_relationship === 'relative' ? 'Kerabat Lain' : formData.family_relationship === 'friend' ? 'Teman' : formData.family_relationship === 'other' ? 'Lainnya' : formData.family_relationship} />
                        <FieldRow label="No. HP Darurat" value={formData.family_phone} />
                    </div>
                    <FieldRow label="Alamat Kontak Darurat" value={formData.family_address} />
                </div>

                <div className="space-y-2 print:space-y-1">
                    <h3 className="font-bold text-xs md:text-sm bg-slate-100 print:bg-slate-200 p-2 border-l-4 border-blue-600">D. DATA MARKETING</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                        <FieldRow label="Nama Sales" value={formData.sales_person} />
                        <FieldRow label="Sumber Info" value={formData.source} />
                        <FieldRow label="Proses Bank" value={formData.bank_process} />
                    </div>
                    <FieldRow label="Keterangan Booking" value={formData.booking_remarks} />
                </div>

                {formData.document_urls && formData.document_urls.length > 0 && (
                    <div className="space-y-2 pt-2 break-inside-avoid print:hidden">
                        <h3 className="font-bold text-xs md:text-sm bg-slate-100 p-2 border-l-4 border-blue-600">E. LAMPIRAN DOKUMEN</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {formData.document_urls.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 transition-colors">
                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-[10px] md:text-xs font-medium truncate flex-grow">Lampiran {idx + 1}</span>
                                    <EyeIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="pt-6 flex justify-end gap-2 print:hidden border-t mt-4">
                    <Button type="button" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white h-9 px-4 text-xs">
                        <Printer className="mr-2 h-3.5 w-3.5" /> Cetak (Print)
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel} className="h-9 px-4 text-xs">Tutup</Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                    <TabsTrigger value="data-diri">Data Diri</TabsTrigger>
                    <TabsTrigger value="pekerjaan">Pekerjaan</TabsTrigger>
                    <TabsTrigger value="pasangan">Pasangan</TabsTrigger>
                    <TabsTrigger value="keluarga">Keluarga</TabsTrigger>
                    <TabsTrigger value="lampiran">Lampiran</TabsTrigger>
                </TabsList>

                <div className="max-h-[60vh] overflow-y-auto pr-2 px-1">
                    <TabsContent value="data-diri">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}code`}>Kode Konsumen <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id={`${idPrefix}code`} 
                                        name="code" 
                                        value={formData.code || ''} 
                                        onChange={handleInputChange} 
                                        required 
                                        placeholder="Cth: CUST-2401-0001" 
                                        readOnly={readOnly} 
                                        className="flex-1"
                                    />
                                    {!readOnly && !consumerId && (
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={generateCode}
                                            className="px-3"
                                            title="Generate Otomatis"
                                        >
                                            Auto
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}npwp`}>NPWP</Label>
                                <Input id={`${idPrefix}npwp`} name="npwp" value={formData.npwp || ''} onChange={handleInputChange} placeholder="Nomor NPWP" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`${idPrefix}name`}>Nama Lengkap <span className="text-red-500">*</span></Label>
                                <Input id={`${idPrefix}name`} name="name" value={formData.name || ''} onChange={handleInputChange} required placeholder="Nama lengkap sesuai KTP" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}phone`}>No. HP / WA <span className="text-red-500">*</span></Label>
                                <Input id={`${idPrefix}phone`} name="phone" value={formData.phone || ''} onChange={handleInputChange} required placeholder="08xxxxxxxxxx" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}company`}>ID Perusahaan / NIK Karyawan</Label>
                                <Input id={`${idPrefix}company`} name="company_id_number" value={formData.company_id_number || ''} onChange={handleInputChange} placeholder="ID Karyawan jika ada" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`${idPrefix}id_card`}>Nomor KTP (NIK)</Label>
                                <Input id={`${idPrefix}id_card`} name="id_card_number" value={formData.id_card_number || ''} onChange={handleInputChange} placeholder="16 digit NIK" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`${idPrefix}address`}>Alamat Lengkap Domisili</Label>
                                <Textarea id={`${idPrefix}address`} name="address" value={formData.address || ''} onChange={handleInputChange} placeholder="Alamat tempat tinggal saat ini" rows={3} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}email`}>Email</Label>
                                <Input id={`${idPrefix}email`} name="email" type="email" value={formData.email || ''} onChange={handleInputChange} placeholder="email@example.com" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}salary`}>Gaji / Penghasilan Per Bulan</Label>
                                <Input id={`${idPrefix}salary`} name="salary" type="number" value={formData.salary || ''} onChange={handleInputChange} placeholder="0" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`${idPrefix}booking`}>Keterangan / Booking</Label>
                                <Textarea id={`${idPrefix}booking`} name="booking_remarks" value={formData.booking_remarks || ''} onChange={handleInputChange} placeholder="Catatan booking atau keterangan lainnya" rows={2} readOnly={readOnly} />
                            </div>
                        </div>
                        <div className="pt-4 border-t mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`${idPrefix}project`}>Proyek Perumahan</Label>
                                    <Select
                                        value={formData.housing_project || 'none'}
                                        onValueChange={(value) => setFormData({ ...formData, housing_project: value === 'none' ? '' : value })}
                                        disabled={readOnly}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Proyek" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectLocations && projectLocations.length > 0 ? (
                                                projectLocations.map((project) => (
                                                    <SelectItem key={project} value={project}>{project}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none">Tidak ada proyek aktif</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`${idPrefix}sales`}>Nama Sales / Marketing</Label>
                                    <Select
                                        value={formData.sales_person_id || ''}
                                        onValueChange={(val) => {
                                            const staff = marketingStaff.find(s => s.id === val);
                                            setFormData(prev => ({
                                                ...prev,
                                                sales_person_id: val,
                                                sales_person: staff?.name || ''
                                            }));
                                        }}
                                        disabled={readOnly}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Sales/Marketing" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {marketingStaff.map((staff) => (
                                                <SelectItem key={staff.id} value={staff.id}>
                                                    <div className="flex flex-col text-left">
                                                        <span>{staff.name}</span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {staff.employees?.position || staff.role}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}source`}>Sumber Konsumen</Label>
                                <Select
                                    value={formData.source || ''}
                                    onValueChange={(val) => handleSelectChange('source', val)}
                                    disabled={readOnly}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Sumber" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Medsos">Medsos (FB/IG/Tiktok)</SelectItem>
                                        <SelectItem value="Iklan Online">Iklan Online</SelectItem>
                                        <SelectItem value="Iklan Offline">Iklan Offline</SelectItem>
                                        <SelectItem value="Teman/Keluarga">Dikenalkan Teman/Keluarga</SelectItem>
                                        <SelectItem value="Pameran">Pameran / Event</SelectItem>
                                        <SelectItem value="Walk-in">Walk-in / Datang Langsung</SelectItem>
                                        <SelectItem value="Website">Website</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}bank`}>Proses Bank</Label>
                                <Input id={`${idPrefix}bank`} name="bank_process" value={formData.bank_process || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="pekerjaan" className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}occupation`}>Pekerjaan</Label>
                                <Input id={`${idPrefix}occupation`} name="occupation" value={formData.occupation || ''} onChange={handleInputChange} placeholder="Jenis pekerjaan" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}emp_name`}>Nama Perusahaan / Usaha</Label>
                                <Input id={`${idPrefix}emp_name`} name="employer_name" value={formData.employer_name || ''} onChange={handleInputChange} placeholder="Tempat bekerja" readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}emp_address`}>Alamat Perusahaan / Usaha</Label>
                                <Textarea id={`${idPrefix}emp_address`} name="employer_address" value={formData.employer_address || ''} onChange={handleInputChange} rows={3} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}emp_phone`}>No. Telp Perusahaan</Label>
                                <Input id={`${idPrefix}emp_phone`} name="employer_phone" value={formData.employer_phone || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}emp_remarks`}>Keterangan Pekerjaan</Label>
                                <Textarea id={`${idPrefix}emp_remarks`} name="employer_remarks" value={formData.employer_remarks || ''} onChange={handleInputChange} rows={2} readOnly={readOnly} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="pasangan" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}marital`}>Status Pernikahan</Label>
                                <Select value={formData.marital_status || ''} onValueChange={(val) => handleSelectChange('marital_status', val)} disabled={readOnly}>
                                    <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Belum Menikah</SelectItem>
                                        <SelectItem value="married">Menikah</SelectItem>
                                        <SelectItem value="divorced">Cerai</SelectItem>
                                        <SelectItem value="widowed">Duda/Janda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}spouse_name`}>Nama Pasangan</Label>
                                <Input id={`${idPrefix}spouse_name`} name="spouse_name" value={formData.spouse_name || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}spouse_phone`}>No. HP / WA Pasangan</Label>
                                <Input id={`${idPrefix}spouse_phone`} name="spouse_phone" value={formData.spouse_phone || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}spouse_occ`}>Pekerjaan Pasangan</Label>
                                <Input id={`${idPrefix}spouse_occ`} name="spouse_occupation" value={formData.spouse_occupation || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`${idPrefix}spouse_dir`}>Alamat Kantor Pasangan</Label>
                                <Textarea id={`${idPrefix}spouse_dir`} name="spouse_office_address" value={formData.spouse_office_address || ''} onChange={handleInputChange} rows={2} readOnly={readOnly} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="keluarga" className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}fam_name`}>Nama Keluarga (Kontak Darurat)</Label>
                                <Input id={`${idPrefix}fam_name`} name="family_name" value={formData.family_name || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}fam_rel`}>Hubungan</Label>
                                <Select value={formData.family_relationship || ''} onValueChange={(val) => handleSelectChange('family_relationship', val)} disabled={readOnly}>
                                    <SelectTrigger><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
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
                                <Label htmlFor={`${idPrefix}fam_phone`}>No. HP / WA Keluarga</Label>
                                <Input id={`${idPrefix}fam_phone`} name="family_phone" value={formData.family_phone || ''} onChange={handleInputChange} readOnly={readOnly} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${idPrefix}fam_addr`}>Alamat Keluarga</Label>
                                <Textarea id={`${idPrefix}fam_addr`} name="family_address" value={formData.family_address || ''} onChange={handleInputChange} rows={3} readOnly={readOnly} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="lampiran" className="space-y-4">
                        {!readOnly && (
                            <div className="p-6 border-2 border-dashed rounded-xl border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 transition-colors">
                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                                    <Upload className="w-6 h-6 text-blue-600" />
                                </div>
                                <p className="font-medium text-slate-700">{uploading ? 'Sedang mengunggah...' : 'Klik atau seret file ke sini'}</p>
                            </div>
                        )}
                        {formData.document_urls && formData.document_urls.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mt-4">
                                {formData.document_urls.map((url, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText className="w-5 h-5 text-slate-400" />
                                            <span className="text-sm font-medium truncate max-w-[200px]">Lampiran {idx + 1}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(url, '_blank')}><EyeIcon className="w-4 h-4" /></Button>
                                            {!readOnly && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFile(url)}><X className="w-4 h-4" /></Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
                {readOnly ? (
                    <Button type="button" variant="outline" onClick={onCancel}>Tutup</Button>
                ) : (
                    <>
                        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Batal</Button>
                        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Data'}
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
}
