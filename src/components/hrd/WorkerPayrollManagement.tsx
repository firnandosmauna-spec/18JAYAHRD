import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

    const [formData, setFormData] = useState({
        employee_id: '',
        working_days: '1',
        daily_rate: '',
        late_deduction: '0',
        activity_detail: '',
        progress_percentage: '0',
        worker_count: '1',
        payment_date: new Date().toLocaleDateString('en-CA')
    });

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

    // Load worker details when selected
    useEffect(() => {
        if (formData.employee_id) {
            const employee = employees.find(e => e.id === formData.employee_id);
            if (employee) {
                // Find if already a worker in this project to get their specific rate
                const projectWorker = workers.find(w => w.employee_id === formData.employee_id);
                setFormData(prev => ({
                    ...prev,
                    daily_rate: projectWorker?.daily_rate?.toString() || employee.salary?.toString() || ''
                }));
            }
        }
    }, [formData.employee_id, employees, workers]);

    // Derived Calculations
    const calculateTotal = () => {
        const days = parseFloat(formData.working_days) || 0;
        const rate = parseFloat(formData.daily_rate) || 0;
        const deduction = parseFloat(formData.late_deduction) || 0;
        return (days * rate) - deduction;
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
                    daily_rate: parseFloat(formData.daily_rate) || 0,
                    status: 'active',
                    joined_at: new Date().toISOString()
                });
                workerIdToUse = newWorker.id;
            }

            // 1. Add Payment
            await addPayment({
                project_id: selectedProjectId,
                worker_id: workerIdToUse,
                amount: totalAmount,
                payment_date: formData.payment_date,
                working_days: parseFloat(formData.working_days),
                daily_rate: parseFloat(formData.daily_rate),
                late_deduction: parseFloat(formData.late_deduction),
                activity_detail: formData.activity_detail,
                progress_percentage: parseFloat(formData.progress_percentage),
                worker_count: parseInt(formData.worker_count),
                payment_type: 'Harian'
            });

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
            setFormData({
                employee_id: '',
                working_days: '1',
                daily_rate: '',
                late_deduction: '0',
                activity_detail: '',
                progress_percentage: '0',
                worker_count: '1',
                payment_date: new Date().toLocaleDateString('en-CA')
            });
            refetchPayments();
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
                            <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={locationsLoading}>
                                <SelectTrigger className="w-[350px]">
                                    <div className="flex items-center gap-2">
                                        {locationsLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder={locationsLoading ? "Memuat lokasi..." : "Pilih Lokasi Proyek"} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map(loc => {
                                        const isProject = projectNames.includes(loc);
                                        return (
                                            <SelectItem key={loc} value={loc}>
                                                <div className="flex items-center gap-2">
                                                    {isProject ? (
                                                        <Hammer className="w-3.5 h-3.5 text-orange-500" />
                                                    ) : (
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                    <span className="font-body text-xs">{loc}</span>
                                                    {isProject && (
                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto bg-blue-50 text-blue-600 border-blue-100">
                                                            PROYEK
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>

                            {!selectedProjectId && selectedLocation && (
                                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                                    <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center gap-1.5 whitespace-nowrap">
                                        <AlertCircle className="w-3 h-3" />
                                        HUBUNGKAN MANUAL:
                                    </div>
                                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                        <SelectTrigger className="h-7 text-[11px] w-[220px] bg-white border-orange-200 focus:ring-orange-500">
                                            <SelectValue placeholder="Pilih Proyek Sistem..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id!} className="text-[11px]">
                                                    {p.location || p.name} ({p.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
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

            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-hrd/20 shadow-lg">
                            <CardHeader className="bg-hrd/5 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Hammer className="w-5 h-5 text-hrd" />
                                    Form Penggajian & Kegiatan Tukang
                                </CardTitle>
                                <CardDescription>Input rincian gaji dan laporan kegiatan harian</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label>Nama Tukang</Label>
                                            <Select 
                                                value={formData.employee_id} 
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, employee_id: val }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih Tukang dari Master Karyawan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tukangEmployees.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id}>
                                                            {emp.name} - {emp.position}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                                            <Label>Jumlah Tukang (Personil)</Label>
                                            <Input 
                                                type="number" 
                                                value={formData.worker_count}
                                                onChange={(e) => setFormData(prev => ({ ...prev, worker_count: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground font-bold">Hari Kerja</Label>
                                            <Input 
                                                type="number" 
                                                step="0.5"
                                                value={formData.working_days}
                                                onChange={(e) => setFormData(prev => ({ ...prev, working_days: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground font-bold">Gaji Harian (Rp)</Label>
                                            <Input 
                                                type="number" 
                                                value={formData.daily_rate}
                                                onChange={(e) => setFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground font-bold">Potongan Telat (Rp)</Label>
                                            <Input 
                                                type="number" 
                                                value={formData.late_deduction}
                                                onChange={(e) => setFormData(prev => ({ ...prev, late_deduction: e.target.value }))}
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
                                            <Label>Rincian Kegiatan Tukang</Label>
                                            <Textarea 
                                                placeholder="Contoh: Pasang keramik lantai kamar mandi, Finishing cat dinding luar"
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
                    </motion.div>
                )}
            </AnimatePresence>

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
                                        <TableHead>Kegiatan</TableHead>
                                        <TableHead className="text-right">Hari</TableHead>
                                        <TableHead className="text-right">Total Gaji</TableHead>
                                        <TableHead className="text-center">Progress</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                                                    <TableCell className="max-w-[250px]">
                                                        <p className="truncate text-sm" title={p.activity_detail}>
                                                            {p.activity_detail || '-'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right">{p.working_days}</TableCell>
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
