import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Search, Loader2, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchBarang = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/barang', { params: { search } });
      setBarang(res.data);
    } catch (error) {
      toast.error("Gagal memuat data barang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchBarang();
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  const onSubmit = async (data) => {
    try {
      await api.post('/api/barang', data);
      toast.success("Barang berhasil ditambahkan");
      setIsModalOpen(false);
      reset();
      fetchBarang();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal menyimpan barang");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Yakin ingin menghapus barang ini?")) return;
    try {
      await api.delete(`/api/barang/${id}`);
      toast.success("Barang dihapus");
      fetchBarang();
    } catch (error) {
      toast.error("Gagal menghapus barang");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Barang</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="mr-2 h-4 w-4" /> Tambah Barang
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Barang Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kode Barang</label>
                  <Input {...register("kode_barang", { required: true })} placeholder="BRG-001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <Input {...register("kategori", { required: true })} placeholder="Elektronik" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Barang</label>
                <Input {...register("nama_barang", { required: true })} placeholder="Laptop ASUS" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Satuan</label>
                  <Input {...register("satuan", { required: true })} placeholder="Unit" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nilai Per Unit (Rp)</label>
                  <Input type="number" {...register("nilai_per_unit", { required: true })} placeholder="5000000" />
                </div>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">Lokasi</label>
                  <Input {...register("lokasi")} placeholder="Gudang A" />
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white">Simpan Barang</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cari nama atau kode barang..." 
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
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Nilai Aset</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : barang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Tidak ada data barang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  barang.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{item.kode_barang}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{item.nama_barang}</div>
                        <div className="text-xs text-slate-500">{item.lokasi || '-'}</div>
                      </TableCell>
                      <TableCell><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{item.kategori}</span></TableCell>
                      <TableCell className={`text-right font-bold ${item.stok <= 5 ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.stok} {item.satuan}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {formatCurrency(item.nilai_per_unit * item.stok)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash className="h-4 w-4" />
                        </Button>
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
