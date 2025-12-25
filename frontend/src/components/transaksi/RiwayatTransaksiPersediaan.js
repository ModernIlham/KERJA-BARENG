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
  ArrowDownToLine, ArrowUpFromLine, Package,
  ChevronLeft, ChevronRight, Loader2, PenTool
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import TransaksiDokumenManager from './TransaksiDokumenManager';

const TRANSACTION_TYPE_LABELS = {
  'in': { label: 'Barang Masuk', color: 'bg-green-100 text-green-800' },
  'out': { label: 'Barang Keluar', color: 'bg-red-100 text-red-800' },
  'reklasifikasi_keluar': { label: 'Reklasifikasi Keluar', color: 'bg-purple-100 text-purple-800' },
  'reklasifikasi_masuk': { label: 'Reklasifikasi Masuk', color: 'bg-cyan-100 text-cyan-800' }
};

export default function RiwayatTransaksiPersediaan() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  
  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(search && { search })
      };
      
      const res = await api.get('/api/persediaan-transaksi/grouped', { params });
      let items = res.data.data || [];
      
      // Apply filter if needed
      if (jenisFilter && jenisFilter !== 'all') {
        items = items.filter(i => i.jenis === jenisFilter);
      }
      
      setTransactions(items);
      setPagination({
        page: res.data.page || page,
        limit: res.data.limit || 20,
        total: res.data.total || 0,
        total_pages: res.data.total_pages || 1
      });
    } catch (e) {
      console.error('Error fetching:', e);
    } finally {
      setLoading(false);
    }
  }, [jenisFilter, search, pagination.limit]);

  useEffect(() => {
    fetchTransactions(1);
  }, [jenisFilter]);

  const handleSearch = () => {
    fetchTransactions(1);
  };

  const handleViewDetail = async (tx) => {
    setSelectedTransaction(tx);
    setDetailDialogOpen(true);
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <Input 
                placeholder="Cari kode/nama barang..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <Select value={jenisFilter} onValueChange={setJenisFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Semua Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="in">Barang Masuk</SelectItem>
                <SelectItem value="out">Barang Keluar</SelectItem>
                <SelectItem value="reklasifikasi_keluar">Reklasifikasi Keluar</SelectItem>
                <SelectItem value="reklasifikasi_masuk">Reklasifikasi Masuk</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => fetchTransactions(1)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Riwayat Transaksi Persediaan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package className="h-12 w-12 mb-2" />
              <div className="font-medium">Tidak ada transaksi</div>
              <div className="text-sm">Belum ada riwayat transaksi persediaan</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, idx) => (
                  <TableRow key={tx._id || idx} className="hover:bg-slate-50">
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(tx.timestamp || tx.created_at)}
                    </TableCell>
                    <TableCell>{getTypeBadge(tx.jenis)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-slate-800">{tx.kode_barang}</div>
                      <div className="text-slate-600">{tx.nama_barang}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {tx.jenis === 'in' || tx.jenis === 'reklasifikasi_masuk' ? (
                        <span className="text-green-600">+{tx.jumlah}</span>
                      ) : (
                        <span className="text-red-600">-{tx.jumlah}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(tx.total_nilai || (tx.jumlah * tx.nilai_satuan) || 0)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {tx.keterangan || tx.dokumen_ref || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 px-2"
                        onClick={() => handleViewDetail(tx)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
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
                  onClick={() => fetchTransactions(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchTransactions(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Persediaan</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <Tabs defaultValue="detail" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="detail">
                  <Eye className="h-4 w-4 mr-2" /> Detail Transaksi
                </TabsTrigger>
                <TabsTrigger value="dokumen">
                  <PenTool className="h-4 w-4 mr-2" /> Dokumen & TTD
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="detail" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500">Jenis Transaksi</label>
                      <p className="font-medium">{getTypeBadge(selectedTransaction.jenis)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Tanggal</label>
                      <p>{formatDate(selectedTransaction.timestamp || selectedTransaction.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">No Dokumen</label>
                      <p className="font-mono">{selectedTransaction.dokumen_ref || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Petugas</label>
                      <p>{selectedTransaction.petugas || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Data Barang</h4>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="font-medium">{selectedTransaction.nama_barang}</p>
                      <p className="text-sm text-slate-600 font-mono">{selectedTransaction.kode_barang}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-slate-500">Jumlah:</span>{' '}
                          <strong>{selectedTransaction.jumlah} {selectedTransaction.satuan}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Nilai Satuan:</span>{' '}
                          <strong>{formatCurrency(selectedTransaction.nilai_satuan || 0)}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500">Total Nilai:</span>{' '}
                          <strong className="text-blue-600">
                            {formatCurrency(selectedTransaction.total_nilai || (selectedTransaction.jumlah * selectedTransaction.nilai_satuan) || 0)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTransaction.keterangan && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Keterangan</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{selectedTransaction.keterangan}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="dokumen" className="mt-4">
                {selectedTransaction._id ? (
                  <TransaksiDokumenManager 
                    transaksiId={selectedTransaction._id}
                    onUpdate={() => handleViewDetail(selectedTransaction)}
                  />
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Fitur dokumen tidak tersedia untuk transaksi ini</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
