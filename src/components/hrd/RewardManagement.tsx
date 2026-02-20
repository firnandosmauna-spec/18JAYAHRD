import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Star,
  Gift,
  Trophy,
  Medal,
  Crown,
  Target,
  Plus,
  Search,
  Filter,
  MoreVertical,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Send,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Hooks
import { useRewards, useEmployees } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RewardRecord } from '@/lib/supabase';

// Types
type RewardType = 'employee_of_month' | 'innovation_award' | 'best_team_leader' | 'perfect_attendance' | 'customer_champion' | 'closing' | 'custom';
type RewardStatus = 'active' | 'claimed' | 'expired';

interface RewardFormData {
  employee_id: string;
  type: RewardType;
  title: string;
  description: string;
  points: string;
  awarded_date: string;
}

const rewardTypeLabels: Record<RewardType, string> = {
  employee_of_month: 'Karyawan Terbaik Bulan Ini',
  innovation_award: 'Penghargaan Inovasi',
  best_team_leader: 'Pemimpin Tim Terbaik',
  perfect_attendance: 'Kehadiran Sempurna',
  customer_champion: 'Juara Layanan Pelanggan',
  closing: 'Pencapaian Target',
  custom: 'Penghargaan Khusus'
};

const rewardTypeIcons: Record<RewardType, React.ElementType> = {
  employee_of_month: Crown,
  innovation_award: Star,
  best_team_leader: Trophy,
  perfect_attendance: Medal,
  customer_champion: Award,
  closing: Target,
  custom: Gift
};

