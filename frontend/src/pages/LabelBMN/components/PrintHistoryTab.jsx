
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History } from 'lucide-react';
import { toast } from 'sonner';

// Re-using constant from main file or assuming it's available. 
// For better modularity, constants should be in a separate file.
const STICKER_SIZES = {
  kecil: { width: 23.8, height: 39.8, label: 'Kecil (2.38x3.98cm)', desc: 'Aksesori' },
  sedang: { width: 69.8, height: 22.1, label: 'Sedang (6.98x2.21cm)', desc: 'Standar' },
  besar: { width: 94.9, height: 32.2, label: 'Besar (9.49x3.22cm)', desc: 'Mesin Besar' }
};

function PrintHistoryTab({ api }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [dateFilter, setDateFilter] = useState('semua');
  
  useEffect(() => {
    Promise.all([
      api.get('/api/label-bmn/print-history', { params: { limit: 100 } }),
      api.get('/api/label-bmn/print-stats')
    ])
      .then(([historyRes, statsRes]) => {
        setHistory(historyRes.data.data || []);
        setStats(statsRes.data);
      })
      .catch(() => toast.error('Gagal memuat riwayat'))
      .finally(() => setLoading(false));
  }, [api]);
  
  // Filter history by date
  const filteredHistory = history.filter(log => {
    if (dateFilter === 'semua') return true;
    const logDate = new Date(log.printed_at);
    const today = new Date();
    if (dateFilter === 'hari_ini') {
      return logDate.toDateString() === today.toDateString();
    }
    if (dateFilter === 'minggu_ini') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return logDate >= weekAgo;
    }
    if (dateFilter === 'bulan_ini') {
      return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
    }
    return true;
  });
  
  if (loading) return <div className="text-center py-8">Memuat...</div>;
  
  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-gray-500">Total Aset</div>
            <div className="text-2xl font-bold">{stats.total_assets?.toLocaleString() || 0}</div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-xs text-green-600">Sudah Dicetak</div>
            <div className="text-2xl font-bold text-green-700">{stats.assets_printed?.toLocaleString() || 0}</div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="text-xs text-amber-600">Belum Dicetak</div>
            <div className="text-2xl font-bold text-amber-700">{stats.assets_not_printed?.toLocaleString() || 0}</div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-xs text-blue-600">Total Cetak</div>
            <div className="text-2xl font-bold text-blue-700">{stats.total_prints?.toLocaleString() || 0}</div>
          </Card>
        </div>
      )}
      
      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><History className="w-5 h-5" />Riwayat Cetak Label</span>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Waktu</SelectItem>
                <SelectItem value="hari_ini">Hari Ini</SelectItem>
                <SelectItem value="minggu_ini">7 Hari Terakhir</SelectItem>
                <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Belum ada riwayat cetak</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-3">Waktu Cetak</th>
                    <th className="text-left p-3">Nama Barang</th>
                    <th className="text-left p-3">Kode</th>
                    <th className="text-center p-3">Ukuran</th>
                    <th className="text-left p-3">Dicetak Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(log => (
                    <tr key={log.id} className="border-t hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium">{new Date(log.printed_at).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-gray-500">{new Date(log.printed_at).toLocaleTimeString('id-ID')}</div>
                      </td>
                      <td className="p-3">{log.barang?.nama_barang || log.nama_barang || '-'}</td>
                      <td className="p-3">
                        <code className="text-xs bg-slate-100 px-1 rounded">
                          #{log.barang?.kode_barang || log.kode_barang || '-'}
                        </code>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant="outline"
                          className={
                            log.ukuran === 'kecil' ? 'border-purple-300 text-purple-700' :
                            log.ukuran === 'sedang' ? 'border-blue-300 text-blue-700' :
                            'border-green-300 text-green-700'
                          }
                        >
                          {STICKER_SIZES[log.ukuran]?.label || log.ukuran}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-500 text-sm max-w-[150px] truncate">
                        {typeof log.printed_by === 'object' 
                          ? (log.printed_by?.full_name || log.printed_by?.email || 'Admin')
                          : (log.printed_by || 'System')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredHistory.length > 0 && (
            <div className="text-xs text-gray-400 mt-4 text-center">
              Menampilkan {filteredHistory.length} dari {history.length} riwayat cetak
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PrintHistoryTab;
