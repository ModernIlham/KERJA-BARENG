import React, { useState, useEffect } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, CheckCircle2, FileText, Calendar } from 'lucide-react';
import api from '../../../api/axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ActivityFeed = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const res = await api.get('/api/kepegawaian/activities?limit=100');
            setActivities(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Group by Date
    const grouped = activities.reduce((acc, curr) => {
        const date = format(new Date(curr.timestamp), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(curr);
        return acc;
    }, {});

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600"/> Riwayat Aktivitas & Laporan Kerja
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Memuat riwayat...</div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">Belum ada aktivitas tercatat.</div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(grouped).map(([date, items]) => (
                                <div key={date} className="relative border-l border-slate-200 ml-3 pl-6 pb-2">
                                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 bg-slate-100 inline-block px-3 py-1 rounded-full">
                                        {format(new Date(date), 'EEEE, d MMMM yyyy', {locale: id})}
                                    </h3>
                                    <div className="space-y-4">
                                        {items.map(act => (
                                            <div key={act.id} className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 p-1.5 rounded-full ${
                                                            act.action.includes('CREATE') ? 'bg-green-100 text-green-600' :
                                                            act.action.includes('UPDATE') ? 'bg-blue-100 text-blue-600' :
                                                            act.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {act.action.includes('CREATE') ? <CheckCircle2 size={16}/> : 
                                                             act.action.includes('CLOCK') ? <Clock size={16}/> :
                                                             <FileText size={16}/>}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {act.details || `${act.action} on ${act.module}`}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                Modul: {act.module}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400">
                                                        {format(new Date(act.timestamp), 'HH:mm')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

const ManajemenTugas = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Manajemen Tugas & Kinerja</h1>
                <p className="text-slate-500 text-sm">Monitor tugas tim dan laporan aktivitas harian.</p>
            </div>
            
            <Tabs defaultValue="kanban" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
                    <TabsTrigger value="resume">Laporan Aktivitas</TabsTrigger>
                </TabsList>
                <TabsContent value="kanban" className="mt-4">
                    <KanbanBoard />
                </TabsContent>
                <TabsContent value="resume" className="mt-4">
                    <ActivityFeed />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ManajemenTugas;