const statusLabels: Record<RewardStatus, string> = {
  active: 'Aktif',
  claimed: 'Diklaim',
  expired: 'Kedaluwarsa'
};

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  claimed: 'bg-blue-100 text-blue-800 border-blue-200',
  expired: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusIcons = {
  active: CheckCircle,
  claimed: Gift,
  expired: XCircle
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function RewardManagement() {
  const { rewards, loading, error, addReward, claimReward } = useRewards();
  const { employees } = useEmployees();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | RewardStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardRecord | null>(null);

  const [formData, setFormData] = useState<RewardFormData>({
    employee_id: '',
    type: 'employee_of_month',
    title: '',
    description: '',
    points: '100',
    awarded_date: new Date().toISOString().split('T')[0]
  });

  // Filter rewards based on active tab and search
  const filteredRewards = rewards.filter(reward => {
    const matchesTab = activeTab === 'all' || reward.status === activeTab;
    const employee = employees.find(emp => emp.id === reward.employee_id);
    const employeeName = employee?.name || '';
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rewardTypeLabels[reward.type as RewardType].toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = user?.role === 'staff'
      ? reward.employee_id === user.employee_id
      : true;

    return matchesTab && matchesSearch && matchesRole;
  });

  // Get counts for each tab
  const counts = {
    all: rewards.length,
    active: rewards.filter(r => r.status === 'active').length,
    claimed: rewards.filter(r => r.status === 'claimed').length,
    expired: rewards.filter(r => r.status === 'expired').length
  };

  // Calculate statistics
  const stats = {
    totalRewards: rewards.length,
    totalPoints: rewards.reduce((sum, reward) => sum + reward.points, 0),
    activeRewards: rewards.filter(r => r.status === 'active').length,
    claimedRewards: rewards.filter(r => r.status === 'claimed').length,
    topEmployee: getTopEmployee()
  };

  function getTopEmployee() {
    const employeePoints = employees.map(emp => {
      const empRewards = rewards.filter(r => r.employee_id === emp.id && r.status === 'claimed');
      const totalPoints = empRewards.reduce((sum, r) => sum + r.points, 0);
      return { employee: emp, points: totalPoints, rewardCount: empRewards.length };
    }).sort((a, b) => b.points - a.points);

    return employeePoints[0] || null;
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      type: 'employee_of_month',
      title: '',
      description: '',
      points: '100',
      awarded_date: new Date().toISOString().split('T')[0]
    });
  };

  // Handle add reward
  const handleAddReward = async () => {
    try {
      if (!formData.employee_id || !formData.title || !formData.description) {
        alert('Mohon lengkapi semua field yang wajib diisi');
        return;
      }

      const points = parseInt(formData.points) || 0;

      const newReward = {
        employee_id: formData.employee_id,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        points,
        status: 'active' as const,
        awarded_date: formData.awarded_date,
        claimed_date: null
      };

      await addReward(newReward);
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add reward:', error);
      alert('Gagal menambah penghargaan');
    }
  };

  // Handle claim reward
  const handleClaimReward = async (rewardId: string) => {
    try {
      await claimReward(rewardId);
    } catch (error) {
      console.error('Failed to claim reward:', error);
      alert('Gagal mengklaim penghargaan');
    }
  };

  // Handle view reward details
  const handleViewReward = (reward: RewardRecord) => {
    setSelectedReward(reward);
    setShowViewDialog(true);
  };

  // Auto-fill title based on type
  useEffect(() => {
    if (formData.type && formData.type !== 'custom') {
      setFormData(prev => ({
        ...prev,
        title: rewardTypeLabels[formData.type]
      }));
    }
  }, [formData.type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-hrd/30 border-t-hrd rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Memuat data penghargaan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error memuat data: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Reward</h1>
          <p className="text-muted-foreground font-body">Kelola penghargaan dan apresiasi karyawan</p>
        </div>
        {user?.role !== 'staff' && (
          <Button
            className="bg-hrd hover:bg-hrd-dark font-body"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Beri Penghargaan
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Total
                </Badge>
              </div>
              <div className="mt-4">
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.totalRewards}</p>
                <p className="text-sm text-muted-foreground font-body">Total Penghargaan</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Points
                </Badge>
              </div>
              <div className="mt-4">
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.totalPoints}</p>
                <p className="text-sm text-muted-foreground font-body">Total Poin</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Active
                </Badge>
              </div>
              <div className="mt-4">
                <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stats.activeRewards}</p>
                <p className="text-sm text-muted-foreground font-body">Penghargaan Aktif</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-hrd/10 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-hrd" />
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Top
                </Badge>
              </div>
              <div className="mt-4">
                <p className="font-mono text-lg font-bold text-[#1C1C1E]">
                  {stats.topEmployee?.points || 0} pts
                </p>
                <p className="text-sm text-muted-foreground font-body truncate">
                  {stats.topEmployee?.employee.name || 'Belum ada'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari karyawan atau penghargaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
        <Button variant="outline" className="font-body">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="font-body">
            Semua ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="active" className="font-body">
            Aktif ({counts.active})
          </TabsTrigger>
          <TabsTrigger value="claimed" className="font-body">
            Diklaim ({counts.claimed})
          </TabsTrigger>
          <TabsTrigger value="expired" className="font-body">
            Kedaluwarsa ({counts.expired})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body">Karyawan</TableHead>
                    <TableHead className="font-body">Penghargaan</TableHead>
                    <TableHead className="font-body">Jenis</TableHead>
                    <TableHead className="font-body">Poin</TableHead>
                    <TableHead className="font-body">Tanggal</TableHead>
                    <TableHead className="font-body">Status</TableHead>
                    {user?.role !== 'staff' && (
                      <TableHead className="font-body text-right">Aksi</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredRewards.map((reward) => {
                      const employee = employees.find(emp => emp.id === reward.employee_id);
                      const StatusIcon = statusIcons[reward.status as RewardStatus];
                      const TypeIcon = rewardTypeIcons[reward.type as RewardType];

                      return (
                        <motion.tr
                          key={reward.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="group"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                                  {employee?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium font-body">{employee?.name || 'Unknown'}</span>
                                <p className="text-xs text-muted-foreground font-body">{employee?.position}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <TypeIcon className="w-4 h-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-medium font-body text-sm">{reward.title}</p>
                                <p className="text-xs text-muted-foreground font-body truncate max-w-[200px]">
                                  {reward.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-body text-sm">
                            {rewardTypeLabels[reward.type as RewardType]}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="font-mono font-bold text-sm">{reward.points}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDate(reward.awarded_date)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[reward.status as RewardStatus]} font-body`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusLabels[reward.status as RewardStatus]}
                            </Badge>
                          </TableCell>
                          {user?.role !== 'staff' && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="font-body"
                                    onClick={() => handleViewReward(reward)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Lihat Detail
                                  </DropdownMenuItem>
                                  {reward.status === 'active' && (
                                    <DropdownMenuItem
                                      className="font-body text-blue-600"
                                      onClick={() => handleClaimReward(reward.id)}
                                    >
                                      <Gift className="w-4 h-4 mr-2" />
                                      Klaim
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="font-body">
                                    <Send className="w-4 h-4 mr-2" />
                                    Kirim Notifikasi
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="font-body text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Reward Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Beri Penghargaan</DialogTitle>
            <DialogDescription className="font-body">
              Berikan penghargaan kepada karyawan berprestasi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Karyawan <span className="text-red-500">*</span></Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="font-body">
                      {emp.name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Jenis Penghargaan <span className="text-red-500">*</span></Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as RewardType })}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Pilih jenis penghargaan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(rewardTypeLabels).map(([key, label]) => {
                    const IconComponent = rewardTypeIcons[key as RewardType];
                    return (
                      <SelectItem key={key} value={key} className="font-body">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Judul Penghargaan <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Masukkan judul penghargaan"
                className="font-body"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={formData.type !== 'custom'}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Deskripsi <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Jelaskan alasan pemberian penghargaan..."
                className="font-body"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body">Poin Reward</Label>
                <Input
                  type="number"
                  placeholder="100"
                  className="font-mono"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Tanggal Pemberian</Label>
                <Input
                  type="date"
                  className="font-mono"
                  value={formData.awarded_date}
                  onChange={(e) => setFormData({ ...formData, awarded_date: e.target.value })}
                />
              </div>
            </div>

            {/* Preview */}
            {formData.title && formData.description && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    {React.createElement(rewardTypeIcons[formData.type], { className: "w-5 h-5 text-yellow-600" })}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium font-body text-yellow-800">{formData.title}</p>
                    <p className="text-sm text-yellow-700 font-body">{formData.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs font-mono text-yellow-800">{formData.points} poin</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddReward} className="bg-hrd hover:bg-hrd-dark font-body">
              <Award className="w-4 h-4 mr-2" />
              Berikan Penghargaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Reward Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Penghargaan</DialogTitle>
            <DialogDescription className="font-body">
              Informasi lengkap penghargaan karyawan
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge className={`${statusColors[selectedReward.status as RewardStatus]} font-body px-4 py-2`}>
                  {React.createElement(statusIcons[selectedReward.status as RewardStatus], { className: "w-4 h-4 mr-2" })}
                  {statusLabels[selectedReward.status as RewardStatus]}
                </Badge>
              </div>

              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                    {employees.find(emp => emp.id === selectedReward.employee_id)?.name.split(' ').map(n => n[0]).join('') || 'N/A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-display font-bold text-[#1C1C1E]">
                    {employees.find(emp => emp.id === selectedReward.employee_id)?.name || 'Unknown'}
                  </h3>
                  <p className="text-muted-foreground font-body">
                    {employees.find(emp => emp.id === selectedReward.employee_id)?.position || 'Unknown Position'}
                  </p>
                </div>
              </div>

              {/* Reward Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    {React.createElement(rewardTypeIcons[selectedReward.type as RewardType], { className: "w-6 h-6 text-yellow-600" })}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-yellow-800">{selectedReward.title}</h4>
                    <p className="text-sm text-yellow-700 font-body">{rewardTypeLabels[selectedReward.type as RewardType]}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <span className="font-mono font-bold text-yellow-800">{selectedReward.points}</span>
                    </div>
                    <p className="text-xs text-yellow-700 font-body">poin</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Deskripsi</Label>
                  <p className="font-body p-3 bg-gray-50 rounded-lg">{selectedReward.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-body text-muted-foreground">Tanggal Pemberian</Label>
                    <p className="font-mono font-medium">{formatDate(selectedReward.awarded_date)}</p>
                  </div>
                  {selectedReward.claimed_date && (
                    <div className="space-y-2">
                      <Label className="font-body text-muted-foreground">Tanggal Diklaim</Label>
                      <p className="font-mono font-medium">{formatDate(selectedReward.claimed_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="font-body">
              Tutup
            </Button>
            {selectedReward?.status === 'active' && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 font-body"
                onClick={() => {
                  handleClaimReward(selectedReward.id);
                  setShowViewDialog(false);
                }}
              >
                <Gift className="w-4 h-4 mr-2" />
                Klaim Reward
              </Button>
            )}
            <Button className="bg-hrd hover:bg-hrd-dark font-body">
              <Send className="w-4 h-4 mr-2" />
              Kirim Notifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}