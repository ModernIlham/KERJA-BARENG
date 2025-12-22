import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    ArrowLeft, User, Activity, Calendar, BarChart3, 
    Loader2, Clock, Package, FileText, TrendingUp
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

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

export default function UserActivityReport() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        if (userId) {
            fetchReport();
        }
    }, [userId, days]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/activity/user/${userId}`, { params: { days } });
            setReport(res.data);
        } catch (e) {
            console.error('Failed to fetch user report:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
                <span className="text-slate-600 text-lg">Memuat laporan...</span>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="text-center p-16">
                <p className="text-slate-500">Data tidak ditemukan</p>
                <Button variant="outline" onClick={() => navigate('/aktivitas')} className="mt-4">
                    <ArrowLeft size={16} className="mr-2" /> Kembali
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/aktivitas')}>
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <User className="text-blue-600" /> Laporan Aktivitas Pengguna
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {report.user?.full_name || 'Unknown User'}
                    </p>
                </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
                {[7, 14, 30, 60, 90].map(d => (
                    <Button 
                        key={d}
                        variant={days === d ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDays(d)}
                    >
                        {d} Hari
                    </Button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-600 font-medium">Total Aktivitas</p>
                                <p className="text-2xl font-bold text-blue-700">{report.total_activities}</p>
                                <p className="text-[10px] text-slate-500">{days} hari terakhir</p>
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
                                <p className="text-xs text-green-600 font-medium">Modul Diakses</p>
                                <p className="text-2xl font-bold text-green-700">{report.by_module?.length || 0}</p>
                                <p className="text-[10px] text-slate-500">modul berbeda</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-xl">
                                <Package className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-purple-600 font-medium">Tipe Aksi</p>
                                <p className="text-2xl font-bold text-purple-700">{report.by_action?.length || 0}</p>
                                <p className="text-[10px] text-slate-500">jenis aksi</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <FileText className="h-6 w-6 text-purple-600" />
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
                                    {Math.round(report.total_activities / days) || 0}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Module */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package size={18} className="text-green-600" /> Aktivitas per Modul
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {report.by_module?.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">Tidak ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {report.by_module?.map((item) => (
                                    <div key={item.module} className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">{item.module}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ 
                                                        width: `${Math.min(100, (item.count / report.total_activities) * 100)}%` 
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-green-600 w-8 text-right">
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
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity size={18} className="text-blue-600" /> Aktivitas per Tipe
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {report.by_action?.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">Tidak ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {report.by_action?.map((item) => (
                                    <div key={item.action} className="flex items-center justify-between">
                                        <Badge className={getActionColor(item.action)}>{item.action}</Badge>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ 
                                                        width: `${Math.min(100, (item.count / report.total_activities) * 100)}%` 
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-blue-600 w-8 text-right">
                                                {item.count}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activities */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock size={18} className="text-slate-600" /> Aktivitas Terbaru
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-80">
                        <div className="space-y-3">
                            {report.recent_activities?.map((log, idx) => (
                                <div 
                                    key={log.id || idx} 
                                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="text-slate-400 text-xs whitespace-nowrap mt-1">
                                        {format(parseISO(log.timestamp), 'dd MMM HH:mm', { locale: id })}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={`${getActionColor(log.action)} text-xs`}>
                                                {log.action}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {log.module}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-600">{log.details || '-'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
