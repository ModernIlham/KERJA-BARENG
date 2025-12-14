import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Loader2, FileUp, Download, AlertTriangle, Plus, Edit, Trash } from 'lucide-react';
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/referensi', { params: { search, limit: 100 } });
      setData(res.data);
    } catch (error) {
      console.error("Failed to load refs");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 500);
    return () => clearTimeout(t);
  }, [fetchData]);

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
      
      const t = toast.loading("Sedang Mengimpor Data...");
      try {
          const res = await api.post('/api/referensi/import', formData, {
              headers: {'Content-Type': 'multipart/form-data'}
          });
          toast.success(res.data.message, {id: t});
          setIsImportOpen(false);
          fetchData();
      } catch(e) {
          toast.error(e.response?.data?.detail || "Gagal Import", {id: t});
      }
  };

  const downloadTemplate = () => {
      try {
          // Create Data Array
          const data = [
              { "kd_brg": "3", "ur_sskel": "Peralatan dan Mesin" },
              { "kd_brg": "3.01", "ur_sskel": "Alat Besar" },
              { "kd_brg": "3.01.01", "ur_sskel": "Alat Besar Darat" },
              { "kd_brg": "3.01.01.01", "ur_sskel": "Tractor" },
              { "kd_brg": "3.01.01.01.001", "ur_sskel": "Crawler Tractor" }
          ];

          // Create Worksheet
          const ws = XLSX.utils.json_to_sheet(data);
          
          // Create Workbook
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "MasterKode");
          
          // Write File
          XLSX.writeFile(wb, "Template_Master_Kode_Barang.xlsx");
          toast.success("Template berhasil diunduh");
      } catch (error) {
          console.error("Download failed:", error);
          toast.error("Gagal mengunduh template. Pastikan browser mengizinkan download.");
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Referensi Kodefikasi BMN</h1>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    <FileUp className="mr-2 h-4 w-4"/> Import Excel
                </Button>
                {/* 
                <Button className="bg-slate-900" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4"/> Tambah Kode
                </Button>
                */}
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
                                <TableHead className="w-[150px]">Kode Barang</TableHead>
                                <TableHead>Uraian / Nama Barang</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                {/* <TableHead className="w-[100px] text-center">Aksi</TableHead> */}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : data.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-500">Belum ada data referensi.</TableCell></TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item._id} className="hover:bg-slate-50">
                                        <TableCell className="font-mono font-bold">{item.kode}</TableCell>
                                        <TableCell>{item.uraian}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                item.level === 1 ? 'bg-blue-100 text-blue-800' :
                                                item.level === 5 ? 'bg-green-100 text-green-800' : 'bg-slate-100'
                                            }`}>
                                                Level {item.level}
                                            </span>
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
                <DialogHeader><DialogTitle>Import Master Kode BMN</DialogTitle></DialogHeader>
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-sm space-y-2">
                        <div className="flex items-center gap-2 font-bold text-blue-800">
                            <AlertTriangle size={16}/> Format File Wajib (Sesuai BMN)
                        </div>
                        <ul className="list-disc pl-5 text-blue-700 space-y-1 text-xs">
                            <li><strong>Nama Kolom:</strong> <code>kd_brg</code> dan <code>ur_sskel</code></li>
                            <li><strong>Logika Level (Digit):</strong>
                                <ul className="pl-4 mt-1 space-y-1">
                                    <li>1 digit: Golongan (cth: 3)</li>
                                    <li>3 digit: Bidang (cth: 301)</li>
                                    <li>5 digit: Kelompok (cth: 30101)</li>
                                    <li>7 digit: Sub Kelompok (cth: 3010101)</li>
                                    <li>10 digit: Sub Sub Kelompok (cth: 3010101001)</li>
                                </ul>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={downloadTemplate} 
                            className="w-fit"
                        >
                            <Download className="mr-2 h-3 w-3"/> Download Template
                        </Button>
                    </div>

                    <div className="pt-4 border-t">
                        <form onSubmit={handleImportSubmit(onImport)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Upload File Excel</label>
                                <Input type="file" accept=".xlsx" {...registerImport('file', {required:true})} />
                            </div>
                            <Button className="w-full bg-slate-900 text-white">Mulai Import</Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
