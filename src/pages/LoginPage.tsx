import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff,
  Users,
  Calculator,
  Package,
  HeadphonesIcon
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const start = Date.now();
      const { status, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      toast({
        title: "Koneksi Berhasil",
        description: `Terhubung ke Supabase dalam ${duration}ms. Status: ${status}`,
        variant: "default",
        className: "bg-green-500 text-white"
      });
    } catch (err: any) {
      console.error('Connection check failed:', err);
      toast({
        title: "Koneksi Gagal",
        description: err.message || "Tidak dapat menghubungi server",
        variant: "destructive"
      });
      setError(`Koneksi gagal: ${err.message || 'Network error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Add a safety timeout wrapper
      const loginPromise = login(email, password);
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - server tidak merespon')), 15000)
      );

      const success = await Promise.race([loginPromise, timeoutPromise]);
      
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Email atau password salah. Silakan coba lagi.');
      }
    } catch (err: any) {
      console.error('Login error in page:', err);
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  const moduleIcons = [
    { icon: Users, color: 'text-hrd', label: 'HRD' },
    { icon: Calculator, color: 'text-accounting-light', label: 'Akuntansi' },
    { icon: Package, color: 'text-inventory', label: 'Persediaan' },
    { icon: HeadphonesIcon, color: 'text-customer', label: 'Pelayanan' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex">
      {/* Left Panel - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1A2332] to-[#0D7377] p-12 flex-col justify-between relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-40 right-20 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">BusinessHub</span>
          </div>
          <p className="text-white/60 font-body text-sm">Sistem Manajemen Bisnis Terpadu</p>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight">
            Kelola Bisnis Anda<br />
            <span className="text-[#14FFEC]">Dalam Satu Platform</span>
          </h1>
          <p className="text-white/70 font-body text-lg max-w-md">
            Integrasikan HRD, Akuntansi, Persediaan, dan Pelayanan Konsumen dalam satu sistem yang powerful dan mudah digunakan.
          </p>
          
          {/* Module Icons */}
          <div className="flex gap-6 pt-4">
            {moduleIcons.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <span className="text-white/60 text-xs font-body">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-sm font-body">
          © 2024 BusinessHub. All rights reserved.
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-[#1A2332] rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-[#1C1C1E]">BusinessHub</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-[#1C1C1E] mb-2">
              Selamat Datang
            </h2>
            <p className="text-muted-foreground font-body">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-body"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="font-body font-medium text-[#1C1C1E]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 font-body bg-white border-gray-200 focus:border-hrd focus:ring-hrd"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-body font-medium text-[#1C1C1E]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 font-body bg-white border-gray-200 focus:border-hrd focus:ring-hrd"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-body text-muted-foreground cursor-pointer">
                  Ingat saya
                </Label>
              </div>
              <a href="#" className="text-sm font-body text-hrd hover:text-hrd-dark transition-colors">
                Lupa password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#0D7377] hover:bg-[#095456] text-white font-body font-medium text-base transition-all duration-200"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-body text-muted-foreground mb-2 font-medium">Demo Credentials:</p>
            <div className="space-y-1 text-xs font-mono text-muted-foreground">
              <p>Admin: admin@company.com / admin123</p>
              <p>Manager: manager@company.com / manager123</p>
              <p>Staff: staff@company.com / staff123</p>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={isLoading}
              className="text-xs font-body text-muted-foreground hover:text-foreground"
            >
              Cek Koneksi Server
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
