import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Settings, LogOut, Edit } from 'lucide-react';

export function UserProfile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    avatar: user?.avatar || '',
  });

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to login page after successful logout
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if there's an error
      navigate('/', { replace: true });
    }
  };

  const handleUpdateProfile = async () => {
    const success = await updateProfile({
      name: editForm.name,
      avatar: editForm.avatar,
    });

    if (success) {
      setIsEditDialogOpen(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge className={getRoleBadgeColor(user.role)}>
                {user.role.toUpperCase()}
              </Badge>
              {user.modules.map((module) => (
                <Badge key={module} variant="outline" className="text-xs">
                  {module.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Profil</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
              <DialogDescription>
                Ubah informasi profil Anda di sini.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nama
                </Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avatar" className="text-right">
                  Avatar URL
                </Label>
                <Input
                  id="avatar"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar: e.target.value }))}
                  className="col-span-3"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleUpdateProfile}>
                Simpan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Pengaturan</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}