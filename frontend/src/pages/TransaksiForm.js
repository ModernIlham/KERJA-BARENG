import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TransaksiList() {
  const [transaksi, setTransaksi] = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { register, handleSubmit, setValue, reset, watch } = useForm({
    defaultValues: { jenis: 'KELUAR' }
  });

  const selectedJenis = watch('jenis');

  const fetchData = async () => {
    try {
      const [txRes, brgRes, pgwRes] = await Promise.all([
        api.get('/api/transaksi'),
        api.get('/api/barang'),
        api.get('/api/pegawai')
      ]);
      setTransaksi(txRes.data);
      setBarangList(brgRes.data);
      setPegawaiList(pgwRes.data);
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/api/transaksi', {
        ...data,
        jumlah: parseInt(data.jumlah)
      });
      toast.success("Transaksi berhasil dicatat");
      reset({ jenis: selectedJenis }); // Keep selected type
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal mencatat transaksi");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="border-slate-200 shadow-sm sticky top-24">
          <CardHeader>
            <CardTitle>Catat Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Transaksi</label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={selectedJenis === 'MASUK' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedJenis === 'MASUK' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                    onClick={() => setValue('jenis', 'MASUK')}
                  >
                    Masuk
                  </Button>
                  <Button 
                    type="button"
                    variant={selectedJenis === 'KELUAR' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedJenis === 'KELUAR' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                    onClick={() => setValue('jenis', 'KELUAR')}
                  >
                    Keluar
                  </Button>
                  <Button 
                    type="button"
                    variant={selectedJenis === 'OPNAME' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedJenis === 'OPNAME' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                    onClick={() => setValue('jenis', 'OPNAME')}
                  >
                    Opname
                  </Button>
                </div>
                <input type="hidden" {...register('jenis')} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Aset (Barang)</label>
                <select 
                  {...register('barang_id', { required: true })} 
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Pilih Barang --</option>
                  {barangList.map(b => (
                    <option key={b._id} value={b._id}>
                        {b.nama_barang} | NUP: {b.nup} | Stok: {b.stok}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah</label>
                <Input type="number" {...register('jumlah', { required: true, min: 1 })} placeholder="Contoh: 1" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pihak Terkait (Pegawai/Unit)</label>
                <select 
                  {...register('pegawai_id')} 
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {pegawaiList.map(p => (
                    <option key={p._id} value={p._id}>{p.nama_lengkap} - {p.jabatan}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Keterangan / No. Dokumen</label>
                <Input {...register('keterangan')} placeholder="No. BA Serah Terima..." />
              </div>

              <Button type="submit" className="w-full bg-slate-900 mt-4">Simpan Transaksi</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transaksi Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Pihak Terkait</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : transaksi.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Belum ada transaksi</TableCell></TableRow>
                  ) : (
                    transaksi.map((tx) => (
                      <TableRow key={tx._id} className="hover:bg-slate-50">
                        <TableCell className="text-xs text-slate-500">
                          {new Date(tx.timestamp).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              tx.jenis === 'MASUK' ? 'text-green-700 bg-green-100' : 
                              tx.jenis === 'KELUAR' ? 'text-amber-700 bg-amber-100' :
                              'text-blue-700 bg-blue-100'
                          }`}>
                            {tx.jenis}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                            {tx.nama_barang}
                            {tx.nup && <span className="text-xs text-slate-400 block">NUP: {tx.nup}</span>}
                        </TableCell>
                        <TableCell className="font-bold">{tx.jumlah}</TableCell>
                        <TableCell className="text-sm text-slate-600">{tx.nama_pegawai || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
