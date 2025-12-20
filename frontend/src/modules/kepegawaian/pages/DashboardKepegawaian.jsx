import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AbsensiWidget from '../components/AbsensiWidget';
import KanbanBoard from '../components/KanbanBoard';
import { Users, Clock, AlertCircle, TrendingUp, CalendarCheck, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import api from '../../../api/axios';

const DashboardKepegawaian = () => {
  const [stats, setStats] = useState({
      total_employees: 0,
      present_today: 0,
      on_leave: 0,
      overtime_hours: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchStats = async () => {
          try {
              const res = await api.get('/api/kepegawaian/dashboard-stats');
              setStats(res.data);
          } catch (e) {
              console.error("Failed to fetch stats", e);
          } finally {
              setLoading(false);
          }
      };
      fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Pegawai', value: stats.total_employees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Hadir Hari Ini', value: stats.present_today, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Izin / Sakit', value: stats.on_leave, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Total Jam Lembur', value: `${stats.overtime_hours} Jam`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
      );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard Kepegawaian" 
        description="Monitoring absensi, tugas tim, dan aktivitas pegawai."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
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
