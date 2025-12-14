import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, RefreshCw, FileUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importing, setImporting] = useState(false);
  const [kodefikasiHint, setKodefikasiHint] = useState(null);
  
  // Delete Dialog State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const { register: registerImport, handleSubmit: handleImportSubmit } = useForm();

  // Watch kode_barang for automation
  const kodeBarangValue = watch('kode_barang');

  const fetchBarang = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/barang', { 
          params: { 
              search, 
              page: currentPage, 
              limit 
          } 
      });
      setBarang(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      toast.error("Gagal memuat data barang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if(search && currentPage !== 1) setCurrentPage(1);
      else fetchBarang();
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, currentPage]);

  // ... (Lookup Logic same as before) ...
  useEffect(() => {
      if (kodeBarangValue && kodeBarangValue.length >= 1) {
          const lookup = async () => {
              try {
                  const res = await api.get('/api/referensi/lookup', { params: { kode: kodeBarangValue } });
                  setKodefikasiHint(res.data);
                  if (!editingItem && res.data.golongan) setValue('golongan_barang', res.data.golongan);
                  if (!editingItem && res.data.uraian_barang && kodeBarangValue.length >= 10) {
                      const currentName = watch('nama_barang');
                      if(!currentName) setValue('nama_barang', res.data.uraian_barang);
                  }
              } catch (e) {}
          };
          const t = setTimeout(lookup, 500);
          return () => clearTimeout(t);
      } else {
          setKodefikasiHint(null);
      }
  }, [kodeBarangValue, setValue, editingItem, watch]);

  const openAddModal = () => {
      setEditingItem(null);
      setKodefikasiHint(null);
      reset({});
      setIsModalOpen(true);
  };

  const openEditModal = (item) => {
      setEditingItem(item);
      setKodefikasiHint(null);
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
      setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingItem) {
          await api.put(`/api/barang/${editingItem._id}`, data);
          toast.success("Barang berhasil diperbarui");
      } else {
          await api.post('/api/barang', data);
          toast.success("Barang berhasil ditambahkan");
      }
      setIsModalOpen(false);
      reset();
      setEditingItem(null);
      setKodefikasiHint(null);
      fetchBarang();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal menyimpan barang");
    }
  };

  const onImport = async (data) => {
      if(!data.file[0]) return toast.error("Pilih file excel!");
      setImporting(true);
      const formData = new FormData();
      formData.append('file', data.file[0]);
      try {
          const res = await api.post('/api/barang/import', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success(`Import Selesai! Diproses: ${res.data.processed}, Baru: ${res.data.inserted}`);
          setIsImportOpen(false);
          fetchBarang();
      } catch (error) {
          toast.error("Gagal import file");
      } finally {
          setImporting(false);
      }
  };

  // Modern Delete UX
  const confirmDelete = (id) => {
      setDeleteId(id);
      setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/barang/${deleteId}`);
      toast.success("Barang dihapus");
      fetchBarang();
    } catch (error) {
      toast.error("Gagal menghapus barang");
    } finally {
        setIsDeleteOpen(false);
        setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
        
        <div className="flex gap-2">
            <Button variant="outline" className="border-slate-300" onClick={() => setIsImportOpen(true)}>
                <FileUp className="mr-2 h-4 w-4" /> Import Excel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={openAddModal}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Aset
            </Button>
        </div>
        
        {/* Import Modal */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Import Data Barang</DialogTitle></DialogHeader>
                {/* ... Content ... */}
                <div className="space-y-4 pt-4">
                    <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pilih File Excel</label>
                            <Input type="file" accept=".xlsx, .xls" {...registerImport('file')} />
                        </div>
                        <Button type="submit" disabled={importing} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            {importing ? <Loader2 className="animate-spin mr-2"/> : <FileUp className="mr-2"/>}
                            Mulai Import
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>

        {/* Add/Edit Modal (Existing Code) */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle>
            </DialogHeader>
            {/* Kodefikasi Hint */}
            {kodefikasiHint && (
                <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 border border-blue-100 grid grid-cols-2 gap-2">
                    <div><strong>Golongan:</strong> {kodefikasiHint.golongan || '-'}</div>
                    <div><strong>Bidang:</strong> {kodefikasiHint.bidang || '-'}</div>
                    <div><strong>Kelompok:</strong> {kodefikasiHint.kelompok || '-'}</div>
                    <div><strong>Sub-Sub:</strong> {kodefikasiHint.sub_sub_kelompok || '-'}</div>
                </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              {/* Form fields... */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Golongan</label>
                  <Input {...register("golongan_barang")} placeholder="Contoh: 3. Peralatan..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kode Barang</label>
                  <Input {...register("kode_barang", { required: true })} placeholder="305010..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">NUP</label>
                  <Input {...register("nup", { required: true })} placeholder="1" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Barang</label>
                <Input {...register("nama_barang", { required: true })} placeholder="Nama Aset..." />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Merk</label>
                    <Input {...register("merk")} placeholder="Merk" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipe</label>
                    <Input {...register("tipe")} placeholder="Tipe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kondisi</label>
                    <select {...register("kondisi")} className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 text-sm">
                        <option value="Baik">Baik</option>
                        <option value="Rusak Ringan">Rusak Ringan</option>
                        <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Perolehan</label>
                  <Input type="date" {...register("tgl_perolehan")} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nilai Perolehan (Rp)</label>
                  <Input type="number" {...register("nilai_perolehan")} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Harga Rata-Rata (Rp)</label>
                  <Input type="number" {...register("nilai_satuan")} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lokasi / Ruang</label>
                  <Input {...register("lokasi_fisik")} placeholder="Gudang..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stok</label>
                  <Input type="number" {...register("stok")} defaultValue={1} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batas Kritis</label>
                  <Input type="number" {...register("batas_stok_kritis")} defaultValue={1} />
                </div>
              </div>

              <Button type="submit" className="w-full bg-slate-900 text-white mt-4">
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Data Aset'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle/> Konfirmasi Hapus
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus barang ini? Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
                    <Button variant="destructive" onClick={handleDelete}>Ya, Hapus</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cari nama, kode, atau NUP..." 
              className="pl-9 max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <Table className="w-full min-w-[1500px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[80px]">Gol</TableHead>
                  <TableHead className="min-w-[200px]">Nama Barang</TableHead>
                  <TableHead className="min-w-[150px]">Merk/Tipe</TableHead>
                  <TableHead className="w-[100px]">Kondisi</TableHead>
                  <TableHead className="text-center w-[80px]">Stok</TableHead>
                  <TableHead className="text-right min-w-[120px]">Harga Rata-Rata (Rp)</TableHead>
                  <TableHead className="text-right min-w-[120px]">Nilai Perolehan (Rp)</TableHead>
                  <TableHead className="text-right min-w-[120px]">Nilai Penyusutan (Rp)</TableHead>
                  <TableHead className="text-right min-w-[120px]">Nilai Buku (Rp)</TableHead>
                  <TableHead className="min-w-[150px]">Lokasi</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-center w-[80px]">Batas Kritis</TableHead>
                  <TableHead className="text-center w-[100px]">Sync SIMAN</TableHead>
                  <TableHead className="text-center w-[100px] sticky right-0 bg-slate-50 shadow-sm">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={14} rows={10} />
                ) : barang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-slate-500">
                      Tidak ada data barang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  barang.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell className="text-xs">{item.golongan_barang || '-'}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{item.nama_barang}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.kode_barang} | NUP: {item.nup}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {item.merk} {item.tipe}
                      </TableCell>
                      <TableCell>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                              item.kondisi === 'Rusak Berat' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                          }`}>
                              {item.kondisi || '-'}
                          </span>
                      </TableCell>
                      <TableCell className="text-center font-bold">{item.stok}</TableCell>
                      
                      {/* Financials */}
                      <TableCell className="text-right text-xs">{formatCurrency(item.nilai_satuan || 0)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(item.nilai_perolehan || 0)}</TableCell>
                      <TableCell className="text-right text-xs text-red-500">({formatCurrency(item.nilai_penyusutan || 0)})</TableCell>
                      <TableCell className="text-right text-xs font-bold">{formatCurrency(item.nilai_buku || 0)}</TableCell>
                      
                      <TableCell className="text-xs">{item.lokasi_fisik || '-'}</TableCell>
                      <TableCell className="text-xs">
                          <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{item.status_aset || 'Aktif'}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs text-red-600 font-bold">{item.batas_stok_kritis || 1}</TableCell>
                      
                      <TableCell className="text-center">
                          {item.penggolongan_siman ? 
                            <RefreshCw size={14} className="text-green-600 mx-auto" /> : 
                            <span className="text-[10px] text-slate-400">-</span>
                          }
                      </TableCell>
                      
                      <TableCell className="text-center sticky right-0 bg-white shadow-sm">
                        <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="text-blue-500 h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => confirmDelete(item._id)} className="text-red-500 h-8 w-8 p-0">
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
    </div>
  );
}
