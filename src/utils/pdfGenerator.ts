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

export interface PrintSettings {
    showLogo: boolean;
    companyName: string;
    companyAddress: string;
    companyContact: string; // Phone/Email
    showSignature: boolean;
    footerNote: string;
    additionalNote?: string; // NEW: second line in footer
    headerColor: string; // Hex code for table headers
    tableLayout: 'side_by_side' | 'stacked';
    headerAlignment: 'center' | 'left';
    slipTitle?: string; // NEW: Custom Title
    logoUrl?: string; // NEW: Logo URL
    customFields?: { label: string, value: string, section: 'top' | 'employee' | 'summary' | 'footer' }[]; // NEW: Custom Fields
    paperSize?: 'a4' | 'a5' | 'letter'; // NEW: Paper size
    orientation?: 'p' | 'l'; // NEW: Orientation 'p' = portrait, 'l' = landscape
    signatureLeftHeader?: string; // NEW: Label above left signature
    signatureRightHeader?: string; // NEW: Label above right signature
}

const defaultSettings: PrintSettings = {
    showLogo: true,
    companyName: 'PT. HRD 18 JAYA',
    companyAddress: 'Jl. Contoh Alamat No. 123, Jakarta Selatan',
    companyContact: 'Telp: (021) 12345678 | Email: hrd@jayatempo.com',
    showSignature: true,
    footerNote: 'Dokumen ini sah dan dicetak secara otomatis oleh sistem.',
    additionalNote: '',
    headerColor: '#16a34a', // Green default
    tableLayout: 'side_by_side',
    headerAlignment: 'center',
    slipTitle: 'SLIP GAJI KARYAWAN',
    customFields: [],
    paperSize: 'a4',
    orientation: 'p',
    signatureLeftHeader: 'Diterima Oleh,',
    signatureRightHeader: 'Bagian Keuangan,'
};

