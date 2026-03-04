import React, { useState } from 'react';
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
import { userService } from "@/services/userService";

interface AdminChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    userName: string;
}

export function AdminChangePasswordDialog({ open, onOpenChange, userId, userName }: AdminChangePasswordDialogProps) {
    const { toast } = useToast();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async () => {
        if (!newPassword) {
            toast({
                title: "Error",
                description: "Password baru tidak boleh kosong.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: "Error",
                description: "Password minimal 6 karakter.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: "Error",
                description: "Konfirmasi password tidak cocok.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const success = await userService.adminUpdatePassword(userId, newPassword);

            if (success) {
                toast({
                    title: "Password Diperbarui",
                    description: `Password untuk ${userName} telah berhasil diubah.`,
                });
                onOpenChange(false);
                setNewPassword('');
                setConfirmPassword('');
            } else {
                throw new Error("Gagal memperbarui password.");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal memperbarui password. Pastikan Anda memiliki izin yang cukup.",
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
                    <DialogTitle>Ganti Password User</DialogTitle>
                    <DialogDescription>
                        Setel password baru untuk akun <b>{userName}</b>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* TRAP BROWSER AUTOFILL: Hidden inputs so browser fills these instead of real ones */}
                    <div style={{ opacity: 0, position: 'absolute', top: -9999, zIndex: -1 }}>
                        <input type="text" name="fakeusernameremembered" tabIndex={-1} autoComplete="username" />
                        <input type="password" name="fakepasswordremembered" tabIndex={-1} autoComplete="current-password" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="admin-new-password">Password Baru</Label>
                        <div className="relative">
                            <Input
                                id={`admin-new-password-${userId}`}
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Masukkan password baru"
                                className="pr-10"
                                autoComplete="new-password"
                                data-lpignore="true"
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
                        <Label htmlFor="admin-confirm-password">Konfirmasi Password</Label>
                        <Input
                            id={`admin-confirm-password-${userId}`}
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            autoComplete="new-password"
                            data-lpignore="true"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Batal
                    </Button>
                    <Button onClick={handleUpdatePassword} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ganti Password
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
