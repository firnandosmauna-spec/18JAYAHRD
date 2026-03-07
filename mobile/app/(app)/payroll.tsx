import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { supabase, PayrollRecord } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { H3, P, Small, Large } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import { Banknote, ChevronRight, FileText, X, TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function Payroll() {
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState<PayrollRecord[]>([]);
    const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchPayrollData();
    }, []);

    const fetchPayrollData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('employee_id')
                .eq('id', user.id)
                .single();

            if (profile?.employee_id) {
                const { data, error } = await supabase
                    .from('payroll')
                    .select('*')
                    .eq('employee_id', profile.employee_id)
                    .order('period_year', { ascending: false })
                    .order('period_month', { ascending: false });

                if (error) throw error;
                setPayslips(data || []);
            }
        } catch (error) {
            console.error('Error fetching payroll:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePressSlip = (slip: any) => {
        setSelectedSlip(slip);
        setModalVisible(true);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#16a34a" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Slip Gaji' }} />

            <H3 className="mb-4 text-gray-800">Riwayat Gaji</H3>

            {payslips.length === 0 ? (
                <View className="items-center py-8">
                    <Banknote size={48} className="text-gray-300 mb-4" color="#d1d5db" />
                    <Text className="text-gray-400 text-center">Belum ada data slip gaji.</Text>
                </View>
            ) : (
                <View className="gap-4">
                    {payslips.map((slip) => (
                        <TouchableOpacity
                            key={slip.id}
                            activeOpacity={0.7}
                            onPress={() => handlePressSlip(slip)}
                        >
                            <Card className="border-none shadow-sm relative overflow-hidden">
                                {slip.status === 'paid' && (
                                    <View className="absolute right-0 top-0 bg-green-500 w-16 h-16 transform rotate-45 translate-x-8 -translate-y-8" />
                                )}
                                <CardContent className="p-5">
                                    <View className="flex-row items-center gap-4">
                                        <View className="w-12 h-12 bg-green-50 rounded-full items-center justify-center">
                                            <FileText size={24} color="#16a34a" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-500 font-medium text-xs uppercase tracking-wider">
                                                Periode: {MONTH_NAMES[slip.period_month - 1]} {slip.period_year}
                                            </Text>
                                            <Large className="text-gray-900 font-bold font-mono mt-1">
                                                {formatCurrency(slip.net_salary)}
                                            </Large>
                                            <View className="flex-row items-center mt-2 gap-2">
                                                <Badge className={slip.status === 'paid' ? 'bg-green-100 border-green-200' : 'bg-yellow-100 border-yellow-200'}>
                                                    <Text className={`text-[10px] font-bold capitalize ${slip.status === 'paid' ? 'text-green-700' : 'text-yellow-700'}`}>
                                                        {slip.status === 'paid' ? 'Lunas' : 'Pending'}
                                                    </Text>
                                                </Badge>
                                                {slip.pay_date && (
                                                    <Small className="text-gray-400">
                                                        {new Date(slip.pay_date).toLocaleDateString('id-ID')}
                                                    </Small>
                                                )}
                                            </View>
                                        </View>
                                        <ChevronRight size={20} color="#9ca3af" />
                                    </View>
                                </CardContent>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 min-h-[60%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-gray-500 text-xs font-medium uppercase tracking-widest">Detail Slip Gaji</Text>
                                {selectedSlip && (
                                    <H3 className="text-gray-900">{MONTH_NAMES[selectedSlip.period_month - 1]} {selectedSlip.period_year}</H3>
                                )}
                            </View>
                            <Pressable
                                onPress={() => setModalVisible(false)}
                                className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                            >
                                <X size={20} color="#6b7280" />
                            </Pressable>
                        </View>

                        {selectedSlip && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Summary Card */}
                                <Card className="bg-green-600 border-none mb-6">
                                    <CardContent className="p-6 items-center">
                                        <Text className="text-green-100 text-xs font-medium uppercase tracking-wider mb-1">Gaji Bersih Diterima</Text>
                                        <Text className="text-white text-3xl font-bold font-mono">
                                            {formatCurrency(selectedSlip.net_salary)}
                                        </Text>
                                        <Badge className="bg-white/20 border-none mt-3">
                                            <Text className="text-white text-xs font-bold uppercase">{selectedSlip.status === 'paid' ? 'Sudah Dibayar' : 'Menunggu Pembayaran'}</Text>
                                        </Badge>
                                    </CardContent>
                                </Card>

                                {/* Earnings Section */}
                                <View className="mb-6">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center">
                                            <TrendingUp size={14} color="#2563eb" />
                                        </View>
                                        <Text className="text-blue-700 font-bold text-xs uppercase tracking-wider">Penerimaan & Tunjangan</Text>
                                    </View>
                                    <View className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
                                        <View className="flex-row justify-between py-2 border-b border-blue-100/30">
                                            <Text className="text-gray-600">Gaji Pokok</Text>
                                            <Text className="font-mono font-medium text-gray-900">{formatCurrency(selectedSlip.base_salary)}</Text>
                                        </View>
                                        {selectedSlip.position_allowance > 0 && (
                                            <View className="flex-row justify-between py-2 border-b border-blue-100/30">
                                                <Text className="text-gray-600">Tunjangan Jabatan</Text>
                                                <Text className="font-mono font-medium text-gray-900">{formatCurrency(selectedSlip.position_allowance)}</Text>
                                            </View>
                                        )}
                                        {selectedSlip.meal_allowance > 0 && (
                                            <View className="flex-row justify-between py-2 border-b border-blue-100/30">
                                                <Text className="text-gray-600">Uang Makan</Text>
                                                <Text className="font-mono font-medium text-gray-900">{formatCurrency(selectedSlip.meal_allowance)}</Text>
                                            </View>
                                        )}
                                        {selectedSlip.gasoline_allowance > 0 && (
                                            <View className="flex-row justify-between py-2 border-b border-blue-100/30">
                                                <Text className="text-gray-600">Uang Bensin</Text>
                                                <Text className="font-mono font-medium text-gray-900">{formatCurrency(selectedSlip.gasoline_allowance)}</Text>
                                            </View>
                                        )}
                                        {selectedSlip.reward_allowance > 0 && (
                                            <View className="flex-row justify-between py-2 border-b border-blue-100/30">
                                                <Text className="text-green-600 font-medium">Bonus / Reward</Text>
                                                <Text className="font-mono font-bold text-green-700">{formatCurrency(selectedSlip.reward_allowance)}</Text>
                                            </View>
                                        )}
                                        {selectedSlip.manual_allowance_details?.map((ma: any, i: number) => (
                                            <View key={i} className="flex-row justify-between py-2 border-b border-blue-100/30">
                                                <Text className="text-gray-600">{ma.title}</Text>
                                                <Text className="font-mono font-medium text-gray-900">{formatCurrency(ma.amount)}</Text>
                                            </View>
                                        ))}
                                        <View className="flex-row justify-between pt-3 mt-1">
                                            <Text className="text-blue-800 font-bold">Total Penerimaan</Text>
                                            <Text className="font-mono font-bold text-blue-800">
                                                {formatCurrency(selectedSlip.base_salary + selectedSlip.allowances + (selectedSlip.reward_allowance || 0))}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Deductions Section */}
                                <View className="mb-8">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <View className="w-6 h-6 bg-red-100 rounded-full items-center justify-center">
                                            <TrendingDown size={14} color="#dc2626" />
                                        </View>
                                        <Text className="text-red-700 font-bold text-xs uppercase tracking-wider">Potongan</Text>
                                    </View>
                                    <View className="bg-red-50/50 rounded-2xl p-4 border border-red-100/50">
                                        {(selectedSlip.absent_deduction > 0) && (
                                            <View className="flex-row justify-between py-2 border-b border-red-100/30">
                                                <Text className="text-gray-600">Potongan Absen</Text>
                                                <Text className="font-mono font-medium text-red-600">-{formatCurrency(selectedSlip.absent_deduction)}</Text>
                                            </View>
                                        )}
                                        {(selectedSlip.late_deduction > 0) && (
                                            <View className="flex-row justify-between py-2 border-b border-red-100/30">
                                                <Text className="text-gray-600">Potongan Terlambat</Text>
                                                <Text className="font-mono font-medium text-red-600">-{formatCurrency(selectedSlip.late_deduction)}</Text>
                                            </View>
                                        )}
                                        {selectedSlip.bpjs_deduction > 0 && (
                                            <View className="flex-row justify-between py-2 border-b border-red-100/30">
                                                <Text className="text-gray-600">BPJS</Text>
                                                <Text className="font-mono font-medium text-red-600">-{formatCurrency(selectedSlip.bpjs_deduction)}</Text>
                                            </View>
                                        )}
                                        {selectedSlip.manual_deduction_details?.map((md: any, i: number) => (
                                            <View key={i} className="flex-row justify-between py-2 border-b border-red-100/30">
                                                <Text className="text-gray-600">{md.title}</Text>
                                                <Text className="font-mono font-medium text-red-600">-{formatCurrency(md.amount)}</Text>
                                            </View>
                                        ))}
                                        {(!selectedSlip.absent_deduction && !selectedSlip.late_deduction && !selectedSlip.bpjs_deduction && (!selectedSlip.manual_deduction_details || selectedSlip.manual_deduction_details.length === 0)) && (
                                            <View className="py-2">
                                                <Text className="text-gray-400 italic text-center text-xs">Tidak ada potongan bulan ini</Text>
                                            </View>
                                        )}
                                        <View className="flex-row justify-between pt-3 mt-1">
                                            <Text className="text-red-800 font-bold">Total Potongan</Text>
                                            <Text className="font-mono font-bold text-red-800">
                                                -{formatCurrency(selectedSlip.deductions)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Payment Info */}
                                {selectedSlip.bank_account_details && (
                                    <View className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex-row items-center gap-4">
                                        <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                                            <Wallet size={20} color="#6b7280" />
                                        </View>
                                        <View>
                                            <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Pembayaran Ke</Text>
                                            <Text className="text-gray-700 font-medium">{selectedSlip.bank_account_details}</Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}
