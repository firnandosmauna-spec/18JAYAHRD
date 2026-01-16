import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccounts, useTransactions, useTransactionValidation } from '@/hooks/useAccounting';
import { useAuth } from '@/contexts/AuthContext';
import type { Transaction, JournalEntry, Account } from '@/types/accounting';

interface TransactionManagerProps {
  transactionId?: string;
  mode?: 'create' | 'edit' | 'view';
  onSave?: (transaction: Transaction) => void;
  onCancel?: () => void;
}

interface JournalEntryForm extends Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'> {
  tempId: string;
}

export function TransactionManager({ 
  transactionId, 
  mode = 'create', 
  onSave, 
  onCancel 
}: TransactionManagerProps) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { addTransaction, updateTransaction, postTransaction } = useTransactions();
  const { validateTransaction } = useTransactionValidation();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: ''
  });

  const [entries, setEntries] = useState<JournalEntryForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<any>(null);

  const isReadOnly = mode === 'view';
  const canEdit = !isReadOnly && user?.role !== 'staff';

  // Add initial empty entries
  useEffect(() => {
    if (entries.length === 0) {
      setEntries([
        {
          tempId: '1',
          account_id: '',
          debit_amount: 0,
          credit_amount: 0,
          description: ''
        },
        {
          tempId: '2',
          account_id: '',
          debit_amount: 0,
          credit_amount: 0,
          description: ''
        }
      ]);
    }
  }, []);

  // Validate entries whenever they change
  useEffect(() => {
    const validEntries = entries.filter(entry => 
      entry.account_id && (entry.debit_amount > 0 || entry.credit_amount > 0)
    );
    
    if (validEntries.length > 0) {
      const validation = validateTransaction(validEntries);
      setValidation(validation);
    } else {
      setValidation(null);
    }
  }, [entries, validateTransaction]);

  const addEntry = () => {
    const newEntry: JournalEntryForm = {
      tempId: Date.now().toString(),
      account_id: '',
      debit_amount: 0,
      credit_amount: 0,
      description: ''
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (tempId: string) => {
    if (entries.length > 2) {
      setEntries(entries.filter(entry => entry.tempId !== tempId));
    }
  };

  const updateEntry = (tempId: string, field: keyof JournalEntryForm, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.tempId === tempId) {
        const updatedEntry = { ...entry, [field]: value };
        
        // Ensure only one of debit or credit has a value
        if (field === 'debit_amount' && value > 0) {
          updatedEntry.credit_amount = 0;
        } else if (field === 'credit_amount' && value > 0) {
          updatedEntry.debit_amount = 0;
        }
        
        return updatedEntry;
      }
      return entry;
    }));
  };

  const getAccountName = (accountId: string): string => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.code} - ${account.name}` : '';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSave = async (status: 'draft' | 'posted' = 'draft') => {
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!formData.description.trim()) {
        throw new Error('Deskripsi transaksi harus diisi');
      }

      const validEntries = entries.filter(entry => 
        entry.account_id && (entry.debit_amount > 0 || entry.credit_amount > 0)
      );

      if (validEntries.length < 2) {
        throw new Error('Transaksi harus memiliki minimal 2 jurnal entry');
      }

      const validation = validateTransaction(validEntries);
      if (!validation.isBalanced) {
        throw new Error(validation.errors.join(', '));
      }

      const transactionData = {
        ...formData,
        status,
        created_by: user?.id || ''
      };

      const journalEntries = validEntries.map(entry => ({
        account_id: entry.account_id,
        debit_amount: entry.debit_amount,
        credit_amount: entry.credit_amount,
        description: entry.description || formData.description
      }));

      let savedTransaction: Transaction;

      if (mode === 'edit' && transactionId) {
        savedTransaction = await updateTransaction(transactionId, transactionData, journalEntries);
      } else {
        savedTransaction = await addTransaction(transactionData, journalEntries);
      }

      // If saving as posted, post the transaction
      if (status === 'posted' && savedTransaction.status === 'draft') {
        savedTransaction = await postTransaction(savedTransaction.id);
      }

      onSave?.(savedTransaction);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Buat Transaksi Baru' : 
             mode === 'edit' ? 'Edit Transaksi' : 'Detail Transaksi'}
          </h2>
          <p className="text-gray-600">
            {mode === 'view' ? 'Lihat detail transaksi' : 'Kelola jurnal entry dengan sistem double-entry'}
          </p>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {mode === 'view' ? 'Tutup' : 'Batal'}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transaction Form */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold">Informasi Transaksi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label htmlFor="reference">Referensi (Opsional)</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Contoh: INV-001"
              disabled={isReadOnly}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Deskripsi transaksi..."
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Journal Entries */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Jurnal Entry</h3>
          {canEdit && (
            <Button onClick={addEntry} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Entry
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Akun</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
                {canEdit && <TableHead className="text-center">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.tempId}>
                  <TableCell className="w-64">
                    {isReadOnly ? (
                      <span className="text-sm">{getAccountName(entry.account_id)}</span>
                    ) : (
                      <Select
                        value={entry.account_id}
                        onValueChange={(value) => updateEntry(entry.tempId, 'account_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih akun" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      <span className="text-sm">{entry.description}</span>
                    ) : (
                      <Input
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.tempId, 'description', e.target.value)}
                        placeholder="Deskripsi entry..."
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isReadOnly ? (
                      <span className="font-mono">{formatCurrency(entry.debit_amount)}</span>
                    ) : (
                      <Input
                        type="number"
                        value={entry.debit_amount || ''}
                        onChange={(e) => updateEntry(entry.tempId, 'debit_amount', parseFloat(e.target.value) || 0)}
                        className="text-right"
                        min="0"
                        step="0.01"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isReadOnly ? (
                      <span className="font-mono">{formatCurrency(entry.credit_amount)}</span>
                    ) : (
                      <Input
                        type="number"
                        value={entry.credit_amount || ''}
                        onChange={(e) => updateEntry(entry.tempId, 'credit_amount', parseFloat(e.target.value) || 0)}
                        className="text-right"
                        min="0"
                        step="0.01"
                      />
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEntry(entry.tempId)}
                        disabled={entries.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Validation Summary */}
        {validation && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>Total Debit:</span>
                  <span className="font-mono">{formatCurrency(validation.totalDebits)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Total Kredit:</span>
                  <span className="font-mono">{formatCurrency(validation.totalCredits)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {validation.isBalanced ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Seimbang
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Tidak Seimbang
                  </Badge>
                )}
              </div>
            </div>
            {!validation.isBalanced && validation.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                <ul className="list-disc list-inside">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={loading || !validation?.isBalanced}
          >
            <Save className="h-4 w-4 mr-2" />
            Simpan Draft
          </Button>
          <Button
            onClick={() => handleSave('posted')}
            disabled={loading || !validation?.isBalanced}
          >
            <FileText className="h-4 w-4 mr-2" />
            Simpan & Posting
          </Button>
        </div>
      )}
    </div>
  );
}