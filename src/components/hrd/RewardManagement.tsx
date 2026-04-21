import React, { useState, useEffect } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Hooks
import { useRewards, useEmployees, useRewardTypes } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { RewardRecord } from '@/lib/supabase';

// Types
type RewardType = string;
type RewardStatus = 'active' | 'claimed' | 'expired';

interface RewardFormData {
  employee_id: string;
  types: string[];
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

const iconOptions = [
  { name: 'Award', icon: Award },
  { name: 'Star', icon: Star },
  { name: 'Trophy', icon: Trophy },
  { name: 'Medal', icon: Medal },
  { name: 'Crown', icon: Crown },
  { name: 'Target', icon: Target },
  { name: 'Gift', icon: Gift },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function NativeSelect({
  value,
  onChange,
  className = '',
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </select>
  );
}

function InlineModal({
  title,
  description,
  onClose,
  maxWidth = 'max-w-md',
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 space-y-1">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="font-body text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function InlineCheckbox({
  checked,
  disabled = false,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-hrd accent-[#0D7377]"
    />
  );
}

export function RewardManagement() {
  const { rewards, loading, error, addReward, claimReward, updateReward, deleteReward } = useRewards();
  const { employees } = useEmployees();
  const { rewardTypes } = useRewardTypes();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | RewardStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardRecord | null>(null);

  const [formData, setFormData] = useState<RewardFormData>({
    employee_id: '',
    types: [],
    title: '',
    description: '',
    points: '100',
    awarded_date: new Date().toLocaleDateString('en-CA')
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);

  // Dynamic mappings
  const dynamicRewardTypeLabels = React.useMemo(() => {
    const labels: Record<string, string> = { ...rewardTypeLabels };
    rewardTypes.forEach(t => {
      labels[t.code] = t.name;
    });
    return labels;
  }, [rewardTypes]);

  const dynamicRewardTypeIcons = React.useMemo(() => {
    const icons: Record<string, React.ElementType> = { ...rewardTypeIcons };
    rewardTypes.forEach(t => {
      if (!icons[t.code]) {
        icons[t.code] = iconOptions.find(io => io.name === t.icon_name)?.icon || Award;
      }
    });
    return icons;
  }, [rewardTypes]);

  // Filter rewards based on active tab and search
  const filteredRewards = rewards.filter(reward => {
    const matchesTab = activeTab === 'all' || reward.status === activeTab;
    const employee = employees.find(emp => emp.id === reward.employee_id);
    const employeeName = employee?.name || '';
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dynamicRewardTypeLabels[reward.type] || reward.type).toLowerCase().includes(searchQuery.toLowerCase());

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
      types: [],
      title: '',
      description: '',
      points: '100',
      awarded_date: new Date().toLocaleDateString('en-CA')
    });
    setIsEditing(false);
    setEditId(null);
  };

  // Handle add reward
  const handleAddReward = async () => {
    try {
      if (!formData.employee_id || formData.types.length === 0 || !formData.description) {
        toast({
          title: 'Error',
          description: 'Mohon lengkapi semua field yang wajib diisi',
          variant: 'destructive'
        });
        return;
      }

      const pointsValue = parseInt(formData.points) || 0;
      const selectedEmployee = employees.find(e => e.id === formData.employee_id);

      if (isEditing && editId) {
        const typeCode = formData.types[0];
        const typeData = rewardTypes.find(t => t.code === typeCode);
        let points = pointsValue;

        if (typeData?.monetary_percentage && selectedEmployee?.salary) {
          points = Math.round((selectedEmployee.salary * typeData.monetary_percentage) / 100);
        }

        await updateReward(editId, {
          employee_id: formData.employee_id,
          type: typeCode,
          title: formData.title,
          description: formData.description,
          points,
          awarded_date: formData.awarded_date
        });

        toast({
          title: 'Berhasil',
          description: 'Penghargaan berhasil diperbarui'
        });
      } else {
        for (const typeCode of formData.types) {
          const typeData = rewardTypes.find(t => t.code === typeCode);
          let points = typeData ? typeData.default_points : pointsValue;

          // If monetary_percentage is set, calculate based on salary
          if (typeData?.monetary_percentage && selectedEmployee?.salary) {
            points = Math.round((selectedEmployee.salary * typeData.monetary_percentage) / 100);
          }

          const newReward = {
            employee_id: formData.employee_id,
            type: typeCode,
            title: formData.title || (typeData?.name || 'Penghargaan'),
            description: formData.description,
            points,
            status: 'active' as const,
            awarded_date: formData.awarded_date,
            claimed_date: null
          };

          await addReward(newReward);
        }

        toast({
          title: 'Berhasil',
          description: `${formData.types.length} penghargaan berhasil diberikan`
        });
      }

      setShowAddDialog(false);
      resetForm();
    } catch (err: any) {
      console.error('❌ Failed to save reward:', err);
      toast({
        title: 'Error',
        description: err.message || 'Gagal menyimpan penghargaan',
        variant: 'destructive'
      });
    }
  };

  // Handle edit reward
  const handleEditReward = (reward: RewardRecord) => {
    setFormData({
      employee_id: reward.employee_id,
      types: [reward.type],
      title: reward.title,
      description: reward.description,
      points: reward.points.toString(),
      awarded_date: reward.awarded_date
    });
    setEditId(reward.id);
    setIsEditing(true);
    setShowAddDialog(true);
  };

  // Handle delete reward
  const handleDeleteReward = async () => {
    if (!rewardToDelete) return;
    try {
      await deleteReward(rewardToDelete);
      toast({
        title: 'Berhasil',
        description: 'Penghargaan berhasil dihapus'
      });
      setShowDeleteDialog(false);
      setRewardToDelete(null);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Gagal menghapus penghargaan',
        variant: 'destructive'
      });
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
  // Auto-fill title based on types
  useEffect(() => {
    if (formData.types.length === 1) {
      const typeCode = formData.types[0];
      const label = dynamicRewardTypeLabels[typeCode] || typeCode;
      if (label && !formData.title) {
        setFormData(prev => ({
          ...prev,
          title: label
        }));
      }
    } else if (formData.types.length > 1) {
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: 'Multiple Rewards'
        }));
      }
    }
  }, [formData.types, dynamicRewardTypeLabels]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-[#1C1C1E]"><span>Loyalty & Rewards</span></h2>
          <p className="text-muted-foreground font-body"><span>Penghargaan dan apresiasi untuk prestasi karyawan</span></p>
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
        <div>
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
        </div>

        <div>
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
        </div>

        <div>
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
        </div>

        <div>
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
        </div>
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

      <div className="flex flex-wrap gap-2 rounded-lg bg-gray-100/50 p-1">
        {[
          { value: 'all', label: 'Semua' },
          { value: 'active', label: 'Aktif' },
          { value: 'claimed', label: 'Klaim' },
          { value: 'expired', label: 'Kedaluwarsa' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value as typeof activeTab)}
            className={`rounded-md px-4 py-2 text-sm ${
              activeTab === tab.value
                ? 'bg-white shadow-sm text-[#1C1C1E]'
                : 'text-muted-foreground hover:bg-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body"><span>Karyawan</span></TableHead>
                    <TableHead className="font-body"><span>Reward</span></TableHead>
                    <TableHead className="font-body"><span>Jenis</span></TableHead>
                    <TableHead className="font-body"><span>Poin</span></TableHead>
                    <TableHead className="font-body"><span>Tanggal</span></TableHead>
                    <TableHead className="font-body"><span>Status</span></TableHead>
                    {user?.role !== 'staff' && (
                      <TableHead className="font-body text-right"><span>Aksi</span></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRewards.map((reward) => {
                      const employee = employees.find(emp => emp.id === reward.employee_id);
                      const StatusIcon = statusIcons[reward.status as RewardStatus];
                      const TypeIcon = dynamicRewardTypeIcons[reward.type] || Award;

                      return (
                        <TableRow key={reward.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-hrd/20 text-hrd font-body text-xs">
                                  {employee?.name?.split(' ')?.map(n => n[0])?.join('') || 'N/A'}
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
                            {dynamicRewardTypeLabels[reward.type] || reward.type}
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
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-body"
                                  onClick={() => handleViewReward(reward)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Detail
                                </Button>
                                {reward.status === 'active' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-body text-blue-600 hover:text-blue-700"
                                    onClick={() => handleClaimReward(reward.id)}
                                  >
                                    <Gift className="w-4 h-4 mr-1" />
                                    Klaim
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-body"
                                  onClick={() => handleEditReward(reward)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Ubah
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-body text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setRewardToDelete(reward.id);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Hapus
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>

      {/* Add Reward Dialog */}
      {showAddDialog && (
        <InlineModal
          title={isEditing ? 'Ubah Penghargaan' : 'Beri Penghargaan'}
          description="Berikan penghargaan kepada karyawan berprestasi"
          onClose={() => {
            resetForm();
            setShowAddDialog(false);
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Karyawan <span className="text-red-500">*</span></Label>
              <NativeSelect
                value={formData.employee_id}
                onChange={(value) => setFormData({ ...formData, employee_id: value })}
                className="font-body"
              >
                <option value="">Pilih karyawan</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
              </NativeSelect>
            </div>

            <div className="space-y-3">
              <Label className="font-body">Jenis Penghargaan <span className="text-red-500">*</span></Label>
              <div className="h-[200px] w-full overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                <div className="space-y-4">
                  {isEditing ? (
                    (() => {
                      const typeCode = formData.types[0];
                      const typeData = rewardTypes.find(t => t.code === typeCode);
                      const name = typeData ? typeData.name : (rewardTypeLabels[typeCode] || typeCode);
                      const IconComponent = dynamicRewardTypeIcons[typeCode] || Award;
                      return (
                        <div className="flex items-center space-x-3 p-2 rounded-lg bg-yellow-50/50 border border-yellow-100">
                          <InlineCheckbox checked={true} disabled />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="bg-yellow-100 p-1.5 rounded-md">
                              <IconComponent className="w-4 h-4 text-yellow-600" />
                            </div>
                            <span className="text-sm font-body font-semibold text-yellow-900">{name}</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    (rewardTypes.length > 0 ? rewardTypes : Object.entries(rewardTypeLabels).map(([code, name]) => ({ code, name }))).map((item: any) => {
                      const code = item.code || item.id;
                      const name = item.name;
                      const IconComponent = dynamicRewardTypeIcons[code] || Award;
                      const isSelected = formData.types.includes(code);

                      return (
                        <div
                          key={code}
                          className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-yellow-50/50' : 'hover:bg-gray-100/50'}`}
                          onClick={() => {
                            const newTypes = isSelected
                              ? formData.types.filter(t => t !== code)
                              : [...formData.types, code];
                            setFormData(prev => ({ ...prev, types: newTypes }));
                          }}
                        >
                          <InlineCheckbox checked={isSelected} />
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-1.5 rounded-md ${isSelected ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                              <IconComponent className={`w-4 h-4 ${isSelected ? 'text-yellow-600' : 'text-gray-500'}`} />
                            </div>
                            <span className={`text-sm font-body ${isSelected ? 'font-semibold text-yellow-900' : 'text-gray-700'}`}>
                              {name}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Judul Penghargaan <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Masukkan judul penghargaan"
                className="font-body"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
            {formData.types.length > 0 && formData.description && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    {(() => {
                      const firstTypeCode = formData.types[0];
                      const IconComponent = dynamicRewardTypeIcons[firstTypeCode] || Award;
                      return <IconComponent className="w-5 h-5 text-yellow-600" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium font-body text-yellow-800">
                      {formData.types.length > 1 ? `Batch: ${formData.types.length} Rewards` : (formData.title || dynamicRewardTypeLabels[formData.types[0]])}
                    </p>
                    <p className="text-sm text-yellow-700 font-body truncate">{formData.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs font-mono text-yellow-800">
                        {formData.types.length > 1
                          ? 'Multiple points'
                          : (() => {
                            const typeCode = formData.types[0];
                            const typeData = rewardTypes.find(t => t.code === typeCode);
                            const selectedEmployee = employees.find(e => e.id === formData.employee_id);

                            if (typeData?.monetary_percentage && selectedEmployee?.salary) {
                              const calculated = Math.round((selectedEmployee.salary * typeData.monetary_percentage) / 100);
                              return `Rp ${calculated.toLocaleString()} (${typeData.monetary_percentage}%)`;
                            }
                            return `${formData.points} poin`;
                          })()
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} className="font-body">
              Batal
            </Button>
            <Button onClick={handleAddReward} className="bg-hrd hover:bg-hrd-dark font-body">
              <Award className="w-4 h-4 mr-2" />
              {isEditing ? 'Simpan Perubahan' : 'Berikan Penghargaan'}
            </Button>
          </div>
        </InlineModal>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <InlineModal
          title="Hapus Penghargaan"
          description="Apakah Anda yakin ingin menghapus penghargaan ini? Tindakan ini tidak dapat dibatalkan."
          onClose={() => setShowDeleteDialog(false)}
          maxWidth="max-w-[400px]"
        >
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setRewardToDelete(null);
              }}
              className="font-body"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReward}
              className="font-body"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </Button>
          </div>
        </InlineModal>
      )}

      {/* View Reward Details Dialog */}
      {showViewDialog && (
        <InlineModal
          title="Detail Penghargaan"
          description="Informasi lengkap penghargaan karyawan"
          onClose={() => setShowViewDialog(false)}
          maxWidth="max-w-lg"
        >
          {selectedReward && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge className={`${statusColors[selectedReward.status as RewardStatus]} font-body px-4 py-2`}>
                  {React.createElement(statusIcons[selectedReward.status as RewardStatus] || AlertCircle, { className: "w-4 h-4 mr-2" })}
                  {statusLabels[selectedReward.status as RewardStatus] || selectedReward.status}
                </Badge>
              </div>

              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-hrd/20 text-hrd font-body">
                    {employees.find(emp => emp.id === selectedReward.employee_id)?.name?.split(' ')?.map(n => n[0])?.join('') || 'N/A'}
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
                    {React.createElement(dynamicRewardTypeIcons[selectedReward.type] || Award, { className: "w-6 h-6 text-yellow-600" })}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-yellow-800">{selectedReward.title}</h4>
                    <p className="text-sm text-yellow-700 font-body">{dynamicRewardTypeLabels[selectedReward.type] || selectedReward.type}</p>
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
          <div className="flex flex-wrap justify-end gap-2">
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
          </div>
        </InlineModal>
      )}
    </div>
  );
}
