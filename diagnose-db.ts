
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

    // 4. Check Consumer Profiles Schema
    console.log("\n--- Checking consumer_profiles table ---");
    const { data: consumers, error: cError } = await supabase.from('consumer_profiles').select('*').limit(1);
    if (cError) {
        console.error("Consumer Profiles Error:", cError.message);
        if (cError.message.includes('not find')) {
            console.log("CRITICAL: The table 'consumer_profiles' might be missing columns.");
        }
    } else {
        console.log("Successfully connected to consumer_profiles.");
        if (consumers && consumers.length > 0) {
            const first = consumers[0];
            console.log("Available columns in first record:", Object.keys(first).join(', '));
            if (!Object.keys(first).includes('bank_process')) {
                console.log("MISSING: 'bank_process' column is NOT found in the database.");
            } else {
                console.log("SUCCESS: 'bank_process' column IS found in the database.");
            }
        } else {
            console.log("Table is empty. Cannot verify column existence via select *.");
        }
    }
}

diagnose();
