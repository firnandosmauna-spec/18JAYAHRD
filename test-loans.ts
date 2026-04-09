import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLoans() {
  console.log('Checking employee_loans...');
  const { data: loans, error: loansError } = await supabase
    .from('employee_loans')
    .select('*');
    
  if (loansError) {
    console.error('Error fetching loans:', loansError.message);
  } else {
    console.log(`Found ${loans.length} loans:`, loans);
  }

  // Also check departments and employees for mapping issues
  const { data: emps, error: empsError } = await supabase.from('employees').select('id, name');
  console.log(`Found ${emps?.length} employees.`);
}

checkLoans();
