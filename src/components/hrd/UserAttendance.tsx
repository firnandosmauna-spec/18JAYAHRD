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
    Loader2,
    ShieldCheck,
    ClipboardEdit,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAttendance, useEmployees } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AttendanceRecord } from '@/lib/supabase';
import { settingsService } from '@/services/settingsService';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";


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
    // Helper to get local YYYY-MM-DD
    const getLocalYYYYMMDD = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = getLocalYYYYMMDD();

    // Helper to get week range
    const getWeekRange = () => {
        const now = new Date();
        const monday = new Date(now);
        // Adjust to Monday of the current week
        const day = now.getDay();
        const diff = now.getDate() - (day === 0 ? 6 : day - 1);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

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
    const [penaltyRate, setPenaltyRate] = useState<number>(0);
    const [attendanceSettings, setAttendanceSettings] = useState<any>(null);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // Out of range check-in states
    const [showReasonDialog, setShowReasonDialog] = useState(false);
    const [pendingCheckInData, setPendingCheckInData] = useState<{
        loc: string;
        status: string;
        distance: number;
    } | null>(null);
    const [checkInReason, setCheckInReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Manual request states
    const [showManualDialog, setShowManualDialog] = useState(false);
    const [manualType, setManualType] = useState<'outside_hours' | 'early_leave' | 'external_activity'>('external_activity');
    const [manualReason, setManualReason] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await settingsService.getAttendanceSettings();
                setAttendanceSettings(settings);
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

    // Helper to get work start minutes based on day
    const getWorkStartMinutes = (dateStr: string) => {
        if (!attendanceSettings) return 8 * 60; // Fallback
        
        // Timezone-safe day detection
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        const startTime = dayOfWeek === 6 ? attendanceSettings.work_start_time_saturday : attendanceSettings.work_start_time_weekday;
        
        if (!startTime || typeof startTime !== 'string' || !startTime.includes(':')) {
            return 8 * 60; // Default 08:00
        }
        
        const [h, m] = startTime.split(':').map(Number);
        return h * 60 + m;
    };

    const weeklyLateMinutes = weeklyAttendance.reduce((acc, record) => {
        if (record.status === 'late' && record.check_in) {
            const [h, m] = record.check_in.split(':').map(Number);
            const checkInMinutes = h * 60 + m;
            const workStartMinutes = getWorkStartMinutes(record.date);
            const tolerance = attendanceSettings?.attendance_late_tolerance || 5;
            const lateThreshold = workStartMinutes + tolerance;
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
    const getLocation = (): Promise<{ address: string | null; lat: number | null; lng: number | null }> => {
        setGettingLocation(true);
        setLocationError(null);

        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                const error = 'Geolocation is not supported';
                setLocationError(error);
                setGettingLocation(false);
                resolve({ address: null, lat: null, lng: null });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoordinates({ lat: latitude, lng: longitude });

                    try {
                        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`);
                        const data = await response.json();
                        if (data) {
                            const addr = [data.locality, data.city, data.principalSubdivision].filter(Boolean).join(', ');
                            setLocation(addr || 'Lokasi Terdeteksi');
                            setGettingLocation(false);
                            resolve({ address: addr || 'Lokasi Terdeteksi', lat: latitude, lng: longitude });
                        } else {
                            const latlng = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                            setLocation(latlng);
                            setGettingLocation(false);
                            resolve({ address: latlng, lat: latitude, lng: longitude });
                        }
                    } catch (e) {
                        const latlng = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        setLocation(latlng);
                        setGettingLocation(false);
                        resolve({ address: latlng, lat: latitude, lng: longitude });
                    }
                },
                (error) => {
                    const msg = 'Gagal mengakses GPS. Pastikan izin lokasi aktif.';
                    setLocationError(msg);
                    setLocation('Lokasi tidak tersedia');
                    setGettingLocation(false);
                    resolve({ address: null, lat: null, lng: null });
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // distance in meters
    };

    useEffect(() => {
        getLocation();
    }, []);

    const handleCheckIn = async () => {
        console.log('Checking In...', { employee_id: user?.employee_id, loading, todayRecord });
        if (!user?.employee_id) {
            toast({ title: 'Akun Belum Terhubung', description: 'Hubungi Admin HRD.', variant: 'destructive' });
            return;
        }

        // Prevent duplicate check-in while loading or if record already exists
        if (loading || todayRecord) {
            console.log('Check-in blocked:', { loading, todayRecord });
            toast({ title: 'Info', description: 'Data absensi sedang diproses atau sudah ada.', variant: 'default' });
            return;
        }

        try {
            // 1. Fetch Attendance Settings
            const settings = await settingsService.getAttendanceSettings();
            const officeLat = settings.office_latitude || -0.0263;
            const officeLng = settings.office_longitude || 109.3425;
            const officeRadius = settings.office_radius || 100;

            // 2. Get Location
            const locResult = await getLocation();
            const loc = locResult.address || location;
            const currentLat = locResult.lat || coordinates?.lat;
            const currentLng = locResult.lng || coordinates?.lng;

            if (!currentLat || !currentLng) {
                toast({ title: 'Gagal Mendapatkan Lokasi', description: 'Pastikan izin GPS aktif.', variant: 'destructive' });
                return;
            }

            // 3. Validate Distance
            const distance = calculateDistance(
                currentLat,
                currentLng,
                officeLat,
                officeLng
            );

            // 4. Determine Lateness status
            const now = new Date();
            const workStartMinutes = getWorkStartMinutes(today);
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const tolerance = attendanceSettings?.attendance_late_tolerance || 5;
            const isLate = currentMinutes > (workStartMinutes + tolerance);
            const status = isLate ? 'late' : 'present';

            // Check if it's too early to clock in (start time - 30 mins)
            const earliestAllowableMinutes = workStartMinutes - 60; // Allowing 60 mins before to be safe
            if (currentMinutes < earliestAllowableMinutes) {
                const startTimeStr = now.getDay() === 6 ? attendanceSettings.work_start_time_saturday : attendanceSettings.work_start_time_weekday;
                toast({
                    title: 'Terlalu Awal',
                    description: `Absensi baru bisa dilakukan 1 jam sebelum jam masuk (${startTimeStr || '08:00'}).`,
                    variant: 'destructive'
                });
                return;
            }

            if (distance > officeRadius) {
                toast({
                    title: 'Di Luar Jangkauan',
                    description: `Jarak Anda ${Math.round(distance)}m dari kantor (Maksimal ${officeRadius}m). Gunakan fitur "Absen Manual" jika Anda sedang dinas luar.`,
                    variant: 'destructive'
                });
                return;
            }

            await processCheckIn(loc, status, distance, '', currentLat, currentLng);
        } catch (error: any) {
            toast({ title: 'Gagal Check In', description: error.message, variant: 'destructive' });
        }
    };

    const processCheckIn = async (loc: string, status: string, distance: number, reason: string = '', lat?: number | null, lng?: number | null) => {
        setIsSubmitting(true);
        try {
            const now = new Date();
            const checkInTime = now.toTimeString().slice(0, 5);

            // Recalculate late minutes for notes
            const workStartMinutes = getWorkStartMinutes(today);
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const isLate = status === 'late';
            const tolerance = attendanceSettings?.attendance_late_tolerance || 5;
            const lateMinutes = isLate ? Math.max(0, currentMinutes - (workStartMinutes + tolerance)) : 0;
            const penalty = lateMinutes * (penaltyRate || 1000);

            // SP1 Check
            const newWeeklyLateMinutes = weeklyLateMinutes + lateMinutes;
            const isSP1 = newWeeklyLateMinutes > 30;

            const notes = [];
            if (isLate) notes.push(`Terlambat ${lateMinutes}m (Potongan Rp ${penalty.toLocaleString('id-ID')})`);
            if (isSP1) notes.push(`⚠️ SP1 TRIGGERED (Total ${newWeeklyLateMinutes}m/minggu)`);
            if (reason) notes.push(`[LUAR JANGKAUAN] ${reason}`);

            await addAttendance({
                employee_id: user!.employee_id!,
                date: today,
                check_in: checkInTime,
                status: status as any,
                location: loc,
                latitude: lat || coordinates?.lat,
                longitude: lng || coordinates?.lng,
                notes: notes.join('. ')
            });

            if (isSP1) {
                toast({
                    title: 'PERINGATAN SP1',
                    description: `Total keterlambatan minggu ini: ${newWeeklyLateMinutes} menit. Melebihi batas 30 menit.`,
                    variant: 'destructive',
                    duration: 10000
                });
            } else {
                toast({ title: 'Check In Berhasil', description: `Presensi berhasil dicatat.` });
            }

            refetch();
            setShowReasonDialog(false);
            setCheckInReason('');
            setPendingCheckInData(null);
        } catch (error: any) {
            toast({ title: 'Gagal Check In', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        if (!todayRecord?.id) return;
        if (todayRecord.check_out) {
            toast({ title: 'Sudah Absen Pulang', description: 'Anda telah menyelesaikan absensi hari ini.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const now = new Date();
            const checkOutTime = now.toTimeString().slice(0, 5);

            let workHours = '';
            if (todayRecord.check_in && typeof todayRecord.check_in === 'string' && todayRecord.check_in.includes(':')) {
                const [inH, inM] = todayRecord.check_in.split(':').map(Number);
                const [outH, outM] = checkOutTime.split(':').map(Number);
                const diff = (outH * 60 + outM) - (inH * 60 + inM);
                workHours = `${Math.floor(diff / 60)}j ${diff % 60}m`;
            }

            await updateAttendance(todayRecord.id, {
                check_out: checkOutTime,
                work_hours: workHours,
            });

            toast({ title: 'Check Out Berhasil', description: 'Sampai jumpa besok!' });
            refetch();
        } catch (error: any) {
            toast({ title: 'Gagal Check Out', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualRequest = async () => {
        if (!user?.employee_id) return;
        if (!manualReason.trim()) {
            toast({ title: 'Alasan Wajib Diisi', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date();
            const timeStr = now.toTimeString().slice(0, 5);
            
            // If a record already exists for today, we MUST update it to avoid UNIQUE constraint violation
            if (todayRecord) {
                await updateAttendance(todayRecord.id, {
                    check_in: manualType === 'outside_hours' ? timeStr : (todayRecord.check_in || timeStr),
                    check_out: manualType === 'early_leave' ? timeStr : (todayRecord.check_out || null),
                    is_manual: true,
                    manual_status: 'pending',
                    manual_reason: manualReason,
                    notes: `${todayRecord.notes || ''}. [MANUAL REQUEST: ${manualType}] ${manualReason}`.trim()
                });
            } else {
                // Otherwise create a new record (e.g. they haven't checked in at all)
                await addAttendance({
                    employee_id: user.employee_id,
                    date: today,
                    check_in: timeStr,
                    check_out: manualType === 'early_leave' ? timeStr : null,
                    status: 'present',
                    is_manual: true,
                    manual_status: 'pending',
                    manual_reason: manualReason,
                    notes: `[MANUAL REQUEST: ${manualType}] ${manualReason}`
                });
            }

            toast({ 
                title: 'Permintaan Dikirim', 
                description: 'Permintaan absensi manual Anda sedang menunggu persetujuan manajer.' 
            });
            setShowManualDialog(false);
            setManualReason('');
            refetch();
        } catch (error: any) {
            toast({ title: 'Gagal Mengirim Permintaan', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 translate-no" translate="no">

            {/* Weekly Stats Banner */}
            {weeklyLateMinutes > 0 && (
                <div className={`p-4 rounded-xl border ${weeklyLateMinutes > 30 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 ${weeklyLateMinutes > 30 ? 'text-red-600' : 'text-yellow-600'}`} />
                        <div>
                            <p className={`font-bold ${weeklyLateMinutes > 30 ? 'text-red-900' : 'text-yellow-900'}`}>
                                <span>Total Keterlambatan Minggu Ini: {weeklyLateMinutes} Menit</span>
                            </p>
                            {weeklyLateMinutes > 30 && (
                                <p className="text-xs text-red-700 font-bold mt-1">
                                    <span>BATAS TOLERANSI 30 MENIT TERLAMPUI - SP1 AKTIF</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Manual Request Banner */}
            {todayRecord?.manual_status === 'pending' && (
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-center gap-3 animate-pulse">
                    <ShieldCheck className="w-5 h-5 text-orange-600" />
                    <div>
                        <p className="font-bold text-orange-900">ABSEN BELUM MASUK</p>
                        <p className="text-xs text-orange-700">Permintaan absensi manual Anda sedang menunggu persetujuan Administrator. Silakan cek kembali nanti.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Check-In Card */}
                <Card className="lg:col-span-1 border-none shadow-xl bg-gradient-to-b from-white to-gray-50/50 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                        <Badge variant="outline" className="bg-hrd/10 text-hrd border-hrd/20 animate-pulse">
                            <span>Live Time</span>
                        </Badge>
                    </div>
                    <CardHeader className="text-center pt-10">
                        <div className="text-5xl font-mono font-black text-hrd tracking-tighter mb-1">
                            <span>{formatTime(currentTime)}</span>
                        </div>
                        <CardDescription className="font-body text-lg font-medium">
                            <span>{formatDate(today)}</span>
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
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest"><span>Lokasi Saat Ini</span></p>
                                        <p className="text-sm font-body text-gray-700 leading-relaxed truncate max-w-[200px]">
                                            <span>{location}</span>
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
                                    disabled={gettingLocation || loading || isSubmitting || !!todayRecord}
                                >
                                    {gettingLocation || loading || isSubmitting ? (
                                        <Loader2 key="loader-in" className="w-6 h-6 animate-spin mr-2" />
                                    ) : (
                                        <LogIn key="login-icon" className="w-6 h-6 mr-2" />
                                    )}
                                    <span>Masuk Kerja</span>
                                </Button>
                            ) : (
                                <Button
                                    className={`w-full h-14 rounded-2xl text-lg font-bold transition-all shadow-lg ${todayRecord.check_out ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60' : 'bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 shadow-red-100 hover:scale-[1.02] active:scale-95'}`}
                                    onClick={handleCheckOut}
                                    disabled={isSubmitting || !!todayRecord.check_out}
                                >
                                    {isSubmitting ? (
                                        <Loader2 key="loader-out" className="w-6 h-6 animate-spin mr-2" />
                                    ) : (
                                        <LogOut key="logout-icon" className="w-6 h-6 mr-2" />
                                    )}
                                    <span>{todayRecord.check_out ? 'Absensi Selesai' : 'Pulang Kerja'}</span>
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                className="w-full h-10 rounded-xl text-sm font-semibold border-hrd/20 text-hrd hover:bg-hrd/5"
                                onClick={() => setShowManualDialog(true)}
                            >
                                <ClipboardEdit className="w-4 h-4 mr-2" />
                                Absen Manual / Luar Kantor
                            </Button>

                            <p className="text-[10px] text-center text-muted-foreground font-body">
                                Jadwal: <span className="font-bold">{attendanceSettings ? (new Date().getDay() === 6 ? attendanceSettings.work_start_time_saturday : attendanceSettings.work_start_time_weekday) : '07:30'} - {attendanceSettings ? (new Date().getDay() === 6 ? attendanceSettings.work_end_time_saturday : attendanceSettings.work_end_time_weekday) : '17:00'}</span> • Denda: Rp {(penaltyRate || 1000).toLocaleString('id-ID')}/mnt
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
                                            <span className="text-sm font-body text-gray-500"><span>Check In</span></span>
                                        </div>
                                        <span className="font-mono font-bold text-lg"><span>{todayRecord?.check_in || '--:--'}</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                                <LogOut className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <span className="text-sm font-body text-gray-500"><span>Check Out</span></span>
                                        </div>
                                        <span className="font-mono font-bold text-lg"><span>{todayRecord?.check_out || '--:--'}</span></span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-2xl border ${todayRecord?.manual_status === 'pending' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50/50 border-blue-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className={`text-xs font-bold uppercase ${todayRecord?.manual_status === 'pending' ? 'text-orange-600' : 'text-blue-600'}`}><span>Analysis</span></p>
                                        <Badge 
                                            variant={todayRecord?.status === 'late' ? 'destructive' : 'default'} 
                                            className={`${todayRecord?.manual_status === 'pending' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-blue-600'} text-[10px]`}
                                        >
                                            <span>{todayRecord?.manual_status === 'pending' ? 'WAITING APPROVAL' : (todayRecord?.status || 'Unknown')}</span>
                                        </Badge>
                                    </div>
                                    <p className={`text-sm leading-relaxed font-body ${todayRecord?.manual_status === 'pending' ? 'text-orange-900 font-bold' : 'text-blue-900'}`}>
                                        <span>
                                            {todayRecord?.manual_status === 'pending' 
                                                ? '🔴 ABSEN BELUM MASUK: Permintaan manual Anda sedang menunggu persetujuan Administrator/Manager.' 
                                                : (todayRecord?.notes || (todayRecord ? 'Kehadiran Anda telah tercatat dengan koordinat GPS yang valid.' : 'Silakan lakukan presensi untuk mencatat jam kerja Anda.'))
                                            }
                                        </span>
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
                                                    <MapPin className="w-6 h-6 text-white" />
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground font-body"><span>Menunggu Koordinat GPS...</span></p>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-white">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-[10px] font-bold text-gray-500 tracking-wider"><span>SECURE TRACKING ACTIVE</span></p>
                                    </div>
                                    <p className="text-[10px] font-mono mt-0.5 text-gray-400">
                                        <span>{coordinates ? `LAT: ${coordinates.lat.toFixed(4)} LNG: ${coordinates.lng.toFixed(4)}` : 'SCANNING...'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reason Dialog for Out of Range Check-In */}
            <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Absen di Luar Jangkauan</DialogTitle>
                        <DialogDescription>
                            Anda terdeteksi berada {pendingCheckInData ? Math.round(pendingCheckInData.distance) : 0}m dari kantor.
                            Mohon berikan alasan mengapa Anda melakukan absensi di luar area kantor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Alasan Absensi <span className="text-red-500">*</span></Label>
                            <Textarea
                                placeholder="Contoh: Sedang tugas di proyek A, GPS tidak akurat, dll."
                                value={checkInReason}
                                onChange={(e) => setCheckInReason(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReasonDialog(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                if (pendingCheckInData && checkInReason.trim()) {
                                    processCheckIn(
                                        pendingCheckInData.loc,
                                        pendingCheckInData.status,
                                        pendingCheckInData.distance,
                                        checkInReason
                                    );
                                } else {
                                    toast({ title: 'Alasan Wajib Diisi', variant: 'destructive' });
                                }
                            }}
                            disabled={isSubmitting || !checkInReason.trim()}
                            className="bg-hrd hover:bg-hrd-dark"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                            Kirim & Absen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Attendance Request Dialog */}
            <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pengaturan Absen Manual</DialogTitle>
                        <DialogDescription>
                            Gunakan fitur ini jika Anda bekerja di luar jam kantor, dinas luar, atau perlu pulang lebih awal karena kegiatan perusahaan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Jenis Kehadiran</Label>
                            <Select value={manualType} onValueChange={(v: any) => setManualType(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="external_activity">Kegiatan Luar / Dinas</SelectItem>
                                    <SelectItem value="outside_hours">Luar Jam Kerja / Lembur</SelectItem>
                                    <SelectItem value="early_leave">Pulang Lebih Awal (Tugas Luar)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Alasan & Keterangan <span className="text-red-500">*</span></Label>
                            <Textarea
                                placeholder="Jelaskan alasan atau kegiatan Anda..."
                                value={manualReason}
                                onChange={(e) => setManualReason(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <Alert className="bg-blue-50 border-blue-100">
                            <ShieldCheck className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-700">
                                Absensi manual akan masuk ke sistem sebagai <strong>Pending</strong> dan memerlukan persetujuan Manajer/Supervisor.
                            </AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowManualDialog(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleManualRequest}
                            disabled={isSubmitting || !manualReason.trim()}
                            className="bg-hrd hover:bg-hrd-dark"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                            Kirim Permintaan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
