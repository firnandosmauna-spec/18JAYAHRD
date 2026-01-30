import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { H3, P, Small, Large } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import { Banknote, ChevronRight, FileText } from 'lucide-react-native';

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

export default function Payroll() {
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState<any[]>([]);

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
                        <TouchableOpacity key={slip.id} activeOpacity={0.7}>
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
                                                <Badge className={slip.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'}>
                                                    <Text className={`text-xs font-bold capitalize ${slip.status === 'paid' ? 'text-green-700' : 'text-yellow-700'}`}>
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
        </ScrollView>
    );
}
