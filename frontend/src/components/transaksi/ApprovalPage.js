import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { 
  Search, CheckCircle2, XCircle, Clock, RefreshCw, 
  Eye, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  FileCheck, FileX, Filter, CheckSquare
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const TRANSACTION_TYPE_LABELS = {
  'PERUBAHAN_KUANTITAS': { label: 'Perubahan Kuantitas', color: 'bg-amber-100 text-amber-800' },
  'PERUBAHAN_KONDISI': { label: 'Perubahan Kondisi', color: 'bg-amber-100 text-amber-800' },
  'KOREKSI_NILAI_BMN': { label: 'Koreksi Nilai BMN', color: 'bg-blue-100 text-blue-800' },
  'KOREKSI_NILAI_KDP': { label: 'Koreksi Nilai KDP', color: 'bg-slate-100 text-slate-800' },
  'REKLASIFIKASI_MASUK': { label: 'Reklasifikasi Masuk', color: 'bg-cyan-100 text-cyan-800' },
  'REKLASIFIKASI_KELUAR': { label: 'Reklasifikasi Keluar', color: 'bg-purple-100 text-purple-800' },
  'REKLASIFIKASI_KDP': { label: 'Reklasifikasi KDP', color: 'bg-slate-100 text-slate-800' },
  'PERSEDIAAN_TO_ASET': { label: 'Persediaan → Aset', color: 'bg-green-100 text-green-800' },
  'ASET_TO_PERSEDIAAN': { label: 'Aset → Persediaan', color: 'bg-purple-100 text-purple-800' }
};

export default function ApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved_today: 0, rejected_today: 0, pending_by_type: {} });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Dialogs
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Rejection reason
  const [rejectReason, setRejectReason] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(jenisFilter && jenisFilter !== 'all' && { jenis: jenisFilter }),
        ...(search && { search })
      };
      
      const res = await api.get('/api/approval/pending', { params });
      setTransactions(res.data.data || []);
      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        total_pages: res.data.total_pages
      });
    } catch (e) {
      console.error('Error fetching:', e);
      toast.error('Gagal mengambil data transaksi');
    } finally {
      setLoading(false);
    }
  }, [jenisFilter, search, pagination.limit]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/approval/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  useEffect(() => {
    fetchPendingTransactions(1);
    fetchStats();
  }, [jenisFilter]);

  const handleSearch = () => {
    fetchPendingTransactions(1);
  };

  const handleApprove = async () => {
    if (!selectedTransaction) return;
    
    setActionLoading(true);
    try {
      await api.post(`/api/approval/${selectedTransaction.id}/approve`, {
        catatan: approveNote
      });
      toast.success('Transaksi berhasil disetujui');
      setApproveDialogOpen(false);
      setSelectedTransaction(null);
      setApproveNote('');
      fetchPendingTransactions(pagination.page);
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyetujui transaksi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransaction || !rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post(`/api/approval/${selectedTransaction.id}/reject`, {
        alasan: rejectReason
      });
      toast.success('Transaksi berhasil ditolak');
      setRejectDialogOpen(false);
      setSelectedTransaction(null);
      setRejectReason('');
      fetchPendingTransactions(pagination.page);
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menolak transaksi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error('Pilih transaksi terlebih dahulu');
      return;
    }
    
    setActionLoading(true);
    const t = toast.loading(`Menyetujui ${selectedIds.size} transaksi...`);
    
    try {
      const res = await api.post('/api/approval/bulk-approve', {
        transaction_ids: Array.from(selectedIds)
      });
      toast.success(res.data.message, { id: t });
      setSelectedIds(new Set());
      fetchPendingTransactions(pagination.page);
      fetchStats();
    } catch (e) {
      toast.error('Gagal menyetujui transaksi', { id: t });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
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

  const getTypeBadge = (jenis) => {
    const config = TRANSACTION_TYPE_LABELS[jenis] || { label: jenis, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={`${config.color} text-[10px]`}>{config.label}</Badge>;
  };

  const openApproveDialog = (tx) => {
    setSelectedTransaction(tx);
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (tx) => {
    setSelectedTransaction(tx);
    setRejectDialogOpen(true);
  };

  const openDetailDialog = (tx) => {
    setSelectedTransaction(tx);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Persetujuan Transaksi</h1>
          <p className="text-slate-500 text-sm">Kelola persetujuan transaksi BMN/Persediaan yang memerlukan validasi</p>
        </div>
        <Button variant="outline" onClick={() => { fetchPendingTransactions(1); fetchStats(); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-800">{stats.pending}</div>
                <div className="text-xs text-amber-600">Menunggu Persetujuan</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">{stats.approved_today}</div>
                <div className="text-xs text-green-600">Disetujui Hari Ini</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-800">{stats.rejected_today}</div>
                <div className="text-xs text-red-600">Ditolak Hari Ini</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending by Type */}
      {Object.keys(stats.pending_by_type || {}).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" /> Pending per Jenis Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.pending_by_type).map(([type, count]) => (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-slate-100"
                  onClick={() => setJenisFilter(type)}
                >
                  {TRANSACTION_TYPE_LABELS[type]?.label || type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base">Daftar Transaksi Pending</CardTitle>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex gap-2">
                <Input 
                  placeholder="Cari kode/nama barang..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-48"
                />
                <Button variant="secondary" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Type Filter */}
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Semua Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Bulk Approve */}
              {selectedIds.size > 0 && (
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleBulkApprove}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Setujui ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileCheck className="h-12 w-12 mb-2" />
              <div className="font-medium">Tidak ada transaksi pending</div>
              <div className="text-sm">Semua transaksi sudah diproses</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <div 
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${transactions.length > 0 && selectedIds.size === transactions.length ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}
                      onClick={selectAll}
                    >
                      {selectedIds.size === transactions.length && <CheckSquare size={10}/>}
                    </div>
                  </TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>No SPPA</TableHead>
                  <TableHead>Petugas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div 
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${selectedIds.has(tx.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}
                        onClick={() => toggleSelect(tx.id)}
                      >
                        {selectedIds.has(tx.id) && <CheckSquare size={10}/>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(tx.created_at || tx.tanggal_transaksi)}
                    </TableCell>
                    <TableCell>{getTypeBadge(tx.jenis)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-slate-800">{tx.kode_barang}</div>
                      <div className="text-slate-600">{tx.nama_barang}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{tx.no_sppa || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{tx.petugas || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2"
                          onClick={() => openDetailDialog(tx)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-7 px-2 bg-green-600 hover:bg-green-700"
                          onClick={() => openApproveDialog(tx)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="h-7 px-2"
                          onClick={() => openRejectDialog(tx)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-xs text-slate-500">
                Halaman {pagination.page} dari {pagination.total_pages} ({pagination.total} transaksi)
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchPendingTransactions(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchPendingTransactions(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Setujui Transaksi
            </DialogTitle>
            <DialogDescription>
              Transaksi ini akan disetujui dan perubahan akan diterapkan ke data master.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                <div><span className="font-medium">Jenis:</span> {TRANSACTION_TYPE_LABELS[selectedTransaction.jenis]?.label || selectedTransaction.jenis}</div>
                <div><span className="font-medium">Barang:</span> {selectedTransaction.nama_barang}</div>
                <div><span className="font-medium">No SPPA:</span> {selectedTransaction.no_sppa || '-'}</div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Catatan (opsional)</Label>
                <Textarea
                  value={approveNote}
                  onChange={e => setApproveNote(e.target.value)}
                  placeholder="Tambahkan catatan persetujuan..."
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Batal</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" /> Tolak Transaksi
            </DialogTitle>
            <DialogDescription>
              Transaksi ini akan ditolak dan perubahan tidak akan diterapkan.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                <div><span className="font-medium">Jenis:</span> {TRANSACTION_TYPE_LABELS[selectedTransaction.jenis]?.label || selectedTransaction.jenis}</div>
                <div><span className="font-medium">Barang:</span> {selectedTransaction.nama_barang}</div>
                <div><span className="font-medium">No SPPA:</span> {selectedTransaction.no_sppa || '-'}</div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Alasan Penolakan *</Label>
                <Textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan..."
                  rows={3}
                />
                <p className="text-xs text-slate-500">Alasan penolakan wajib diisi</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Detail Transaksi
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs">Jenis Transaksi</div>
                  <div>{getTypeBadge(selectedTransaction.jenis)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Tanggal</div>
                  <div>{formatDate(selectedTransaction.created_at || selectedTransaction.tanggal_transaksi)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500 text-xs">Barang</div>
                  <div className="font-medium">{selectedTransaction.kode_barang} - {selectedTransaction.nama_barang}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">No SPPA</div>
                  <div className="font-mono">{selectedTransaction.no_sppa || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Petugas</div>
                  <div>{selectedTransaction.petugas || '-'}</div>
                </div>
              </div>
              
              {/* Show pending changes */}
              {selectedTransaction.pending_changes && Object.keys(selectedTransaction.pending_changes).length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Perubahan yang Akan Diterapkan
                  </div>
                  <div className="text-xs space-y-1">
                    {Object.entries(selectedTransaction.pending_changes).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-slate-600">{key}:</span>
                        <span className="font-mono">
                          {typeof value === 'number' ? formatCurrency(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTransaction.keterangan && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">Keterangan</div>
                  <div className="text-sm p-2 bg-slate-50 rounded">{selectedTransaction.keterangan}</div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Tutup</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setDetailDialogOpen(false);
                openApproveDialog(selectedTransaction);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Setujui
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setDetailDialogOpen(false);
                openRejectDialog(selectedTransaction);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" /> Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
