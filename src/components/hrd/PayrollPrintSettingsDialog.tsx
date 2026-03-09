import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Settings, Save } from 'lucide-react';
import { PrintSettings, generateSampleSalarySlip } from '@/utils/pdfGenerator';
import type { PayrollRecord, Employee } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Eye, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface PayrollPrintSettingsDialogProps {
    onSettingsChange?: (settings: PrintSettings) => void;
    payroll?: PayrollRecord;
    employee?: Employee;
}

const STORAGE_KEY = 'hris_payroll_print_settings';

const defaultSettings: PrintSettings = {
    showLogo: true,
    companyName: 'PT. DELAPAN BELAS JAYA',
    companyAddress: 'Jl. Contoh Alamat No. 123, Jakarta Selatan',
    companyContact: 'Telp: (021) 12345678 | Email: hrd@jayatempo.com',
    showSignature: true,
    footerNote: 'Dokumen ini sah dan dicetak secara otomatis oleh sistem.',
    headerColor: '#16a34a',
    tableLayout: 'side_by_side',
    headerAlignment: 'center',
    slipTitle: 'SLIP GAJI KARYAWAN',
    customFields: [],
    signatureLeftHeader: 'Diterima Oleh,',
    signatureRightHeader: 'Bagian Keuangan,'
};

