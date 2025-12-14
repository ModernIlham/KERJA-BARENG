import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PegawaiList() {
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { register, handleSubmit, reset } = useForm();

  const fetchPegawai = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/pegawai', { params: { search } });
      setPegawai(res.data);
    } catch (error) {
      toast.error("Gagal memuat data pegawai");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPegawai();
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  const onSubmit = async (data) => {
    try {
      await api.post('/api/pegawai', data);
      toast.success("Pegawai berhasil ditambahkan");
      setIsModalOpen(false);
      reset();
      fetchPegawai();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal menyimpan pegawai");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Pegawai & Struktur Organisasi</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="mr-2 h-4 w-4" /> Tambah Pegawai
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Pegawai Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">NIP</label>
                    <Input {...register("nip", { required: true })} placeholder="1980xxxx" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Lengkap</label>
                    <Input {...register("nama_lengkap", { required: true })} placeholder="Budi Santoso" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Jabatan</label>
                <Input {...register("jabatan", { required: true })} placeholder="Pengelola BMN" />
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Unit Kerja (Struktur Organisasi)</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Eselon I</label>
                    <Input {...register("eselon1")} placeholder="Sekretariat Jenderal" className="h-8 text-sm"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Eselon II</label>
                    <Input {...register("eselon2")} placeholder="Biro Umum" className="h-8 text-sm"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Eselon III</label>
                    <Input {...register("eselon3")} placeholder="Bagian Perlengkapan" className="h-8 text-sm"/>
                  </div>
                   <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Eselon IV</label>
                    <Input {...register("eselon4")} placeholder="Subbagian Gudang" className="h-8 text-sm"/>
                  </div>
              </div>

              <Button type="submit" className="w-full bg-slate-900 text-white">Simpan Data</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cari NIP, Nama, atau Unit Kerja..." 
              className="pl-9 max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>NIP / Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Unit Kerja (Eselon)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : pegawai.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Tidak ada data pegawai.
                    </TableCell>
                  </TableRow>
                ) : (
                  pegawai.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell>
                         <div className="font-bold text-slate-900">{item.nama_lengkap}</div>
                         <div className="font-mono text-xs text-slate-500">{item.nip}</div>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.jabatan}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                          {item.eselon1 && <div className="font-semibold">{item.eselon1}</div>}
                          {item.eselon2 && <div>&rdsh; {item.eselon2}</div>}
                          {item.eselon3 && <div className="pl-2">&rdsh; {item.eselon3}</div>}
                          {item.eselon4 && <div className="pl-4 text-slate-500">{item.eselon4}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
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
    </div>
  );
}
