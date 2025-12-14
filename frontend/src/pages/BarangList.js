import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, RefreshCw, FileUp, Download, Printer, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Filters
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', nup: '', golongan: ''
  });
  
  // Search state
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importing, setImporting] = useState(false);
  const [kodefikasiHint, setKodefikasiHint] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const { register: registerImport, handleSubmit: handleImportSubmit } = useForm();
  const kodeBarangValue = watch('kode_barang');

  // Debounce Filter Changes
  useEffect(() => {
      const t = setTimeout(() => {
          setCurrentPage(1); // Reset page on filter change
          fetchBarang();
      }, 600);
      return () => clearTimeout(t);
  }, [filters, search]);

  // Fetch Logic
  const fetchBarang = async () => {
    setLoading(true);
    try {
      const params = {
          page: currentPage,
          limit,
          search,
          filter_kode: filters.kode,
          filter_nama: filters.nama,
          filter_merk: filters.merk,
          filter_kondisi: filters.kondisi,
          filter_lokasi: filters.lokasi,
          filter_nup: filters.nup,
          filter_golongan: filters.golongan
      };
      
      const res = await api.get('/api/barang', { params });
      setBarang(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when page changes (separate effect to avoid double fetch with filters)
  useEffect(() => {
      if(currentPage > 1) fetchBarang(); 
  }, [currentPage]);

  // Handle Selection
  const toggleSelectAll = (checked) => {
      if (checked) {
          const ids = new Set(barang.map(item => item._id));
          setSelectedIds(ids);
      } else {
          setSelectedIds(new Set());
      }
  };

  const toggleSelectRow = (id) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setSelectedIds(newSelected);
  };

  const handleExport = async () => {
      const t = toast.loading("Downloading Excel...");
      try {
          // Pass current filters
          const params = {
              search,
              filter_kode: filters.kode,
              filter_nama: filters.nama,
              filter_merk: filters.merk,
              filter_kondisi: filters.kondisi,
              filter_lokasi: filters.lokasi,
              filter_nup: filters.nup
          };
          
          const response = await api.get('/api/barang/export', { 
              params,
              responseType: 'blob' 
          });
          
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Master_Barang_${new Date().toLocaleDateString()}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Download Selesai", {id: t});
      } catch (e) {
          toast.error("Gagal export", {id: t});
      }
  };

  // ... (Keep existing Modal/Import/Delete logic) ...
  // Re-inserting helper functions for clarity
  const openAddModal = () => { setEditingItem(null); setKodefikasiHint(null); reset({}); setIsModalOpen(true); };
  const openEditModal = (item) => { 
      setEditingItem(item); 
      setKodefikasiHint(null);
      // ... populate fields ...
      setValue("kode_barang", item.kode_barang); setValue("nup", item.nup); setValue("nama_barang", item.nama_barang);
      setValue("merk", item.merk); setValue("tipe", item.tipe); setValue("kondisi", item.kondisi);
      setValue("tgl_perolehan", item.tgl_perolehan); setValue("nilai_perolehan", item.nilai_perolehan);
      setValue("nilai_satuan", item.nilai_satuan); setValue("lokasi_fisik", item.lokasi_fisik); setValue("stok", item.stok);
      setValue("golongan_barang", item.golongan_barang); setValue("batas_stok_kritis", item.batas_stok_kritis);
      setIsModalOpen(true); 
  };
  const onSubmit = async (data) => {
      try {
          if (editingItem) { await api.put(`/api/barang/${editingItem._id}`, data); toast.success("Updated"); } 
          else { await api.post('/api/barang', data); toast.success("Created"); }
          setIsModalOpen(false); reset(); fetchBarang();
      } catch(e) { toast.error("Error saving"); }
  };
  const handleDelete = async (id) => {
      if(!window.confirm("Hapus?")) return;
      try { await api.delete(`/api/barang/${id}`); toast.success("Deleted"); fetchBarang(); } 
      catch(e) { toast.error("Failed delete"); }
  };
  const onImport = async (data) => {
      setImporting(true);
      const fd = new FormData(); fd.append('file', data.file[0]);
      try { await api.post('/api/barang/import', fd, { headers: {'Content-Type':'multipart/form-data'}}); toast.success("Imported"); setIsImportOpen(false); fetchBarang(); }
      catch(e) { toast.error("Import failed"); } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Cari Global..." 
                  className="pl-9 h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            
            <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" /> Filter Kolom
            </Button>
            
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <FileUp className="mr-2 h-4 w-4" /> Import
            </Button>
            
            <Button className="bg-slate-900 text-white" onClick={openAddModal}>
                <Plus className="mr-2 h-4 w-4" /> Tambah
            </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <Table className="w-full min-w-[1500px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  {/* Checkbox Column */}
                  <TableHead className="w-[40px] text-center">
                      <input 
                        type="checkbox" 
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        checked={barang.length > 0 && selectedIds.size === barang.length}
                        className="rounded border-slate-300"
                      />
                  </TableHead>
                  
                  <TableHead className="w-[100px]">Golongan</TableHead>
                  <TableHead className="min-w-[150px]">Kode Barang</TableHead>
                  <TableHead className="w-[80px]">NUP</TableHead>
                  <TableHead className="min-w-[200px]">Nama Barang</TableHead>
                  <TableHead className="min-w-[150px]">Merk/Tipe</TableHead>
                  <TableHead className="w-[100px]">Kondisi</TableHead>
                  <TableHead className="min-w-[150px]">Lokasi</TableHead>
                  <TableHead className="text-right min-w-[120px]">Nilai (Rp)</TableHead>
                  <TableHead className="text-center w-[100px] sticky right-0 bg-slate-50 shadow-sm">Aksi</TableHead>
                </TableRow>
                
                {/* Column Filters Row */}
                {showFilters && (
                    <TableRow className="bg-slate-50">
                        <TableHead></TableHead>
                        <TableHead><Input className="h-8 text-xs" placeholder="Filter Gol..." value={filters.golongan} onChange={e=>setFilters({...filters, golongan: e.target.value})} /></TableHead>
                        <TableHead><Input className="h-8 text-xs" placeholder="Filter Kode..." value={filters.kode} onChange={e=>setFilters({...filters, kode: e.target.value})} /></TableHead>
                        <TableHead><Input className="h-8 text-xs" placeholder="NUP..." value={filters.nup} onChange={e=>setFilters({...filters, nup: e.target.value})} /></TableHead>
                        <TableHead><Input className="h-8 text-xs" placeholder="Filter Nama..." value={filters.nama} onChange={e=>setFilters({...filters, nama: e.target.value})} /></TableHead>
                        <TableHead><Input className="h-8 text-xs" placeholder="Filter Merk..." value={filters.merk} onChange={e=>setFilters({...filters, merk: e.target.value})} /></TableHead>
                        <TableHead>
                            <select className="h-8 text-xs w-full border rounded" value={filters.kondisi} onChange={e=>setFilters({...filters, kondisi: e.target.value})}>
                                <option value="">Semua</option>
                                <option value="Baik">Baik</option>
                                <option value="Rusak Ringan">Rusak Ringan</option>
                                <option value="Rusak Berat">Rusak Berat</option>
                            </select>
                        </TableHead>
                        <TableHead><Input className="h-8 text-xs" placeholder="Lokasi..." value={filters.lokasi} onChange={e=>setFilters({...filters, lokasi: e.target.value})} /></TableHead>
                        <TableHead></TableHead>
                        <TableHead className="sticky right-0 bg-slate-50"></TableHead>
                    </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={10} rows={10} />
                ) : barang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Tidak ada data barang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  barang.map((item) => (
                    <TableRow key={item._id} className={selectedIds.has(item._id) ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"}>
                      <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(item._id)}
                            onChange={() => toggleSelectRow(item._id)}
                            className="rounded border-slate-300"
                          />
                      </TableCell>
                      <TableCell className="text-xs">{item.golongan_barang || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{item.kode_barang}</TableCell>
                      <TableCell className="text-xs">{item.nup}</TableCell>
                      <TableCell className="font-medium text-sm">{item.nama_barang}</TableCell>
                      <TableCell className="text-xs text-slate-600">{item.merk} {item.tipe}</TableCell>
                      <TableCell>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                              item.kondisi === 'Rusak Berat' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                              {item.kondisi || '-'}
                          </span>
                      </TableCell>
                      <TableCell className="text-xs">{item.lokasi_fisik || '-'}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{formatCurrency(item.nilai_perolehan || 0)}</TableCell>
                      
                      <TableCell className="text-center sticky right-0 bg-white/80 backdrop-blur shadow-sm">
                        <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="text-blue-500 h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500 h-8 w-8 p-0">
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
      
      {/* Modals omitted, same as before */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Import Data Barang</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                    <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pilih File Excel</label>
                            <Input type="file" accept=".xlsx, .xls" {...registerImport('file')} />
                        </div>
                        <Button type="submit" disabled={importing} className="w-full bg-slate-900 text-white">Mulai Import</Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle></DialogHeader>
            {kodefikasiHint && (
                <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 border border-blue-100 grid grid-cols-2 gap-2">
                    <div><strong>Golongan:</strong> {kodefikasiHint.golongan || '-'}</div>
                    <div><strong>Bidang:</strong> {kodefikasiHint.bidang || '-'}</div>
                    <div><strong>Kelompok:</strong> {kodefikasiHint.kelompok || '-'}</div>
                    <div><strong>Sub-Sub:</strong> {kodefikasiHint.sub_sub_kelompok || '-'}</div>
                </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Golongan</label><Input {...register("golongan_barang")} placeholder="Auto..." readOnly className="bg-slate-100"/></div>
                <div className="space-y-2"><label className="text-sm font-medium">Kode Barang</label><Input {...register("kode_barang", { required: true })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">NUP</label><Input {...register("nup", { required: true })} /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Nama Barang</label><Input {...register("nama_barang", { required: true })} /></div>
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">Merk</label><Input {...register("merk")} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Tipe</label><Input {...register("tipe")} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Kondisi</label>
                    <select {...register("kondisi")} className="w-full h-10 px-3 border rounded-md text-sm"><option value="Baik">Baik</option><option value="Rusak Ringan">Rusak Ringan</option><option value="Rusak Berat">Rusak Berat</option></select>
                  </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Tgl Perolehan</label><Input type="date" {...register("tgl_perolehan")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Nilai (Rp)</label><Input type="number" {...register("nilai_perolehan")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Lokasi</label><Input {...register("lokasi_fisik")} /></div>
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white mt-4">{editingItem ? 'Simpan' : 'Tambah'}</Button>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
