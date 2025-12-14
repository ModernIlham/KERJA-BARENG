import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Save, Search, RefreshCw, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

export default function StockOpnamePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('persediaan'); // 'persediaan' or 'barang'
  
  // Opname State: { itemId: { fisik: number, keterangan: string } }
  const [opnameData, setOpnameData] = useState({});
  const [submitting, setSubmitting] = useState(null); // itemId currently submitting

  useEffect(() => {
    fetchItems();
  }, [activeType, search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const endpoint = activeType === 'persediaan' ? '/api/persediaan/' : '/api/barang';
      const params = { limit: 50, search }; 
      const res = await api.get(endpoint, { params });
      setItems(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id, field, value) => {
    setOpnameData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSubmitOpname = async (item) => {
    const data = opnameData[item._id];
    if (!data || data.fisik === undefined || data.fisik === '') {
      toast.error("Masukkan jumlah fisik terlebih dahulu");
      return;
    }

    // Confirm if large difference
    const diff = parseInt(data.fisik) - (item.stok || 0);
    if (Math.abs(diff) > 10 && !window.confirm(`Selisih cukup besar (${diff}). Yakin simpan?`)) {
      return;
    }

    setSubmitting(item._id);
    try {
      await api.post('/api/opname/', {
        barang_id: item._id,
        stok_fisik: parseInt(data.fisik),
        asset_type: activeType,
        keterangan: data.keterangan
      });
      
      toast.success("Opname tersimpan");
      
      // Clear input and refresh item
      setOpnameData(prev => {
        const next = { ...prev };
        delete next[item._id];
        return next;
      });
      fetchItems(); // Refresh to see updated stock
      
    } catch (err) {
      toast.error("Gagal menyimpan opname");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-blue-600" />
            Stock Opname
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pencatatan dan penyesuaian stok fisik</p>
        </div>
        
        <div className="flex gap-2">
            <div className="bg-slate-100 p-1 rounded-md flex">
                <button 
                    onClick={() => setActiveType('persediaan')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeType === 'persediaan' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                >
                    Persediaan
                </button>
                <button 
                    onClick={() => setActiveType('barang')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeType === 'barang' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                >
                    Aset Tetap
                </button>
            </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
                <CardTitle className="text-base font-medium">Input Hasil Opname</CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Cari Barang..." 
                        className="pl-9 h-9" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="border-t">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[150px]">Kode Barang</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead className="text-center w-[100px]">Stok Sistem</TableHead>
                            <TableHead className="w-[120px] bg-blue-50 text-blue-700 font-bold border-l border-r border-blue-100 text-center">Fisik (Input)</TableHead>
                            <TableHead className="text-center w-[100px]">Selisih</TableHead>
                            <TableHead className="w-[200px]">Keterangan</TableHead>
                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin mx-auto h-6 w-6 text-slate-400"/></TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Tidak ada data.</TableCell></TableRow>
                        ) : (
                            items.map((item) => {
                                const input = opnameData[item._id] || {};
                                const fisik = input.fisik !== undefined && input.fisik !== '' ? parseInt(input.fisik) : null;
                                const system = item.stok || 0;
                                const diff = fisik !== null ? fisik - system : null;
                                
                                return (
                                    <TableRow key={item._id} className={diff !== null && diff !== 0 ? 'bg-yellow-50' : ''}>
                                        <TableCell className="font-mono text-xs">{item.kode_barang}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{item.nama_barang}</div>
                                            <div className="text-xs text-slate-500">{item.merk} {item.tipe}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{system}</TableCell>
                                        <TableCell className="p-1 border-l border-r border-blue-100 bg-blue-50/50">
                                            <Input 
                                                type="number" 
                                                className="h-8 text-center font-bold text-blue-700 border-blue-200"
                                                value={input.fisik || ''}
                                                onChange={(e) => handleInputChange(item._id, 'fisik', e.target.value)}
                                                placeholder="0"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {diff !== null && (
                                                <Badge variant={diff === 0 ? 'outline' : diff < 0 ? 'destructive' : 'default'} className="text-xs">
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <Input 
                                                className="h-8 text-xs" 
                                                placeholder="Ket. selisih..."
                                                value={input.keterangan || ''}
                                                onChange={(e) => handleInputChange(item._id, 'keterangan', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right p-2">
                                            {fisik !== null && (
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleSubmitOpname(item)}
                                                    disabled={submitting === item._id}
                                                >
                                                    {submitting === item._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
