import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { initDatabase } from '../lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function prepare() {
            try {
                await initDatabase();
                const user = await AsyncStorage.getItem('user_session');
                if (user) {
                    setSession(JSON.parse(user));
                }
            } catch (e: any) {
                console.warn(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        prepare();
    }, []);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
                <Text className="mt-4 text-gray-500">Initializing Database...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-background p-4">
                <Text className="text-red-500 text-center">Failed into initialize database: {error}</Text>
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href="/(app)/dashboard" />;
}
