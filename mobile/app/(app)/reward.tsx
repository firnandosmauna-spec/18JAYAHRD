import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { H2, H3, P, Small } from '../../components/ui/typography';
import { Award, Trophy, Star } from 'lucide-react-native';

export default function Reward() {
    const [loading, setLoading] = useState(true);
    const [rewards, setRewards] = useState<any[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);

    useEffect(() => {
        fetchRewardData();
    }, []);

    const fetchRewardData = async () => {
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
                    .from('rewards')
                    .select('*')
                    .eq('employee_id', profile.employee_id)
                    .order('awarded_date', { ascending: false });

                if (error) throw error;
                setRewards(data || []);

                // Calculate total points
                const points = data?.reduce((sum, item) => sum + (item.points || 0), 0) || 0;
                setTotalPoints(points);
            }
        } catch (error) {
            console.error('Error fetching rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Penghargaan & Reward' }} />

            {/* Total Points Header */}
            <View className="items-center mb-8 bg-purple-600 rounded-2xl p-6 shadow-lg">
                <View className="bg-white/20 p-3 rounded-full mb-2">
                    <Trophy size={32} color="white" />
                </View>
                <Text className="text-white/80 text-sm font-medium uppercase tracking-wider">Total Poin</Text>
                <Text className="text-white text-4xl font-bold mt-1">{totalPoints}</Text>
            </View>

            <H3 className="mb-4 text-gray-800">Riwayat Penghargaan</H3>

            {rewards.length === 0 ? (
                <View className="items-center py-8">
                    <Award size={48} className="text-gray-300 mb-4" color="#d1d5db" />
                    <Text className="text-gray-400 text-center">Belum ada penghargaan yang diterima.</Text>
                    <Text className="text-gray-400 text-center text-xs mt-1">Terus tingkatkan kinerja Anda!</Text>
                </View>
            ) : (
                <View className="gap-4">
                    {rewards.map((reward) => (
                        <Card key={reward.id} className="border-none shadow-sm overflow-hidden">
                            <View className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                            <CardContent className="p-5 pl-7">
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-1 mr-4">
                                        <H3 className="text-gray-900 font-bold mb-1">{reward.title}</H3>
                                        <P className="text-gray-600 text-sm mb-2 leading-5">
                                            {reward.description}
                                        </P>
                                        <Small className="text-gray-400">
                                            Diberikan pada {new Date(reward.awarded_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                                        </Small>
                                    </View>
                                    <View className="bg-yellow-50 px-3 py-2 rounded-lg items-center border border-yellow-100">
                                        <Star size={16} color="#eab308" className="mb-1" />
                                        <Text className="text-yellow-700 font-bold">+{reward.points}</Text>
                                    </View>
                                </View>
                            </CardContent>
                        </Card>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
