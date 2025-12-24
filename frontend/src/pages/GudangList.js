import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { 
    Warehouse, Plus, Search, Package, ArrowLeftRight, ArrowDownToLine, 
    Edit, Trash, Eye, ChevronRight, Building2, RotateCcw, Loader2, MapPin, User, History
} from 'lucide-react';

export default function GudangList() {
    const [activeTab, setActiveTab] = useState('gudang');
    const [gudangList, setGudangList] = useState([]);
    const [movements, setMovements] = useState([]);
    const [selectedGudang, setSelectedGudang] = useState(null);
    const [gudangAssets, setGudangAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Modal states
    const [isGudangModalOpen, setIsGudangModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);
    const [editingGudang, setEditingGudang] = useState(null);

    // Form states
    const [gudangForm, setGudangForm] = useState({
        nama_gudang: '', kode_gudang: '', lokasi: '', alamat: '', 
        kapasitas: '', penanggung_jawab: '', keterangan: ''
    });

    // Return form
    const [returnForm, setReturnForm] = useState({
        barang_id: '', gudang_id: '', alasan: 'Pengembalian', keterangan: ''
    });
    const [searchBarang, setSearchBarang] = useState('');
    const [barangResults, setBarangResults] = useState([]);
    const [selectedBarang, setSelectedBarang] = useState(null);

    // Summary
    const [summary, setSummary] = useState({ total_gudang: 0, total_aset: 0, total_nilai: 0 });

    // Load data
    useEffect(() => {
        loadGudangList();
        loadMovements();
        loadSummary();
    }, []);

    const loadGudangList = async () => {
        try {
            const res = await api.get('/api/gudang');
            setGudangList(res.data);
        } catch (e) {
            toast.error('Gagal memuat daftar gudang');
        }
    };

    const loadMovements = async () => {
        try {
            const res = await api.get('/api/gudang/movements/list?limit=50');
            setMovements(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadSummary = async () => {
        try {
            const res = await api.get('/api/gudang/summary');
            setSummary(res.data.summary);
        } catch (e) {
            console.error(e);
        }
    };

    const loadGudangAssets = async (gudangId) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/gudang/assets/${gudangId}?search=${search}`);
            setGudangAssets(res.data);
        } catch (e) {
            toast.error('Gagal memuat aset gudang');
        } finally {
            setLoading(false);
        }
    };

    // Gudang CRUD
    const openAddGudangModal = () => {
        setEditingGudang(null);
        setGudangForm({
            nama_gudang: '', kode_gudang: '', lokasi: '', alamat: '', 
            kapasitas: '', penanggung_jawab: '', keterangan: ''
        });
        setIsGudangModalOpen(true);
    };

    const openEditGudangModal = (gudang) => {
        setEditingGudang(gudang);
        setGudangForm({
            nama_gudang: gudang.nama_gudang || '',
            kode_gudang: gudang.kode_gudang || '',
            lokasi: gudang.lokasi || '',
            alamat: gudang.alamat || '',
            kapasitas: gudang.kapasitas || '',
            penanggung_jawab: gudang.penanggung_jawab || '',
            keterangan: gudang.keterangan || ''
        });
        setIsGudangModalOpen(true);
    };

    const saveGudang = async () => {
        if (!gudangForm.nama_gudang || !gudangForm.kode_gudang) {
            toast.error('Nama dan Kode Gudang wajib diisi');
            return;
        }

        setLoading(true);
        try {
            if (editingGudang) {
                await api.put(`/api/gudang/${editingGudang.id}`, gudangForm);
                toast.success('Gudang berhasil diupdate');
            } else {
                await api.post('/api/gudang', gudangForm);
                toast.success('Gudang berhasil ditambahkan');
            }
            setIsGudangModalOpen(false);
            loadGudangList();
            loadSummary();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Gagal menyimpan gudang');
        } finally {
            setLoading(false);
        }
    };

    const deleteGudang = async (gudang) => {
        if (!window.confirm(`Hapus gudang "${gudang.nama_gudang}"?`)) return;
        
        try {
            await api.delete(`/api/gudang/${gudang.id}`);
            toast.success('Gudang berhasil dihapus');
            loadGudangList();
            loadSummary();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Gagal menghapus gudang');
        }
    };

    // Return Asset
    const openReturnModal = () => {
        setReturnForm({ barang_id: '', gudang_id: '', alasan: 'Pengembalian', keterangan: '' });
        setSelectedBarang(null);
        setSearchBarang('');
        setBarangResults([]);
        setIsReturnModalOpen(true);
    };

    const searchBarangDipinjam = async () => {
        if (!searchBarang.trim()) return;
        
        try {
            // Search for assets that are currently held by employees (Dipinjamkan status)
            const res = await api.get('/api/barang', {
                params: { 
                    search: searchBarang, 
                    limit: 50,
                    filter_status_aset: 'Dipinjamkan'
                }
            });
            setBarangResults(res.data.data);
        } catch (e) {
            toast.error('Gagal mencari barang');
        }
    };

    const submitReturn = async () => {
        if (!returnForm.barang_id || !returnForm.gudang_id) {
            toast.error('Pilih barang dan gudang tujuan');
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/gudang/return-asset', returnForm);
            toast.success('Aset berhasil dikembalikan ke gudang');
            setIsReturnModalOpen(false);
            loadGudangList();
            loadMovements();
            loadSummary();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Gagal mengembalikan aset');
        } finally {
            setLoading(false);
        }
    };

    // View Assets in Gudang
    const viewGudangAssets = (gudang) => {
        setSelectedGudang(gudang);
        setSearch('');
        loadGudangAssets(gudang.id);
        setIsAssetsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Gudang</h1>
                    <p className="text-sm text-slate-500">Kelola lokasi penyimpanan dan pergerakan aset</p>
                </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">Total Gudang</p>
                                <p className="text-2xl font-bold">{summary.total_gudang}</p>
                            </div>
                            <Warehouse size={32} className="text-blue-200"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">Total Aset di Gudang</p>
                                <p className="text-2xl font-bold">{summary.total_aset}</p>
                            </div>
                            <Package size={32} className="text-green-200"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">Total Nilai Aset</p>
                                <p className="text-xl font-bold">{formatCurrency(summary.total_nilai)}</p>
                            </div>
                            <Building2 size={32} className="text-purple-200"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                        <Button onClick={openReturnModal} className="w-full bg-orange-600 hover:bg-orange-700">
                            <RotateCcw className="mr-2 h-4 w-4"/> Pengembalian Aset
                        </Button>
                        <p className="text-xs text-orange-600 mt-2 text-center">
                            Kembalikan aset dari pegawai ke gudang
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="gudang">
                        <Warehouse className="mr-2 h-4 w-4"/> Daftar Gudang
                    </TabsTrigger>
                    <TabsTrigger value="movements">
                        <ArrowLeftRight className="mr-2 h-4 w-4"/> Riwayat Pergerakan
                    </TabsTrigger>
                </TabsList>

                {/* Daftar Gudang */}
                <TabsContent value="gudang">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Daftar Gudang Penyimpanan</CardTitle>
                            <Button onClick={openAddGudangModal} className="bg-blue-600">
                                <Plus className="mr-2 h-4 w-4"/> Tambah Gudang
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Kode</TableHead>
                                        <TableHead>Nama Gudang</TableHead>
                                        <TableHead>Lokasi</TableHead>
                                        <TableHead>Penanggung Jawab</TableHead>
                                        <TableHead className="text-center">Jumlah Aset</TableHead>
                                        <TableHead className="text-center w-[120px]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gudangList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                                Belum ada data gudang. Klik &quot;Tambah Gudang&quot; untuk membuat.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        gudangList.map(g => (
                                            <TableRow key={g.id}>
                                                <TableCell className="font-mono text-sm">{g.kode_gudang}</TableCell>
                                                <TableCell className="font-medium">{g.nama_gudang}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{g.lokasi || '-'}</TableCell>
                                                <TableCell className="text-sm">{g.penanggung_jawab || '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                                                        {g.jumlah_aset || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 justify-center">
                                                        <Button variant="ghost" size="sm" onClick={() => viewGudangAssets(g)} title="Lihat Aset">
                                                            <Eye size={14} className="text-blue-600"/>
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => openEditGudangModal(g)} title="Edit">
                                                            <Edit size={14} className="text-slate-600"/>
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => deleteGudang(g)} title="Hapus">
                                                            <Trash size={14} className="text-red-600"/>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Riwayat Pergerakan */}
                <TabsContent value="movements">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Riwayat Pergerakan Aset (50 Terakhir)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Tanggal</TableHead>
                                        <TableHead className="w-[80px]">Jenis</TableHead>
                                        <TableHead>Gudang</TableHead>
                                        <TableHead>Kode / NUP</TableHead>
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead>Dari/Ke Pegawai</TableHead>
                                        <TableHead>Alasan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                                                Belum ada riwayat pergerakan aset.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        movements.map(m => (
                                            <TableRow key={m.id}>
                                                <TableCell className="text-sm">
                                                    {m.timestamp ? new Date(m.timestamp).toLocaleString('id-ID') : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        m.jenis === 'MASUK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {m.jenis === 'MASUK' ? '↓ MASUK' : '↑ KELUAR'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-medium text-sm">{m.gudang_nama}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {m.kode_barang} / {m.nup}
                                                </TableCell>
                                                <TableCell className="text-sm">{m.nama_barang}</TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {m.dari_pegawai_nama || m.ke_pegawai_nama || '-'}
                                                </TableCell>
                                                <TableCell className="text-sm">{m.alasan || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal: Tambah/Edit Gudang */}
            <Dialog open={isGudangModalOpen} onOpenChange={setIsGudangModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingGudang ? 'Edit Gudang' : 'Tambah Gudang Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Kode Gudang *</Label>
                                <Input 
                                    value={gudangForm.kode_gudang} 
                                    onChange={e => setGudangForm({...gudangForm, kode_gudang: e.target.value})}
                                    placeholder="GD-001"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nama Gudang *</Label>
                                <Input 
                                    value={gudangForm.nama_gudang} 
                                    onChange={e => setGudangForm({...gudangForm, nama_gudang: e.target.value})}
                                    placeholder="Gudang Utama"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Lokasi</Label>
                                <Input 
                                    value={gudangForm.lokasi} 
                                    onChange={e => setGudangForm({...gudangForm, lokasi: e.target.value})}
                                    placeholder="Gedung A, Lantai B1"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Kapasitas (unit)</Label>
                                <Input 
                                    type="number"
                                    value={gudangForm.kapasitas} 
                                    onChange={e => setGudangForm({...gudangForm, kapasitas: e.target.value})}
                                    placeholder="1000"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Alamat Lengkap</Label>
                            <Textarea 
                                value={gudangForm.alamat} 
                                onChange={e => setGudangForm({...gudangForm, alamat: e.target.value})}
                                placeholder="Jl. Contoh No. 123..."
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Penanggung Jawab</Label>
                            <Input 
                                value={gudangForm.penanggung_jawab} 
                                onChange={e => setGudangForm({...gudangForm, penanggung_jawab: e.target.value})}
                                placeholder="Nama petugas gudang"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Keterangan</Label>
                            <Textarea 
                                value={gudangForm.keterangan} 
                                onChange={e => setGudangForm({...gudangForm, keterangan: e.target.value})}
                                placeholder="Catatan tambahan..."
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsGudangModalOpen(false)}>Batal</Button>
                            <Button onClick={saveGudang} disabled={loading} className="bg-blue-600">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Simpan
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Pengembalian Aset */}
            <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="text-orange-600"/> Pengembalian Aset ke Gudang
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        {/* Search Barang */}
                        <div className="space-y-2">
                            <Label>Cari Aset yang Dipinjamkan</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={searchBarang}
                                    onChange={e => setSearchBarang(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && searchBarangDipinjam()}
                                    placeholder="Cari nama / kode barang / NUP..."
                                    className="flex-1"
                                />
                                <Button onClick={searchBarangDipinjam} variant="outline">
                                    <Search className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {barangResults.length > 0 && (
                            <div className="border rounded-md max-h-[200px] overflow-auto">
                                {barangResults.map(b => (
                                    <div 
                                        key={b._id}
                                        onClick={() => {
                                            setSelectedBarang(b);
                                            setReturnForm({...returnForm, barang_id: b._id});
                                            setBarangResults([]);
                                        }}
                                        className={`p-3 border-b cursor-pointer hover:bg-slate-50 ${
                                            selectedBarang?._id === b._id ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <div className="font-medium">{b.nama_barang}</div>
                                        <div className="text-sm text-slate-500">
                                            <span className="font-mono">{b.kode_barang}</span> / NUP: {b.nup}
                                            {b.kode_register && <span className="ml-2">• Reg: {b.kode_register}</span>}
                                        </div>
                                        <div className="text-xs text-orange-600">
                                            Pemegang: {b.detail_lainnya?.pemegang_nama || 'Tidak diketahui'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Selected Barang */}
                        {selectedBarang && (
                            <Card className="bg-green-50 border-green-200">
                                <CardContent className="p-3">
                                    <div className="font-medium text-green-800">{selectedBarang.nama_barang}</div>
                                    <div className="text-sm text-green-600">
                                        {selectedBarang.kode_barang} / NUP: {selectedBarang.nup}
                                    </div>
                                    <div className="text-sm text-green-600">
                                        Nilai Buku: {formatCurrency(selectedBarang.nilai_buku || 0)}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Gudang Tujuan */}
                        <div className="space-y-2">
                            <Label>Gudang Tujuan *</Label>
                            <Select onValueChange={v => setReturnForm({...returnForm, gudang_id: v})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih gudang..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    {gudangList.map(g => (
                                        <SelectItem key={g.id} value={g.id}>
                                            {g.nama_gudang} ({g.kode_gudang})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Alasan */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Alasan Pengembalian</Label>
                                <Select 
                                    value={returnForm.alasan}
                                    onValueChange={v => setReturnForm({...returnForm, alasan: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pengembalian">Pengembalian Normal</SelectItem>
                                        <SelectItem value="Mutasi Pegawai">Mutasi Pegawai</SelectItem>
                                        <SelectItem value="Pensiun">Pegawai Pensiun</SelectItem>
                                        <SelectItem value="Rusak">Barang Rusak</SelectItem>
                                        <SelectItem value="Tidak Terpakai">Tidak Terpakai</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Keterangan</Label>
                                <Input 
                                    value={returnForm.keterangan}
                                    onChange={e => setReturnForm({...returnForm, keterangan: e.target.value})}
                                    placeholder="Catatan tambahan..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>Batal</Button>
                            <Button 
                                onClick={submitReturn} 
                                disabled={loading || !returnForm.barang_id || !returnForm.gudang_id}
                                className="bg-orange-600 hover:bg-orange-700"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Proses Pengembalian
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: View Gudang Assets */}
            <Dialog open={isAssetsModalOpen} onOpenChange={setIsAssetsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>
                            Aset di Gudang: {selectedGudang?.nama_gudang}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="flex gap-2">
                            <Input 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari aset..."
                                className="flex-1"
                            />
                            <Button onClick={() => loadGudangAssets(selectedGudang?.id)} variant="outline">
                                <Search className="h-4 w-4"/>
                            </Button>
                        </div>

                        {/* Assets Table */}
                        <div className="border rounded-md max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kode / NUP</TableHead>
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead>Merk</TableHead>
                                        <TableHead>Kondisi</TableHead>
                                        <TableHead className="text-right">Nilai Buku</TableHead>
                                        <TableHead>Tgl Masuk</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto"/>
                                            </TableCell>
                                        </TableRow>
                                    ) : gudangAssets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                                Tidak ada aset di gudang ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        gudangAssets.map(a => (
                                            <TableRow key={a.id}>
                                                <TableCell className="font-mono text-xs">
                                                    {a.kode_barang} / {a.nup}
                                                </TableCell>
                                                <TableCell>{a.nama_barang}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{a.merk || '-'}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                                        a.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                                                        a.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>{a.kondisi}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(a.nilai_buku)}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {a.tgl_masuk_gudang ? new Date(a.tgl_masuk_gudang).toLocaleDateString('id-ID') : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="text-sm text-slate-500 text-right">
                            Total: {gudangAssets.length} aset
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
