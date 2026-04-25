import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Download, X, Mail } from 'lucide-react';
import { generateSalarySlip } from '@/utils/pdfGenerator';
import { PayrollRecord, Employee } from '@/lib/supabase';

interface SalarySlipPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    payroll: PayrollRecord;
    employee: Employee;
    printSettings: any;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export function SalarySlipPreviewModal({
    isOpen,
    onClose,
    payroll,
    employee,
    printSettings
}: SalarySlipPreviewModalProps) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const periodString = `${months[payroll.period_month - 1]} ${payroll.period_year}`;

    // Derived calculations (match pdfGenerator)
    const derivedOvertime = Math.max(0, (payroll.net_salary || 0) - (payroll.base_salary || 0) - (payroll.allowances || 0) - (payroll.reward_allowance || 0) + (payroll.deductions || 0));
    
    const documentedAllowances = (payroll.meal_allowance || 0) +
        (payroll.gasoline_allowance || 0) +
        (payroll.position_allowance || 0) +
        (payroll.thr_allowance || 0) +
        (payroll.discretionary_allowance || 0);
    const otherAllowancesValue = (payroll.allowances || 0) - documentedAllowances;

    const documentedDeductions = (payroll.bpjs_deduction || 0) +
        (payroll.absent_deduction || 0) +
        (payroll.late_deduction || 0) +
        (payroll.loan_amount || 0);
    const otherDeductionsValue = (payroll.deductions || 0) - documentedDeductions;

    const totalEarnings = (payroll.base_salary || 0) + (payroll.allowances || 0) + (payroll.reward_allowance || 0) + derivedOvertime;

    const handleDownload = () => {
        generateSalarySlip(payroll, employee, printSettings);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                <DialogHeader className="p-4 bg-hrd text-white flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Printer className="w-5 h-5" /> Pratinjau Slip Gaji
                        </DialogTitle>
                        <p className="text-white/70 text-xs mt-1">Karyawan: {employee.name} | Periode: {periodString}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 bg-slate-100 p-4 sm:p-8 overflow-hidden flex justify-center">
                    <ScrollArea className="w-full max-w-[210mm] shadow-xl">
                        {/* THE "WHITE PAPER" SLIP */}
                        <div className="bg-white min-h-[297mm] w-full p-8 sm:p-12 text-gray-800 font-sans mx-auto">
                            {/* Company Header */}
                            <div className={`mb-6 ${printSettings?.headerAlignment === 'center' ? 'text-center' : 'text-left'}`}>
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight uppercase">{printSettings?.companyName || 'PT. HRD 18 JAYA'}</h1>
                                <p className="text-xs text-gray-500 mt-1">{printSettings?.companyAddress}</p>
                                <p className="text-xs text-gray-500">{printSettings?.companyContact}</p>
                                <div className="mt-4 border-b-2 border-gray-900"></div>
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold uppercase tracking-widest">{printSettings?.slipTitle || 'SLIP GAJI KARYAWAN'}</h2>
                                <p className="text-sm font-medium text-gray-600">Periode: {periodString}</p>
                            </div>

                            {/* Employee Info Grid */}
                            <div className="grid grid-cols-2 gap-8 mb-8 text-sm border-y border-gray-100 py-6">
                                <div className="space-y-2">
                                    <div className="flex">
                                        <span className="w-32 text-gray-500">Nama Karyawan</span>
                                        <span className="font-bold">: {employee.name}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-32 text-gray-500">Jabatan</span>
                                        <span>: {employee.position}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-32 text-gray-500">Bank</span>
                                        <span>: {employee.bank || '-'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-32 text-gray-500">Rekening</span>
                                        <span>: {employee.bank_account || '-'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex">
                                        <span className="w-32 text-gray-500">ID Karyawan</span>
                                        <span className="font-mono text-xs">: {employee.id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex">
                                        <span className="w-32 text-gray-500">Status</span>
                                        <span>: {employee.status}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Earnings & Deductions Tables */}
                            <div className="flex flex-col md:flex-row gap-0 border border-gray-900 mb-8">
                                {/* Earnings Column */}
                                <div className="flex-1 border-r border-gray-900">
                                    <div className="bg-gray-900 text-white p-2 text-center text-xs font-bold uppercase tracking-tighter">PENERIMAAN</div>
                                    <div className="divide-y divide-gray-200">
                                        <div className="flex justify-between p-2 text-sm">
                                            <span>Gaji Pokok</span>
                                            <span className="font-mono">{formatCurrency(payroll.base_salary)}</span>
                                        </div>
                                        {(payroll.meal_allowance || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Uang Makan</span>
                                                <span className="font-mono">{formatCurrency(payroll.meal_allowance || 0)}</span>
                                            </div>
                                        )}
                                        {(payroll.gasoline_allowance || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Uang Bensin</span>
                                                <span className="font-mono">{formatCurrency(payroll.gasoline_allowance || 0)}</span>
                                            </div>
                                        )}
                                        {(payroll.position_allowance || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Tunjangan Jabatan</span>
                                                <span className="font-mono">{formatCurrency(payroll.position_allowance || 0)}</span>
                                            </div>
                                        )}
                                        {(payroll.thr_allowance || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>THR</span>
                                                <span className="font-mono">{formatCurrency(payroll.thr_allowance || 0)}</span>
                                            </div>
                                        )}
                                        {(payroll.discretionary_allowance || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Uang Bijak</span>
                                                <span className="font-mono">{formatCurrency(payroll.discretionary_allowance || 0)}</span>
                                            </div>
                                        )}
                                        {otherAllowancesValue > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Lain-lain</span>
                                                <span className="font-mono">{formatCurrency(otherAllowancesValue)}</span>
                                            </div>
                                        )}
                                        {(payroll.reward_allowance || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Reward</span>
                                                <span className="font-mono">{formatCurrency(payroll.reward_allowance || 0)}</span>
                                            </div>
                                        )}
                                        {derivedOvertime > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Lembur (Est.)</span>
                                                <span className="font-mono">{formatCurrency(derivedOvertime)}</span>
                                            </div>
                                        )}
                                        {/* Filler to keep columns even-ish if needed */}
                                    </div>
                                </div>

                                {/* Deductions Column */}
                                <div className="flex-1">
                                    <div className="bg-red-700 text-white p-2 text-center text-xs font-bold uppercase tracking-tighter">POTONGAN</div>
                                    <div className="divide-y divide-gray-200">
                                        {(payroll.bpjs_deduction || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>BPJS</span>
                                                <span className="font-mono">({formatCurrency(payroll.bpjs_deduction || 0)})</span>
                                            </div>
                                        )}
                                        {(payroll.absent_deduction || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Potongan Absen</span>
                                                <span className="font-mono">({formatCurrency(payroll.absent_deduction || 0)})</span>
                                            </div>
                                        )}
                                        {(payroll.late_deduction || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Potongan Telat</span>
                                                <span className="font-mono">({formatCurrency(payroll.late_deduction || 0)})</span>
                                            </div>
                                        )}
                                        {(payroll.loan_amount || 0) > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Pinjaman</span>
                                                <span className="font-mono">({formatCurrency(payroll.loan_amount || 0)})</span>
                                            </div>
                                        )}
                                        {otherDeductionsValue > 0 && (
                                            <div className="flex justify-between p-2 text-sm">
                                                <span>Lain-lain</span>
                                                <span className="font-mono">({formatCurrency(otherDeductionsValue)})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="border border-gray-900 bg-gray-50 p-4 mb-12">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Total Penerimaan</span>
                                    <span className="font-mono font-bold text-green-700">{formatCurrency(totalEarnings)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-4">
                                    <span className="text-gray-600">Total Potongan</span>
                                    <span className="font-mono font-bold text-red-700">({formatCurrency(payroll.deductions)})</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-300">
                                    <span className="text-lg font-bold uppercase">Take Home Pay</span>
                                    <span className="text-2xl font-black text-gray-900 font-mono tracking-tight">{formatCurrency(payroll.net_salary)}</span>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-20 text-sm mt-20">
                                <div className="text-center">
                                    <p className="mb-24">{printSettings?.signatureLeftHeader || 'Diterima Oleh,'}</p>
                                    <p className="font-bold underline uppercase">{employee.name}</p>
                                </div>
                                <div className="text-center">
                                    <p className="mb-24">Jakarta, {formatDate(new Date().toISOString())}<br/>{printSettings?.signatureRightHeader || 'Bagian Keuangan,'}</p>
                                    <p className="font-bold underline uppercase">( _________________ )</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-20 text-center text-[10px] text-gray-400 italic">
                                <p>{printSettings?.footerNote}</p>
                                <p>{printSettings?.additionalNote}</p>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 bg-white border-t flex flex-col sm:flex-row justify-center sm:justify-center gap-3">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-32 order-2 sm:order-1">
                        Tutup
                    </Button>
                    <Button onClick={handleDownload} className="w-full sm:w-48 bg-hrd hover:bg-hrd/90 text-white order-1 sm:order-2">
                        <Download className="w-4 h-4 mr-2" />
                        Unduh PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
