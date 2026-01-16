import { utils, writeFile } from 'xlsx';
import type { AttendanceRecord, PayrollRecord, Employee } from '@/lib/supabase';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Helper to format date
const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const exportAttendanceToExcel = (
    attendance: AttendanceRecord[],
    employees: Employee[],
    period: { month: number, year: number }
) => {
    // 1. Prepare Data
    const data = attendance.map(record => {
        const employee = employees.find(e => e.id === record.employee_id);

        // Calculate Late Duration if available
        let lateDuration = '-';
        if (record.status === 'late' && record.check_in) {
            const [h, m] = record.check_in.split(':').map(Number);
            // Assuming 08:00 start for simplicity or dynamic if we passed config
            // But export usually is just raw data dumps
            const startMin = 8 * 60;
            const checkInMin = h * 60 + m;
            const diff = checkInMin - startMin;
            if (diff > 0) lateDuration = `${diff} menit`;
        }

        return {
            'Tanggal': formatDate(record.date),
            'Nama Karyawan': employee?.name || 'Unknown',
            'Jabatan': employee?.position || '-',
            'Jam Masuk': record.check_in || '-',
            'Jam Pulang': record.check_out || '-',
            'Status': record.status === 'present' ? 'Hadir' :
                record.status === 'late' ? 'Terlambat' :
                    record.status === 'absent' ? 'Alpa' : record.status,
            'Keterlambatan': lateDuration,
            'Lokasi': record.location || '-',
            'Catatan': record.notes || '-'
        };
    });

    // 2. Create Workbook and Worksheet
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(data);

    // 3. Add to Workbook
    const sheetName = `Absensi ${months[period.month - 1]}`;
    utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Max 31 chars

    // 4. Save
    writeFile(wb, `Laporan_Absensi_${months[period.month - 1]}_${period.year}.xlsx`);
};

export const exportPayrollToExcel = (
    payroll: PayrollRecord[],
    employees: Employee[],
    period: { month: number, year: number }
) => {
    // 1. Prepare Data
    const data = payroll.map(record => {
        const employee = employees.find(e => e.id === record.employee_id);

        return {
            'Nama Karyawan': employee?.name || 'Unknown',
            'Jabatan': employee?.position || '-',
            'Gaji Pokok': record.base_salary,
            'Tunjangan': record.allowances,
            'Potongan': record.deductions,
            'Gaji Bersih': record.net_salary,
            'Status': record.status === 'paid' ? 'Dibayar' : 'Pending',
            'Tanggal Bayar': record.pay_date ? formatDate(record.pay_date) : '-'
        };
    });

    // 2. Create Workbook and Worksheet
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(data);

    // Auto-width columns (simple estimation)
    const wscols = [
        { wch: 25 }, // Nama
        { wch: 20 }, // Jabatan
        { wch: 15 }, // Gaji Pokok
        { wch: 15 }, // Tunjangan
        { wch: 15 }, // Potongan
        { wch: 15 }, // Gaji Bersih
        { wch: 10 }, // Status
        { wch: 20 }, // Tanggal Bayar
    ];
    ws['!cols'] = wscols;

    // 3. Add to Workbook
    const sheetName = `Payroll ${months[period.month - 1]}`;
    utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

    // 4. Save
    writeFile(wb, `Laporan_Payroll_${months[period.month - 1]}_${period.year}.xlsx`);
};
