import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

export default function BarangList() {
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const { register, handleSubmit, reset, setValue } = useForm();

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

  const openAddModal = () => {
      setEditingItem(null);
      reset({});
      setIsModalOpen(true);
  };

  const openEditModal = (item) => {
      setEditingItem(item);
      // Populate Form
      setValue("kode_barang", item.kode_barang);
      setValue("nup", item.nup);
      setValue("nama_barang", item.nama_barang);
      setValue("merk", item.merk);
      setValue("tipe", item.tipe);
      setValue("kondisi", item.kondisi);
      setValue("tgl_perolehan", item.tgl_perolehan);
      setValue("nilai_perolehan", item.nilai_perolehan);
      setValue("lokasi_fisik", item.lokasi_fisik);
      setValue("stok", item.stok);
      setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingItem) {
          // Update Mode
          await api.put(`/api/barang/${editingItem._id}`, data);
          toast.success("Barang berhasil diperbarui");
      } else {
          // Create Mode
          await api.post('/api/barang', data);
          toast.success("Barang berhasil ditambahkan");
      }
      setIsModalOpen(false);
      reset();
      setEditingItem(null);
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
        <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Aset
        </Button>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kode Barang</label>
                  <Input {...register("kode_barang", { required: true })} placeholder="Contoh: 305010..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">NUP (No Urut Pendaftaran)</label>
                  <Input {...register("nup", { required: true })} placeholder="1" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Barang</label>
                <Input {...register("nama_barang", { required: true })} placeholder="Laptop / Tanah / Bangunan..." />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Merk</label>
                    <Input {...register("merk")} placeholder="Dell / Toyota" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipe</label>
                    <Input {...register("tipe")} placeholder="Latitude 5420" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Perolehan</label>
                  <Input type="date" {...register("tgl_perolehan")} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nilai Perolehan (Rp)</label>
                  <Input type="number" {...register("nilai_perolehan")} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lokasi Fisik</label>
                  <Input {...register("lokasi_fisik")} placeholder="Gudang / Ruang Rapat" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jumlah Stok</label>
                  <Input type="number" {...register("stok")} defaultValue={1} />
                </div>
              </div>

              <Button type="submit" className="w-full bg-slate-900 text-white mt-4">
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Data Aset'}
              </Button>
            </form>
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
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[150px]">Kode / NUP</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Merk/Tipe</TableHead>
                  <TableHead>Tgl Perolehan</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead className="text-right">Nilai Aset</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : barang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Tidak ada data barang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  barang.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">
                        <div className="font-bold">{item.kode_barang}</div>
                        <div className="text-slate-500">NUP: {item.nup}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{item.nama_barang}</div>
                        <div className="text-xs text-slate-500">{item.lokasi_fisik || '-'}</div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {item.merk} {item.tipe}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {item.tgl_perolehan}
                      </TableCell>
                      <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                              item.kondisi === 'Rusak Berat' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                          }`}>
                              {item.kondisi}
                          </span>
                      </TableCell>
                      <TableCell className="text-right text-slate-900 font-medium">
                        {formatCurrency(item.nilai_perolehan)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
        </CardContent>
      </Card>
    </div>
  );
}
