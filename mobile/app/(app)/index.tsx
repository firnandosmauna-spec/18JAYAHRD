import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Stack, router } from 'expo-router';
import {
    Users,
    Calculator,
    Package,
    Headphones,
    Bell,
    Search,
    Settings,
    Building2,
    ShoppingCart,
    ShoppingBag,
    LogOut,
    ChevronRight
} from 'lucide-react-native';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar } from '../../components/ui/avatar';
import { H2, H3, P, Small, Muted, Large } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

// Module Config (Same as before)
const modules = [
    {
        id: 'hrd',
        name: 'HRD',
        description: 'Kelola karyawan, cuti, absensi',
        icon: Users,
        color: 'text-rose-500',
        bgColor: 'bg-rose-50',
        route: '/(app)/hrd',
        notifications: 8,
    },
    {
        id: 'accounting',
        name: 'Akuntansi',
        description: 'Pembukuan, jurnal, invoice',
        icon: Calculator,
        color: 'text-violet-500',
        bgColor: 'bg-violet-50',
        route: '/(app)/accounting',
        notifications: 5,
    },
    {
        id: 'inventory',
        name: 'Persediaan',
        description: 'Stok barang, gudang',
        icon: Package,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        route: '/(app)/inventory',
        notifications: 15,
    },
    {
        id: 'customer',
        name: 'CS',
        description: 'Tiket support, keluhan',
        icon: Headphones,
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-50',
        route: '/(app)/customer',
        notifications: 23,
    },
    {
        id: 'project',
        name: 'Proyek',
        description: 'Manajemen proyek',
        icon: Building2,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        route: '/(app)/projects',
        notifications: 5,
    },
    {
        id: 'sales',
        name: 'Penjualan',
        description: 'Penjualan, pelanggan',
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        route: '/(app)/sales',
        notifications: 8,
    },
    {
        id: 'purchase',
        name: 'Pembelian',
        description: 'Pembelian, supplier',
        icon: ShoppingBag,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        route: '/(app)/purchase',
        notifications: 4,
    },
];

export default function Dashboard() {
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        authService.getUser().then((user) => setUser(user));
    }, []);

    const handleLogout = async () => {
        await authService.signOut();
        router.replace('/(auth)/login');
    };

    return (
        <View className="flex-1 bg-gray-50">
            <SafeAreaView className={cn("flex-1", Platform.OS === 'android' && "pt-8")}>
                {/* Header */}
                <View className="px-6 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 bg-slate-900 rounded-xl items-center justify-center">
                            <Building2 size={24} color="white" />
                        </View>
                        <H3>BusinessHub</H3>
                    </View>
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={() => { }}>
                            <View className="relative">
                                <Bell size={24} className="text-gray-500" color="#64748b" />
                                <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
                                    <Text className="text-[10px] text-white font-bold">5</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout}>
                            <Avatar fallback={user?.name?.charAt(0).toUpperCase()} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                    {/* Welcome Message */}
                    <View className="mb-8">
                        <H2>Selamat Datang, {user?.name?.split(' ')[0]}!</H2>
                        <P className="text-gray-500 mt-1">
                            Pilih modul untuk memulai pekerjaan Anda hari ini
                        </P>
                    </View>

                    {/* Module Grid */}
                    <View className="flex-row flex-wrap gap-4 justify-between">
                        {modules.map((module) => (
                            <TouchableOpacity
                                key={module.id}
                                className="w-[48%] mb-4"
                                onPress={() => {
                                    alert(`Navigating to ${module.name} (Local DB Mode)`);
                                }}
                            >
                                <Card className="h-full border-2 border-transparent hover:border-blue-500 active:border-blue-500">
                                    <CardContent className="p-4 pt-4">
                                        <View className="flex-row justify-between items-start mb-3">
                                            <View className={cn("w-12 h-12 rounded-xl items-center justify-center", module.bgColor)}>
                                                <module.icon
                                                    size={24}
                                                    className={module.color}
                                                    color="#4b5563"
                                                />
                                            </View>
                                            {module.notifications > 0 && (
                                                <Badge className={cn("px-2 py-0.5", module.bgColor.replace('/10', ''))}>
                                                    <Text className={cn("text-xs font-bold", module.color)}>{module.notifications}</Text>
                                                </Badge>
                                            )}
                                        </View>
                                        <Large className="mb-1">{module.name}</Large>
                                        <Small className="text-gray-500 leading-4">{module.description}</Small>
                                    </CardContent>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Logout Button */}
                    <Button
                        variant="destructive"
                        className="mt-8"
                        onPress={handleLogout}
                        label="Log Out"
                    />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
