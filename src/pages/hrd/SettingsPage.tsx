import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsService } from "@/services/settingsService";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { AttendanceSettings, DEFAULT_ATTENDANCE_SETTINGS } from "@/types/settings";
import { UserManagement } from "@/components/hrd/UserManagement";

const attendanceSchema = z.object({
    attendance_late_penalty: z.coerce.number().min(0, "Harus berupa angka positif"),
    attendance_sp1_threshold: z.coerce.number().min(0, "Harus berupa angka positif"),
});

export default function SettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<AttendanceSettings>({
        resolver: zodResolver(attendanceSchema),
        defaultValues: DEFAULT_ATTENDANCE_SETTINGS,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await settingsService.getAttendanceSettings();
            form.reset(data);
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

    const onSubmit = async (data: AttendanceSettings) => {
        try {
            setSaving(true);
            const updates = [
                { key: 'attendance_late_penalty', value: data.attendance_late_penalty, description: 'Potongan gaji per menit keterlambatan (IDR)' },
                { key: 'attendance_sp1_threshold', value: data.attendance_sp1_threshold, description: 'Batas akumulasi keterlambatan per minggu sebelum SP1 (menit)' }
            ];

            await settingsService.updateSettings(updates);

            toast({
                title: "Sukses",
                description: "Pengaturan berhasil disimpan.",
            });
        } catch (error) {
            console.error("Failed to save settings", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan pengaturan.",
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
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="general">Umum</TabsTrigger>
                    <TabsTrigger value="users">Pengguna</TabsTrigger>
                    <TabsTrigger value="attendance">Absensi</TabsTrigger>
                    <TabsTrigger value="accounting">Akunting</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pengaturan Umum</CardTitle>
                            <CardDescription>
                                Konfigurasi umum aplikasi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Belum ada pengaturan umum.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <UserManagement />
                </TabsContent>

                <TabsContent value="attendance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pengaturan Absensi</CardTitle>
                            <CardDescription>
                                Aturan pemotongan gaji dan sanksi keterlambatan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="late_penalty">Denda Keterlambatan (per menit)</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold">Rp</span>
                                        <Input
                                            id="late_penalty"
                                            type="number"
                                            {...form.register("attendance_late_penalty")}
                                        />
                                    </div>
                                    {form.formState.errors.attendance_late_penalty && (
                                        <p className="text-xs text-red-500">{form.formState.errors.attendance_late_penalty.message}</p>
                                    )}
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Nominal yang akan dipotong dari gaji untuk setiap menit keterlambatan.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="sp1_threshold">Batas Keterlambatan SP1 (menit/minggu)</Label>
                                    <Input
                                        id="sp1_threshold"
                                        type="number"
                                        {...form.register("attendance_sp1_threshold")}
                                    />
                                    {form.formState.errors.attendance_sp1_threshold && (
                                        <p className="text-xs text-red-500">{form.formState.errors.attendance_sp1_threshold.message}</p>
                                    )}
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Jika total keterlambatan dalam seminggu melebihi batas ini, karyawan akan mendapat SP1 otomatis (Draft).
                                    </p>
                                </div>

                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan Perubahan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="accounting">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pengaturan Akunting</CardTitle>
                            <CardDescription>
                                Konfigurasi periode dan akun default.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Belum ada pengaturan akunting.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
