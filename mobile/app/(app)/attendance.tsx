import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { H1, H2, P, Large } from '../../components/ui/typography';
import { Clock, MapPin, LogOut } from 'lucide-react-native';

const WORK_START_HOUR = 8;
const WORK_START_MINUTE = 0;
const LATE_TOLERANCE_MINUTES = 5;

export default function Attendance() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [todayRecord, setTodayRecord] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [penaltyRate, setPenaltyRate] = useState<number>(0);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchAttendanceStatus();
        fetchPenaltyRate();
        return () => clearInterval(timer);
    }, []);

    const fetchPenaltyRate = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'attendance_late_penalty')
                .single();

            if (data) {
                setPenaltyRate(Number(data.value));
            }
        } catch (error) {
            console.error('Error fetching penalty rate:', error);
        }
    };

    const getLocalYYYYMMDD = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchAttendanceStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get linked employee_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('employee_id')
                .eq('id', user.id)
                .single();

            if (profile?.employee_id) {
                setEmployeeId(profile.employee_id);

                const today = getLocalYYYYMMDD();
                const { data: record, error } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('employee_id', profile.employee_id)
                    .eq('date', today)
                    .single();

                if (record) {
                    setTodayRecord(record);
                } else {
                    setTodayRecord(null); // Reset if no record found
                    if (error && error.code !== 'PGRST116') {
                        console.error('Error fetching attendance:', error);
                    }
                }
            } else {
                Alert.alert('Profil Belum Lengkap', 'Akun Anda belum terhubung dengan data karyawan.');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchAttendanceStatus();
    }, []);

    const handleCheckIn = async () => {
        if (!employeeId) return;
        setSubmitting(true);
        try {
            // 1. Request Permission
            let { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
            if (permissionStatus !== 'granted') {
                Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin lokasi untuk melakukan absensi.');
                setSubmitting(false);
                return;
            }

            // 2. Get Location
            let location = await Location.getCurrentPositionAsync({});

            // 3. Get Address (Reverse Geocode)
            let address = 'Lokasi Terdeteksi';
            try {
                let geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (geocode.length > 0) {
                    const g = geocode[0];
                    address = `${g.street || ''} ${g.name || ''}, ${g.city || ''}`;
                    // Cleanup extra spaces
                    address = address.replace(/\s+/g, ' ').trim();
                }
            } catch (geoError) {
                console.log('Geocoding failed, using coordinates');
                address = `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`;
            }

            const now = new Date();
            // Use toTimeString() split to ensure HH:MM:SS format (e.g., "14:30:00")
            const timeString = now.toTimeString().split(' ')[0];
            const today = getLocalYYYYMMDD();

            // Determine status based on time (08:00 + 5m tolerance)
            const workStartTime = new Date(now);
            workStartTime.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

            const lateThreshold = new Date(workStartTime);
            lateThreshold.setMinutes(workStartTime.getMinutes() + LATE_TOLERANCE_MINUTES);

            const status = now > lateThreshold ? 'late' : 'present';

            const { data, error } = await supabase
                .from('attendance')
                .insert({
                    employee_id: employeeId,
                    date: today,
                    check_in: timeString,
                    check_out: null, // Force null to ensure it's not set by default
                    status: status,
                    location: address,
                })
                .select()
                .single();

            if (error) throw error;
            setTodayRecord(data);
            Alert.alert('Berhasil', `Check In berhasil di ${address}`);
        } catch (error: any) {
            Alert.alert('Gagal Check In', error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        if (!todayRecord) {
            Alert.alert("Error", "Data absen hari ini tidak ditemukan.");
            return;
        }
        setSubmitting(true);
        console.log("Attempting Check Out for ID:", todayRecord.id); // DEBUG

        try {
            const now = new Date();
            // Use toTimeString() split to ensure HH:MM:SS format (e.g., "14:30:00")
            const timeString = now.toTimeString().split(' ')[0];

            console.log("Check Out Time:", timeString); // DEBUG

            const { data, error } = await supabase
                .from('attendance')
                .update({
                    check_out: timeString,
                })
                .eq('id', todayRecord.id)
                .select()
                .single();

            if (error) {
                console.error("Supabase Update Error:", error); // DEBUG
                throw error;
            }

            if (!data) {
                console.error("Supabase Update returned no data. Possible RLS issue."); // DEBUG
                throw new Error("Data tidak terupdate (Kemungkinan masalah izin/RLS).");
            }

            console.log("Check Out Success, Data:", data); // DEBUG
            setTodayRecord(data);
            Alert.alert('Berhasil', `Check Out berhasil pada jam ${timeString}`);
        } catch (error: any) {
            console.error("Check Out Exception:", error); // DEBUG
            Alert.alert('Gagal Check Out', error.message || JSON.stringify(error));
        } finally {
            setSubmitting(false);
        }
    };

    const calculatePenalty = (checkIn: string) => {
        if (!checkIn || penaltyRate <= 0) return 0;

        const [hour, minute] = checkIn.split(':').map(Number);
        const checkInTime = new Date();
        checkInTime.setHours(hour, minute, 0, 0);

        const workStartTime = new Date();
        workStartTime.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

        const lateThreshold = new Date(workStartTime);
        lateThreshold.setMinutes(workStartTime.getMinutes() + LATE_TOLERANCE_MINUTES);

        if (checkInTime > lateThreshold) {
            const diffMs = checkInTime.getTime() - lateThreshold.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return diffMins * penaltyRate;
        }
        return 0;
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={{ padding: 20 }}
            className="flex-1 bg-gray-50"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <Stack.Screen options={{ title: 'Absensi Harian' }} />

            <View className="items-center mb-8 mt-4">
                <Text className="text-gray-500 text-lg font-medium">
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <H1 className="text-5xl font-bold text-gray-900 mt-2 font-mono">
                    {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                </H1>
            </View>

            <Card className="mb-6 border-none shadow-sm">
                <CardHeader className="bg-white border-b border-gray-100 pb-4">
                    <CardTitle className="text-center text-xl">Status Kehadiran</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <View className="flex-row justify-between mb-8">
                        <View className="items-center flex-1">
                            <Text className="text-gray-500 mb-1">Masuk</Text>
                            <Large className={todayRecord?.check_in ? "text-emerald-600" : "text-gray-300"}>
                                {todayRecord?.check_in || '--:--'}
                            </Large>
                        </View>
                        <View className="w-[1px] bg-gray-200 h-full" />
                        <View className="items-center flex-1">
                            <Text className="text-gray-500 mb-1">Keluar</Text>
                            <Large className={todayRecord?.check_out ? "text-rose-600" : "text-gray-300"}>
                                {todayRecord?.check_out || '--:--'}
                            </Large>
                        </View>
                    </View>

                    {!employeeId ? (
                        <View className="bg-amber-50 p-4 rounded-lg items-center border border-amber-200">
                            <Text className="text-amber-800 font-bold mb-1">Profil Belum Lengkap</Text>
                            <Text className="text-amber-600 text-center text-sm">
                                Akun ini belum terhubung dengan data karyawan. Harap hubungi Admin HRD.
                            </Text>
                        </View>
                    ) : !todayRecord ? (
                        <Button
                            onPress={handleCheckIn}
                            disabled={submitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 h-14"
                        >
                            <View className="flex-row items-center gap-2">
                                <Clock size={20} color="white" />
                                <Text className="text-white font-bold text-lg">CHECK IN</Text>
                            </View>
                        </Button>
                    ) : (
                        <View>
                            <Button
                                onPress={handleCheckOut}
                                disabled={submitting || (todayRecord.check_out && todayRecord.check_out !== '00:00:00')}
                                className={`w-full h-14 mb-4 ${todayRecord.check_out && todayRecord.check_out !== '00:00:00' ? 'bg-gray-400' : 'bg-red-600'}`}
                            >
                                <View className="flex-row items-center gap-2">
                                    <LogOut size={20} color="white" />
                                    <Text className="text-white font-bold text-lg">
                                        {todayRecord.check_out && todayRecord.check_out !== '00:00:00' ? 'ABSENSI SELESAI' : 'CHECK OUT'}
                                    </Text>
                                </View>
                            </Button>

                            {todayRecord.check_out && todayRecord.check_out !== '00:00:00' && (
                                <View className="bg-green-50 p-3 rounded-lg border border-green-200 mb-2">
                                    <Text className="text-green-700 text-center text-sm font-medium">
                                        Anda sudah absen pulang pada {todayRecord.check_out}.
                                        Tekan tombol di atas jika ingin mengupdate jam pulang.
                                    </Text>
                                </View>
                            )}
                            {/* Debug info for button visibility */}
                            <Text className="text-xs text-center text-gray-300 mt-1">
                                Check Out Button Rendered (Explicit Style)
                            </Text>
                        </View>
                    )}

                    <View className="mt-6 flex-row items-center justify-center gap-2">
                        <MapPin size={16} className="text-gray-400" color="#9ca3af" />
                        <Text className="text-gray-500 text-sm">
                            lokasi: {todayRecord?.location || 'Terdeteksi di Kantor'}
                        </Text>
                    </View>

                    {todayRecord?.status === 'late' && (
                        <View className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 items-center">
                            <Text className="text-red-600 font-bold">Terlambat</Text>
                            <Text className="text-red-500 text-sm mt-1">
                                Potongan: Rp {calculatePenalty(todayRecord.check_in).toLocaleString('id-ID')}
                            </Text>
                        </View>
                    )}
                </CardContent>
            </Card>

            <View className="mt-4">
                <Text className="text-center text-gray-400 text-sm">
                    Pastikan Anda berada di area kantor saat melakukan absensi.
                </Text>
            </View>

            {/* TEMPORARY DEBUG VIEW */}
            <View className="mt-8 p-4 bg-gray-200 rounded-lg">
                <Text className="font-bold text-xs mb-2">DEBUG INFO (Tunjukkan ke Developer):</Text>
                <Text className="text-xs font-mono">Employee ID: {employeeId || 'NULL'}</Text>
                <Text className="text-xs font-mono">Today Date: {getLocalYYYYMMDD()}</Text>
                <Text className="text-xs font-mono">Check Out Value: {JSON.stringify(todayRecord?.check_out)}</Text>
                <Text className="text-xs font-mono">Record: {JSON.stringify(todayRecord, null, 2)}</Text>

                <Button
                    onPress={async () => {
                        if (!todayRecord?.id) return;
                        setLoading(true);
                        await supabase.from('attendance').delete().eq('id', todayRecord.id);
                        await fetchAttendanceStatus();
                        Alert.alert("Reset Berhasil", "Data hari ini dihapus. Silakan Check In ulang.");
                        setLoading(false);
                    }}
                    className="mt-4 bg-red-600 h-10"
                >
                    <Text className="text-white text-xs">RESET/HAPUS DATA HARI INI</Text>
                </Button>
            </View>
        </ScrollView>
    );
}
