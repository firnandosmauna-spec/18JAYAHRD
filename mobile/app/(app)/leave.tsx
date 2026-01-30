import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { H3, P, Small } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import { Calendar, Plus, X } from 'lucide-react-native';

const LEAVE_TYPES = [
    { label: 'Cuti Tahunan', value: 'annual' },
    { label: 'Sakit', value: 'sick' },
    { label: 'Izin', value: 'permission' },
    { label: 'Lainnya', value: 'unpaid' },
];

export default function Leave() {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [employeeId, setEmployeeId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
        days: '1'
    });

    useEffect(() => {
        fetchLeaveData();
    }, []);

    const fetchLeaveData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('employee_id')
                .eq('id', user.id)
                .single();

            if (profile?.employee_id) {
                setEmployeeId(profile.employee_id);
                const { data, error } = await supabase
                    .from('leave_requests')
                    .select('*')
                    .eq('employee_id', profile.employee_id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setRequests(data || []);
            }
        } catch (error) {
            console.error('Error fetching leave:', error);
        } finally {
            setLoading(false);
        }
    };

    const isValidDate = (dateString: string) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    };

    const handleSubmit = async () => {
        if (!employeeId) return;
        if (!formData.startDate || !formData.endDate || !formData.reason) {
            Alert.alert('Error', 'Mohon lengkapi semua field');
            return;
        }

        if (!isValidDate(formData.startDate) || !isValidDate(formData.endDate)) {
            Alert.alert('Error', 'Format tanggal salah. Gunakan YYYY-MM-DD (contoh: 2024-01-01)');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('leave_requests')
                .insert({
                    employee_id: employeeId,
                    leave_type: formData.type,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    days: parseInt(formData.days) || 1,
                    reason: formData.reason,
                    status: 'pending'
                });

            if (error) throw error;
            Alert.alert('Sukses', 'Pengajuan cuti berhasil dikirim');
            setShowForm(false);
            setFormData({ type: 'annual', startDate: '', endDate: '', reason: '', days: '1' });
            fetchLeaveData();
        } catch (error: any) {
            Alert.alert('Gagal', error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Pengajuan Cuti' }} />

            {!showForm ? (
                <Button
                    onPress={() => setShowForm(true)}
                    className="mb-6 bg-blue-600 w-full"
                >
                    <View className="flex-row items-center gap-2">
                        <Plus size={20} color="white" />
                        <Text className="text-white font-bold">Buat Pengajuan Baru</Text>
                    </View>
                </Button>
            ) : (
                <Card className="mb-6 border-blue-200 shadow-sm">
                    <CardHeader className="bg-blue-50 border-b border-blue-100 flex-row justify-between items-center">
                        <CardTitle className="text-blue-900">Form Pengajuan</CardTitle>
                        <TouchableOpacity onPress={() => setShowForm(false)}>
                            <X size={20} color="#60a5fa" />
                        </TouchableOpacity>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1">Tipe Cuti</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {LEAVE_TYPES.map(type => (
                                    <TouchableOpacity
                                        key={type.value}
                                        onPress={() => setFormData({ ...formData, type: type.value })}
                                        className={`px-3 py-2 rounded-md border ${formData.type === type.value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={formData.type === type.value ? 'text-white' : 'text-gray-700'}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Input
                                    label="Dari Tanggal (YYYY-MM-DD)"
                                    placeholder="2024-01-01"
                                    value={formData.startDate}
                                    onChangeText={(t) => setFormData({ ...formData, startDate: t })}
                                />
                            </View>
                            <View className="flex-1">
                                <Input
                                    label="Sampai (YYYY-MM-DD)"
                                    placeholder="2024-01-02"
                                    value={formData.endDate}
                                    onChangeText={(t) => setFormData({ ...formData, endDate: t })}
                                />
                            </View>
                        </View>

                        <View>
                            <Input
                                label="Jumlah Hari"
                                placeholder="1"
                                keyboardType="numeric"
                                value={formData.days}
                                onChangeText={(t) => setFormData({ ...formData, days: t })}
                            />
                        </View>

                        <View>
                            <Input
                                label="Alasan"
                                placeholder="Jelaskan alasan cuti..."
                                multiline
                                numberOfLines={3}
                                value={formData.reason}
                                onChangeText={(t) => setFormData({ ...formData, reason: t })}
                            />
                        </View>

                        <Button
                            onPress={handleSubmit}
                            disabled={submitting}
                            className="bg-blue-600 mt-2"
                            label={submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                        />
                    </CardContent>
                </Card>
            )}

            <H3 className="mb-4 text-gray-800">Riwayat Pengajuan</H3>

            {requests.length === 0 ? (
                <View className="items-center py-8">
                    <View className="mb-4">
                        <Calendar size={48} color="#d1d5db" />
                    </View>
                    <Text className="text-gray-400 text-center">Belum ada riwayat pengajuan cuti.</Text>
                </View>
            ) : (
                <View className="gap-3">
                    {requests.map((req) => (
                        <Card key={req.id} className="border-none shadow-sm">
                            <CardContent className="p-4">
                                <View className="flex-row justify-between items-start mb-2">
                                    <View>
                                        <H3 className="text-base font-semibold capitalize">
                                            {LEAVE_TYPES.find(t => t.value === req.leave_type)?.label || req.leave_type}
                                        </H3>
                                        <Small className="text-gray-500">
                                            {req.start_date} s/d {req.end_date} • {req.days} Hari
                                        </Small>
                                    </View>
                                    <Badge className={`px-2 py-1 ${getStatusColor(req.status).split(' ')[0]}`}>
                                        <Text className={`text-xs font-bold capitalize ${getStatusColor(req.status).split(' ')[1]}`}>
                                            {req.status === 'pending' ? 'Menunggu' : req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                        </Text>
                                    </Badge>
                                </View>
                                <P className="text-gray-600 text-sm mt-2 bg-gray-50 p-2 rounded">
                                    "{req.reason}"
                                </P>
                            </CardContent>
                        </Card>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
