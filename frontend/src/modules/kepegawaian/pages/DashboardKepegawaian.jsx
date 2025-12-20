import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AbsensiWidget from '../components/AbsensiWidget';
import KanbanBoard from '../components/KanbanBoard';
import { Users, Clock, AlertCircle, TrendingUp, CalendarCheck } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';

const DashboardKepegawaian = () => {
  const stats = [
    { title: 'Total Pegawai', value: '142', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Hadir Hari Ini', value: '128', icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Izin / Sakit', value: '14', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Total Jam Lembur', value: '420 Jam', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard Kepegawaian" 
        description="Monitoring absensi, tugas tim, dan aktivitas pegawai."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-slate-200 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AbsensiWidget />
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Tugas Tim (Kanban)</CardTitle>
              <CardDescription>Pantau progres pekerjaan tim anda secara real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <KanbanBoard />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardKepegawaian;
