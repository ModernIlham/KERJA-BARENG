import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Search as SearchIcon, Construction, Calculator } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, Save, Search, X, Info, Package, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

export default function KDPPengembanganForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Asset Search State (for existing KDP assets)
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
            jenis_dokumen: 'Kontrak',
            dasar_harga: 'Perolehan',
            periode: 'normal',
            
            // KDP specific
            jenis_pembayaran: 'termin',
            termin_ke: 2,
            total_termin: 3,
            nilai_termin: 0,
            catatan_termin: ''
        }
    });

    // Watchers
    const nilaiTermin = watch('nilai_termin') || 0;
    const jenisPembayaran = watch('jenis_pembayaran');
    const terminKe = watch('termin_ke') || 1;
    const totalTermin = watch('total_termin') || 1;
    
    // Calculate percentage based on original contract value
    const nilaiKontrak = selectedAsset?.detail_lainnya?.nilai_kontrak || 0;
    const persentaseOtomatis = nilaiKontrak > 0 ? ((nilaiTermin / nilaiKontrak) * 100).toFixed(2) : 0;

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

    // Search KDP Assets
    const searchAssets = async () => {
        if (!assetSearchQuery || assetSearchQuery.length < 2) return;
        setAssetLoading(true);
        try {
            const res = await api.get('/api/barang', { 
                params: { 
                    search: assetSearchQuery, 
                    limit: 50,
                    status_aset: 'KDP' // Only KDP assets
                } 
            });
            setAssetList(res.data.data || []);
        } catch (e) {
            toast.error("Gagal mencari aset KDP");
        } finally {
            setAssetLoading(false);
        }
    };

    const handleSelectAsset = (asset) => {
        setSelectedAsset(asset);
        setIsAssetModalOpen(false);
        
        // Calculate next termin based on riwayat
        const riwayatTermin = asset.detail_lainnya?.riwayat_termin || [];
        const nextTermin = riwayatTermin.length + 1;
        setValue('termin_ke', nextTermin);
        setValue('total_termin', asset.detail_lainnya?.total_termin || 3);
        
        toast.success(`KDP dipilih: ${asset.nama_barang} (NUP: ${asset.nup})`);
    };

    const clearAssetSelection = () => {
        setSelectedAsset(null);
    };
    
    // Document Selection Logic
    const handleOpenDocModal = async () => {
        setIsDocModalOpen(true);
        try {
            const res = await api.get('/api/dokumen-sumber', { params: { kategori: 'Aset Tetap Pengembangan KDP' } });
            setDokumenList(res.data.data || []);
        } catch (e) { console.error(e); }
    };
    
    const handleSelectDoc = (doc) => {
        setSelectedDokumen(doc);
        setValue('jenis_dokumen', doc.jenis_dokumen);
        setValue('nomor_dokumen', doc.nomor_dokumen);
        setValue('tgl_dokumen', doc.tanggal_dokumen);
        if (doc.uraian) setValue('catatan_termin', doc.uraian);
        setIsDocModalOpen(false);
        toast.success("Data dokumen disalin");
    };
    
    const clearDocSelection = () => {
        setSelectedDokumen(null);
        setValue('nomor_dokumen', '');
        setValue('tgl_dokumen', '');
    };

    // Calculate total paid so far
    const getTotalPaid = () => {
        if (!selectedAsset) return 0;
        const riwayat = selectedAsset.detail_lainnya?.riwayat_termin || [];
        return riwayat.reduce((sum, t) => sum + (t.nilai || 0), 0);
    };

    const onSubmit = async (data) => {
        if (!selectedAsset) return toast.error("Pilih aset KDP yang akan dikembangkan");
        if (!data.nilai_termin || data.nilai_termin <= 0) return toast.error("Nilai pembayaran wajib diisi");

        setLoading(true);
        const t = toast.loading("Menyimpan Pengembangan KDP...");

        try {
            // Calculate new value
            const nilaiLama = selectedAsset.nilai_perolehan || 0;
            const nilaiBaruTotal = parseFloat(nilaiLama) + parseFloat(data.nilai_termin);
            
            const riwayatTermin = selectedAsset.detail_lainnya?.riwayat_termin || [];
            const pembayaranLabel = jenisPembayaran === 'termin' 
                ? `Termin ${data.termin_ke}/${data.total_termin}` 
                : 'Pembayaran Lanjutan';

            // Update existing KDP asset
            await api.put(`/api/barang/${selectedAsset._id}`, {
                nilai_perolehan: nilaiBaruTotal,
                nilai_buku: nilaiBaruTotal,
                updated_at: new Date().toISOString(),
                detail_lainnya: {
                    ...selectedAsset.detail_lainnya,
                    termin_ke: parseInt(data.termin_ke),
                    total_termin: parseInt(data.total_termin),
                    riwayat_termin: [
                        ...riwayatTermin,
                        {
                            termin_ke: parseInt(data.termin_ke),
                            tgl_bayar: data.tgl_pembukuan,
                            nilai: parseFloat(data.nilai_termin),
                            persentase: parseFloat(persentaseOtomatis),
                            catatan: data.catatan_termin,
                            jenis: pembayaranLabel,
                            nomor_dokumen: data.nomor_dokumen
                        }
                    ],
                    terakhir_dikembangkan: data.tgl_pembukuan
                }
            });

            // Create Transaction Log
            await api.post('/api/transaksi', {
                jenis: 'PENGEMBANGAN_KDP',
                barang_id: selectedAsset._id,
                kode_barang: selectedAsset.kode_barang,
                nup: selectedAsset.nup,
                nama_barang: selectedAsset.nama_barang,
                jumlah: 1,
                nilai_satuan: parseFloat(data.nilai_termin),
                total_nilai: parseFloat(data.nilai_termin),
                dokumen_ref: data.nomor_dokumen,
                keterangan: `KDP ${selectedAsset.detail_lainnya?.nama_pembangunan || selectedAsset.nama_barang} - ${pembayaranLabel} (${persentaseOtomatis}%)`,
                dokumen_sumber_id: selectedDokumen?._id
            });

            toast.success(`Pengembangan KDP berhasil - ${pembayaranLabel}. Nilai baru: ${formatCurrency(nilaiBaruTotal)}`, { id: t });
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
        <Card className="border-orange-200 shadow-sm bg-orange-50/30">
            <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
                    <Construction className="h-5 w-5 text-orange-600"/>
                    RUH Transaksi KDP - Pengembangan
                </CardTitle>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>Pencatatan pembayaran lanjutan (termin) untuk KDP yang sudah tercatat</span>
                    <div className="flex items-center gap-2">
                        {selectedDokumen ? (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                                <span className="font-bold">Ref: {selectedDokumen.nomor_dokumen}</span>
                                <button onClick={clearDocSelection}><X size={12}/></button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleOpenDocModal} className="h-7 text-xs bg-orange-50 text-orange-700 border-orange-200">
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
                                    <RadioGroupItem value="normal" id="p1kp" />
                                    <Label htmlFor="p1kp" className="text-xs">Normal (1-12)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="13" id="p13kp" />
                                    <Label htmlFor="p13kp" className="text-xs">Periode 13</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="14" id="p14kp" />
                                    <Label htmlFor="p14kp" className="text-xs">Periode 14</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* PILIH KDP */}
                            <div className="bg-orange-100/50 p-4 rounded-lg border border-orange-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-orange-800 border-b border-orange-300 pb-2 flex items-center gap-2">
                                    <Construction size={14}/> KDP YANG DIKEMBANGKAN
                                </h3>
                                
                                {!selectedAsset ? (
                                    <div className="text-center py-6">
                                        <Construction className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 mb-3">Pilih KDP yang akan ditambah pembayaran</p>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setIsAssetModalOpen(true)}
                                            className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
                                        >
                                            <SearchIcon className="mr-2 h-4 w-4" /> Cari & Pilih KDP
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-white p-3 rounded-lg border border-orange-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-slate-800">
                                                        {selectedAsset.detail_lainnya?.nama_pembangunan || selectedAsset.nama_barang}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Kode: {selectedAsset.kode_barang} | NUP: {selectedAsset.nup}
                                                    </p>
                                                    {selectedAsset.detail_lainnya?.lokasi_kdp && (
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                            <MapPin size={10}/> {selectedAsset.detail_lainnya.lokasi_kdp}
                                                        </p>
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
                                                    <span className="text-slate-500">Nilai Kontrak:</span>
                                                    <span className="font-bold text-blue-700 ml-1">
                                                        {formatCurrency(nilaiKontrak)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Sudah Dibayar:</span>
                                                    <span className="font-bold text-green-700 ml-1">
                                                        {formatCurrency(getTotalPaid())}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            {nilaiKontrak > 0 && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                                                        <span>Progress Pembayaran</span>
                                                        <span>{((getTotalPaid() / nilaiKontrak) * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-orange-500 transition-all" 
                                                            style={{ width: `${Math.min((getTotalPaid() / nilaiKontrak) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Riwayat Termin */}
                                            {selectedAsset.detail_lainnya?.riwayat_termin?.length > 0 && (
                                                <div className="mt-3 p-2 bg-slate-50 rounded text-xs">
                                                    <span className="font-semibold text-slate-600">Riwayat Pembayaran:</span>
                                                    <ul className="mt-1 space-y-1">
                                                        {selectedAsset.detail_lainnya.riwayat_termin.map((t, i) => (
                                                            <li key={i} className="flex justify-between text-slate-500">
                                                                <span>{t.jenis || `Termin ${t.termin_ke}`}</span>
                                                                <span className="font-mono text-green-600">{formatCurrency(t.nilai)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setIsAssetModalOpen(true)}
                                            className="w-full text-xs"
                                        >
                                            Ganti KDP
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* RINCIAN PENGEMBANGAN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                                    <Info size={14}/> RINCIAN PENGEMBANGAN
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Tgl. Pembukuan</Label>
                                    <Input type="date" {...register('tgl_pembukuan')} className="bg-white h-9" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Keterangan / Catatan</Label>
                                    <Textarea {...register('catatan_termin')} 
                                              className="bg-white" 
                                              rows={2}
                                              placeholder={`Catatan untuk termin ke-${terminKe}...`}/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* PEMBAYARAN / TERMIN */}
                            <div className="bg-orange-100/50 p-4 rounded-lg border border-orange-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-orange-800 border-b border-orange-300 pb-2 flex items-center gap-2">
                                    <Calculator size={14}/> PEMBAYARAN / TERMIN
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Pembayaran</Label>
                                    <RadioGroup 
                                        defaultValue="termin" 
                                        onValueChange={(v) => setValue('jenis_pembayaran', v)} 
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="termin" id="jb1kp" className="text-orange-600 border-orange-600" />
                                            <Label htmlFor="jb1kp" className="text-xs font-bold text-orange-700">Termin</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="pelunasan" id="jb2kp" className="text-green-600 border-green-600" />
                                            <Label htmlFor="jb2kp" className="text-xs font-bold text-green-700">Pelunasan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {jenisPembayaran === 'termin' && (
                                    <div className="grid grid-cols-2 gap-4 p-3 bg-orange-50 rounded border border-orange-200">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-orange-800">Termin Ke-</Label>
                                            <Input type="number" min="1" {...register('termin_ke')} className="bg-white h-9 font-bold"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-orange-800">Dari Total Termin</Label>
                                            <Input type="number" min="1" {...register('total_termin')} className="bg-white h-9 font-bold"/>
                                        </div>
                                    </div>
                                )}

                                <Separator className="my-2"/>

                                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">
                                            Nilai {jenisPembayaran === 'termin' ? `Termin ${terminKe}` : 'Pelunasan'} (Rp) *
                                        </Label>
                                        <Input type="number" {...register('nilai_termin', { required: true })} 
                                               className="bg-white h-9 font-bold text-right"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Persentase (%)</Label>
                                        <div className="h-9 flex items-center justify-end px-3 font-bold text-orange-700 bg-orange-50 border rounded">
                                            {persentaseOtomatis}%
                                        </div>
                                    </div>
                                </div>

                                {/* Summary after payment */}
                                {selectedAsset && nilaiTermin > 0 && (
                                    <div className="bg-white p-3 rounded border">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-600">Total Dibayar Sebelum:</span>
                                            <span className="font-mono">{formatCurrency(getTotalPaid())}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-orange-600">
                                            <span>+ Pembayaran Ini:</span>
                                            <span className="font-mono">+ {formatCurrency(nilaiTermin)}</span>
                                        </div>
                                        <Separator className="my-1"/>
                                        <div className="flex justify-between text-sm font-bold text-orange-800">
                                            <span>Total Dibayar:</span>
                                            <span className="font-mono">
                                                {formatCurrency(getTotalPaid() + parseFloat(nilaiTermin || 0))}
                                            </span>
                                        </div>
                                        {nilaiKontrak > 0 && (
                                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                                <span>Sisa dari Kontrak:</span>
                                                <span className="font-mono">
                                                    {formatCurrency(nilaiKontrak - getTotalPaid() - parseFloat(nilaiTermin || 0))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* DOKUMEN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                                    <span>DOKUMEN</span>
                                    {selectedDokumen && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Linked</span>}
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nomor Dokumen</Label>
                                        <Input {...register('nomor_dokumen')} className="bg-white h-9" placeholder="No. Dok..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tanggal Dokumen</Label>
                                        <Input type="date" {...register('tgl_dokumen')} className="bg-white h-9" readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>
                            </div>

                            {/* PPK */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">PPK</h3>
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

                    <div className="mt-8 flex justify-end gap-4 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => { reset(); setSelectedAsset(null); }} className="min-w-[100px]">Reset</Button>
                        <Button type="submit" disabled={loading || !selectedAsset} className="bg-orange-700 hover:bg-orange-800 text-white min-w-[150px]">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            SIMPAN KDP
                        </Button>
                    </div>
                </form>
            </CardContent>

            {/* KDP Search Modal */}
            <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Cari & Pilih KDP yang Dikembangkan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Cari KDP berdasarkan nama pembangunan, kode, atau NUP..." 
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
                                    {assetSearchQuery ? 'Tidak ada KDP ditemukan' : 'Masukkan kata kunci dan klik cari'}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Kode / NUP</TableHead>
                                            <TableHead>Nama Pembangunan</TableHead>
                                            <TableHead>Lokasi</TableHead>
                                            <TableHead className="text-right">Nilai Saat Ini</TableHead>
                                            <TableHead>Progress</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assetList.map(asset => {
                                            const kontrak = asset.detail_lainnya?.nilai_kontrak || 0;
                                            const dibayar = asset.nilai_perolehan || 0;
                                            const progress = kontrak > 0 ? ((dibayar / kontrak) * 100).toFixed(0) : 0;
                                            
                                            return (
                                                <TableRow key={asset._id} className="hover:bg-slate-50">
                                                    <TableCell>
                                                        <div className="font-mono text-xs">{asset.kode_barang}</div>
                                                        <div className="text-xs text-blue-600 font-bold">NUP: {asset.nup}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {asset.detail_lainnya?.nama_pembangunan || asset.nama_barang}
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            {asset.detail_lainnya?.jenis_pembangunan || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {asset.detail_lainnya?.lokasi_kdp || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-orange-700">
                                                        {formatCurrency(dibayar)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="w-20">
                                                            <div className="text-[10px] text-slate-500 mb-0.5">{progress}%</div>
                                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-orange-500" 
                                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-7 text-xs bg-orange-50 text-orange-700"
                                                            onClick={() => handleSelectAsset(asset)}
                                                        >
                                                            Pilih
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
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
                        <DialogTitle>Pilih Dokumen Sumber (Pengembangan KDP)</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {dokumenList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada dokumen tersimpan.<br/>
                                <span className="text-xs">Silakan rekam dokumen dengan Kategori "Aset Tetap Pengembangan KDP" terlebih dahulu.</span>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-left">
                                        <th className="p-2 border">Jenis & Nomor</th>
                                        <th className="p-2 border">Tanggal</th>
                                        <th className="p-2 border">Nilai</th>
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
                                            <td className="p-2 border text-center">
                                                <Button size="sm" variant="ghost" className="h-6 text-xs bg-orange-50 text-orange-700" onClick={() => handleSelectDoc(doc)}>
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
