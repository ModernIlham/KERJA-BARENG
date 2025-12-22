import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
    Activity, Search, Filter, Clock, User, FileText, Loader2, 
    ChevronLeft, ChevronRight, Calendar, BarChart3, Users, 
    Eye, Download, RefreshCw, TrendingUp, Package, Settings,
    Database, Shield, Pencil, Trash, PlusCircle, LogIn, FileDown, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

// Action Icon mapping
const getActionIcon = (action) => {
    const icons = {
        'CREATE': PlusCircle,
        'UPDATE': Pencil,
        'DELETE': Trash,
        'LOGIN': LogIn,
        'EXPORT': FileDown,
        'VIEW': Eye,
        'APPROVE': Shield,
        'REJECT': Trash,
    };
    return icons[action?.toUpperCase()] || Activity;
};

// Action color mapping
const getActionColor = (action) => {
    const colors = {
        'CREATE': 'bg-green-100 text-green-700',
        'UPDATE': 'bg-blue-100 text-blue-700',
        'DELETE': 'bg-red-100 text-red-700',
        'LOGIN': 'bg-purple-100 text-purple-700',
        'EXPORT': 'bg-orange-100 text-orange-700',
        'VIEW': 'bg-slate-100 text-slate-700',
        'APPROVE': 'bg-emerald-100 text-emerald-700',
        'REJECT': 'bg-red-100 text-red-700',
    };
    return colors[action?.toUpperCase()] || 'bg-slate-100 text-slate-700';
};

// Module color mapping
const getModuleColor = (module) => {
    const colors = {
        'Pegawai': 'border-blue-300 bg-blue-50 text-blue-700',
        'Barang': 'border-green-300 bg-green-50 text-green-700',
        'Lembur': 'border-orange-300 bg-orange-50 text-orange-700',
        'Transaksi': 'border-purple-300 bg-purple-50 text-purple-700',
        'Auth': 'border-slate-300 bg-slate-50 text-slate-700',
        'Settings': 'border-yellow-300 bg-yellow-50 text-yellow-700',
    };
    return colors[module] || 'border-slate-300 bg-slate-50 text-slate-700';
};

