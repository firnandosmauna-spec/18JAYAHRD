import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    MapPin,
    LogIn,
    LogOut,
    History,
    AlertCircle,
    CheckCircle,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAttendance, useEmployees } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AttendanceRecord } from '@/lib/supabase';

// Helper to format time
function formatTime(date: Date) {
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Helper to format date
function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

export function UserAttendance() {
    const { user } = useAuth();
    const { toast } = useToast();
    const today = new Date().toISOString().split('T')[0];

    // States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [location, setLocation] = useState<string>('');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Fetch attendance data
    const { attendance, loading, addAttendance, updateAttendance, refetch } = useAttendance(today, today);

    // Find today's record for this employee
    const todayRecord = attendance.find(a => a.employee_id === user?.employee_id);

    // Timer effect
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Get Location Promise
    const getLocation = (): Promise<string | null> => {
        setGettingLocation(true);
        setLocationError(null);

        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                const error = 'Geolocation is not supported by your browser';
                setLocationError(error);
                setGettingLocation(false);
                resolve(null);
                return;
            }

            // Check for insecure origin
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                console.warn('Geolocation requires HTTPS on non-localhost origins.');
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoordinates({ lat: latitude, lng: longitude });

                    const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    setLocation(locationString);
                    setGettingLocation(false);
                    resolve(locationString);

                    // Optional: Call a reverse geocoding API here to get address
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        if (data && data.display_name) {
                            setLocation(data.display_name.split(',').slice(0, 2).join(', '));
                        }
                    } catch (e) {
                        // Silently fail reverse geocoding
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    let errorMessage = 'Gagal mengambil lokasi.';

                    if (error.code === 1) {
                        errorMessage = 'Izin lokasi ditolak. Mohon izinkan akses lokasi di browser Anda.';
                    } else if (error.code === 2) {
                        errorMessage = 'Posisi tidak tersedia. Pastikan GPS aktif.';
                    } else if (error.code === 3) {
                        errorMessage = 'Waktu permintaan habis.';
                    }

                    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                        errorMessage += ' (Akses via HTTP mungkin memblokir lokasi. Coba gunakan localhost atau HTTPS)';
                    }

                    setLocationError(errorMessage);
                    setGettingLocation(false);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    // Initial location fetch
    useEffect(() => {
        getLocation();
    }, []);

    // Handle Check In
    const handleCheckIn = async () => {
        console.log('Check In Clicked');
        console.log('User State:', user);

        if (!user?.employee_id) {
            console.error('No employee_id found for user');
            toast({
                title: 'Data Karyawan Tidak Ditemukan',
                description: 'Akun Anda belum terhubung dengan data karyawan. Hubungi HRD/Admin.',
                variant: 'destructive'
            });
            return;
        }

        try {
            const now = new Date();
            const checkInTime = now.toTimeString().slice(0, 5); // HH:MM

            // Fungsi untuk mendapatkan jam kerja berdasarkan hari
            const getWorkSchedule = (date: Date) => {
                const day = date.getDay(); // 0 = Sunday, 6 = Saturday
                if (day === 6) return { start: '08:00', end: '15:00' }; // Sabtu
                return { start: '08:00', end: '16:00' }; // Senin-Jumat (Default)
            };

            const schedule = getWorkSchedule(now);
            const [scheduleStartH, scheduleStartM] = schedule.start.split(':').map(Number);

            // Determine status (Late if after schedule start + tolerance)
            const scheduleStartMinutes = scheduleStartH * 60 + scheduleStartM;
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const lateTolerance = 5;

            const isLate = currentMinutes > (scheduleStartMinutes + lateTolerance);

            await addAttendance({
                employee_id: user.employee_id,
                date: today,
                check_in: checkInTime,
                status: isLate ? 'late' : 'present',
                location: 'Kantor / WFH', // Default location since GPS is disabled
                notes: isLate ? 'Terlambat' : ''
            });

            toast({
                title: 'Berhasil Check In',
                description: `Anda berhasil check in pada pukul ${checkInTime}`,
                variant: 'default'
            });

            refetch();
        } catch (error: any) {
            console.error('Check in failed:', error);
            toast({
                title: 'Gagal Check In',
                description: error.message || 'Terjadi kesalahan saat check in.',
                variant: 'destructive'
            });
        }
    };

    // Handle Check Out
    const handleCheckOut = async () => {
        if (!todayRecord || !todayRecord.id) return;

        try {
            const now = new Date();
            const checkOutTime = now.toTimeString().slice(0, 5); // HH:MM

            let workHours = null;
            // Calculate work hours
            if (todayRecord.check_in) {
                const [inH, inM] = todayRecord.check_in.split(':').map(Number);
                const [outH, outM] = checkOutTime.split(':').map(Number);
                const diffMin = (outH * 60 + outM) - (inH * 60 + inM);
                const h = Math.floor(diffMin / 60);
                const m = diffMin % 60;
                workHours = `${h}j ${m}m`;
            }

            await updateAttendance(todayRecord.id, {
                check_out: checkOutTime,
                work_hours: workHours || undefined,
            });

            toast({
                title: 'Berhasil Check Out',
                description: `Anda berhasil check out pada pukul ${checkOutTime}. Total jam kerja: ${workHours}`,
                variant: 'default'
            });
            refetch();

        } catch (error) {
            console.error('Check out failed:', error);
            toast({
                title: 'Gagal Check Out',
                description: 'Terjadi kesalahan saat check out.',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clock & Action Card */}
                <Card className="border-hrd/20 bg-gradient-to-br from-white to-hrd/5">
                    <CardHeader>
                        <CardTitle className="font-display text-xl">Presensi Hari Ini</CardTitle>
                        <CardDescription className="font-body">{formatDate(today)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="text-4xl font-mono font-bold text-hrd mb-2">
                                {formatTime(currentTime)}
                            </div>
                            <div className="flex items-center text-muted-foreground text-sm font-body">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>Pencatatan Waktu Digital</span>
                            </div>

                            {/* Debug Info */}
                            <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-left w-full border border-gray-300">
                                <p className="font-bold mb-1">Status Akun:</p>
                                <p>Email: {user?.email}</p>
                                <p>Role: {user?.role}</p>
                                <div className="flex items-center gap-2">
                                    <span>Employee ID:</span>
                                    {user?.employee_id ? (
                                        <Badge variant="outline" className="text-green-600 border-green-600 h-5">Terhubung</Badge>
                                    ) : (
                                        <Badge variant="destructive" className="h-5">TIDAK TERHUBUNG</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            {!todayRecord ? (
                                <Button
                                    size="lg"
                                    className="w-full max-w-xs bg-hrd hover:bg-hrd-dark font-body"
                                    onClick={handleCheckIn}
                                    disabled={loading}
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Check In
                                </Button>
                            ) : !todayRecord.check_out ? (
                                <Button
                                    size="lg"
                                    className="w-full max-w-xs bg-red-500 hover:bg-red-600 font-body"
                                    onClick={handleCheckOut}
                                    disabled={loading}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Check Out
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full max-w-xs font-body border-green-500 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    disabled
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Sudah Selesai
                                </Button>
                            )}
                        </div>

                        {todayRecord && (
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground text-left">Jam Masuk</p>
                                    <p className="font-mono font-medium text-lg text-left">{todayRecord.check_in || '-'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground text-right">Jam Pulang</p>
                                    <p className="font-mono font-medium text-lg text-right">{todayRecord.check_out || '-'}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stats / Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-display text-xl">Status Kehadiran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayRecord ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-body text-gray-600">Status</span>
                                    <div className="text-right">
                                        <Badge variant={todayRecord.status === 'late' ? 'destructive' : 'default'} className="capitalize">
                                            {todayRecord.status === 'present' ? 'Hadir Tepat Waktu' :
                                                todayRecord.status === 'late' ? 'Terlambat' : todayRecord.status}
                                        </Badge>
                                        {todayRecord.status === 'late' && todayRecord.check_in && (
                                            <p className="mt-1 text-xs text-red-600 font-mono font-medium">
                                                Denda: Rp {(
                                                    (parseInt(todayRecord.check_in.split(':')[0]) * 60 + parseInt(todayRecord.check_in.split(':')[1]) - (8 * 60)) * 1000
                                                ).toLocaleString('id-ID')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-body text-gray-600">Lokasi</span>
                                    <span className="text-sm font-body text-gray-900 truncate max-w-[200px]" title={todayRecord.location || ''}>
                                        {todayRecord.location || '-'}
                                    </span>
                                </div>
                                {todayRecord.notes && (
                                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <p className="text-xs text-yellow-800 font-medium mb-1">Catatan:</p>
                                        <p className="text-sm text-yellow-700">{todayRecord.notes}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <Calendar className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">Belum ada data absensi hari ini</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
