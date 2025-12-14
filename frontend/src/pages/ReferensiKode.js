import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Search, Loader2, FileUp, Download, AlertTriangle, Plus, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';

export default function ReferensiKode() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  // Delete Dialog
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { register: registerImport, handleSubmit: handleImportSubmit } = useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/referensi', { 
          params: { search, page: currentPage, limit } 
      });
      setData(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      console.error("Failed to load refs");
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => {
    const t = setTimeout(() => {
        if(search && currentPage !== 1) setCurrentPage(1);
        else fetchData();
    }, 500);
    return () => clearTimeout(t);
  }, [search, currentPage]); 

  // ... (Import Logic)
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

  const downloadTemplate = async () => {
      setDownloading(true);
      try {
          const response = await api.get('/api/referensi/template', { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'Template_Master_Kode_Barang.xlsx');
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Template berhasil diunduh");
      } catch (error) {
          toast.error("Gagal mengunduh template.");
      } finally {
          setDownloading(false);
      }
  };

  const exportExcel = async () => {
      const t = toast.loading("Mengunduh Excel...");
      try {
          const response = await api.get('/api/referensi/export/excel', { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'Referensi_Kode_Barang.xlsx');
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Excel berhasil diunduh", {id: t});
      } catch (error) {
          toast.error("Gagal mengunduh Excel", {id: t});
      }
  };

  const exportPDF = async () => {
      const t = toast.loading("Mengunduh PDF...");
      try {
          const response = await api.get('/api/referensi/export/pdf', { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'Referensi_Kode_Barang.pdf');
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("PDF berhasil diunduh", {id: t});
      } catch (error) {
          toast.error("Gagal mengunduh PDF", {id: t});
      }
  };

  const confirmDelete = (id) => {
      setDeleteId(id);
      setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
      try {
          await api.delete(`/api/referensi/${deleteId}`);
          toast.success("Terhapus");
          fetchData();
      } catch (e) {
          toast.error("Gagal menghapus");
      } finally {
          setIsDeleteOpen(false);
          setDeleteId(null);
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Referensi Kodefikasi BMN</h1>
            <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={exportExcel} size="sm">
                    <Download className="mr-2 h-4 w-4"/> Export Excel
                </Button>
                <Button variant="outline" onClick={exportPDF} size="sm">
                    <Download className="mr-2 h-4 w-4"/> Export PDF
                </Button>
                <Button variant="outline" onClick={() => setIsImportOpen(true)} size="sm">
                    <FileUp className="mr-2 h-4 w-4"/> Import Excel
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
                                <TableHead className="w-[150px]">Kode Barang</TableHead>
                                <TableHead>Uraian / Nama Barang</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead className="w-[100px] text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableSkeleton columns={4} rows={10} />
                            ) : data.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Belum ada data referensi.</TableCell></TableRow>
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
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" onClick={() => confirmDelete(item._id)} className="text-red-500 h-8 w-8 p-0">
                                                <Trash className="h-4 w-4" />
                                            </Button>
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

        {/* Import Modal Omitted */}
        {/* ... */}
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle/> Konfirmasi Hapus
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus referensi ini?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
                    <Button variant="destructive" onClick={handleDelete}>Ya, Hapus</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