export default function ActivityLogPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modules, setModules] = useState([]);
    const [actions, setActions] = useState([]);
    
    // Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterDays, setFilterDays] = useState('7');
    
    // Detail dialog
    const [selectedLog, setSelectedLog] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [page, filterModule, filterAction, filterUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, usersRes, modulesRes, actionsRes] = await Promise.all([
                api.get('/api/activity/summary', { params: { days: parseInt(filterDays) } }),
                api.get('/api/activity/users', { params: { days: 30 } }),
                api.get('/api/activity/modules'),
                api.get('/api/activity/actions')
            ]);
            setSummary(summaryRes.data);
            setUsers(usersRes.data);
            setModules(modulesRes.data);
            setActions(actionsRes.data);
        } catch (e) {
            console.error('Failed to fetch activity data:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const params = { page, limit: 20 };
            if (filterModule && filterModule !== 'all') params.module = filterModule;
            if (filterAction && filterAction !== 'all') params.action = filterAction;
            if (filterUser && filterUser !== 'all') params.user_id = filterUser;
            if (search) params.search = search;
            
            const res = await api.get('/api/activity/logs', { params });
            setLogs(res.data.data);
            setTotalPages(res.data.total_pages);
        } catch (e) {
            console.error('Failed to fetch logs:', e);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchLogs();
    };

    const handleRefresh = () => {
        setPage(1);
        fetchData();
        fetchLogs();
        toast.success('Data aktivitas diperbarui');
    };

    const openDetail = (log) => {
        setSelectedLog(log);
        setDetailOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
                <span className="text-slate-600 text-lg">Memuat log aktivitas...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="text-blue-600" /> Log Aktivitas Sistem
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Pantau semua aktivitas pengguna di seluruh modul aplikasi
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw size={16} className="mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-600 font-medium">Total Aktivitas</p>
                                    <p className="text-2xl font-bold text-blue-700">{summary.total_activities}</p>
                                    <p className="text-[10px] text-slate-500">{filterDays} hari terakhir</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Activity className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-green-600 font-medium">Pengguna Aktif</p>
                                    <p className="text-2xl font-bold text-green-700">{summary.by_user?.length || 0}</p>
                                    <p className="text-[10px] text-slate-500">dengan aktivitas</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-xl">
                                    <Users className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-purple-600 font-medium">Modul Aktif</p>
                                    <p className="text-2xl font-bold text-purple-700">{summary.by_module?.length || 0}</p>
                                    <p className="text-[10px] text-slate-500">modul digunakan</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-xl">
                                    <Package className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-orange-600 font-medium">Rata-rata/Hari</p>
                                    <p className="text-2xl font-bold text-orange-700">
                                        {Math.round(summary.total_activities / parseInt(filterDays))}
                                    </p>
                                    <p className="text-[10px] text-slate-500">aktivitas</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-xl">
                                    <TrendingUp className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="logs">
                <TabsList>
                    <TabsTrigger value="logs"><FileText size={14} className="mr-2" /> Daftar Log</TabsTrigger>
                    <TabsTrigger value="users"><Users size={14} className="mr-2" /> Per Pengguna</TabsTrigger>
                    <TabsTrigger value="stats"><BarChart3 size={14} className="mr-2" /> Statistik</TabsTrigger>
                </TabsList>

                {/* LOGS TAB */}
                <TabsContent value="logs" className="mt-4">
                    {/* Filters */}
                    <Card className="mb-4 border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-xs text-slate-500 mb-1 block">Cari</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Cari aktivitas..." 
                                            className="pl-10"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                    </div>
                                </div>
                                <div className="w-40">
                                    <label className="text-xs text-slate-500 mb-1 block">Modul</label>
                                    <Select value={filterModule} onValueChange={setFilterModule}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Modul" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Modul</SelectItem>
                                            {modules.map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-40">
                                    <label className="text-xs text-slate-500 mb-1 block">Aksi</label>
                                    <Select value={filterAction} onValueChange={setFilterAction}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Aksi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Aksi</SelectItem>
                                            {actions.map(a => (
                                                <SelectItem key={a} value={a}>{a}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                                    <Filter size={16} className="mr-2" /> Filter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logs Table */}
                    <Card className="border-slate-200">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-40">Waktu</TableHead>
                                        <TableHead>Pengguna</TableHead>
                                        <TableHead className="w-28">Aksi</TableHead>
                                        <TableHead className="w-28">Modul</TableHead>
                                        <TableHead>Detail</TableHead>
                                        <TableHead className="w-20 text-center">Lihat</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                                <Activity className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                                                Belum ada log aktivitas
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => {
                                            const ActionIcon = getActionIcon(log.action);
                                            return (
                                                <TableRow key={log.id} className="hover:bg-slate-50">
                                                    <TableCell className="text-xs">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-700">
                                                                {format(parseISO(log.timestamp), 'dd MMM yyyy', { locale: id })}
                                                            </span>
                                                            <span className="text-slate-400">
                                                                {format(parseISO(log.timestamp), 'HH:mm:ss')}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                {log.user_name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <span className="font-medium text-slate-700 text-sm">{log.user_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${getActionColor(log.action)} text-xs font-medium`}>
                                                            <ActionIcon size={12} className="mr-1" />
                                                            {log.action}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`${getModuleColor(log.module)} text-xs`}>
                                                            {log.module}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                                                        {log.details || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => openDetail(log)}
                                                        >
                                                            <Eye size={16} className="text-slate-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
                                <p className="text-sm text-slate-500">
                                    Halaman {page} dari {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                {/* USERS TAB */}
                <TabsContent value="users" className="mt-4">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Aktivitas per Pengguna</CardTitle>
                            <CardDescription>Daftar pengguna berdasarkan jumlah aktivitas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {users.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                                    Belum ada data pengguna aktif
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {users.map((user, idx) => (
                                        <div 
                                            key={user.user_id} 
                                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/aktivitas/user/${user.user_id}`)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{user.user_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Terakhir aktif: {formatDistanceToNow(parseISO(user.last_activity), { addSuffix: true, locale: id })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-blue-600">{user.activity_count}</p>
                                                    <p className="text-xs text-slate-500">aktivitas</p>
                                                </div>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <ExternalLink size={16} className="text-slate-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STATS TAB */}
                <TabsContent value="stats" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* By Module */}
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package size={18} className="text-purple-600" /> Aktivitas per Modul
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {summary?.by_module?.length === 0 ? (
                                    <p className="text-slate-500 text-center py-8">Tidak ada data</p>
                                ) : (
                                    <div className="space-y-3">
                                        {summary?.by_module?.map((item) => (
                                            <div key={item.module} className="flex items-center justify-between">
                                                <Badge variant="outline" className={getModuleColor(item.module)}>
                                                    {item.module}
                                                </Badge>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-purple-500 rounded-full"
                                                            style={{ 
                                                                width: `${Math.min(100, (item.count / (summary?.total_activities || 1)) * 100)}%` 
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 w-10 text-right">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* By Action */}
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity size={18} className="text-blue-600" /> Aktivitas per Tipe Aksi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {summary?.by_action?.length === 0 ? (
                                    <p className="text-slate-500 text-center py-8">Tidak ada data</p>
                                ) : (
                                    <div className="space-y-3">
                                        {summary?.by_action?.map((item) => {
                                            const ActionIcon = getActionIcon(item.action);
                                            return (
                                                <div key={item.action} className="flex items-center justify-between">
                                                    <Badge className={`${getActionColor(item.action)} text-xs`}>
                                                        <ActionIcon size={12} className="mr-1" />
                                                        {item.action}
                                                    </Badge>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ 
                                                                    width: `${Math.min(100, (item.count / (summary?.total_activities || 1)) * 100)}%` 
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 w-10 text-right">
                                                            {item.count}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="text-blue-600" /> Detail Aktivitas
                        </DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500">Waktu</label>
                                    <p className="font-medium">
                                        {format(parseISO(selectedLog.timestamp), 'dd MMM yyyy HH:mm:ss', { locale: id })}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Pengguna</label>
                                    <p className="font-medium">{selectedLog.user_name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Aksi</label>
                                    <Badge className={getActionColor(selectedLog.action)}>
                                        {selectedLog.action}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Modul</label>
                                    <Badge variant="outline" className={getModuleColor(selectedLog.module)}>
                                        {selectedLog.module}
                                    </Badge>
                                </div>
                            </div>
                            
                            {selectedLog.details && (
                                <div>
                                    <label className="text-xs text-slate-500">Detail</label>
                                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg mt-1">
                                        {selectedLog.details}
                                    </p>
                                </div>
                            )}
                            
                            {selectedLog.target_id && (
                                <div>
                                    <label className="text-xs text-slate-500">Target ID</label>
                                    <p className="text-sm font-mono text-slate-600">{selectedLog.target_id}</p>
                                </div>
                            )}
                            
                            {selectedLog.page_url && (
                                <div>
                                    <label className="text-xs text-slate-500">Halaman</label>
                                    <p className="text-sm text-slate-600">{selectedLog.page_url}</p>
                                </div>
                            )}
                            
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <label className="text-xs text-slate-500">Metadata</label>
                                    <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg mt-1 overflow-x-auto">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
