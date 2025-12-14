import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, FileUp, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ReferensiKode() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const { register, handleSubmit, reset, setValue } = useForm();
  const { register: registerImport, handleSubmit: handleImportSubmit } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/referensi', { params: { search, limit: 100 } });
      setData(res.data);
    } catch (error) {
      toast.error("Gagal memuat referensi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchData, 500);
    return () => clearTimeout(t);
  }, [search, fetchData]);

  const openAdd = () => {
      setEditingItem(null);
      reset();
      setIsModalOpen(true);
  };

  const openEdit = (item) => {
      setEditingItem(item);
      setValue('kode', item.kode);
      setValue('uraian', item.uraian);
      setIsModalOpen(true);
  };

  const onSubmit = async (form) => {
      try {
          if (editingItem) {
              await api.put(`/api/referensi/${editingItem._id}`, form);
              toast.success("Update berhasil");
          } else {
              await api.post('/api/referensi', form);
              toast.success("Tambah berhasil");
          }
          setIsModalOpen(false);
          fetchData();
      } catch (e) {
          toast.error("Gagal menyimpan");
      }
  };

  const onDelete = async (id) => {
      if(!window.confirm("Hapus kode ini?")) return;
      try {
          await api.delete(`/api/referensi/${id}`);
          toast.success("Terhapus");
          fetchData();
      } catch (e) {
          toast.error("Gagal menghapus");
      }
  };

  const onImport = async (form) => {
      if(!form.file[0]) return toast.error("Pilih file");
      const formData = new FormData();
      formData.append('file', form.file[0]);
      
      const t = toast.loading("Mengimpor... (Bisa memakan waktu)");
      try {
          const res = await api.post('/api/referensi/import', formData, {
              headers: {'Content-Type': 'multipart/form-data'}
          });
          toast.success(res.data.message, {id: t});
          setIsImportOpen(false);
          fetchData();
      } catch(e) {
          toast.error(e.response?.data?.detail || "Import gagal", {id: t});
      }
  };

  const downloadTemplate = () => {
      const ws = XLSX.utils.json_to_sheet([
          { "Kode": "3010101001", "Uraian": "Sepeda Motor" },
          { "Kode": "3010101002", "Uraian": "Mobil Sedan" },
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KodefikasiBarang");
      XLSX.writeFile(wb, "Template_Kodefikasi_Barang.xlsx");
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Referensi Kodefikasi Barang</h1>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    <FileUp className="mr-2 h-4 w-4"/> Import
                </Button>
                <Button className="bg-slate-900" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4"/> Tambah Kode
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader className="pb-3">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Cari Kode atau Uraian..." 
                        className="pl-9 max-w-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-slate-200 overflow-hidden max-h-[600px] overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0">
                            <TableRow>
                                <TableHead className="w-[150px]">Kode</TableHead>
                                <TableHead>Uraian Barang</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead className="w-[100px] text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Tidak ada data</TableCell></TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item._id} className="hover:bg-slate-50">
                                        <TableCell className="font-mono font-bold">{item.kode}</TableCell>
                                        <TableCell>{item.uraian}</TableCell>
                                        <TableCell><span className="bg-slate-100 px-2 py-1 rounded text-xs">Level {item.level}</span></TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-1">
                                                <Button size="sm" variant="ghost" className="text-blue-600 h-8 w-8 p-0" onClick={() => openEdit(item)}><Edit size={14}/></Button>
                                                <Button size="sm" variant="ghost" className="text-red-600 h-8 w-8 p-0" onClick={() => onDelete(item._id)}><Trash size={14}/></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingItem ? 'Edit Kode' : 'Tambah Kode Baru'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Kode (Tanpa Titik)</label>
                        <Input {...register('kode', {required: true})} placeholder="Contoh: 3010101001" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Uraian</label>
                        <Input {...register('uraian', {required: true})} placeholder="Contoh: Sepeda Motor..." />
                    </div>
                    <Button className="w-full bg-slate-900">Simpan</Button>
                </form>
            </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Import Kodefikasi Massal</DialogTitle></DialogHeader>
                <div className="space-y-6">
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-sm space-y-2">
                        <div className="flex items-center gap-2 font-bold text-yellow-800">
                            <AlertTriangle size={16}/> Peringatan & Ketentuan Import
                        </div>
                        <ul className="list-disc pl-5 text-yellow-700 space-y-1">
                            <li>Format File: <strong>.xlsx</strong> (Excel) atau <strong>.csv</strong>.</li>
                            <li>Wajib ada Header (Judul Kolom) di baris pertama.</li>
                            <li>Kolom Wajib: <strong>Kode</strong> dan <strong>Uraian</strong>.</li>
                            <li>Pastikan Kode berupa angka/teks bersih (contoh: <code>3010101001</code>). Titik (.) akan otomatis dihapus.</li>
                            <li>File besar (&gt;10MB) mungkin memakan waktu lama. Jangan tutup halaman.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">Contoh Format Data:</p>
                        <div className="border rounded-md overflow-hidden text-xs">
                            <Table>
                                <TableHeader className="bg-slate-100">
                                    <TableRow><TableHead>Kode</TableHead><TableHead>Uraian</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>3010101001</TableCell><TableCell>Sepeda Motor</TableCell></TableRow>
                                    <TableRow><TableCell>3010101002</TableCell><TableCell>Mobil Sedan</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-fit mt-2">
                            <Download className="mr-2 h-3 w-3"/> Download Template Excel
                        </Button>
                    </div>

                    <div className="pt-4 border-t">
                        <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Upload File</label>
                                <Input type="file" accept=".xlsx,.csv" {...registerImport('file', {required:true})} />
                            </div>
                            <Button className="w-full bg-green-600 hover:bg-green-700">Mulai Proses Import</Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
