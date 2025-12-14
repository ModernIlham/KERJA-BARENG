import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function StockOpname() {
  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [opnameHistory, setOpnameHistory] = useState([]);
  
  const { register, handleSubmit, reset } = useForm();

  // Load Barang for Selection
  useEffect(() => {
    const loadData = async () => {
        const [brg, hist] = await Promise.all([
            api.get('/api/barang'),
            api.get('/api/opname')
        ]);
        setBarangList(brg.data);
        setOpnameHistory(hist.data);
    };
    loadData();
  }, []);

  const onSubmit = async (data) => {
    if (!selectedItem) return toast.error("Pilih barang terlebih dahulu");
    
    setLoading(true);
    try {
        await api.post('/api/opname', {
            barang_id: selectedItem._id,
            stok_fisik: parseInt(data.stok_fisik),
            keterangan: data.keterangan
        });
        toast.success("Opname berhasil disimpan & Stok diperbarui");
        reset();
        setSelectedItem(null);
        // Refresh History
        const hist = await api.get('/api/opname');
        setOpnameHistory(hist.data);
    } catch (error) {
        toast.error("Gagal menyimpan opname");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Stock Opname</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Form Opname Fisik</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cari Barang</label>
                            <select 
                                className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                onChange={(e) => {
                                    const item = barangList.find(b => b._id === e.target.value);
                                    setSelectedItem(item);
                                }}
                            >
                                <option value="">-- Pilih Barang --</option>
                                {barangList.map(b => (
                                    <option key={b._id} value={b._id}>{b.nama_barang} (NUP: {b.nup})</option>
                                ))}
                            </select>
                        </div>
                        
                        {selectedItem && (
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded text-sm space-y-2">
                                <div className="grid grid-cols-2">
                                    <span className="text-slate-500">Stok Sistem:</span>
                                    <span className="font-bold">{selectedItem.stok} {selectedItem.satuan}</span>
                                </div>
                                <div className="grid grid-cols-2">
                                    <span className="text-slate-500">Merk/Tipe:</span>
                                    <span>{selectedItem.merk} {selectedItem.tipe}</span>
                                </div>
                                <div className="grid grid-cols-2">
                                    <span className="text-slate-500">Lokasi:</span>
                                    <span>{selectedItem.lokasi_fisik}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Stok Fisik (Aktual)</label>
                                <Input type="number" {...register('stok_fisik', { required: true })} placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Keterangan / Temuan</label>
                                <Input {...register('keterangan')} placeholder="Contoh: Barang rusak ringan 1 unit..." />
                            </div>
                            <Button disabled={loading || !selectedItem} className="w-full bg-slate-900 text-white">
                                {loading ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                                Simpan Opname
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Riwayat Opname Terakhir</CardTitle></CardHeader>
                <CardContent>
                    <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tgl</TableHead>
                                    <TableHead>Barang</TableHead>
                                    <TableHead>Fisik</TableHead>
                                    <TableHead>Selisih</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {opnameHistory.map((h, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-xs text-slate-500">
                                            {new Date(h.tanggal).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">{h.nama_barang}</TableCell>
                                        <TableCell className="text-center font-bold">{h.stok_fisik}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                h.selisih === 0 ? 'bg-green-100 text-green-700' : 
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {h.selisih > 0 ? `+${h.selisih}` : h.selisih}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
