
import { supabase } from './src/lib/supabase';

async function diagnosePemberkasan() {
    console.log("--- DIAGNOSING PEMBERKASAN ---");

    // 1. Check consumer_pemberkasan table
    const { data: pemberkasan, error: pError } = await supabase
        .from('consumer_pemberkasan')
        .select('*')
        .limit(1);

    if (pError) {
        console.error("CRITICAL: consumer_pemberkasan error:", pError.message);
    } else {
        console.log("SUCCESS: Connected to consumer_pemberkasan");
        if (pemberkasan && pemberkasan.length > 0) {
            const columns = Object.keys(pemberkasan[0]);
            console.log("Available columns:", columns.join(', '));
            
            const required = [
                'booking', 'slik_ojk', 'proses_berkas', 'ots', 'penginputan', 
                'sp3k', 'analis_data', 'lpa_aprasial', 'pip', 'pk', 'akad', 'pencairan_akad',
                'booking_date', 'slik_ojk_date', 'sp3k_date'
            ];
            
            const missing = required.filter(col => !columns.includes(col));
            if (missing.length > 0) {
                console.error("MISSING COLUMNS:", missing.join(', '));
            } else {
                console.log("ALL REQUIRED COLUMNS FOUND.");
            }
        } else {
            console.log("Table is empty. Verify via Supabase Dashboard if possible.");
        }
    }

    // 2. Check logs table
    const { data: logs, error: lError } = await supabase
        .from('consumer_pemberkasan_logs')
        .select('*')
        .limit(1);

    if (lError) {
        console.error("LOGS TABLE ERROR:", lError.message);
        if (lError.message.includes('does not exist')) {
            console.log("ACTION: You need to run the migration for 'consumer_pemberkasan_logs'.");
        }
    } else {
        console.log("SUCCESS: consumer_pemberkasan_logs table exists.");
    }
}

diagnosePemberkasan();
