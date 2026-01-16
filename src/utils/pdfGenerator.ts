import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PayrollRecord, Employee } from '@/lib/supabase';

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
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export const generateSalarySlip = (payroll: PayrollRecord, employee: Employee) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- HEADER ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PT. JAYA TEMPO', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Contoh Alamat No. 123, Jakarta Selatan', pageWidth / 2, 26, { align: 'center' });
    doc.text('Telp: (021) 12345678 | Email: hrd@jayatempo.com', pageWidth / 2, 31, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SLIP GAJI KARYAWAN', pageWidth / 2, 45, { align: 'center' });

    // --- EMPLOYEE DETAILS ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const leftColX = 15;
    const rightColX = pageWidth / 2 + 10;
    let currentY = 55;

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const periodString = `${months[payroll.period_month - 1]} ${payroll.period_year}`;

    doc.text(`Periode: ${periodString}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Left Column
    doc.text(`Nama Karyawan`, leftColX, currentY);
    doc.text(`: ${employee.name}`, leftColX + 30, currentY);

    doc.text(`Jabatan`, leftColX, currentY + 6);
    doc.text(`: ${employee.position}`, leftColX + 30, currentY + 6);

    // Right Column
    doc.text(`ID Karyawan`, rightColX, currentY);
    // Truncate UUID for display if needed, or just show it.
    doc.text(`: ${employee.id.slice(0, 8)}...`, rightColX + 30, currentY);

    doc.text(`Status`, rightColX, currentY + 6);
    doc.text(`: ${employee.status}`, rightColX + 30, currentY + 6);

    currentY += 15;

    // Derive Overtime from Net Salary equation: Net = Base + Allow + OT - Ded
    // OT = Net - Base - Allow + Ded
    const derivedOvertime = Math.max(0, payroll.net_salary - payroll.base_salary - payroll.allowances + payroll.deductions);

    // --- EARNINGS TABLE ---
    const earningsData = [
        ['Gaji Pokok', formatCurrency(payroll.base_salary)],
        ['Tunjangan', formatCurrency(payroll.allowances)],
        ['Lembur (Est.)', formatCurrency(derivedOvertime)],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [['PENERIMAAN', 'JUMLAH']],
        body: earningsData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: 255 }, // Green header
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right' },
        },
        margin: { left: 15, right: pageWidth / 2 + 2 },
        tableWidth: (pageWidth / 2) - 20
    });

    // --- DEDUCTIONS TABLE ---

    let detailedDeductions = [['Total Potongan', formatCurrency(payroll.deductions)]];

    autoTable(doc, {
        startY: currentY,
        head: [['POTONGAN', 'JUMLAH']],
        body: detailedDeductions,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255 }, // Red header
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right' },
        },
        margin: { left: pageWidth / 2 + 5, right: 15 },
        tableWidth: (pageWidth / 2) - 20
    });

    // Get the lower Y after tables
    // @ts-ignore
    const finalY = Math.max(doc.lastAutoTable.finalY) + 10;

    // --- SUMMARY ---
    // Recalculate Total Earnings for display consistency
    const totalEarnings = payroll.base_salary + payroll.allowances + derivedOvertime;

    autoTable(doc, {
        startY: finalY,
        body: [
            ['Total Penerimaan', formatCurrency(totalEarnings)],
            ['Total Potongan', `(${formatCurrency(payroll.deductions)})`],
            [{ content: 'TAKE HOME PAY', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: formatCurrency(payroll.net_salary), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }],
        ],
        theme: 'plain',
        columnStyles: {
            0: { cellWidth: 100 },
            1: { halign: 'right' },
        },
        margin: { left: 15, right: 15 }, // Full width
    });

    // @ts-ignore
    const signatureY = doc.lastAutoTable.finalY + 30;

    // --- SIGNATURE ---
    doc.setFontSize(10);
    doc.text('Jakarta, ' + formatDate(new Date().toISOString()), pageWidth - 50, signatureY - 15, { align: 'center' });

    doc.text('Diterima Oleh,', 50, signatureY, { align: 'center' });
    doc.text('Bagian Keuangan,', pageWidth - 50, signatureY, { align: 'center' });

    doc.text(`(${employee.name})`, 50, signatureY + 25, { align: 'center' });
    doc.text('(_________________)', pageWidth - 50, signatureY + 25, { align: 'center' });

    // Save the PDF
    doc.save(`Slip_Gaji_${employee.name}_${periodString}.pdf`);
};
