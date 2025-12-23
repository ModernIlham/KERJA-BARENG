import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { 
  Plus, Search, Trash, Edit, Package, Users, Layers, 
  Filter, X, ChevronUp, ChevronDown, ArrowUpDown, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';

export default function MasterBarangList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(null);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  
  // State for selected item
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  
  // Filter & Sort States
  const [filters, setFilters] = useState({ kategori: '' });
  const [sortBy, setSortBy] = useState('nama_barang');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nama_barang: '',
    kode_barang: '',
    kategori: 'Umum',
    merk: '',
    tipe: '',
    satuan: 'Unit',
    kondisi_default: 'Baik',
    nilai_perolehan: 0,
    spesifikasi: '',
    deskripsi: '',
    stok_tersedia: 1
  });
  
  // Assign data
  const [assignData, setAssignData] = useState({
    pegawai_id: '',
    serial_number: '',
    keterangan: ''
  });
  
  // Pegawai list for dropdown
  const [pegawaiList, setPegawaiList] = useState([]);
  
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/master-barang', { 
        params: { 
          search, page: currentPage, limit, 
          sort_by: sortBy, sort_order: sortOrder, 
          ...filters 
        } 
      });
      setItems(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      toast.error("Gagal memuat data barang");
    } finally {
      setLoading(false);
    }
  }, [search, currentPage, sortBy, sortOrder, filters]);
  
  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/master-barang/statistik/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to fetch summary');
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
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems();
    }, 500);
    return () => clearTimeout(timeout);
  }, [fetchItems]);
  
  useEffect(() => {
    fetchSummary();
    fetchPegawaiList();
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
    setFilters({ kategori: '' });
    setSearch('');
  };
  
  const openAdd = () => {
    setSelectedItem(null);
    setFormData({
      nama_barang: '',
      kode_barang: '',
      kategori: 'Umum',
      merk: '',
      tipe: '',
      satuan: 'Unit',
      kondisi_default: 'Baik',
      nilai_perolehan: 0,
      spesifikasi: '',
      deskripsi: '',
      stok_tersedia: 1
    });
    setIsFormOpen(true);
  };
  
  const openEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      nama_barang: item.nama_barang || '',
      kode_barang: item.kode_barang || '',
      kategori: item.kategori || 'Umum',
      merk: item.merk || '',
      tipe: item.tipe || '',
      satuan: item.satuan || 'Unit',
      kondisi_default: item.kondisi_default || 'Baik',
      nilai_perolehan: item.nilai_perolehan || 0,
      spesifikasi: item.spesifikasi || '',
      deskripsi: item.deskripsi || '',
      stok_tersedia: item.stok_tersedia || 0
    });
    setIsFormOpen(true);
  };
  
  const openAssign = (item) => {
    setSelectedItem(item);
    setAssignData({ pegawai_id: '', serial_number: '', keterangan: '' });
    setIsAssignOpen(true);
  };
  
  const confirmDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };
  
  const handleSubmit = async () => {
    if (!formData.nama_barang.trim()) {
      toast.error("Nama barang wajib diisi");
      return;
    }
    
    try {
      if (selectedItem) {
        await api.put(`/api/master-barang/${selectedItem.id}`, formData);
        toast.success("Barang berhasil diperbarui");
      } else {
        await api.post('/api/master-barang', formData);
        toast.success("Barang berhasil ditambahkan");
      }
      setIsFormOpen(false);
      fetchItems();
      fetchSummary();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan barang");
    }
  };
  
  const handleDelete = async () => {
    try {
      await api.delete(`/api/master-barang/${deleteId}`);
      toast.success("Barang dihapus");
      fetchItems();
      fetchSummary();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menghapus");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };
  
  const handleAssign = async () => {
    if (!assignData.pegawai_id) {
      toast.error("Pilih pegawai");
      return;
    }
    
    try {
      await api.post(`/api/master-barang/${selectedItem.id}/assign`, null, {
        params: {
          pegawai_id: assignData.pegawai_id,
          serial_number: assignData.serial_number || null,
          keterangan: assignData.keterangan || null
        }
      });
      toast.success("Barang berhasil diserahkan ke pegawai");
      setIsAssignOpen(false);
      fetchItems();
      fetchSummary();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyerahkan barang");
    }
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Barang</h1>
          <p className="text-sm text-slate-500">Katalog barang/aset yang dapat diserahkan ke pegawai</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Barang
        </Button>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Jenis Barang</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.total_jenis_barang}</p>
                </div>
                <Layers className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Stok Tersedia</p>
                  <p className="text-2xl font-bold text-green-900">{summary.total_stok_tersedia}</p>
                </div>
                <Package className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Dipegang Pegawai</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.total_assigned}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
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
      
      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Cari nama barang, kode, merk..." 
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
                  <span className="text-sm font-medium text-slate-700">Filter Barang</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                    <X className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
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
                    <button onClick={() => handleSort('kode_barang')} className="flex items-center gap-1 hover:text-blue-600">
                      Kode
                      {sortBy === 'kode_barang' ? (
                        sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('nama_barang')} className="flex items-center gap-1 hover:text-blue-600">
                      Nama Barang
                      {sortBy === 'nama_barang' ? (
                        sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Dipinjam</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead className="text-center w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={7} rows={10} />
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Tidak ada data barang.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">{item.kode_barang || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">{item.nama_barang}</div>
                          {item.merk && <div className="text-xs text-slate-400">{item.merk} {item.tipe}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          {item.kategori || 'Umum'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${item.stok_tersedia > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {item.stok_tersedia || 0}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{item.satuan || 'unit'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-purple-600 font-medium">{item.total_assigned || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{formatCurrency(item.nilai_perolehan)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openAssign(item)} 
                            title="Serahkan ke Pegawai" 
                            className="h-8 w-8 p-0 hover:bg-green-50 text-green-600"
                            disabled={item.stok_tersedia <= 0}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Edit" className="h-8 w-8 p-0 hover:bg-slate-100">
                            <Edit className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => confirmDelete(item.id)} title="Hapus" className="h-8 w-8 p-0 hover:bg-red-50 text-red-500">
                            <Trash className="h-4 w-4" />
                          </Button>
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
      
      {/* Add/Edit Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Barang' : 'Tambah Barang Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Barang *</label>
              <Input 
                value={formData.nama_barang}
                onChange={(e) => setFormData({...formData, nama_barang: e.target.value})}
                placeholder="Laptop Dell Latitude"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kode Barang <span className="text-xs text-slate-400">(auto jika kosong)</span></label>
              <Input 
                value={formData.kode_barang}
                onChange={(e) => setFormData({...formData, kode_barang: e.target.value})}
                placeholder="ELK-2025-0001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <select 
                className="w-full h-10 border rounded-md px-3"
                value={formData.kategori}
                onChange={(e) => setFormData({...formData, kategori: e.target.value})}
              >
                <option value="Elektronik">Elektronik</option>
                <option value="Furniture">Furniture</option>
                <option value="Kendaraan">Kendaraan</option>
                <option value="Peralatan Kantor">Peralatan Kantor</option>
                <option value="Umum">Umum</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kondisi Default</label>
              <select 
                className="w-full h-10 border rounded-md px-3"
                value={formData.kondisi_default}
                onChange={(e) => setFormData({...formData, kondisi_default: e.target.value})}
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Merk</label>
              <Input 
                value={formData.merk}
                onChange={(e) => setFormData({...formData, merk: e.target.value})}
                placeholder="Dell"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe/Model</label>
              <Input 
                value={formData.tipe}
                onChange={(e) => setFormData({...formData, tipe: e.target.value})}
                placeholder="Latitude 5420"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Satuan</label>
              <Input 
                value={formData.satuan}
                onChange={(e) => setFormData({...formData, satuan: e.target.value})}
                placeholder="Unit"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stok Tersedia</label>
              <Input 
                type="number"
                value={formData.stok_tersedia}
                onChange={(e) => setFormData({...formData, stok_tersedia: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nilai Perolehan (Rp)</label>
              <Input 
                type="number"
                value={formData.nilai_perolehan}
                onChange={(e) => setFormData({...formData, nilai_perolehan: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Spesifikasi</label>
              <Input 
                value={formData.spesifikasi}
                onChange={(e) => setFormData({...formData, spesifikasi: e.target.value})}
                placeholder="Core i7, 16GB RAM, 512GB SSD"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <Input 
                value={formData.deskripsi}
                onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                placeholder="Catatan tambahan..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assign Modal */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Serahkan Barang ke Pegawai</DialogTitle>
            <DialogDescription>
              Serahkan "{selectedItem?.nama_barang}" kepada pegawai
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm">
                <span className="font-medium text-blue-800">{selectedItem?.nama_barang}</span>
                <div className="text-xs text-blue-600 mt-1">
                  {selectedItem?.merk} {selectedItem?.tipe} • Stok: {selectedItem?.stok_tersedia}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Pegawai *</label>
              <select 
                className="w-full h-10 border rounded-md px-3"
                value={assignData.pegawai_id}
                onChange={(e) => setAssignData({...assignData, pegawai_id: e.target.value})}
              >
                <option value="">-- Pilih Pegawai --</option>
                {pegawaiList.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.nama_lengkap} ({p.nip || p.nik || p.nrp || '-'})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number <span className="text-xs text-slate-400">(opsional)</span></label>
              <Input 
                value={assignData.serial_number}
                onChange={(e) => setAssignData({...assignData, serial_number: e.target.value})}
                placeholder="SN12345"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Keterangan</label>
              <Input 
                value={assignData.keterangan}
                onChange={(e) => setAssignData({...assignData, keterangan: e.target.value})}
                placeholder="Catatan penyerahan..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Batal</Button>
            <Button onClick={handleAssign} className="bg-green-600 hover:bg-green-700">
              <UserPlus className="mr-2 h-4 w-4" /> Serahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" /> Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus barang ini? Barang yang sudah dipinjam pegawai tidak dapat dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
