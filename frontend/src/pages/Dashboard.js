import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/dashboard/summary');
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
            <p className="text-xs text-slate-500">Barang dengan stok &le; 5</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tren Pengeluaran Barang (6 Bulan Terakhir)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expenditure_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="_id" 
                  tickFormatter={(val) => `${val.month}/${val.year}`} 
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value) => [value, 'Barang Keluar']}
                  labelFormatter={(label) => `${label.month}/${label.year}`}
                />
                <Bar dataKey="total_keluar" fill="#0F172A" radius={[4, 4, 0, 0]} />
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
              {stats.recent_activity.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada aktivitas.</p>
              ) : (
                stats.recent_activity.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.jenis === 'MASUK' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {tx.jenis === 'MASUK' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tx.nama_barang}</p>
                        <p className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleDateString('id-ID')} &bull; {tx.nama_pegawai || 'Admin'}</p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {tx.jenis === 'MASUK' ? '+' : '-'}{tx.jumlah}
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
