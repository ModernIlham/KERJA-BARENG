import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight, Filter, Archive, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

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

  if (loading) return <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div> Memuat Dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Gagal memuat data.</div>;

  const { aset_stats, persediaan_stats, recent_activity } = data;

  return (
    <div className="space-y-8">
      {/* Section: Aset Tetap */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Package className="text-slate-500" /> Aset Tetap
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Aset Tetap</CardTitle>
                <Package className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">{aset_stats.total_items}</div>
                <p className="text-xs text-slate-500">Unit barang tercatat</p>
            </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Nilai Aset Tetap</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(aset_stats.total_value)}</div>
                <p className="text-xs text-slate-500">Total nilai perolehan</p>
            </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Kondisi Kritis</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">{aset_stats.critical_stock}</div>
                <p className="text-xs text-slate-500">Stok habis / perlu perhatian</p>
            </CardContent>
            </Card>
        </div>
      </div>

      {/* Section: Persediaan (Inventory) */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Archive className="text-slate-500" /> Aset Lancar (Persediaan)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Item</CardTitle>
                <Archive className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">{persediaan_stats.total_items}</div>
                <p className="text-xs text-slate-500">Jenis barang persediaan</p>
            </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Nilai Persediaan</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(persediaan_stats.total_value)}</div>
                <p className="text-xs text-slate-500">Total aset lancar saat ini</p>
            </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Stok Menipis</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-amber-600">{persediaan_stats.low_stock}</div>
                <p className="text-xs text-slate-500">&le; Batas Kritis</p>
            </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Expired</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">{persediaan_stats.expired}</div>
                <p className="text-xs text-slate-500">Barang kadaluarsa</p>
            </CardContent>
            </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
                <span>Rekapitulasi Pengeluaran per Unit</span>
                <Filter size={16} className="text-slate-400"/>
            </CardTitle>
            
            {/* Filter Controls */}
            <div className="grid grid-cols-3 gap-2 mt-2">
                <select 
                    className="text-xs border rounded p-1 bg-slate-50"
                    value={filters.eselon1} 
                    onChange={e => setFilters({...filters, eselon1: e.target.value, eselon2: '', eselon3: ''})}
                >
                    <option value="">Semua Eselon I</option>
                    {filterOptions.eselon1.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select 
                    className="text-xs border rounded p-1 bg-slate-50"
                    value={filters.eselon2} 
                    onChange={e => setFilters({...filters, eselon2: e.target.value, eselon3: ''})}
                    disabled={!filters.eselon1}
                >
                    <option value="">Semua Eselon II</option>
                    {filterOptions.eselon2.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select 
                    className="text-xs border rounded p-1 bg-slate-50"
                    value={filters.eselon3} 
                    onChange={e => setFilters({...filters, eselon3: e.target.value})}
                    disabled={!filters.eselon2}
                >
                    <option value="">Semua Eselon III</option>
                    {filterOptions.eselon3.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
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
                     Tidak ada data pengeluaran untuk filter ini.
                 </div>
             )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Aktivitas Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_activity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Belum ada aktivitas.</p>
              ) : (
                recent_activity.map((tx) => {
                    const isMasuk = tx.jenis === 'MASUK' || tx.jenis === 'in';
                    const isKeluar = tx.jenis === 'KELUAR' || tx.jenis === 'out';
                    const isAdjustment = tx.jenis === 'opname';
                    
                    let bgClass = 'bg-blue-100 text-blue-700';
                    let icon = <ArrowUpRight size={16} />;
                    let prefix = '';
                    
                    if (isMasuk) {
                        bgClass = 'bg-green-100 text-green-700';
                        icon = <ArrowDownRight size={16} />;
                        prefix = '+';
                    } else if (isKeluar) {
                        bgClass = 'bg-amber-100 text-amber-700';
                        icon = <ArrowUpRight size={16} />;
                        prefix = '-';
                    } else if (isAdjustment) {
                        bgClass = 'bg-purple-100 text-purple-700';
                        icon = <RefreshCw size={16} />; // Use RefreshCw instead
                        prefix = '~';
                    }

                    return (
                        <div key={tx._id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${bgClass}`}>
                                {icon}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">{tx.nama_barang}</p>
                                <p className="text-xs text-slate-500 flex gap-1">
                                    <span>{new Date(tx.timestamp).toLocaleDateString('id-ID')}</span>
                                    <span>&bull;</span>
                                    <span>{tx.keterangan || (isMasuk ? 'Stok Masuk' : 'Stok Keluar')}</span>
                                </p>
                            </div>
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                            {prefix}{tx.jumlah}
                            </div>
                        </div>
                    );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple icon for adjustment
function RefreshCw({size, className}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
    )
}
