import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import ModuleLayout from '@/components/layout/ModuleLayout';
import { 
  HeadphonesIcon, 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Star,
  ThumbsUp,
  ThumbsDown,
  Send,
  Phone,
  Mail,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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

const navItems = [
  { label: 'Dashboard', href: '/customer', icon: HeadphonesIcon },
  { label: 'Tiket', href: '/customer/tickets', icon: MessageSquare },
  { label: 'Pelanggan', href: '/customer/customers', icon: Users },
  { label: 'Feedback', href: '/customer/feedback', icon: Star },
  { label: 'Laporan', href: '/customer/reports', icon: BarChart3 },
];

// Mock data
const tickets = [
  { id: 'TKT-001', subject: 'Produk tidak sesuai pesanan', customer: 'Budi Santoso', email: 'budi@email.com', priority: 'high', status: 'open', createdAt: '2024-01-28 10:30', category: 'Keluhan' },
  { id: 'TKT-002', subject: 'Pertanyaan tentang garansi', customer: 'Siti Rahayu', email: 'siti@email.com', priority: 'medium', status: 'in-progress', createdAt: '2024-01-28 09:15', category: 'Informasi' },
  { id: 'TKT-003', subject: 'Request pengembalian dana', customer: 'Ahmad Wijaya', email: 'ahmad@email.com', priority: 'high', status: 'open', createdAt: '2024-01-27 16:45', category: 'Refund' },
  { id: 'TKT-004', subject: 'Pengiriman terlambat', customer: 'Dewi Lestari', email: 'dewi@email.com', priority: 'medium', status: 'resolved', createdAt: '2024-01-27 14:20', category: 'Pengiriman' },
  { id: 'TKT-005', subject: 'Cara menggunakan produk', customer: 'Rudi Hermawan', email: 'rudi@email.com', priority: 'low', status: 'resolved', createdAt: '2024-01-26 11:00', category: 'Informasi' },
];

const customers = [
  { id: 'CST-001', name: 'Budi Santoso', email: 'budi@email.com', phone: '081234567890', totalOrders: 15, totalSpent: 25000000, lastOrder: '2024-01-25', status: 'active' },
  { id: 'CST-002', name: 'Siti Rahayu', email: 'siti@email.com', phone: '081234567891', totalOrders: 8, totalSpent: 12500000, lastOrder: '2024-01-20', status: 'active' },
  { id: 'CST-003', name: 'Ahmad Wijaya', email: 'ahmad@email.com', phone: '081234567892', totalOrders: 3, totalSpent: 4500000, lastOrder: '2024-01-15', status: 'active' },
  { id: 'CST-004', name: 'Dewi Lestari', email: 'dewi@email.com', phone: '081234567893', totalOrders: 22, totalSpent: 45000000, lastOrder: '2024-01-28', status: 'vip' },
];

const feedbacks = [
  { id: 'FB-001', customer: 'Budi Santoso', rating: 5, comment: 'Pelayanan sangat memuaskan, respon cepat!', date: '2024-01-28', product: 'Laptop ASUS ROG' },
  { id: 'FB-002', customer: 'Siti Rahayu', rating: 4, comment: 'Produk bagus, pengiriman agak lama', date: '2024-01-27', product: 'Mouse Logitech' },
  { id: 'FB-003', customer: 'Ahmad Wijaya', rating: 3, comment: 'Kualitas oke, tapi kemasan kurang rapi', date: '2024-01-26', product: 'Keyboard Mechanical' },
  { id: 'FB-004', customer: 'Dewi Lestari', rating: 5, comment: 'Sangat puas! Akan order lagi', date: '2024-01-25', product: 'Monitor LG' },
];

const stats = [
  { label: 'Tiket Terbuka', value: 23, icon: MessageSquare, change: '+5' },
  { label: 'Diselesaikan Hari Ini', value: 18, icon: CheckCircle, change: '+12' },
  { label: 'Rata-rata Respon', value: '2.5 jam', icon: Clock, change: '-30m' },
  { label: 'Kepuasan Pelanggan', value: '94%', icon: Star, change: '+2%' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CustomerServiceDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Dashboard Pelayanan</h1>
          <p className="text-muted-foreground font-body">Kelola tiket dan layanan pelanggan</p>
        </div>
        <Button className="bg-customer hover:bg-customer-dark font-body">
          <Plus className="w-4 h-4 mr-2" />
          Tiket Baru
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-customer/10 flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-customer" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs text-green-600">
                    {stat.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-2xl font-bold text-[#1C1C1E]">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Tickets */}
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Tiket Terbaru</CardTitle>
          <Button variant="ghost" size="sm" className="text-customer font-body">
            Lihat Semua
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets.filter(t => t.status !== 'resolved').slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-customer/20 text-customer font-body">
                      {ticket.customer.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                      <Badge 
                        variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'default' : 'secondary'}
                        className="font-body text-xs"
                      >
                        {ticket.priority === 'high' ? 'Tinggi' : ticket.priority === 'medium' ? 'Sedang' : 'Rendah'}
                      </Badge>
                    </div>
                    <p className="font-medium font-body text-[#1C1C1E]">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground font-body">
                      {ticket.customer} • {ticket.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={ticket.status === 'open' ? 'secondary' : 'default'}
                    className="font-body"
                  >
                    {ticket.status === 'open' ? 'Terbuka' : 'Diproses'}
                  </Badge>
                  <Button size="sm" variant="outline" className="font-body">
                    Tangani
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Feedback Terbaru</CardTitle>
          <Button variant="ghost" size="sm" className="text-customer font-body">
            Lihat Semua
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbacks.slice(0, 3).map((feedback) => (
              <div key={feedback.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-customer/20 text-customer font-body text-xs">
                        {feedback.customer.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium font-body text-sm text-[#1C1C1E]">{feedback.customer}</p>
                      <p className="text-xs text-muted-foreground font-body">{feedback.product}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-body">{feedback.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TicketList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<typeof tickets[0] | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Manajemen Tiket</h1>
          <p className="text-muted-foreground font-body">Kelola semua tiket pelanggan</p>
        </div>
        <Button className="bg-customer hover:bg-customer-dark font-body">
          <Plus className="w-4 h-4 mr-2" />
          Tiket Baru
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari tiket..."
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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="font-body">
          <TabsTrigger value="all">Semua ({tickets.length})</TabsTrigger>
          <TabsTrigger value="open">Terbuka ({tickets.filter(t => t.status === 'open').length})</TabsTrigger>
          <TabsTrigger value="in-progress">Diproses</TabsTrigger>
          <TabsTrigger value="resolved">Selesai</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ticket List */}
            <div className="lg:col-span-2">
              <Card className="border-gray-200">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-body">Tiket</TableHead>
                        <TableHead className="font-body">Pelanggan</TableHead>
                        <TableHead className="font-body">Prioritas</TableHead>
                        <TableHead className="font-body">Status</TableHead>
                        <TableHead className="font-body text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow 
                          key={ticket.id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                              <p className="font-body font-medium text-sm">{ticket.subject}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-body">{ticket.customer}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'default' : 'secondary'}
                              className="font-body"
                            >
                              {ticket.priority === 'high' ? 'Tinggi' : ticket.priority === 'medium' ? 'Sedang' : 'Rendah'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={ticket.status === 'resolved' ? 'default' : 'secondary'}
                              className="font-body"
                            >
                              {ticket.status === 'open' ? 'Terbuka' : ticket.status === 'in-progress' ? 'Diproses' : 'Selesai'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="font-body">Lihat Detail</DropdownMenuItem>
                                <DropdownMenuItem className="font-body">Assign</DropdownMenuItem>
                                <DropdownMenuItem className="font-body">Tutup Tiket</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Ticket Detail */}
            <div>
              {selectedTicket ? (
                <Card className="border-gray-200 sticky top-24">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-muted-foreground">{selectedTicket.id}</span>
                      <Badge 
                        variant={selectedTicket.priority === 'high' ? 'destructive' : selectedTicket.priority === 'medium' ? 'default' : 'secondary'}
                        className="font-body"
                      >
                        {selectedTicket.priority === 'high' ? 'Tinggi' : selectedTicket.priority === 'medium' ? 'Sedang' : 'Rendah'}
                      </Badge>
                    </div>
                    <CardTitle className="font-display text-lg">{selectedTicket.subject}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-customer/20 text-customer font-body">
                          {selectedTicket.customer.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium font-body text-[#1C1C1E]">{selectedTicket.customer}</p>
                        <p className="text-sm text-muted-foreground font-body">{selectedTicket.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-body text-muted-foreground">Kategori: {selectedTicket.category}</p>
                      <p className="text-sm font-body text-muted-foreground">Dibuat: {selectedTicket.createdAt}</p>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-body font-medium mb-2">Balas Tiket</p>
                      <Textarea 
                        placeholder="Tulis balasan..."
                        className="font-body mb-2"
                      />
                      <Button className="w-full bg-customer hover:bg-customer-dark font-body">
                        <Send className="w-4 h-4 mr-2" />
                        Kirim Balasan
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 font-body">
                        <Phone className="w-4 h-4 mr-2" />
                        Telepon
                      </Button>
                      <Button variant="outline" className="flex-1 font-body">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-200">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-body">Pilih tiket untuk melihat detail</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <div className="space-y-4">
            {tickets.filter(t => t.status === 'open').map((ticket) => (
              <Card key={ticket.id} className="border-gray-200 border-l-4 border-l-customer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-customer/20 text-customer font-body">
                          {ticket.customer.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-muted-foreground">{ticket.id}</span>
                          <Badge 
                            variant={ticket.priority === 'high' ? 'destructive' : 'default'}
                            className="font-body"
                          >
                            {ticket.priority === 'high' ? 'Prioritas Tinggi' : 'Prioritas Sedang'}
                          </Badge>
                        </div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground font-body">
                          {ticket.customer} • {ticket.email}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-1">
                          {ticket.createdAt}
                        </p>
                      </div>
                    </div>
                    <Button className="bg-customer hover:bg-customer-dark font-body">
                      Tangani Sekarang
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="mt-6">
          <div className="space-y-4">
            {tickets.filter(t => t.status === 'in-progress').map((ticket) => (
              <Card key={ticket.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-customer/20 text-customer font-body">
                          {ticket.customer.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground font-body">{ticket.customer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 font-body">Sedang Diproses</Badge>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 font-body">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Selesaikan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <div className="space-y-4">
            {tickets.filter(t => t.status === 'resolved').map((ticket) => (
              <Card key={ticket.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium font-body text-[#1C1C1E]">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground font-body">{ticket.customer} • {ticket.createdAt}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 font-body">Selesai</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerList() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1C1C1E]">Data Pelanggan</h1>
          <p className="text-muted-foreground font-body">Kelola informasi pelanggan</p>
        </div>
        <Button className="bg-customer hover:bg-customer-dark font-body">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pelanggan
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari pelanggan..."
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

      {/* Customer Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body">Pelanggan</TableHead>
                <TableHead className="font-body">Kontak</TableHead>
                <TableHead className="font-body">Total Pesanan</TableHead>
                <TableHead className="font-body">Total Belanja</TableHead>
                <TableHead className="font-body">Status</TableHead>
                <TableHead className="font-body text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-customer/20 text-customer font-body text-xs">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium font-body">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-body">{customer.email}</p>
                      <p className="text-muted-foreground font-mono">{customer.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{customer.totalOrders}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(customer.totalSpent)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={customer.status === 'vip' ? 'default' : 'secondary'}
                      className={`font-body ${customer.status === 'vip' ? 'bg-yellow-100 text-yellow-700' : ''}`}
                    >
                      {customer.status === 'vip' ? 'VIP' : 'Aktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="font-body">Lihat Detail</DropdownMenuItem>
                        <DropdownMenuItem className="font-body">Riwayat Pesanan</DropdownMenuItem>
                        <DropdownMenuItem className="font-body">Hubungi</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 bg-customer/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HeadphonesIcon className="w-8 h-8 text-customer" />
        </div>
        <h2 className="font-display text-xl font-bold text-[#1C1C1E] mb-2">{title}</h2>
        <p className="text-muted-foreground font-body">Halaman ini sedang dalam pengembangan</p>
      </div>
    </div>
  );
}

export default function CustomerServiceModule() {
  return (
    <ModuleLayout moduleId="customer" title="Pelayanan Konsumen" navItems={navItems}>
      <Routes>
        <Route index element={<CustomerServiceDashboard />} />
        <Route path="tickets" element={<TicketList />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="feedback" element={<PlaceholderPage title="Feedback Pelanggan" />} />
        <Route path="reports" element={<PlaceholderPage title="Laporan Pelayanan" />} />
      </Routes>
    </ModuleLayout>
  );
}
