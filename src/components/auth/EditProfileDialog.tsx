import React, { useState } from 'react';
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
import { Loader2, Eye, EyeOff } from "lucide-react";

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

    const handleUpdateProfile = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Validate passwords if provided
            if (newPassword) {
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
                        <Label htmlFor="avatar">URL Avatar</Label>
                        <Input
                            id="avatar"
                            value={avatar}
                            onChange={(e) => setAvatar(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                        />
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
