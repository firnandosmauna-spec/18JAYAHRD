import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsService } from "@/services/settingsService";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calendar, ShieldCheck, Clock, FileText } from "lucide-react";
import { sopService } from "@/services/sopService";
import { GeneralSettings, DEFAULT_GENERAL_SETTINGS, AttendanceSettings, DEFAULT_ATTENDANCE_SETTINGS, LeaveSettings, DEFAULT_LEAVE_SETTINGS, PayrollSettings, DEFAULT_PAYROLL_SETTINGS } from "@/types/settings";
import { UserManagement } from "@/components/hrd/UserManagement";
import { RewardTypeManagement } from "@/components/hrd/RewardTypeManagement";
import { Textarea } from "@/components/ui/textarea";
import { Award } from "lucide-react";

const generalSchema = z.object({
    company_name: z.string().min(1, "Nama perusahaan wajib diisi"),
    company_email: z.string().email("Email tidak valid"),
    company_address: z.string().optional(),
    company_whatsapp: z.string().optional(),
});

const attendanceSchema = z.object({
    attendance_late_penalty: z.coerce.number().min(0, "Harus berupa angka positif"),
    attendance_sp1_threshold: z.coerce.number().min(0, "Harus berupa angka positif"),
    work_start_time_weekday: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam tidak valid (HH:mm)"),
    work_end_time_weekday: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam tidak valid (HH:mm)"),
    work_start_time_saturday: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam tidak valid (HH:mm)"),
    work_end_time_saturday: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam tidak valid (HH:mm)"),
    admin_attendance_required: z.boolean(),
    attendance_late_tolerance: z.coerce.number().min(0, "Harus berupa angka positif"),
    office_latitude: z.coerce.number(),
    office_longitude: z.coerce.number(),
    office_radius: z.coerce.number().min(1, "Radius minimal 1 meter"),
    office_wifi_ssid: z.string().optional(),
    is_auto_nik: z.boolean(),
});

const leaveSchema = z.object({
    leave_annual_quota: z.coerce.number().min(0, "Harus berupa angka positif"),
    leave_reset_month: z.coerce.number().min(1).max(12),
});

const payrollSchema = z.object({
    payroll_allowance_meal: z.coerce.number().min(0, "Harus berupa angka positif"),
    payroll_allowance_gasoline: z.coerce.number().min(0, "Harus berupa angka positif"),
    payroll_bpjs_rate: z.coerce.number().min(0, "Harus berupa angka positif"),
    payroll_allowance_thr: z.coerce.number().min(0, "Harus berupa angka positif"),
    payroll_deduction_absent: z.coerce.number().min(0, "Harus berupa angka positif"),
    payroll_schedule_day: z.coerce.number().min(1, "Hari minimal 1").max(28, "Hari maksimal 28 (untuk keamanan bulan Februari)"),
    is_automatic_payroll: z.boolean(),
    payroll_reward_perfect_attendance: z.coerce.number().min(0, "Harus berupa angka positif"),
    payroll_reward_target_achievement: z.coerce.number().min(0, "Harus berupa angka positif"),
});

