import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import {
    DollarSign,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    Search,
    Filter,
    Hammer,
    Clock,
    TrendingUp,
    FileText,
    Download,
    Eye,
    Trash2,
    Users,
    MapPin,
    Loader2,
    Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

// Hooks
import { useProjects, useProjectWorkers, useProjectWorkerPayments, useProjectLaborRates, useProjectWorkerActivities } from '@/hooks/useProject';
import { useEmployees } from '@/hooks/useSupabase';
import { useProjectLocations } from '@/hooks/useInventory';
import { projectService } from '@/services/projectService';
import { generateEmployeeChecklist } from '@/utils/pdfGenerator';
import { ChecklistPreviewModal } from './ChecklistPreviewModal';

function NativeSelect({
    value,
    onChange,
    className = '',
    children,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {children}
        </select>
    );
}

export function WorkerPayrollManagement() {
    const { projects, loading: projectsLoading } = useProjects();
    const { employees } = useEmployees();
    const { locations, projectNames, loading: locationsLoading } = useProjectLocations();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const initialProjectId = searchParams.get('projectId');

    // State
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const getDefaultFormData = () => ({
        payment_type: 'Harian' as 'Harian' | 'Borongan',
        employee_id: '',
        working_days: '1',
        daily_rate: '',
        activity_detail: '',
        progress_percentage: '0',
        worker_count: '1',
        payment_date: new Date().toLocaleDateString('en-CA'),
        labor_rate_id: 'none',
        quantity: '1',
        unit: '',
        loan_deduction: '0'
    });

    // Initial project selection from query param
    useEffect(() => {
        if (initialProjectId && projects.length > 0) {
            const project = projects.find(p => p.id === initialProjectId);
            if (project) {
                // If it's an initial ID, we prioritize it and set location as well
                setSelectedLocation(project.location || project.name);
                setSelectedProjectId(project.id!);
            }
        }
    }, [initialProjectId, projects]);

    // Auto-map location to project_id (Background Sync)
    useEffect(() => {
        if (selectedLocation) {
            const searchLoc = selectedLocation.trim().toLowerCase();
            
            // Find project that matches either by name or location field
            const matchedProject = projects.find(p => {
                const pName = (p.name || '').trim().toLowerCase();
                const pLoc = (p.location || '').trim().toLowerCase();
                return pName === searchLoc || pLoc === searchLoc;
            });
            
            if (matchedProject) {
                setSelectedProjectId(matchedProject.id!);
            } else if (initialProjectId && projects.some(p => p.id === initialProjectId)) {
                // If we have an initial ID but loc doesn't match, check if it's the same project
                const initialProj = projects.find(p => p.id === initialProjectId);
                const ipName = (initialProj?.name || '').trim().toLowerCase();
                const ipLoc = (initialProj?.location || '').trim().toLowerCase();
                
                if (ipName === searchLoc || ipLoc === searchLoc) {
                    setSelectedProjectId(initialProjectId);
                } else {
                    setSelectedProjectId('');
                }
            } else {
                setSelectedProjectId('');
            }
        } else {
            setSelectedProjectId('');
        }
    }, [selectedLocation, projects, initialProjectId]);

    const [formData, setFormData] = useState(getDefaultFormData());
    const [showChecklistPreview, setShowChecklistPreview] = useState(false);

    const tukangEmployees = employees.filter(emp => 
        emp.position?.toLowerCase().includes('tukang') || 
        emp.position?.toLowerCase().includes('pekerja') ||
        emp.department?.toLowerCase().includes('tukang') ||
        emp.worker_type_id // Or check worker_types if joined
    );

    // Worker Hooks (conditional on project selection)
    const { workers, loading: workersLoading } = useProjectWorkers(selectedProjectId);
    const { payments, loading: paymentsLoading, addPayment, deletePayment, refetch: refetchPayments } = useProjectWorkerPayments(selectedProjectId);
    const { rates } = useProjectLaborRates();
    const { addActivity, refetch: refetchActivities } = useProjectWorkerActivities(selectedProjectId);

    // Load worker details when selected
    useEffect(() => {
        if (!formData.employee_id || formData.payment_type !== 'Harian') return;

        const employee = employees.find(e => e.id === formData.employee_id);
        if (!employee) return;

        const projectWorker = workers.find(w => w.employee_id === formData.employee_id);
        const nextRate = projectWorker?.daily_rate?.toString() || employee.salary?.toString() || '';

        setFormData(prev => prev.daily_rate === nextRate ? prev : {
            ...prev,
            daily_rate: nextRate
        });
    }, [formData.employee_id, formData.payment_type, employees, workers]);

    useEffect(() => {
        if (formData.payment_type !== 'Borongan' || formData.labor_rate_id === 'none') return;

        const selectedRate = rates.find(rate => rate.id === formData.labor_rate_id);
        if (!selectedRate) return;

        setFormData(prev => {
            const nextRate = selectedRate.default_rate?.toString() || '';
            const nextUnit = selectedRate.unit || '';
            if (prev.daily_rate === nextRate && prev.unit === nextUnit) {
                return prev;
            }
            return {
                ...prev,
                daily_rate: nextRate,
                unit: nextUnit
            };
        });
    }, [formData.payment_type, formData.labor_rate_id, rates]);

    // Derived Calculations
    const calculateTotal = () => {
        const rate = parseFloat(formData.daily_rate) || 0;
        const loanDeduction = parseFloat(formData.loan_deduction) || 0;
        const baseTotal = formData.payment_type === 'Borongan'
            ? (parseFloat(formData.quantity) || 0) * rate
            : (parseFloat(formData.working_days) || 0) * rate;

        return Math.max(0, baseTotal - loanDeduction);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId || !formData.employee_id) {
            toast({
                title: "Error",
                description: "Mohon pilih proyek dan tukang",
                variant: "destructive"
            });
            return;
        }

        try {
            setIsSubmitting(true);
            const totalAmount = calculateTotal();
            const selectedLaborRate = rates.find(rate => rate.id === formData.labor_rate_id);
            const resolvedUnit = formData.unit?.trim() || selectedLaborRate?.unit || '';
            const isBorongan = formData.payment_type === 'Borongan';

            if (isBorongan) {
                if (formData.labor_rate_id === 'none') {
                    toast({
                        title: "Error",
                        description: "Mohon pilih jenis pekerjaan borongan",
                        variant: "destructive"
                    });
                    return;
                }

                if ((parseFloat(formData.quantity) || 0) <= 0 || (parseFloat(formData.daily_rate) || 0) <= 0) {
                    toast({
                        title: "Error",
                        description: "Volume dan tarif borongan harus lebih dari 0",
                        variant: "destructive"
                    });
                    return;
                }
            }
            
            // 0. Ensure worker is assigned to project
            let workerIdToUse = '';
            const existingWorker = workers.find(w => w.employee_id === formData.employee_id);
            
            if (existingWorker) {
                workerIdToUse = existingWorker.id;
            } else {
                // Auto-assign to project
                const employee = employees.find(e => e.id === formData.employee_id);
                const newWorker = await projectService.addWorker({
                    project_id: selectedProjectId,
                    employee_id: formData.employee_id,
                    role: employee?.position || 'Tukang',
                    daily_rate: isBorongan ? Number(employee?.salary || 0) : parseFloat(formData.daily_rate) || 0,
                    status: 'active',
                    joined_at: new Date().toISOString()
                });
                workerIdToUse = newWorker.id;
            }

            const boronganDetail = isBorongan
                ? [
                    selectedLaborRate?.name || 'Pekerjaan borongan',
                    `${parseFloat(formData.quantity) || 0} ${resolvedUnit}`.trim(),
                    `x ${formatCurrency(parseFloat(formData.daily_rate) || 0)}`
                ].join(' ')
                : formData.activity_detail;

            const finalActivityDetail = isBorongan && formData.activity_detail.trim()
                ? `${boronganDetail} | ${formData.activity_detail.trim()}`
                : boronganDetail;

            // 1. Add Payment
            await addPayment({
                project_id: selectedProjectId,
                worker_id: workerIdToUse,
                amount: totalAmount,
                payment_date: formData.payment_date,
                working_days: isBorongan ? parseFloat(formData.quantity) : parseFloat(formData.working_days),
                daily_rate: parseFloat(formData.daily_rate),
                loan_deduction: parseFloat(formData.loan_deduction),
                activity_detail: finalActivityDetail,
                progress_percentage: parseFloat(formData.progress_percentage),
                worker_count: parseInt(formData.worker_count),
                payment_type: formData.payment_type,
                notes: isBorongan ? formData.activity_detail.trim() || null : null
            });

            if (isBorongan) {
                await addActivity({
                    project_id: selectedProjectId,
                    worker_id: workerIdToUse,
                    activity_id: formData.labor_rate_id,
                    quantity: parseFloat(formData.quantity),
                    unit: resolvedUnit || null,
                    rate: parseFloat(formData.daily_rate) || 0,
                    activity_date: formData.payment_date,
                    notes: formData.activity_detail.trim() || null
                });
            }

            // 2. Update Project Progress and Spent Amount
            const project = projects.find(p => p.id === selectedProjectId);
            if (project) {
                const newSpent = (project.spent || 0) + totalAmount;
                const newProgress = Math.max(project.progress || 0, parseFloat(formData.progress_percentage));
                
                await projectService.update(selectedProjectId, { 
                    spent: newSpent,
                    progress: newProgress 
                });
            }

            toast({
                title: "Berhasil",
                description: "Data penggajian tukang berhasil disimpan dan progress proyek diperbarui"
            });
            
            setShowAddForm(false);
            setFormData(getDefaultFormData());
            refetchPayments();
            refetchActivities();
        } catch (error) {
            console.error(error);
            toast({
                title: "Gagal",
                description: "Terjadi kesalahan saat menyimpan data",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = (p: any) => {
        const worker = workers.find(w => w.id === p.worker_id);
        const emp = employees.find(e => e.id === worker?.employee_id);
        const project = projects.find(pj => pj.id === p.project_id);
        
        toast({
            title: "Mencetak...",
            description: `Menyiapkan slip gaji untuk ${emp?.name || 'Tukang'}`
        });

        // Simple PDF or placeholder logic
        // For now, let's use the browser print or a console log as a placeholder
        // In a real app, we'd use generateSalarySlip with adjusted mapping
        window.print(); 
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus data ini?')) return;
        try {
            await deletePayment(id);
            toast({ title: "Berhasil", description: "Data berhasil dihapus" });
            refetchPayments();
        } catch (err) {
            toast({ title: "Gagal", description: "Gagal menghapus data", variant: "destructive" });
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val);
    };

    const handleExportChecklist = () => {
        setShowChecklistPreview(true);
    };

    const navigate = useNavigate();
    const currentProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Penggajian Tukang</h2>
                    <p className="text-muted-foreground">Kelola gaji dan rincian kegiatan tukang proyek</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-2">
                            <NativeSelect
                                value={selectedLocation}
                                onChange={setSelectedLocation}
                                disabled={locationsLoading}
                                className="w-[350px]"
                            >
                                <option value="">{locationsLoading ? "Memuat lokasi..." : "Pilih Lokasi Proyek"}</option>
                                {locations.map(loc => (
                                    <option key={loc} value={loc}>
                                        {projectNames.includes(loc) ? `[PROYEK] ${loc}` : loc}
                                    </option>
                                ))}
                            </NativeSelect>

                            {!selectedProjectId && selectedLocation && (
                                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                                    <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1.5 whitespace-nowrap">
                                        <AlertCircle className="w-3 h-3" />
                                        HUBUNGKAN MANUAL:
                                    </div>
                                    <NativeSelect
                                        value={selectedProjectId}
                                        onChange={setSelectedProjectId}
                                        className="h-7 w-[220px] border-orange-200 bg-white text-[11px] focus-visible:ring-orange-500"
                                    >
                                        <option value="">Pilih Proyek Sistem...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id!}>
                                                {p.location || p.name} ({p.status})
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            )}
                        </div>
                        <Button 
                            variant="outline"
                            onClick={handleExportChecklist}
                            disabled={!selectedProjectId || payments.length === 0}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Cheklis
                        </Button>
                        <Button 
                            onClick={() => {
                                if (!selectedProjectId) {
                                    toast({
                                        title: "Gagal Menghubungkan Proyek",
                                        description: "Lokasi ini tidak terdeteksi otomatis. Silakan pilih 'Hubungkan Manual' di bawah lokasi.",
                                        variant: "destructive"
                                    });
                                    return;
                                }
                                setShowAddForm(!showAddForm);
                            }}
                            className="bg-hrd hover:bg-hrd/90"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Penggajian
                        </Button>
                    </div>

                    {currentProject && (
                        <div className="flex items-center gap-4 py-2 px-3 bg-blue-50/50 rounded-lg border border-blue-100 w-full animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground font-medium uppercase text-[10px]">Budget</span>
                                    <span className="font-bold text-slate-800 font-mono">{formatCurrency(currentProject.budget)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground font-medium uppercase text-[10px]">Terpakai</span>
                                    <span className="font-bold text-red-600 font-mono">{formatCurrency(currentProject.spent || 0)}</span>
                                </div>
                                <div className="flex flex-col min-w-[60px]">
                                    <span className="text-muted-foreground font-medium uppercase text-[10px]">Progress</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full w-12">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${currentProject.progress}%` }} />
                                        </div>
                                        <span className="font-bold text-blue-600 font-mono">{currentProject.progress}%</span>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 h-8 gap-1.5"
                                onClick={() => navigate(`/projects/active?projectId=${selectedProjectId}`)}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-bold">DASHBOARD PROYEK</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {showChecklistPreview && (
                <ChecklistPreviewModal
                    isOpen={showChecklistPreview}
                    onClose={() => setShowChecklistPreview(false)}
                    employees={payments.map(p => {
                        const worker = workers.find(w => w.id === p.worker_id);
                        const emp = employees.find(e => e.id === worker?.employee_id);
                        return {
                            employee_name: emp?.name || 'Tukang',
                            employee_position: worker?.role || 'Pekerja',
                            status: 'paid'
                        };
                    })}
                    period={currentProject?.name || selectedLocation || 'Proyek'}
                    companyName="PT. DELAPAN BELAS JAYA"
                />
            )}

            {showAddForm && (
                    <div>
                        <Card className="border-hrd/20 shadow-lg">
                            <CardHeader className="bg-hrd/5 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Hammer className="w-5 h-5 text-hrd" />
                                    Form Penggajian & Kegiatan Tukang
                                </CardTitle>
                                <CardDescription>Input gaji tukang harian maupun borongan beserta progres pekerjaan</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <Label>Nama Tukang</Label>
                                            <NativeSelect 
                                                value={formData.employee_id} 
                                                onChange={(val) => setFormData(prev => ({ ...prev, employee_id: val }))}
                                            >
                                                <option value="">Pilih Tukang dari Master Karyawan</option>
                                                    {tukangEmployees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>
                                                            {emp.name} - {emp.position}
                                                        </option>
                                                    ))}
                                            </NativeSelect>
                                            <p className="text-[10px] text-muted-foreground italic">Pekerja otomatis ditambahkan ke proyek jika belum terdaftar</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tanggal</Label>
                                            <Input 
                                                type="date" 
                                                value={formData.payment_date}
                                                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Jenis Gaji</Label>
                                            <NativeSelect
                                                value={formData.payment_type}
                                                onChange={(val) => setFormData(prev => ({
                                                    ...prev,
                                                    payment_type: val as 'Harian' | 'Borongan',
                                                    labor_rate_id: val === 'Borongan' ? prev.labor_rate_id : 'none',
                                                    quantity: val === 'Borongan' ? (prev.quantity || '1') : '1',
                                                    working_days: val === 'Harian' ? (prev.working_days || '1') : '1',
                                                    unit: val === 'Harian' ? '' : prev.unit
                                                }))}
                                            >
                                                <option value="Harian">Harian</option>
                                                <option value="Borongan">Borongan</option>
                                            </NativeSelect>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Jumlah Tukang (Personil)</Label>
                                            <Input 
                                                type="number" 
                                                value={formData.worker_count}
                                                onChange={(e) => setFormData(prev => ({ ...prev, worker_count: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                                        {formData.payment_type === 'Borongan' ? (
                                            <>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Master Pekerjaan</Label>
                                                    <NativeSelect
                                                        value={formData.labor_rate_id}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, labor_rate_id: val }))}
                                                    >
                                                        <option value="none">Pilih pekerjaan borongan</option>
                                                            {rates.map(rate => (
                                                                <option key={rate.id} value={rate.id}>
                                                                    {rate.name} ({rate.unit}) - {formatCurrency(rate.default_rate || 0)}
                                                                </option>
                                                            ))}
                                                    </NativeSelect>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Volume</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.quantity}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Satuan</Label>
                                                    <Input
                                                        value={formData.unit}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                                        placeholder="m2 / m3 / titik"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase text-muted-foreground font-bold">Hari Kerja</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.5"
                                                    value={formData.working_days}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, working_days: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground font-bold">
                                                {formData.payment_type === 'Borongan' ? 'Tarif Borongan / Satuan (Rp)' : 'Gaji Harian (Rp)'}
                                            </Label>
                                            <Input 
                                                type="number" 
                                                value={formData.daily_rate}
                                                onChange={(e) => setFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground font-bold">Potongan Pinjaman (Rp)</Label>
                                            <Input 
                                                type="number" 
                                                value={formData.loan_deduction}
                                                onChange={(e) => setFormData(prev => ({ ...prev, loan_deduction: e.target.value }))}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-hrd font-bold font-bold">Total Gaji</Label>
                                            <div className="h-10 flex items-center px-3 bg-hrd/10 border border-hrd/20 rounded-md font-bold text-hrd">
                                                {formatCurrency(calculateTotal())}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>{formData.payment_type === 'Borongan' ? 'Catatan Pekerjaan Borongan' : 'Rincian Kegiatan Tukang'}</Label>
                                            <Textarea 
                                                placeholder={formData.payment_type === 'Borongan'
                                                    ? "Contoh: Area belakang rumah, finishing nat abu-abu"
                                                    : "Contoh: Pasang keramik lantai kamar mandi, Finishing cat dinding luar"}
                                                className="h-24"
                                                value={formData.activity_detail}
                                                onChange={(e) => setFormData(prev => ({ ...prev, activity_detail: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-x-2 flex flex-col justify-end">
                                            <Label>Progress Proyek (%)</Label>
                                            <div className="flex items-center gap-4 mt-2">
                                                <Input 
                                                    type="number" 
                                                    className="w-24"
                                                    value={formData.progress_percentage}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, progress_percentage: e.target.value }))}
                                                />
                                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-hrd transition-all duration-300" 
                                                        style={{ width: `${Math.min(100, Math.max(0, parseFloat(formData.progress_percentage || '0')))}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                type="submit" 
                                                className="w-full mt-auto bg-hrd hover:bg-hrd/90"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                                Simpan Laporan & Gaji
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        Riwayat Gaji & Kegiatan
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedProjectId ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <MapPin className="w-12 h-12 mb-4 opacity-20" />
                            <p>Pilih lokasi proyek untuk melihat data</p>
                        </div>
                    ) : paymentsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-hrd" />
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Tukang</TableHead>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead>Kegiatan</TableHead>
                                        <TableHead className="text-right">Volume / Hari</TableHead>
                                        <TableHead className="text-right">Tarif</TableHead>
                                        <TableHead className="text-right text-red-500">Potongan</TableHead>
                                        <TableHead className="text-right">Total Gaji</TableHead>
                                        <TableHead className="text-center">Progress</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                Belum ada data history untuk proyek ini
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((p) => {
                                            const worker = workers.find(w => w.id === p.worker_id);
                                            const emp = employees.find(e => e.id === worker?.employee_id);
                                            return (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">
                                                        {new Date(p.payment_date).toLocaleDateString('id-ID')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{emp?.name || 'Tukang'}</div>
                                                        <div className="text-xs text-muted-foreground">{worker?.role}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={p.payment_type === 'Borongan'
                                                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200'}
                                                        >
                                                            {p.payment_type || 'Harian'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[250px]">
                                                        <p className="truncate text-sm" title={p.activity_detail}>
                                                            {p.activity_detail || '-'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {p.payment_type === 'Borongan'
                                                            ? `${p.working_days || 0}`
                                                            : `${p.working_days || 0} Hari`}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(p.daily_rate || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-red-500">
                                                        {p.loan_deduction > 0 && <div>L: {formatCurrency(p.loan_deduction)}</div>}
                                                        {!(p.loan_deduction > 0) && '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-hrd">
                                                        {formatCurrency(p.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="bg-hrd/5 text-hrd border-hrd/20">
                                                            {p.progress_percentage}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right flex gap-1 justify-end">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => handlePrint(p)}
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDelete(p.id!)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