// --- PREVIEW COMPONENT ---
// --- PREVIEW COMPONENT ---
function SlipPreview({ settings, payroll: realPayroll, employee: realEmployee }: { settings: PrintSettings, payroll?: PayrollRecord, employee?: Employee }) {
    const dummyEmployee: Employee = {
        id: '12345678-ABCD-EFGH-IJKL-999999999999',
        name: 'Budi Setiawan',
        position: 'Staff Admin',
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

    const employee = realEmployee || dummyEmployee;
    const payroll = realPayroll || dummyPayroll;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const isLandscape = settings.orientation === 'l';
    const paperDimensions: Record<string, string> = {
        'a4': isLandscape ? 'aspect-[1.41/1]' : 'aspect-[1/1.41]',
        'a5': isLandscape ? 'aspect-[1.41/1]' : 'aspect-[1/1.41]',
        'letter': isLandscape ? 'aspect-[1.29/1]' : 'aspect-[1/1.29]',
    };

    const aspectClass = paperDimensions[settings.paperSize || 'a4'] || 'aspect-[1/1.41]';
    const headerAlignClass = settings.headerAlignment === 'center' ? 'text-center' : 'text-left';

    return (
        <div className={`border border-gray-200 rounded-sm bg-white shadow-md p-6 font-serif text-[10px] min-h-[500px] w-full mx-auto origin-top transition-all duration-300 ${aspectClass}`} style={{ width: isLandscape ? '297mm' : '210mm', minWidth: isLandscape ? '297mm' : '210mm' }}>
            {/* Header */}
            <div className={headerAlignClass}>
                {settings.showLogo && (
                    <div className={`mb-2 flex ${settings.headerAlignment === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain grayscale" />
                        ) : (
                            <div className="h-10 w-10 bg-gray-100 flex items-center justify-center border border-dashed text-[8px] text-gray-400">LOGO</div>
                        )}
                    </div>
                )}
                <h1 className="text-sm font-bold uppercase">{settings.companyName}</h1>
                <p className="text-[8px] leading-tight text-gray-600">{settings.companyAddress}</p>
                <p className="text-[8px] leading-tight text-gray-600">{settings.companyContact}</p>
            </div>

            <Separator className="my-3" />

            {/* Custom Top Fields */}
            {settings.customFields?.filter(f => f.section === 'top').map((f, i) => (
                <p key={i} className={`text-[8px] italic text-gray-500 ${headerAlignClass}`}>{f.label}: {f.value}</p>
            ))}
            {settings.customFields?.some(f => f.section === 'top') && <Separator className="my-2 border-dashed" />}

            <h2 className="text-center font-bold text-xs underline mb-4">{settings.slipTitle || 'SLIP GAJI KARYAWAN'}</h2>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-x-8 mb-4 text-left">
                <div className="space-y-1">
                    <div className="grid grid-cols-[60px_1fr]"><span>Nama</span><span className="font-medium">: {employee.name}</span></div>
                    <div className="grid grid-cols-[60px_1fr]"><span>Jabatan</span><span className="font-medium">: {employee.position}</span></div>
                    {settings.customFields?.filter(f => f.section === 'employee').map((f, i) => (
                        <div key={i} className="grid grid-cols-[60px_1fr] font-medium"><span>{f.label}</span><span>: {f.value}</span></div>
                    ))}
                </div>
                <div className="space-y-1">
                    <div className="grid grid-cols-[60px_1fr]"><span>Periode</span><span className="font-medium">: {months[payroll.period_month - 1]} {payroll.period_year}</span></div>
                    <div className="grid grid-cols-[60px_1fr]"><span>Status</span><span className="font-medium">: {employee.status === 'active' ? 'Karyawan Tetap' : 'Kontrak'}</span></div>
                </div>
            </div>

            {/* Tables Area */}
            <div className={`grid ${settings.tableLayout === 'stacked' ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-2'} mb-4 text-left`}>
                {/* Earnings */}
                <div>
                    <div style={{ backgroundColor: settings.headerColor }} className="text-white font-bold p-1 px-2 mb-1 flex justify-between">
                        <span>PENERIMAAN</span><span>JUMLAH</span>
                    </div>
                    <div className="space-y-1 px-1">
                        <div className="flex justify-between border-b pb-0.5"><span>Gaji Pokok</span><span>{formatCurrency(payroll.base_salary)}</span></div>
                        {payroll.meal_allowance > 0 && <div className="flex justify-between border-b pb-0.5"><span>Uang Makan</span><span>{formatCurrency(payroll.meal_allowance)}</span></div>}
                        {payroll.gasoline_allowance > 0 && <div className="flex justify-between border-b pb-0.5"><span>Uang Bensin</span><span>{formatCurrency(payroll.gasoline_allowance)}</span></div>}
                        {payroll.reward_allowance > 0 && <div className="flex justify-between border-b pb-0.5 italic text-gray-500"><span>Reward</span><span>{formatCurrency(payroll.reward_allowance)}</span></div>}
                        {payroll.position_allowance > 0 && <div className="flex justify-between border-b pb-0.5"><span>Tunjangan</span><span>{formatCurrency(payroll.position_allowance)}</span></div>}
                    </div>
                </div>

                {/* Deductions */}
                <div>
                    <div className="bg-red-600 text-white font-bold p-1 px-2 mb-1 flex justify-between">
                        <span>POTONGAN</span><span>JUMLAH</span>
                    </div>
                    <div className="space-y-1 px-1">
                        {payroll.bpjs_deduction > 0 && <div className="flex justify-between border-b pb-0.5"><span>BPJS</span><span>{formatCurrency(payroll.bpjs_deduction)}</span></div>}
                        {payroll.absent_deduction > 0 && <div className="flex justify-between border-b pb-0.5"><span>Absen</span><span>{formatCurrency(payroll.absent_deduction)}</span></div>}
                        {(payroll.deductions - (payroll.bpjs_deduction || 0) - (payroll.absent_deduction || 0)) > 0 &&
                            <div className="flex justify-between border-b pb-0.5"><span>Lain-lain</span><span>{formatCurrency(payroll.deductions - (payroll.bpjs_deduction || 0) - (payroll.absent_deduction || 0))}</span></div>}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="border border-gray-100 bg-gray-50 p-2 space-y-1 mb-4 text-left">
                <div className="flex justify-between text-[8px]"><span>Total Penerimaan</span><span>{formatCurrency(payroll.base_salary + payroll.allowances + (payroll.reward_allowance || 0))}</span></div>
                <div className="flex justify-between text-[8px]"><span>Total Potongan</span><span>({formatCurrency(payroll.deductions)})</span></div>
                <div className="flex justify-between font-bold text-[9px] border-t pt-1"><span>TAKE HOME PAY</span><span>{formatCurrency(payroll.net_salary)}</span></div>
            </div>

            {/* Custom Summary Fields */}
            {settings.customFields?.filter(f => f.section === 'summary').map((f, i) => (
                <p key={i} className="text-[8px] text-gray-600 border-l-2 border-green-200 pl-2 mb-2">{f.label}: {f.value}</p>
            ))}

            {/* Signature Area */}
            {settings.showSignature && (
                <div className="flex justify-between mt-8 mb-6 px-4 text-left">
                    <div className="text-center w-32 border-t border-gray-300 pt-1">
                        <p className="text-[7px] mb-8">{settings.signatureLeftHeader || 'Diterima Oleh,'}</p>
                        ({employee.name})
                    </div>
                    <div className="text-center w-32 border-t border-gray-300 pt-1">
                        <p className="text-[7px] mb-8">{settings.signatureRightHeader || 'Bagian Keuangan,'}</p>
                        (_________________)
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center space-y-0.5 text-[7px] text-gray-500">
                {settings.footerNote && <p>{settings.footerNote}</p>}
                {settings.additionalNote && <p>{settings.additionalNote}</p>}
                {settings.customFields?.filter(f => f.section === 'footer').map((f, i) => (
                    <p key={i} className="font-bold">{f.label}: {f.value}</p>
                ))}
            </div>
        </div>
    );
}

export function PayrollPrintSettingsDialog({ onSettingsChange, payroll, employee }: PayrollPrintSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
    const { toast } = useToast();

    // Drag-to-scroll state
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setStartY(e.pageY - scrollRef.current.offsetTop);
        setScrollLeft(scrollRef.current.scrollLeft);
        setScrollTop(scrollRef.current.scrollTop);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const y = e.pageY - scrollRef.current.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        scrollRef.current.scrollTop = scrollTop - walkY;
    };

    // Load settings from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSettings({ ...defaultSettings, ...parsed });
                if (onSettingsChange) onSettingsChange({ ...defaultSettings, ...parsed });
            } catch (e) {
                console.error("Failed to parse saved print settings", e);
            }
        }
    }, [onSettingsChange]);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        if (onSettingsChange) onSettingsChange(settings);
        toast({
            title: "Pengaturan Disimpan",
            description: "Pengaturan cetak slip gaji telah disimpan.",
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Pengaturan Cetak">
                    <Settings className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-screen-xl p-0 overflow-hidden border-none shadow-2xl">
                <div className="flex flex-col md:flex-row h-[90vh]">
                    {/* LEFT SIDE: Settings Form - FIXED WIDTH */}
                    <div className="w-full md:w-[400px] md:min-w-[400px] flex flex-col bg-white border-r">
                        <DialogHeader className="p-6 border-b">
                            <DialogTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-hrd" /> Pengaturan Cetak Slip Gaji
                            </DialogTitle>
                            <DialogDescription>
                                Sesuaikan tampilan slip gaji. Perubahan terlihat langsung di sebelah kanan.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="flex-1 p-6">
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="companyName">Nama Perusahaan</Label>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="showLogo"
                                                checked={settings.showLogo}
                                                onCheckedChange={(c) => setSettings(prev => ({ ...prev, showLogo: c }))}
                                            />
                                            <Label htmlFor="showLogo" className="text-xs text-muted-foreground">Tampil Logo</Label>
                                        </div>
                                    </div>
                                    <Input
                                        id="companyName"
                                        value={settings.companyName}
                                        onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="companyAddress">Alamat Perusahaan</Label>
                                    <Textarea
                                        id="companyAddress"
                                        value={settings.companyAddress}
                                        onChange={(e) => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
                                        className="h-20"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="logoUrl">URL Logo Perusahaan</Label>
                                    <Input
                                        id="logoUrl"
                                        placeholder="https://example.com/logo.png"
                                        value={settings.logoUrl || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                                        disabled={!settings.showLogo}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Masukkan link gambar logo (opsional). Aktifkan "Tampil Logo" di atas.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="companyContact">Kontak (Telp/Email)</Label>
                                    <Input
                                        id="companyContact"
                                        value={settings.companyContact}
                                        onChange={(e) => setSettings(prev => ({ ...prev, companyContact: e.target.value }))}
                                    />
                                </div>

                                {/* NEW: Paper Settings */}
                                <div className="grid gap-3 border p-3 rounded-md bg-blue-50/30 border-blue-100">
                                    <Label className="font-semibold text-sm flex items-center gap-2 text-blue-800">
                                        <FileText className="w-4 h-4" /> Pengaturan Kertas
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Ukuran Kertas</Label>
                                            <Select
                                                value={settings.paperSize || 'a4'}
                                                onValueChange={(val: any) => setSettings(prev => ({ ...prev, paperSize: val }))}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="a4">A4 (Standar)</SelectItem>
                                                    <SelectItem value="a5">A5 (Kecil)</SelectItem>
                                                    <SelectItem value="letter">Letter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Orientasi</Label>
                                            <RadioGroup
                                                value={settings.orientation || 'p'}
                                                onValueChange={(val: any) => setSettings(prev => ({ ...prev, orientation: val }))}
                                                className="flex gap-3 mt-1"
                                            >
                                                <div className="flex items-center space-x-1.5">
                                                    <RadioGroupItem value="p" id="orient-p" className="w-3 h-3" />
                                                    <Label htmlFor="orient-p" className="text-[10px] font-normal cursor-pointer text-slate-600">Potrait</Label>
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <RadioGroupItem value="l" id="orient-l" className="w-3 h-3" />
                                                    <Label htmlFor="orient-l" className="text-[10px] font-normal cursor-pointer text-slate-600">Landscape</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    </div>
                                </div>

                                {/* NEW: Table Layout */}
                                <div className="grid gap-2 border p-3 rounded-md bg-gray-50/50">
                                    <Label className="font-semibold text-sm">Susunan Tabel</Label>
                                    <RadioGroup
                                        value={settings.tableLayout || 'side_by_side'}
                                        onValueChange={(val) => setSettings(prev => ({ ...prev, tableLayout: val as any }))}
                                        className="flex gap-4 mt-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="side_by_side" id="layout-side" />
                                            <Label htmlFor="layout-side" className="font-normal cursor-pointer text-xs">Berdampingan</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="stacked" id="layout-stacked" />
                                            <Label htmlFor="layout-stacked" className="font-normal cursor-pointer text-xs">Berurutan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* NEW: Header Alignment */}
                                <div className="grid gap-2 border p-3 rounded-md bg-gray-50/50">
                                    <Label className="font-semibold text-sm">Posisi Header & Judul</Label>
                                    <div className="grid gap-3">
                                        <RadioGroup
                                            value={settings.headerAlignment || 'center'}
                                            onValueChange={(val) => setSettings(prev => ({ ...prev, headerAlignment: val as any }))}
                                            className="flex gap-4 mt-1"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="center" id="align-center" />
                                                <Label htmlFor="align-center" className="font-normal cursor-pointer text-xs">Tengah</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="left" id="align-left" />
                                                <Label htmlFor="align-left" className="font-normal cursor-pointer text-xs">Rata Kiri</Label>
                                            </div>
                                        </RadioGroup>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="slipTitle" className="text-xs">Judul Slip Gaji</Label>
                                            <Input
                                                id="slipTitle"
                                                value={settings.slipTitle || ''}
                                                placeholder="SLIP GAJI KARYAWAN"
                                                onChange={(e) => setSettings(prev => ({ ...prev, slipTitle: e.target.value }))}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="headerColor">Warna Header Tabel</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="headerColor"
                                            type="color"
                                            value={settings.headerColor}
                                            onChange={(e) => setSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={settings.headerColor}
                                            onChange={(e) => setSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                                            className="flex-1 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="footerNote">Catatan Kaki (Baris 1)</Label>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="showSignature"
                                                checked={settings.showSignature}
                                                onCheckedChange={(c) => setSettings(prev => ({ ...prev, showSignature: c }))}
                                            />
                                            <Label htmlFor="showSignature" className="text-xs text-muted-foreground">Tanda Tangan</Label>
                                        </div>
                                    </div>
                                    <Input
                                        id="footerNote"
                                        value={settings.footerNote}
                                        onChange={(e) => setSettings(prev => ({ ...prev, footerNote: e.target.value }))}
                                    />
                                </div>

                                <div className="grid gap-2 border p-3 rounded-md bg-orange-50/30 border-orange-100">
                                    <Label className="font-semibold text-sm text-orange-800">Label Tanda Tangan</Label>
                                    <div className="grid gap-3 mt-1">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="sigLeft" className="text-[10px]">Kiri (Atas Nama Karyawan)</Label>
                                            <Input
                                                id="sigLeft"
                                                value={settings.signatureLeftHeader || ''}
                                                placeholder="Contoh: Diterima Oleh,"
                                                onChange={(e) => setSettings(prev => ({ ...prev, signatureLeftHeader: e.target.value }))}
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="sigRight" className="text-[10px]">Kanan (Atas Nama Kantor)</Label>
                                            <Input
                                                id="sigRight"
                                                value={settings.signatureRightHeader || ''}
                                                placeholder="Contoh: Bagian Keuangan,"
                                                onChange={(e) => setSettings(prev => ({ ...prev, signatureRightHeader: e.target.value }))}
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="additionalNote">Catatan Kaki (Baris 2)</Label>
                                    <Input
                                        id="additionalNote"
                                        value={settings.additionalNote || ''}
                                        placeholder="Catatan tambahan di paling bawah..."
                                        onChange={(e) => setSettings(prev => ({ ...prev, additionalNote: e.target.value }))}
                                    />
                                </div>

                                {/* NEW: Custom Fields Manager */}
                                <div className="grid gap-3 border-t pt-4 mt-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-bold text-base flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-green-600" /> Kolom Custom Lain-lain
                                        </Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px]"
                                            onClick={() => setSettings(prev => ({
                                                ...prev,
                                                customFields: [...(prev.customFields || []), { label: '', value: '', section: 'footer' }]
                                            }))}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Tambah Kolom
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Tambah informasi apa saja yang Bapak butuhkan di bagian manapun pada slip.</p>

                                    <div className="space-y-3">
                                        {(settings.customFields || []).map((field, idx) => (
                                            <div key={idx} className="grid gap-2 p-3 border rounded-md bg-gray-50 relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-white border shadow-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setSettings(prev => ({
                                                        ...prev,
                                                        customFields: prev.customFields?.filter((_, i) => i !== idx)
                                                    }))}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Nama Label</Label>
                                                        <Input
                                                            value={field.label}
                                                            placeholder="Contoh: Keterangan"
                                                            className="h-8 text-xs"
                                                            onChange={(e) => {
                                                                const newFields = [...(settings.customFields || [])];
                                                                newFields[idx].label = e.target.value;
                                                                setSettings(prev => ({ ...prev, customFields: newFields }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Isi Tulisan</Label>
                                                        <Input
                                                            value={field.value}
                                                            placeholder="Contoh: Gaji dibayar tunai"
                                                            className="h-8 text-xs"
                                                            onChange={(e) => {
                                                                const newFields = [...(settings.customFields || [])];
                                                                newFields[idx].value = e.target.value;
                                                                setSettings(prev => ({ ...prev, customFields: newFields }));
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Tata Letak (Posisi)</Label>
                                                    <Select
                                                        value={field.section}
                                                        onValueChange={(val: any) => {
                                                            const newFields = [...(settings.customFields || [])];
                                                            newFields[idx].section = val;
                                                            setSettings(prev => ({ ...prev, customFields: newFields }));
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="top">Atas (Header)</SelectItem>
                                                            <SelectItem value="employee">Data Karyawan</SelectItem>
                                                            <SelectItem value="summary">Ringkasan (Tengah)</SelectItem>
                                                            <SelectItem value="footer">Bawah (Footer)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        ))}
                                        {(settings.customFields || []).length === 0 && (
                                            <p className="text-center py-4 border border-dashed rounded text-[10px] text-muted-foreground italic">Belum ada kolom custom.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-bl-lg">
                            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                            <Button onClick={handleSave} className="bg-hrd hover:bg-hrd-dark">
                                <Save className="w-4 h-4 mr-2" />
                                Simpan Pengaturan
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT SIDE: Live Preview */}
                    <div className="w-full md:w-[55%] bg-slate-100 flex flex-col p-6 overflow-hidden">
                        <div className="flex items-center justify-center gap-2 mb-4 text-slate-500 font-medium">
                            <Eye className="w-4 h-4" /> PRATINJAU LANGSUNG
                        </div>
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-auto border rounded-lg bg-slate-200 shadow-inner relative cursor-grab active:cursor-grabbing select-none"
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseLeave}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                        >
                            <div className="min-w-max p-20 flex justify-center items-start pointer-events-none">
                                <div className="scale-75 origin-top shadow-2xl">
                                    <SlipPreview settings={settings} payroll={payroll} employee={employee} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 text-center">
                            <p className="text-[10px] text-slate-500 font-medium animate-pulse">
                                🖱️ Klik dan tarik (drag) pratinjau untuk menggeser ↔ ↕
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                * Tampilan di atas adalah simulasi. Gunakan tombol "Cetak Slip" di halaman utama untuk mengunduh PDF asli.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
