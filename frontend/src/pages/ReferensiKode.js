import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Loader2, FileUp, Download, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Referensi Kodefikasi BMN</h1>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableSkeleton columns={3} rows={10} />
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
                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    limit={limit}
                    onPageChange={setCurrentPage}
                />
            </CardContent>
        </Card>

        {/* Import Modal */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Import Master Kode BMN</DialogTitle></DialogHeader>
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-sm space-y-2">
                        <div className="flex items-center gap-2 font-bold text-blue-800">
                            <AlertTriangle size={16}/> Format File Yang Didukung
                        </div>
                        <ul className="list-disc pl-5 text-blue-700 space-y-1 text-xs">
                            <li>Format: <strong>.xlsx</strong></li>
                            <li>Header Kolom (Pilih salah satu):
                                <ul className="pl-4 mt-1 font-mono">
                                    <li>Kode: kd_brg, Kode, Kode Barang</li>
                                    <li>Uraian: ur_sskel, Uraian, Nama Barang</li>
                                </ul>
                            </li>
                            <li>Sistem otomatis mendeteksi level kode (1-10 digit).</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={downloadTemplate} 
                            disabled={downloading}
                            className="w-fit"
                        >
                            {downloading ? <Loader2 className="animate-spin mr-2 h-3 w-3"/> : <Download className="mr-2 h-3 w-3"/>}
                            Download Template
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
