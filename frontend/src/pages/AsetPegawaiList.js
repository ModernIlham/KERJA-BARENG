import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { 
  Search, Package, ArrowRightLeft, User, Clock, Filter, X, ChevronUp, 
  ChevronDown, ArrowUpDown, RotateCcw, Bell, FileText, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';
import { Badge } from '../components/ui/badge';

export default function AsetPegawaiList() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  
  // Modals
  const [isSerahTerimaOpen, setIsSerahTerimaOpen] = useState(false);
  const [isKembalikanOpen, setIsKembalikanOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // State for selected item
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  
  // Filter & Sort States
  const [filters, setFilters] = useState({
    status: '',
    kategori: '',
    kondisi: ''
  });
  const [sortBy, setSortBy] = useState('nama_aset');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pegawai list for dropdown
  const [pegawaiList, setPegawaiList] = useState([]);
  
  // Serah Terima data
  const [serahTerimaData, setSerahTerimaData] = useState({
    pemegang_baru_id: '',
    keterangan: ''
  });
  
  // Kembalikan data
  const [kembalikanData, setKembalikanData] = useState({
    kondisi_pengembalian: 'Baik',
    keterangan: '',
    gudang_id: ''
  });
  
  // Gudang list
  const [gudangList, setGudangList] = useState([]);
  
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/aset-pegawai', { 
        params: { 
          search, page: currentPage, limit, 
          sort_by: sortBy, sort_order: sortOrder, 
          ...filters 
        } 
      });
      setAssets(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      toast.error("Gagal memuat data aset");
    } finally {
      setLoading(false);
    }
  }, [search, currentPage, sortBy, sortOrder, filters]);
  
  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/aset-pegawai/statistik/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to fetch summary');
    }
  };
  
  const fetchAlerts = async () => {
    try {
      const res = await api.get('/api/aset-pegawai/alerts/pegawai-keluar');
      setAlerts(res.data.alerts || []);
    } catch (e) {
      console.error('Failed to fetch alerts');
    }
  };
  
  const fetchPegawaiList = async () => {
    try {
      const res = await api.get('/api/pegawai', { params: { limit: 1000, status: 'AKTIF' } });
      setPegawaiList(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch pegawai');
    }
  };
  
  const fetchGudangList = async () => {
    try {
      const res = await api.get('/api/gudang');
      setGudangList(res.data || []);
    } catch (e) {
      console.error('Failed to fetch gudang');
    }
  };
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAssets();
    }, 500);
    return () => clearTimeout(timeout);
  }, [fetchAssets]);
  
  useEffect(() => {
    fetchSummary();
    fetchAlerts();
    fetchPegawaiList();
    fetchGudangList();
  }, []);
  
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  const clearFilters = () => {
    setFilters({ status: '', kategori: '', kondisi: '' });
    setSearch('');
  };
  
  const openDetail = (item) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };
  
  const openSerahTerima = (item) => {
    setSelectedItem(item);
    setSerahTerimaData({ pemegang_baru_id: '', keterangan: '' });
    setIsSerahTerimaOpen(true);
  };
  
  const openKembalikan = (item) => {
    setSelectedItem(item);
    setKembalikanData({ kondisi_pengembalian: 'Baik', keterangan: '', gudang_id: '' });
    setIsKembalikanOpen(true);
  };
  
  const handleSerahTerima = async () => {
    if (!serahTerimaData.pemegang_baru_id) {
      toast.error("Pilih pemegang baru");
      return;
    }
    
    try {
      await api.post(`/api/aset-pegawai/${selectedItem.id}/serah-terima`, serahTerimaData);
      toast.success("Serah terima berhasil");
      setIsSerahTerimaOpen(false);
      fetchAssets();
      fetchAlerts();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal serah terima");
    }
  };
  
  const handleKembalikan = async () => {
    if (!kembalikanData.gudang_id) {
      toast.error("Pilih gudang tujuan");
      return;
    }
    
    try {
      // Use the new gudang return endpoint
      await api.post('/api/gudang/return-asset', {
        barang_id: selectedItem.barang_id,
        gudang_id: kembalikanData.gudang_id,
        alasan: kembalikanData.kondisi_pengembalian,
        keterangan: kembalikanData.keterangan
      });
      toast.success("Aset berhasil dikembalikan ke gudang");
      setIsKembalikanOpen(false);
      fetchAssets();
      fetchAlerts();
      fetchSummary();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengembalikan aset");
    }
  };
  
  const getStatusBadge = (status) => {
    const colors = {
      'Tersedia': 'bg-green-100 text-green-700 border-green-200',
      'Dipinjam': 'bg-blue-100 text-blue-700 border-blue-200',
      'Rusak': 'bg-red-100 text-red-700 border-red-200',
      'Hilang': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };
  
  const getKondisiBadge = (kondisi) => {
    const colors = {
      'Baik': 'bg-green-50 text-green-600',
      'Rusak Ringan': 'bg-yellow-50 text-yellow-600',
      'Rusak Berat': 'bg-red-50 text-red-600'
    };
    return colors[kondisi] || 'bg-slate-50 text-slate-600';
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Aset yang Dipegang Pegawai</h1>
          <p className="text-sm text-slate-500">
            Tracking aset yang dipegang setiap pegawai. Untuk menambah/serahkan aset, gunakan{' '}
            <a href="/barang" className="text-blue-600 underline hover:text-blue-800">Daftar Aset (BMN)</a> → Transaksi Keluar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showAlerts ? "default" : "outline"} 
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative"
          >
            <Bell className="mr-2 h-4 w-4" />
            Peringatan
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Aset</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.total_aset}</p>
                </div>
                <Package className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Tersedia</p>
                  <p className="text-2xl font-bold text-green-900">{summary.by_status?.tersedia || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Dipinjam</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.by_status?.dipinjam || 0}</p>
                </div>
                <User className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Rusak/Hilang</p>
                  <p className="text-2xl font-bold text-red-900">{(summary.by_status?.rusak || 0) + (summary.by_status?.hilang || 0)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 font-medium">Total Nilai</p>
                  <p className="text-lg font-bold text-amber-900">{formatCurrency(summary.total_nilai)}</p>
                </div>
                <span className="text-2xl">💰</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Alerts Panel */}
      {showAlerts && alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Peringatan Pengembalian Aset
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAlerts(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  alert.urgency === 'critical' ? 'bg-red-100 border-red-300' :
                  alert.urgency === 'high' ? 'bg-orange-100 border-orange-300' :
                  'bg-yellow-100 border-yellow-300'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{alert.pegawai_nama}</p>
                      <p className="text-xs text-slate-600">{alert.pegawai_nip} • {alert.pegawai_unit}</p>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <div className="flex gap-2 mt-2">
                        {alert.assets?.slice(0, 3).map((asset, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/50 rounded text-xs">
                            {asset.nama_aset}
                          </span>
                        ))}
                        {alert.assets?.length > 3 && (
                          <span className="text-xs text-slate-500">+{alert.assets.length - 3} lainnya</span>
                        )}
                      </div>
                    </div>
                    <Badge className={
                      alert.urgency === 'critical' ? 'bg-red-500' :
                      alert.urgency === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                    }>
                      {alert.asset_count} aset
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Cari nama aset, kode, merk, serial number..." 
                  className="pl-9 max-w-md"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </div>
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Filter Aset</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                    <X className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select 
                    className="h-9 border rounded px-2 text-sm bg-white"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="">Semua Status</option>
                    <option value="Tersedia">Tersedia</option>
                    <option value="Dipinjam">Dipinjam</option>
                    <option value="Rusak">Rusak</option>
                    <option value="Hilang">Hilang</option>
                  </select>
                  <select 
                    className="h-9 border rounded px-2 text-sm bg-white"
                    value={filters.kategori}
                    onChange={(e) => setFilters({...filters, kategori: e.target.value})}
                  >
                    <option value="">Semua Kategori</option>
                    <option value="Elektronik">Elektronik</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Kendaraan">Kendaraan</option>
                    <option value="Peralatan Kantor">Peralatan Kantor</option>
                    <option value="Umum">Umum</option>
                  </select>
                  <select 
                    className="h-9 border rounded px-2 text-sm bg-white"
                    value={filters.kondisi}
                    onChange={(e) => setFilters({...filters, kondisi: e.target.value})}
                  >
                    <option value="">Semua Kondisi</option>
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>
                    <button onClick={() => handleSort('nama_aset')} className="flex items-center gap-1 hover:text-blue-600">
                      Aset
                      {sortBy === 'nama_aset' ? (
                        sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </TableHead>
                  <TableHead>Kategori & Kondisi</TableHead>
                  <TableHead>Pemegang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead className="text-right w-[120px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={6} rows={10} />
                ) : assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Tidak ada data aset.
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">{item.nama_aset}</div>
                          {item.kode_aset && <div className="text-xs text-slate-500 font-mono">{item.kode_aset}</div>}
                          {item.merk && <div className="text-xs text-slate-400">{item.merk} {item.tipe}</div>}
                          {item.serial_number && <div className="text-[10px] text-slate-400">SN: {item.serial_number}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                            {item.kategori || 'Umum'}
                          </span>
                          <br />
                          <span className={`px-2 py-0.5 text-xs rounded ${getKondisiBadge(item.kondisi)}`}>
                            {item.kondisi || 'Baik'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.pemegang_nama ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800 text-sm">{item.pemegang_nama}</div>
                            {item.pemegang_nip && <div className="text-xs text-slate-500">{item.pemegang_nip}</div>}
                            {item.pemegang_unit_kerja && <div className="text-[10px] text-slate-400">{item.pemegang_unit_kerja}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{formatCurrency(item.nilai_perolehan)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(item)} title="Detail & Riwayat" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </Button>
                          {item.status === 'Dipinjam' ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openSerahTerima(item)} title="Serah Terima" className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600">
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openKembalikan(item)} title="Kembalikan ke Gudang" className="h-8 w-8 p-0 hover:bg-green-50 text-green-600">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => openSerahTerima(item)} title="Pinjamkan" className="h-8 w-8 p-0 hover:bg-purple-50 text-purple-600">
                              <User className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
      
      {/* Serah Terima Modal */}
      <Dialog open={isSerahTerimaOpen} onOpenChange={setIsSerahTerimaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Serah Terima Aset</DialogTitle>
            <DialogDescription>
              {selectedItem?.pemegang_nama 
                ? `Pindahkan aset "${selectedItem?.nama_aset}" dari ${selectedItem?.pemegang_nama} ke pemegang baru`
                : `Serahkan aset "${selectedItem?.nama_aset}" kepada pegawai`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pemegang Baru *</label>
              <select 
                className="w-full h-10 border rounded-md px-3"
                value={serahTerimaData.pemegang_baru_id}
                onChange={(e) => setSerahTerimaData({...serahTerimaData, pemegang_baru_id: e.target.value})}
              >
                <option value="">-- Pilih Pegawai --</option>
                {pegawaiList.filter(p => p._id !== selectedItem?.pemegang_id).map(p => (
                  <option key={p._id} value={p._id}>
                    {p.nama_lengkap} ({p.nip || p.nik || p.nrp || '-'})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Keterangan</label>
              <Input 
                value={serahTerimaData.keterangan}
                onChange={(e) => setSerahTerimaData({...serahTerimaData, keterangan: e.target.value})}
                placeholder="Catatan serah terima..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSerahTerimaOpen(false)}>Batal</Button>
            <Button onClick={handleSerahTerima} className="bg-blue-600 hover:bg-blue-700">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Serah Terima
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Kembalikan Modal */}
      <Dialog open={isKembalikanOpen} onOpenChange={setIsKembalikanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kembalikan Aset ke Gudang</DialogTitle>
            <DialogDescription>
              Aset &quot;{selectedItem?.nama_aset}&quot; akan dikembalikan dari {selectedItem?.pemegang_nama} ke gudang
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Gudang Tujuan *</label>
              <select 
                className="w-full h-10 border rounded-md px-3"
                value={kembalikanData.gudang_id}
                onChange={(e) => setKembalikanData({...kembalikanData, gudang_id: e.target.value})}
              >
                <option value="">-- Pilih Gudang --</option>
                {gudangList.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.nama_gudang} ({g.kode_gudang}) - {g.lokasi || 'Lokasi tidak ditentukan'}
                  </option>
                ))}
              </select>
              {gudangList.length === 0 && (
                <p className="text-xs text-red-500">Belum ada gudang. Buat gudang terlebih dahulu di halaman Manajemen Gudang.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kondisi Saat Dikembalikan</label>
              <select 
                className="w-full h-10 border rounded-md px-3"
                value={kembalikanData.kondisi_pengembalian}
                onChange={(e) => setKembalikanData({...kembalikanData, kondisi_pengembalian: e.target.value})}
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Keterangan</label>
              <Input 
                value={kembalikanData.keterangan}
                onChange={(e) => setKembalikanData({...kembalikanData, keterangan: e.target.value})}
                placeholder="Catatan pengembalian..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKembalikanOpen(false)}>Batal</Button>
            <Button onClick={handleKembalikan} className="bg-green-600 hover:bg-green-700" disabled={!kembalikanData.gudang_id}>
              <RotateCcw className="mr-2 h-4 w-4" /> Kembalikan ke Gudang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Aset</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Nama Aset</p>
                  <p className="font-semibold">{selectedItem.nama_aset}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kode Aset</p>
                  <p className="font-mono">{selectedItem.kode_aset || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kategori</p>
                  <p>{selectedItem.kategori}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kondisi</p>
                  <span className={`px-2 py-0.5 rounded text-sm ${getKondisiBadge(selectedItem.kondisi)}`}>
                    {selectedItem.kondisi}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Merk / Tipe</p>
                  <p>{selectedItem.merk} {selectedItem.tipe}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Serial Number</p>
                  <p className="font-mono text-sm">{selectedItem.serial_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Nilai Perolehan</p>
                  <p className="font-semibold">{formatCurrency(selectedItem.nilai_perolehan)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>
              
              {selectedItem.pemegang_nama && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium mb-2">Pemegang Saat Ini</p>
                  <p className="font-semibold text-blue-900">{selectedItem.pemegang_nama}</p>
                  <p className="text-sm text-blue-700">{selectedItem.pemegang_nip}</p>
                  <p className="text-xs text-blue-600">{selectedItem.pemegang_unit_kerja}</p>
                  {selectedItem.tgl_penyerahan && (
                    <p className="text-xs text-blue-500 mt-2">
                      Diserahkan: {new Date(selectedItem.tgl_penyerahan).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>
              )}
              
              {selectedItem.riwayat_pemegang && selectedItem.riwayat_pemegang.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Riwayat Pemegang
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedItem.riwayat_pemegang.slice().reverse().map((r, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded border text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{r.pemegang_nama}</span>
                          <span className="text-xs text-slate-500">{r.pemegang_nip}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(r.tgl_mulai).toLocaleDateString('id-ID')} 
                          {r.tgl_selesai && ` - ${new Date(r.tgl_selesai).toLocaleDateString('id-ID')}`}
                          {!r.tgl_selesai && ' - Sekarang'}
                        </div>
                        {r.keterangan && <div className="text-xs text-slate-400 mt-1">{r.keterangan}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
