import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight, Filter, Archive, Clock, Users, Briefcase, Activity, Bell, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { PageContainer, PageHeader, SectionHeader } from '../components/ui/page-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifWidget, setNotifWidget] = useState(null);
  
  // Filter States
  const [filters, setFilters] = useState({ eselon1: '', eselon2: '', eselon3: '' });
  const [filterOptions, setFilterOptions] = useState({ eselon1: [], eselon2: [], eselon3: [] });
  const [rekapChartData, setRekapChartData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      console.log('[Dashboard] Starting fetch...');
      try {
        console.log('[Dashboard] Calling APIs...');
        const [res, optRes] = await Promise.all([
            api.get('/api/dashboard/summary'),
            api.get('/api/dashboard/filter-options')
        ]);
        console.log('[Dashboard] APIs returned:', res.data, optRes.data);
        
        if (isMounted) {
          setData(res.data);
          setFilterOptions(optRes.data);
        }
        
        // Fetch notification widget data
        try {
          const notifRes = await api.get('/api/notifications/dashboard-widget');
          if (isMounted) setNotifWidget(notifRes.data);
        } catch (e) {
          console.log('Notification widget not available');
        }
      } catch (error) {
        console.error("[Dashboard] Failed to fetch dashboard stats", error);
        // Fallback mock data if API fails
        if (isMounted) {
          setData({
              aset_stats: { total_items: 0, total_value: 0, critical_stock: 0 },
              persediaan_stats: { total_items: 0, total_value: 0 },
              transaksi_summary: { masuk: 0, keluar: 0, pending: 0 },
              rekap_golongan: []
          });
        }
      } finally {
        console.log('[Dashboard] Setting loading to false');
        if (isMounted) setLoading(false);
      }
    };
    
    fetchStats();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading dashboard...</div>;

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard Utama" 
        description="Ringkasan data aset, persediaan, dan kepegawaian." 
      />

      <Tabs defaultValue="aset">
          <TabsList>
              <TabsTrigger value="aset">Aset & Logistik</TabsTrigger>
              <TabsTrigger value="kepegawaian">Kepegawaian</TabsTrigger>
          </TabsList>

          <TabsContent value="aset" className="space-y-6">
              {/* Asset Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Aset Tetap</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold truncate" title={data?.aset_stats?.total_items}>
                        {data?.aset_stats?.total_items} Item
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={formatCurrency(data?.aset_stats?.total_value)}>
                      Nilai: {formatCurrency(data?.aset_stats?.total_value)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nilai Persediaan</CardTitle>
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold truncate" title={formatCurrency(data?.persediaan_stats?.total_value)}>
                        {formatCurrency(data?.persediaan_stats?.total_value)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {data?.persediaan_stats?.total_items} Barang
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{data?.aset_stats?.critical_stock || 0}</div>
                    <p className="text-xs text-muted-foreground">Perlu restock segera</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transaksi Bulan Ini</CardTitle>
                    <Activity className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.transaksi_summary?.total_month || 0}</div>
                    <div className="flex gap-2 text-xs mt-1">
                        <span className="text-green-600 flex items-center"><ArrowUpRight size={12}/> {data?.transaksi_summary?.masuk || 0} Masuk</span>
                        <span className="text-red-600 flex items-center"><ArrowDownRight size={12}/> {data?.transaksi_summary?.keluar || 0} Keluar</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notification Alert Widget */}
              {notifWidget && notifWidget.needs_attention && (
                <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                        <Bell className="h-5 w-5 text-amber-500" />
                        Peringatan Pengembalian Aset
                      </CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/notifikasi')}
                        className="text-amber-700 border-amber-300 hover:bg-amber-100"
                      >
                        Lihat Semua <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4">
                        {notifWidget.kritis_count > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-500 text-white animate-pulse">
                              {notifWidget.kritis_count} Kritis
                            </Badge>
                          </div>
                        )}
                        {notifWidget.tinggi_count > 0 && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-500 text-white">
                              {notifWidget.tinggi_count} Tinggi
                            </Badge>
                          </div>
                        )}
                        <div className="text-sm text-slate-600">
                          <span className="font-semibold">{notifWidget.total_assets_at_risk}</span> aset perlu ditindaklanjuti
                        </div>
                      </div>
                      {notifWidget.overdue_count > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {notifWidget.overdue_count} Terlambat!
                        </Badge>
                      )}
                    </div>
                    {notifWidget.urgent_alerts && notifWidget.urgent_alerts.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {notifWidget.urgent_alerts.slice(0, 2).map((alert, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded border border-amber-100">
                            <span className="text-lg">{alert.alert_icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{alert.pegawai_nama}</p>
                              <p className="text-xs text-slate-500">{alert.alert_label} - {alert.asset_count} aset</p>
                            </div>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {alert.days_remaining < 0 ? 'Terlambat' : `${alert.days_remaining} hari`}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="col-span-1">
                      <CardHeader>
                          <CardTitle>Komposisi Aset per Golongan</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.rekap_golongan}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="golongan" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60}/>
                                  <YAxis />
                                  <Tooltip formatter={(value) => formatCurrency(value)} />
                                  <Bar dataKey="nilai" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
                  
                  <Card className="col-span-1">
                      <CardHeader>
                          <CardTitle>Aktivitas Terkini</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="space-y-4">
                              {[1,2,3].map(i => (
                                  <div key={i} className="flex items-center gap-3 text-sm p-2 border-b last:border-0">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                          <Clock size={16} className="text-slate-500"/>
                                      </div>
                                      <div className="flex-1">
                                          <p className="font-medium text-slate-700">Barang Masuk #TRX-{1000+i}</p>
                                          <p className="text-xs text-slate-500">Laptop Dell Latitude 5420 (5 Unit)</p>
                                      </div>
                                      <span className="text-xs text-slate-400">2 jam lalu</span>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>

          <TabsContent value="kepegawaian">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Pegawai</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <Users className="text-blue-600"/> {data?.pegawai_stats?.total || 0}
                        </div>
                    </CardContent>
                </Card>
             </div>
             <div className="mt-8 text-center text-slate-400">
                 Modul Dashboard Kepegawaian dalam pengembangan.
             </div>
          </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
