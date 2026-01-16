import { useState, useEffect } from "react";
import { userService, AppUser } from "@/services/userService";
import { useEmployees } from "@/hooks/useSupabase";
import { UserRole, ModuleType } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MoreVertical, Shield, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const AVAILABLE_MODULES: { id: ModuleType; label: string }[] = [
    { id: 'hrd', label: 'HRD' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'sales', label: 'Sales' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'customer', label: 'Customer Service' },
    { id: 'project', label: 'Project' },
    { id: 'marketing', label: 'Marketing' },
];

export function UserManagement() {
    const { toast } = useToast();
    const { employees } = useEmployees();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [editRole, setEditRole] = useState<UserRole>('staff');
    const [editModules, setEditModules] = useState<ModuleType[]>([]);
    const [editEmployeeId, setEditEmployeeId] = useState<string>('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers();
            console.log(`DEBUG: Loaded ${data.length} users`);
            console.log(data);
            setUsers(data);
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

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manajemen Pengguna</CardTitle>
                <CardDescription>
                    Kelola peran dan hak akses modul untuk setiap pengguna.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                            {/* @ts-ignore - joined data */}
                                            {user.employees && (
                                                <span className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                                                    <Users className="w-3 h-3" />
                                                    {/* @ts-ignore */}
                                                    {user.employees.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{getRoleBadge(user.role)}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                                        {user.modules?.length > 0 ? user.modules.map(m => (
                                            <Badge key={m} variant="secondary" className="text-[10px] px-1 py-0">{m}</Badge>
                                        )) : <span className="text-muted-foreground text-xs italic">Tanpa Akses</span>}
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
                                            <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                                Edit Akses
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Section to show Unregistered Employees */}
                {employees.filter(e => !users.some(u => u.employee_id === e.id)).length > 0 && (
                    <div className="mt-8 pt-6 border-t">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-600">
                            <ShieldAlert className="w-4 h-4" />
                            Karyawan Tanpa Akun Pengguna ({employees.filter(e => !users.some(u => u.employee_id === e.id)).length})
                        </h3>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.filter(e => !users.some(u => u.employee_id === e.id)).map(emp => (
                                        <TableRow key={emp.id} className="bg-white/50">
                                            <TableCell className="font-medium">{emp.name}</TableCell>
                                            <TableCell>{emp.position}</TableCell>
                                            <TableCell>{emp.department}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-amber-600 border-amber-200">Belum Register</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
