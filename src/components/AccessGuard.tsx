import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService } from '@/services/settingsService';
import { AttendanceSettings, GeneralSettings } from '@/types/settings';
import { Loader2, Lock, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';

export function AccessGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, logout } = useAuth();
    const [settings, setSettings] = useState<AttendanceSettings | null>(null);
    const [general, setGeneral] = useState<GeneralSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRestricted, setIsRestricted] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const [attSettings, genSettings] = await Promise.all([
                    settingsService.getAttendanceSettings(),
                    settingsService.getGeneralSettings()
                ]);

                setSettings(attSettings);
                setGeneral(genSettings);

                // If not restricted, just allow
                if (!attSettings.restrict_off_hours_access) {
                    setIsRestricted(false);
                    setLoading(false);
                    return;
                }

                // Admins are never restricted
                if (user.role === 'Administrator') {
                    setIsRestricted(false);
                    setLoading(false);
                    return;
                }

                const now = new Date();
                const day = now.getDay(); // 0 = Sunday, 1-5 = Mon-Fri, 6 = Saturday
                const currentTime = now.getHours() * 60 + now.getMinutes();

                let startTimeStr = attSettings.work_start_time_weekday;
                let endTimeStr = attSettings.work_end_time_weekday;

                if (day === 6) { // Saturday
                    startTimeStr = attSettings.work_start_time_saturday;
                    endTimeStr = attSettings.work_end_time_saturday;
                } else if (day === 0) { // Sunday
                    // If Sunday and no specific hours, we can assume it's fully restricted or use Saturday hours
                    // Let's assume Saturday end time for Sunday as a fallback or just block
                    setIsRestricted(true);
                    setLoading(false);
                    return;
                }

                const [startH, startM] = startTimeStr.split(':').map(Number);
                const [endH, endM] = endTimeStr.split(':').map(Number);

                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                if (currentTime < startMinutes || currentTime > endMinutes) {
                    setIsRestricted(true);
                } else {
                    setIsRestricted(false);
                }
            } catch (error) {
                console.error("Access Check Error:", error);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
        // Check every minute
        const interval = setInterval(checkAccess, 60000);
        return () => clearInterval(interval);
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (isRestricted && user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-body selection:bg-red-500/30">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse" />
                        <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Lock className="h-12 w-12 text-red-500" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-display font-bold tracking-tight">Akses Dibatasi</h1>
                        <p className="text-slate-400 leading-relaxed">
                            Maaf, {user.email}. Aplikasi <span className="text-white font-bold">{general?.company_name || 'PT. DELAPAN BELAS JAYA'}</span> hanya dapat diakses pada jam kerja operasional.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between text-sm py-2 border-b border-slate-700/50">
                            <span className="text-slate-400">Jam Operasional</span>
                            <span className="text-emerald-400 font-mono">
                                {new Date().getDay() === 6
                                    ? `${settings?.work_start_time_saturday} - ${settings?.work_end_time_saturday}`
                                    : `${settings?.work_start_time_weekday} - ${settings?.work_end_time_weekday}`}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2">
                            <span className="text-slate-400">Status Saat Ini</span>
                            <span className="text-red-400 font-bold flex items-center gap-1.5">
                                <ShieldAlert className="h-3.5 w-3.5" /> DI LUAR JAM KERJA
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <Button
                            variant="destructive"
                            className="w-full h-12 rounded-xl text-sm font-bold tracking-wide"
                            onClick={() => logout()}
                        >
                            KELUAR DARI AKUN
                        </Button>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Hubungi Administrator jika ini adalah kesalahan
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
