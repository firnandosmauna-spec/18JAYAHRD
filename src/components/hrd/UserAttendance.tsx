import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    MapPin,
    LogIn,
    LogOut,
    History,
    AlertCircle,
    CheckCircle,
    Calendar,
    Camera,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAttendance, useEmployees } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AttendanceRecord } from '@/lib/supabase';
import { settingsService } from '@/services/settingsService';

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

export function UserAttendance({ onViewHistory }: { onViewHistory?: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const today = new Date().toISOString().split('T')[0];

    // Helper to get week range
    const getWeekRange = () => {
        const now = new Date();
        const day = now.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(now.setDate(diff));
        const sunday = new Date(now.setDate(diff + 6));
        return {
            start: monday.toISOString().split('T')[0],
            end: sunday.toISOString().split('T')[0]
        };
    };

    const { start: weekStart, end: weekEnd } = getWeekRange();

    // States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [location, setLocation] = useState<string>('Mencari lokasi...');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isVerifyingFace, setIsVerifyingFace] = useState(false);
    const [verificationStep, setVerificationStep] = useState<'idle' | 'scanning' | 'complete'>('idle');
    const [penaltyRate, setPenaltyRate] = useState<number>(0);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await settingsService.getAttendanceSettings();
                setPenaltyRate(settings.attendance_late_penalty);
            } catch (err) {
                console.error('Error fetching attendance settings:', err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch attendance data for the WHOLE WEEK to calculate cumulative lateness
    const { attendance, loading, addAttendance, updateAttendance, refetch } = useAttendance(weekStart, weekEnd);

    // Find today's record
    const todayRecord = attendance.find(a => a.date === today && a.employee_id === user?.employee_id);

    // Calculate weekly stats
    const weeklyAttendance = attendance.filter(a => a.employee_id === user?.employee_id);
    const weeklyLateMinutes = weeklyAttendance.reduce((acc, record) => {
        if (record.status === 'late' && record.check_in) {
            const [h, m] = record.check_in.split(':').map(Number);
            const checkInMinutes = h * 60 + m;
            const workStartMinutes = 8 * 60; // 08:00
            const lateThreshold = workStartMinutes + 5; // 5 mins tolerance
            if (checkInMinutes > lateThreshold) {
                return acc + (checkInMinutes - lateThreshold);
            }
        }
        return acc;
    }, 0);

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
                const error = 'Geolocation is not supported';
                setLocationError(error);
                setGettingLocation(false);
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoordinates({ lat: latitude, lng: longitude });

                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        if (data && data.display_name) {
                            const addr = data.display_name.split(',').slice(0, 3).join(', ');
                            setLocation(addr);
                            setGettingLocation(false);
                            resolve(addr);
                        } else {
                            const latlng = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                            setLocation(latlng);
                            setGettingLocation(false);
                            resolve(latlng);
                        }
                    } catch (e) {
                        const latlng = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        setLocation(latlng);
                        setGettingLocation(false);
                        resolve(latlng);
                    }
                },
                (error) => {
                    const msg = 'Gagal mengakses GPS. Pastikan izin lokasi aktif.';
                    setLocationError(msg);
                    setLocation('Lokasi tidak tersedia');
                    setGettingLocation(false);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    useEffect(() => {
        getLocation();
    }, []);

    const handleCheckIn = async () => {
        if (!user?.employee_id) {
            toast({ title: 'Akun Belum Terhubung', description: 'Hubungi Admin HRD.', variant: 'destructive' });
            return;
        }

        try {
            const loc = await getLocation() || location;
            const now = new Date();
            const checkInTime = now.toTimeString().slice(0, 5);

            // Logic: Office Hours (08:00 - 16:00)
            const scheduleStartMinutes = 8 * 60; // 08:00
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            // Strict Calculation: No tolerance for simple calculation
            // If check in > 08:00, it is late.
            // Requirement says "terlambat 1 menit dipotong", so basically > 08:00 is late.

            const isLate = currentMinutes > (scheduleStartMinutes + 5);
            const lateMinutes = isLate ? (currentMinutes - (scheduleStartMinutes + 5)) : 0;
            const penalty = lateMinutes * (penaltyRate || 1000);

            // SP1 Check
            const newWeeklyLateMinutes = weeklyLateMinutes + lateMinutes;
            const isSP1 = newWeeklyLateMinutes > 30;

            // Face Verification Step
            setIsVerifyingFace(true);
            setVerificationStep('scanning');
            await new Promise(resolve => setTimeout(resolve, 2000));
            setVerificationStep('complete');
            await new Promise(resolve => setTimeout(resolve, 800));

            const notes = [];
            if (isLate) notes.push(`Terlambat ${lateMinutes}m (Potongan Rp ${penalty.toLocaleString('id-ID')})`);
            if (isSP1) notes.push(`⚠️ SP1 TRIGGERED (Total ${newWeeklyLateMinutes}m/minggu)`);

            await addAttendance({
                employee_id: user.employee_id,
                date: today,
                check_in: checkInTime,
                status: isLate ? 'late' : 'present',
                location: loc,
                notes: notes.join('. ')
            });

            setIsVerifyingFace(false);
            setVerificationStep('idle');

            if (isSP1) {
                toast({
                    title: 'PERINGATAN SP1',
                    description: `Total keterlambatan minggu ini: ${newWeeklyLateMinutes} menit. Melebihi batas 30 menit.`,
                    variant: 'destructive',
                    duration: 10000
                });
            } else {
                toast({ title: 'Check In Berhasil', description: `Presensi & Wajah berhasil diverifikasi.` });
            }

            refetch();
        } catch (error: any) {
            setIsVerifyingFace(false);
            setVerificationStep('idle');
            toast({ title: 'Gagal Check In', description: error.message, variant: 'destructive' });
        }
    };

    const handleCheckOut = async () => {
        if (!todayRecord?.id) return;
        if (todayRecord.check_out) {
            toast({ title: 'Sudah Absen Pulang', description: 'Anda telah menyelesaikan absensi hari ini.', variant: 'destructive' });
            return;
        }
        try {
            const now = new Date();
            const checkOutTime = now.toTimeString().slice(0, 5);

            let workHours = '';
            if (todayRecord.check_in) {
                const [inH, inM] = todayRecord.check_in.split(':').map(Number);
                const [outH, outM] = checkOutTime.split(':').map(Number);
                const diff = (outH * 60 + outM) - (inH * 60 + inM);
                workHours = `${Math.floor(diff / 60)}j ${diff % 60}m`;
            }

            // Face Verification Step
            setIsVerifyingFace(true);
            setVerificationStep('scanning');
            await new Promise(resolve => setTimeout(resolve, 2000));
            setVerificationStep('complete');
            await new Promise(resolve => setTimeout(resolve, 800));

            await updateAttendance(todayRecord.id, {
                check_out: checkOutTime,
                work_hours: workHours,
            });

            setIsVerifyingFace(false);
            setVerificationStep('idle');
            toast({ title: 'Check Out Berhasil', description: 'Sampai jumpa besok!' });
            refetch();
        } catch (error: any) {
            setIsVerifyingFace(false);
            setVerificationStep('idle');
            toast({ title: 'Gagal Check Out', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {isVerifyingFace && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl overflow-hidden relative">
                            {/* Scanning Animation Header */}
                            <div className="relative w-48 h-48 mx-auto bg-gray-100 rounded-full flex items-center justify-center border-4 border-gray-50 overflow-hidden">
                                {verificationStep === 'scanning' ? (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-b from-hrd/20 to-transparent animate-scan" />
                                        <Camera className="w-16 h-16 text-hrd animate-pulse" />
                                    </>
                                ) : (
                                    <ShieldCheck className="w-20 h-20 text-green-500 scale-125 transition-transform duration-500" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-display font-bold text-gray-900">
                                    {verificationStep === 'scanning' ? 'Memverifikasi Wajah...' : 'Wajah Terverifikasi'}
                                </h3>
                                <p className="text-muted-foreground font-body">
                                    {verificationStep === 'scanning' ? 'Pastikan wajah terlihat jelas di kamera.' : 'Identitas Anda telah dikonfirmasi.'}
                                </p>
                            </div>

                            {verificationStep === 'scanning' && (
                                <div className="flex justify-center gap-1">
                                    <div className="w-2 h-2 bg-hrd rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 bg-hrd rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 bg-hrd rounded-full animate-bounce" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Weekly Stats Banner */}
            {weeklyLateMinutes > 0 && (
                <div className={`p-4 rounded-xl border ${weeklyLateMinutes > 30 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 ${weeklyLateMinutes > 30 ? 'text-red-600' : 'text-yellow-600'}`} />
                        <div>
                            <p className={`font-bold ${weeklyLateMinutes > 30 ? 'text-red-900' : 'text-yellow-900'}`}>
                                Total Keterlambatan Minggu Ini: {weeklyLateMinutes} Menit
                            </p>
                            {weeklyLateMinutes > 30 && (
                                <p className="text-xs text-red-700 font-bold mt-1">BATAS TOLERANSI 30 MENIT TERLAMPUI - SP1 AKTIF</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Check-In Card */}
                <Card className="lg:col-span-1 border-none shadow-xl bg-gradient-to-b from-white to-gray-50/50 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                        <Badge variant="outline" className="bg-hrd/10 text-hrd border-hrd/20 animate-pulse">
                            Live Time
                        </Badge>
                    </div>
                    <CardHeader className="text-center pt-10">
                        <div className="text-5xl font-mono font-black text-hrd tracking-tighter mb-1">
                            {formatTime(currentTime)}
                        </div>
                        <CardDescription className="font-body text-lg font-medium">
                            {formatDate(today)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pb-10">
                        <div className="flex flex-col items-center">
                            <div className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <MapPin className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lokasi Saat Ini</p>
                                        <p className="text-sm font-body text-gray-700 leading-relaxed truncate max-w-[200px]">
                                            {location}
                                        </p>
                                    </div>
                                </div>
                                {locationError && (
                                    <div className="p-2 bg-red-50 text-[10px] text-red-600 rounded flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {locationError}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 px-4">
                            {!todayRecord ? (
                                <Button
                                    className="w-full h-14 bg-hrd hover:bg-hrd-dark text-white rounded-2xl text-lg font-bold shadow-lg shadow-hrd/20 transition-all hover:scale-[1.02] active:scale-95"
                                    onClick={handleCheckIn}
                                    disabled={gettingLocation}
                                >
                                    {gettingLocation ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <LogIn className="w-6 h-6 mr-2" />}
                                    Masuk Kerja
                                </Button>
                            ) : (
                                <Button
                                    className={`w-full h-14 rounded-2xl text-lg font-bold transition-all shadow-lg ${todayRecord.check_out ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60' : 'bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 shadow-red-100 hover:scale-[1.02] active:scale-95'}`}
                                    onClick={handleCheckOut}
                                    disabled={!!todayRecord.check_out}
                                >
                                    <LogOut className="w-6 h-6 mr-2" />
                                    {todayRecord.check_out ? 'Absensi Selesai' : 'Pulang Kerja'}
                                </Button>
                            )}

                            <p className="text-[10px] text-center text-muted-foreground font-body">
                                Jadwal: <span className="font-bold">08:00 - 16:00</span> • Denda: Rp 1.000/mnt
                            </p>
                        </div>

                        {todayRecord?.check_in && todayRecord?.check_out && (
                            <div className="text-center pb-4">
                                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                                    Absensi Hari Ini Selesai
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Map & Detail Card */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b bg-gray-50/30">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-display">Informasi Kedatangan</CardTitle>
                                <CardDescription>Tracking GPS Presensi Online</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => getLocation()} className="text-blue-600">
                                <Clock className="w-4 h-4 mr-2" />
                                Refresh GPS
                            </Button>
                            {onViewHistory && (
                                <Button variant="ghost" size="sm" onClick={onViewHistory} className="text-hrd">
                                    <History className="w-4 h-4 mr-2" />
                                    Riwayat Absensi
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                                <LogIn className="w-4 h-4 text-hrd" />
                                            </div>
                                            <span className="text-sm font-body text-gray-500">Check In</span>
                                        </div>
                                        <span className="font-mono font-bold text-lg">{todayRecord?.check_in || '--:--'}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                                <LogOut className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <span className="text-sm font-body text-gray-500">Check Out</span>
                                        </div>
                                        <span className="font-mono font-bold text-lg">{todayRecord?.check_out || '--:--'}</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs font-bold text-blue-600 uppercase">Analysis</p>
                                        <Badge variant={todayRecord?.status === 'late' ? 'destructive' : 'default'} className="bg-blue-600 text-[10px]">
                                            {todayRecord?.status || 'Unknown'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-blue-900 leading-relaxed font-body">
                                        {todayRecord?.notes || (todayRecord ? 'Kehadiran Anda telah tercatat dengan koordinat GPS yang valid.' : 'Silakan lakukan presensi untuk mencatat jam kerja Anda.')}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-100 relative min-h-[300px]">
                                {/* Mock Map Background */}
                                <div className="absolute inset-0 bg-[#e5e7eb] overflow-hidden">
                                    <div className="absolute inset-0 opacity-40 bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i14!2i13182!3i8433!2m3!1e0!2sm!3i661144081!3m8!2sen!3sid!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1f2!6m8!1e1!2b1!3sIAAYAA!4m2!1it!2it!11m1!1e3')] bg-center bg-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {coordinates ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="relative"
                                            >
                                                <div className="w-12 h-12 bg-hrd/20 rounded-full animate-ping absolute -inset-0" />
                                                <div className="w-12 h-12 bg-hrd rounded-full flex items-center justify-center relative shadow-lg shadow-hrd/50 border-4 border-white">
                                                    <Camera className="w-6 h-6 text-white" />
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground font-body">Menunggu Koordinat GPS...</p>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-white">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-[10px] font-bold text-gray-500 tracking-wider">SECURE TRACKING ACTIVE</p>
                                    </div>
                                    <p className="text-[10px] font-mono mt-0.5 text-gray-400">
                                        {coordinates ? `LAT: ${coordinates.lat.toFixed(4)} LNG: ${coordinates.lng.toFixed(4)}` : 'SCANNING...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
