import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Save, Search, Printer, FileText, CheckCircle, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import StockOpnamePrintView from './StockOpnamePrintView';
import { useReactToPrint } from 'react-to-print';

export default function StockOpnamePage() {
  const [activeTab, setActiveTab] = useState("persediaan");
  const [instansi, setInstansi] = useState(null);

  useEffect(() => {
      fetchInstansi();
  }, []);

  const fetchInstansi = async () => {
      try {
          const res = await api.get('/api/settings/instansi');
          setInstansi(res.data);
      } catch (e) { console.error("Failed to fetch instansi info", e); }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            Stock Opname & Inventarisasi
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pencatatan fisik, penyesuaian stok, dan cetak laporan hasil opname.</p>
        </div>
      </div>

      <Tabs defaultValue="persediaan" onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="persediaan" className="px-6">Opname Persediaan</TabsTrigger>
          <TabsTrigger value="aset" className="px-6">Opname Aset Tetap</TabsTrigger>
        </TabsList>

        <TabsContent value="persediaan" className="mt-4">
            <OpnamePersediaan instansi={instansi} />
        </TabsContent>
        
        <TabsContent value="aset" className="mt-4">
            <OpnameAsetTetap />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OpnamePersediaan({ instansi }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [opnameData, setOpnameData] = useState({}); // { id: { fisik: 10, keterangan: 'abc' } }
    
    // Printing
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [groupedItems, setGroupedItems] = useState({});
    const [signatories, setSignatories] = useState({
        kuasa: { nama: '', nip: '' },
        pejabat: { nama: '', nip: '' },
        pengurus: { nama: '', nip: '' }
    });
    
    const printRef = useRef();

    useEffect(() => {
        fetchItems();
        // Load signatories from local storage if available
        const saved = localStorage.getItem('opname_signatories');
        if (saved) setSignatories(JSON.parse(saved));
    }, [search]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/persediaan/', { params: { limit: 2000, search } });
            setItems(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreparePrint = () => {
        // Prepare groups
        const grouped = items.reduce((acc, item) => {
            const subKel = item.detail_lainnya?.sub_sub_kelompok || item.golongan_barang || 'Lainnya';
            if (!acc[subKel]) acc[subKel] = [];
            
            // Attach user input to item for printing
            const input = opnameData[item._id] || {};
            const itemWithInput = { ...item, fisik: input.fisik, keterangan: input.keterangan };
            
            acc[subKel].push(itemWithInput);
            return acc;
        }, {});
        setGroupedItems(grouped);
        setIsPrintModalOpen(true);
    };

    const handlePrint = () => {
        // Save signatories preference
        localStorage.setItem('opname_signatories', JSON.stringify(signatories));
        window.print(); // Browser print triggers @media print
        setIsPrintModalOpen(false);
    };

    const handleInputChange = (id, field, value) => {
        setOpnameData(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSubmitOpname = async (item) => {
        const data = opnameData[item._id];
        if (!data || data.fisik === undefined || data.fisik === '') return toast.error("Isi jumlah fisik");
        
        try {
            await api.post('/api/opname/', {
                barang_id: item._id,
                stok_fisik: parseInt(data.fisik),
                asset_type: 'persediaan',
                keterangan: data.keterangan
            });
            toast.success("Tersimpan");
            fetchItems();
            // Optional: Clear input or keep it to show confirmed value?
            // Keeping it is better for UX so they see what they just entered.
        } catch (e) { toast.error("Gagal simpan"); }
    };

    return (
        <>
            <Card className="border-blue-200">
                <CardHeader className="flex flex-row justify-between items-center bg-blue-50/50 pb-4">
                    <CardTitle className="text-blue-800">Stock Opname Persediaan</CardTitle>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input 
                                placeholder="Cari Persediaan..." 
                                className="pl-9 h-9 bg-white" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={handlePreparePrint} variant="outline" className="bg-white hover:bg-slate-50">
                            <Printer className="mr-2 h-4 w-4"/> Cetak Berita Acara
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[70vh]">
                        <Table>
                            <TableHeader className="bg-slate-100 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead>Kode & Nama Barang</TableHead>
                                    <TableHead>Sub Kelompok</TableHead>
                                    <TableHead className="text-center">Stok Sistem</TableHead>
                                    <TableHead className="text-center w-[120px] bg-blue-50">Fisik</TableHead>
                                    <TableHead className="text-center">Selisih</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                                ) : items.map(item => {
                                    const input = opnameData[item._id] || {};
                                    const fisik = input.fisik ? parseInt(input.fisik) : null;
                                    const diff = fisik !== null ? fisik - item.stok : null;
                                    return (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="font-bold">{item.nama_barang}</div>
                                                <div className="text-xs font-mono text-slate-500">{item.kode_barang}</div>
                                            </TableCell>
                                            <TableCell className="text-xs">{item.detail_lainnya?.sub_sub_kelompok || item.golongan_barang}</TableCell>
                                            <TableCell className="text-center font-bold">{item.stok}</TableCell>
                                            <TableCell className="p-1 bg-blue-50/30">
                                                <Input 
                                                    type="number" 
                                                    className="h-8 text-center text-blue-700 font-bold" 
                                                    placeholder="0"
                                                    value={input.fisik || ''}
                                                    onChange={(e) => handleInputChange(item._id, 'fisik', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {diff !== null && diff !== 0 && (
                                                    <Badge variant={diff < 0 ? "destructive" : "default"}>{diff > 0 ? `+${diff}` : diff}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input 
                                                    className="h-8 text-xs" 
                                                    placeholder="Ket..."
                                                    value={input.keterangan || ''}
                                                    onChange={(e) => handleInputChange(item._id, 'keterangan', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {input.fisik !== undefined && (
                                                    <Button size="sm" onClick={() => handleSubmitOpname(item)}><Save className="h-4 w-4"/></Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Print Settings Modal */}
            <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pengaturan Cetak Berita Acara</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                        <div className="space-y-2 border p-3 rounded bg-slate-50">
                            <Label className="font-bold text-xs uppercase text-slate-500">Kuasa Pengguna Barang</Label>
                            <Input placeholder="Nama Lengkap" value={signatories.kuasa.nama} onChange={e => setSignatories({...signatories, kuasa: {...signatories.kuasa, nama: e.target.value}})} className="h-8 text-sm" />
                            <Input placeholder="NIP" value={signatories.kuasa.nip} onChange={e => setSignatories({...signatories, kuasa: {...signatories.kuasa, nip: e.target.value}})} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-2 border p-3 rounded bg-slate-50">
                            <Label className="font-bold text-xs uppercase text-slate-500">Pejabat Penatausahaan</Label>
                            <Input placeholder="Nama Lengkap" value={signatories.pejabat.nama} onChange={e => setSignatories({...signatories, pejabat: {...signatories.pejabat, nama: e.target.value}})} className="h-8 text-sm" />
                            <Input placeholder="NIP" value={signatories.pejabat.nip} onChange={e => setSignatories({...signatories, pejabat: {...signatories.pejabat, nip: e.target.value}})} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-2 border p-3 rounded bg-slate-50">
                            <Label className="font-bold text-xs uppercase text-slate-500">Pengurus Barang</Label>
                            <Input placeholder="Nama Lengkap" value={signatories.pengurus.nama} onChange={e => setSignatories({...signatories, pengurus: {...signatories.pengurus, nama: e.target.value}})} className="h-8 text-sm" />
                            <Input placeholder="NIP" value={signatories.pengurus.nip} onChange={e => setSignatories({...signatories, pengurus: {...signatories.pengurus, nip: e.target.value}})} className="h-8 text-sm" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>Batal</Button>
                        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                            <Printer className="mr-2 h-4 w-4" /> Cetak Sekarang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hidden Print Component */}
            <StockOpnamePrintView 
                ref={printRef}
                items={items}
                groupedItems={groupedItems}
                instansi={instansi}
                date={new Date()}
                signatories={signatories}
            />
        </>
    );
}

function OpnameAsetTetap() {
    const [mode, setMode] = useState('opname'); // opname | inventarisasi
    const [golongan, setGolongan] = useState('All');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updates, setUpdates] = useState({}); // Stores changes

    useEffect(() => {
        fetchItems();
    }, [golongan]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/barang', { params: { limit: 1000 } });
            let filtered = res.data.data || [];
            if (golongan !== 'All') {
                filtered = filtered.filter(i => i.golongan_barang === golongan || i.detail_lainnya?.golongan === golongan);
            }
            setItems(filtered);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleUpdateChange = (id, field, value) => {
        setUpdates(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSave = async (item) => {
        const update = updates[item._id];
        if (!update) return;

        try {
            // Determine endpoint based on mode
            // For now, we reuse the opname endpoint for tracking "Check Results"
            // Or we update the asset directly if Inventarisasi
            
            if (mode === 'opname') {
                 await api.post('/api/opname/', {
                    barang_id: item._id,
                    stok_fisik: update.status === 'Ada' ? 1 : 0, // 1=Ada, 0=Hilang
                    asset_type: 'barang',
                    keterangan: `${update.status} - ${update.keterangan || ''}`
                });
            } else {
                // Inventarisasi: Update asset details directly
                // This would typically go to PUT /api/barang/{id}
                // For MVP let's just log opname as well but with more detail? 
                // No, Inventarisasi usually means updating the master record.
                toast.info("Fitur update master aset dalam pengembangan");
                return;
            }
            
            toast.success("Hasil Opname Disimpan");
            // Clear update for this item
            setUpdates(prev => { const n = {...prev}; delete n[item._id]; return n; });
        } catch (e) { toast.error("Gagal simpan"); }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <CardTitle>Kegiatan Aset Tetap</CardTitle>
                    <div className="flex gap-2">
                        <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Pilih Kegiatan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="opname">Stock Opname (Cek Fisik)</SelectItem>
                                <SelectItem value="inventarisasi">Inventarisasi (Sensus)</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Select value={golongan} onValueChange={setGolongan}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Pilih Golongan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Semua Golongan</SelectItem>
                                <SelectItem value="Tanah">Tanah</SelectItem>
                                <SelectItem value="Peralatan dan Mesin">Peralatan dan Mesin</SelectItem>
                                <SelectItem value="Gedung dan Bangunan">Gedung dan Bangunan</SelectItem>
                                <SelectItem value="Jalan, Irigasi dan Jaringan">Jalan, Irigasi</SelectItem>
                                <SelectItem value="Aset Tetap Lainnya">Aset Tetap Lainnya</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {mode === 'opname' ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode Barang</TableHead>
                                    <TableHead>NUP</TableHead>
                                    <TableHead>Nama Barang</TableHead>
                                    <TableHead>Tahun</TableHead>
                                    <TableHead>Lokasi</TableHead>
                                    <TableHead className="w-[200px]">Status Keberadaan</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map(item => {
                                    const update = updates[item._id] || {};
                                    return (
                                        <TableRow key={item._id}>
                                            <TableCell className="font-mono text-xs">{item.kode_barang}</TableCell>
                                            <TableCell className="text-center">{item.nup}</TableCell>
                                            <TableCell>
                                                <div className="font-bold text-sm">{item.nama_barang}</div>
                                                <div className="text-xs text-slate-500">{item.merk} {item.tipe}</div>
                                            </TableCell>
                                            <TableCell>{item.tahun_anggaran || '-'}</TableCell>
                                            <TableCell className="text-xs">{item.lokasi_fisik || item.ruang || '-'}</TableCell>
                                            <TableCell>
                                                <Select value={update.status || ''} onValueChange={(v) => handleUpdateChange(item._id, 'status', v)}>
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Pilih Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Ada">✅ Ada / Baik</SelectItem>
                                                        <SelectItem value="Rusak">⚠️ Ada / Rusak</SelectItem>
                                                        <SelectItem value="Hilang">❌ Tidak Ditemukan</SelectItem>
                                                        <SelectItem value="Dipinjam">🔄 Dipinjam / Dinas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    className="h-8 text-xs" 
                                                    placeholder="Ket..." 
                                                    value={update.keterangan || ''}
                                                    onChange={e => handleUpdateChange(item._id, 'keterangan', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {update.status && (
                                                    <Button size="sm" onClick={() => handleSave(item)}><Save className="h-4 w-4"/></Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 border border-dashed rounded-lg">
                        <Search className="mx-auto h-12 w-12 text-blue-300 mb-4"/>
                        <h3 className="font-bold text-lg text-blue-900">Modul Inventarisasi Detail</h3>
                        <p className="max-w-md mx-auto text-slate-600 mb-6">
                            Fitur ini digunakan untuk melakukan sensus detail (update kondisi, lokasi, pengguna, foto terkini) secara massal.
                        </p>
                        <Button variant="outline">Download Kertas Kerja Sensus (Excel)</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
