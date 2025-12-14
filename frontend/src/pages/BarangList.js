import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, FileUp, Download, Filter, FileText, Layout, CheckSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

import AsetTetapTable from '../components/barang/AsetTetapTable';
import PersediaanTable from '../components/barang/PersediaanTable';
import PersediaanTransactionModal from '../components/barang/PersediaanTransactionModal';
import KartuStokModal from '../components/barang/KartuStokModal';

export default function BarangList() {
  // Tab State
  const [activeTab, setActiveTab] = useState('aset-tetap');
  
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
      buku: true, lokasi: true, status: true, 
      satker: false, register: false, tahun: false
  });

  // Persediaan State
  const [persediaanFilters, setPersediaanFilters] = useState({
  const [kartuStokItem, setKartuStokItem] = useState(null);
  const [transactionItem, setTransactionItem] = useState(null);
      kode: '', nama: '', merk: '', kondisi: '', lokasi: '', golongan: ''
  });
  const [persediaanColumns, setPersediaanColumns] = useState({
      gol: true, nama: true, merk: true, expired: true, kondisi: true,
      stok: true, kritis: true, rata: true, total: true, mutasi: true,
      lokasi: true, status: true
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

  // Debounce Effect
  useEffect(() => {
      const t = setTimeout(() => {
          if (currentPage === 1) fetchBarang(); 
          else setCurrentPage(1); 
      }, 600);
      return () => clearTimeout(t);
  }, [asetFilters, persediaanFilters, search, currentPage, fetchBarang]);

  // Reset when tab changes
  useEffect(() => {
      setCurrentPage(1);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      clearSelection();
      // Note: We don't reset filters here to persist them when switching tabs if desired, 
      // or we can reset them. For now, let's keep them persistent per session.
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
          const endpoint = activeTab === 'persediaan' ? '/api/persediaan/export-excel' : '/api/barang/export';
          
          // Persediaan uses POST for export-excel, Barang uses GET (legacy)
          // Adjusting to use consistent POST if possible, or adapt.
          // Based on backend: 
          // Barang: GET /api/barang/export
          // Persediaan: POST /api/persediaan/export-excel
          
          let response;
          if (activeTab === 'persediaan') {
             response = await api.post(endpoint, {
                ids: Array.from(selectedIds),
                select_all_mode: isAllSelected,
                search,
                filters: currentFilters
             }, { responseType: 'blob' });
          } else {
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
                    <DropdownMenuLabel>Tampilan Kolom ({activeTab === 'persediaan' ? 'Persediaan' : 'Aset Tetap'})</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(getCurrentColumns()).map((key) => (
                        <DropdownMenuCheckboxItem 
                            key={key} 
                            checked={getCurrentColumns()[key]} 
                            onCheckedChange={(checked) => setCurrentColumns({...getCurrentColumns(), [key]: checked})}
                        >
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <FileText className="mr-1 h-3 w-3" /> Nota Dinas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => downloadNotaDinas('kritis')} className="text-xs">
                      Stok Kritis
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadNotaDinas('expired')} className="text-xs">
                      Sudah Expired
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadNotaDinas('2weeks')} className="text-xs">
                      Expired 2 Minggu
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadNotaDinas('1month')} className="text-xs">
                      Expired 1 Bulan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadNotaDinas('all')} className="text-xs">
                      Semua Expired
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                />
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={limit} onPageChange={setCurrentPage}/>
                    openKartuStok={(item) => setKartuStokItem(item)}
                    openTransactionModal={(item) => setTransactionItem(item)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persediaan" className="mt-4">
            <Card>
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
                />
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
                          <div className="text-xs mt-2 p-2 bg-blue-50 border border-blue-200 rounded flex flex-wrap gap-1 items-center">
                            <span className="font-semibold text-blue-800 mr-1">Kodefikasi:</span>
                            {/* Horizontal, compact format */}
                            {[
                                kodefikasiHint.golongan,
                                kodefikasiHint.bidang,
                                kodefikasiHint.kelompok,
                                kodefikasiHint.sub_kelompok,
                                kodefikasiHint.sub_sub_kelompok
                            ].filter(Boolean).map((text, idx, arr) => (
                                <span key={idx} className="text-blue-700 flex items-center">
                                    {text}
                                    {idx < arr.length - 1 && <span className="mx-1 text-blue-400">›</span>}
                                </span>
                            ))}
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
        <PersediaanTransactionModal 
            isOpen={!!transactionItem} 
            onClose={() => setTransactionItem(null)} 
            item={transactionItem}
            onSuccess={() => {
                fetchBarang();
        <KartuStokModal 
            isOpen={!!kartuStokItem} 
            onClose={() => setKartuStokItem(null)} 
            item={kartuStokItem}
        />
                setTransactionItem(null);
            }}
        />
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
