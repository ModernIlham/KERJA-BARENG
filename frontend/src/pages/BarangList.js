import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, FileUp, Download, Filter, FileText, Layout, AlertTriangle, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageContainer, PageHeader } from '../components/ui/page-layout';

import AsetTetapTable from '../components/barang/AsetTetapTable';
import PersediaanTable from '../components/barang/PersediaanTable';
import PersediaanTransactionModal from '../components/barang/PersediaanTransactionModal';
import KartuStokModal from '../components/barang/KartuStokModal';
import FotoManager from '../components/barang/FotoManager';
import KIBModal from '../components/barang/KIBModal';

export default function BarangList() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialTab = query.get('tab') || 'aset-tetap';

  // Tab State
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // --- SEPARATE STATE FOR FILTERS & COLUMNS ---
  
  // Aset Tetap State
  const [asetFilters, setAsetFilters] = useState({
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', nup: '', golongan: ''
  });
  const [asetColumns, setAsetColumns] = useState({
      gol: true, kode: true, nup: true, nama: true, kondisi: true, 
      stok: true, rata: true, perolehan: true, penyusutan: true, 
      buku: true, lokasi: true, status: true, foto: true,
      satker: false, register: false, tahun: false
  });

  // Persediaan State
  const [persediaanFilters, setPersediaanFilters] = useState({
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', golongan: ''
  });
  
  const [transactionItem, setTransactionItem] = useState(null);
  const [fotoManagerItem, setFotoManagerItem] = useState(null);
  const [kartuStokItem, setKartuStokItem] = useState(null);
  const [kibAsetId, setKibAsetId] = useState(null);

  const [fotoManagerType, setFotoManagerType] = useState('barang');

  const [persediaanColumns, setPersediaanColumns] = useState({
      gol: true, nama: true, merk: true, expired: true, kondisi: true,
      stok: true, kritis: true, rata: true, total: true, mutasi: true,
      lokasi: true, status: true, foto: true
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

  // Helpers to get current active state
  const getCurrentFilters = () => activeTab === 'persediaan' ? persediaanFilters : asetFilters;
  const getCurrentColumns = () => activeTab === 'persediaan' ? persediaanColumns : asetColumns;
  const setCurrentColumns = activeTab === 'persediaan' ? setPersediaanColumns : setAsetColumns;

  const fetchBarang = useCallback(async () => {
    setLoading(true);
    try {
      const currentFilters = activeTab === 'persediaan' ? persediaanFilters : asetFilters;
      
      const params = {
          page: currentPage,
          limit,
          search,
          filter_kode: currentFilters.kode,
          filter_nama: currentFilters.nama,
          filter_merk: currentFilters.merk,
          filter_kondisi: currentFilters.kondisi,
          filter_lokasi: currentFilters.lokasi,
          filter_nup: currentFilters.nup,
          filter_golongan: currentFilters.golongan
      };
      
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
  }, [currentPage, limit, search, asetFilters, persediaanFilters, activeTab]);

  // Debounce Effect for Filters
  useEffect(() => {
      const t = setTimeout(() => {
          if (currentPage === 1) fetchBarang(); 
          else setCurrentPage(1); 
      }, 600);
      return () => clearTimeout(t);
  }, [asetFilters, persediaanFilters, search]);

  // Fetch when page changes
  useEffect(() => {
      fetchBarang();
  }, [currentPage]);

  // Reset when tab changes
  useEffect(() => {
      if (currentPage === 1) fetchBarang();
      else setCurrentPage(1);
      
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
              } catch (e) { console.error("Lookup error", e); }
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
          const currentFilters = getCurrentFilters();
          const endpoint = activeTab === 'persediaan' ? '/api/persediaan/export-excel' : '/api/barang/export';
          
          let response;
          if (activeTab === 'persediaan') {
             response = await api.post(endpoint, {
                ids: Array.from(selectedIds),
                select_all_mode: isAllSelected,
                search,
                filters: currentFilters
             }, { responseType: 'blob' });
          } else {
             const params = {
                search, 
                filter_kode: currentFilters.kode, 
                filter_nama: currentFilters.nama, 
                filter_merk: currentFilters.merk, 
                filter_kondisi: currentFilters.kondisi, 
                filter_lokasi: currentFilters.lokasi, 
                filter_nup: currentFilters.nup, 
                filter_golongan: currentFilters.golongan,
                ids: selectedIds.size > 0 ? Array.from(selectedIds).join(",") : null,
                all_selected: isAllSelected
            };
             response = await api.get(endpoint, { params, responseType: 'blob' });
          }

          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); 
          link.href = url; 
          link.setAttribute('download', `${activeTab === 'persediaan' ? 'Persediaan' : 'Aset_Tetap'}_${new Date().toLocaleDateString()}.xlsx`);
          document.body.appendChild(link); link.click(); link.remove(); toast.success("Download Selesai", {id: t});
      } catch (e) { toast.error("Gagal export", {id: t}); }
  };

  const handlePdf = async () => {
      const t = toast.loading("Generating PDF...");
      try {
          const currentFilters = getCurrentFilters();
          const endpoint = activeTab === 'persediaan' ? '/api/persediaan/export-pdf' : '/api/barang/pdf';
          
          let response;
          if (activeTab === 'persediaan') {
             response = await api.post(endpoint, {
                ids: Array.from(selectedIds),
                select_all_mode: isAllSelected,
                search,
                filters: currentFilters
             }, { responseType: 'blob' });
          } else {
             const params = { 
                search, 
                filter_golongan: currentFilters.golongan, 
                filter_kode: currentFilters.kode, 
                filter_nama: currentFilters.nama,
                filter_merk: currentFilters.merk, 
                filter_kondisi: currentFilters.kondisi, 
                filter_lokasi: currentFilters.lokasi, 
                filter_nup: currentFilters.nup,
                ids: selectedIds.size > 0 ? Array.from(selectedIds).join(",") : null, 
                all_selected: isAllSelected 
             };
             response = await api.get(endpoint, { params, responseType: 'blob' });
          }

          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a'); 
          link.href = url; 
          link.setAttribute('download', `${activeTab === 'persediaan' ? 'Laporan_Persediaan' : 'Laporan_Aset'}_${new Date().toLocaleDateString()}.pdf`);
          document.body.appendChild(link); link.click(); link.remove(); toast.success("PDF Selesai", {id: t});
      } catch (e) { toast.error("Gagal PDF", {id: t}); }
  };

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
        toast.success("Data berhasil diperbarui"); 
      } else { 
        await api.post(baseEndpoint, data); 
        toast.success("Data berhasil ditambahkan"); 
      } 
      setIsModalOpen(false); 
      reset(); 
      fetchBarang(); 
    } catch(e) { 
      console.error('Save error:', e);
      toast.error(e.response?.data?.detail || "Gagal menyimpan data"); 
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

  const downloadNotaDinas = async (type = 'kritis') => {
    const t = toast.loading("Membuat nota dinas...");
    try {
      let endpoint = '';
      let filename = '';
      
      if (type === 'kritis') {
        endpoint = '/api/persediaan/nota-dinas-kritis';
        filename = `Nota_Dinas_Stok_Kritis_${new Date().toISOString().split('T')[0]}.pdf`;
      } else {
        endpoint = `/api/persediaan/nota-dinas-expired?filter_type=${type}`;
        filename = `Nota_Dinas_Expired_${type}_${new Date().toISOString().split('T')[0]}.pdf`;
      }
      
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Nota dinas berhasil dibuat", {id: t});
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal membuat nota dinas. Pastikan ada data yang sesuai.", {id: t});
    }
  };

  const handleBulkDelete = async () => { 
    if(!window.confirm("Hapus Massal?")) return; 
    try { 
      const endpoint = activeTab === 'persediaan' ? '/api/persediaan/bulk-delete' : '/api/barang/bulk-delete';
      await api.post(endpoint, { select_all_mode: isAllSelected, ids: Array.from(selectedIds), search, filters: getCurrentFilters() }); 
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

  // --- Header Action Buttons ---
  const headerActions = (
    <div className="flex gap-2">
        <Button variant="outline" onClick={() => setIsImportOpen(true)} className="bg-white hover:bg-slate-50">
            <FileUp className="mr-2 h-4 w-4 text-slate-600" /> Import
        </Button>
        {activeTab === 'persediaan' && (
            <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Tambah Baru
            </Button>
        )}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Master Data Barang" 
        description="Kelola database Aset Tetap dan Persediaan (Aset Lancar)."
        actions={headerActions}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <TabsList className="grid w-full md:w-auto grid-cols-2">
                <TabsTrigger value="aset-tetap">Aset Tetap</TabsTrigger>
                <TabsTrigger value="persediaan">Aset Lancar</TabsTrigger>
            </TabsList>

            <div className="flex flex-1 w-full md:w-auto justify-end gap-2 items-center">
                 <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Cari Barang..." 
                        className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors" 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                    />
                </div>

                {/* Filter Toggle */}
                <Button 
                    variant={showFilters ? "secondary" : "outline"} 
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    title="Filter Lanjutan"
                >
                    <Filter className="h-4 w-4" />
                </Button>

                {/* Column Visibility */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" title="Atur Kolom">
                            <Layout className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Tampilan Kolom</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.keys(getCurrentColumns()).map((key) => (
                            <DropdownMenuCheckboxItem 
                                key={key} 
                                checked={getCurrentColumns()[key]} 
                                onCheckedChange={(checked) => setCurrentColumns({...getCurrentColumns(), [key]: checked})}
                            >
                                {key.toUpperCase().replace(/_/g, ' ')}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Actions Menu (Export, etc) */}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="outline" size="icon" title="Menu Lainnya">
                             <Printer className="h-4 w-4" />
                         </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuLabel>Export & Laporan</DropdownMenuLabel>
                         <DropdownMenuItem onClick={handleExport}><Download className="w-3 h-3 mr-2"/> Export Excel</DropdownMenuItem>
                         <DropdownMenuItem onClick={handlePdf}><FileText className="w-3 h-3 mr-2"/> Export PDF</DropdownMenuItem>
                         {activeTab === 'persediaan' && (
                             <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Nota Dinas</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => downloadNotaDinas('kritis')}>Stok Kritis</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => downloadNotaDinas('expired')}>Sudah Expired</DropdownMenuItem>
                             </>
                         )}
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
        </div>

        {/* Selection Bar */}
        {(selectedIds.size > 0 || isAllSelected) && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2 px-4 rounded-md animate-in fade-in slide-in-from-top-2">
                <span className="text-sm text-blue-800 font-medium">
                    {isAllSelected ? `Semua ${totalItems} data terpilih` : `${selectedIds.size} data terpilih`}
                </span>
                <div className="flex gap-2">
                    {!isAllSelected && selectedIds.size === barang.length && (
                         <Button size="sm" variant="ghost" className="text-blue-700 hover:text-blue-800 hover:bg-blue-100" onClick={selectGlobal}>
                             Pilih Semua {totalItems} Data
                         </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                        <Trash className="w-3 h-3 mr-2"/> Hapus Terpilih
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                        Batal
                    </Button>
                </div>
            </div>
        )}

        <TabsContent value="aset-tetap" className="mt-0">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
                <AsetTetapTable 
                    loading={loading}
                    barang={barang}
                    selectedIds={selectedIds}
                    isAllSelected={isAllSelected}
                    isPageSelected={isPageSelected}
                    toggleSelectAllPage={toggleSelectAllPage}
                    toggleSelectRow={toggleSelectRow}
                    visibleColumns={asetColumns}
                    showFilters={showFilters}
                    filters={asetFilters}
                    setFilters={setAsetFilters}
                    editingStatusId={editingStatusId}
                    setEditingStatusId={setEditingStatusId}
                    handleStatusChange={handleStatusChange}
                    openEditModal={openEditModal}
                    handleDelete={handleDelete}
                    openFotoManager={(item) => { setFotoManagerItem(item); setFotoManagerType('barang'); }}
                    openKIBModal={(id) => setKibAsetId(id)}
                />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persediaan" className="mt-0">
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <PersediaanTable 
                        loading={loading}
                        barang={barang}
                        selectedIds={selectedIds}
                        isAllSelected={isAllSelected}
                        isPageSelected={isPageSelected}
                        toggleSelectAllPage={toggleSelectAllPage}
                        toggleSelectRow={toggleSelectRow}
                        visibleColumns={persediaanColumns}
                        showFilters={showFilters}
                        filters={persediaanFilters}
                        setFilters={setPersediaanFilters}
                        editingStatusId={editingStatusId}
                        setEditingStatusId={setEditingStatusId}
                        handleStatusChange={handleStatusChange}
                        editingBatasKritisId={editingBatasKritisId}
                        setEditingBatasKritisId={setEditingBatasKritisId}
                        batasKritisValue={batasKritisValue}
                        setBatasKritisValue={setBatasKritisValue}
                        handleBatasKritisChange={handleBatasKritisChange}
                        openEditModal={openEditModal}
                        handleDelete={handleDelete}
                        openTransactionModal={(item) => setTransactionItem(item)}
                        openKartuStok={(item) => setKartuStokItem(item)}
                        openFotoManager={(item) => { setFotoManagerItem(item); setFotoManagerType('persediaan'); }}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        
        {/* Pagination is kept outside the card to float at bottom */}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} onPageChange={setCurrentPage}/>
      </Tabs>
      
      {/* Import & Add Modals - Unchanged logic, just keeping them here */}
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
                            <li><strong>KodeBarang</strong> (wajib) - 16 digit atau 10 digit</li>
                            <li><strong>NamaBarang</strong> (wajib)</li>
                            <li><strong>Stok, Harga, Expired</strong></li>
                          </ul>
                        </div>
                        <Button variant="outline" onClick={downloadTemplate} className="w-full">
                          <Download className="mr-2 h-4 w-4" /> Download Template Excel
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <AlertTriangle className="inline mr-2 h-4 w-4"/>
                        Data dengan Kode & NUP sama akan di-overwrite.
                      </div>
                    )}
                    <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                        <Input type="file" accept=".xlsx, .xls, .csv" {...registerImport('file')} />
                        <Button type="submit" disabled={importing} className="w-full bg-slate-900 text-white">
                          {importing ? <Loader2 className="animate-spin mr-2"/> : <FileUp className="mr-2"/>} Import
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'persediaan' ? (editingItem ? 'Edit Persediaan' : 'Tambah Persediaan') : 'Detail Aset'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Form Content - Kept mostly same but wrapped for cleaner code reading */}
                {activeTab !== 'persediaan' && <div className="bg-blue-50 text-blue-800 p-2 text-xs border border-blue-200 mb-2 rounded">Mode Lihat - Data aset hanya dapat dicatat melalui halaman Transaksi Aset (Perolehan)</div>}
                
                {activeTab === 'persediaan' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-sm font-medium">Kode Barang (16 digit)</label><Input {...register('kode_barang', {required: true})} disabled={isReadonly} maxLength={16}/></div>
                      <div className="space-y-1"><label className="text-sm font-medium">Nama Barang</label><Input {...register('nama_barang', {required: true})} disabled={isReadonly} /></div>
                    </div>
                    {/* ... (Other fields simplified for brevity in this refactor, but kept logic) ... */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-sm font-medium">Merk</label><Input {...register('merk')} /></div>
                        <div className="space-y-1"><label className="text-sm font-medium">Tipe</label><Input {...register('tipe')} /></div>
                        <div className="space-y-1"><label className="text-sm font-medium">Satuan</label><Input {...register('satuan')} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-sm font-medium">Stok</label><Input type="number" {...register('stok')} /></div>
                        <div className="space-y-1"><label className="text-sm font-medium">Batas Kritis</label><Input type="number" {...register('batas_kritis')} /></div>
                        <div className="space-y-1"><label className="text-sm font-medium">Harga Satuan</label><Input type="number" {...register('nilai_satuan')} /></div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-sm font-medium">Expired</label><Input type="date" {...register('expired_date')} /></div>
                      <div className="space-y-1"><label className="text-sm font-medium">Lokasi</label><Input {...register('lokasi_fisik')} /></div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                         <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                         <Button type="submit" className="bg-blue-600 text-white">Simpan</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {/* Aset Form - VIEW ONLY MODE */}
                      <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Kode Barang</label><Input {...register('kode_barang')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">NUP</label><Input {...register('nup')} readOnly className="bg-slate-50"/></div>
                      </div>
                      <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Nama Barang</label><Input {...register('nama_barang')} readOnly className="bg-slate-50"/></div>
                      <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Merk</label><Input {...register('merk')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Tipe</label><Input {...register('tipe')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Tahun Anggaran</label><Input {...register('tahun_anggaran')} readOnly className="bg-slate-50"/></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Kondisi</label><Input {...register('kondisi')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Status Aset</label><Input {...register('status_aset')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Satuan</label><Input {...register('satuan')} readOnly className="bg-slate-50"/></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Nilai Perolehan</label><Input {...register('nilai_perolehan')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Nilai Penyusutan</label><Input {...register('nilai_penyusutan')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Nilai Buku</label><Input {...register('nilai_buku')} readOnly className="bg-slate-50"/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Lokasi Fisik</label><Input {...register('lokasi_fisik')} readOnly className="bg-slate-50"/></div>
                           <div className="space-y-1"><label className="text-sm font-medium text-slate-500">Tanggal Perolehan</label><Input {...register('tgl_perolehan')} readOnly className="bg-slate-50"/></div>
                      </div>
                       <div className="pt-4 flex justify-end gap-2">
                         <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Tutup</Button>
                    </div>
                  </div>
                )}
            </form>
          </DialogContent>
        </Dialog>

        {/* Global Modals */}
        <PersediaanTransactionModal isOpen={!!transactionItem} onClose={() => setTransactionItem(null)} item={transactionItem} onSuccess={() => { fetchBarang(); setTransactionItem(null); }} />
        <KartuStokModal isOpen={!!kartuStokItem} onClose={() => setKartuStokItem(null)} item={kartuStokItem} />
        <FotoManager isOpen={!!fotoManagerItem} onClose={() => setFotoManagerItem(null)} item={fotoManagerItem} type={fotoManagerType} onSuccess={fetchBarang} />
        <KIBModal isOpen={!!kibAsetId} onClose={() => setKibAsetId(null)} asetId={kibAsetId} />
    </PageContainer>
  );
}
