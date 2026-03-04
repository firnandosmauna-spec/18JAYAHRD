
import { useState, useEffect } from "react";
import { Department } from "@/lib/supabase";
import { useDepartments } from "@/hooks/useSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, Search, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DepartmentsPage() {
    const { departments, loading, addDepartment, updateDepartment, deleteDepartment, refetch } = useDepartments();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
    const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
    const { toast } = useToast();

    const handleSave = async () => {
        try {
            if (!currentDept.name) {
                toast({
                    title: "Validation Error",
                    description: "Nama Departemen wajib diisi",
                    variant: "destructive",
                });
                return;
            }

            const deptData = {
                name: currentDept.name,
                description: currentDept.description || "",
                budget: currentDept.budget || 0,
            };

            if (currentDept.id) {
                await updateDepartment(currentDept.id, deptData);
                toast({
                    title: "Berhasil",
                    description: "Departemen berhasil diperbarui",
                });
            } else {
                await addDepartment(deptData);
                toast({
                    title: "Berhasil",
                    description: "Departemen berhasil dibuat",
                });
            }

            setIsDialogOpen(false);
            setCurrentDept({});
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const confirmDelete = (id: string) => {
        setDeptToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deptToDelete) return;

        try {
            await deleteDepartment(deptToDelete);
            toast({
                title: "Berhasil",
                description: "Departemen berhasil dihapus",
            });
        } catch (error: any) {
            toast({
                title: "Gagal",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setDeptToDelete(null);
        }
    };

    const filteredDepartments = departments.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Departemen</h1>
                    <p className="text-muted-foreground mt-2">
                        Kelola struktur organisasi dan departemen perusahaan.
                    </p>
                </div>
                <Button onClick={() => { setCurrentDept({}); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Departemen
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari departemen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Departemen</TableHead>
                                    <TableHead>Deskripsi</TableHead>
                                    <TableHead>Anggaran</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            Memuat data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDepartments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Tidak ada departemen ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDepartments.map((dept) => (
                                        <TableRow key={dept.id}>
                                            <TableCell className="font-medium">
                                                {dept.name}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {dept.description || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(dept.budget || 0)}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setCurrentDept(dept);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => confirmDelete(dept.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{currentDept.id ? "Edit Departemen" : "Tambah Departemen"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nama Departemen <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={currentDept.name || ""}
                                onChange={(e) => setCurrentDept({ ...currentDept, name: e.target.value })}
                                placeholder="Contoh: HRD, Finance, Operasional"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea
                                id="description"
                                value={currentDept.description || ""}
                                onChange={(e) => setCurrentDept({ ...currentDept, description: e.target.value })}
                                placeholder="Deskripsi singkat tentang departemen"
                                rows={3}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="budget">Anggaran (IDR)</Label>
                            <Input
                                id="budget"
                                type="number"
                                value={currentDept.budget || 0}
                                onChange={(e) => setCurrentDept({ ...currentDept, budget: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSave}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Penghapusan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus departemen ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
