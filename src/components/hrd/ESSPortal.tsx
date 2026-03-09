import React, { useState, useEffect } from 'react';
import { userService } from '@/services/userService';
import { settingsService as hrdSettingsService } from '@/services/settingsService';
import { AttendanceSettings } from '@/types/settings';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Clock,
    Calendar,
    DollarSign,
    FileText,
    Settings,
    Bell,
    LogOut,
    MapPin,
    CheckCircle,
    AlertCircle,
    Info,
    CreditCard,
    Award,
    Loader2,
    RefreshCw,
    Megaphone,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useAttendance, useLeaveRequests, usePayroll, useDepartments } from '@/hooks/useSupabase';
import { useNotificationsContext } from '@/contexts/NotificationContext';
import { UserAttendance } from './UserAttendance';
import { LeaveManagement } from './LeaveManagement';
import { PayrollManagement } from './PayrollManagement';
import { UserPipeline } from './UserPipeline';
import { LoanManagement } from './LoanManagement';
import { RewardManagement } from './RewardManagement';
import { EditProfileDialog } from '../auth/EditProfileDialog';

export function ESSPortal() {
    const { user, profile, updateProfile, restoreAdminSession } = useAuth();
    const { employees } = useEmployees();
    const { departments } = useDepartments(); // Fetch departments to map IDs to names
    const { markAllAsRead, unreadCount, notifications, loading, refetch: refetchNotifications } = useNotificationsContext(); // Use notification context
    const { toast } = useToast();

    const employee = employees.find(e => e.id === user?.employee_id);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [isLinking, setIsLinking] = useState(false);
    const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<any | null>(null);
    const { markAsRead } = useNotificationsContext();

    // Load attendance settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await hrdSettingsService.getAttendanceSettings();
                setAttendanceSettings(settings);
            } catch (error) {
                console.error("Failed to load attendance settings:", error);
            }
        };
        loadSettings();
    }, []);

    // Auto-link if employee_id is missing but employee exists with same email
    useEffect(() => {
        const attemptAutoLink = async () => {
            if (user && !user.employee_id && user.email && !isLinking) {
                // If admin and attendance not required, don't force auto-link
                if (user.role === 'Administrator' && attendanceSettings && !attendanceSettings.admin_attendance_required) {
                    return;
                }

                try {
                    setIsLinking(true);
                    const updatedUser = await userService.findAndLinkEmployee(user.id, user.email);
                    if (updatedUser && updatedUser.employee_id) {
                        // Sync profile in AuthContext
                        await updateProfile({ employee_id: updatedUser.employee_id });
                        toast({
                            title: "Akun Terhubung Otomatis",
                            description: "Profil Anda telah berhasil dihubungkan dengan data HRD.",
                        });
                    }
                } catch (error) {
                    console.error("Auto-link failed:", error);
                } finally {
                    setIsLinking(false);
                }
            }
        };
        attemptAutoLink();
    }, [user, updateProfile, toast, attendanceSettings]);

    // Check for unread announcements or mandatory messages
    useEffect(() => {
        if (!loading && notifications.length > 0 && !currentAnnouncement) {
            const announcement = notifications.find(n =>
                !n.read &&
                (n.type === 'announcement' || n.type === 'mandatory_announcement' || n.is_popup)
            );
            if (announcement) {
                setCurrentAnnouncement(announcement);
            }
        }
    }, [notifications, loading, currentAnnouncement]);

    const handleAcknowledgeAnnouncement = async () => {
        if (currentAnnouncement) {
            try {
                await markAsRead(currentAnnouncement.id);
                setCurrentAnnouncement(null);
                toast({
                    title: "Berhasil",
                    description: "Pengumuman telah dibaca.",
                });
            } catch (error) {
                console.error("Failed to mark announcement as read:", error);
            }
        }
    };

    // Calculate employee duration from join_date to now
    function calculateEmployeeDuration(joinDate: string): string {
        const join = new Date(joinDate);
        const now = new Date();

        // Calculate total difference in milliseconds
        const diffMs = now.getTime() - join.getTime();

        if (diffMs < 0) {
            return '0 tahun 0 bulan';
        }

        // Calculate years (more accurate by checking actual year difference)
        let years = now.getFullYear() - join.getFullYear();
        let months = now.getMonth() - join.getMonth();

        if (months < 0) {
            months += 12;
            years--;
        }

        // Ensure non-negative values
        years = Math.max(0, years);
        months = Math.max(0, months);

        // Format duration string
        const parts: string[] = [];
        if (years > 0) parts.push(`${years} Tahun`);
        if (months > 0) parts.push(`${months} Bulan`);

        return parts.length > 0 ? parts.join(' ') : 'Baru Bergabung';
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (isLinking) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-hrd animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Menghubungkan akun ke sistem HRD...</p>
                </div>
            </div>
        );
    }

    // Check if we should block the portal
    const isAttendanceRequired = user?.role !== 'Administrator' || (attendanceSettings?.admin_attendance_required ?? true);

    if (!user?.employee_id && isAttendanceRequired) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md border-orange-200 bg-orange-50">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-orange-900 mb-2">Akun Belum Terhubung</h2>
                        <p className="text-orange-800">
                            Akun Anda belum terhubung dengan data karyawan di sistem HRD.
                            Silakan hubungi HRD/Admin untuk melakukan sinkronisasi data.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Find department name
    const departmentName = employee?.department
        || departments.find(d => d.id === employee?.department_id)?.name
        || '-';

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Announcement Popup */}
            <Dialog
                open={!!currentAnnouncement}
                onOpenChange={(open) => {
                    if (!open && currentAnnouncement?.type !== 'mandatory_announcement' && !currentAnnouncement?.is_mandatory) {
                        setCurrentAnnouncement(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden rounded-2xl shadow-2xl">
                    <div className={`p-6 ${currentAnnouncement?.type === 'mandatory_announcement' || currentAnnouncement?.is_mandatory
                        ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                        : 'bg-gradient-to-br from-hrd to-hrd-dark text-white'
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Megaphone className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold font-display">Pengumuman Penting</h2>
                        </div>
                        <h3 className="text-lg font-semibold leading-tight">{currentAnnouncement?.title}</h3>
                    </div>

                    <div className="p-6 bg-white">
                        <div className="text-gray-700 font-body leading-relaxed whitespace-pre-wrap max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {currentAnnouncement?.message}
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <Button
                                onClick={handleAcknowledgeAnnouncement}
                                className={`w-full h-12 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 ${currentAnnouncement?.type === 'mandatory_announcement' || currentAnnouncement?.is_mandatory
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                    : 'bg-hrd hover:bg-hrd-dark text-white'
                                    }`}
                            >
                                Saya Mengerti & Setuju
                            </Button>

                            {(!currentAnnouncement?.is_mandatory && currentAnnouncement?.type !== 'mandatory_announcement') && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentAnnouncement(null)}
                                    className="w-full text-gray-500 hover:text-gray-700 font-body text-sm"
                                >
                                    Lewati Sementara
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Header Profile */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-hrd to-hrd-dark p-6 text-white shadow-lg"
            >
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <Avatar className="h-48 w-48 md:h-64 md:w-64 border-8 border-white/20 shadow-2xl">
                        {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />}
                        <AvatarFallback className="bg-white/10 text-6xl font-bold">
                            {user?.name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold font-display">{user?.name}</h1>
                        <p className="text-white/80 font-body text-sm md:text-base">{employee?.position || 'Karyawan'}</p>
                        <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
                            <Badge variant="secondary" className="bg-white/10 text-white/90 border-none hover:bg-white/20 text-[10px] py-0 h-5">
                                NIK: {employee?.nik || user?.id.slice(0, 8).toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="bg-white/10 text-white/90 border-none hover:bg-white/20 text-[10px] py-0 h-5">
                                {employee?.status === 'active' ? 'Aktif' : 'On Leave'}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => setIsEditDialogOpen(true)}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Edit Profil
                        </Button>
                    </div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
            </motion.div>

            <EditProfileDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="relative">
                    <TabsList className="flex w-full overflow-x-auto lg:w-auto justify-start bg-gray-100/50 p-1 no-scrollbar flex-nowrap min-w-full">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Overview</TabsTrigger>
                        <TabsTrigger value="attendance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Absensi</TabsTrigger>
                        <TabsTrigger value="leave" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Cuti</TabsTrigger>
                        <TabsTrigger value="payroll" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Gaji</TabsTrigger>
                        <TabsTrigger value="pipeline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Pipeline</TabsTrigger>
                        <TabsTrigger value="loan" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Kasbon</TabsTrigger>
                        <TabsTrigger value="reward" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap">Reward</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 shadow-sm border-gray-200">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Info className="w-5 h-5 text-hrd" />
                                    Informasi Pekerjaan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground font-body">Departemen</p>
                                        <p className="font-semibold text-[#1C1C1E]">{departmentName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-body">Tanggal Bergabung</p>
                                        <p className="font-semibold text-[#1C1C1E] font-mono">{employee?.join_date || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-body">Masa Kerja</p>
                                        <p className="font-semibold text-[#1C1C1E]">
                                            {employee?.join_date ? calculateEmployeeDuration(employee.join_date) : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-body">Sisa Cuti</p>
                                        <p className="font-semibold text-hrd font-mono text-lg">12 Hari</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications Card - Only for Admin */}
                        {user?.role === 'Administrator' && (
                            <Card className="shadow-sm border-gray-200">
                                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-hrd" />
                                        Notifikasi Terbaru
                                    </CardTitle>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-hrd"
                                            onClick={() => refetchNotifications()}
                                            title="Perbarui Notifikasi"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                        {unreadCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-blue-600 h-8 px-2 hover:bg-blue-50"
                                                onClick={() => markAllAsRead()}
                                            >
                                                Tandai Dibaca
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y max-h-[300px] overflow-y-auto">
                                        {loading ? (
                                            <div className="p-8 flex justify-center items-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        ) : notifications.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground text-sm">
                                                Tidak ada notifikasi baru
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((notification) => (
                                                <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}>
                                                    <p className={`text-sm ${!notification.read ? 'font-semibold text-blue-800' : 'font-medium text-gray-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(notification.created_at).toLocaleString('id-ID')}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card
                            className="shadow-sm border-gray-200 overflow-hidden group cursor-pointer hover:border-hrd transition-all"
                            onClick={() => setActiveTab('attendance')}
                        >
                            <CardContent className="p-0">
                                <div className="bg-hrd/5 p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-hrd">ABSENSI ONLINE</p>
                                        <h3 className="text-xl font-bold mt-1">Belum Absen</h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-hrd text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="attendance">
                    <UserAttendance />
                </TabsContent>

                <TabsContent value="leave">
                    <LeaveManagement />
                </TabsContent>

                <TabsContent value="payroll">
                    <PayrollManagement />
                </TabsContent>

                <TabsContent value="pipeline">
                    <UserPipeline />
                </TabsContent>

                <TabsContent value="loan">
                    <LoanManagement />
                </TabsContent>

                <TabsContent value="reward">
                    <RewardManagement />
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}
