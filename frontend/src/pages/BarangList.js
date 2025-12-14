import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, RefreshCw, FileUp, Download, Printer, Filter, MoreHorizontal, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Filters
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', nup: '', golongan: ''
  });
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importing, setImporting] = useState(false);
  const [kodefikasiHint, setKodefikasiHint] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const { register: registerImport, handleSubmit: handleImportSubmit } = useForm();
  const kodeBarangValue = watch('kode_barang');

  useEffect(() => {
      const t = setTimeout(() => {
          setCurrentPage(1); 
          fetchBarang();
      }, 600);
      return () => clearTimeout(t);
  }, [filters, search]);

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

  useEffect(() => {
      if(currentPage > 1) fetchBarang(); 
  }, [currentPage]);

  // ... (Select Logic)
  const toggleSelectAll = (checked) => {
      if (checked) { const ids = new Set(barang.map(item => item._id)); setSelectedIds(ids); } 
      else { setSelectedIds(new Set()); }
  };
  const toggleSelectRow = (id) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
      setSelectedIds(newSelected);
  };

  const handleExport = async () => {
      const t = toast.loading("Downloading Excel...");
      try {
          const params = { search, filter_kode: filters.kode, filter_nama: filters.nama, filter_merk: filters.merk, filter_kondisi: filters.kondisi, filter_lokasi: filters.lokasi, filter_nup: filters.nup };
          const response = await api.get('/api/barang/export', { params, responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); link.href = url;
          link.setAttribute('download', `Master_Barang_${new Date().toLocaleDateString()}.xlsx`);
          document.body.appendChild(link); link.click(); link.remove();
          toast.success("Download Selesai", {id: t});
      } catch (e) { toast.error("Gagal export", {id: t}); }
  };

  const handlePdf = async () => {
      const t = toast.loading("Generating PDF...");
      try {
          const params = { search, filter_golongan: filters.golongan };
          const response = await api.get('/api/barang/pdf', { params, responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); link.href = url;
          link.setAttribute('download', `Laporan_Barang_${new Date().toLocaleDateString()}.pdf`);
          document.body.appendChild(link); link.click(); link.remove();
          toast.success("PDF Selesai", {id: t});
      } catch (e) { toast.error("Gagal PDF", {id: t}); }
  };

  // ... (Modals & Actions Logic) ...
  const openAddModal = () => { setEditingItem(null); setKodefikasiHint(null); reset({}); setIsModalOpen(true); };
  const openEditModal = (item) => { 
      setEditingItem(item); setKodefikasiHint(null);
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
      setImporting(true); const fd = new FormData(); fd.append('file', data.file[0]);
      try { await api.post('/api/barang/import', fd, { headers: {'Content-Type':'multipart/form-data'}}); toast.success("Imported"); setIsImportOpen(false); fetchBarang(); }
      catch(e) { toast.error("Import failed"); } finally { setImporting(false); }
  };

  // ... (Lookup Logic) ...
  useEffect(() => {
      if (kodeBarangValue && kodeBarangValue.length >= 1) {
          const lookup = async () => {
              try {
                  const res = await api.get('/api/referensi/lookup', { params: { kode: kodeBarangValue } });
                  setKodefikasiHint(res.data);
                  if (!editingItem && res.data.golongan) setValue('golongan_barang', res.data.golongan);
                  if (!editingItem && res.data.uraian_barang && kodeBarangValue.length >= 10) {
                      const currentName = watch('nama_barang'); if(!currentName) setValue('nama_barang', res.data.uraian_barang);
                  }
              } catch (e) {}
          };
          const t = setTimeout(lookup, 500); return () => clearTimeout(t);
      } else { setKodefikasiHint(null); }
  }, [kodeBarangValue, setValue, editingItem, watch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Cari Global..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            
            <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={handlePdf}>
                <FileText className="mr-2 h-4 w-4" /> PDF (Gol)
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
                  <TableHead className="w-[40px] text-center p-2">
                      <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={barang.length > 0 && selectedIds.size === barang.length} className="rounded border-slate-300"/>
                  </TableHead>
                  <TableHead className="w-[80px] p-2 text-xs font-bold uppercase">Gol</TableHead>
                  <TableHead className="min-w-[200px] p-2 text-xs font-bold uppercase">Nama Barang / Spesifikasi</TableHead>
                  <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Kode / NUP</TableHead>
                  <TableHead className="w-[80px] p-2 text-xs font-bold uppercase text-center">Kondisi</TableHead>
                  <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Stok</TableHead>
                  <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Rata-Rata</TableHead>
                  <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Perolehan</TableHead>
                  <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Penyusutan</TableHead>
                  <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Nilai Buku</TableHead>
                  <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Lokasi</TableHead>
                  <TableHead className="w-[80px] p-2 text-xs font-bold uppercase text-center">Status</TableHead>
                  <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Kritis</TableHead>
                  <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Sync</TableHead>
                  <TableHead className="text-center w-[50px] p-2 text-xs font-bold uppercase sticky right-0 bg-slate-50 shadow-sm">Act</TableHead>
                </TableRow>
                
                {showFilters && (
                    <TableRow className="bg-slate-50">
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Gol..." value={filters.golongan} onChange={e=>setFilters({...filters, golongan: e.target.value})} /></TableHead>
                        <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Nama..." value={filters.nama} onChange={e=>setFilters({...filters, nama: e.target.value})} /></TableHead>
                        <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Kode/NUP..." value={filters.kode} onChange={e=>setFilters({...filters, kode: e.target.value})} /></TableHead>
                        <TableHead className="p-1">
                            <select className="h-7 text-[10px] w-full border rounded px-1" value={filters.kondisi} onChange={e=>setFilters({...filters, kondisi: e.target.value})}>
                                <option value="">All</option><option value="Baik">Baik</option><option value="RR">RR</option><option value="RB">RB</option>
                            </select>
                        </TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Lokasi..." value={filters.lokasi} onChange={e=>setFilters({...filters, lokasi: e.target.value})} /></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="sticky right-0 bg-slate-50 p-1"></TableHead>
                    </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {loading ? ( <TableSkeleton columns={14} rows={15} /> ) : barang.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-slate-500">Tidak ada data.</TableCell></TableRow>
                ) : (
                  barang.map((item) => (
                    <TableRow key={item._id} className={`text-xs ${selectedIds.has(item._id) ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"}`}>
                      <TableCell className="text-center p-2">
                          <input type="checkbox" checked={selectedIds.has(item._id)} onChange={() => toggleSelectRow(item._id)} className="rounded border-slate-300"/>
                      </TableCell>
                      <TableCell className="p-2 truncate max-w-[80px]" title={item.golongan_barang}>{item.golongan_barang || '-'}</TableCell>
                      <TableCell className="p-2">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={item.nama_barang}>{item.nama_barang}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={`${item.merk || ''} ${item.tipe || ''}`}>{item.merk} {item.tipe}</div>
                      </TableCell>
                      <TableCell className="p-2 font-mono text-[10px]">
                          <div title={item.kode_barang}>{item.kode_barang}</div>
                          <div className="text-slate-500">NUP: {item.nup}</div>
                      </TableCell>
                      <TableCell className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : item.kondisi === 'Rusak Berat' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                              {item.kondisi === 'Rusak Ringan' ? 'RR' : item.kondisi === 'Rusak Berat' ? 'RB' : item.kondisi || '-'}
                          </span>
                      </TableCell>
                      <TableCell className="text-center font-bold p-2">{item.stok}</TableCell>
                      <TableCell className="text-right p-2 whitespace-nowrap">{formatCurrency(item.nilai_satuan || 0)}</TableCell>
                      <TableCell className="text-right p-2 whitespace-nowrap font-medium">{formatCurrency(item.nilai_perolehan || 0)}</TableCell>
                      <TableCell className="text-right p-2 whitespace-nowrap text-red-600">({formatCurrency(item.nilai_penyusutan || 0)})</TableCell>
                      <TableCell className="text-right p-2 whitespace-nowrap font-bold text-slate-800">{formatCurrency(item.nilai_buku || 0)}</TableCell>
                      <TableCell className="p-2 truncate max-w-[120px]" title={item.lokasi_fisik}>{item.lokasi_fisik || '-'}</TableCell>
                      <TableCell className="text-center p-2"><span className={`px-1 py-0.5 rounded text-[10px] ${item.status_aset === 'Aktif' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{item.status_aset || 'Aktif'}</span></TableCell>
                      <TableCell className="text-center text-red-600 font-bold p-2">{item.batas_stok_kritis || 1}</TableCell>
                      <TableCell className="text-center p-2">{item.penggolongan_siman ? <RefreshCw size={12} className="text-green-600 mx-auto" /> : <span className="text-slate-300">-</span>}</TableCell>
                      <TableCell className="text-center sticky right-0 bg-white/90 backdrop-blur shadow-sm p-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-100"><MoreHorizontal size={14}/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(item)} className="text-xs"><Edit size={12} className="mr-2"/> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(item._id)} className="text-xs text-red-600"><Trash size={12} className="mr-2"/> Hapus</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} onPageChange={setCurrentPage}/>
        </CardContent>
      </Card>
      {/* Import & Add Modals... (Same as before) */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Import Data Barang (SIMAN)</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                    <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                        <div className="space-y-2"><label className="text-sm font-medium">Pilih File Excel</label><Input type="file" accept=".xlsx, .xls" {...registerImport('file')} /></div>
                        <Button type="submit" disabled={importing} className="w-full bg-green-600 hover:bg-green-700 text-white">{importing ? <Loader2 className="animate-spin mr-2"/> : <FileUp className="mr-2"/>} Mulai Import</Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle></DialogHeader>
            {kodefikasiHint && (<div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 border border-blue-100 grid grid-cols-2 gap-2"><div><strong>Golongan:</strong> {kodefikasiHint.golongan || '-'}</div><div><strong>Bidang:</strong> {kodefikasiHint.bidang || '-'}</div><div><strong>Kelompok:</strong> {kodefikasiHint.kelompok || '-'}</div><div><strong>Sub-Sub:</strong> {kodefikasiHint.sub_sub_kelompok || '-'}</div></div>)}
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
