import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, RefreshCw, FileUp, Download, Printer, Filter, MoreHorizontal, FileText, Layout, CheckSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Filters
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', nup: '', golongan: ''
  });
  
  const [visibleColumns, setVisibleColumns] = useState({
      gol: true, kode: true, nup: true, nama: true, kondisi: true, 
      stok: true, rata: true, perolehan: true, penyusutan: true, 
      buku: true, lokasi: true, status: true, kritis: true, sync: true, 
      satker: false, register: false, tahun: false
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
  const tglPerolehanValue = watch('tgl_perolehan');

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
      setBarang(res.data.data || []);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      console.error("Fetch failed");
      setBarang([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, search, filters]);

  useEffect(() => {
      const t = setTimeout(() => {
          if (currentPage === 1) fetchBarang(); 
          else setCurrentPage(1); 
      }, 600);
      return () => clearTimeout(t);
  }, [filters, search]);

  useEffect(() => {
      fetchBarang(); 
  }, [currentPage, fetchBarang]);

  // ... (Select, Actions) ...
  const toggleSelectAllPage = (checked) => {
      setIsAllSelected(false);
      try {
          const newSet = new Set(selectedIds);
          if (checked) {
              barang.forEach(item => { if(item && item._id) newSet.add(item._id); });
          } else {
              barang.forEach(item => { if(item && item._id) newSet.delete(item._id); });
          }
          setSelectedIds(newSet);
      } catch(e) { console.error("Select error", e); }
  };
  const selectGlobal = () => { setIsAllSelected(true); setSelectedIds(new Set()); toast.info(`Seluruh ${totalItems} data terpilih.`); };
  const clearSelection = () => { setIsAllSelected(false); setSelectedIds(new Set()); };
  const toggleSelectRow = (id) => { if(isAllSelected) setIsAllSelected(false); const s = new Set(selectedIds); if(s.has(id)) s.delete(id); else s.add(id); setSelectedIds(s); };
  
  const handleExport = async () => { /* ... */ }; // Kept same
  const handlePdf = async () => { /* ... */ }; // Kept same
  
  // Handlers
  const openAddModal = () => { setEditingItem(null); setKodefikasiHint(null); reset({}); setIsModalOpen(true); };
  
  // Updated Open Edit Modal (Read Only Logic)
  const openEditModal = (item) => { 
      setEditingItem(item); setKodefikasiHint(null);
      Object.keys(item).forEach(key => setValue(key, item[key]));
      if(item.tgl_perolehan) setValue("tgl_perolehan", item.tgl_perolehan.split("T")[0]);
      setIsModalOpen(true); 
  };
  
  // Updated Submit (Read Only Check is done in Backend logic mainly, but UI can disable too)
  const onSubmit = async (data) => { 
      try { 
          if (editingItem) { 
              await api.put(`/api/barang/${editingItem._id}`, data); 
              toast.success("Updated"); 
          } else { 
              await api.post('/api/barang', data); 
              toast.success("Created"); 
          } 
          setIsModalOpen(false); reset(); fetchBarang(); 
      } catch(e) { toast.error("Error saving"); } 
  };
  
  const handleDelete = async (id) => { if(!window.confirm("Hapus?")) return; try { await api.delete(`/api/barang/${id}`); toast.success("Deleted"); fetchBarang(); } catch(e) { toast.error("Fail"); } };
  const handleBulkDelete = async () => { if(!window.confirm("Hapus Massal?")) return; try { await api.post('/api/barang/bulk-delete', { select_all_mode: isAllSelected, ids: Array.from(selectedIds), search, filters }); toast.success("Deleted"); clearSelection(); fetchBarang(); } catch(e) { toast.error("Fail"); } };
  const onImport = async (data) => { setImporting(true); const fd = new FormData(); fd.append('file', data.file[0]); try { await api.post('/api/barang/import', fd, { headers: {'Content-Type':'multipart/form-data'}}); toast.success("Imported"); setIsImportOpen(false); fetchBarang(); } catch(e) { toast.error("Import failed"); } finally { setImporting(false); } };

  // Lookup Hooks ... (Same)

  const isReadonly = editingItem?.source === 'import'; // Flag

  return (
    <div className="space-y-6">
      {/* ... Header ... */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
        {/* ... Buttons ... */}
      </div>
      
      {/* Table ... */}
      {/* ... (Table code same) ... */}

      {/* Import Modal with Warning */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Import Data Barang (SIMAN)</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <div className="font-bold flex items-center gap-2"><AlertTriangle size={16}/> PERINGATAN PENTING:</div>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Data dengan <strong>Kode Barang & NUP</strong> yang sama akan <strong>DITIMPA (OVERWRITE)</strong>.</li>
                            <li>Pastikan menggunakan file Excel terbaru (SIMAN) agar data tidak hilang/mundur.</li>
                            <li>Data yang diimport akan ditandai sebagai <strong>Read Only</strong> pada form edit.</li>
                        </ul>
                    </div>
                    <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                        <div className="space-y-2"><label className="text-sm font-medium">Pilih File Excel</label><Input type="file" accept=".xlsx, .xls" {...registerImport('file')} /></div>
                        <Button type="submit" disabled={importing} className="w-full bg-slate-900 text-white">{importing ? <Loader2 className="animate-spin mr-2"/> : <FileUp className="mr-2"/>} Mulai Import & Update</Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>

        {/* Edit Modal - Expanded to 71 Columns (Simplified View via Dynamic Render) */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? (isReadonly ? 'Detail Aset (Imported - Read Only)' : 'Edit Aset (Manual)') : 'Tambah Aset Baru'}</DialogTitle></DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                {isReadonly && <div className="bg-orange-50 text-orange-800 p-2 text-xs border border-orange-200 mb-2 rounded">Data ini hasil import dari SIMAN. Edit terbatas / Read Only.</div>}
                
                <Tabs defaultValue="utama">
                    <TabsList className="w-full bg-slate-100 flex-wrap h-auto">
                        <TabsTrigger value="utama">Data Utama</TabsTrigger>
                        <TabsTrigger value="nilai">Nilai & Akuntansi</TabsTrigger>
                        <TabsTrigger value="lokasi">Lokasi & Fisik</TabsTrigger>
                        <TabsTrigger value="legal">Legalitas</TabsTrigger>
                        <TabsTrigger value="detail">Detail Lengkap (71 Kolom)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="utama" className="space-y-4 py-4">
                        {/* Main Inputs (ReadOnly based on source) */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Kode Barang</label><Input {...register("kode_barang")} readOnly={isReadonly}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">NUP</label><Input {...register("nup")} readOnly={isReadonly}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Golongan</label><Input {...register("golongan_barang")} readOnly/></div>
                        </div>
                        {/* ... Other inputs ... */}
                        <div className="space-y-1"><label className="text-xs font-bold">Nama Barang</label><Input {...register("nama_barang")} readOnly={isReadonly}/></div>
                        {/* ... */}
                    </TabsContent>
                    
                    {/* ... Other Tabs (Apply readOnly={isReadonly} to all inputs) ... */}
                    
                    <TabsContent value="detail" className="space-y-4 py-4">
                        <div className="p-4 bg-slate-50 rounded border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-4">Semua Data Import (Raw Data)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                {editingItem && editingItem.detail_lainnya && Object.entries(editingItem.detail_lainnya).map(([key, val]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="font-semibold text-slate-500 capitalize">{key}</label>
                                        <div className="p-2 bg-white border rounded truncate" title={String(val)}>{String(val || '-')}</div>
                                    </div>
                                ))}
                                {!editingItem?.detail_lainnya && <div className="text-slate-400 col-span-3">Tidak ada detail tambahan.</div>}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                
                <div className="pt-4 border-t flex justify-end">
                    {!isReadonly && <Button type="submit" className="bg-slate-900 text-white min-w-[150px]">Simpan Perubahan</Button>}
                    {isReadonly && <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-500 text-white">Tutup (Read Only)</Button>}
                </div>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
