import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Save, Search, CheckSquare, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function AssetOutgoingForm({ onSuccess }) {
    const [search, setSearch] = useState('');
    const [assets, setAssets] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        dokumen_ref: '',
        keterangan: '',
        unit_penerima: '', // ID
        pegawai_id: '' // ID
    });
    
    const [units, setUnits] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [buktiFile, setBuktiFile] = useState(null);

    useEffect(() => {
        // Load Dropdowns
        const loadData = async () => {
            try {
                const [uRes, pRes] = await Promise.all([
                    api.get('/api/settings/unit-kerja'),
                    api.get('/api/pegawai?limit=1000')
                ]);
                setUnits(uRes.data);
                setPegawaiList(pRes.data.data);
            } catch(e) {
                console.error(e);
            }
        };
        loadData();
    }, []);

    const doSearch = async () => {
        setSearching(true);
        try {
            // Search only active assets
            const res = await api.get('/api/barang', {
                params: { search, limit: 50, filter_kondisi: 'Baik' } // Assuming we only move Good items? Or allow all?
            });
            setAssets(res.data.data);
        } catch (e) {
            toast.error("Gagal mencari aset");
        } finally {
            setSearching(false);
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectedAssets = assets.filter(a => selectedIds.has(a._id));

    const handleSubmit = async () => {
        if (selectedIds.size === 0) return toast.error("Pilih aset terlebih dahulu");
        if (!formData.unit_penerima) return toast.error("Pilih Unit Penerima");
        
        setLoading(true);
        const t = toast.loading("Memproses mutasi aset...");
        
        try {
            const unitObj = units.find(u => u.id === formData.unit_penerima);
            const unitName = unitObj ? unitObj.nama_unit : '';

            const payload = {
                asset_ids: Array.from(selectedIds),
                jenis: 'KELUAR', // or MUTASI
                unit_penerima: unitName,
                pegawai_id: formData.pegawai_id,
                dokumen_ref: formData.dokumen_ref,
                keterangan: formData.keterangan
            };

            const res = await api.post('/api/transaksi/bulk', payload);
            
            // Upload Evidence if any
            if (buktiFile && res.data.ids) {
                toast.loading("Mengupload bukti...", { id: t });
                const formDataFile = new FormData();
                formDataFile.append('file', buktiFile);
                // Need a bulk upload endpoint for general transactions? 
                // Or loop?
                // The backend currently supports `upload_bukti_transaksi` for single ID.
                // We need `upload_bukti_bulk` for general transactions too? 
                // Or just upload to the first one as reference.
                // Let's loop for now (safest) or accept that we need to upgrade backend.
                // For MVP: Upload to the first transaction ID.
                const firstId = res.data.ids[0];
                await api.post(`/api/transaksi/${firstId}/upload-bukti`, formDataFile);
            }

            toast.success(`Berhasil memproses ${res.data.count} aset`, { id: t });
            setSelectedIds(new Set());
            setAssets([]);
            setSearch('');
            setBuktiFile(null);
            if (onSuccess) onSuccess();

        } catch (e) {
            console.error(e);
            toast.error("Gagal memproses transaksi", { id: t });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Asset Selection */}
                <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">1. Cari & Pilih Aset</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Cari nama / kode / NUP..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && doSearch()}
                            />
                            <Button onClick={doSearch} variant="secondary">
                                {searching ? <Loader2 className="animate-spin"/> : <Search size={16}/>}
                            </Button>
                        </div>
                        
                        <div className="border rounded-md flex-1 overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30px]"></TableHead>
                                        <TableHead>Aset</TableHead>
                                        <TableHead>NUP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map(a => (
                                        <TableRow key={a._id} onClick={() => toggleSelect(a._id)} className="cursor-pointer hover:bg-slate-50">
                                            <TableCell>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.has(a._id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                                    {selectedIds.has(a._id) && <CheckSquare size={10}/>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-bold">{a.nama_barang}</div>
                                                <div className="text-slate-500">{a.kode_barang}</div>
                                            </TableCell>
                                            <TableCell className="text-xs">{a.nup}</TableCell>
                                        </TableRow>
                                    ))}
                                    {assets.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400">Belum ada data</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="text-xs text-slate-500 text-right">
                            {selectedIds.size} aset dipilih
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Transaction Details */}
                <Card className="border-red-200 bg-red-50/30 h-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-red-800">2. Detail Transaksi (Keluar)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Unit Penerima</Label>
                            <Select onValueChange={v => setFormData({...formData, unit_penerima: v})}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Unit..."/></SelectTrigger>
                                <SelectContent>
                                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.nama_unit}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Pegawai Penerima (Opsional)</Label>
                            <Select onValueChange={v => setFormData({...formData, pegawai_id: v})}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Pegawai..."/></SelectTrigger>
                                <SelectContent>
                                    {pegawaiList.map(p => <SelectItem key={p._id} value={p._id}>{p.nama_lengkap}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">No. Dokumen / BAST</Label>
                            <Input 
                                value={formData.dokumen_ref} 
                                onChange={e => setFormData({...formData, dokumen_ref: e.target.value})} 
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Keterangan</Label>
                            <Input 
                                value={formData.keterangan} 
                                onChange={e => setFormData({...formData, keterangan: e.target.value})} 
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Bukti Foto</Label>
                            <Input type="file" onChange={e => setBuktiFile(e.target.files[0])} className="bg-white"/>
                        </div>

                        {selectedAssets.length > 0 && (
                            <div className="bg-white p-2 rounded border max-h-[100px] overflow-auto text-xs">
                                <strong>Aset yang akan dikeluarkan:</strong>
                                <ul className="list-disc pl-4 mt-1 text-slate-600">
                                    {selectedAssets.map(a => (
                                        <li key={a._id}>{a.nama_barang} (NUP: {a.nup})</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <Button onClick={handleSubmit} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white mt-4">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            Proses Transaksi Keluar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
