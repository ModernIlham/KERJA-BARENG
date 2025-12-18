import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, Save, Calendar as CalendarIcon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import ReferensiSearch from '../barang/ReferensiSearch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function AssetIncomingForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [nextNup, setNextNup] = useState(null);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Form Setup
    const { register, handleSubmit, reset, setValue, watch, control } = useForm({
        defaultValues: {
            jumlah: 1,
            tahun_anggaran: new Date().getFullYear(),
            tgl_perolehan: new Date().toISOString().split('T')[0],
            tgl_pembukuan: new Date().toISOString().split('T')[0],
            kondisi: 'Baik',
            jenis_dokumen: 'Kuitansi',
            dasar_harga: 'Perolehan',
            periode: 'normal'
        }
    });

    // Watchers for Calculations & Logic
    const kodeBarang = watch('kode_barang');
    const jumlah = watch('jumlah') || 0;
    const nilaiSatuan = watch('nilai_satuan') || 0;
    const totalNilai = jumlah * nilaiSatuan;

    // Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get PPK List
                const resPpk = await api.get('/api/pegawai/pejabat', { params: { role: 'PPK' } });
                setPpkList(resPpk.data);

                // Get Settings for UAKPB
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

    const onSubmit = async (data) => {
        if (!data.kode_barang) return toast.error("Kode Barang wajib diisi");
        if (data.jumlah < 1) return toast.error("Jumlah minimal 1");

        setLoading(true);
        const t = toast.loading("Menyimpan Transaksi BMN...");

        try {
            const createdIds = [];
            
            // Loop for Quantity to create individual Asset Records (Standard BMN Practice)
            for (let i = 0; i < parseInt(data.jumlah); i++) {
                const currentNup = nextNup ? (nextNup + i) : (1 + i); 
                
                const assetPayload = {
                    // Standard Fields
                    kode_barang: data.kode_barang,
                    nama_barang: data.nama_barang,
                    nup: String(currentNup),
                    merk: data.merk,
                    tipe: data.tipe,
                    kondisi: data.kondisi,
                    tgl_perolehan: data.tgl_perolehan,
                    tgl_buku: data.tgl_pembukuan,
                    tahun_anggaran: String(data.tahun_anggaran),
                    
                    // Financials
                    nilai_perolehan: parseFloat(data.nilai_satuan),
                    nilai_buku: parseFloat(data.nilai_satuan),
                    nilai_satuan: parseFloat(data.nilai_satuan),
                    
                    // Defaults
                    stok: 1, 
                    source: 'manual',
                    status_aset: 'Aktif',
                    
                    // Detailed Fields
                    detail_lainnya: {
                        jenis_dokumen: data.jenis_dokumen,
                        nomor_dokumen: data.nomor_dokumen,
                        tgl_dokumen: data.tgl_dokumen,
                        no_kontrak: data.no_kontrak,
                        no_sppa: data.no_sppa,
                        no_sppa_2: data.no_sppa_2, // Second SPPA field
                        dasar_harga: data.dasar_harga,
                        keterangan: data.keterangan,
                        periode: data.periode,
                        nama_ppk: data.nama_ppk, // Name of PPK
                        uakpb: kodeUakpb // Save UAKPB snapshot
                    }
                };

                // 1. Create Asset
                const resAsset = await api.post('/api/barang', assetPayload);
                const assetId = resAsset.data._id || resAsset.data.id;
                createdIds.push(assetId);

                // 2. Create Transaction Log
                await api.post('/api/transaksi', {
                    jenis: 'MASUK',
                    barang_id: assetId,
                    jumlah: 1,
                    nilai_satuan: parseFloat(data.nilai_satuan),
                    dokumen_ref: data.nomor_dokumen,
                    keterangan: data.keterangan || `Perolehan BMN (${data.jenis_dokumen})`
                });
            }

            toast.success(`Berhasil mencatat ${data.jumlah} aset baru`, { id: t });
            reset();
            setNextNup(null);
            if (onSuccess) onSuccess();

        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.detail || "Gagal menyimpan data", { id: t });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-slate-300 shadow-sm bg-slate-50/50">
            <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Save className="h-5 w-5 text-blue-600"/>
                    RUH Transaksi BMN Perolehan - Pembelian
                </CardTitle>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>Input data perolehan aset tetap sesuai standar SIMAN/BMN</span>
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                        Kode UAKPB: <strong>{kodeUakpb || 'Belum diset'}</strong>
                    </span>
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
                                    <RadioGroupItem value="normal" id="p1" />
                                    <Label htmlFor="p1" className="text-xs">Normal (1-12)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="13" id="p13" />
                                    <Label htmlFor="p13" className="text-xs">Periode 13 (Unaudited)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="14" id="p14" />
                                    <Label htmlFor="p14" className="text-xs">Periode 14 (Audited)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
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
                                    <Input {...register('nama_barang')} readOnly className="bg-slate-50 text-slate-600" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Jumlah Item</Label>
                                        <Input 
                                            type="number" 
                                            min="1"
                                            {...register('jumlah', {required: true, min: 1})} 
                                            className="bg-white font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Estimasi NUP</Label>
                                        <div className="h-10 px-3 py-2 bg-slate-100 border rounded text-sm font-mono flex items-center justify-between text-slate-600">
                                            <span>Awal: {nextNup || '-'}</span>
                                            <span className="text-slate-400">➜</span>
                                            <span>Akhir: {nextNup ? (nextNup + parseInt(jumlah) - 1) : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tgl. Pembukuan</Label>
                                        <Input type="date" {...register('tgl_pembukuan')} className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tgl. Awal Pemakaian</Label>
                                        <Input type="date" {...register('tgl_perolehan')} className="bg-white" />
                                    </div>
                                </div>
                            </div>

                            {/* RINCIAN LAIN */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">RINCIAN LAIN ASET</h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Merk / Tipe</Label>
                                    <Input {...register('merk')} placeholder="Contoh: Toyota Avanza Type G..." className="bg-white"/>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Keterangan</Label>
                                    <Input {...register('keterangan')} placeholder="Keterangan tambahan..." className="bg-white"/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* BAST / KUITANSI */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">BAST / KUITANSI (DOKUMEN)</h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Dokumen</Label>
                                    <Select onValueChange={(v) => setValue('jenis_dokumen', v)} defaultValue="Kuitansi">
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Pilih Jenis Dokumen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Kuitansi">Kuitansi</SelectItem>
                                            <SelectItem value="BAST">BAST (Berita Acara Serah Terima)</SelectItem>
                                            <SelectItem value="Kontrak">Kontrak</SelectItem>
                                            <SelectItem value="Non_Kontrak">Non Kontrak/Penerimaan Barang</SelectItem>
                                            <SelectItem value="Kontrak_BLU">Kontrak BLU</SelectItem>
                                            <SelectItem value="Non_Kontrak_BLU">Non Kontrak BLU</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nomor Dokumen</Label>
                                        <Input {...register('nomor_dokumen', {required: true})} className="bg-white" placeholder="No. Dokumen..."/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tanggal Dokumen</Label>
                                        <Input type="date" {...register('tgl_dokumen')} className="bg-white" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">No. Kontrak (Jika ada)</Label>
                                    <Input {...register('no_kontrak')} className="bg-white"/>
                                </div>

                                <Separator className="my-2"/>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Harga Satuan (Rp)</Label>
                                        <Input 
                                            type="number" 
                                            {...register('nilai_satuan', {required: true})} 
                                            className="bg-white font-bold text-right"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Harga Total (Rp)</Label>
                                        <div className="h-10 flex items-center justify-end px-3 font-bold text-blue-700 bg-white border rounded">
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
                                            <RadioGroupItem value="Perolehan" id="h1" />
                                            <Label htmlFor="h1" className="text-xs">Harga Perolehan</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Taksiran" id="h2" />
                                            <Label htmlFor="h2" className="text-xs">Harga Taksiran</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold">Pejabat Pembuat Komitmen (PPK)</Label>
                                    <Select onValueChange={(v) => setValue('nama_ppk', v)}>
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Pilih PPK..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ppkList.length > 0 ? (
                                                ppkList.map(ppk => (
                                                    <SelectItem key={ppk._id} value={ppk.nama_lengkap}>{ppk.nama_lengkap} (NIP: {ppk.nip})</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>Tidak ada PPK terdaftar</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">
                                        *Diambil dari pegawai dengan jabatan melekat 'PPK'.
                                    </p>
                                </div>
                            </div>

                            {/* KONDISI */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">KONDISI BARANG</h3>
                                <RadioGroup defaultValue="Baik" onValueChange={(v) => setValue('kondisi', v)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Baik" id="k1" className="text-green-600 border-green-600" />
                                        <Label htmlFor="k1" className="text-xs font-bold text-green-700">Baik</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rusak Ringan" id="k2" className="text-yellow-600 border-yellow-600" />
                                        <Label htmlFor="k2" className="text-xs font-bold text-yellow-700">Rusak Ringan</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rusak Berat" id="k3" className="text-red-600 border-red-600" />
                                        <Label htmlFor="k3" className="text-xs font-bold text-red-700">Rusak Berat</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => reset()} className="min-w-[100px]">Reset</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-700 hover:bg-blue-800 text-white min-w-[150px]">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            SIMPAN TRANSAKSI
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
