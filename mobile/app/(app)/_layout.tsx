import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AppLayout() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.replace('/(auth)/login');
            }
            setLoading(false);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.replace('/(auth)/login');
            }
        });
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="attendance" options={{ title: 'Absensi' }} />
            <Stack.Screen name="leave" options={{ title: 'Izin Cuti' }} />
            <Stack.Screen name="loan" options={{ title: 'Kasbon' }} />
            <Stack.Screen name="payroll" options={{ title: 'Payroll' }} />
            <Stack.Screen name="reward" options={{ title: 'Reward' }} />
            <Stack.Screen name="pipeline" options={{ title: 'Pipeline Sales' }} />
        </Stack>
    );
}
