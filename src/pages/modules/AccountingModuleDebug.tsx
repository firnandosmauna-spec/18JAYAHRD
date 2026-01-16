import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function AccountingModuleDebug() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAccountingData();
  }, []);

  const checkAccountingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Checking accounting data...');
      
      // Test 1: Check if accounts table exists and has data
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .limit(5);
      
      console.log('📊 Accounts data:', accounts);
      console.log('❌ Accounts error:', accountsError);

      // Test 2: Check if account_balances view works
      const { data: balances, error: balancesError } = await supabase
        .from('account_balances')
        .select('*')
        .limit(5);
      
      console.log('💰 Balances data:', balances);
      console.log('❌ Balances error:', balancesError);

      // Test 3: Check transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .limit(5);
      
      console.log('📝 Transactions data:', transactions);
      console.log('❌ Transactions error:', transactionsError);

      // Test 4: Check journal entries
      const { data: journalEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('*')
        .limit(5);
      
      console.log('📋 Journal entries data:', journalEntries);
      console.log('❌ Journal error:', journalError);

      setDebugInfo({
        user: user,
        accounts: {
          data: accounts,
          error: accountsError,
          count: accounts?.length || 0
        },
        balances: {
          data: balances,
          error: balancesError,
          count: balances?.length || 0
        },
        transactions: {
          data: transactions,
          error: transactionsError,
          count: transactions?.length || 0
        },
        journalEntries: {
          data: journalEntries,
          error: journalError,
          count: journalEntries?.length || 0
        }
      });

    } catch (err: any) {
      console.error('🚨 Debug error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Memuat data akuntansi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Modul Akuntansi - Debug Mode</h1>
              <p className="text-gray-600">Debugging tampilan dan data akuntansi</p>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Error: {error}</p>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">👤 User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
              <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Modules:</strong> {user?.modules?.join(', ') || 'N/A'}</p>
              <p><strong>Has Accounting Access:</strong> {user?.modules?.includes('accounting') ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Accounts Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">📊 Accounts Table</h3>
              {debugInfo.accounts?.error ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {debugInfo.accounts?.count || 0} records
            </p>
            {debugInfo.accounts?.error && (
              <p className="text-sm text-red-600 mt-2">
                {debugInfo.accounts.error.message}
              </p>
            )}
          </div>

          {/* Balances Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">💰 Account Balances</h3>
              {debugInfo.balances?.error ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-green-600">
              {debugInfo.balances?.count || 0} records
            </p>
            {debugInfo.balances?.error && (
              <p className="text-sm text-red-600 mt-2">
                {debugInfo.balances.error.message}
              </p>
            )}
          </div>

          {/* Transactions Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">📝 Transactions</h3>
              {debugInfo.transactions?.error ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {debugInfo.transactions?.count || 0} records
            </p>
            {debugInfo.transactions?.error && (
              <p className="text-sm text-red-600 mt-2">
                {debugInfo.transactions.error.message}
              </p>
            )}
          </div>

          {/* Journal Entries Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">📋 Journal Entries</h3>
              {debugInfo.journalEntries?.error ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {debugInfo.journalEntries?.count || 0} records
            </p>
            {debugInfo.journalEntries?.error && (
              <p className="text-sm text-red-600 mt-2">
                {debugInfo.journalEntries.error.message}
              </p>
            )}
          </div>
        </div>

        {/* Sample Data Display */}
        {debugInfo.accounts?.data && debugInfo.accounts.data.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Sample Accounts Data</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {debugInfo.accounts.data.slice(0, 5).map((account: any) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.is_active ? '✅' : '❌'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sample Balances Display */}
        {debugInfo.balances?.data && debugInfo.balances.data.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💰 Sample Balances Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {debugInfo.balances.data.slice(0, 6).map((balance: any) => (
                <div key={balance.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium">{balance.code} - {balance.name}</p>
                  <p className="text-sm text-gray-600">Type: {balance.type}</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(parseFloat(balance.balance || 0))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Actions</h2>
          <div className="flex gap-4">
            <Button onClick={checkAccountingData}>
              🔄 Refresh Data
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('/mcp-supabase', '_blank')}
            >
              🛠️ MCP Supabase
            </Button>
            <Button 
              variant="outline" 
              onClick={() => console.log('Debug Info:', debugInfo)}
            >
              🐛 Log Debug Info
            </Button>
          </div>
        </div>

        {/* Raw Debug Data */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Raw Debug Data</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default AccountingModuleDebug;