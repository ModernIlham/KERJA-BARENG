import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, RefreshCw, FileUp, Download, Printer, Filter, MoreHorizontal, FileText, Layout, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { ScrollArea } from '../components/ui/scroll-area';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Global Select State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false); // New: Select All Global
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', nup: '', golongan: ''
  });
  
  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
      gol: true, kode: true, nup: true, nama: true, kondisi: true, 
      stok: true, rata: true, perolehan: true, penyusutan: true, 
      buku: true, lokasi: true, status: true, kritis: true, sync: true, 
      satker: false, register: false, tahun: false, intra: false // Extra hidden cols
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

  const fetchBarang = useCallback(async () => {
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
      
      // If Global Select is active, ensure new page checkbox is logic handled?
      // Actually, if Global Select is True, we don't need to check individual boxes visually on fetch
      // But we should visually indicate everything is selected.
    } catch (error) {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, search, filters]);

  useEffect(() => {
      if(currentPage > 1) fetchBarang(); 
  }, [currentPage]);

  // --- Select Logic Updated ---
  const toggleSelectAllPage = (checked) => {
      setIsAllSelected(false); // Reset global select if manually toggling page
      if (checked) {
          const newSet = new Set(selectedIds);
          barang.forEach(item => newSet.add(item._id));
          setSelectedIds(newSet);
      } else {
          const newSet = new Set(selectedIds);
          barang.forEach(item => newSet.delete(item._id));
          setSelectedIds(newSet);
      }
  };
  
  const selectGlobal = () => {
      setIsAllSelected(true);
      // We can clear selectedIds because isAllSelected overrides it
      setSelectedIds(new Set());
      toast.info(`Seluruh ${totalItems} data terpilih.`);
  };
  
  const clearSelection = () => {
      setIsAllSelected(false);
      setSelectedIds(new Set());
  };

  const toggleSelectRow = (id) => {
      if(isAllSelected) setIsAllSelected(false); // Break global if individual clicked
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
      setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
      if(!window.confirm(`Yakin hapus ${isAllSelected ? totalItems : selectedIds.size} data terpilih?`)) return;
      try {
          const payload = {
              select_all_mode: isAllSelected,
              ids: Array.from(selectedIds),
              search,
              filters
          };
          await api.post('/api/barang/bulk-delete', payload);
          toast.success("Data berhasil dihapus");
          clearSelection();
          fetchBarang();
      } catch(e) { toast.error("Gagal hapus"); }
  };

  const handleExport = async () => {
      const t = toast.loading("Downloading Excel...");
      try {
          const params = {
              search, filter_kode: filters.kode, filter_nama: filters.nama,
              ids: selectedIds.size > 0 ? Array.from(selectedIds).join(",") : null,
              all_selected: isAllSelected
          };
          const response = await api.get('/api/barang/export', { params, responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); link.href = url;
          link.setAttribute('download', `Master_Barang_${new Date().toLocaleDateString()}.xlsx`);
          document.body.appendChild(link); link.click(); link.remove();
          toast.success("Download Selesai", {id: t});
      } catch (e) { toast.error("Gagal export", {id: t}); }
  };

  // ... (Pdf Handle similar logic) ...

  const openEditModal = (item) => { 
      setEditingItem(item); setKodefikasiHint(null);
      // Populate ALL fields
      setValue("kode_barang", item.kode_barang); 
      setValue("nup", item.nup); 
      setValue("nama_barang", item.nama_barang);
      setValue("merk", item.merk); 
      setValue("tipe", item.tipe); 
      setValue("kondisi", item.kondisi);
      setValue("tgl_perolehan", item.tgl_perolehan); 
      setValue("nilai_perolehan", item.nilai_perolehan);
      setValue("nilai_satuan", item.nilai_satuan); 
      setValue("lokasi_fisik", item.lokasi_fisik); 
      setValue("stok", item.stok);
      setValue("golongan_barang", item.golongan_barang); 
      setValue("batas_stok_kritis", item.batas_stok_kritis);
      
      // Extra fields from import
      setValue("kode_satker", item.kode_satker);
      setValue("nama_satker", item.nama_satker);
      setValue("kode_register", item.kode_register);
      setValue("ruang", item.ruang);
      setValue("provinsi", item.provinsi);
      setValue("kab_kota", item.kab_kota);
      setValue("tahun_anggaran", item.tahun_anggaran);
      
      setIsModalOpen(true); 
  };
  
  const openAddModal = () => { setEditingItem(null); setKodefikasiHint(null); reset({}); setIsModalOpen(true); };
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
            {/* ... Filters & Search ... */}
            <div className="relative flex-1 xl:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Cari Global..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            
            {/* Column Visibility Toggle */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><Layout size={16}/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Tampilan Kolom</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(visibleColumns).map((key) => (
                        <DropdownMenuCheckboxItem
                            key={key}
                            checked={visibleColumns[key]}
                            onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, [key]: checked})}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Actions if Selected */}
            {(selectedIds.size > 0 || isAllSelected) && (
                <div className="flex gap-2 bg-slate-100 p-1 rounded-md">
                    <span className="text-xs self-center px-2 font-bold text-slate-600">
                        {isAllSelected ? `ALL (${totalItems})` : `${selectedIds.size}`} Selected
                    </span>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash size={14}/></Button>
                    <Button size="sm" variant="outline" onClick={handleExport}><Download size={14}/></Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}><X size={14}/></Button>
                </div>
            )}

            <Button variant="outline" onClick={() => setIsImportOpen(true)}><FileUp className="mr-2 h-4 w-4" /> Import</Button>
            <Button className="bg-slate-900 text-white" onClick={openAddModal}><Plus className="mr-2 h-4 w-4" /> Tambah</Button>
        </div>
      </div>
      
      {/* Global Select Banner */}
      {!isAllSelected && selectedIds.size > 0 && selectedIds.size === barang.length && (
          <div className="bg-blue-50 text-blue-700 p-2 text-center text-sm rounded cursor-pointer hover:bg-blue-100" onClick={selectGlobal}>
              Anda memilih {selectedIds.size} data di halaman ini. <strong>Klik di sini untuk memilih seluruh {totalItems} data.</strong>
          </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <Table className="w-full min-w-[1500px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[40px] text-center p-2">
                      <input type="checkbox" onChange={(e) => toggleSelectAllPage(e.target.checked)} checked={barang.length > 0 && (isAllSelected || selectedIds.size === barang.length)} className="rounded border-slate-300"/>
                  </TableHead>
                  {visibleColumns.gol && <TableHead className="w-[80px] p-2 text-xs font-bold uppercase">Gol</TableHead>}
                  {visibleColumns.nama && <TableHead className="min-w-[200px] p-2 text-xs font-bold uppercase">Nama Barang / Spesifikasi</TableHead>}
                  {visibleColumns.kode && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Kode / NUP</TableHead>}
                  {visibleColumns.kondisi && <TableHead className="w-[80px] p-2 text-xs font-bold uppercase text-center">Kondisi</TableHead>}
                  {visibleColumns.stok && <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Stok</TableHead>}
                  {visibleColumns.rata && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Rata-Rata</TableHead>}
                  {visibleColumns.perolehan && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Perolehan</TableHead>}
                  {visibleColumns.penyusutan && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Penyusutan</TableHead>}
                  {visibleColumns.buku && <TableHead className="text-right w-[100px] p-2 text-xs font-bold uppercase">Nilai Buku</TableHead>}
                  {visibleColumns.lokasi && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Lokasi</TableHead>}
                  {visibleColumns.satker && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Satker</TableHead>}
                  {visibleColumns.register && <TableHead className="w-[100px] p-2 text-xs font-bold uppercase">Register</TableHead>}
                  {visibleColumns.tahun && <TableHead className="w-[60px] p-2 text-xs font-bold uppercase text-center">Tahun</TableHead>}
                  <TableHead className="text-center w-[50px] p-2 text-xs font-bold uppercase sticky right-0 bg-slate-50 shadow-sm">Act</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? ( <TableSkeleton columns={14} rows={15} /> ) : barang.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-slate-500">Tidak ada data.</TableCell></TableRow>
                ) : (
                  barang.map((item) => (
                    <TableRow key={item._id} className={`text-xs ${selectedIds.has(item._id) || isAllSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50"}`}>
                      <TableCell className="text-center p-2">
                          <input type="checkbox" checked={isAllSelected || selectedIds.has(item._id)} onChange={() => toggleSelectRow(item._id)} className="rounded border-slate-300"/>
                      </TableCell>
                      {visibleColumns.gol && <TableCell className="p-2 truncate max-w-[80px]" title={item.golongan_barang}>{item.golongan_barang || '-'}</TableCell>}
                      {visibleColumns.nama && <TableCell className="p-2"><div className="font-semibold text-slate-900 truncate max-w-[200px]" title={item.nama_barang}>{item.nama_barang}</div><div className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.merk} {item.tipe}</div></TableCell>}
                      {visibleColumns.kode && <TableCell className="p-2 font-mono text-[10px]"><div title={item.kode_barang}>{item.kode_barang}</div><div className="text-slate-500">NUP: {item.nup}</div></TableCell>}
                      {visibleColumns.kondisi && <TableCell className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{item.kondisi}</span></TableCell>}
                      {visibleColumns.stok && <TableCell className="text-center font-bold p-2">{item.stok}</TableCell>}
                      {visibleColumns.rata && <TableCell className="text-right p-2 whitespace-nowrap">{formatCurrency(item.nilai_satuan || 0)}</TableCell>}
                      {visibleColumns.perolehan && <TableCell className="text-right p-2 whitespace-nowrap font-medium">{formatCurrency(item.nilai_perolehan || 0)}</TableCell>}
                      {visibleColumns.penyusutan && <TableCell className="text-right p-2 whitespace-nowrap text-red-600">({formatCurrency(item.nilai_penyusutan || 0)})</TableCell>}
                      {visibleColumns.buku && <TableCell className="text-right p-2 whitespace-nowrap font-bold text-slate-800">{formatCurrency(item.nilai_buku || 0)}</TableCell>}
                      {visibleColumns.lokasi && <TableCell className="p-2 truncate max-w-[120px]" title={item.lokasi_fisik}>{item.lokasi_fisik || '-'}</TableCell>}
                      {visibleColumns.satker && <TableCell className="p-2 truncate max-w-[120px]" title={item.nama_satker}>{item.nama_satker || '-'}</TableCell>}
                      {visibleColumns.register && <TableCell className="p-2 text-center">{item.kode_register || '-'}</TableCell>}
                      {visibleColumns.tahun && <TableCell className="p-2 text-center">{item.tahun_anggaran || '-'}</TableCell>}
                      
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
      
      {/* Modal Updates: Add Extra Fields */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              {/* Existing Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Golongan</label><Input {...register("golongan_barang")} readOnly className="bg-slate-100"/></div>
                <div className="space-y-2"><label className="text-sm font-medium">Kode Barang</label><Input {...register("kode_barang")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">NUP</label><Input {...register("nup")} /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Nama Barang</label><Input {...register("nama_barang")} /></div>
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">Merk</label><Input {...register("merk")} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Tipe</label><Input {...register("tipe")} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Kondisi</label><select {...register("kondisi")} className="w-full h-10 border rounded text-sm"><option value="Baik">Baik</option><option value="Rusak Ringan">Rusak Ringan</option><option value="Rusak Berat">Rusak Berat</option></select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Tgl Perolehan</label><Input type="date" {...register("tgl_perolehan")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Nilai Perolehan</label><Input type="number" {...register("nilai_perolehan")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Lokasi</label><Input {...register("lokasi_fisik")} /></div>
              </div>
              
              {/* New Detailed Fields (Toggle or Always Visible? Always visible requested) */}
              <div className="p-4 bg-slate-50 rounded border border-slate-100 space-y-4">
                  <h3 className="text-sm font-bold text-slate-700">Detail Tambahan</h3>
                  <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><label className="text-xs">Kode Register</label><Input className="h-8" {...register("kode_register")} /></div>
                      <div className="space-y-2"><label className="text-xs">Tahun Anggaran</label><Input className="h-8" {...register("tahun_anggaran")} /></div>
                      <div className="space-y-2"><label className="text-xs">Satker (Kode)</label><Input className="h-8" {...register("kode_satker")} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><label className="text-xs">Satker (Nama)</label><Input className="h-8" {...register("nama_satker")} /></div>
                      <div className="space-y-2"><label className="text-xs">Provinsi</label><Input className="h-8" {...register("provinsi")} /></div>
                      <div className="space-y-2"><label className="text-xs">Kab/Kota</label><Input className="h-8" {...register("kab_kota")} /></div>
                  </div>
              </div>

              <Button type="submit" className="w-full bg-slate-900 text-white mt-4">{editingItem ? 'Simpan' : 'Tambah'}</Button>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
