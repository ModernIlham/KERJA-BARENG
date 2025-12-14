import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useParams, useNavigate } from 'react-router-dom';

export default function TransaksiList() {
  const { type } = useParams(); // masuk, keluar, riwayat
  const navigate = useNavigate();
  
  const [transaksi, setTransaksi] = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarangDetail, setSelectedBarangDetail] = useState(null);
  
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { jenis: type === 'masuk' ? 'MASUK' : 'KELUAR' }
  });

  const selectedBarangId = watch('barang_id');
  const currentTab = type || 'riwayat';

  useEffect(() => {
      // Sync tab with form value if needed
      if(type === 'masuk') setValue('jenis', 'MASUK');
      if(type === 'keluar') setValue('jenis', 'KELUAR');
  }, [type, setValue]);

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

  useEffect(() => {
      if (selectedBarangId) {
          const item = barangList.find(b => b._id === selectedBarangId);
          setSelectedBarangDetail(item);
      } else {
          setSelectedBarangDetail(null);
      }
  }, [selectedBarangId, barangList]);

  const onSubmit = async (data) => {
    if (data.jenis === 'KELUAR' && selectedBarangDetail && parseInt(data.jumlah) > selectedBarangDetail.stok) {
        return toast.error("Stok tidak mencukupi!");
    }

    try {
      await api.post('/api/transaksi', {
        ...data,
        jumlah: parseInt(data.jumlah)
      });
      toast.success("Transaksi berhasil dicatat");
      reset({ jenis: data.jenis });
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal mencatat transaksi");
    }
  };

  const handleTabChange = (val) => {
      navigate(`/transaksi/${val}`);
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Transaksi Gudang</h1>
        
        <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="bg-slate-100">
                <TabsTrigger value="masuk">Barang Masuk</TabsTrigger>
                <TabsTrigger value="keluar">Barang Keluar</TabsTrigger>
                <TabsTrigger value="riwayat">Riwayat Transaksi</TabsTrigger>
            </TabsList>

            <TabsContent value="masuk">
                <Card className="max-w-2xl">
                    <CardHeader><CardTitle>Form Barang Masuk</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <input type="hidden" {...register('jenis')} value="MASUK" />
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pilih Barang</label>
                                <select {...register('barang_id', {required:true})} className="w-full border rounded p-2 text-sm">
                                    <option value="">-- Pilih --</option>
                                    {barangList.map(b => <option key={b._id} value={b._id}>{b.nama_barang} (Stok: {b.stok})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Masuk</label>
                                <Input type="number" {...register('jumlah', {required:true})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nilai Satuan (Rp)</label>
                                <Input type="number" {...register('nilai_satuan')} placeholder="Opsional (update harga)" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">No. Dokumen / BAST</label>
                                <Input {...register('dokumen_ref')} placeholder="No. BAST..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Diterima Dari (Penyedia/Pihak Lain)</label>
                                <Input {...register('keterangan')} placeholder="PT. Vendor..." />
                            </div>
                             <div className="space-y-2">
                                <label className="text-sm font-medium">Penerima (Pegawai)</label>
                                <select {...register('pegawai_id')} className="w-full border rounded p-2 text-sm">
                                    <option value="">-- Pilih --</option>
                                    {pegawaiList.map(p => <option key={p._id} value={p._id}>{p.nama_lengkap}</option>)}
                                </select>
                            </div>
                            <Button className="w-full bg-green-700 hover:bg-green-800">Simpan Barang Masuk</Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="keluar">
                <Card className="max-w-2xl">
                    <CardHeader><CardTitle>Form Barang Keluar</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <input type="hidden" {...register('jenis')} value="KELUAR" />
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pilih Barang</label>
                                <select {...register('barang_id', {required:true})} className="w-full border rounded p-2 text-sm">
                                    <option value="">-- Pilih --</option>
                                    {barangList.map(b => <option key={b._id} value={b._id}>{b.nama_barang} (Stok: {b.stok})</option>)}
                                </select>
                                {selectedBarangDetail && (
                                    <div className="text-xs text-slate-500">Stok Tersedia: {selectedBarangDetail.stok}</div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Keluar</label>
                                <Input type="number" {...register('jumlah', {required:true})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Penerima (Pegawai)</label>
                                <select {...register('pegawai_id')} className="w-full border rounded p-2 text-sm">
                                    <option value="">-- Pilih --</option>
                                    {pegawaiList.map(p => <option key={p._id} value={p._id}>{p.nama_lengkap} ({p.jabatan})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">No. Dokumen Permintaan</label>
                                <Input {...register('dokumen_ref')} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Keperluan</label>
                                <Input {...register('keterangan')} />
                            </div>
                            <Button className="w-full bg-amber-600 hover:bg-amber-700">Proses Barang Keluar</Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="riwayat">
                <Card>
                  <CardHeader>
                    <CardTitle>Riwayat Transaksi Terkini</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Barang</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Pihak Terkait</TableHead>
                            <TableHead>Dokumen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transaksi.map((tx) => (
                              <TableRow key={tx._id}>
                                <TableCell className="text-xs">{new Date(tx.timestamp).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      tx.jenis === 'MASUK' ? 'bg-green-100 text-green-700' : 
                                      tx.jenis === 'KELUAR' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {tx.jenis}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm font-medium">{tx.nama_barang}</TableCell>
                                <TableCell className="font-bold">{tx.jumlah}</TableCell>
                                <TableCell className="text-xs">{tx.nama_pegawai}</TableCell>
                                <TableCell className="text-xs font-mono">{tx.dokumen_ref || '-'}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