export const generateSalarySlip = (payroll: PayrollRecord, employee: Employee, customSettings?: PrintSettings) => {
    const settings = { ...defaultSettings, ...customSettings };
    const doc = new jsPDF({
        orientation: settings.orientation || 'p',
        format: settings.paperSize || 'a4',
        unit: 'mm'
    });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- HEADER ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');

    // Header Alignment Logic
    const headerX = settings.headerAlignment === 'center' ? pageWidth / 2 : 15;
    const headerAlign = settings.headerAlignment as 'center' | 'left' | 'right' | 'justify';

    doc.text(settings.companyName, headerX, 20, { align: headerAlign });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.companyAddress, headerX, 26, { align: headerAlign });
    doc.text(settings.companyContact, headerX, 31, { align: headerAlign });

    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);

    let currentHeaderY = 35; // Start after the line

    // --- CUSTOM TOP FIELDS ---
    if (settings.customFields && settings.customFields.length > 0) {
        settings.customFields.filter(f => f.section === 'top').forEach(f => {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(`${f.label}: ${f.value}`, headerX, currentHeaderY + 5, { align: headerAlign });
            currentHeaderY += 5;
        });
        if (settings.customFields.some(f => f.section === 'top')) {
            currentHeaderY += 2;
            doc.line(15, currentHeaderY, pageWidth - 15, currentHeaderY);
        }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.slipTitle || 'SLIP GAJI KARYAWAN', pageWidth / 2, currentHeaderY + 10, { align: 'center' }); // Use custom title

    // Update reference for next sections
    const titleY = currentHeaderY + 10;

    // --- EMPLOYEE DETAILS ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const leftColX = 15;
    const rightColX = pageWidth / 2 + 10;
    let currentY = titleY + 10;

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

    doc.text(`Bank`, leftColX, currentY + 12);
    doc.text(`: ${employee.bank || '-'}`, leftColX + 30, currentY + 12);

    doc.text(`Rekening`, leftColX, currentY + 18);
    doc.text(`: ${employee.bank_account || '-'}`, leftColX + 30, currentY + 18);

    // Right Column
    doc.text(`ID Karyawan`, rightColX, currentY);
    doc.text(`: ${employee.id.slice(0, 8)}...`, rightColX + 30, currentY);

    doc.text(`Status`, rightColX, currentY + 6);
    doc.text(`: ${employee.status}`, rightColX + 30, currentY + 6);

    // --- CUSTOM EMPLOYEE FIELDS ---
    if (settings.customFields && settings.customFields.length > 0) {
        const empFields = settings.customFields.filter(f => f.section === 'employee');
        empFields.forEach((f, idx) => {
            const yOffset = 12 + (idx * 6);
            doc.text(f.label, leftColX, currentY + yOffset);
            doc.text(`: ${f.value}`, leftColX + 30, currentY + yOffset);
        });
        currentY += (empFields.length * 6);
    }

    currentY += 25;

    // Derive Overtime (Subtract reward_allowance if it exists)
    const derivedOvertime = Math.max(0, payroll.net_salary - payroll.base_salary - payroll.allowances - (payroll.reward_allowance || 0) + payroll.deductions);

    // --- EARNINGS ---
    const earningsData: [string, string][] = [
        ['Gaji Pokok', formatCurrency(payroll.base_salary)],
    ];

    // Add specific allowances if they exist
    if (payroll.meal_allowance && payroll.meal_allowance > 0) {
        earningsData.push(['Uang Makan', formatCurrency(payroll.meal_allowance)]);
    }
    if (payroll.gasoline_allowance && payroll.gasoline_allowance > 0) {
        earningsData.push(['Uang Bensin', formatCurrency(payroll.gasoline_allowance)]);
    }
    if (payroll.position_allowance && payroll.position_allowance > 0) {
        earningsData.push(['Tunjangan Jabatan', formatCurrency(payroll.position_allowance)]);
    }
    if (payroll.thr_allowance && payroll.thr_allowance > 0) {
        earningsData.push(['THR', formatCurrency(payroll.thr_allowance)]);
    }
    if (payroll.discretionary_allowance && payroll.discretionary_allowance > 0) {
        earningsData.push(['Uang Bijak', formatCurrency(payroll.discretionary_allowance)]);
    }

    // Add manual allowances - REMOVED because fields don't exist in DB schema yet

    // Calculate "Lain-lain" for allowances
    const documentedAllowances = (payroll.meal_allowance || 0) +
        (payroll.gasoline_allowance || 0) +
        (payroll.position_allowance || 0) +
        (payroll.thr_allowance || 0) +
        (payroll.discretionary_allowance || 0);
    const otherAllowancesValue = (payroll.allowances || 0) - documentedAllowances;

    if (otherAllowancesValue > 0) {
        earningsData.push(['Lain-lain', formatCurrency(otherAllowancesValue)]);
    } else if (!payroll.meal_allowance) {
        // Fallback for old records without breakdown
        earningsData.push(['Tunjangan', formatCurrency(payroll.allowances)]);
    }

    if (payroll.reward_details && payroll.reward_details.length > 0) {
        payroll.reward_details.forEach(rd => {
            earningsData.push([rd.title, formatCurrency(rd.amount)]);
        });
    } else if (payroll.reward_allowance && payroll.reward_allowance > 0) {
        earningsData.push(['Reward', formatCurrency(payroll.reward_allowance)]);
    }

    earningsData.push(['Lembur (Est.)', formatCurrency(derivedOvertime)]);

    // --- DEDUCTIONS ---
    const detailedDeductions: [string, string][] = [];

    // BPJS
    if (payroll.bpjs_deduction && payroll.bpjs_deduction > 0) {
        detailedDeductions.push(['BPJS', formatCurrency(payroll.bpjs_deduction)]);
    }

    // Potongan Absen
    if (payroll.absent_deduction && payroll.absent_deduction > 0) {
        detailedDeductions.push(['Potongan Absen', formatCurrency(payroll.absent_deduction)]);
    }

    // Pinjaman
    if (payroll.loan_amount && payroll.loan_amount > 0) {
        detailedDeductions.push(['Pinjaman', formatCurrency(payroll.loan_amount)]);
    }

    // Manual Deductions - REMOVED because fields don't exist in DB schema yet

    // Calculate "Lain-lain" for deductions
    const documentedDeductions = (payroll.bpjs_deduction || 0) +
        (payroll.absent_deduction || 0) +
        (payroll.late_deduction || 0) +
        (payroll.loan_amount || 0);
    const otherDeductionsValue = (payroll.deductions || 0) - documentedDeductions;

    if (otherDeductionsValue > 0) {
        detailedDeductions.push(['Lain-lain', formatCurrency(otherDeductionsValue)]);
    }

    if (detailedDeductions.length === 0 && (payroll.deductions || 0) > 0) {
        detailedDeductions.push(['Potongan', formatCurrency(payroll.deductions)]);
    }

    if (settings.tableLayout === 'stacked') {
        // STACKED LAYOUT
        autoTable(doc, {
            startY: currentY,
            head: [['PENERIMAAN', 'JUMLAH']],
            body: earningsData,
            theme: 'grid',
            headStyles: { fillColor: settings.headerColor, textColor: 255 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right' },
            },
            margin: { left: 15, right: 15 },
            tableWidth: pageWidth - 30
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 10;

        autoTable(doc, {
            startY: currentY,
            head: [['POTONGAN', 'JUMLAH']],
            body: detailedDeductions,
            theme: 'grid',
            headStyles: { fillColor: '#dc2626', textColor: 255 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right' },
            },
            margin: { left: 15, right: 15 },
            tableWidth: pageWidth - 30
        });

    } else {
        // SIDE BY SIDE LAYOUT (Default)
        autoTable(doc, {
            startY: currentY,
            head: [['PENERIMAAN', 'JUMLAH']],
            body: earningsData,
            theme: 'grid',
            headStyles: { fillColor: settings.headerColor, textColor: 255 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right' },
            },
            margin: { left: 15, right: pageWidth / 2 + 2 },
            tableWidth: (pageWidth / 2) - 20
        });

        autoTable(doc, {
            startY: currentY,
            head: [['POTONGAN', 'JUMLAH']],
            body: detailedDeductions,
            theme: 'grid',
            headStyles: { fillColor: '#dc2626', textColor: 255 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right' },
            },
            margin: { left: pageWidth / 2 + 5, right: 15 },
            tableWidth: (pageWidth / 2) - 20
        });
    }

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
    let summaryFinalY = doc.lastAutoTable.finalY + 5;

    // --- CUSTOM SUMMARY FIELDS ---
    if (settings.customFields && settings.customFields.length > 0) {
        settings.customFields.filter(f => f.section === 'summary').forEach(f => {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${f.label}: ${f.value}`, 15, summaryFinalY);
            summaryFinalY += 5;
        });
    }

    let signatureY = summaryFinalY + 20;

    // --- PAGE BREAK CHECK FOR SIGNATURE ---
    if (signatureY > pageHeight - 50) {
        doc.addPage();
        signatureY = 30; // Start at top of new page
    }

    // --- SIGNATURE ---
    if (settings.showSignature) {
        doc.setFontSize(10);
        doc.text('Jakarta, ' + formatDate(new Date().toISOString()), pageWidth - 50, signatureY - 15, { align: 'center' });

        doc.text(settings.signatureLeftHeader || 'Diterima Oleh,', 50, signatureY, { align: 'center' });
        doc.text(settings.signatureRightHeader || 'Bagian Keuangan,', pageWidth - 50, signatureY, { align: 'center' });

        doc.text(`(${employee.name})`, 50, signatureY + 25, { align: 'center' });
        doc.text('(_________________)', pageWidth - 50, signatureY + 25, { align: 'center' });
    }

    // --- FOOTER NOTE ---
    if (settings.footerNote || settings.additionalNote || (settings.customFields && settings.customFields.some(f => f.section === 'footer'))) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);

        // Calculate dynamic footer Y (at least 15mm from bottom)
        let footerY = pageHeight - 15;

        // Count required footer lines to avoid cutting off
        const footerFields = settings.customFields?.filter(f => f.section === 'footer') || [];
        const totalLines = (settings.footerNote ? 1 : 0) + (settings.additionalNote ? 1 : 0) + footerFields.length;

        // Move Y up based on content lines
        footerY -= (totalLines - 1) * 4;

        if (settings.footerNote) {
            doc.text(settings.footerNote, pageWidth / 2, footerY, { align: 'center' });
            footerY += 4;
        }
        if (settings.additionalNote) {
            doc.text(settings.additionalNote, pageWidth / 2, footerY, { align: 'center' });
            footerY += 4;
        }

        // --- CUSTOM FOOTER FIELDS ---
        if (footerFields.length > 0) {
            footerFields.forEach(f => {
                doc.text(`${f.label}: ${f.value}`, pageWidth / 2, footerY, { align: 'center' });
                footerY += 4;
            });
        }
    }

    // Save the PDF
    doc.save(`Slip_Gaji_${employee.name}_${periodString}.pdf`);
};

export const generatePayrollReport = (
    payrollData: { payroll: PayrollRecord; employee: Employee }[],
    period: string,
    customSettings?: Partial<PrintSettings>
) => {
    const settings = { ...defaultSettings, ...customSettings };
    const doc = new jsPDF({
        orientation: 'l', // Landscape for better table width
        format: 'a4',
        unit: 'mm'
    });
    
    const pageWidth = doc.internal.pageSize.width;

    // --- HEADER ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('LAPORAN PENGGAJIAN KARYAWAN', pageWidth / 2, 22, { align: 'center' });
    doc.text(`Periode: ${period}`, pageWidth / 2, 27, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(15, 32, pageWidth - 15, 32);

    // --- TABLE DATA ---
    const tableHeaders = [
        ['No', 'Nama Karyawan', 'Jabatan', 'Gaji Pokok', 'Total Tunjangan', 'Total Potongan', 'Gaji Bersih']
    ];

    const tableData = payrollData.map((data, index) => {
        const p = data.payroll;
        const e = data.employee;
        
        // Use consolidated fields from PayrollRecord
        const totalAllowances = p.allowances + (p.reward_allowance || 0);
        
        return [
            index + 1,
            e.name,
            e.position,
            formatCurrency(p.base_salary),
            formatCurrency(totalAllowances),
            formatCurrency(p.deductions),
            formatCurrency(p.net_salary)
        ];
    });

    // Add Totals row
    const totals = payrollData.reduce((acc, curr) => {
        const p = curr.payroll;
        const totalAllowances = p.allowances + (p.reward_allowance || 0);
        
        acc.base += p.base_salary;
        acc.allowances += totalAllowances;
        acc.deductions += p.deductions;
        acc.net += p.net_salary;
        return acc;
    }, { base: 0, allowances: 0, deductions: 0, net: 0 });

    tableData.push([
        '',
        'TOTAL SELURUH',
        '',
        formatCurrency(totals.base),
        formatCurrency(totals.allowances),
        formatCurrency(totals.deductions),
        formatCurrency(totals.net)
    ]);

    autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { 
            fillColor: settings.headerColor || '#16a34a',
            textColor: 255,
            fontSize: 9,
            halign: 'center'
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = '#f0fdf4'; // Light green background for totals
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // --- SIGNATURES ---
    if (settings.showSignature) {
        const sigY = finalY + 20;
        doc.setFontSize(10);
        doc.text('Dicetak pada: ' + new Date().toLocaleString('id-ID'), 15, sigY - 10);
        
        doc.text('Disetujui oleh,', pageWidth - 60, sigY);
        doc.text('( ____________________ )', pageWidth - 60, sigY + 25);
        doc.text('Manager HRD', pageWidth - 60, sigY + 30);
    }

    doc.save(`Laporan_Payroll_${period.replace(/\s/g, '_')}.pdf`);
};

export const generateSampleSalarySlip = (customSettings: PrintSettings) => {
    const dummyEmployee: Employee = {
        id: '12345678-ABCD-EFGH-IJKL-999999999999',
        name: 'Budi Setiawan (CONTOH)',
        position: 'Staff Administrasi',
        department: 'Operasional',
        status: 'active',
        bank: 'BCA',
        bank_account: '88800099911',
        salary: 5000000,
        email: 'budi.contoh@perusahaan.com',
        phone: '0812-3456-7890',
        address: 'Jl. Merpati No. 45, Jakarta',
        join_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attendance_score: 100
    };

    const dummyPayroll: PayrollRecord = {
        id: 'PREVIEW_ID',
        employee_id: dummyEmployee.id,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
        base_salary: 5000000,
        allowances: 1250000,
        deductions: 250000,
        net_salary: 6000000,
        meal_allowance: 500000,
        gasoline_allowance: 300000,
        position_allowance: 200000,
        thr_allowance: 0,
        discretionary_allowance: 100000,
        bpjs_deduction: 150000,
        absent_deduction: 100000,
        reward_allowance: 150000,
        reward_details: [{ title: 'Bonus Performa', amount: 150000 }],
        status: 'paid',
        updated_at: new Date().toISOString()
    };

    generateSalarySlip(dummyPayroll, dummyEmployee, customSettings);
};
