
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://omfzoasehiecuzaudblp.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnpvYXNlaGllY3V6YXVkYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAxNzM2MiIsImV4cCI6MjA4MzU5MzM2Mn0.LfyS2bKk_27mOI5aSowdf_jh-b6YLRP59D-yh897w0M"

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('employees').select('id').limit(1)
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Employee ID Sample:', data[0]?.id)
    console.log('Type of ID:', typeof data[0]?.id)
  }
}

check()
