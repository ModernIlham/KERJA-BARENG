import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, RefreshCw, FileText, Eye, Printer, Filter, 
  ArrowDownToLine, ArrowUpFromLine, RefreshCcw, Construction,
  ChevronLeft, ChevronRight, Loader2, PenTool
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import TransactionReportA4 from './TransactionReportA4';
import TransaksiDokumenManager from './TransaksiDokumenManager';

const TRANSACTION_TYPES = [
  { value: 'all', label: 'Semua Jenis' },
  { value: 'MASUK', label: 'Barang Masuk', icon: ArrowDownToLine, color: 'text-green-600' },
  { value: 'KELUAR', label: 'Barang Keluar', icon: ArrowUpFromLine, color: 'text-red-600' },
  { value: 'DISTRIBUSI', label: 'Distribusi', icon: ArrowUpFromLine, color: 'text-orange-600' },
  { value: 'TRANSFER_MASUK', label: 'Transfer Masuk', icon: ArrowDownToLine, color: 'text-blue-600' },
  { value: 'REKLASIFIKASI_KELUAR', label: 'Reklasifikasi Keluar', icon: RefreshCcw, color: 'text-purple-600' },
  { value: 'REKLASIFIKASI_MASUK', label: 'Reklasifikasi Masuk', icon: RefreshCcw, color: 'text-cyan-600' },
  { value: 'PERUBAHAN_KUANTITAS', label: 'Perubahan Kuantitas', icon: RefreshCw, color: 'text-amber-600' },
  { value: 'PERUBAHAN_KONDISI', label: 'Perubahan Kondisi', icon: RefreshCw, color: 'text-amber-600' },
  { value: 'KOREKSI_NILAI_BMN', label: 'Koreksi Nilai BMN', icon: RefreshCw, color: 'text-amber-600' },
  { value: 'KOREKSI_NILAI_KDP', label: 'Koreksi Nilai KDP', icon: Construction, color: 'text-slate-600' },
  { value: 'REKLASIFIKASI_KDP', label: 'Reklasifikasi KDP', icon: Construction, color: 'text-slate-600' }
];