export default function SettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sopTitle, setSopTitle] = useState("");
    const [sopContent, setSopContent] = useState("");

    const generalForm = useForm<GeneralSettings>({
        resolver: zodResolver(generalSchema),
        defaultValues: DEFAULT_GENERAL_SETTINGS,
    });

    const attendanceForm = useForm<AttendanceSettings>({
        resolver: zodResolver(attendanceSchema),
        defaultValues: DEFAULT_ATTENDANCE_SETTINGS,
    });

    const leaveForm = useForm<LeaveSettings>({
        resolver: zodResolver(leaveSchema),
        defaultValues: DEFAULT_LEAVE_SETTINGS,
    });

    const payrollForm = useForm<PayrollSettings>({
        resolver: zodResolver(payrollSchema),
        defaultValues: DEFAULT_PAYROLL_SETTINGS,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const [generalData, attendanceData, leaveData, payrollData] = await Promise.all([
                settingsService.getGeneralSettings(),
                settingsService.getAttendanceSettings(),
                settingsService.getLeaveSettings(),
                settingsService.getPayrollSettings()
            ]);
            generalForm.reset(generalData);
            attendanceForm.reset(attendanceData);
            leaveForm.reset(leaveData);
            payrollForm.reset(payrollData);

            // Load SOP
            const sopData = await sopService.getActiveSOP();
            if (sopData) {
                setSopTitle(sopData.title);
                setSopContent(sopData.content);
            }
        } catch (error) {
            console.error("Failed to load settings", error);
            toast({
                title: "Error",
                description: "Gagal memuat pengaturan.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const onGeneralSubmit = async (data: GeneralSettings) => {
        try {
            setSaving(true);
            const updates = [
                { key: 'company_name', value: data.company_name, description: 'Nama resmi perusahaan' },
                { key: 'company_email', value: data.company_email, description: 'Email utama HRD' },
                { key: 'company_address', value: data.company_address, description: 'Alamat lengkap kantor' },
                { key: 'company_whatsapp', value: data.company_whatsapp, description: 'Nomor WhatsApp resmi' }
            ];

            await settingsService.updateSettings(updates);

            toast({
                title: "Sukses",
                description: "Data perusahaan berhasil disimpan.",
            });
        } catch (error) {
            console.error("Failed to save general settings", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan data perusahaan.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const onAttendanceSubmit = async (data: AttendanceSettings) => {
        try {
            setSaving(true);
            const updates = [
                { key: 'attendance_late_penalty', value: data.attendance_late_penalty, description: 'Potongan gaji per menit keterlambatan (IDR)' },
                { key: 'attendance_sp1_threshold', value: data.attendance_sp1_threshold, description: 'Batas akumulasi keterlambatan per minggu sebelum SP1 (menit)' },
                { key: 'work_start_time_weekday', value: data.work_start_time_weekday, description: 'Jam masuk kerja (Senin-Jumat)' },
                { key: 'work_end_time_weekday', value: data.work_end_time_weekday, description: 'Jam pulang kerja (Senin-Jumat)' },
                { key: 'work_start_time_saturday', value: data.work_start_time_saturday, description: 'Jam masuk kerja (Sabtu)' },
                { key: 'work_end_time_saturday', value: data.work_end_time_saturday, description: 'Jam pulang kerja (Sabtu)' },
                { key: 'admin_attendance_required', value: data.admin_attendance_required, description: 'Wajibkan absensi untuk akun Admin' },
                { key: 'attendance_late_tolerance', value: data.attendance_late_tolerance, description: 'Toleransi keterlambatan (menit)' },
                { key: 'office_latitude', value: data.office_latitude, description: 'Latitude lokasi kantor' },
                { key: 'office_longitude', value: data.office_longitude, description: 'Longitude lokasi kantor' },
                { key: 'office_radius', value: data.office_radius, description: 'Radius batas absensi (meter)' },
                { key: 'office_wifi_ssid', value: data.office_wifi_ssid || '', description: 'SSID WiFi Kantor' },
                { key: 'is_auto_nik', value: data.is_auto_nik, description: 'Gunakan NIK Otomatis untuk Karyawan Baru' }
            ];

            await settingsService.updateSettings(updates);

            toast({
                title: "Sukses",
                description: "Pengaturan absensi berhasil disimpan.",
            });
        } catch (error) {
            console.error("Failed to save attendance settings", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan pengaturan absensi.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const onLeaveSubmit = async (data: LeaveSettings) => {
        try {
            setSaving(true);
            const updates = [
                { key: 'leave_annual_quota', value: data.leave_annual_quota, description: 'Jatah cuti tahunan standar' },
                { key: 'leave_reset_month', value: data.leave_reset_month, description: 'Bulan reset jatah cuti otomatis' }
            ];

            await settingsService.updateSettings(updates);

            toast({
                title: "Sukses",
                description: "Pengaturan cuti berhasil disimpan.",
            });
        } catch (error) {
            console.error("Failed to save leave settings", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan pengaturan cuti.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const onPayrollSubmit = async (data: PayrollSettings) => {
        try {
            setSaving(true);
            const updates = [
                { key: 'payroll_allowance_meal', value: data.payroll_allowance_meal, description: 'Uang makan harian' },
                { key: 'payroll_allowance_gasoline', value: data.payroll_allowance_gasoline, description: 'Uang bensin harian' },
                { key: 'payroll_bpjs_rate', value: data.payroll_bpjs_rate, description: 'Potongan BPJS bulanan' },
                { key: 'payroll_allowance_thr', value: data.payroll_allowance_thr, description: 'Tunjangan Hari Raya' },
                { key: 'payroll_deduction_absent', value: data.payroll_deduction_absent, description: 'Potongan per hari absen (Rumus: (P+M+G)/26)' },
                { key: 'payroll_schedule_day', value: data.payroll_schedule_day, description: 'Tanggal penggajian rutin' },
                { key: 'is_automatic_payroll', value: data.is_automatic_payroll, description: 'Otomatisasi pemrosesan payroll' },
                { key: 'payroll_reward_perfect_attendance', value: data.payroll_reward_perfect_attendance, description: 'Reward Kehadiran Sempurna (100%)' },
                { key: 'payroll_reward_target_achievement', value: data.payroll_reward_target_achievement, description: 'Reward Pencapaian Target (100%)' }
            ];

            await settingsService.updateSettings(updates);

            toast({
                title: "Sukses",
                description: "Pengaturan payroll berhasil disimpan.",
            });
        } catch (error) {
            console.error("Failed to save payroll settings", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan pengaturan payroll.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const onSOPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await sopService.saveSOP(sopTitle, sopContent);
            toast({
                title: "Sukses",
                description: "SOP perusahaan berhasil diperbarui.",
            });
        } catch (error: any) {
            console.error("Failed to save SOP", error);
            toast({
                title: "Error",
                description: error.message || "Gagal menyimpan SOP.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
            </div>

            <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:w-[850px] mb-8">
                    <TabsTrigger value="general">Umum</TabsTrigger>
                    <TabsTrigger value="users">Pengguna</TabsTrigger>
                    <TabsTrigger value="attendance">Absensi</TabsTrigger>
                    <TabsTrigger value="leave">Cuti/Izin</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                    <TabsTrigger value="reward">Reward</TabsTrigger>
                    <TabsTrigger value="sop">SOP</TabsTrigger>
                    <TabsTrigger value="accounting">Akunting</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="font-display">Pengaturan Umum</CardTitle>
                            <CardDescription className="font-body">
                                Konfigurasi identitas perusahaan dan operasional dasar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="font-body">Nama Perusahaan</Label>
                                        <Input
                                            placeholder="HRD18 JAYATEMPO"
                                            className="font-body"
                                            {...generalForm.register("company_name")}
                                        />
                                        {generalForm.formState.errors.company_name && (
                                            <p className="text-xs text-red-500">{generalForm.formState.errors.company_name.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-body">Email HRD Utama</Label>
                                        <Input
                                            placeholder="hrd@jayatempo.com"
                                            className="font-body"
                                            {...generalForm.register("company_email")}
                                        />
                                        {generalForm.formState.errors.company_email && (
                                            <p className="text-xs text-red-500">{generalForm.formState.errors.company_email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-body">No. WA (WhatsApp)</Label>
                                        <Input
                                            placeholder="628123456789"
                                            className="font-body font-mono"
                                            {...generalForm.register("company_whatsapp")}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Gunakan format internasional (contoh: 628...)</p>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="font-body">Alamat Kantor</Label>
                                        <Textarea
                                            placeholder="Jl. Contoh No. 123, Jakarta"
                                            className="font-body resize-none min-h-[80px]"
                                            {...generalForm.register("company_address")}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={saving} className="bg-hrd hover:bg-hrd-dark font-body">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Data Perusahaan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <UserManagement />
                </TabsContent>

                <TabsContent value="attendance">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-orange-50/30">
                            <CardTitle className="font-display text-orange-800">Aturan Kehadiran</CardTitle>
                            <CardDescription className="font-body">
                                Aturan pemotongan gaji, sanksi keterlambatan, dan penomoran karyawan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <form onSubmit={attendanceForm.handleSubmit(onAttendanceSubmit)} className="space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-blue-500 pl-3">Jam Kerja: Senin - Jumat</h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Jam Masuk</Label>
                                                <Input
                                                    type="time"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("work_start_time_weekday")}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Jam Pulang</Label>
                                                <Input
                                                    type="time"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("work_end_time_weekday")}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-orange-500 pl-3">Jam Kerja: Sabtu</h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Jam Masuk</Label>
                                                <Input
                                                    type="time"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("work_start_time_saturday")}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Jam Pulang</Label>
                                                <Input
                                                    type="time"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("work_end_time_saturday")}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-amber-500 pl-3">Pengaturan Penomoran & Admin</h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="font-body text-amber-900">NIK Otomatis</Label>
                                                    <p className="text-[10px] text-amber-700">Buat NIK otomatis berdasarkan tanggal masuk.</p>
                                                </div>
                                                <Switch
                                                    checked={attendanceForm.watch("is_auto_nik")}
                                                    onCheckedChange={(val) => attendanceForm.setValue("is_auto_nik", val)}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="font-body text-amber-900">Wajibkan Absensi Admin</Label>
                                                    <p className="text-[10px] text-amber-700">Jika dinonaktifkan, Admin dapat melewati blokir.</p>
                                                </div>
                                                <Switch
                                                    checked={attendanceForm.watch("admin_attendance_required")}
                                                    onCheckedChange={(val) => attendanceForm.setValue("admin_attendance_required", val)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-blue-600 pl-3">Geofencing & WiFi</h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Latitude Kantor</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("office_latitude")}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Longitude Kantor</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("office_longitude")}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Radius Absensi (Meter)</Label>
                                                <Input
                                                    type="number"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("office_radius")}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">SSID WiFi Kantor (Opsional)</Label>
                                                <Input
                                                    className="font-mono bg-white"
                                                    placeholder="Contoh: MyOfficeWiFi"
                                                    {...attendanceForm.register("office_wifi_ssid")}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 border-l-4 border-gray-400 pl-3">Sanksi & Denda</h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Denda Keterlambatan (Per Menit)</Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-400">Rp</span>
                                                    <Input
                                                        type="number"
                                                        className="font-mono bg-white"
                                                        {...attendanceForm.register("attendance_late_penalty")}
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Threshold SP1 (Menit/Minggu)</Label>
                                                <Input
                                                    type="number"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("attendance_sp1_threshold")}
                                                />
                                            </div>
                                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                <Label className="font-body text-gray-700">Toleransi Keterlambatan (Menit)</Label>
                                                <Input
                                                    type="number"
                                                    className="font-mono bg-white"
                                                    {...attendanceForm.register("attendance_late_tolerance")}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3 items-start">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Loader2 className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-orange-800">Info Aturan</p>
                                        <p className="text-xs text-orange-700 mt-0.5">Potongan gaji akan dihitung otomatis pada saat penggajian (Payroll) berdasarkan record absensi harian.</p>
                                    </div>
                                </div>

                                <Button type="submit" disabled={saving} className="bg-hrd hover:bg-hrd-dark rounded-xl h-11 px-8 font-body">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Konfigurasi
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leave">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-blue-50/30">
                            <CardTitle className="font-display text-blue-800">Aturan Cuti & Izin</CardTitle>
                            <CardDescription className="font-body">
                                Konfigurasi jatah cuti tahunan dan reset otomatis.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <form onSubmit={leaveForm.handleSubmit(onLeaveSubmit)} className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                        <Label className="font-body text-gray-700">Jatah Cuti Tahunan Standar</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="font-mono bg-white"
                                                {...leaveForm.register("leave_annual_quota")}
                                            />
                                            <span className="text-sm font-bold text-gray-400">Hari</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                        <Label className="font-body text-gray-700">Bulan Reset Jatah Cuti</Label>
                                        <Select
                                            value={leaveForm.watch("leave_reset_month").toString()}
                                            onValueChange={(val) => leaveForm.setValue("leave_reset_month", parseInt(val))}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Januari</SelectItem>
                                                <SelectItem value="2">Februari</SelectItem>
                                                <SelectItem value="3">Maret</SelectItem>
                                                <SelectItem value="4">April</SelectItem>
                                                <SelectItem value="5">Mei</SelectItem>
                                                <SelectItem value="6">Juni</SelectItem>
                                                <SelectItem value="7">Juli</SelectItem>
                                                <SelectItem value="8">Agustus</SelectItem>
                                                <SelectItem value="9">September</SelectItem>
                                                <SelectItem value="10">Oktober</SelectItem>
                                                <SelectItem value="11">November</SelectItem>
                                                <SelectItem value="12">Desember</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 items-start">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-800">Otomatisasi</p>
                                        <p className="text-xs text-blue-700 mt-0.5">Sistem akan menambah saldo cuti otomatis untuk karyawan baru setelah masa kontrak mencapai 1 tahun.</p>
                                    </div>
                                </div>
                                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-8 font-body">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Aturan Cuti
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reward">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-yellow-50/30">
                            <CardTitle className="font-display text-yellow-800 flex items-center gap-2">
                                <Award className="w-5 h-5" />
                                Master Reward
                            </CardTitle>
                            <CardDescription className="font-body">
                                Kelola kategori dan jenis penghargaan karyawan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <RewardTypeManagement />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm mt-6">
                        <CardHeader className="bg-yellow-50/20">
                            <CardTitle className="font-display text-yellow-800 text-lg flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                Reward Otomatis (Manual Amount)
                            </CardTitle>
                            <CardDescription className="font-body text-xs">
                                Tentukan nominal reward tetap untuk pencapaian 100%.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={payrollForm.handleSubmit(onPayrollSubmit)} className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                        <Label className="font-body text-gray-700">Reward Kehadiran Sempurna (100%)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                            <Input
                                                type="number"
                                                className="pl-8 font-mono bg-white"
                                                {...payrollForm.register("payroll_reward_perfect_attendance")}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">Diberikan jika kehadiran mencapai 100% tanpa telat/alpha</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                        <Label className="font-body text-gray-700">Reward Pencapaian Target (100%)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                            <Input
                                                type="number"
                                                className="pl-8 font-mono bg-white"
                                                {...payrollForm.register("payroll_reward_target_achievement")}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">Diberikan jika KPI/Target mencapai 100%</p>
                                    </div>
                                </div>
                                <Button type="submit" disabled={saving} className="bg-yellow-600 hover:bg-yellow-700 rounded-xl h-10 px-6 font-body text-sm">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Konfigurasi Nominal
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payroll">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-green-50/30">
                            <CardTitle className="font-display text-green-800">Pengaturan Payroll</CardTitle>
                            <CardDescription className="font-body">
                                Konfigurasi nilai standar untuk tunjangan dan potongan otomatis.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <form onSubmit={payrollForm.handleSubmit(onPayrollSubmit)} className="space-y-6">

                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-gray-900 border-l-4 border-green-500 pl-3">Tunjangan Harian</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                            <Label className="font-body text-gray-700">Uang Makan (Per Hari)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                                <Input
                                                    type="number"
                                                    className="pl-8 font-mono bg-white"
                                                    {...payrollForm.register("payroll_allowance_meal")}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Dikali jumlah kehadiran (Hadir, Telat, Dinas Luar, WFH)</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                            <Label className="font-body text-gray-700">Uang Bensin (Per Hari)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                                <Input
                                                    type="number"
                                                    className="pl-8 font-mono bg-white"
                                                    {...payrollForm.register("payroll_allowance_gasoline")}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Dikali jumlah kehadiran (Hadir, Telat, Dinas Luar, WFH)</p>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-gray-900 border-l-4 border-red-500 pl-3">Potongan & Lainnya</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                            <Label className="font-body text-gray-700">BPJS Ketenagakerjaan (Per Bulan)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                                <Input
                                                    type="number"
                                                    className="pl-8 font-mono bg-white"
                                                    {...payrollForm.register("payroll_bpjs_rate")}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Potongan tetap setiap bulan</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                            <Label className="font-body text-gray-700">Potongan Ketidakhadiran (Per Hari)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                                <Input
                                                    type="number"
                                                    className="pl-8 font-mono bg-white"
                                                    {...payrollForm.register("payroll_deduction_absent")}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Dipotong jika status Absen/Alpha</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                            <Label className="font-body text-gray-700">Tunjangan Hari Raya (THR)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                                <Input
                                                    type="number"
                                                    className="pl-8 font-mono bg-white"
                                                    {...payrollForm.register("payroll_allowance_thr")}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Nilai default THR</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-gray-900 border-l-4 border-blue-600 pl-3">Jadwal Penggajian</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="font-body text-blue-900">Otomatisasi Payroll</Label>
                                                    <p className="text-[10px] text-blue-700">Proses payroll otomatis pada tanggal yang ditentukan.</p>
                                                </div>
                                                <Switch
                                                    checked={payrollForm.watch("is_automatic_payroll")}
                                                    onCheckedChange={(val) => payrollForm.setValue("is_automatic_payroll", val)}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                            <Label className="font-body text-gray-700 flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                Tanggal Penggajian Rutin
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="28"
                                                    className="font-mono bg-white"
                                                    {...payrollForm.register("payroll_schedule_day")}
                                                />
                                                <span className="text-sm font-bold text-gray-400">Setiap Bulan</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic">*Disarankan tanggal 23 (sesuai kebijakan perusahaan).</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex gap-3 items-start">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <ShieldCheck className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-green-800">Kalkulasi Otomatis</p>
                                        <p className="text-xs text-green-700 mt-0.5">Nilai-nilai ini akan otomatis terisi saat Anda membuat payroll baru untuk karyawan.</p>
                                    </div>
                                </div>

                                <Button type="submit" disabled={saving} className="bg-hrd hover:bg-hrd-dark rounded-xl h-11 px-8 font-body">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Pengaturan Payroll
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sop">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-teal-50/30">
                            <CardTitle className="font-display text-teal-800 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Master SOP Perusahaan
                            </CardTitle>
                            <CardDescription className="font-body">
                                Atur Standar Operasional Prosedur yang akan muncul di dashboard setiap karyawan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={onSOPSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="font-body">Judul SOP / Peraturan</Label>
                                        <Input
                                            value={sopTitle}
                                            onChange={(e) => setSopTitle(e.target.value)}
                                            placeholder="Contoh: Standar Operasional Prosedur 2024"
                                            className="font-body"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-body">Isi Kebijakan</Label>
                                        <Textarea
                                            value={sopContent}
                                            onChange={(e) => setSopContent(e.target.value)}
                                            placeholder="Tuliskan isi SOP di sini..."
                                            className="font-body min-h-[400px] resize-none"
                                            required
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">Gunakan baris baru untuk memisahkan poin-poin peraturan.</p>
                                    </div>
                                </div>
                                <Button type="submit" disabled={saving || !sopTitle || !sopContent} className="bg-teal-600 hover:bg-teal-700 rounded-xl h-11 px-8 font-body">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan SOP Perusahaan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div >
    );
}
