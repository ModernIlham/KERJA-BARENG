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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Pegawai</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="mr-2 h-4 w-4" /> Tambah Pegawai
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pegawai Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NIP</label>
                <Input {...register("nip", { required: true })} placeholder="1980xxxx" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input {...register("nama_lengkap", { required: true })} placeholder="Budi Santoso" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jabatan</label>
                <Input {...register("jabatan", { required: true })} placeholder="Pengelola BMN" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Kerja</label>
                <Input {...register("unit_kerja", { required: true })} placeholder="Bagian Umum" />
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
              placeholder="Cari NIP atau Nama..." 
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
                  <TableHead>NIP</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Unit Kerja</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : pegawai.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      Tidak ada data pegawai.
                    </TableCell>
                  </TableRow>
                ) : (
                  pegawai.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs text-slate-600">{item.nip}</TableCell>
                      <TableCell className="font-medium text-slate-900">{item.nama_lengkap}</TableCell>
                      <TableCell className="text-slate-600">{item.jabatan}</TableCell>
                      <TableCell className="text-slate-600">{item.unit_kerja}</TableCell>
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
