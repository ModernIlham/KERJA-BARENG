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
  // Tab State
  const [activeTab, setActiveTab] = useState('aset-tetap');
  
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
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingBatasKritisId, setEditingBatasKritisId] = useState(null);
  const [batasKritisValue, setBatasKritisValue] = useState('');
  
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
      
      // Determine endpoint based on active tab
      const endpoint = activeTab === 'persediaan' ? '/api/persediaan/' : '/api/barang';
      const res = await api.get(endpoint, { params });
      setBarang(res.data.data || []);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      console.error("Fetch failed");
      setBarang([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, search, filters, activeTab]);

  // Debounce Effect
  useEffect(() => {
      const t = setTimeout(() => {
          if (currentPage === 1) fetchBarang(); 
          else setCurrentPage(1); 
      }, 600);
      return () => clearTimeout(t);
  }, [filters, search]);

  // Main Fetch Effect
  useEffect(() => {
      fetchBarang(); 
  }, [currentPage, fetchBarang]);

  // Reset when tab changes
  useEffect(() => {
      setCurrentPage(1);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      clearSelection();
  }, [activeTab]);

  // Automation Hooks
  useEffect(() => {
      if (tglPerolehanValue && !editingItem) {
          const year = tglPerolehanValue.split('-')[0];
          if(year && year.length === 4) setValue('tahun_anggaran', year);
      }
  }, [tglPerolehanValue, setValue, editingItem]);

  useEffect(() => {
      if (kodeBarangValue && kodeBarangValue.length >= 1) {
          const t = setTimeout(async () => {
              try {
                  const res = await api.get('/api/referensi/lookup', { params: { kode: kodeBarangValue } });
                  setKodefikasiHint(res.data);
                  if (!editingItem && res.data.golongan) setValue('golongan_barang', res.data.golongan);
                  if (!editingItem && res.data.uraian_barang && kodeBarangValue.length >= 10 && !watch('nama_barang')) {
                      setValue('nama_barang', res.data.uraian_barang);
                  }
                  if (!editingItem && kodeBarangValue.length >= 5) {
                      const nupRes = await api.get('/api/barang/next-nup', { params: { kode: kodeBarangValue } });
                      if(nupRes.data.formatted) setValue('nup', nupRes.data.formatted);
                  }
              } catch (e) {}
          }, 500); return () => clearTimeout(t);
      } else { setKodefikasiHint(null); }
  }, [kodeBarangValue, setValue, editingItem, watch]);

  // --- SAFE SELECT LOGIC ---
  const isPageSelected = barang.length > 0 && barang.every(item => selectedIds.has(item._id));

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

  const handleExport = async () => {
      const t = toast.loading("Downloading Excel...");
      try {
          const params = {
              search, filter_kode: filters.kode, filter_nama: filters.nama, filter_merk: filters.merk, 
              filter_kondisi: filters.kondisi, filter_lokasi: filters.lokasi, filter_nup: filters.nup, filter_golongan: filters.golongan,
              ids: selectedIds.size > 0 ? Array.from(selectedIds).join(",") : null,
              all_selected: isAllSelected
          };
          const response = await api.get('/api/barang/export', { params, responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Master_Barang_${new Date().toLocaleDateString()}.xlsx`);
          document.body.appendChild(link); link.click(); link.remove(); toast.success("Download Selesai", {id: t});
      } catch (e) { toast.error("Gagal export", {id: t}); }
  };

  const handlePdf = async () => {
      const t = toast.loading("Generating PDF...");
      try {
          const params = { 
              search, filter_golongan: filters.golongan, filter_kode: filters.kode, filter_nama: filters.nama,
              filter_merk: filters.merk, filter_kondisi: filters.kondisi, filter_lokasi: filters.lokasi, filter_nup: filters.nup,
              ids: selectedIds.size > 0 ? Array.from(selectedIds).join(",") : null, 
              all_selected: isAllSelected 
          };
          const response = await api.get('/api/barang/pdf', { params, responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Laporan_Barang_${new Date().toLocaleDateString()}.pdf`);
          document.body.appendChild(link); link.click(); link.remove(); toast.success("PDF Selesai", {id: t});
      } catch (e) { toast.error("Gagal PDF", {id: t}); }
  };

  // ... (Other handlers same) ...
  const openAddModal = () => { setEditingItem(null); setKodefikasiHint(null); reset({}); setIsModalOpen(true); };
  const openEditModal = (item) => { 
      setEditingItem(item); setKodefikasiHint(null);
      Object.keys(item).forEach(key => setValue(key, item[key]));
      if(item.tgl_perolehan) setValue("tgl_perolehan", item.tgl_perolehan.split("T")[0]);
      setIsModalOpen(true); 
  };
  const onSubmit = async (data) => { 
    try { 
      const baseEndpoint = activeTab === 'persediaan' ? '/api/persediaan/' : '/api/barang';
      if (editingItem) { 
        await api.put(`${baseEndpoint}${editingItem._id}`, data); 
        toast.success("Updated"); 
      } else { 
        await api.post(baseEndpoint, data); 
        toast.success("Created"); 
      } 
      setIsModalOpen(false); 
      reset(); 
      fetchBarang(); 
    } catch(e) { 
      console.error('Save error:', e);
      toast.error(e.response?.data?.detail || "Error saving"); 
    } 
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus barang ini?')) return;
    try {
      const endpoint = activeTab === 'persediaan' ? `/api/persediaan/${id}` : `/api/barang/${id}`;
      await api.delete(endpoint);
      toast.success('Barang berhasil dihapus');
      fetchBarang();
    } catch (err) {
      toast.error('Gagal menghapus barang');
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      const endpoint = activeTab === 'persediaan' ? `/api/persediaan/${itemId}/status` : `/api/barang/${itemId}/status`;
      await api.patch(endpoint, { status_aset: newStatus });
      toast.success('Status berhasil diubah');
      setEditingStatusId(null);
      fetchBarang();
    } catch (err) {
      toast.error('Gagal mengubah status');
      console.error(err);
    }
  };

  const handleBatasKritisChange = async (itemId) => {
    try {
      const value = parseInt(batasKritisValue);
      if (isNaN(value) || value < 0) {
        toast.error('Nilai harus angka positif');
        return;
      }
      await api.patch(`/api/persediaan/${itemId}/batas-kritis`, { batas_kritis: value });
      toast.success('Batas kritis berhasil diubah');
      setEditingBatasKritisId(null);
      setBatasKritisValue('');
      fetchBarang();
    } catch (err) {
      toast.error('Gagal mengubah batas kritis');
      console.error(err);
    }
  };

  const downloadTemplate = async () => {
    const t = toast.loading("Mengunduh template...");
    try {
      const response = await api.get('/api/persediaan/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_Persediaan.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Template berhasil diunduh", {id: t});
    } catch (error) {
      toast.error("Gagal mengunduh template", {id: t});
    }
  };

  const downloadNotaDinas = async () => {
    const t = toast.loading("Membuat nota dinas...");
    try {
      const response = await api.get('/api/persediaan/nota-dinas-kritis', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Nota_Dinas_Stok_Kritis_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Nota dinas berhasil dibuat", {id: t});
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal membuat nota dinas. Pastikan ada barang dengan stok kritis.", {id: t});
    }
  };
  const handleBulkDelete = async () => { 
    if(!window.confirm("Hapus Massal?")) return; 
    try { 
      const endpoint = activeTab === 'persediaan' ? '/api/persediaan/bulk-delete' : '/api/barang/bulk-delete';
      await api.post(endpoint, { select_all_mode: isAllSelected, ids: Array.from(selectedIds), search, filters }); 
      toast.success("Deleted"); 
      clearSelection(); 
      fetchBarang(); 
    } catch(e) { 
      toast.error("Fail"); 
    } 
  };
  
  const onImport = async (data) => { 
    setImporting(true); 
    const fd = new FormData(); 
    fd.append('file', data.file[0]); 
    try { 
      const endpoint = activeTab === 'persediaan' ? '/api/persediaan/import' : '/api/barang/import';
      const res = await api.post(endpoint, fd, { headers: {'Content-Type':'multipart/form-data'}}); 
      toast.success(res.data.message || "Imported"); 
      setIsImportOpen(false); 
      fetchBarang(); 
    } catch(e) { 
      toast.error(e.response?.data?.detail || "Import failed"); 
    } finally { 
      setImporting(false); 
    } 
  };

  const isReadonly = editingItem && !String(editingItem.nup || "").includes("(Sementara)");

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola Aset Tetap dan Persediaan</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
            {/* ... Buttons ... */}
            <div className="relative flex-1 xl:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Cari Global..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Layout size={16}/></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Tampilan Kolom</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(visibleColumns).map((key) => (
                        <DropdownMenuCheckboxItem key={key} checked={visibleColumns[key]} onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, [key]: checked})}>
                            {key.toUpperCase()}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {(selectedIds.size > 0 || isAllSelected) && (
                <div className="flex gap-2 bg-slate-100 p-1 rounded-md">
                    <span className="text-xs self-center px-2 font-bold text-slate-600">{isAllSelected ? `ALL` : `${selectedIds.size}`} Selected</span>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash size={14}/></Button>
                    <Button size="sm" variant="outline" onClick={handleExport}><Download size={14}/></Button>
                    <Button size="sm" variant="outline" onClick={handlePdf}><FileText size={14}/></Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}><CheckSquare size={14}/></Button>
                </div>
            )}

            <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}><Filter className="mr-2 h-4 w-4" /></Button>
            
            {activeTab === 'persediaan' && (
              <>
                <Button variant="outline" onClick={downloadNotaDinas} size="sm" className="text-xs">
                  <FileText className="mr-1 h-3 w-3" /> Nota Dinas Stok Kritis
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={() => setIsImportOpen(true)}><FileUp className="mr-2 h-4 w-4" /> Import</Button>
            <Button className="bg-slate-900 text-white" onClick={openAddModal}><Plus className="mr-2 h-4 w-4" /> Tambah</Button>
        </div>
      </div>
      
      {!isAllSelected && selectedIds.size > 0 && selectedIds.size === barang.length && (
          <div className="bg-blue-50 text-blue-700 p-2 text-center text-sm rounded cursor-pointer hover:bg-blue-100" onClick={selectGlobal}>
              Anda memilih {selectedIds.size} data di halaman ini. <strong>Klik di sini untuk memilih seluruh {totalItems} data.</strong>
          </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="aset-tetap">Aset Tetap</TabsTrigger>
          <TabsTrigger value="persediaan">Aset Lancar (Persediaan)</TabsTrigger>
        </TabsList>

        <TabsContent value="aset-tetap" className="mt-4">
          <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <Table className="w-full min-w-[1500px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[40px] text-center p-2">
                      <input type="checkbox" onChange={(e) => toggleSelectAllPage(e.target.checked)} checked={isPageSelected || isAllSelected} className="rounded border-slate-300"/>
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
                  {visibleColumns.status && <TableHead className="w-[80px] p-2 text-xs font-bold uppercase text-center">Status</TableHead>}
                  <TableHead className="text-center w-[50px] p-2 text-xs font-bold uppercase sticky right-0 bg-slate-50 shadow-sm">Act</TableHead>
                </TableRow>
                
                {showFilters && (
                    <TableRow className="bg-slate-50">
                        <TableHead className="p-1"></TableHead>
                        {visibleColumns.gol && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Gol..." value={filters.golongan} onChange={e=>setFilters({...filters, golongan: e.target.value})} /></TableHead>}
                        {visibleColumns.nama && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Nama..." value={filters.nama} onChange={e=>setFilters({...filters, nama: e.target.value})} /></TableHead>}
                        {visibleColumns.kode && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Kode/NUP..." value={filters.kode} onChange={e=>setFilters({...filters, kode: e.target.value})} /></TableHead>}
                        {visibleColumns.kondisi && <TableHead className="p-1"><select className="h-7 text-[10px] w-full border rounded px-1" value={filters.kondisi} onChange={e=>setFilters({...filters, kondisi: e.target.value})}><option value="">All</option><option value="Baik">Baik</option><option value="RR">RR</option><option value="RB">RB</option></select></TableHead>}
                        {visibleColumns.stok && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.rata && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.perolehan && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.penyusutan && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.buku && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.lokasi && <TableHead className="p-1"><Input className="h-7 text-[10px]" placeholder="Lokasi..." value={filters.lokasi} onChange={e=>setFilters({...filters, lokasi: e.target.value})} /></TableHead>}
                        {visibleColumns.satker && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.register && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.tahun && <TableHead className="p-1"></TableHead>}
                        {visibleColumns.status && <TableHead className="p-1"></TableHead>}
                        <TableHead className="sticky right-0 bg-slate-50 p-1"></TableHead>
                    </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {loading ? ( <TableSkeleton columns={14} rows={15} /> ) : barang.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-slate-500">Tidak ada data.</TableCell></TableRow>
                ) : (
                  barang.map((item) => {
                    const isTemp = String(item.nup || "").includes("(Sementara)");
                    const isSelected = selectedIds.has(item._id) || isAllSelected;
                    const status = item.status_aset || 'Aktif';
                    
                    let rowClass = "text-xs ";
                    
                    // Priority: Selected > Status-based styling > Temp
                    if (isSelected) {
                      rowClass += "bg-blue-50 hover:bg-blue-100";
                    } else if (status === 'Non Aktif') {
                      rowClass += "bg-slate-200 text-slate-500 opacity-70 hover:opacity-80";
                    } else if (status === 'Dipinjamkan') {
                      rowClass += "bg-blue-100 hover:bg-blue-200";
                    } else if (isTemp) {
                      rowClass += "bg-yellow-50 hover:bg-yellow-100";
                    } else {
                      rowClass += "hover:bg-slate-50";
                    }

                    return (
                    <TableRow key={item._id} className={rowClass}>
                      <TableCell className="text-center p-2">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(item._id)} className="rounded border-slate-300"/>
                      </TableCell>
                      {visibleColumns.gol && <TableCell className="p-2 truncate max-w-[80px]" title={item.golongan_barang}>{item.golongan_barang || '-'}</TableCell>}
                      {visibleColumns.nama && <TableCell className="p-2"><div className="font-semibold text-slate-900 truncate max-w-[200px]" title={item.nama_barang}>{item.nama_barang}</div><div className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.merk} {item.tipe}</div></TableCell>}
                      {visibleColumns.kode && <TableCell className="p-2 font-mono text-[10px]"><div title={item.kode_barang}>{item.kode_barang}</div><div className="text-slate-500">NUP: {item.nup}</div></TableCell>}
                      {visibleColumns.kondisi && <TableCell className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : item.kondisi === 'Rusak Berat' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{item.kondisi}</span></TableCell>}
                      {visibleColumns.stok && <TableCell className="text-center font-bold p-2">{item.stok}</TableCell>}
                      {visibleColumns.rata && <TableCell className="text-right p-2 whitespace-nowrap">{formatCurrency(item.nilai_satuan || 0)}</TableCell>}
                      {visibleColumns.perolehan && <TableCell className="text-right p-2 whitespace-nowrap font-medium">{formatCurrency(item.nilai_perolehan || 0)}</TableCell>}
                      {visibleColumns.penyusutan && <TableCell className="text-right p-2 whitespace-nowrap text-red-600">({formatCurrency(item.nilai_penyusutan || 0)})</TableCell>}
                      {visibleColumns.buku && <TableCell className="text-right p-2 whitespace-nowrap font-bold text-slate-800">{formatCurrency(item.nilai_buku || 0)}</TableCell>}
                      {visibleColumns.lokasi && <TableCell className="p-2 truncate max-w-[120px]" title={item.lokasi_fisik}>{item.lokasi_fisik || '-'}</TableCell>}
                      {visibleColumns.satker && <TableCell className="p-2 truncate max-w-[120px]" title={item.nama_satker}>{item.nama_satker || '-'}</TableCell>}
                      {visibleColumns.register && <TableCell className="p-2 text-center">{item.kode_register || '-'}</TableCell>}
                      {visibleColumns.tahun && <TableCell className="p-2 text-center">{item.tahun_anggaran || '-'}</TableCell>}
                      {visibleColumns.status && (
                        <TableCell className="text-center p-2">
                          {editingStatusId === item._id ? (
                            <select
                              autoFocus
                              defaultValue={item.status_aset || 'Aktif'}
                              onChange={(e) => handleStatusChange(item._id, e.target.value)}
                              onBlur={() => setEditingStatusId(null)}
                              className="text-[10px] px-1 py-0.5 rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="Aktif">Aktif</option>
                              <option value="Non Aktif">Non Aktif</option>
                              <option value="Dipinjamkan">Dipinjamkan</option>
                            </select>
                          ) : (
                            <span
                              onClick={() => setEditingStatusId(item._id)}
                              className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all ${
                                item.status_aset === 'Aktif' ? 'bg-green-50 text-green-700 border border-green-200' :
                                item.status_aset === 'Non Aktif' ? 'bg-gray-100 text-gray-600 border border-gray-300' :
                                item.status_aset === 'Dipinjamkan' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                                'bg-green-50 text-green-700 border border-green-200'
                              }`}
                            >
                              {item.status_aset || 'Aktif'}
                            </span>
                          )}
                        </TableCell>
                      )}
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
                  )})
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} onPageChange={setCurrentPage}/>
        </CardContent>
      </Card>
      </TabsContent>

      {/* Persediaan Tab */}
      <TabsContent value="persediaan" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border border-slate-200 overflow-x-auto">
              <Table className="w-full min-w-[1500px]">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[40px] text-center p-2">
                      <input type="checkbox" onChange={(e) => toggleSelectAllPage(e.target.checked)} checked={isPageSelected || isAllSelected} className="rounded border-slate-300"/>
                    </TableHead>
                    {visibleColumns.gol && <TableHead className="w-[120px] p-2 text-xs font-bold uppercase">Golongan</TableHead>}
                    {visibleColumns.nama && <TableHead className="min-w-[200px] p-2 text-xs font-bold uppercase">Nama Barang & Kode</TableHead>}
                    <TableHead className="w-[140px] p-2 text-xs font-bold uppercase">Merk / Tipe</TableHead>
                    <TableHead className="w-[90px] p-2 text-xs font-bold uppercase">Expired</TableHead>
                    {visibleColumns.kondisi && <TableHead className="w-[70px] p-2 text-xs font-bold uppercase text-center">Kondisi</TableHead>}
                    {visibleColumns.stok && <TableHead className="w-[85px] p-2 text-xs font-bold uppercase text-center">Stok</TableHead>}
                    <TableHead className="w-[95px] p-2 text-xs font-bold uppercase text-center">Batas Kritis</TableHead>
                    <TableHead className="text-right w-[95px] p-2 text-xs font-bold uppercase">Harga Satuan</TableHead>
                    <TableHead className="text-right w-[105px] p-2 text-xs font-bold uppercase">Total Harga</TableHead>
                    {visibleColumns.lokasi && <TableHead className="w-[100px] p-2 text-xs font-bold uppercase">Lokasi</TableHead>}
                    {visibleColumns.status && <TableHead className="w-[70px] p-2 text-xs font-bold uppercase text-center">Status</TableHead>}
                    <TableHead className="text-center w-[50px] p-2 text-xs font-bold uppercase sticky right-0 bg-slate-50 shadow-sm">Act</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeleton columns={12} rows={15} />
                  ) : barang.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-slate-500">Tidak ada data persediaan.</TableCell></TableRow>
                  ) : (
                    barang.map((item) => {
                      const isTemp = String(item.nup || "").includes("(Sementara)");
                      const isSelected = selectedIds.has(item._id) || isAllSelected;
                      const status = item.status_aset || 'Aktif';
                      
                      let rowClass = "text-xs ";
                      if (isSelected) {
                        rowClass += "bg-blue-50 hover:bg-blue-100";
                      } else if (status === 'Non Aktif') {
                        rowClass += "bg-slate-200 text-slate-500 opacity-70 hover:opacity-80";
                      } else if (status === 'Dipinjamkan') {
                        rowClass += "bg-blue-100 hover:bg-blue-200";
                      } else if (isTemp) {
                        rowClass += "bg-yellow-50 hover:bg-yellow-100";
                      } else {
                        rowClass += "hover:bg-slate-50";
                      }

                      // Check if stok below batas kritis
                      const isBelowKritis = item.stok <= (item.batas_kritis || 0) && item.batas_kritis > 0;

                      return (
                        <TableRow key={item._id} className={rowClass}>
                          <TableCell className="text-center p-2">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(item._id)} className="rounded border-slate-300"/>
                          </TableCell>
                          {visibleColumns.nama && (
                            <TableCell className="p-2">
                              <div className="font-semibold text-slate-900 text-xs truncate max-w-[220px]" title={item.nama_barang}>{item.nama_barang}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{item.kode_barang}</div>
                            </TableCell>
                          )}
                          {visibleColumns.gol && <TableCell className="p-2 text-[10px] truncate max-w-[80px]" title={item.golongan_barang}>{item.golongan_barang || '-'}</TableCell>}
                          <TableCell className="p-2 text-[10px]">
                            <div className="truncate max-w-[100px]" title={`${item.merk || ''} ${item.tipe || ''}`}>
                              {item.merk && <span className="font-medium">{item.merk}</span>}
                              {item.tipe && <span className="text-slate-500"> {item.tipe}</span>}
                              {!item.merk && !item.tipe && '-'}
                            </div>
                          </TableCell>
                          <TableCell className="p-2 text-[10px]">{item.expired_date || '-'}</TableCell>
                          {visibleColumns.kondisi && <TableCell className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' : item.kondisi === 'Barang Rusak' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{item.kondisi}</span></TableCell>}
                          {visibleColumns.stok && (
                            <TableCell className="text-center font-bold p-2">
                              <div className={isBelowKritis ? 'text-red-600' : 'text-slate-900'}>
                                {item.stok}
                                {item.satuan && <span className="text-[9px] font-normal ml-1">{item.satuan}</span>}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="text-center p-2">
                            {editingBatasKritisId === item._id ? (
                              <div className="flex gap-1 items-center justify-center">
                                <Input
                                  type="number"
                                  autoFocus
                                  value={batasKritisValue}
                                  onChange={(e) => setBatasKritisValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleBatasKritisChange(item._id);
                                    if (e.key === 'Escape') { setEditingBatasKritisId(null); setBatasKritisValue(''); }
                                  }}
                                  onBlur={() => handleBatasKritisChange(item._id)}
                                  className="w-16 h-6 text-[10px] px-1 text-center"
                                />
                              </div>
                            ) : (
                              <div
                                onClick={() => { setEditingBatasKritisId(item._id); setBatasKritisValue(item.batas_kritis || 0); }}
                                className="cursor-pointer hover:bg-slate-100 px-2 py-1 rounded"
                              >
                                <div className="font-semibold">{item.batas_kritis || 0}</div>
                                {item.satuan && <div className="text-[9px] text-slate-500">{item.satuan}</div>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right p-2 text-[10px] whitespace-nowrap">{formatCurrency(item.nilai_satuan || 0)}</TableCell>
                          <TableCell className="text-right p-2 text-[10px] font-semibold whitespace-nowrap">
                            {formatCurrency((item.stok || 0) * (item.nilai_satuan || 0))}
                          </TableCell>
                          {visibleColumns.lokasi && <TableCell className="p-2 truncate max-w-[120px]" title={item.lokasi_fisik}>{item.lokasi_fisik || '-'}</TableCell>}
                          {visibleColumns.status && (
                            <TableCell className="text-center p-2">
                              {editingStatusId === item._id ? (
                                <select
                                  autoFocus
                                  defaultValue={item.status_aset || 'Aktif'}
                                  onChange={(e) => handleStatusChange(item._id, e.target.value)}
                                  onBlur={() => setEditingStatusId(null)}
                                  className="text-[10px] px-1 py-0.5 rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="Aktif">Aktif</option>
                                  <option value="Non Aktif">Non Aktif</option>
                                  <option value="Dipinjamkan">Dipinjamkan</option>
                                </select>
                              ) : (
                                <span
                                  onClick={() => setEditingStatusId(item._id)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all ${
                                    item.status_aset === 'Aktif' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    item.status_aset === 'Non Aktif' ? 'bg-gray-100 text-gray-600 border border-gray-300' :
                                    item.status_aset === 'Dipinjamkan' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                                    'bg-green-50 text-green-700 border border-green-200'
                                  }`}
                                >
                                  {item.status_aset || 'Aktif'}
                                </span>
                              )}
                            </TableCell>
                          )}
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
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} onPageChange={setCurrentPage}/>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
      
      {/* Import & Add Modals */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {activeTab === 'persediaan' ? 'Import Data Persediaan' : 'Import Data Barang (SIMAN)'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {activeTab === 'persediaan' ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <div className="font-bold mb-2">Format Import Persediaan:</div>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li><strong>KodeBarang</strong> (wajib) - <strong>16 digit</strong> atau 10 digit (sistem akan auto-generate 6 digit terakhir)</li>
                            <li className="ml-4 text-[10px]">
                              <code className="bg-blue-100 px-1 rounded">Format: 1010301001000001</code> atau <code className="bg-blue-100 px-1 rounded">1010301001</code>
                            </li>
                            <li><strong>NamaBarang</strong> (wajib) - Nama item</li>
                            <li><strong>Merk, Tipe, Satuan</strong></li>
                            <li><strong>StokSaatIni</strong> - Jumlah stok</li>
                            <li><strong>NilaiSatuan</strong> - Harga per unit</li>
                            <li><strong>TglPerolehan</strong> - Format: DD/MM/YYYY</li>
                            <li><strong>Kondisi</strong> - Baik / Barang Usang / Barang Rusak</li>
                            <li><strong>LokasiRuang</strong> - Lokasi penyimpanan</li>
                          </ul>
                          <div className="mt-2 text-xs text-blue-600">
                            💡 Data dengan <strong>KodeBarang</strong> yang sama akan diupdate
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={downloadTemplate}
                          className="w-full bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Download className="mr-2 h-4 w-4" /> Download Template Excel
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <div className="font-bold flex items-center gap-2"><AlertTriangle size={16}/> PERINGATAN PENTING:</div>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Data dengan <strong>Kode Barang & NUP</strong> yang sama akan <strong>DITIMPA (OVERWRITE)</strong>.</li>
                          <li>Pastikan menggunakan file Excel terbaru (SIMAN) agar data tidak hilang/mundur.</li>
                          <li>Data yang diimport akan ditandai sebagai <strong>Read Only</strong> pada form edit.</li>
                        </ul>
                      </div>
                    )}
                    <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Pilih File {activeTab === 'persediaan' ? 'Excel/CSV' : 'Excel'}
                          </label>
                          <Input 
                            type="file" 
                            accept={activeTab === 'persediaan' ? '.xlsx, .xls, .csv' : '.xlsx, .xls'} 
                            {...registerImport('file')} 
                          />
                        </div>
                        <Button type="submit" disabled={importing} className="w-full bg-slate-900 text-white">
                          {importing ? <Loader2 className="animate-spin mr-2"/> : <FileUp className="mr-2"/>} 
                          Mulai Import & Update
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'persediaan' ? (
                  editingItem ? 'Edit Persediaan' : 'Tambah Persediaan Baru'
                ) : (
                  editingItem ? (isReadonly ? 'Detail Aset (Imported - Read Only)' : 'Edit Aset (Manual)') : 'Tambah Aset Baru'
                )}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                {isReadonly && activeTab !== 'persediaan' && <div className="bg-orange-50 text-orange-800 p-2 text-xs border border-orange-200 mb-2 rounded">Data ini hasil import dari SIMAN. Edit terbatas / Read Only.</div>}
                
                {activeTab === 'persediaan' ? (
                  /* Form Persediaan - Simplified */
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mb-4">
                      <div className="text-sm text-blue-800">
                        <strong>Format Kode Barang Persediaan:</strong>
                        <div className="mt-1">
                          • <strong>16 digit</strong> = 10 digit referensi + 6 digit unik
                        </div>
                        <div className="mt-1 text-xs">
                          Contoh: <code className="bg-blue-100 px-1 rounded">1010301001000001</code>
                        </div>
                        <div className="mt-1 text-xs text-blue-600">
                          💡 Anda bisa input hanya 10 digit, sistem akan auto-generate 6 digit terakhir
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-sm">Kode Barang * (16 digit)</label>
                        <Input 
                          {...register('kode_barang', {required: true})} 
                          disabled={isReadonly} 
                          placeholder="1010301001000001 atau 1010301001"
                          maxLength={16}
                        />
                        {kodefikasiHint && (
                          <div className="text-xs mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="font-semibold text-blue-800 mb-1">Jenjang Kodefikasi:</div>
                            {kodefikasiHint.golongan && <div className="text-blue-700">• Golongan: {kodefikasiHint.golongan}</div>}
                            {kodefikasiHint.bidang && <div className="text-blue-700">• Bidang: {kodefikasiHint.bidang}</div>}
                            {kodefikasiHint.kelompok && <div className="text-blue-700">• Kelompok: {kodefikasiHint.kelompok}</div>}
                            {kodefikasiHint.sub_kelompok && <div className="text-blue-700">• Sub Kelompok: {kodefikasiHint.sub_kelompok}</div>}
                            {kodefikasiHint.sub_sub_kelompok && <div className="text-blue-700">• Sub-Sub Kelompok: {kodefikasiHint.sub_sub_kelompok}</div>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Nama Barang *</label>
                        <Input {...register('nama_barang', {required: true})} disabled={isReadonly} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="font-semibold text-sm">Merk</label>
                        <Input {...register('merk')} />
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Tipe</label>
                        <Input {...register('tipe')} />
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Satuan</label>
                        <Input {...register('satuan')} placeholder="Rim, Kg, Unit" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="font-semibold text-sm">Stok Saat Ini</label>
                        <Input type="number" {...register('stok')} defaultValue={0} />
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Batas Kritis</label>
                        <Input type="number" {...register('batas_kritis')} defaultValue={0} />
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Nilai Satuan (Rp)</label>
                        <Input type="number" {...register('nilai_satuan')} defaultValue={0} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-sm">Expired Date</label>
                        <Input type="date" {...register('expired_date')} />
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Tanggal Perolehan</label>
                        <Input type="date" {...register('tgl_perolehan')} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-sm">Kondisi</label>
                        <select {...register('kondisi')} className="w-full border rounded px-3 py-2">
                          <option value="Baik">Baik</option>
                          <option value="Barang Usang">Barang Usang</option>
                          <option value="Barang Rusak">Barang Rusak</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-sm">Lokasi / Ruang</label>
                        <Input {...register('lokasi_fisik')} placeholder="Gudang ATK" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                      <Button type="submit" className="bg-blue-600 text-white">
                        {editingItem ? 'Update Persediaan' : 'Simpan Persediaan'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Form Aset Tetap - Original Complex Form */
                  <>
                  <Tabs defaultValue="utama">
                    <TabsList className="w-full bg-slate-100 flex-wrap h-auto">
                        <TabsTrigger value="utama">Data Utama</TabsTrigger>
                        <TabsTrigger value="nilai">Nilai & Akuntansi</TabsTrigger>
                        <TabsTrigger value="lokasi">Lokasi & Fisik</TabsTrigger>
                        <TabsTrigger value="legal">Legalitas</TabsTrigger>
                        <TabsTrigger value="detail">Detail Lengkap (71 Kolom)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="utama" className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Kode Barang</label><Input {...register("kode_barang")} readOnly={isReadonly}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">NUP</label><Input {...register("nup")} readOnly={isReadonly}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Golongan</label><Input {...register("golongan_barang")} readOnly/></div>
                        </div>
                        <div className="space-y-1"><label className="text-xs font-bold">Nama Barang</label><Input {...register("nama_barang")} readOnly={isReadonly}/></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Merk</label><Input {...register("merk")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Tipe</label><Input {...register("tipe")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Kondisi</label><select {...register("kondisi")} className="w-full h-10 border rounded px-2 text-sm"><option value="Baik">Baik</option><option value="Rusak Ringan">Rusak Ringan</option><option value="Rusak Berat">Rusak Berat</option></select></div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="nilai" className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Tgl Perolehan</label><Input type="date" {...register("tgl_perolehan")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Nilai Perolehan</label><Input type="number" {...register("nilai_perolehan")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Nilai Satuan</label><Input type="number" {...register("nilai_satuan")}/></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Nilai Penyusutan</label><Input type="number" {...register("nilai_penyusutan")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Nilai Buku</label><Input type="number" {...register("nilai_buku")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Tahun Anggaran</label><Input {...register("tahun_anggaran")}/></div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="lokasi" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Lokasi Fisik / Gedung</label><Input {...register("lokasi_fisik")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Ruang</label><Input {...register("ruang")}/></div>
                        </div>
                        <div className="space-y-1"><label className="text-xs font-bold">Alamat Lengkap</label><Input {...register("alamat")}/></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Provinsi</label><Input {...register("provinsi")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Kab/Kota</label><Input {...register("kab_kota")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Kecamatan</label><Input {...register("kecamatan")}/></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Kelurahan</label><Input {...register("kelurahan")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">RT/RW</label><Input {...register("rt_rw")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Kode Pos</label><Input {...register("kode_pos")}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t pt-2">
                            <div className="space-y-1"><label className="text-xs font-bold">Luas Tanah (m2)</label><Input type="number" {...register("luas_tanah")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Luas Bangunan (m2)</label><Input type="number" {...register("luas_bangunan")}/></div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="legal" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Kode Satker</label><Input {...register("kode_satker")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Nama Satker</label><Input {...register("nama_satker")}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold">Kode Register</label><Input {...register("kode_register")}/></div>
                            <div className="space-y-1"><label className="text-xs font-bold">Status Penggunaan</label><Input {...register("status_penggunaan")}/></div>
                        </div>
                        <div className="border-t pt-2 mt-2 space-y-2">
                            <h4 className="text-xs font-bold text-blue-600">Sertifikat / Dokumen</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1"><label className="text-xs font-bold">No. Sertifikat</label><Input {...register("no_sertifikat")}/></div>
                                <div className="space-y-1"><label className="text-xs font-bold">Tgl Sertifikat</label><Input type="date" {...register("tgl_sertifikat")}/></div>
                                <div className="space-y-1"><label className="text-xs font-bold">Status Sertifikasi</label><Input {...register("status_sertifikasi")}/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-bold">No. PSP</label><Input {...register("no_psp")}/></div>
                                <div className="space-y-1"><label className="text-xs font-bold">Tgl PSP</label><Input type="date" {...register("tgl_psp")}/></div>
                            </div>
                        </div>
                    </TabsContent>
                    
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
                  </>
                )}
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
