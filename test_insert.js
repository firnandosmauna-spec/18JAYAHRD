import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://omfzoasehiecuzaudblp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnpvYXNlaGllY3V6YXVkYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTczNjIsImV4cCI6MjA4MzU5MzM2Mn0.LfyS2bKk_27mOI5aSowdf_jh-b6YLRP59D-yh897w0M";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert into employee_loans...');
  
  // First get an employee ID
  const { data: emps } = await supabase.from('employees').select('id, name').limit(1);
  if (!emps || emps.length === 0) {
    console.error('No employees found to test with.');
    return;
  }
  
  const empId = emps[0].id;
  console.log(`Using employee: ${emps[0].name} (${empId})`);

  const { data, error } = await supabase
    .from('employee_loans')
    .insert({
      employee_id: empId,
      amount: 500000,
      remaining_amount: 500000,
      installment_amount: 50000,
      reason: 'Tes pengajuan sistem',
      status: 'pending',
      start_date: new Date().toLocaleDateString('en-CA')
    })
    .select();

  if (error) {
    console.error('Insert failed:', error.message, error.details, error.hint);
  } else {
    console.log('Insert success! Data:', data);
  }
}

testInsert();
