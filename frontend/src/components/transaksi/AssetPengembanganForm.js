import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Search as SearchIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, Save, Search, X, Info, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export default function AssetPengembanganForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Asset Search State
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [assetList, setAssetList] = useState([]);
    const [assetLoading, setAssetLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    
    // Document Selection State
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [dokumenList, setDokumenList] = useState([]);
    const [selectedDokumen, setSelectedDokumen] = useState(null);
    
    // Form Setup
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            tahun_anggaran: new Date().getFullYear(),
            tgl_pembukuan: new Date().toISOString().split('T')[0],
            jenis_dokumen: 'Kuitansi',
            dasar_harga: 'Perolehan',
            periode: 'normal',
            nilai_pengembangan: 0,
            
            npwp_penyedia: '',
            nama_penyedia: ''
        }
    });

    // Watchers
    const nilaiPengembangan = watch('nilai_pengembangan') || 0;

    // Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const resPpk = await api.get('/api/pegawai/pejabat', { params: { role: 'PPK' } });
                setPpkList(resPpk.data);

                const resSettings = await api.get('/api/settings/instansi');
                if (resSettings.data.kode_uakpb) {
                    setKodeUakpb(resSettings.data.kode_uakpb);
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
            }
        };
        fetchData();
    }, []);

    // Search Assets
    const searchAssets = async () => {
        if (!assetSearchQuery || assetSearchQuery.length < 2) return;
        setAssetLoading(true);
        try {
            const res = await api.get('/api/barang', { 
                params: { 
                    search: assetSearchQuery, 
                    limit: 50,
                    status_aset: 'Aktif' // Only active assets can be developed
                } 
            });
            setAssetList(res.data.data || []);
        } catch (e) {
            toast.error("Gagal mencari aset");
        } finally {
            setAssetLoading(false);
        }
    };

    const handleSelectAsset = (asset) => {
        setSelectedAsset(asset);
        setIsAssetModalOpen(false);
        toast.success(`Aset dipilih: ${asset.nama_barang} (NUP: ${asset.nup})`);
    };

    const clearAssetSelection = () => {
        setSelectedAsset(null);
    };
    
    // Document Selection Logic
    const handleOpenDocModal = async () => {
        setIsDocModalOpen(true);
        try {
            const res = await api.get('/api/dokumen-sumber', { params: { kategori: 'Aset Tetap Pengembangan Langsung' } });
            setDokumenList(res.data.data || []);
        } catch (e) { console.error(e); }
    };
    
    const handleSelectDoc = (doc) => {
        setSelectedDokumen(doc);
        setValue('jenis_dokumen', doc.jenis_dokumen);
        setValue('nomor_dokumen', doc.nomor_dokumen);
        setValue('tgl_dokumen', doc.tanggal_dokumen);
        if (doc.nama_penyedia) setValue('nama_penyedia', doc.nama_penyedia);
        if (doc.npwp_penyedia) setValue('npwp_penyedia', doc.npwp_penyedia);
        if (doc.uraian) setValue('keterangan', doc.uraian);
        setIsDocModalOpen(false);
        toast.success("Data dokumen disalin");
    };
    
    const clearDocSelection = () => {
        setSelectedDokumen(null);
        setValue('nomor_dokumen', '');
        setValue('tgl_dokumen', '');
        setValue('nama_penyedia', '');
        setValue('npwp_penyedia', '');
    };

    const onSubmit = async (data) => {
        if (!selectedAsset) return toast.error("Pilih aset yang akan dikembangkan");
        if (!data.nilai_pengembangan || data.nilai_pengembangan <= 0) return toast.error("Nilai pengembangan wajib diisi");

        setLoading(true);
        const t = toast.loading("Menyimpan Pengembangan Aset...");

        try {
            // Calculate new value
            const nilaiLama = selectedAsset.nilai_perolehan || selectedAsset.nilai_buku || 0;
            const nilaiBaruTotal = parseFloat(nilaiLama) + parseFloat(data.nilai_pengembangan);

            // Update existing asset with new value
            await api.put(`/api/barang/${selectedAsset._id}`, {
                nilai_perolehan: nilaiBaruTotal,
                nilai_buku: nilaiBaruTotal,
                updated_at: new Date().toISOString(),
                detail_lainnya: {
                    ...selectedAsset.detail_lainnya,
                    riwayat_pengembangan: [
                        ...(selectedAsset.detail_lainnya?.riwayat_pengembangan || []),
                        {
                            tgl_pengembangan: data.tgl_pembukuan,
                            nilai_pengembangan: parseFloat(data.nilai_pengembangan),
                            nilai_sebelum: nilaiLama,
                            nilai_sesudah: nilaiBaruTotal,
                            jenis_dokumen: data.jenis_dokumen,
                            nomor_dokumen: data.nomor_dokumen,
                            keterangan: data.keterangan,
                            nama_penyedia: data.nama_penyedia
                        }
                    ],
                    terakhir_dikembangkan: data.tgl_pembukuan
                }
            });

            // Create Transaction Log
            await api.post('/api/transaksi', {
                jenis: 'PENGEMBANGAN',
                barang_id: selectedAsset._id,
                kode_barang: selectedAsset.kode_barang,
                nup: selectedAsset.nup,
                nama_barang: selectedAsset.nama_barang,
                jumlah: 1,
                nilai_satuan: parseFloat(data.nilai_pengembangan),
                total_nilai: parseFloat(data.nilai_pengembangan),
                dokumen_ref: data.nomor_dokumen,
                keterangan: `Pengembangan Langsung: ${data.keterangan || 'Penambahan nilai aset'}`,
                dokumen_sumber_id: selectedDokumen?._id
            });

            toast.success(`Pengembangan aset berhasil dicatat. Nilai baru: ${formatCurrency(nilaiBaruTotal)}`, { id: t });
            reset();
            setSelectedAsset(null);
            setSelectedDokumen(null);
            if (onSuccess) onSuccess();

        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.detail || "Gagal menyimpan data", { id: t });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-green-200 shadow-sm bg-green-50/30">
            <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                <CardTitle className="text-lg font-bold text-green-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600"/>
                    RUH Transaksi BMN Perolehan - Pengembangan Langsung
                </CardTitle>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>Penambahan nilai aset yang sudah tercatat (renovasi, upgrade, dll)</span>
                    <div className="flex items-center gap-2">
                        {selectedDokumen ? (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                                <span className="font-bold">Ref: {selectedDokumen.nomor_dokumen}</span>
                                <button onClick={clearDocSelection}><X size={12}/></button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleOpenDocModal} className="h-7 text-xs bg-green-50 text-green-700 border-green-200">
                                <Search className="mr-1 h-3 w-3"/> Pilih Dokumen Sumber
                            </Button>
                        )}
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                            UAKPB: <strong>{kodeUakpb || '-'}</strong>
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Top Level Info */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">Tahun Anggaran</Label>
                            <Input {...register('tahun_anggaran')} className="bg-white h-9 font-bold" />
                        </div>
                        <div className="md:col-span-10 space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">Periode Pencatatan</Label>
                            <RadioGroup defaultValue="normal" onValueChange={(v) => setValue('periode', v)} className="flex gap-4 pt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="normal" id="p1p" />
                                    <Label htmlFor="p1p" className="text-xs">Normal (1-12)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="13" id="p13p" />
                                    <Label htmlFor="p13p" className="text-xs">Periode 13</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="14" id="p14p" />
                                    <Label htmlFor="p14p" className="text-xs">Periode 14</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* PILIH ASET YANG DIKEMBANGKAN */}
                            <div className="bg-green-100/50 p-4 rounded-lg border border-green-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-green-800 border-b border-green-300 pb-2 flex items-center gap-2">
                                    <Package size={14}/> ASET YANG DIKEMBANGKAN
                                </h3>
                                
                                {!selectedAsset ? (
                                    <div className="text-center py-6">
                                        <Package className="h-12 w-12 text-green-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 mb-3">Pilih aset yang akan dikembangkan</p>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setIsAssetModalOpen(true)}
                                            className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                        >
                                            <SearchIcon className="mr-2 h-4 w-4" /> Cari & Pilih Aset
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-white p-3 rounded-lg border border-green-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-slate-800">{selectedAsset.nama_barang}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Kode: {selectedAsset.kode_barang} | NUP: {selectedAsset.nup}
                                                    </p>
                                                    {selectedAsset.merk && (
                                                        <p className="text-xs text-slate-400">{selectedAsset.merk}</p>
                                                    )}
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={clearAssetSelection}
                                                    className="h-6 text-red-500 hover:text-red-700"
                                                >
                                                    <X size={14}/>
                                                </Button>
                                            </div>
                                            <Separator className="my-2"/>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-slate-500">Nilai Saat Ini:</span>
                                                    <span className="font-bold text-blue-700 ml-1">
                                                        {formatCurrency(selectedAsset.nilai_perolehan || selectedAsset.nilai_buku || 0)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Kondisi:</span>
                                                    <span className="font-medium ml-1">{selectedAsset.kondisi || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setIsAssetModalOpen(true)}
                                            className="w-full text-xs"
                                        >
                                            Ganti Aset
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* RINCIAN PENGEMBANGAN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                                    <Info size={14}/> RINCIAN PENGEMBANGAN
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tgl. Pembukuan</Label>
                                        <Input type="date" {...register('tgl_pembukuan')} className="bg-white h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nilai Pengembangan (Rp) *</Label>
                                        <Input 
                                            type="number" 
                                            {...register('nilai_pengembangan', { required: true })} 
                                            className="bg-white h-9 font-bold text-right"
                                        />
                                    </div>
                                </div>

                                {selectedAsset && nilaiPengembangan > 0 && (
                                    <div className="bg-green-50 p-3 rounded border border-green-200">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-600">Nilai Lama:</span>
                                            <span className="font-mono">{formatCurrency(selectedAsset.nilai_perolehan || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-green-600">
                                            <span>+ Pengembangan:</span>
                                            <span className="font-mono">+ {formatCurrency(nilaiPengembangan)}</span>
                                        </div>
                                        <Separator className="my-1"/>
                                        <div className="flex justify-between text-sm font-bold text-green-800">
                                            <span>Nilai Baru:</span>
                                            <span className="font-mono">
                                                {formatCurrency((selectedAsset.nilai_perolehan || 0) + parseFloat(nilaiPengembangan || 0))}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Keterangan Pengembangan</Label>
                                    <Input {...register('keterangan')} placeholder="Contoh: Renovasi gedung lantai 2, upgrade mesin..." className="bg-white h-9"/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* DOKUMEN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                                    <span>DOKUMEN PENGEMBANGAN</span>
                                    {selectedDokumen && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Linked</span>}
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Dokumen</Label>
                                    <Select onValueChange={(v) => setValue('jenis_dokumen', v)} defaultValue="Kuitansi">
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Pilih Jenis Dokumen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Kuitansi">Kuitansi</SelectItem>
                                            <SelectItem value="BAST">BAST</SelectItem>
                                            <SelectItem value="Kontrak">Kontrak</SelectItem>
                                            <SelectItem value="SPK">SPK (Surat Perintah Kerja)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nomor Dokumen</Label>
                                        <Input {...register('nomor_dokumen')} className="bg-white h-9" placeholder="No. Dokumen..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tanggal Dokumen</Label>
                                        <Input type="date" {...register('tgl_dokumen')} className="bg-white h-9" readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nama Rekanan</Label>
                                        <Input {...register('nama_penyedia')} className="bg-white h-9" placeholder="CV/PT..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">NPWP Rekanan</Label>
                                        <Input {...register('npwp_penyedia')} className="bg-white h-9" placeholder="NPWP..." readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>
                            </div>

                            {/* RINCIAN PEROLEHAN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">RINCIAN PEROLEHAN</h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Dasar Harga</Label>
                                    <RadioGroup defaultValue="Perolehan" onValueChange={(v) => setValue('dasar_harga', v)} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Perolehan" id="h1p" />
                                            <Label htmlFor="h1p" className="text-xs">Harga Perolehan</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Taksiran" id="h2p" />
                                            <Label htmlFor="h2p" className="text-xs">Harga Taksiran</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold">PPK</Label>
                                    <Select onValueChange={(v) => setValue('nama_ppk', v)}>
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Pilih PPK..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ppkList.map(ppk => (
                                                <SelectItem key={ppk._id} value={ppk.nama_lengkap}>{ppk.nama_lengkap}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => { reset(); setSelectedAsset(null); }} className="min-w-[100px]">Reset</Button>
                        <Button type="submit" disabled={loading || !selectedAsset} className="bg-green-700 hover:bg-green-800 text-white min-w-[150px]">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            SIMPAN PENGEMBANGAN
                        </Button>
                    </div>
                </form>
            </CardContent>

            {/* Asset Search Modal */}
            <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Cari & Pilih Aset yang Dikembangkan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Cari berdasarkan nama, kode, atau NUP..." 
                                value={assetSearchQuery}
                                onChange={(e) => setAssetSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchAssets()}
                                className="flex-1"
                            />
                            <Button onClick={searchAssets} disabled={assetLoading}>
                                {assetLoading ? <Loader2 className="animate-spin"/> : <SearchIcon className="h-4 w-4"/>}
                            </Button>
                        </div>
                        
                        <div className="max-h-[50vh] overflow-y-auto border rounded">
                            {assetList.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    {assetSearchQuery ? 'Tidak ada aset ditemukan' : 'Masukkan kata kunci dan klik cari'}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Kode / NUP</TableHead>
                                            <TableHead>Nama Barang</TableHead>
                                            <TableHead>Merk/Tipe</TableHead>
                                            <TableHead className="text-right">Nilai</TableHead>
                                            <TableHead>Kondisi</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assetList.map(asset => (
                                            <TableRow key={asset._id} className="hover:bg-slate-50">
                                                <TableCell>
                                                    <div className="font-mono text-xs">{asset.kode_barang}</div>
                                                    <div className="text-xs text-blue-600 font-bold">NUP: {asset.nup}</div>
                                                </TableCell>
                                                <TableCell className="font-medium">{asset.nama_barang}</TableCell>
                                                <TableCell className="text-xs text-slate-500">{asset.merk || '-'}</TableCell>
                                                <TableCell className="text-right font-semibold text-green-700">
                                                    {formatCurrency(asset.nilai_perolehan || asset.nilai_buku || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                        asset.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                                                        asset.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {asset.kondisi || 'N/A'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-7 text-xs bg-green-50 text-green-700"
                                                        onClick={() => handleSelectAsset(asset)}
                                                    >
                                                        Pilih
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Document Selection Modal */}
            <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Dokumen Sumber (Pengembangan Langsung)</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {dokumenList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada dokumen pengembangan tersimpan.<br/>
                                <span className="text-xs">Silakan rekam dokumen dengan Kategori "Aset Tetap Pengembangan Langsung" terlebih dahulu.</span>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-left">
                                        <th className="p-2 border">Jenis & Nomor</th>
                                        <th className="p-2 border">Tanggal</th>
                                        <th className="p-2 border">Nilai</th>
                                        <th className="p-2 border">Penyedia</th>
                                        <th className="p-2 border">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dokumenList.map(doc => (
                                        <tr key={doc._id} className="hover:bg-slate-50">
                                            <td className="p-2 border">
                                                <div className="font-bold">{doc.jenis_dokumen}</div>
                                                <div className="text-xs text-blue-600">{doc.nomor_dokumen}</div>
                                            </td>
                                            <td className="p-2 border">{doc.tanggal_dokumen}</td>
                                            <td className="p-2 border font-semibold text-green-700">
                                                {formatCurrency(doc.nilai_total)}
                                            </td>
                                            <td className="p-2 border text-xs">{doc.nama_penyedia || '-'}</td>
                                            <td className="p-2 border text-center">
                                                <Button size="sm" variant="ghost" className="h-6 text-xs bg-green-50 text-green-700" onClick={() => handleSelectDoc(doc)}>
                                                    Pilih
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
