import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Hammer, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  X,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useEmployees } from '@/hooks/useSupabase';
import { useProjectLaborRates, useWorkerTypes } from '@/hooks/useProject';

export function WorkerManagement() {
  const { 
    employees, 
    loading: employeesLoading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: refetchEmployees
  } = useEmployees();
  const { 
    rates, 
    loading: ratesLoading, 
    addRate, 
    updateRate, 
    deleteRate, 
    refetch: refetchRates 
  } = useProjectLaborRates();
  const { 
    workerTypes, 
    loading: workerTypesLoading, 
    addWorkerType, 
    updateWorkerType, 
    deleteWorkerType, 
    refetch: refetchWorkerTypes 
  } = useWorkerTypes();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('workers');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rate Form State
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [rateForm, setRateForm] = useState({
    id: '',
    name: '',
    unit: '',
    default_rate: 0,
    description: ''
  });

  // Worker Type Form State
  const [showWorkerTypeDialog, setShowWorkerTypeDialog] = useState(false);
  const [workerTypeForm, setWorkerTypeForm] = useState({
    id: '',
    name: '',
    description: ''
  });

  // Worker Form State
  const [showWorkerDialog, setShowWorkerDialog] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    id: '',
    name: '',
    position: 'Tukang',
    phone: '',
    email: '',
    join_date: new Date().toLocaleDateString('en-CA'),
    status: 'active' as 'active' | 'inactive',
    worker_type_id: 'none'
  });

  const [isSaving, setIsSaving] = useState(false);

  // Filtered Workers
  const tukangWorkers = employees.filter(emp => {
    const isTukang = emp.position?.toLowerCase().includes('tukang') || 
                     emp.position?.toLowerCase().includes('pekerja') ||
                     emp.department_id === 'tukang' ||
                     emp.department?.toLowerCase().includes('tukang');
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    return isTukang && matchesSearch;
  });

  const filteredRates = rates.filter(rate => 
    rate.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Rate Handlers
  const handleOpenRateDialog = (rate?: any) => {
    if (rate) {
      setRateForm({
        id: rate.id,
        name: rate.name,
        unit: rate.unit,
        default_rate: rate.default_rate,
        description: ''
      });
    } else {
      setRateForm({
        id: '',
        name: '',
        unit: '',
        default_rate: 0,
        description: ''
      });
    }
    setShowRateDialog(true);
  };

  const handleSaveRate = async () => {
    if (!rateForm.name || !rateForm.unit) {
      toast({ title: "Error", description: "Nama dan Satuan wajib diisi", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      if (rateForm.id) {
        await updateRate(rateForm.id, {
          name: rateForm.name,
          unit: rateForm.unit,
          default_rate: rateForm.default_rate,
          description: rateForm.description
        });
        toast({ title: "Berhasil", description: "Master upah diperbarui" });
      } else {
        await addRate({
          name: rateForm.name,
          unit: rateForm.unit,
          default_rate: rateForm.default_rate,
          description: rateForm.description
        });
        toast({ title: "Berhasil", description: "Master upah ditambahkan" });
      }
      setShowRateDialog(false);
      refetchRates();
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Yakin ingin menghapus master upah ini?')) return;
    try {
      await deleteRate(id);
      toast({ title: "Berhasil", description: "Master upah dihapus" });
      refetchRates();
    } catch (err) {
      toast({ title: "Gagal", description: "Gagal menghapus data", variant: "destructive" });
    }
  };

  // Worker Handlers
  const handleOpenWorkerDialog = (worker?: any) => {
    if (worker) {
      setWorkerForm({
        id: worker.id,
        name: worker.name,
        position: worker.position || 'Tukang',
        phone: worker.phone || '',
        email: worker.email || '',
        join_date: worker.join_date || new Date().toLocaleDateString('en-CA'),
        status: (worker.status as 'active' | 'inactive') || 'active',
        worker_type_id: worker.worker_type_id || 'none'
      });
    } else {
      setWorkerForm({
        id: '',
        name: '',
        position: 'Tukang',
        phone: '',
        email: '',
        join_date: new Date().toLocaleDateString('en-CA'),
        status: 'active',
        worker_type_id: 'none'
      });
    }
    setShowWorkerDialog(true);
  };

  const handleSaveWorker = async () => {
    if (!workerForm.name) {
      toast({ title: "Error", description: "Nama wajib diisi", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      if (workerForm.id) {
        await updateEmployee(workerForm.id, {
          name: workerForm.name,
          position: workerForm.position,
          phone: workerForm.phone?.trim() || null,
          email: workerForm.email?.trim() || null,
          join_date: workerForm.join_date,
          status: workerForm.status,
          // @ts-ignore
          worker_type_id: workerForm.worker_type_id === 'none' ? null : workerForm.worker_type_id
        });
        toast({ title: "Berhasil", description: "Data tukang diperbarui" });
      } else {
        await addEmployee({
          name: workerForm.name,
          nik: `TK-${Date.now().toString().slice(-6)}`,
          position: workerForm.position,
          department: 'Tukang',
          status: workerForm.status,
          join_date: workerForm.join_date,
          salary: 0, // Workers usually paid by labor rates
          phone: workerForm.phone?.trim() || null,
          email: workerForm.email?.trim() || null,
          // @ts-ignore
          worker_type_id: workerForm.worker_type_id === 'none' ? null : workerForm.worker_type_id,
          address: '',
          bank: '',
          bank_account: '',
          sales_target: 0,
          sales_achieved: 0,
          attendance_score: 100,
          innovation_projects: 0,
          team_leadership: false,
          customer_rating: 0
        });
        toast({ title: "Berhasil", description: "Tukang baru ditambahkan" });
      }
      setShowWorkerDialog(false);
      refetchEmployees();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal menyimpan data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data tukang ini?')) return;
    try {
      await deleteEmployee(id);
      toast({ title: "Berhasil", description: "Data tukang dihapus" });
      refetchEmployees();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal menghapus data", variant: "destructive" });
    }
  };

  // Worker Type Handlers
  const handleOpenWorkerTypeDialog = (type?: any) => {
    if (type) {
      setWorkerTypeForm({
        id: type.id,
        name: type.name,
        description: type.description || ''
      });
    } else {
      setWorkerTypeForm({
        id: '',
        name: '',
        description: ''
      });
    }
    setShowWorkerTypeDialog(true);
  };

  const handleSaveWorkerType = async () => {
    if (!workerTypeForm.name) {
      toast({ title: "Error", description: "Nama tipe wajib diisi", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      if (workerTypeForm.id) {
        await updateWorkerType(workerTypeForm.id, {
          name: workerTypeForm.name,
          description: workerTypeForm.description
        });
        toast({ title: "Berhasil", description: "Tipe pekerja diperbarui" });
      } else {
        await addWorkerType({
          name: workerTypeForm.name,
          description: workerTypeForm.description
        });
        toast({ title: "Berhasil", description: "Tipe pekerja ditambahkan" });
      }
      setShowWorkerTypeDialog(false);
      refetchWorkerTypes();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal menyimpan tipe pekerja", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkerType = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tipe pekerja ini? Pekerja dengan tipe ini akan kembali ke tanpa tipe.')) return;
    try {
      await deleteWorkerType(id);
      toast({ title: "Berhasil", description: "Tipe pekerja dihapus" });
      refetchWorkerTypes();
      refetchEmployees();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message || "Gagal menghapus tipe pekerja", variant: "destructive" });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Karyawan Tukang</h2>
          <p className="text-muted-foreground">Kelola data tenaga kerja lapangan dan master upah standar</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === 'workers' ? (
            <Button onClick={() => handleOpenWorkerDialog()} className="bg-hrd hover:bg-hrd/90">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Tukang
            </Button>
          ) : activeTab === 'rates' ? (
            <Button onClick={() => handleOpenRateDialog()} className="bg-hrd hover:bg-hrd/90">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Upah
            </Button>
          ) : (
            <Button onClick={() => handleOpenWorkerTypeDialog()} className="bg-hrd hover:bg-hrd/90">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Tipe
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="workers" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="workers" className="data-[state=active]:bg-white">
            <Users className="w-4 h-4 mr-2" />
            Daftar Tukang
          </TabsTrigger>
          <TabsTrigger value="rates" className="data-[state=active]:bg-white">
            <Hammer className="w-4 h-4 mr-2" />
            Master Upah
          </TabsTrigger>
          <TabsTrigger value="worker_types" className="data-[state=active]:bg-white">
            <Plus className="w-4 h-4 mr-2" />
            Tipe Pekerjaan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tenaga Kerja Lapangan</CardTitle>
              <CardDescription>Menampilkan karyawan dengan posisi Tukang atau Pekerja</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-hrd" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Posisi</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tgl Bergabung</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tukangWorkers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Tidak ada data tukang yang ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      tukangWorkers.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell className="font-medium text-hrd">{worker.name}</TableCell>
                          <TableCell>
                            {/* @ts-ignore */}
                            {worker.worker_types?.name ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {/* @ts-ignore */}
                                {worker.worker_types.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Tanpa Tipe</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal capitalize">
                              {worker.position || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{worker.phone || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                              {worker.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {worker.join_date ? new Date(worker.join_date).toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenWorkerDialog(worker)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteWorker(worker.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Master Upah & Harga Jasa</CardTitle>
              <CardDescription>Definisi harga satuan standar untuk berbagai jenis pekerjaan borongan/harian</CardDescription>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-hrd" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Pekerjaan</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Harga Standar</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada data upah. Klik "Tambah Upah" untuk memulai.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">{rate.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-hrd">
                            {formatCurrency(rate.default_rate)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                            {rate.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenRateDialog(rate)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteRate(rate.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worker_types" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipe Pekerjaan Tukang</CardTitle>
              <CardDescription>Definisikan kategori pekerjaan seperti Harian, Borongan, dll.</CardDescription>
            </CardHeader>
            <CardContent>
              {workerTypesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-hrd" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Tipe</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Belum ada tipe pekerjaan. Klik "Tambah Tipe" untuk memulai.
                        </TableCell>
                      </TableRow>
                    ) : (
                      workerTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {type.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenWorkerTypeDialog(type)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteWorkerType(type.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Worker Dialog */}
      <Dialog open={showWorkerDialog} onOpenChange={setShowWorkerDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{workerForm.id ? 'Edit Data Tukang' : 'Tambah Tukang Baru'}</DialogTitle>
            <DialogDescription>
              Lengkapi informasi tenaga kerja lapangan di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                placeholder="Nama sesuai KTP"
                value={workerForm.name}
                onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="position">Posisi / Keahlian</Label>
                <Input
                  id="position"
                  placeholder="Misal: Tukang Cat, Kenek"
                  value={workerForm.position}
                  onChange={(e) => setWorkerForm({ ...workerForm, position: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">No. HP / WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="0812..."
                  value={workerForm.phone}
                  onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="join_date">Tanggal Bergabung</Label>
                <Input
                  id="join_date"
                  type="date"
                  value={workerForm.join_date}
                  onChange={(e) => setWorkerForm({ ...workerForm, join_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={workerForm.status} 
                  onValueChange={(val: any) => setWorkerForm({ ...workerForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="worker_type">Tipe Pekerjaan</Label>
                <Select 
                  value={workerForm.worker_type_id} 
                  onValueChange={(val: any) => setWorkerForm({ ...workerForm, worker_type_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Tipe</SelectItem>
                    {workerTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email (Opsional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tukang@email.com"
                  value={workerForm.email}
                  onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkerDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveWorker} 
              disabled={isSaving}
              className="bg-hrd hover:bg-hrd/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {workerForm.id ? 'Simpan Perubahan' : 'Tambah Tukang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{rateForm.id ? 'Edit Master Upah' : 'Tambah Master Upah'}</DialogTitle>
            <DialogDescription>
              Tentukan harga standar untuk satuan pekerjaan tertentu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Pekerjaan</Label>
              <Input
                id="name"
                placeholder="Misal: Pasang Bata Merah"
                value={rateForm.name}
                onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Satuan</Label>
                <Input
                  id="unit"
                  placeholder="m2, m3, Unit, dll"
                  value={rateForm.unit}
                  onChange={(e) => setRateForm({ ...rateForm, unit: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Harga Standar (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  value={rateForm.default_rate}
                  onChange={(e) => setRateForm({ ...rateForm, default_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Keterangan (Opsional)</Label>
              <Input
                id="description"
                placeholder="Catatan tambahan..."
                value={rateForm.description}
                onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveRate} 
              disabled={isSaving}
              className="bg-hrd hover:bg-hrd/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {rateForm.id ? 'Simpan Perubahan' : 'Tambah Master'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Worker Type Dialog */}
      <Dialog open={showWorkerTypeDialog} onOpenChange={setShowWorkerTypeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{workerTypeForm.id ? 'Edit Tipe Pekerjaan' : 'Tambah Tipe Baru'}</DialogTitle>
            <DialogDescription>
              Misal: Harian, Borongan, Kontrak, dll.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type_name">Nama Tipe</Label>
              <Input
                id="type_name"
                placeholder="Misal: Harian"
                value={workerTypeForm.name}
                onChange={(e) => setWorkerTypeForm({ ...workerTypeForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type_description">Keterangan (Opsional)</Label>
              <Input
                id="type_description"
                placeholder="Deskripsi singkat..."
                value={workerTypeForm.description}
                onChange={(e) => setWorkerTypeForm({ ...workerTypeForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkerTypeDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveWorkerType} 
              disabled={isSaving}
              className="bg-hrd hover:bg-hrd/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {workerTypeForm.id ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
