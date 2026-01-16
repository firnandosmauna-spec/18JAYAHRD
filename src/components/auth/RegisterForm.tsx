import React, { useState } from 'react';
import { useAuth, type UserRole, type ModuleType } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const moduleOptions: { value: ModuleType; label: string }[] = [
  { value: 'hrd', label: 'HRD' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'customer', label: 'Customer' },
  { value: 'project', label: 'Project' },
];

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register } = useAuth(); // Removed isLoading from destructuring
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff' as UserRole,
    modules: ['hrd'] as ModuleType[],
    position: '',
    department: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    if (formData.role !== 'staff' && formData.modules.length === 0) {
      setError('Pilih minimal satu modul');
      return;
    }

    /* 
    if (formData.role === 'staff' && (!formData.position || !formData.department)) {
      setError('Posisi dan Departemen harus diisi');
      return;
    } 
    */

    try {
      setIsSubmitting(true);
      const success = await register(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.modules,
        formData.position,
        formData.department
      );

      if (success) {
        setSuccess('Registrasi berhasil! Silakan login dengan akun yang baru dibuat.');
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'staff',
          modules: ['hrd'],
          position: '',
          department: '',
        });
      }
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan saat registrasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (value: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  const handleModuleChange = (module: ModuleType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      modules: checked
        ? [...prev.modules, module]
        : prev.modules.filter(m => m !== module)
    }));
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="space-y-1 px-0">
        <CardTitle className="text-2xl font-bold text-left">Buat Akun Baru</CardTitle>
        <CardDescription className="text-left">
          Lengkapi data diri Anda untuk mendaftar.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription className="space-y-2">
                <div>{success}</div>
                {onSwitchToLogin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onSwitchToLogin}
                    className="mt-2"
                  >
                    Login Sekarang
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Masukkan nama lengkap"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
            />
          </div>

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
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 
            Position and Department removed as per request.
            Data will be linked automatically via Email matching to Employee record.
          */}
          {/* {formData.role === 'staff' && ( ... removed ... )} */}

          {formData.role !== 'staff' && (
            <div className="space-y-2">
              <Label>Akses Modul</Label>
              <div className="grid grid-cols-2 gap-2">
                {moduleOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.modules.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleModuleChange(option.value, checked as boolean)
                      }
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={option.value} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? (
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sedang mendaftar...
              </>
            ) : (
              'Daftar'
            )}
          </Button>

          {onSwitchToLogin && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Sudah punya akun? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={onSwitchToLogin}
                disabled={isSubmitting}
              >
                Masuk di sini
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card >
  );
}