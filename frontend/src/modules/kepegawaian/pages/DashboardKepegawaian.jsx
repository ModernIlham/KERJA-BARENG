import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AbsensiWidget from '../components/AbsensiWidget';
import KanbanBoard from '../components/KanbanBoard';
import { Users, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const DashboardKepegawaian = () => {
  const stats = [
    { title: 'Total Pegawai', value: '142', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Hadir Hari Ini', value: '128', icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Izin / Sakit', value: '14', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Total Jam Lembur', value: '420 Jam', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Kepegawaian</h1>
          <p className="text-muted-foreground">Selamat datang di Sistem Manajemen ASN & Non-ASN (SIMAN-G)</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
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
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Tugas Tim (Kanban)</CardTitle>
              <CardDescription>Pantau progres pekerjaan tim anda</CardDescription>
            </CardHeader>
            <CardContent>
              <KanbanBoard />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardKepegawaian;
