import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    Camera,
    CheckCircle,
    AlertCircle,
    Info,
    CreditCard,
    Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export function ESSPortal() {
    const { user, logout } = useAuth();
    const { employees } = useEmployees();
    const { departments } = useDepartments(); // Fetch departments to map IDs to names
    const { addNotification, markAllAsRead, unreadCount, notifications } = useNotificationsContext(); // Use notification context

    const employee = employees.find(e => e.id === user?.employee_id);

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

    const [activeTab, setActiveTab] = useState('overview');

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

    if (!user?.employee_id) {
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

    // Find department name: either direct string or matching ID
    const departmentName = employee?.department
        // Fallback: lookup in departments list by ID if employee.department is an ID or empty
        || departments.find(d => d.id === employee?.department_id)?.name
        || '-';

    return (
        <div className="space-y-6">
            {/* Header Profile */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-hrd to-hrd-dark p-6 text-white shadow-lg"
            >
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-white/20">
                        <AvatarFallback className="bg-white/10 text-2xl font-bold">
                            {user?.name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold font-display">{user?.name}</h1>
                        <p className="text-white/80 font-body text-lg">{employee?.position || 'Karyawan'}</p>
                        <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                            <Badge variant="secondary" className="bg-white/20 text-white border-none hover:bg-white/30">
                                NIK: {user.id.slice(0, 8).toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="bg-white/20 text-white border-none hover:bg-white/30">
                                {employee?.status === 'active' ? 'Aktif' : 'On Leave'}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Settings className="w-4 h-4 mr-2" />
                            Edit Profil
                        </Button>
                    </div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex w-full overflow-x-auto lg:w-auto lg:inline-flex bg-gray-100/50 p-1 no-scrollbar">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                    <TabsTrigger value="attendance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Absensi</TabsTrigger>
                    <TabsTrigger value="leave" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Cuti</TabsTrigger>
                    <TabsTrigger value="payroll" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Gaji</TabsTrigger>
                    <TabsTrigger value="pipeline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Pipeline</TabsTrigger>
                    <TabsTrigger value="loan" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Kasbon</TabsTrigger>
                    <TabsTrigger value="reward" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Reward</TabsTrigger>
                </TabsList>

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

                        <Card className="shadow-sm border-gray-200">
                            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-hrd" />
                                    Notifikasi Terbaru
                                </CardTitle>
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-blue-600 h-6 px-2 hover:bg-blue-50"
                                        onClick={() => markAllAsRead()}
                                    >
                                        Tandai Dibaca
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y max-h-[300px] overflow-y-auto">
                                    {notifications.length === 0 ? (
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

                        <Card className="shadow-sm border-gray-200 overflow-hidden group cursor-pointer hover:border-hrd transition-all">
                            <CardContent className="p-0">
                                <div className="bg-hrd/5 p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-hrd">ABSENSI ONLINE</p>
                                        <h3 className="text-xl font-bold mt-1">Belum Absen</h3>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-hrd text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Camera className="w-6 h-6" />
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
        </div>
    );
}
