import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileUp, RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BandingData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { register, handleSubmit } = useForm();

  const onCompare = async (data) => {
    if (!data.file[0]) return toast.error("Pilih file Excel terlebih dahulu");
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', data.file[0]);

    try {
      const res = await api.post('/api/banding/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      toast.success("Proses banding selesai");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal memproses file");
    } finally {
      setLoading(false);
    }
  };
  
  const onImport = async (data) => {
      if (!data.file[0]) return toast.error("Pilih file Excel terlebih dahulu");
      if (!window.confirm("Yakin ingin mengimpor/menimpa data database dengan file ini?")) return;
      
      setLoading(true);
      const formData = new FormData();
      formData.append('file', data.file[0]);
  
      try {
        const res = await api.post('/api/banding/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success(res.data.message);
        // Reset or refresh?
      } catch (error) {
        toast.error("Gagal import data");
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Banding Data SIMAN</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle>Upload File SIMAN</CardTitle>
                <CardDescription>Format .xlsx (Excel) dari aplikasi SIMAN</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <Input type="file" accept=".xlsx, .xls" {...register('file')} className="cursor-pointer" />
                    
                    <div className="flex gap-2">
                        <Button onClick={handleSubmit(onCompare)} disabled={loading} className="flex-1 bg-slate-900">
                            {loading ? <RefreshCw className="animate-spin mr-2 h-4 w-4"/> : <FileUp className="mr-2 h-4 w-4"/>}
                            Bandingkan
                        </Button>
                        <Button onClick={handleSubmit(onImport)} disabled={loading} variant="outline" className="flex-1 border-slate-300">
                            Import Data
                        </Button>
                    </div>
                </form>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
              <CardHeader>
                  <CardTitle>Ringkasan Hasil</CardTitle>
              </CardHeader>
              <CardContent>
                  {!result ? (
                      <div className="text-center text-slate-400 py-8">
                          Belum ada hasil banding data.
                      </div>
                  ) : (
                      <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="text-sm text-slate-500">Total Data Excel</div>
                              <div className="text-2xl font-bold text-slate-900">{result.summary.total_excel}</div>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="text-sm text-slate-500">Total Data Aplikasi</div>
                              <div className="text-2xl font-bold text-slate-900">{result.summary.total_app}</div>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                              <div className="text-sm text-amber-600">Selisih / Perbedaan</div>
                              <div className="text-2xl font-bold text-amber-700">{result.summary.differences}</div>
                          </div>
                      </div>
                  )}
              </CardContent>
          </Card>
      </div>

      {result && result.details.length > 0 && (
        <Card>
            <CardHeader><CardTitle>Detail Selisih</CardTitle></CardHeader>
            <CardContent>
                <div className="rounded-md border border-slate-200 overflow-hidden max-h-[600px] overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0">
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Kode Barang</TableHead>
                                <TableHead>NUP</TableHead>
                                <TableHead>Nama Barang</TableHead>
                                <TableHead>Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.details.map((item, idx) => (
                                <TableRow key={idx} className={
                                    item.status === 'ONLY_IN_EXCEL' ? 'bg-green-50' : 
                                    item.status === 'ONLY_IN_APP' ? 'bg-red-50' : 'bg-yellow-50'
                                }>
                                    <TableCell>
                                        {item.status === 'ONLY_IN_EXCEL' && <span className="inline-flex items-center text-xs font-bold text-green-700"><CheckCircle className="w-3 h-3 mr-1"/> Data Baru (Excel)</span>}
                                        {item.status === 'ONLY_IN_APP' && <span className="inline-flex items-center text-xs font-bold text-red-700"><XCircle className="w-3 h-3 mr-1"/> Hilang di Excel</span>}
                                        {item.status === 'DIFFERENCE' && <span className="inline-flex items-center text-xs font-bold text-yellow-700"><AlertCircle className="w-3 h-3 mr-1"/> Data Beda</span>}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{item.kode_barang}</TableCell>
                                    <TableCell className="font-mono text-xs font-bold">{item.nup}</TableCell>
                                    <TableCell>{item.nama_barang}</TableCell>
                                    <TableCell className="text-sm text-slate-600">{item.detail}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
