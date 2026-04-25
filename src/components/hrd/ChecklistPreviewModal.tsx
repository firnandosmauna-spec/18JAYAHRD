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
import { Printer, Download, X } from 'lucide-react';
import { generateEmployeeChecklist } from '@/utils/pdfGenerator';

interface ChecklistPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: any[];
    period: string;
    companyName: string;
}

export function ChecklistPreviewModal({
    isOpen,
    onClose,
    employees,
    period,
    companyName
}: ChecklistPreviewModalProps) {
    const handleDownload = () => {
        generateEmployeeChecklist(employees, period);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                <DialogHeader className="p-4 bg-slate-900 text-white flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Printer className="w-5 h-5" /> Pratinjau Checklist Gaji
                        </DialogTitle>
                        <p className="text-slate-400 text-xs mt-1">Periode: {period}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
                        <X className="w-5 h-5" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 bg-slate-200 p-8 overflow-hidden flex justify-center">
                    <ScrollArea className="w-full max-w-[210mm] shadow-2xl">
                        {/* THE "WHITE PAPER" CONTENT */}
                        <div className="bg-white min-h-[297mm] w-full p-[20mm] text-black font-serif shadow-sm mx-auto">
                            {/* Header */}
                            <div className="text-center mb-8 border-b-2 border-black pb-4">
                                <h1 className="text-2xl font-bold uppercase mb-1">{companyName}</h1>
                                <h2 className="text-lg font-bold">CHECKLIST PENGAMBILAN GAJI KARYAWAN</h2>
                                <p className="text-md">Periode: {period}</p>
                            </div>

                            {/* Table */}
                            <table className="w-full border-collapse border border-black text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-black p-2 w-10 text-center">No</th>
                                        <th className="border border-black p-2 text-left">Nama Karyawan</th>
                                        <th className="border border-black p-2 text-left">Jabatan</th>
                                        <th className="border border-black p-2 w-20 text-center">Status</th>
                                        <th className="border border-black p-2 w-40 text-center">Tanda Tangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((emp, index) => (
                                        <tr key={index} className="h-12">
                                            <td className="border border-black p-2 text-center">{index + 1}</td>
                                            <td className="border border-black p-2 font-medium">{emp.employee_name || emp.name}</td>
                                            <td className="border border-black p-2 text-gray-700">{emp.employee_position || emp.position}</td>
                                            <td className="border border-black p-2 text-center text-xs uppercase">
                                                {emp.status === 'paid' ? 'Lunas' : 'Pending'}
                                            </td>
                                            <td className="border border-black p-2 relative">
                                                <div className="absolute bottom-1 left-2 right-2 border-b border-gray-300"></div>
                                            </td>
                                        </tr>
                                    ))}
                                    {employees.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="border border-black p-8 text-center text-gray-400 italic">
                                                Tidak ada data karyawan
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Footer */}
                            <div className="mt-12 flex justify-between items-start text-sm">
                                <div>
                                    <p className="italic text-gray-500">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                                </div>
                                <div className="text-center w-48">
                                    <p className="mb-20">Diserahkan oleh,</p>
                                    <div className="border-t border-black pt-1">
                                        <p className="font-bold">Administrasi / Kasir</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 bg-white border-t flex justify-center sm:justify-center gap-4">
                    <Button variant="outline" onClick={onClose} className="w-32">
                        Tutup
                    </Button>
                    <Button onClick={handleDownload} className="w-48 bg-slate-900 hover:bg-slate-800 text-white">
                        <Download className="w-4 h-4 mr-2" />
                        Unduh PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
