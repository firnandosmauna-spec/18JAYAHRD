import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { H3, P, Small, Large } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import { Wallet, Plus, X } from 'lucide-react-native';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

export default function Loan() {
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [employeeId, setEmployeeId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        installment: '',
        reason: '',
        startDate: ''
    });

    useEffect(() => {
        fetchLoanData();
    }, []);

    const fetchLoanData = async () => {
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
                    .from('employee_loans')
                    .select('*')
                    .eq('employee_id', profile.employee_id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setLoans(data || []);
            }
        } catch (error) {
            console.error('Error fetching loans:', error);
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
        if (!formData.amount || !formData.reason || !formData.startDate) {
            Alert.alert('Error', 'Mohon lengkapi jumlah, tanggal, dan alasan pinjaman');
            return;
        }

        if (!isValidDate(formData.startDate)) {
            Alert.alert('Error', 'Format tanggal salah. Gunakan YYYY-MM-DD (contoh: 2024-01-01)');
            return;
        }

        const amount = parseFloat(formData.amount);
        const installment = parseFloat(formData.installment);

        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Jumlah pinjaman tidak valid');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('employee_loans')
                .insert({
                    employee_id: employeeId,
                    amount: amount,
                    remaining_amount: amount,
                    installment_amount: isNaN(installment) ? 0 : installment, // Optional, can be 0 or calculated by admin
                    reason: formData.reason,
                    start_date: formData.startDate,
                    status: 'pending'
                });

            if (error) throw error;
            Alert.alert('Sukses', 'Pengajuan kasbon berhasil dikirim');
            setShowForm(false);
            setFormData({ amount: '', installment: '', reason: '', startDate: '' });
            fetchLoanData();
        } catch (error: any) {
            Alert.alert('Gagal', error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'paid_off': return 'bg-blue-100 text-blue-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Disetujui';
            case 'paid_off': return 'Lunas';
            case 'rejected': return 'Ditolak';
            default: return 'Menunggu';
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#ea580c" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Kasbon & Pinjaman' }} />

            {!showForm ? (
                <Button
                    onPress={() => setShowForm(true)}
                    className="mb-6 bg-orange-600 w-full"
                >
                    <View className="flex-row items-center gap-2">
                        <Plus size={20} color="white" />
                        <Text className="text-white font-bold">Ajukan Kasbon Baru</Text>
                    </View>
                </Button>
            ) : (
                <Card className="mb-6 border-orange-200 shadow-sm">
                    <CardHeader className="bg-orange-50 border-b border-orange-100 flex-row justify-between items-center">
                        <CardTitle className="text-orange-900">Form Kasbon</CardTitle>
                        <TouchableOpacity onPress={() => setShowForm(false)}>
                            <X size={20} className="text-orange-400" color="#fb923c" />
                        </TouchableOpacity>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <View>
                            <Input
                                label="Jumlah Pinjaman (Rp)"
                                placeholder="Contoh: 1000000"
                                keyboardType="numeric"
                                value={formData.amount}
                                onChangeText={(t) => setFormData({ ...formData, amount: t })}
                            />
                        </View>

                        <View>
                            <Input
                                label="Tanggal Dibutuhkan"
                                placeholder="YYYY-MM-DD"
                                value={formData.startDate}
                                onChangeText={(t) => setFormData({ ...formData, startDate: t })}
                            />
                        </View>

                        <View>
                            <Input
                                label="Usulan Cicilan per Bulan (Opsional)"
                                placeholder="Contoh: 500000"
                                keyboardType="numeric"
                                value={formData.installment}
                                onChangeText={(t) => setFormData({ ...formData, installment: t })}
                            />
                        </View>

                        <View>
                            <Input
                                label="Keperluan"
                                placeholder="Jelaskan alasan pinjaman..."
                                multiline
                                numberOfLines={3}
                                value={formData.reason}
                                onChangeText={(t) => setFormData({ ...formData, reason: t })}
                            />
                        </View>

                        <Button
                            onPress={handleSubmit}
                            disabled={submitting}
                            className="bg-orange-600 mt-2"
                            label={submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                        />
                    </CardContent>
                </Card>
            )}

            <H3 className="mb-4 text-gray-800">Riwayat Pinjaman</H3>

            {loans.length === 0 ? (
                <View className="items-center py-8">
                    <Wallet size={48} className="text-gray-300 mb-4" color="#d1d5db" />
                    <Text className="text-gray-400 text-center">Belum ada riwayat pinjaman.</Text>
                </View>
            ) : (
                <View className="gap-3">
                    {loans.map((loan) => (
                        <Card key={loan.id} className="border-none shadow-sm">
                            <CardContent className="p-4">
                                <View className="flex-row justify-between items-start mb-2">
                                    <View>
                                        <Large className="text-orange-700 font-bold font-mono">
                                            {formatCurrency(loan.amount)}
                                        </Large>
                                        <Small className="text-gray-500 mt-1">
                                            {loan.start_date}
                                        </Small>
                                    </View>
                                    <Badge className={`px-2 py-1 ${getStatusColor(loan.status).split(' ')[0]}`}>
                                        <Text className={`text-xs font-bold capitalize ${getStatusColor(loan.status).split(' ')[1]}`}>
                                            {getStatusLabel(loan.status)}
                                        </Text>
                                    </Badge>
                                </View>

                                {loan.status === 'approved' && (
                                    <View className="mt-3 bg-gray-50 p-3 rounded-lg flex-row justify-between items-center border border-gray-100">
                                        <Text className="text-xs text-gray-500">Sisa Pinjaman</Text>
                                        <Text className="font-bold text-gray-800 font-mono">
                                            {formatCurrency(loan.remaining_amount)}
                                        </Text>
                                    </View>
                                )}

                                <P className="text-gray-600 text-sm mt-3">
                                    "{loan.reason}"
                                </P>
                            </CardContent>
                        </Card>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
