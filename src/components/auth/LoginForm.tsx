import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Email dan password harus diisi');
      return;
    }

    try {
      const success = await login(formData.email, formData.password);

      if (!success) {
        setError('Email atau password salah');
      }
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan saat login');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotSuccess('');

    try {
      await authService.resetPassword(forgotEmail);
      setForgotSuccess('Link reset password telah dikirim ke email Anda');
      setForgotEmail('');
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan saat mengirim email reset');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="space-y-1 px-0">
        <CardTitle className="text-2xl font-bold text-left">Selamat Datang Kembali</CardTitle>
        <CardDescription className="text-left">
          Silakan masukkan detail login Anda untuk melanjutkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@perusahaan.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-[0_4px_14px_0_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sedang masuk...
              </>
            ) : (
              'Masuk'
            )}
          </Button>

          <div className="text-center text-sm">
            <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-normal text-xs"
                  disabled={isLoading}
                >
                  Lupa password?
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Masukkan email Anda untuk menerima link reset password
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotSuccess && (
                    <Alert>
                      <AlertDescription>{forgotSuccess}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="nama@perusahaan.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      disabled={forgotLoading}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotDialog(false)}
                      disabled={forgotLoading}
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={forgotLoading}>
                      {forgotLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        'Kirim Link Reset'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {onSwitchToRegister && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Belum punya akun? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={onSwitchToRegister}
                disabled={isLoading}
              >
                Daftar di sini
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}