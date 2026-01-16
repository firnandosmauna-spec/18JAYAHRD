import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database, 
  Upload,
  X
} from 'lucide-react';
import { DataMigration, runMigrationWithFeedback } from '@/utils/migration';

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrationDialog({ open, onOpenChange }: MigrationDialogProps) {
  const [migrationState, setMigrationState] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Check if migration is needed when dialog opens
  useEffect(() => {
    if (open) {
      checkMigrationNeeded();
    }
  }, [open]);

  const checkMigrationNeeded = async () => {
    setMigrationState('checking');
    setProgress(10);
    
    try {
      const needed = await DataMigration.checkMigrationNeeded();
      setMigrationNeeded(needed);
      setProgress(100);
      
      if (!needed) {
        setMigrationState('success');
        setSuccessMessage('Database sudah terkonfigurasi dengan baik. Tidak perlu migrasi.');
      } else {
        setMigrationState('idle');
        setCurrentStep('Ditemukan data localStorage yang perlu dimigrasikan ke Supabase');
      }
    } catch (error) {
      setMigrationState('error');
      setErrorMessage(`Gagal memeriksa status migrasi: ${error}`);
    }
  };

  const runMigration = async () => {
    setMigrationState('migrating');
    setProgress(0);
    setErrorMessage('');
    setSuccessMessage('');

    const success = await runMigrationWithFeedback(
      (message) => {
        setCurrentStep(message);
        setProgress(prev => Math.min(prev + 25, 90));
      },
      (error) => {
        setMigrationState('error');
        setErrorMessage(error);
        setProgress(100);
      },
      (message) => {
        setMigrationState('success');
        setSuccessMessage(message);
        setProgress(100);
      }
    );

    if (success) {
      // Refresh the page after successful migration
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const skipMigration = () => {
    // Clear localStorage to prevent this dialog from showing again
    DataMigration.clearLocalStorageData();
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (migrationState) {
      case 'checking':
      case 'migrating':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Database className="w-6 h-6 text-blue-500" />;
    }
  };

  const getTitle = () => {
    switch (migrationState) {
      case 'checking':
        return 'Memeriksa Database...';
      case 'migrating':
        return 'Migrasi Data ke Supabase';
      case 'success':
        return 'Migrasi Berhasil!';
      case 'error':
        return 'Migrasi Gagal';
      default:
        return 'Setup Database Supabase';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className="font-display">{getTitle()}</DialogTitle>
          </div>
          <DialogDescription className="font-body">
            {migrationState === 'checking' && 'Memeriksa apakah migrasi data diperlukan...'}
            {migrationState === 'idle' && migrationNeeded && 'Aplikasi akan memigrasikan data dari localStorage ke Supabase untuk performa yang lebih baik.'}
            {migrationState === 'idle' && !migrationNeeded && 'Database Supabase sudah siap digunakan.'}
            {migrationState === 'migrating' && 'Sedang memigrasikan data ke Supabase. Mohon tunggu...'}
            {migrationState === 'success' && 'Data berhasil dimigrasikan ke Supabase. Aplikasi akan dimuat ulang.'}
            {migrationState === 'error' && 'Terjadi kesalahan saat migrasi data.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          {(migrationState === 'checking' || migrationState === 'migrating') && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground font-body">{currentStep}</p>
            </div>
          )}

          {/* Success Message */}
          {migrationState === 'success' && successMessage && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="font-body">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {migrationState === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-body">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Migration Info */}
          {migrationState === 'idle' && migrationNeeded && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium font-body text-blue-900">Migrasi Data</h4>
                  <p className="text-sm text-blue-700 font-body mt-1">
                    Data karyawan yang tersimpan di browser akan dipindahkan ke database Supabase 
                    untuk keamanan dan performa yang lebih baik.
                  </p>
                  <ul className="text-xs text-blue-600 font-body mt-2 space-y-1">
                    <li>• Data akan tetap aman selama proses migrasi</li>
                    <li>• Backup otomatis akan dibuat</li>
                    <li>• Proses ini hanya dilakukan sekali</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {migrationState === 'idle' && migrationNeeded && (
              <>
                <Button 
                  variant="outline" 
                  onClick={skipMigration}
                  className="font-body"
                >
                  <X className="w-4 h-4 mr-2" />
                  Lewati
                </Button>
                <Button 
                  onClick={runMigration}
                  className="bg-blue-600 hover:bg-blue-700 font-body"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Mulai Migrasi
                </Button>
              </>
            )}

            {migrationState === 'success' && (
              <Button 
                onClick={() => window.location.reload()}
                className="bg-green-600 hover:bg-green-700 font-body"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Lanjutkan
              </Button>
            )}

            {migrationState === 'error' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="font-body"
                >
                  Tutup
                </Button>
                <Button 
                  onClick={runMigration}
                  className="font-body"
                >
                  Coba Lagi
                </Button>
              </>
            )}

            {(migrationState === 'idle' && !migrationNeeded) && (
              <Button 
                onClick={() => onOpenChange(false)}
                className="font-body"
              >
                Tutup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}