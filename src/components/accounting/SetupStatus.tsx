import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

interface SetupStatusProps {
  onSetupComplete?: () => void;
}

export function SetupStatus({ onSetupComplete }: SetupStatusProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [setupStatus, setSetupStatus] = useState({
    accounts: false,
    transactions: false,
    journalEntries: false
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Check if accounts table exists and has data
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .limit(1);

      // Check if transactions table exists
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .limit(1);

      // Check if journal_entries table exists
      const { data: journalEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('id')
        .limit(1);

      setSetupStatus({
        accounts: !accountsError && accounts !== null,
        transactions: !transactionsError && transactions !== null,
        journalEntries: !journalError && journalEntries !== null
      });

      if (accountsError || transactionsError || journalError) {
        setError('Database akuntansi belum disetup. Silakan jalankan migrasi database.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const isSetupComplete = setupStatus.accounts && setupStatus.transactions && setupStatus.journalEntries;

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Memeriksa status database...</span>
      </div>
    );
  }

  if (isSetupComplete) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Database akuntansi sudah siap digunakan!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Database akuntansi belum disetup dengan lengkap'}
        </AlertDescription>
      </Alert>

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Status Setup Database:</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {setupStatus.accounts ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={setupStatus.accounts ? 'text-green-800' : 'text-red-800'}>
              Tabel Accounts
            </span>
          </div>
          <div className="flex items-center gap-2">
            {setupStatus.transactions ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={setupStatus.transactions ? 'text-green-800' : 'text-red-800'}>
              Tabel Transactions
            </span>
          </div>
          <div className="flex items-center gap-2">
            {setupStatus.journalEntries ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={setupStatus.journalEntries ? 'text-green-800' : 'text-red-800'}>
              Tabel Journal Entries
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            onClick={checkSetupStatus}
            size="sm"
          >
            Periksa Ulang
          </Button>
          <Button 
            onClick={() => window.open('/mcp-supabase', '_blank')}
            size="sm"
          >
            Setup Database
          </Button>
        </div>
      </div>
    </div>
  );
}