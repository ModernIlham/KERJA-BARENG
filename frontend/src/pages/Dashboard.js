import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight, Filter, Archive, Clock, Users, Briefcase, Activity } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { PageContainer, PageHeader, SectionHeader } from '../components/ui/page-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filters, setFilters] = useState({ eselon1: '', eselon2: '', eselon3: '' });
  const [filterOptions, setFilterOptions] = useState({ eselon1: [], eselon2: [], eselon3: [] });
  const [rekapChartData, setRekapChartData] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [res, optRes] = await Promise.all([
            api.get('/api/dashboard/summary'),
            api.get('/api/dashboard/filter-options')
        ]);
        setData(res.data);
        setFilterOptions(optRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
        // Fallback mock data if API fails (for dev resilience)
        setData({
            aset_stats: { total_items: 0, total_value: 0, critical_stock: 0 },
            persediaan_stats: { total_items: 0, total_value: 0, low_stock: 0, expired: 0 },
            recent_activity: []
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch Rekap Chart when filters change
  useEffect(() => {
      const fetchRekap = async () => {
          try {
              const res = await api.get('/api/dashboard/rekap-pengeluaran', { params: filters });
              setRekapChartData(res.data);
          } catch (error) {
              console.error("Failed fetch rekap chart", error);
          }
      };
      fetchRekap();
  }, [filters]);

  if (loading) return <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 h-screen"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div> Memuat Dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Gagal memuat data.</div>;

  const { aset_stats, persediaan_stats, recent_activity } = data;

  // Mock HR Stats (Integration Placeholder)
  const hrStats = {
      total_employees: 142,
      present_today: 128,
      on_leave: 14,
      overtime_hours: 420
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Executive Dashboard" 
        description="Pusat kontrol dan monitoring aset, persediaan, dan kepegawaian."
      />

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
            title="Total Aset Tetap" 
            value={formatCurrency(aset_stats.total_value)} 
            subtext={`${aset_stats.total_items} Unit Barang`}
            icon={Package}
            color="text-blue-600"
            bg="bg-blue-50"
        />
        <SummaryCard 
            title="Nilai Persediaan" 
            value={formatCurrency(persediaan_stats.total_value)} 
            subtext={`${persediaan_stats.total_items} Jenis Item`}
            icon={Archive}
            color="text-emerald-600"
            bg="bg-emerald-50"
        />
        <SummaryCard 
            title="Total Pegawai" 
            value={hrStats.total_employees} 
            subtext={`${hrStats.present_today} Hadir Hari Ini`}
            icon={Users}
            color="text-violet-600"
            bg="bg-violet-50"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex justify-between items-center">
             <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="aset">Detail Aset</TabsTrigger>
                <TabsTrigger value="hr">Kepegawaian</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Alerts & Critical Info */}
                <div className="space-y-6 lg:col-span-2">
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <AlertCard title="Stok Kritis" value={persediaan_stats.low_stock} label="Item Perlu Restock" color="text-amber-600" bg="bg-amber-50" />
                        <AlertCard title="Barang Expired" value={persediaan_stats.expired} label="Segera Musnahkan" color="text-red-600" bg="bg-red-50" />
                        <AlertCard title="Aset Rusak" value={aset_stats.critical_stock} label="Perlu Perbaikan" color="text-orange-600" bg="bg-orange-50" />
                     </div>

                     <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                <span>Analisis Pengeluaran per Unit</span>
                                <Filter size={16} className="text-slate-400"/>
                            </CardTitle>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                <FilterSelect value={filters.eselon1} onChange={v => setFilters({...filters, eselon1: v, eselon2: '', eselon3: ''})} options={filterOptions.eselon1} placeholder="Eselon I" />
                                <FilterSelect value={filters.eselon2} onChange={v => setFilters({...filters, eselon2: v, eselon3: ''})} options={filterOptions.eselon2} placeholder="Eselon II" disabled={!filters.eselon1} />
                                <FilterSelect value={filters.eselon3} onChange={v => setFilters({...filters, eselon3: v})} options={filterOptions.eselon3} placeholder="Eselon III" disabled={!filters.eselon2} />
                            </div>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {rekapChartData && rekapChartData.labels.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rekapChartData.labels.map((label, i) => ({ name: label, value: rekapChartData.datasets[0].data[i] }))} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" fontSize={10} />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={10} tick={{fontSize: 9}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    Tidak ada data untuk filter ini.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col: Recent Activity */}
                <div className="space-y-6">
                    <Card className="h-full border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500"/> Aktivitas Terkini
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-0">
                            {recent_activity.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">Belum ada aktivitas.</p>
                            ) : (
                                recent_activity.map((tx, i) => (
                                    <ActivityItem key={tx._id || i} tx={tx} />
                                ))
                            )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="aset">
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                Detail analitik aset akan ditampilkan di sini.
            </div>
        </TabsContent>

        <TabsContent value="hr">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Lembur Bulan Ini</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{hrStats.overtime_hours} Jam</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Cuti / Izin</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{hrStats.on_leave} Orang</div></CardContent>
                </Card>
             </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// Sub-components for cleanliness
const SummaryCard = ({ title, value, subtext, icon: Icon, color, bg }) => (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-4 rounded-full ${bg} ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 truncate" title={value}>{value}</h3>
                <p className="text-xs text-slate-400 mt-1 truncate">{subtext}</p>
            </div>
        </CardContent>
    </Card>
);

const AlertCard = ({ title, value, label, color, bg }) => (
    <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{title}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`text-[10px] px-2 py-1 rounded-full ${bg} ${color} font-medium`}>
                {label}
            </div>
        </CardContent>
    </Card>
);

const FilterSelect = ({ value, onChange, options, placeholder, disabled }) => (
    <select 
        className="text-xs border border-slate-200 rounded p-1.5 bg-slate-50 text-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value} 
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
    >
        <option value="">{placeholder}</option>
        {options.map(e => <option key={e} value={e}>{e}</option>)}
    </select>
);

const ActivityItem = ({ tx }) => {
    const isMasuk = tx.jenis === 'MASUK' || tx.jenis === 'in';
    const isKeluar = tx.jenis === 'KELUAR' || tx.jenis === 'out';
    const isAdjustment = tx.jenis === 'opname';
    
    let bgClass = 'bg-blue-100 text-blue-700';
    let icon = <ArrowUpRight size={14} />;
    let prefix = '';
    
    if (isMasuk) {
        bgClass = 'bg-emerald-100 text-emerald-700';
        icon = <ArrowDownRight size={14} />;
        prefix = '+';
    } else if (isKeluar) {
        bgClass = 'bg-amber-100 text-amber-700';
        icon = <ArrowUpRight size={14} />;
        prefix = '-';
    } else if (isAdjustment) {
        bgClass = 'bg-purple-100 text-purple-700';
        icon = <RefreshCw size={14} />;
        prefix = '~';
    }

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded-md transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${bgClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{tx.nama_barang}</p>
                    <p className="text-xs text-slate-500 flex gap-1">
                        <span>{new Date(tx.timestamp).toLocaleDateString('id-ID')}</span>
                        <span>•</span>
                        <span className="capitalize text-slate-400">{tx.keterangan || (isMasuk ? 'Stok Masuk' : 'Stok Keluar')}</span>
                    </p>
                </div>
            </div>
            <div className={`text-sm font-bold ${isMasuk ? 'text-emerald-600' : isKeluar ? 'text-amber-600' : 'text-slate-600'}`}>
                {prefix}{tx.jumlah}
            </div>
        </div>
    );
};

function RefreshCw({size, className}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
    )
}
