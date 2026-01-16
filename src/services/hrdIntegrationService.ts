import { supabase } from '@/lib/supabase';
import { transactionService, accountService } from '@/services/accountingService';
import type { PayrollRecord } from '@/lib/supabase';
import type { JournalEntry } from '@/types/accounting';

/**
 * HRD Integration Service
 * Handles automatic creation of accounting entries from HRD transactions
 */
export const hrdIntegrationService = {
  /**
   * Create accounting entries for payroll transactions
   */
  async createPayrollEntries(payrollRecord: PayrollRecord): Promise<void> {
    try {
      // Get required accounts
      const accounts = await accountService.getAll();
      
      const salaryExpenseAccount = accounts.find(acc => acc.code === '5000'); // Beban Gaji
      const salaryPayableAccount = accounts.find(acc => acc.code === '2100'); // Utang Gaji
      
      if (!salaryExpenseAccount || !salaryPayableAccount) {
        throw new Error('Required salary accounts not found. Please set up accounts 5000 (Beban Gaji) and 2100 (Utang Gaji)');
      }

      // Get employee info
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', payrollRecord.employee_id)
        .single();

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Create transaction description
      const description = `Gaji ${employee.name} - ${getMonthName(payrollRecord.period_month)} ${payrollRecord.period_year}`;
      
      // Create journal entries
      const entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[] = [
        {
          account_id: salaryExpenseAccount.id,
          debit_amount: payrollRecord.net_salary,
          credit_amount: 0,
          description: `Beban gaji ${employee.name}`
        },
        {
          account_id: salaryPayableAccount.id,
          debit_amount: 0,
          credit_amount: payrollRecord.net_salary,
          description: `Utang gaji ${employee.name}`
        }
      ];

      // Create the transaction
      const transaction = {
        date: new Date().toISOString().split('T')[0],
        description,
        reference: `PAY-${payrollRecord.id.slice(0, 8)}`,
        status: 'posted' as const,
        created_by: 'system' // This should be the actual user ID in production
      };

      await transactionService.create(transaction, entries);
      
      console.log(`Accounting entries created for payroll: ${payrollRecord.id}`);
    } catch (error) {
      console.error('Error creating payroll accounting entries:', error);
      throw error;
    }
  },

  /**
   * Create accounting entries when payroll is marked as paid
   */
  async recordPayrollPayment(payrollRecord: PayrollRecord): Promise<void> {
    try {
      // Get required accounts
      const accounts = await accountService.getAll();
      
      const salaryPayableAccount = accounts.find(acc => acc.code === '2100'); // Utang Gaji
      const cashAccount = accounts.find(acc => acc.code === '1000'); // Kas
      
      if (!salaryPayableAccount || !cashAccount) {
        throw new Error('Required payment accounts not found. Please set up accounts 2100 (Utang Gaji) and 1000 (Kas)');
      }

      // Get employee info
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', payrollRecord.employee_id)
        .single();

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Create transaction description
      const description = `Pembayaran gaji ${employee.name} - ${getMonthName(payrollRecord.period_month)} ${payrollRecord.period_year}`;
      
      // Create journal entries
      const entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[] = [
        {
          account_id: salaryPayableAccount.id,
          debit_amount: payrollRecord.net_salary,
          credit_amount: 0,
          description: `Pembayaran utang gaji ${employee.name}`
        },
        {
          account_id: cashAccount.id,
          debit_amount: 0,
          credit_amount: payrollRecord.net_salary,
          description: `Pengeluaran kas untuk gaji ${employee.name}`
        }
      ];

      // Create the transaction
      const transaction = {
        date: payrollRecord.pay_date || new Date().toISOString().split('T')[0],
        description,
        reference: `PAY-OUT-${payrollRecord.id.slice(0, 8)}`,
        status: 'posted' as const,
        created_by: 'system' // This should be the actual user ID in production
      };

      await transactionService.create(transaction, entries);
      
      console.log(`Payment accounting entries created for payroll: ${payrollRecord.id}`);
    } catch (error) {
      console.error('Error creating payroll payment entries:', error);
      throw error;
    }
  },

  /**
   * Create accounting entries for employee rewards
   */
  async createRewardEntries(rewardRecord: any): Promise<void> {
    try {
      // Get required accounts
      const accounts = await accountService.getAll();
      
      const rewardExpenseAccount = accounts.find(acc => acc.code === '5500'); // Beban Operasional Lainnya
      const cashAccount = accounts.find(acc => acc.code === '1000'); // Kas
      
      if (!rewardExpenseAccount || !cashAccount) {
        throw new Error('Required reward accounts not found. Please set up accounts 5500 (Beban Operasional Lainnya) and 1000 (Kas)');
      }

      // Get employee info
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', rewardRecord.employee_id)
        .single();

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Calculate reward amount (points * 1000 as example conversion)
      const rewardAmount = rewardRecord.points * 1000;

      // Create transaction description
      const description = `Reward ${rewardRecord.title} - ${employee.name}`;
      
      // Create journal entries
      const entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[] = [
        {
          account_id: rewardExpenseAccount.id,
          debit_amount: rewardAmount,
          credit_amount: 0,
          description: `Beban reward ${employee.name}`
        },
        {
          account_id: cashAccount.id,
          debit_amount: 0,
          credit_amount: rewardAmount,
          description: `Pembayaran reward ${employee.name}`
        }
      ];

      // Create the transaction
      const transaction = {
        date: rewardRecord.claimed_date || new Date().toISOString().split('T')[0],
        description,
        reference: `RWD-${rewardRecord.id.slice(0, 8)}`,
        status: 'posted' as const,
        created_by: 'system' // This should be the actual user ID in production
      };

      await transactionService.create(transaction, entries);
      
      console.log(`Reward accounting entries created: ${rewardRecord.id}`);
    } catch (error) {
      console.error('Error creating reward accounting entries:', error);
      throw error;
    }
  },

  /**
   * Sync all existing payroll records to accounting
   */
  async syncExistingPayroll(): Promise<void> {
    try {
      const { data: payrollRecords, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('status', 'paid');

      if (error) throw error;

      for (const record of payrollRecords || []) {
        try {
          await this.createPayrollEntries(record);
          if (record.status === 'paid') {
            await this.recordPayrollPayment(record);
          }
        } catch (error) {
          console.error(`Error syncing payroll record ${record.id}:`, error);
          // Continue with other records
        }
      }

      console.log(`Synced ${payrollRecords?.length || 0} payroll records to accounting`);
    } catch (error) {
      console.error('Error syncing existing payroll:', error);
      throw error;
    }
  }
};

/**
 * Helper function to get month name in Indonesian
 */
function getMonthName(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || 'Unknown';
}

/**
 * Helper function to handle HRD integration errors
 */
export const handleHRDIntegrationError = (error: any): string => {
  console.error('HRD Integration error:', error);

  if (error.message?.includes('Required') && error.message?.includes('accounts not found')) {
    return 'Akun akuntansi yang diperlukan belum dibuat. Silakan setup bagan akun terlebih dahulu.';
  }

  if (error.message?.includes('Employee not found')) {
    return 'Data karyawan tidak ditemukan';
  }

  if (error.message?.includes('not balanced')) {
    return 'Transaksi tidak seimbang - ada kesalahan dalam perhitungan';
  }

  return error.message || 'Terjadi kesalahan pada integrasi HRD-Akuntansi';
};