import { useState } from 'react';
import { useNotificationsContext } from '@/contexts/NotificationContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Megaphone,
    Send,
    Loader2,
    AlertTriangle,
    Info,
    CheckCircle2
} from 'lucide-react';

export function AnnouncementManagement() {
    const { addNotification } = useNotificationsContext();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        is_mandatory: false,
        is_popup: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.message) {
            toast({
                title: "Error",
                description: "Judul dan pesan wajib diisi.",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await addNotification({
                title: formData.title,
                message: formData.message,
                type: formData.is_mandatory ? 'mandatory_announcement' : 'announcement',
                module: 'Pengumuman',
                user_id: null, // Broadcast to all
                is_mandatory: formData.is_mandatory,
                is_popup: formData.is_popup
            });

            toast({
                title: "Berhasil",
                description: "Pengumuman berhasil dikirim ke semua karyawan.",
                className: "bg-green-600 text-white"
            });

            setFormData({
                title: '',
                message: '',
                is_mandatory: false,
                is_popup: true
            });
        } catch (error: any) {
            console.error("Failed to send announcement:", error);
            toast({
                title: "Gagal Mengirim",
                description: error.message || "Terjadi kesalahan saat mengirim pengumuman.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm">
                <CardHeader className="bg-hrd/5 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-hrd text-white rounded-lg">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="font-display">Kirim Pengumuman Baru</CardTitle>
                            <CardDescription className="font-body text-xs">
                                Kirim pesan pop-up ke semua portal mandiri karyawan secara masal.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="font-body">Judul Pengumuman</Label>
                                <Input
                                    id="title"
                                    placeholder=""
                                    className="font-body"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message" className="font-body">Isi Pesan / Informasi</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Tuliskan detail pengumuman di sini..."
                                    className="font-body min-h-[120px] resize-none"
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="p-4 rounded-xl border bg-gray-50 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            <Label className="font-body text-sm font-semibold">Wajib Dibaca / Diisi</Label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Karyawan tidak bisa menutup pop-up tanpa konfirmasi.</p>
                                    </div>
                                    <Switch
                                        checked={formData.is_mandatory}
                                        onCheckedChange={(val) => setFormData(prev => ({ ...prev, is_mandatory: val }))}
                                    />
                                </div>

                                <div className="p-4 rounded-xl border bg-gray-50 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-4 h-4 text-blue-500" />
                                            <Label className="font-body text-sm font-semibold">Tampilkan Pop-up</Label>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Pesan akan langsung muncul saat karyawan login.</p>
                                    </div>
                                    <Switch
                                        checked={formData.is_popup}
                                        onCheckedChange={(val) => setFormData(prev => ({ ...prev, is_popup: val }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                Pesan akan diterima oleh {formData.is_mandatory ? 'semua' : 'semua'} karyawan aktif.
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-hrd hover:bg-hrd-dark px-8 h-11 rounded-xl shadow-md transition-all active:scale-95"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                Kirim Sekarang
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-none shadow-sm bg-blue-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Tips Pengumuman
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4 font-body">
                            <li>Gunakan "Wajib" untuk informasi kritikal seperti perubahan peraturan.</li>
                            <li>Sertakan instruksi jelas jika ada tindakan yang harus dilakukan.</li>
                            <li>Informasi yang bersifat rutin sebaiknya tidak ditandai sebagai "Pop-up".</li>
                        </ul>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-orange-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Perhatian
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-orange-700 font-body leading-relaxed">
                            Pengumuman yang sudah dikirim tidak dapat dibatalkan secara otomatis dari portal karyawan yang sedang aktif.
                            Pastikan data sudah benar sebelum menekan tombol kirim.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
