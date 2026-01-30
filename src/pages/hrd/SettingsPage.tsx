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
import { Loader2, Calendar, ShieldCheck } from "lucide-react";
import { GeneralSettings, DEFAULT_GENERAL_SETTINGS, AttendanceSettings, DEFAULT_ATTENDANCE_SETTINGS, LeaveSettings, DEFAULT_LEAVE_SETTINGS } from "@/types/settings";
import { UserManagement } from "@/components/hrd/UserManagement";
import { Textarea } from "@/components/ui/textarea";

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
});

const leaveSchema = z.object({
    leave_annual_quota: z.coerce.number().min(0, "Harus berupa angka positif"),
    leave_reset_month: z.coerce.number().min(1).max(12),
});

export default function SettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const [generalData, attendanceData, leaveData] = await Promise.all([
                settingsService.getGeneralSettings(),
                settingsService.getAttendanceSettings(),
                settingsService.getLeaveSettings()
            ]);
            generalForm.reset(generalData);
            attendanceForm.reset(attendanceData);
            leaveForm.reset(leaveData);
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
                { key: 'work_end_time_saturday', value: data.work_end_time_saturday, description: 'Jam pulang kerja (Sabtu)' }
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
                <TabsList className="grid w-full grid-cols-5 lg:w-[700px] mb-8">
                    <TabsTrigger value="general">Umum</TabsTrigger>
                    <TabsTrigger value="users">Pengguna</TabsTrigger>
                    <TabsTrigger value="attendance">Absensi</TabsTrigger>
                    <TabsTrigger value="accounting">Akunting</TabsTrigger>
                    <TabsTrigger value="leave">Cuti/Izin</TabsTrigger>
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
                                Aturan pemotongan gaji dan sanksi keterlambatan otomatis.
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

            </Tabs>
        </div>
    );
}
