import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    Image,
    Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { H3, P, Small, Large } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import {
    Plus,
    Search,
    Trash2,
    Calendar,
    User,
    Building,
    DollarSign,
    Image as ImageIcon,
    ChevronRight,
    X,
    Camera,
    Layers
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../../lib/utils';

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

const STAGES: { id: Stage; label: string; color: string; bgColor: string }[] = [
    { id: 'lead', label: 'Lead Masuk', color: '#334155', bgColor: 'bg-slate-100' },
    { id: 'qualified', label: 'Qualified', color: '#1d4ed8', bgColor: 'bg-blue-100' },
    { id: 'proposal', label: 'Proposal', color: '#7e22ce', bgColor: 'bg-purple-100' },
    { id: 'negotiation', label: 'Negosiasi', color: '#c2410c', bgColor: 'bg-orange-100' },
    { id: 'won', label: 'Deal Won', color: '#15803d', bgColor: 'bg-green-100' },
    { id: 'lost', label: 'Lost', color: '#b91c1c', bgColor: 'bg-red-100' },
];

const SOURCES = [
    "Walk-in",
    "Facebook Ads",
    "Instagram",
    "Tiktok",
    "Website",
    "Referral",
    "Pameran"
];

export default function PipelineScreen() {
    const [loading, setLoading] = useState(true);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Pipeline | null>(null);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        contact_name: '',
        company: '',
        value: '',
        stage: 'lead' as Stage,
        source: '',
        survey_date: '',
        booking_date: '',
        booking_fee: '',
        akad_date: '',
        notes: '',
        attachment_url: '',
        survey_attachment_url: '',
        booking_attachment_url: '',
        akad_attachment_url: ''
    });

    const fetchPipelines = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('marketing_pipelines')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(' [Pipeline] Fetch Error:', error);
                throw error;
            }
            setPipelines(data || []);
        } catch (error: any) {
            console.error(' [Pipeline] fetchPipelines Exception:', error);
            Alert.alert('Error 500 / Database Error',
                'Gagal mengambil data. Pastikan tabel marketing_pipelines sudah ada dan RLS sudah dikonfigurasi. Detail: ' + (error.message || 'Unknown error')
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPipelines();
    }, [fetchPipelines]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
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

    const handlePickImage = async (field: string) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri, field);
        }
    };

    const uploadImage = async (uri: string, field: string) => {
        try {
            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileName = `${Date.now()}-${field}.jpg`;
            const filePath = `${user.id}/${fileName}`;

            const response = await fetch(uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('pipeline-uploads')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('pipeline-uploads')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [field]: publicUrl }));
            Alert.alert('Berhasil', 'Gambar berhasil diunggah');
        } catch (error: any) {
            console.error('Upload failed:', error);
            Alert.alert('Error', 'Gagal mengunggah gambar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.contact_name || !formData.value) {
            Alert.alert('Peringatan', 'Harap isi data wajib (Judul, Nama Client, Nilai Deal)');
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const payload = {
                title: formData.title,
                contact_name: formData.contact_name,
                company: formData.company,
                value: Number(formData.value),
                stage: formData.stage,
                source: formData.source,
                notes: formData.notes,
                survey_date: formData.survey_date || null,
                booking_date: formData.booking_date || null,
                booking_fee: Number(formData.booking_fee) || 0,
                akad_date: formData.akad_date || null,
                attachment_url: formData.attachment_url,
                survey_attachment_url: formData.survey_attachment_url,
                booking_attachment_url: formData.booking_attachment_url,
                akad_attachment_url: formData.akad_attachment_url,
                created_by: user.id
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('marketing_pipelines')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) {
                    console.error(' [Pipeline] Update Error:', error);
                    throw error;
                }
            } else {
                const { error } = await supabase
                    .from('marketing_pipelines')
                    .insert([payload]);
                if (error) {
                    console.error(' [Pipeline] Insert Error:', error);
                    throw error;
                }
            }

            setIsModalOpen(false);
            resetForm();
            fetchPipelines();
            Alert.alert('Berhasil', editingItem ? 'Deal diperbarui' : 'Deal baru ditambahkan');
        } catch (error: any) {
            console.error(' [Pipeline] Save Exception:', error);
            Alert.alert('Gagal Simpan (500)', 'Terjadi kesalahan saat menyimpan: ' + (error.message || 'Cek koneksi database'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Konfirmasi',
            'Apakah Anda yakin ingin menghapus deal ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('marketing_pipelines').delete().eq('id', id);
                            if (error) throw error;
                            fetchPipelines();
                        } catch (error) {
                            Alert.alert('Error', 'Gagal menghapus deal');
                        }
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setFormData({
            title: '',
            contact_name: '',
            company: '',
            value: '',
            stage: 'lead',
            source: '',
            survey_date: '',
            booking_date: '',
            booking_fee: '',
            akad_date: '',
            notes: '',
            attachment_url: '',
            survey_attachment_url: '',
            booking_attachment_url: '',
            akad_attachment_url: ''
        });
        setEditingItem(null);
    };

    const openEdit = (item: Pipeline) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            contact_name: item.contact_name,
            company: item.company || '',
            value: String(item.value),
            stage: item.stage,
            source: item.source || '',
            survey_date: item.survey_date || '',
            booking_date: item.booking_date || '',
            booking_fee: String(item.booking_fee || ''),
            akad_date: item.akad_date || '',
            notes: item.notes || '',
            attachment_url: item.attachment_url || '',
            survey_attachment_url: item.survey_attachment_url || '',
            booking_attachment_url: item.booking_attachment_url || '',
            akad_attachment_url: item.akad_attachment_url || ''
        });
        setIsModalOpen(true);
    };

    const filteredPipelines = pipelines.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Pipeline Sales' }} />

            <View className="p-4 bg-white border-b border-gray-200">
                <View className="relative">
                    <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }} />
                    <TextInput
                        className="bg-gray-100 py-3 pl-10 pr-4 rounded-xl text-gray-900 border border-gray-200"
                        placeholder="Cari deal saya..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {loading && !pipelines.length ? (
                    <ActivityIndicator size="large" color="#0ea5e9" className="mt-8" />
                ) : filteredPipelines.length === 0 ? (
                    <View className="items-center py-12">
                        <Layers size={64} color="#e2e8f0" />
                        <Text className="text-gray-400 mt-4 text-center">Belum ada data deal.</Text>
                    </View>
                ) : (
                    filteredPipelines.map((item) => (
                        <TouchableOpacity key={item.id} className="mb-4" onPress={() => openEdit(item)}>
                            <Card className="border-none shadow-sm">
                                <CardContent className="p-4">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1">
                                            <View className="flex-row items-center gap-2 mb-1">
                                                <H3 className="text-gray-900">{item.title}</H3>
                                                {item.attachment_url && <ImageIcon size={14} color="#94a3b8" />}
                                            </View>
                                            <Text className="text-emerald-600 font-bold text-lg">
                                                {formatCurrency(item.value)}
                                            </Text>
                                            <View className="flex-row items-center gap-2 mt-2">
                                                <Badge className={STAGES.find(s => s.id === item.stage)?.bgColor}>
                                                    <Text className="text-[10px] font-bold" style={{ color: STAGES.find(s => s.id === item.stage)?.color }}>
                                                        {STAGES.find(s => s.id === item.stage)?.label}
                                                    </Text>
                                                </Badge>
                                                {item.source && (
                                                    <Badge variant="outline" className="border-gray-200">
                                                        <Text className="text-[10px] text-gray-500">{item.source}</Text>
                                                    </Badge>
                                                )}
                                            </View>
                                        </View>
                                        <ChevronRight size={20} color="#cbd5e1" />
                                    </View>

                                    <View className="mt-4 pt-4 border-t border-gray-100 gap-3">
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center gap-2 flex-1">
                                                <User size={14} color="#94a3b8" />
                                                <Text className="text-gray-600 text-sm" numberOfLines={1}>{item.contact_name}</Text>
                                            </View>
                                            <View className="flex-row gap-1">
                                                {item.attachment_url && <ImageIcon size={12} color="#94a3b8" />}
                                                {item.survey_attachment_url && <Camera size={12} color="#64748b" />}
                                                {item.booking_attachment_url && <Camera size={12} color="#3b82f6" />}
                                                {item.akad_attachment_url && <Camera size={12} color="#7e22ce" />}
                                            </View>
                                        </View>
                                        {item.company && (
                                            <View className="flex-row items-center gap-2">
                                                <Building size={14} color="#94a3b8" />
                                                <Text className="text-gray-500 text-xs">{item.company}</Text>
                                            </View>
                                        )}
                                        <View className="flex-row flex-wrap gap-y-2 justify-between mt-1">
                                            <View className="flex-row items-center gap-1">
                                                <Calendar size={12} color="#94a3b8" />
                                                <Small className="text-gray-400">Survey: {formatDate(item.survey_date)}</Small>
                                            </View>
                                            {item.booking_date && (
                                                <View className="flex-row items-center gap-1">
                                                    <Calendar size={12} color="#3b82f6" />
                                                    <Small className="text-blue-400">Booking: {formatDate(item.booking_date)}</Small>
                                                </View>
                                            )}
                                        </View>
                                        <View className="flex-row justify-between items-center">
                                            {item.akad_date ? (
                                                <View className="flex-row items-center gap-1">
                                                    <Calendar size={12} color="#7e22ce" />
                                                    <Small className="text-purple-500 font-medium">Akad: {formatDate(item.akad_date)}</Small>
                                                </View>
                                            ) : (
                                                <View />
                                            )}
                                            {item.booking_fee && item.booking_fee > 0 ? (
                                                <View className="flex-row items-center gap-1">
                                                    <DollarSign size={12} color="#3b82f6" />
                                                    <Small className="text-blue-500 font-medium">Fee: {formatCurrency(item.booking_fee)}</Small>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                </CardContent>
                            </Card>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                className="absolute bottom-6 right-6 w-14 h-14 bg-sky-500 rounded-full items-center justify-center shadow-lg"
                onPress={() => { resetForm(); setIsModalOpen(true); }}
            >
                <Plus size={28} color="white" />
            </TouchableOpacity>

            {/* Add/Edit Modal */}
            <Modal visible={isModalOpen} animationType="slide" transparent={false}>
                <View className="flex-1 bg-white">
                    <View className="px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <H3>{editingItem ? 'Edit Deal' : 'Tambah Deal Baru'}</H3>
                        <TouchableOpacity onPress={handleSubmit} disabled={loading || uploading}>
                            {loading || uploading ? (
                                <ActivityIndicator size="small" color="#0ea5e9" />
                            ) : (
                                <Text className="text-sky-600 font-bold">Simpan</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <View className="gap-6 pb-12">
                            {/* Main Info */}
                            <View className="gap-4">
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Nama Deal / Proyek *</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-lg p-3 text-gray-900"
                                        placeholder="Contoh: Unit A5 Cluster X"
                                        value={formData.title}
                                        onChangeText={t => setFormData({ ...formData, title: t })}
                                    />
                                </View>

                                <View className="flex-row gap-4">
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-gray-700 mb-1">Nama Client *</Text>
                                        <TextInput
                                            className="border border-gray-200 rounded-lg p-3 text-gray-900"
                                            placeholder="Nama PIC"
                                            value={formData.contact_name}
                                            onChangeText={t => setFormData({ ...formData, contact_name: t })}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-gray-700 mb-1">Perusahaan</Text>
                                        <TextInput
                                            className="border border-gray-200 rounded-lg p-3 text-gray-900"
                                            placeholder="Optional"
                                            value={formData.company}
                                            onChangeText={t => setFormData({ ...formData, company: t })}
                                        />
                                    </View>
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Nilai Deal (Rp) *</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-lg p-3 text-gray-900 font-bold"
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={formData.value}
                                        onChangeText={t => setFormData({ ...formData, value: t })}
                                    />
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Sumber (Source)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-1">
                                        {SOURCES.map(s => (
                                            <TouchableOpacity
                                                key={s}
                                                onPress={() => setFormData({ ...formData, source: s })}
                                                className={cn(
                                                    "px-4 py-2 rounded-full border",
                                                    formData.source === s ? "bg-blue-500 border-blue-500" : "bg-gray-50 border-gray-200"
                                                )}
                                            >
                                                <Text className={cn("text-xs font-medium", formData.source === s ? "text-white" : "text-gray-500")}>
                                                    {s}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Tahap (Stage)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-1">
                                        {STAGES.map(s => (
                                            <TouchableOpacity
                                                key={s.id}
                                                onPress={() => setFormData({ ...formData, stage: s.id })}
                                                className={cn(
                                                    "px-4 py-2 rounded-full border",
                                                    formData.stage === s.id ? "bg-sky-500 border-sky-500" : "bg-gray-50 border-gray-200"
                                                )}
                                            >
                                                <Text className={cn("text-xs font-medium", formData.stage === s.id ? "text-white" : "text-gray-500")}>
                                                    {s.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View className="h-[1px] bg-gray-100" />

                            {/* Steps (Card-like sections) */}
                            <View className="gap-6">
                                {/* Survey */}
                                <View className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <View className="flex-row items-center gap-2 mb-4">
                                        <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center">
                                            <Text className="text-[10px] font-bold text-slate-600">1</Text>
                                        </View>
                                        <Text className="font-bold text-slate-700 text-base">Tahap Survey</Text>
                                    </View>
                                    <View className="gap-4">
                                        <View>
                                            <Text className="text-xs text-gray-500 mb-1">Tanggal Survey (YYYY-MM-DD)</Text>
                                            <TextInput
                                                className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                                                placeholder="2026-01-23"
                                                value={formData.survey_date}
                                                onChangeText={t => setFormData({ ...formData, survey_date: t })}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handlePickImage('survey_attachment_url')}
                                            className="flex-row items-center justify-center gap-2 py-3 border border-gray-200 border-dashed rounded-lg bg-white"
                                        >
                                            <Camera size={16} color="#64748b" />
                                            <Text className="text-xs text-gray-500">Bukti Survey</Text>
                                            {formData.survey_attachment_url && <Badge className="bg-green-100 px-1 py-0"><Text className="text-[8px] text-green-700">OK</Text></Badge>}
                                        </TouchableOpacity>
                                        {formData.survey_attachment_url && (
                                            <Image source={{ uri: formData.survey_attachment_url }} className="w-full h-32 rounded-lg mt-2" resizeMode="cover" />
                                        )}
                                    </View>
                                </View>

                                {/* Booking */}
                                <View className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <View className="flex-row items-center gap-2 mb-4">
                                        <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center">
                                            <Text className="text-[10px] font-bold text-blue-600">2</Text>
                                        </View>
                                        <Text className="font-bold text-blue-700 text-base">Tahap Booking</Text>
                                    </View>
                                    <View className="gap-4">
                                        <View className="flex-row gap-4">
                                            <View className="flex-1">
                                                <Text className="text-xs text-gray-500 mb-1">Tgl Booking</Text>
                                                <TextInput
                                                    className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                                                    placeholder="YYYY-MM-DD"
                                                    value={formData.booking_date}
                                                    onChangeText={t => setFormData({ ...formData, booking_date: t })}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xs text-gray-500 mb-1">Fee (Rp)</Text>
                                                <TextInput
                                                    className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                                                    placeholder="0"
                                                    keyboardType="numeric"
                                                    value={formData.booking_fee}
                                                    onChangeText={t => setFormData({ ...formData, booking_fee: t })}
                                                />
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handlePickImage('booking_attachment_url')}
                                            className="flex-row items-center justify-center gap-2 py-3 border border-blue-200 border-dashed rounded-lg bg-white"
                                        >
                                            <Camera size={16} color="#3b82f6" />
                                            <Text className="text-xs text-blue-500">Bukti Booking</Text>
                                            {formData.booking_attachment_url && <Badge className="bg-green-100 px-1 py-0"><Text className="text-[8px] text-green-700">OK</Text></Badge>}
                                        </TouchableOpacity>
                                        {formData.booking_attachment_url && (
                                            <Image source={{ uri: formData.booking_attachment_url }} className="w-full h-32 rounded-lg mt-2" resizeMode="cover" />
                                        )}
                                    </View>
                                </View>

                                {/* Akad */}
                                <View className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                                    <View className="flex-row items-center gap-2 mb-4">
                                        <View className="w-6 h-6 rounded-full bg-purple-100 items-center justify-center">
                                            <Text className="text-[10px] font-bold text-purple-600">3</Text>
                                        </View>
                                        <Text className="font-bold text-purple-700 text-base">Tahap Akad</Text>
                                    </View>
                                    <View className="gap-4">
                                        <View>
                                            <Text className="text-xs text-gray-500 mb-1">Rencana Akad (YYYY-MM-DD)</Text>
                                            <TextInput
                                                className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                                                placeholder="YYYY-MM-DD"
                                                value={formData.akad_date}
                                                onChangeText={t => setFormData({ ...formData, akad_date: t })}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handlePickImage('akad_attachment_url')}
                                            className="flex-row items-center justify-center gap-2 py-3 border border-purple-200 border-dashed rounded-lg bg-white"
                                        >
                                            <Camera size={16} color="#7e22ce" />
                                            <Text className="text-xs text-purple-500">Bukti Akad</Text>
                                            {formData.akad_attachment_url && <Badge className="bg-green-100 px-1 py-0"><Text className="text-[8px] text-green-700">OK</Text></Badge>}
                                        </TouchableOpacity>
                                        {formData.akad_attachment_url && (
                                            <Image source={{ uri: formData.akad_attachment_url }} className="w-full h-32 rounded-lg mt-2" resizeMode="cover" />
                                        )}
                                    </View>
                                </View>

                                {/* General Photo */}
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-3">Foto/Thumbnail Proyek</Text>
                                    <TouchableOpacity
                                        onPress={() => handlePickImage('attachment_url')}
                                        className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl items-center justify-center overflow-hidden"
                                    >
                                        {formData.attachment_url ? (
                                            <Image source={{ uri: formData.attachment_url }} className="w-full h-full" resizeMode="cover" />
                                        ) : (
                                            <View className="items-center">
                                                <ImageIcon size={32} color="#94a3b8" />
                                                <Text className="text-gray-400 text-xs mt-2">Pilih Foto Utama</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Notes */}
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-lg p-3 text-gray-900 h-24"
                                        placeholder="Tulis catatan progress..."
                                        multiline
                                        value={formData.notes}
                                        onChangeText={t => setFormData({ ...formData, notes: t })}
                                    />
                                </View>
                            </View>

                            {editingItem && (
                                <TouchableOpacity
                                    onPress={() => handleDelete(editingItem.id)}
                                    className="flex-row items-center justify-center gap-2 py-4 mt-4"
                                >
                                    <Trash2 size={20} color="#ef4444" />
                                    <Text className="text-red-500 font-bold">Hapus Deal Ini</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
