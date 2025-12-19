import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Save, Search, Printer, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { formatCurrency } from '../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function StockOpnamePage() {
  const [activeTab, setActiveTab] = useState("persediaan");
  
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
            <OpnamePersediaan />
        </TabsContent>
        
        <TabsContent value="aset" className="mt-4">
            <OpnameAsetTetap />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OpnamePersediaan() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [opnameData, setOpnameData] = useState({});
    
    // Printing State
    const [isPrinting, setIsPrinting] = useState(false);
    const [groupedItems, setGroupedItems] = useState({});
    const componentRef = useRef();

    useEffect(() => {
        fetchItems();
    }, [search]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/persediaan/', { params: { limit: 1000, search } }); // Fetch all for grouping
            setItems(res.data.data || []);
            
            // Group for printing
            const grouped = (res.data.data || []).reduce((acc, item) => {
                const subKel = item.detail_lainnya?.sub_sub_kelompok || item.golongan_barang || 'Lainnya';
                if (!acc[subKel]) acc[subKel] = [];
                acc[subKel].push(item);
                return acc;
            }, {});
            setGroupedItems(grouped);
            
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
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
            setOpnameData(prev => { const n = {...prev}; delete n[item._id]; return n; });
        } catch (e) { toast.error("Gagal simpan"); }
    };

    return (
        <Card className="border-blue-200">
            <CardHeader className="flex flex-row justify-between items-center bg-blue-50/50 pb-4">
                <CardTitle className="text-blue-800">Stock Opname Persediaan (Per Sub Kelompok)</CardTitle>
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
                    <Button onClick={handlePrint} variant="outline" className="bg-white hover:bg-slate-50">
                        <Printer className="mr-2 h-4 w-4"/> Cetak Laporan
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Screen View */}
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

                {/* Print View (Hidden on Screen) */}
                <div className="hidden print:block p-8">
                    <style>{`
                        @media print {
                            @page { size: A4; margin: 1cm; }
                            body { -webkit-print-color-adjust: exact; }
                            .hidden-print { display: none !important; }
                            .page-break { page-break-before: always; }
                        }
                    `}</style>
                    
                    {Object.entries(groupedItems).map(([group, groupItems], idx) => (
                        <div key={group} className={idx > 0 ? 'page-break' : ''}>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold uppercase">BERITA ACARA STOCK OPNAME PERSEDIAAN</h2>
                                <p className="text-sm">Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                                <div className="mt-2 text-left font-bold border-b pb-2">Sub Kelompok: {group}</div>
                            </div>

                            <table className="w-full text-sm border-collapse border border-slate-400">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border border-slate-400 p-2">No</th>
                                        <th className="border border-slate-400 p-2">Kode Barang</th>
                                        <th className="border border-slate-400 p-2">Nama Barang</th>
                                        <th className="border border-slate-400 p-2 text-center">Satuan</th>
                                        <th className="border border-slate-400 p-2 text-center">Stok Sistem</th>
                                        <th className="border border-slate-400 p-2 text-center">Stok Fisik</th>
                                        <th className="border border-slate-400 p-2 text-center">Selisih</th>
                                        <th className="border border-slate-400 p-2">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupItems.map((item, i) => (
                                        <tr key={item._id}>
                                            <td className="border border-slate-400 p-2 text-center">{i + 1}</td>
                                            <td className="border border-slate-400 p-2">{item.kode_barang}</td>
                                            <td className="border border-slate-400 p-2">{item.nama_barang}</td>
                                            <td className="border border-slate-400 p-2 text-center">{item.satuan}</td>
                                            <td className="border border-slate-400 p-2 text-center">{item.stok}</td>
                                            <td className="border border-slate-400 p-2"></td>
                                            <td className="border border-slate-400 p-2"></td>
                                            <td className="border border-slate-400 p-2"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-12 grid grid-cols-3 gap-8 text-center text-sm break-inside-avoid">
                                <div>
                                    <p>Mengetahui,</p>
                                    <p className="font-bold mb-16">Kuasa Pengguna Barang</p>
                                    <p>( ................................. )</p>
                                    <p>NIP. .................................</p>
                                </div>
                                <div>
                                    <p>Diperiksa Oleh,</p>
                                    <p className="font-bold mb-16">Pejabat Penatausahaan</p>
                                    <p>( ................................. )</p>
                                    <p>NIP. .................................</p>
                                </div>
                                <div>
                                    <p>Dibuat Oleh,</p>
                                    <p className="font-bold mb-16">Pengurus Barang</p>
                                    <p>( ................................. )</p>
                                    <p>NIP. .................................</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function OpnameAsetTetap() {
    const [mode, setMode] = useState('opname'); // opname | inventarisasi
    const [golongan, setGolongan] = useState('All');
    const [items, setItems] = useState([]);
    
    // Fetch Items with filters
    useEffect(() => {
        const fetch = async () => {
            try {
                // Filter logic handled in backend or client
                // For MVP client side filter is fine if data small, but let's assume we fetch all
                const res = await api.get('/api/barang', { params: { limit: 1000 } });
                let filtered = res.data.data;
                if (golongan !== 'All') {
                    // Assuming golongan stored in 'golongan_barang' or code prefix
                    // If simple string match:
                    filtered = filtered.filter(i => i.golongan_barang === golongan || i.detail_lainnya?.golongan === golongan);
                }
                setItems(filtered);
            } catch (e) { console.error(e); }
        };
        fetch();
    }, [golongan]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Kegiatan Aset Tetap</CardTitle>
                    <div className="flex gap-2">
                        <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Pilih Kegiatan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="opname">Stock Opname (Cek Keberadaan)</SelectItem>
                                <SelectItem value="inventarisasi">Inventarisasi (Sensus Detail)</SelectItem>
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
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                        <FileText className="mx-auto h-12 w-12 text-slate-300 mb-2"/>
                        <h3 className="font-bold text-lg text-slate-700">Formulir Stock Opname Aset Tetap</h3>
                        <p className="max-w-md mx-auto">Menampilkan daftar {items.length} aset untuk pengecekan fisik (Ada/Tidak Ada/Rusak).</p>
                        {/* Table would go here similar to Persediaan but simpler (Checklist) */}
                        <Button className="mt-4">Mulai Opname</Button>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg bg-blue-50/30 border-blue-200">
                        <Search className="mx-auto h-12 w-12 text-blue-300 mb-2"/>
                        <h3 className="font-bold text-lg text-blue-700">Kertas Kerja Inventarisasi (Sensus)</h3>
                        <p className="max-w-md mx-auto">Format sensus detail sesuai golongan <strong>{golongan}</strong>. Meliputi cek fisik, kondisi, lokasi, dan penanggung jawab.</p>
                        <Button className="mt-4 bg-blue-600">Download Kertas Kerja (PDF)</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}