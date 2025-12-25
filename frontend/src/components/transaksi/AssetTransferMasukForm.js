import React, { useState, useEffect } from 'react';
import { FileText, Building2, ArrowLeftRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, Save, Search, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import ReferensiSearch from '../barang/ReferensiSearch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export default function AssetTransferMasukForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [nextNup, setNextNup] = useState(null);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Document Selection State
    const [isDocModalOpen, setIsModalOpen] = useState(false);
    const [dokumenList, setDokumenList] = useState([]);
    const [selectedDokumen, setSelectedDokumen] = useState(null);
    
    // Form Setup
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            jumlah: 1,
            tahun_anggaran: new Date().getFullYear(),
            tgl_perolehan: new Date().toISOString().split('T')[0],
            tgl_pembukuan: new Date().toISOString().split('T')[0],
            kondisi: 'Baik',
            jenis_dokumen: 'BAST',
            dasar_harga: 'Perolehan',
            periode: 'normal',
            
            // Transfer specific fields
            satker_asal: '',
            kode_satker_asal: '',
            nama_instansi_asal: '',
            no_bast_transfer: '',
            tgl_bast_transfer: ''
        }
    });

    // Watchers
    const kodeBarang = watch('kode_barang');
    const jumlah = watch('jumlah') || 0;
    const nilaiSatuan = watch('nilai_satuan') || 0;
    const totalNilai = jumlah * nilaiSatuan;

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

    // Fetch Next NUP when Kode Barang changes
    useEffect(() => {
        if (kodeBarang && kodeBarang.length >= 10) {
            const fetchNup = async () => {
                try {
                    const res = await api.get('/api/barang/next-nup', { params: { kode: kodeBarang } });
                    setNextNup(parseInt(res.data.nup));
                } catch (e) {
                    console.error(e);
                }
            };
            fetchNup();
        }
    }, [kodeBarang]);

    const handleReferenceSelect = (item) => {
        setValue('kode_barang', item.kode);
        setValue('nama_barang', item.uraian);
    };
    
    // Document Selection Logic
    const handleOpenDocModal = async () => {
        setIsModalOpen(true);
        try {
            const res = await api.get('/api/dokumen-sumber', { params: { kategori: 'Aset Tetap Transfer Masuk' } });
            setDokumenList(res.data.data);
        } catch (e) { console.error(e); }
    };
    
    const handleSelectDoc = (doc) => {
        setSelectedDokumen(doc);
        setValue('jenis_dokumen', doc.jenis_dokumen);
        setValue('no_bast_transfer', doc.nomor_dokumen);
        setValue('tgl_bast_transfer', doc.tanggal_dokumen);
        if (doc.uraian) setValue('keterangan', doc.uraian);
        setIsModalOpen(false);
        toast.success("Data dokumen disalin");
    };
    
    const clearDocSelection = () => {
        setSelectedDokumen(null);
        setValue('no_bast_transfer', '');
        setValue('tgl_bast_transfer', '');
    };

    const onSubmit = async (data) => {
        if (!data.kode_barang) return toast.error("Kode Barang wajib diisi");
        if (!data.satker_asal && !data.nama_instansi_asal) return toast.error("Satker/Instansi Asal wajib diisi");
        if (data.jumlah < 1) return toast.error("Jumlah minimal 1");

        setLoading(true);
        const t = toast.loading("Menyimpan Transaksi Transfer Masuk...");

        try {
            const createdIds = [];
            
            for (let i = 0; i < parseInt(data.jumlah); i++) {
                const currentNup = nextNup ? (nextNup + i) : (1 + i); 
                
                const assetPayload = {
                    kode_barang: data.kode_barang,
                    nama_barang: data.nama_barang,
                    nup: String(currentNup),
                    merk: data.merk,
                    tipe: data.tipe,
                    kondisi: data.kondisi,
                    tgl_perolehan: data.tgl_perolehan,
                    tgl_buku: data.tgl_pembukuan,
                    tahun_anggaran: String(data.tahun_anggaran),
                    
                    nilai_perolehan: parseFloat(data.nilai_satuan),
                    nilai_buku: parseFloat(data.nilai_satuan),
                    nilai_satuan: parseFloat(data.nilai_satuan),
                    
                    stok: 1, 
                    source: 'transfer_masuk',
                    status_aset: 'Aktif',
                    
                    detail_lainnya: {
                        jenis_perolehan: 'TRANSFER_MASUK',
                        jenis_dokumen: data.jenis_dokumen,
                        no_bast_transfer: data.no_bast_transfer,
                        tgl_bast_transfer: data.tgl_bast_transfer,
                        satker_asal: data.satker_asal,
                        kode_satker_asal: data.kode_satker_asal,
                        nama_instansi_asal: data.nama_instansi_asal,
                        dasar_harga: data.dasar_harga,
                        keterangan: data.keterangan,
                        periode: data.periode,
                        nama_ppk: data.nama_ppk,
                        uakpb: kodeUakpb,
                        nup_asal: data.nup_asal,
                        kode_register_asal: data.kode_register_asal,
                        no_sppa: data.no_sppa,
                        no_sppa_2: data.no_sppa_2
                    },
                    
                    dokumen_sumber_id: selectedDokumen?._id
                };

                const resAsset = await api.post('/api/barang', assetPayload);
                const assetId = resAsset.data._id || resAsset.data.id;
                createdIds.push(assetId);

                await api.post('/api/transaksi', {
                    jenis: 'MASUK',
                    barang_id: assetId,
                    jumlah: 1,
                    nilai_satuan: parseFloat(data.nilai_satuan),
                    dokumen_ref: data.no_bast_transfer,
                    keterangan: `Transfer Masuk dari ${data.satker_asal || data.nama_instansi_asal}`,
                    dokumen_sumber_id: selectedDokumen?._id
                });
            }

            toast.success(`Berhasil mencatat ${data.jumlah} aset transfer masuk`, { id: t });
            reset();
            setNextNup(null);
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
        <Card className="border-purple-200 shadow-sm bg-purple-50/30">
            <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                <CardTitle className="text-lg font-bold text-purple-800 flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-purple-600"/>
                    RUH Transaksi BMN Perolehan - Transfer Masuk
                </CardTitle>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>Penerimaan aset dari Satker/Instansi lain</span>
                    <div className="flex items-center gap-2">
                        {selectedDokumen ? (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                                <span className="font-bold">Ref: {selectedDokumen.nomor_dokumen}</span>
                                <button onClick={clearDocSelection}><X size={12}/></button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleOpenDocModal} className="h-7 text-xs bg-purple-50 text-purple-700 border-purple-200">
                                <Search className="mr-1 h-3 w-3"/> Pilih Dokumen Transfer
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
                        <div className="md:col-span-4 space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">No SPPA</Label>
                            <div className="flex gap-2">
                                <Input {...register('no_sppa')} className="bg-white h-9 flex-1" placeholder="Prefix..."/>
                                <Input {...register('no_sppa_2')} className="bg-white h-9 flex-[2]" placeholder="Nomor SPPA..."/>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">Tahun Anggaran</Label>
                            <Input {...register('tahun_anggaran')} className="bg-white h-9 font-bold" />
                        </div>
                        <div className="md:col-span-6 space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">Periode Pencatatan</Label>
                            <RadioGroup defaultValue="normal" onValueChange={(v) => setValue('periode', v)} className="flex gap-4 pt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="normal" id="p1t" />
                                    <Label htmlFor="p1t" className="text-xs">Normal (1-12)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="13" id="p13t" />
                                    <Label htmlFor="p13t" className="text-xs">Periode 13</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="14" id="p14t" />
                                    <Label htmlFor="p14t" className="text-xs">Periode 14</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* ASAL TRANSFER */}
                            <div className="bg-purple-100/50 p-4 rounded-lg border border-purple-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-purple-800 border-b border-purple-300 pb-2 flex items-center gap-2">
                                    <Building2 size={14}/> ASAL TRANSFER
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Nama Satker / Unit Asal</Label>
                                    <Input {...register('satker_asal')} className="bg-white h-9" placeholder="Nama Satker pengirim..."/>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Kode Satker Asal</Label>
                                        <Input {...register('kode_satker_asal')} className="bg-white h-9" placeholder="Kode Satker..."/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Instansi Asal (jika beda K/L)</Label>
                                        <Input {...register('nama_instansi_asal')} className="bg-white h-9" placeholder="Nama K/L..."/>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">NUP Asal</Label>
                                        <Input {...register('nup_asal')} className="bg-white h-9" placeholder="NUP di Satker asal..."/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Kode Register Asal</Label>
                                        <Input {...register('kode_register_asal')} className="bg-white h-9" placeholder="Register asal..."/>
                                    </div>
                                </div>
                            </div>

                            {/* RINCIAN ASET */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                                    <Info size={14}/> RINCIAN ASET
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Kode Barang (10 Digit)</Label>
                                    <ReferensiSearch onSelect={handleReferenceSelect} type="aset" />
                                    <input type="hidden" {...register('kode_barang')} />
                                    <input type="hidden" {...register('nama_barang')} />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Deskripsi Barang</Label>
                                    <Input {...register('nama_barang')} readOnly className="bg-slate-50 h-9 text-slate-600" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Jumlah Item</Label>
                                        <Input type="number" min="1" {...register('jumlah')} className="bg-white h-9 font-bold"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Estimasi NUP</Label>
                                        <div className="h-9 px-3 py-2 bg-slate-100 border rounded text-sm font-mono flex items-center justify-between text-slate-600">
                                            <span>Awal: {nextNup || '-'}</span>
                                            <span className="text-slate-400">➜</span>
                                            <span>Akhir: {nextNup ? (nextNup + parseInt(jumlah) - 1) : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tgl. Pembukuan</Label>
                                        <Input type="date" {...register('tgl_pembukuan')} className="bg-white h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tgl. Perolehan Awal</Label>
                                        <Input type="date" {...register('tgl_perolehan')} className="bg-white h-9" />
                                    </div>
                                </div>
                            </div>

                            {/* RINCIAN LAIN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">RINCIAN LAIN ASET</h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Merk / Tipe</Label>
                                    <Input {...register('merk')} placeholder="Contoh: Toyota Avanza..." className="bg-white h-9"/>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Keterangan</Label>
                                    <Input {...register('keterangan')} placeholder="Keterangan tambahan..." className="bg-white h-9"/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* BAST TRANSFER */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                                    <span>BAST TRANSFER</span>
                                    {selectedDokumen && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Linked</span>}
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Dokumen</Label>
                                    <Select onValueChange={(v) => setValue('jenis_dokumen', v)} defaultValue="BAST">
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Pilih Jenis Dokumen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BAST">BAST (Berita Acara Serah Terima)</SelectItem>
                                            <SelectItem value="SK_Transfer">SK Transfer</SelectItem>
                                            <SelectItem value="Hibah">Hibah</SelectItem>
                                            <SelectItem value="Nota_Dinas">Nota Dinas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nomor BAST Transfer</Label>
                                        <Input {...register('no_bast_transfer')} className="bg-white h-9" placeholder="No. BAST..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tanggal BAST</Label>
                                        <Input type="date" {...register('tgl_bast_transfer')} className="bg-white h-9" readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>

                                <Separator className="my-2"/>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nilai Satuan (Rp)</Label>
                                        <Input type="number" {...register('nilai_satuan')} className="bg-white h-9 font-bold text-right"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Total Nilai (Rp)</Label>
                                        <div className="h-9 flex items-center justify-end px-3 font-bold text-purple-700 bg-white border rounded">
                                            {formatCurrency(totalNilai)}
                                        </div>
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
                                            <RadioGroupItem value="Perolehan" id="h1t" />
                                            <Label htmlFor="h1t" className="text-xs">Harga Perolehan</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Taksiran" id="h2t" />
                                            <Label htmlFor="h2t" className="text-xs">Harga Taksiran</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold">PPK Penerima</Label>
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

                            {/* KONDISI */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">KONDISI BARANG</h3>
                                <RadioGroup defaultValue="Baik" onValueChange={(v) => setValue('kondisi', v)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Baik" id="k1t" className="text-green-600 border-green-600" />
                                        <Label htmlFor="k1t" className="text-xs font-bold text-green-700">Baik</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rusak Ringan" id="k2t" className="text-yellow-600 border-yellow-600" />
                                        <Label htmlFor="k2t" className="text-xs font-bold text-yellow-700">Rusak Ringan</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rusak Berat" id="k3t" className="text-red-600 border-red-600" />
                                        <Label htmlFor="k3t" className="text-xs font-bold text-red-700">Rusak Berat</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => reset()} className="min-w-[100px]">Reset</Button>
                        <Button type="submit" disabled={loading} className="bg-purple-700 hover:bg-purple-800 text-white min-w-[150px]">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            SIMPAN TRANSFER MASUK
                        </Button>
                    </div>
                </form>
            </CardContent>

            {/* Document Selection Modal */}
            <Dialog open={isDocModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Dokumen Transfer</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {dokumenList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada dokumen transfer tersimpan.<br/>
                                <span className="text-xs">Silakan rekam dokumen dengan Kategori &quot;Transfer&quot; terlebih dahulu.</span>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-left">
                                        <th className="p-2 border">Jenis & Nomor</th>
                                        <th className="p-2 border">Tanggal</th>
                                        <th className="p-2 border">Uraian</th>
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
                                            <td className="p-2 border text-xs">{doc.uraian || '-'}</td>
                                            <td className="p-2 border text-center">
                                                <Button size="sm" variant="ghost" className="h-6 text-xs bg-purple-50 text-purple-700" onClick={() => handleSelectDoc(doc)}>
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
