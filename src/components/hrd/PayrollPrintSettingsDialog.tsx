import React, { useState, useEffect } from 'react';
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
import { PrintSettings } from '@/utils/pdfGenerator';
import { useToast } from '@/components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PayrollPrintSettingsDialogProps {
    onSettingsChange?: (settings: PrintSettings) => void;
}

const STORAGE_KEY = 'hris_payroll_print_settings';

const defaultSettings: PrintSettings = {
    showLogo: true,
    companyName: 'PT. HRD 18 JAYA',
    companyAddress: 'Jl. Contoh Alamat No. 123, Jakarta Selatan',
    companyContact: 'Telp: (021) 12345678 | Email: hrd@jayatempo.com',
    showSignature: true,
    footerNote: 'Dokumen ini sah dan dicetak secara otomatis oleh sistem.',
    headerColor: '#16a34a',
    tableLayout: 'side_by_side',
    headerAlignment: 'center'
};

export function PayrollPrintSettingsDialog({ onSettingsChange }: PayrollPrintSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
    const { toast } = useToast();

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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Pengaturan Cetak Slip Gaji</DialogTitle>
                    <DialogDescription>
                        Sesuaikan tampilan slip gaji sebelum dicetak.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
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
                        <Label htmlFor="companyContact">Kontak (Telp/Email)</Label>
                        <Input
                            id="companyContact"
                            value={settings.companyContact}
                            onChange={(e) => setSettings(prev => ({ ...prev, companyContact: e.target.value }))}
                        />
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
                                <Label htmlFor="layout-side" className="font-normal cursor-pointer">Berdampingan</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="stacked" id="layout-stacked" />
                                <Label htmlFor="layout-stacked" className="font-normal cursor-pointer">Berurutan</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* NEW: Header Alignment */}
                    <div className="grid gap-2 border p-3 rounded-md bg-gray-50/50">
                        <Label className="font-semibold text-sm">Posisi Header</Label>
                        <RadioGroup
                            value={settings.headerAlignment || 'center'}
                            onValueChange={(val) => setSettings(prev => ({ ...prev, headerAlignment: val as any }))}
                            className="flex gap-4 mt-1"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="center" id="align-center" />
                                <Label htmlFor="align-center" className="font-normal cursor-pointer">Tengah</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="left" id="align-left" />
                                <Label htmlFor="align-left" className="font-normal cursor-pointer">Rata Kiri</Label>
                            </div>
                        </RadioGroup>
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
                            <Label htmlFor="footerNote">Catatan Kaki</Label>
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
                </div>

                <DialogFooter className="mt-2">
                    <Button onClick={handleSave} className="bg-hrd hover:bg-hrd-dark w-full sm:w-auto">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Pengaturan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
