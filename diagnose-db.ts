
import { supabase } from './src/lib/supabase';

async function diagnose() {
    console.log("--- DIAGNOSING SYSTEM ---");

    // 1. Check Settings
    const { data: settings, error: sError } = await supabase.from('system_settings').select('*');
    if (sError) console.error("Settings Error:", sError);
    else {
        console.log("Settings found:", settings.length);
        settings.forEach(s => {
            if (s.key.includes('payroll')) {
                console.log(`  - ${s.key}: ${s.value}`);
            }
        });
    }

    // 2. Check Attendance
    const { data: attendance, error: aError } = await supabase.from('attendance').select('*').limit(5);
    if (aError) console.error("Attendance Error:", aError);
    else {
        console.log("Random Attendance Records:", attendance.length);
        attendance.forEach(a => {
            console.log(`  - Emp: ${a.employee_id}, Date: ${a.date}, Status: ${a.status}`);
        });
    }

    // 3. Check Employees
    const { data: employees, error: eError } = await supabase.from('employees').select('id, name').limit(5);
    if (eError) console.error("Employees Error:", eError);
    else {
        console.log("Employees found:", employees.length);
        employees.forEach(e => console.log(`  - ${e.id}: ${e.name}`));
    }
}

diagnose();
