
import { useState, useEffect } from "react";
import { supabase, Position, Department } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PositionsPage() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [positionToDelete, setPositionToDelete] = useState<string | null>(null);
    const [currentPosition, setCurrentPosition] = useState<Partial<Position>>({});
    const { toast } = useToast();

    useEffect(() => {
        fetchPositions();
    }, []);

    const fetchPositions = async () => {
        try {
            const { data, error } = await supabase
                .from("positions")
                .select("*")
                .select("*")
                .order("department");

            if (error) throw error;
            setPositions(data || []);
        } catch (error: any) {
            console.error("Error fetching positions:", error);
            toast({
                title: "Error",
                description: "Failed to load positions: " + error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };


    const handleSave = async () => {
        try {
            if (!currentPosition.department || !currentPosition.level) {
                toast({
                    title: "Validation Error",
                    description: "Mohon isi semua field yang wajib (Departemen, Posisi)",
                    variant: "destructive",
                });
                return;
            }

            // Auto-generate title: "{Level} - {Department}"
            const generatedTitle = `${currentPosition.level} - ${currentPosition.department}`;

            const positionData = {
                title: generatedTitle,
                department: currentPosition.department,
                level: currentPosition.level,
                gaji_pokok: 0, // Default to 0 as requested
                job_desc: "", // Empty as requested
            };

            let error;
            if (currentPosition.id) {
                const { error: updateError } = await supabase
                    .from("positions")
                    .update(positionData)
                    .eq("id", currentPosition.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("positions")
                    .insert(positionData);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: "Success",
                description: `Position ${currentPosition.id ? "updated" : "created"} successfully`,
            });

            setIsDialogOpen(false);
            fetchPositions();
            setCurrentPosition({});
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const confirmDelete = (id: string) => {
        setPositionToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!positionToDelete) return;

        try {
            const { error } = await supabase.from("positions").delete().eq("id", positionToDelete);
            if (error) throw error;

            toast({
                title: "Berhasil",
                description: "Posisi berhasil dihapus",
            });
            fetchPositions();
        } catch (error: any) {
            toast({
                title: "Gagal",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setPositionToDelete(null);
        }
    };

    const filteredPositions = positions.filter((p) =>
        p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.level && p.level.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Job Positions</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage job titles, levels, and standard salaries.
                    </p>
                </div>
                <Button onClick={() => { setCurrentPosition({}); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Position
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search positions..."
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
                                    <TableHead>Departemen</TableHead>
                                    <TableHead>Posisi</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8">
                                            Loading positions...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPositions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            No positions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPositions.map((position) => (
                                        <TableRow key={position.id}>
                                            <TableCell>
                                                {position.department}
                                            </TableCell>
                                            <TableCell>
                                                {position.level && (
                                                    <Badge variant="secondary" className="capitalize">
                                                        {position.level}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setCurrentPosition(position);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => confirmDelete(position.id)}
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
                        <DialogTitle>{currentPosition.id ? "Edit Position" : "Add New Position"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="department">Departemen <span className="text-red-500">*</span></Label>
                            <Input
                                id="department"
                                value={currentPosition.department || ""}
                                onChange={(e) => setCurrentPosition({ ...currentPosition, department: e.target.value })}
                                placeholder="Contoh: HRD, Finance"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="level">Posisi <span className="text-red-500">*</span></Label>
                            <Select
                                value={currentPosition.level}
                                onValueChange={(val) => setCurrentPosition({ ...currentPosition, level: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Posisi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Administrator">Administrator</SelectItem>
                                    <SelectItem value="Staf">Staf</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Position</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Penghapusan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus data posisi ini? Tindakan ini tidak dapat dibatalkan.
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
