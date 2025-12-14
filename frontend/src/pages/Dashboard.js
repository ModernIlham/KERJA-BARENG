import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
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
        setStats(res.data);
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

  if (loading) return <div className="p-8 text-center">Memuat Dashboard...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Gagal memuat data.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Aset</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.stats.total_items}</div>
            <p className="text-xs text-slate-500">Unit barang tercatat</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Nilai Aset</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.stats.total_value)}</div>
            <p className="text-xs text-slate-500">Estimasi valuasi saat ini</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Stok Kritis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.stats.critical_stock}</div>
            <p className="text-xs text-slate-500">Barang dengan stok &le; 0</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
                <span>Rekapitulasi Pengeluaran per Unit</span>
                <Filter size={16} className="text-slate-400"/>
            </CardTitle>
            
            {/* Filter Controls */}
            <div className="grid grid-cols-3 gap-2 mt-2">
                <select 
                    className="text-xs border rounded p-1"
                    value={filters.eselon1} 
                    onChange={e => setFilters({...filters, eselon1: e.target.value, eselon2: '', eselon3: ''})}
                >
                    <option value="">Semua Eselon I</option>
                    {filterOptions.eselon1.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select 
                    className="text-xs border rounded p-1"
                    value={filters.eselon2} 
                    onChange={e => setFilters({...filters, eselon2: e.target.value, eselon3: ''})}
                    disabled={!filters.eselon1}
                >
                    <option value="">Semua Eselon II</option>
                    {filterOptions.eselon2.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select 
                    className="text-xs border rounded p-1"
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
                    <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" fill="#0F172A" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                 <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                     Tidak ada data pengeluaran untuk filter ini.
                 </div>
             )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_activity.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada aktivitas.</p>
              ) : (
                stats.recent_activity.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                          tx.jenis === 'MASUK' ? 'bg-green-100 text-green-700' : 
                          tx.jenis === 'KELUAR' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                      }`}>
                        {tx.jenis === 'MASUK' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tx.nama_barang}</p>
                        <p className="text-xs text-slate-500">
                            {new Date(tx.timestamp).toLocaleDateString('id-ID')} &bull; {tx.nama_pegawai || 'Admin'}
                            {tx.unit_penerima && <span className="ml-1 text-slate-400">({tx.unit_penerima})</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {tx.jenis === 'MASUK' ? '+' : ''}{tx.jumlah}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
