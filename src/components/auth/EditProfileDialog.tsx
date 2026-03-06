import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Eye, EyeOff, Camera, Upload } from "lucide-react";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
    const { user, updateProfile, updatePassword } = useAuth();
    const { toast } = useToast();

    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state when dialog opens or user changes
    useEffect(() => {
        if (open && user) {
            setName(user.name || '');
            setAvatar(user.avatar || '');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [open, user]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        try {
            setUploading(true);
            const { error: uploadError } = await supabase.storage
                .from('pipeline-uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('pipeline-uploads')
                .getPublicUrl(filePath);

            setAvatar(data.publicUrl);

            toast({
                title: "Upload Berhasil",
                description: "Foto profil berhasil diunggah",
            });
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast({
                title: "Upload Gagal",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Validate passwords if provided (not just whitespace)
            if (newPassword && newPassword.trim() !== '') {
                if (newPassword.length < 6) {
                    toast({
                        title: "Password terlalu pendek",
                        description: "Password minimal 6 karakter.",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    toast({
                        title: "Password tidak cocok",
                        description: "Konfirmasi password harus sama dengan password baru.",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }
                await updatePassword(newPassword);
            }

            // Update basic profile
            const success = await updateProfile({
                name,
                avatar,
            });

            if (success) {
                toast({
                    title: "Profil Diperbarui",
                    description: "Perubahan profil Anda telah berhasil disimpan.",
                });
                onOpenChange(false);
                // Clear password fields
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            toast({
                title: "Gagal Memperbarui",
                description: error.message || "Terjadi kesalahan saat menyimpan perubahan.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Profil</DialogTitle>
                    <DialogDescription>
                        Perbarui informasi profil dan kata sandi Anda di sini.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nama Anda"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="avatar">Foto Profil</Label>
                        <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50">
                                {avatar ? (
                                    <img src={avatar} alt="Avatar Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                                        <Camera className="h-8 w-8" />
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-8"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        <Upload className="h-3 w-3 mr-1" />
                                        Upload Foto
                                    </Button>
                                    {avatar && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setAvatar('')}
                                            disabled={uploading}
                                        >
                                            Hapus
                                        </Button>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium leading-none">Ganti Password (Opsional)</h4>
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">Password Baru</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Isi jika ingin ganti password"
                                    className="pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                            <Input
                                id="confirm-password"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Ulangi password baru"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Batal
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
