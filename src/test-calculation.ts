import { attendanceService } from '@/services/supabaseService';
import { settingsService } from '@/services/settingsService';

// Mock data (replace with actual IDs if known, or use a known test case)
const EMPLOYEE_ID = 'e3e57187-5735-4654-8032-9017631320ef'; // Replace with a valid employee ID
const MONTH = 2; // February
const YEAR = 2026;

async function testCalculation() {
    console.log("Starting calculation test...");

    try {
        // 1. Fetch Settings
        console.log("Fetching payroll settings...");
        const settings = await settingsService.getPayrollSettings();
        console.log("Settings:", settings);

        // 2. Fetch Attendance
        console.log(`Fetching attendance for Employee: ${EMPLOYEE_ID}, Month: ${MONTH}, Year: ${YEAR}`);
        const attendance = await attendanceService.getByEmployee(EMPLOYEE_ID, MONTH, YEAR);
        console.log("Attendance count:", attendance?.length);

        // 3. Simulating Logic
        const absentCount = attendance?.filter((a: any) => a.status === 'absent').length || 0;
        console.log("Absent Count:", absentCount);

        let absentDeductionAmount = 0;
        if (absentCount > 0) {
            if (settings && settings.payroll_deduction_absent > 0) {
                absentDeductionAmount = absentCount * settings.payroll_deduction_absent;
                console.log("Calculated Absent Deduction:", absentDeductionAmount);
            } else {
                console.log("No deduction setting or value is 0");
            }
        } else {
            console.log("No absences found.");
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testCalculation();
