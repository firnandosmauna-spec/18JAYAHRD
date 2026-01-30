import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import {
  CalendarCheck,
  Calendar, // Changed from CalendarDays
  CreditCard,
  DollarSign,
  Gift,
  LogOut,
  User,
  Layers // Added for Pipeline
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { H2, H3, P, Small, Large } from '../../components/ui/typography';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

const modules = [
  {
    id: 'attendance',
    name: 'Absensi',
    description: 'Check-in & Check-out',
    icon: CalendarCheck,
    color: '#059669', // emerald-600
    bgColor: 'bg-emerald-50',
    route: '/(app)/attendance',
    notifications: 0,
  },
  {
    id: 'leave',
    name: 'Izin Cuti',
    description: 'Ajukan & Pantau Cuti',
    icon: Calendar, // Updated to match Web
    color: '#2563eb', // blue-600
    bgColor: 'bg-blue-50',
    route: '/(app)/leave',
    notifications: 0,
  },
  {
    id: 'loan',
    name: 'Kasbon',
    description: 'Pinjaman Karyawan',
    icon: CreditCard,
    color: '#ea580c', // orange-600
    bgColor: 'bg-orange-50',
    route: '/(app)/loan',
    notifications: 0,
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Slip Gaji & Riwayat',
    icon: DollarSign,
    color: '#16a34a', // green-600
    bgColor: 'bg-green-50',
    route: '/(app)/payroll',
    notifications: 0,
  },
  {
    id: 'reward',
    name: 'Reward',
    description: 'Pencapaian & Bonus',
    icon: Gift,
    color: '#9333ea', // purple-600
    bgColor: 'bg-purple-50',
    route: '/(app)/reward',
    notifications: 0,
  },
  {
    id: 'pipeline',
    name: 'Pipeline',
    description: 'Progres Sales & Deal',
    icon: Layers,
    color: '#0ea5e9', // sky-500
    bgColor: 'bg-sky-50',
    route: '/(app)/pipeline',
    notifications: 0,
  },
];

// ... (existing helper functions if any, or component start)

export default function Dashboard() {
  // ... (existing state and effects)
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView className={cn("flex-1", Platform.OS === 'android' && "pt-8")}>
        {/* Header */}
        <View className="px-6 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-slate-900 rounded-xl items-center justify-center">
              <User size={24} color="white" />
            </View>
            <View>
              <H3>Staff Portal</H3>
              <Small className="text-gray-500">HRD System</Small>
            </View>
          </View>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={handleLogout}>
              <LogOut size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          {/* Welcome Message */}
          <View className="mb-8">
            <H2>Halo, {profile?.name?.split(' ')[0] || 'Staff'}!</H2>
            <P className="text-gray-500 mt-1">
              Selamat bekerja, semoga harimu menyenangkan.
            </P>
          </View>

          {/* Module Grid */}
          <View className="flex-row flex-wrap justify-between">
            {modules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={{ width: '48%', marginBottom: 16 }}
                onPress={() => router.push(module.route as any)}
              >
                <Card className="border-2 border-transparent active:border-blue-500 rounded-2xl">
                  <CardContent className="p-4 pt-4">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className={cn("w-14 h-14 rounded-xl items-center justify-center", module.bgColor)}>
                        <module.icon
                          size={28}
                          color={module.color}
                        />
                      </View>
                      {module.notifications > 0 && (
                        <Badge className="px-2 py-0.5 bg-rose-100">
                          <Text className="text-xs font-bold text-rose-600">{module.notifications}</Text>
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

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