export default function RiwayatTransaksiComprehensive() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [typeSummary, setTypeSummary] = useState({});
  
  // Filters
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Detail & Report
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(jenisFilter && jenisFilter !== 'all' && { jenis: jenisFilter }),
        ...(search && { search }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      };
      
      const res = await api.get('/api/transaksi/riwayat', { params });
      setTransactions(res.data.data || []);
      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        total_pages: res.data.total_pages
      });
      setTypeSummary(res.data.type_summary || {});
    } catch (e) {
      console.error('Error fetching:', e);
    } finally {
      setLoading(false);
    }
  }, [jenisFilter, search, startDate, endDate, pagination.limit]);

  useEffect(() => {
    fetchTransactions(1);
  }, [jenisFilter]);

  const handleSearch = () => {
    fetchTransactions(1);
  };

  const handleViewDetail = async (transaction) => {
    setLoadingDetail(true);
    setDetailDialogOpen(true);
    try {
      const res = await api.get(`/api/transaksi/detail/${transaction.id}`);
      setSelectedTransaction(res.data);
    } catch (e) {
      console.error('Error fetching detail:', e);
      setSelectedTransaction(transaction);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewReport = async (transaction) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/transaksi/detail/${transaction.id}`);
      setSelectedTransaction(res.data);
      setReportDialogOpen(true);
    } catch (e) {
      setSelectedTransaction(transaction);
      setReportDialogOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
    } catch {
      return dateStr;
    }
  };

  const getJenisBadge = (jenis) => {
    const typeConfig = {
      'MASUK': { bg: 'bg-green-100', text: 'text-green-800', label: 'Masuk' },
      'KELUAR': { bg: 'bg-red-100', text: 'text-red-800', label: 'Keluar' },
      'DISTRIBUSI': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Distribusi' },
      'TRANSFER_MASUK': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Transfer Masuk' },
      'REKLASIFIKASI_KELUAR': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reklas Keluar' },
      'REKLASIFIKASI_MASUK': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Reklas Masuk' },
      'PERUBAHAN_KUANTITAS': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Prb. Kuantitas' },
      'PERUBAHAN_KONDISI': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Prb. Kondisi' },
      'KOREKSI_NILAI_BMN': { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Koreksi BMN' },
      'KOREKSI_NILAI_KDP': { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Koreksi KDP' },
      'REKLASIFIKASI_KDP': { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Reklas KDP' }
    };
    const config = typeConfig[jenis] || { bg: 'bg-gray-100', text: 'text-gray-800', label: jenis };
    return <Badge className={`${config.bg} ${config.text} text-[10px]`}>{config.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    if (status === 'COMPLETED') {
      return <Badge className="bg-green-100 text-green-800 text-[10px]">Selesai</Badge>;
    } else if (status === 'PENDING_MASUK') {
      return <Badge className="bg-orange-100 text-orange-800 text-[10px]">Pending</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 text-[10px]">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(typeSummary).slice(0, 6).map(([type, count]) => (
          <Card key={type} className="p-3">
            <div className="text-xs text-slate-500 truncate">{type.replace(/_/g, ' ')}</div>
            <div className="text-xl font-bold">{count}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Cari nama barang, kode, No SPPA..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[200px]">
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Jenis" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" /> Cari
            </Button>
            <Button variant="outline" onClick={() => fetchTransactions(1)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[140px]">Tanggal</TableHead>
                  <TableHead className="w-[100px]">No SPPA</TableHead>
                  <TableHead>Aset</TableHead>
                  <TableHead className="w-[120px]">Jenis</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead className="w-[100px]">Petugas</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500 mt-2">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      Tidak ada data transaksi
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map(tx => (
                    <TableRow key={tx.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs">{formatDate(tx.created_at || tx.timestamp)}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.no_sppa || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{tx.nama_barang}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {tx.kode_barang} {tx.nup && `/ NUP ${tx.nup}`}
                        </div>
                      </TableCell>
                      <TableCell>{getJenisBadge(tx.jenis)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(tx.nilai_perolehan || tx.total_nilai || tx.nilai_koreksi || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{tx.petugas || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleViewDetail(tx)}
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleViewReport(tx)}
                            title="Cetak Laporan"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">
              Menampilkan {transactions.length} dari {pagination.total} transaksi
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactions(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Halaman {pagination.page} dari {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactions(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
            </div>
          ) : selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Jenis Transaksi</label>
                  <p className="font-medium">{selectedTransaction.jenis?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <p>{getStatusBadge(selectedTransaction.status)}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">No SPPA</label>
                  <p className="font-mono">{selectedTransaction.no_sppa || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Tanggal</label>
                  <p>{formatDate(selectedTransaction.tanggal_transaksi || selectedTransaction.created_at)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Data Aset</h4>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="font-medium">{selectedTransaction.nama_barang}</p>
                  <p className="text-sm text-slate-600 font-mono">
                    {selectedTransaction.kode_barang} {selectedTransaction.nup && `/ NUP ${selectedTransaction.nup}`}
                  </p>
                  <p className="text-sm mt-2">
                    Nilai: <strong>{formatCurrency(selectedTransaction.nilai_perolehan || selectedTransaction.total_nilai || 0)}</strong>
                  </p>
                </div>
              </div>

              {/* Transaction-specific details */}
              {(selectedTransaction.jenis === 'REKLASIFIKASI_KELUAR' || selectedTransaction.jenis === 'REKLASIFIKASI_MASUK') && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Detail Reklasifikasi</h4>
                  <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-red-50 to-green-50 rounded">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Golongan Lama</p>
                      <p className="font-bold text-red-600">{selectedTransaction.golongan_awal || '-'}</p>
                    </div>
                    <span className="text-2xl">→</span>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Golongan Baru</p>
                      <p className="font-bold text-green-600">{selectedTransaction.golongan_baru || '-'}</p>
                    </div>
                  </div>
                  {selectedTransaction.kode_barang_baru && (
                    <p className="text-center mt-2 text-sm">
                      Kode Baru: <span className="font-mono font-bold">{selectedTransaction.kode_barang_baru}</span>
                    </p>
                  )}
                </div>
              )}

              {selectedTransaction.keterangan && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Keterangan</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{selectedTransaction.keterangan}</p>
                </div>
              )}

              <div className="border-t pt-4 flex justify-end">
                <Button onClick={() => { setDetailDialogOpen(false); setReportDialogOpen(true); }}>
                  <Printer className="h-4 w-4 mr-2" /> Cetak Laporan A4
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report A4 Dialog */}
      <TransactionReportA4
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
}
