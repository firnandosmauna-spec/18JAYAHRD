import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://omfzoasehiecuzaudblp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnpvYXNlaGllY3V6YXVkYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTczNjIsImV4cCI6MjA4MzU5MzM2Mn0.LfyS2bKk_27mOI5aSowdf_jh-b6YLRP59D-yh897w0M";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking database...');
  const { count, error } = await supabase
    .from('employee_loans')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Total loans in employee_loans:', count);
  }
}

check();
