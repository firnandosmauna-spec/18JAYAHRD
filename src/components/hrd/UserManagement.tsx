import { useState, useEffect } from "react";
import { userService, AppUser } from "@/services/userService";
import { authService } from "@/services/authService";
import { useEmployees } from "@/hooks/useSupabase";
import { UserRole, ModuleType, useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MoreVertical, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const AVAILABLE_MODULES: { id: ModuleType; label: string }[] = [
    { id: 'hrd', label: 'HRD' },
    { id: 'accounting', label: 'Akuntansi' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'sales', label: 'Sales' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'customer', label: 'Customer Service' },
    { id: 'project', label: 'Project' },
    { id: 'marketing', label: 'Marketing' },
];

export function UserManagement() {
    const { toast } = useToast();
    const { user: currentUser, updateProfile: syncProfile } = useAuth();
    const { employees } = useEmployees();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form State
    const [editRole, setEditRole] = useState<UserRole>('staff');
    const [editModules, setEditModules] = useState<ModuleType[]>([]);
    const [editEmployeeId, setEditEmployeeId] = useState<string>('');

    // Register Dialog State
    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
    const [selectedRegisterEmp, setSelectedRegisterEmp] = useState<any>(null);
    const [registerData, setRegisterData] = useState({ email: '', password: '' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers();
            console.log(`DEBUG: UserManagement - Loaded ${data?.length || 0} users`);
            if (data && data.length > 0) {
                console.log("DEBUG: First user sample:", data[0]);
            }
            setUsers(data || []);
        } catch (error) {
            console.error("Failed to load users:", error);
            toast({
                title: "Error",
                description: "Gagal memuat data pengguna.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: AppUser) => {
        setSelectedUser(user);
        setEditRole(user.role as UserRole);
        setEditModules(user.modules as ModuleType[]);
        setEditEmployeeId(user.employee_id || '');
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            await userService.updateUserAccess(selectedUser.id, editRole, editModules);

            // Also update employee link if changed
            if (editEmployeeId && editEmployeeId !== 'none') {
                await userService.linkEmployee(selectedUser.id, editEmployeeId);
            } else {
                // Link with null to remove connection
                await userService.linkEmployee(selectedUser.id, null);
            }

            toast({
                title: "Sukses",
                description: `Hak akses dan data karyawan diperbarui.`,
            });

            setIsEditDialogOpen(false);
            loadUsers(); // Reload to reflect changes
        } catch (error) {
            console.error("Failed to update user:", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan perubahan.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const toggleModule = (moduleId: ModuleType) => {
        setEditModules(prev => {
            if (prev.includes(moduleId)) {
                return prev.filter(m => m !== moduleId);
            } else {
                return [...prev, moduleId];
            }
        });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Admin</Badge>;
            case 'manager': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Manager</Badge>;
            case 'staff': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Staff</Badge>;
            case 'marketing': return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Marketing</Badge>;
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    const handleRegisterClick = (emp: any) => {
        setSelectedRegisterEmp(emp);
        const email = emp.email || `${emp.name.toLowerCase().replace(/ /g, '.')}@jayatempo.com`;
        setRegisterData({ email, password: '' });
        setIsRegisterDialogOpen(true);
    };

    const handleRegisterConfirm = async () => {
        if (!registerData.password || !selectedRegisterEmp) return;
        setLoading(true);
        try {
            await authService.signUp({
                email: registerData.email,
                password: registerData.password,
                name: selectedRegisterEmp.name,
                role: 'staff', // Default role
                modules: ['hrd'] // Default module
            });

            toast({
                title: "Registrasi Berhasil",
                description: "Akun telah dibuat. Sesi Anda akan beralih ke pengguna baru.",
            });

            // Give time for toast
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err: any) {
            console.error("Register Error:", err);
            toast({
                title: "Gagal Registrasi",
                description: err.message || "Terjadi kesalahan.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setIsRegisterDialogOpen(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Manajemen Pengguna (V2)</CardTitle>
                        <CardDescription>
                            Kelola peran dan hak akses modul untuk setiap pengguna.
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadUsers}
                        disabled={loading}
                        className="font-body"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Segarkan
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-6">
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">Total Pengguna</span>
                        <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                    <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-100 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Belum Register</span>
                        <p className="text-2xl font-bold">{employees.filter(e => !users.some(u => u.employee_id === e.id)).length}</p>
                    </div>
                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-500">Total Karyawan</span>
                        <p className="text-2xl font-bold">{employees.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 font-body"
                        />
                    </div>

                    {!loading && !users.some(u => u.id === currentUser?.id) && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-body"
                            onClick={async () => {
                                if (!currentUser) {
                                    toast({ title: "Sesi Habis", description: "Silakan login kembali.", variant: "destructive" });
                                    return;
                                }
                                try {
                                    setLoading(true);
                                    await syncProfile({
                                        name: currentUser.name,
                                        email: currentUser.email,
                                        role: currentUser.role,
                                        modules: currentUser.modules
                                    });
                                    toast({ title: "Profil Disinkronkan", description: "Profil Anda telah dibuat di database." });
                                    await loadUsers();
                                } catch (err) {
                                    console.error("Sync My Profile Error:", err);
                                    toast({ title: "Gagal Sinkronisasi", description: "Cek koneksi database atau izin RLS.", variant: "destructive" });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Daftarkan Profil Saya
                        </Button>
                    )}

                    {!loading && users.length === 0 && currentUser?.role === 'admin' && (
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 font-body"
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    const result = await userService.syncAllEmployees();
                                    toast({
                                        title: "Inisialisasi Berhasil",
                                        description: `${result.count} karyawan telah dijadikan akun pengguna (view-only).`
                                    });
                                    await loadUsers();
                                } catch (err) {
                                    console.error("Init Error:", err);
                                    toast({ title: "Gagal Inisialisasi", description: "Terjadi kesalahan saat sinkronisasi.", variant: "destructive" });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Inisialisasi Data dari Karyawan
                        </Button>
                    )}

                    {!loading && currentUser?.role === 'admin' && (
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 font-body ml-2"
                            onClick={async () => {
                                if (!confirm("Apakah Anda yakin ingin mengganti semua posisi/departemen 'Sales' menjadi 'Marketing'?")) return;
                                try {
                                    setLoading(true);
                                    const result = await userService.syncSalesToMarketing();
                                    if (result.success) {
                                        toast({
                                            title: "Sinkronisasi Berhasil",
                                            description: `Updated: Departments (${result.details?.departments}), Positions (${result.details?.positions}), Employees (${result.details?.employees_dept} dep / ${result.details?.employees_pos} pos)`
                                        });
                                        await loadUsers();
                                    } else {
                                        toast({ title: "Gagal", description: result.error, variant: "destructive" });
                                    }
                                } catch (err) {
                                    console.error("Sync Error:", err);
                                    toast({ title: "Error", description: "Terjadi kesalahan.", variant: "destructive" });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync Sales → Marketing
                        </Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pengguna</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Akses Modul</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.filter(u => {
                            const name = (u.name || "").toLowerCase();
                            const email = (u.email || "").toLowerCase();
                            const query = searchQuery.toLowerCase();
                            return name.includes(query) || email.includes(query);
                        }).map(user => {
                            // Robust employee data extraction (handles array or object)
                            const employeeData = Array.isArray(user.employees) ? user.employees[0] : user.employees;

                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium font-body">{user.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{user.email}</span>
                                                {employeeData && (
                                                    <span className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5 font-medium">
                                                        <Users className="w-3 h-3" />
                                                        {employeeData.name} ({employeeData.position})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                                            {user.modules?.length > 0 ? user.modules.map(m => (
                                                <Badge key={m} variant="secondary" className="text-[10px] px-1 py-0 uppercase">{m}</Badge>
                                            )) : <span className="text-muted-foreground text-xs italic font-body">Tanpa Akses</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(user)} className="font-body">
                                                    Edit Akses
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-body">
                                    Tidak ada pengguna ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Section to show Unregistered Employees */}
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-600">
                        <ShieldAlert className="w-4 h-4" />
                        Karyawan Tanpa Akun Pengguna ({employees.filter(e => !users.some(u => u.employee_id === e.id)).length})
                    </h3>

                    {employees.filter(e => !users.some(u => u.employee_id === e.id)).length > 0 ? (
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <p className="text-sm text-amber-800 mb-3">
                                Karyawan berikut ini terdaftar sebagai pegawai aktif tetapi belum memiliki Akun Login (Username & Password).
                                Silakan <strong>Registrasi Akun</strong> untuk mereka agar bisa masuk ke sistem.
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Nama Karyawan</TableHead>
                                        <TableHead>Posisi</TableHead>
                                        <TableHead>Departemen</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.filter(e => !users.some(u => u.employee_id === e.id)).map(emp => (
                                        <TableRow key={emp.id} className="bg-white/50">
                                            <TableCell className="font-medium">{emp.name}</TableCell>
                                            <TableCell>{emp.position}</TableCell>
                                            <TableCell>{emp.department}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-amber-600 border-amber-200">Belum Register</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 font-body"
                                                    onClick={() => handleRegisterClick(emp)}
                                                >
                                                    <UserPlus className="w-3 h-3 mr-1" />
                                                    Register & Login
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="bg-green-50 rounded-lg p-6 border border-green-200 text-center">
                            <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <h4 className="text-green-800 font-bold mb-1">Semua Karyawan Sudah Terdaftar</h4>
                            <p className="text-green-700 text-sm">
                                Tidak ada karyawan aktif yang belum memiliki akun pengguna. Semua karyawan sudah dapat login.
                            </p>
                        </div>
                    )}
                </div>

                <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrasi Akun Karyawan</DialogTitle>
                            <DialogDescription>
                                Buat akun login untuk <b>{selectedRegisterEmp?.name}</b>.<br />
                                <span className="text-amber-600 font-bold">PERHATIAN:</span> Setelah akun dibuat, Anda otomatis akan login sebagai pengguna baru ini.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={registerData.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Password Baru</Label>
                                <Input
                                    type="password"
                                    placeholder="Min. 6 karakter"
                                    value={registerData.password}
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>Batal</Button>
                            <Button onClick={handleRegisterConfirm} disabled={loading || !registerData.password}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Buat Akun & Login
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    {/* ... Existing Edit Dialog Content ... */}
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit Akses Pengguna</DialogTitle>
                            <DialogDescription>
                                Atur peran dan modul yang dapat diakses oleh <b>{selectedUser?.name}</b>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label>Peran (Role)</Label>
                                <Select value={editRole} onValueChange={(val) => setEditRole(val as UserRole)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Peran" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Admin memiliki akses penuh. Peran lain dibatasi sesuai modul yang dipilih.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label>Akses Modul</Label>
                                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
                                    {AVAILABLE_MODULES.map(module => (
                                        <div key={module.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`module-${module.id}`}
                                                checked={editModules.includes(module.id)}
                                                onCheckedChange={() => toggleModule(module.id)}
                                                disabled={editRole === 'admin'} // Admin always has all
                                            />
                                            <label
                                                htmlFor={`module-${module.id}`}
                                                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${editRole === 'admin' ? 'opacity-50' : ''}`}
                                            >
                                                {module.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {editRole === 'admin' && (
                                    <p className="text-xs text-blue-600 flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        Admin otomatis memiliki akses ke semua modul.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Hubungkan Data Karyawan</Label>
                                <Select value={editEmployeeId} onValueChange={setEditEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Karyawan (Opsional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Tidak Terhubung --</SelectItem>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.position})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Menghubungkan akun ini dengan data karyawan memungkinkan sinkronisasi data absensi dan cuti.
                                </p>
                            </div>

                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                                Batal
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card >
    );
}
