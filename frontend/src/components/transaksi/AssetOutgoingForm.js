import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Save, Search, CheckSquare, Upload, Building2, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { formatCurrency } from '../../lib/utils';

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
        pegawai_id: '', // ID
        no_sppa: '',
        no_sppa_2: ''
    });
    
    const [units, setUnits] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [buktiFile, setBuktiFile] = useState(null);
    const [pegawaiSearch, setPegawaiSearch] = useState('');
    const [showPegawaiDropdown, setShowPegawaiDropdown] = useState(false);
    const [selectedPegawai, setSelectedPegawai] = useState(null);

    // Eselon hierarchy for display (support both string and numeric)
    const eselonConfig = {
        'Menteri/Kepala Lembaga': { level: 1, indent: 0, color: 'text-purple-700 font-bold', label: 'Pimpinan' },
        'Wakil Menteri': { level: 2, indent: 0, color: 'text-purple-600 font-semibold', label: 'Wakil' },
        'Sekretaris Jenderal': { level: 3, indent: 1, color: 'text-blue-700 font-semibold', label: 'Es. I' },
        'Inspektur Jenderal': { level: 3, indent: 1, color: 'text-blue-700 font-semibold', label: 'Es. I' },
        'Direktur Jenderal': { level: 3, indent: 1, color: 'text-blue-700 font-semibold', label: 'Es. I' },
        'Deputi': { level: 3, indent: 1, color: 'text-blue-700 font-semibold', label: 'Es. I' },
        'Eselon I': { level: 3, indent: 1, color: 'text-blue-600 font-semibold', label: 'Es. I' },
        '1': { level: 3, indent: 1, color: 'text-blue-600 font-semibold', label: 'Es. I' },
        'Kepala Biro': { level: 4, indent: 2, color: 'text-green-700 font-medium', label: 'Es. II' },
        'Sekretaris Deputi': { level: 4, indent: 2, color: 'text-green-700 font-medium', label: 'Es. II' },
        'Direktur': { level: 4, indent: 2, color: 'text-green-700 font-medium', label: 'Es. II' },
        'Eselon II': { level: 4, indent: 2, color: 'text-green-600 font-medium', label: 'Es. II' },
        '2': { level: 4, indent: 2, color: 'text-green-600 font-medium', label: 'Es. II' },
        'Kepala Bagian': { level: 5, indent: 3, color: 'text-orange-700', label: 'Es. III' },
        'Kepala Bidang': { level: 5, indent: 3, color: 'text-orange-700', label: 'Es. III' },
        'Eselon III': { level: 5, indent: 3, color: 'text-orange-600', label: 'Es. III' },
        '3': { level: 5, indent: 3, color: 'text-orange-600', label: 'Es. III' },
        'Kepala Subbagian': { level: 6, indent: 4, color: 'text-slate-700', label: 'Es. IV' },
        'Kepala Subbidang': { level: 6, indent: 4, color: 'text-slate-700', label: 'Es. IV' },
        'Eselon IV': { level: 6, indent: 4, color: 'text-slate-600', label: 'Es. IV' },
        '4': { level: 6, indent: 4, color: 'text-slate-600', label: 'Es. IV' },
        'Kepala Seksi': { level: 7, indent: 5, color: 'text-slate-600', label: 'Es. V' },
        'Eselon V': { level: 7, indent: 5, color: 'text-slate-500', label: 'Es. V' },
        '5': { level: 7, indent: 5, color: 'text-slate-500', label: 'Es. V' },
        'Staff': { level: 8, indent: 5, color: 'text-slate-500', label: 'Staff' },
        'Lainnya': { level: 9, indent: 5, color: 'text-slate-400', label: '-' }
    };

    // Filter pegawai based on search
    const filteredPegawai = useMemo(() => {
        if (!pegawaiSearch.trim()) return pegawaiList.slice(0, 50);
        const searchLower = pegawaiSearch.toLowerCase();
        return pegawaiList.filter(p => 
            p.nama_lengkap?.toLowerCase().includes(searchLower) ||
            p.nip?.toLowerCase().includes(searchLower) ||
            p.nik?.toLowerCase().includes(searchLower) ||
            p.unit_kerja?.toLowerCase().includes(searchLower) ||
            p.jabatan?.toLowerCase().includes(searchLower)
        ).slice(0, 50);
    }, [pegawaiList, pegawaiSearch]);

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
            // Search all assets without limit
            const res = await api.get('/api/barang', {
                params: { search, limit: 10000, filter_kondisi: 'Baik' } 
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
                keterangan: formData.keterangan,
                no_sppa: formData.no_sppa,
                no_sppa_2: formData.no_sppa_2
            };

            const res = await api.post('/api/transaksi/bulk', payload);
            
            // Upload Evidence if any
            if (buktiFile && res.data.ids) {
                toast.loading("Mengupload bukti...", { id: t });
                const formDataFile = new FormData();
                formDataFile.append('file', buktiFile);
                
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
                                        <TableHead>Kode Barang - NUP & Nama & Merk</TableHead>
                                        <TableHead className="text-right">Tahun & Kondisi & Nilai</TableHead>
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
                                            <TableCell className="text-xs align-top">
                                                <div className="font-bold text-slate-800">
                                                    {a.kode_barang} - <span className="text-blue-600">NUP {a.nup}</span>
                                                </div>
                                                <div className="font-medium text-slate-700">{a.nama_barang}</div>
                                                <div className="text-slate-500 italic">{a.merk || '-'} / {a.tipe || '-'}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-right align-top">
                                                <div className="font-bold text-slate-800">{a.tahun_anggaran}</div>
                                                <div className={`font-semibold ${a.kondisi === 'Baik' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {a.kondisi}
                                                </div>
                                                <div className="text-slate-500 font-mono mt-1">
                                                    {formatCurrency(a.nilai_perolehan)}
                                                </div>
                                            </TableCell>
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
                            <Label className="text-xs">No SPPA</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={formData.no_sppa} 
                                    onChange={e => setFormData({...formData, no_sppa: e.target.value})} 
                                    className="bg-white flex-1"
                                    placeholder="Prefix..."
                                />
                                <Input 
                                    value={formData.no_sppa_2} 
                                    onChange={e => setFormData({...formData, no_sppa_2: e.target.value})} 
                                    className="bg-white flex-[2]"
                                    placeholder="Nomor SPPA..."
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                                <Building2 size={12}/> Unit Penerima
                            </Label>
                            <Select onValueChange={v => setFormData({...formData, unit_penerima: v})}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Unit Kerja..."/></SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {units.map(u => {
                                        // Handle both numeric and string eselon
                                        const eselonKey = u.eselon !== undefined && u.eselon !== null 
                                            ? String(u.eselon) 
                                            : 'Lainnya';
                                        const config = eselonConfig[eselonKey] || { indent: 0, color: 'text-slate-600', label: eselonKey };
                                        const indentPx = config.indent * 12;
                                        return (
                                            <SelectItem key={u.id} value={u.id} className="py-2">
                                                <div style={{ paddingLeft: `${indentPx}px` }} className="flex items-center gap-2">
                                                    {config.indent > 0 && <span className="text-slate-300">└</span>}
                                                    <span className={config.color}>{u.nama_unit}</span>
                                                    <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{config.label}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1 relative">
                            <Label className="text-xs flex items-center gap-1">
                                <User size={12}/> Pegawai Penerima 
                                <span className="text-blue-600 font-normal">(otomatis tercatat di Aset Pegawai)</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    value={pegawaiSearch}
                                    onChange={e => {
                                        setPegawaiSearch(e.target.value);
                                        setShowPegawaiDropdown(true);
                                    }}
                                    onFocus={() => setShowPegawaiDropdown(true)}
                                    placeholder="Cari nama / NIP / unit kerja..."
                                    className="bg-white"
                                />
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            </div>
                            
                            {/* Selected Pegawai Display */}
                            {selectedPegawai && (
                                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                    <div className="font-medium text-green-800">{selectedPegawai.nama_lengkap}</div>
                                    <div className="text-green-600">
                                        {selectedPegawai.nip || selectedPegawai.nik || '-'} • {selectedPegawai.jabatan || '-'}
                                    </div>
                                    <div className="text-green-500">{selectedPegawai.unit_kerja || '-'}</div>
                                </div>
                            )}
                            
                            {/* Pegawai Dropdown */}
                            {showPegawaiDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[250px] overflow-auto">
                                    {filteredPegawai.length === 0 ? (
                                        <div className="p-3 text-sm text-slate-400 text-center">
                                            {pegawaiSearch ? 'Tidak ditemukan' : 'Ketik untuk mencari...'}
                                        </div>
                                    ) : (
                                        filteredPegawai.map(p => (
                                            <div
                                                key={p._id}
                                                onClick={() => {
                                                    setSelectedPegawai(p);
                                                    setFormData({...formData, pegawai_id: p._id});
                                                    setPegawaiSearch(p.nama_lengkap);
                                                    setShowPegawaiDropdown(false);
                                                }}
                                                className="p-2 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <div className="font-medium text-sm text-slate-800">{p.nama_lengkap}</div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="bg-slate-100 px-1 rounded">{p.nip || p.nik || '-'}</span>
                                                    <span>•</span>
                                                    <span className="text-blue-600">{p.jabatan || '-'}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    📍 {p.unit_kerja || 'Unit tidak diketahui'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div 
                                        className="p-2 text-xs text-center text-slate-400 border-t bg-slate-50 cursor-pointer hover:bg-slate-100"
                                        onClick={() => setShowPegawaiDropdown(false)}
                                    >
                                        Tutup
                                    </div>
                                </div>
                            )}
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
                        
                        {formData.pegawai_id && (
                            <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs text-blue-800">
                                <strong>📋 Info:</strong> Aset yang diserahkan ke pegawai akan otomatis tercatat di halaman <strong>Aset Pegawai</strong> untuk tracking pemegang aset.
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
