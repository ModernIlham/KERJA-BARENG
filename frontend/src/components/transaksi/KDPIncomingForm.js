import React, { useState, useEffect } from 'react';
import { FileText, Construction, Landmark, Calculator } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, Save, Search, X, Info, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import ReferensiSearch from '../barang/ReferensiSearch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

export default function KDPIncomingForm({ onSuccess }) {
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
            jenis_dokumen: 'Kontrak',
            dasar_harga: 'Perolehan',
            periode: 'normal',
            
            // KDP specific fields
            nama_pembangunan: '',
            jenis_pembangunan: '',
            lokasi_kdp: '',
            alamat_kdp: '',
            
            // Contract & Payment
            no_kontrak: '',
            tgl_kontrak: '',
            nilai_kontrak: 0,
            nama_kontraktor: '',
            npwp_kontraktor: '',
            
            // Termin
            jenis_pembayaran: 'uang_muka', // uang_muka | termin
            termin_ke: 1,
            total_termin: 1,
            nilai_termin: 0,
            persentase_termin: 0,
            catatan_termin: ''
        }
    });

    // Watchers
    const kodeBarang = watch('kode_barang');
    const nilaiKontrak = watch('nilai_kontrak') || 0;
    const nilaiTermin = watch('nilai_termin') || 0;
    const jenisPembayaran = watch('jenis_pembayaran');
    const terminKe = watch('termin_ke') || 1;
    const totalTermin = watch('total_termin') || 1;

    // Calculate percentage
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
            const res = await api.get('/api/dokumen-sumber', { params: { kategori: 'Aset Tetap KDP Perolehan' } });
            setDokumenList(res.data.data);
        } catch (e) { console.error(e); }
    };
    
    const handleSelectDoc = (doc) => {
        setSelectedDokumen(doc);
        setValue('jenis_dokumen', doc.jenis_dokumen);
        setValue('no_kontrak', doc.nomor_dokumen);
        setValue('tgl_kontrak', doc.tanggal_dokumen);
        if (doc.nilai_total) setValue('nilai_kontrak', doc.nilai_total);
        if (doc.nama_penyedia) setValue('nama_kontraktor', doc.nama_penyedia);
        if (doc.npwp_penyedia) setValue('npwp_kontraktor', doc.npwp_penyedia);
        if (doc.uraian) setValue('nama_pembangunan', doc.uraian);
        setIsModalOpen(false);
        toast.success("Data dokumen disalin");
    };
    
    const clearDocSelection = () => {
        setSelectedDokumen(null);
        setValue('no_kontrak', '');
        setValue('tgl_kontrak', '');
        setValue('nilai_kontrak', 0);
        setValue('nama_kontraktor', '');
        setValue('npwp_kontraktor', '');
    };

    const onSubmit = async (data) => {
        if (!data.kode_barang) return toast.error("Kode Barang KDP wajib diisi");
        if (!data.nama_pembangunan) return toast.error("Nama Pembangunan wajib diisi");
        if (!data.nilai_termin || data.nilai_termin <= 0) return toast.error("Nilai Pembayaran wajib diisi");

        setLoading(true);
        const t = toast.loading("Menyimpan Transaksi KDP...");

        try {
            const currentNup = nextNup || 1; 
            
            // Build KDP-specific payload
            const assetPayload = {
                kode_barang: data.kode_barang,
                nama_barang: data.nama_barang || data.nama_pembangunan,
                nup: String(currentNup),
                merk: data.nama_pembangunan, // Use nama_pembangunan as merk for display
                tipe: data.jenis_pembangunan,
                kondisi: 'Dalam Pengerjaan',
                tgl_perolehan: data.tgl_perolehan,
                tgl_buku: data.tgl_pembukuan,
                tahun_anggaran: String(data.tahun_anggaran),
                
                // Financial - use termin value
                nilai_perolehan: parseFloat(data.nilai_termin),
                nilai_buku: parseFloat(data.nilai_termin),
                nilai_satuan: parseFloat(data.nilai_termin),
                
                stok: 1, 
                source: 'kdp',
                status_aset: 'KDP', // Special status for KDP
                
                // KDP-specific details
                detail_lainnya: {
                    jenis_perolehan: 'KDP',
                    
                    // Pembangunan info
                    nama_pembangunan: data.nama_pembangunan,
                    jenis_pembangunan: data.jenis_pembangunan,
                    lokasi_kdp: data.lokasi_kdp,
                    alamat_kdp: data.alamat_kdp,
                    
                    // Kontrak info
                    no_kontrak: data.no_kontrak,
                    tgl_kontrak: data.tgl_kontrak,
                    nilai_kontrak: parseFloat(data.nilai_kontrak),
                    nama_kontraktor: data.nama_kontraktor,
                    npwp_kontraktor: data.npwp_kontraktor,
                    
                    // Pembayaran/Termin info
                    jenis_pembayaran: data.jenis_pembayaran,
                    termin_ke: parseInt(data.termin_ke),
                    total_termin: parseInt(data.total_termin),
                    nilai_termin: parseFloat(data.nilai_termin),
                    persentase_termin: parseFloat(persentaseOtomatis),
                    catatan_termin: data.catatan_termin,
                    
                    // Riwayat Termin (array to track all termins)
                    riwayat_termin: [{
                        termin_ke: parseInt(data.termin_ke),
                        tgl_bayar: data.tgl_pembukuan,
                        nilai: parseFloat(data.nilai_termin),
                        persentase: parseFloat(persentaseOtomatis),
                        catatan: data.catatan_termin,
                        jenis: data.jenis_pembayaran === 'uang_muka' ? 'Uang Muka' : `Termin ${data.termin_ke}`
                    }],
                    
                    // Standard
                    jenis_dokumen: data.jenis_dokumen,
                    dasar_harga: data.dasar_harga,
                    keterangan: data.keterangan,
                    periode: data.periode,
                    nama_ppk: data.nama_ppk,
                    uakpb: kodeUakpb,
                    no_sppa: data.no_sppa,
                    no_sppa_2: data.no_sppa_2
                },
                
                dokumen_sumber_id: selectedDokumen?._id
            };

            const resAsset = await api.post('/api/barang', assetPayload);
            const assetId = resAsset.data._id || resAsset.data.id;

            // Create Transaction Log
            const pembayaranLabel = data.jenis_pembayaran === 'uang_muka' 
                ? 'Uang Muka' 
                : `Termin ${data.termin_ke}/${data.total_termin}`;
                
            await api.post('/api/transaksi', {
                jenis: 'MASUK',
                barang_id: assetId,
                jumlah: 1,
                nilai_satuan: parseFloat(data.nilai_termin),
                dokumen_ref: data.no_kontrak,
                keterangan: `KDP ${data.nama_pembangunan} - ${pembayaranLabel} (${persentaseOtomatis}%)`,
                dokumen_sumber_id: selectedDokumen?._id
            });

            toast.success(`Berhasil mencatat KDP - ${pembayaranLabel}`, { id: t });
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
        <Card className="border-amber-200 shadow-sm bg-amber-50/30">
            <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                    <Construction className="h-5 w-5 text-amber-600"/>
                    RUH Transaksi KDP Perolehan
                </CardTitle>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>Konstruksi Dalam Pengerjaan - Pencatatan Uang Muka & Termin</span>
                    <div className="flex items-center gap-2">
                        {selectedDokumen ? (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                                <span className="font-bold">Kontrak: {selectedDokumen.nomor_dokumen}</span>
                                <button onClick={clearDocSelection}><X size={12}/></button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleOpenDocModal} className="h-7 text-xs bg-amber-50 text-amber-700 border-amber-200">
                                <Search className="mr-1 h-3 w-3"/> Pilih Sumber Dokumen
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
                                    <RadioGroupItem value="normal" id="p1k" />
                                    <Label htmlFor="p1k" className="text-xs">Normal (1-12)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="13" id="p13k" />
                                    <Label htmlFor="p13k" className="text-xs">Periode 13</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="14" id="p14k" />
                                    <Label htmlFor="p14k" className="text-xs">Periode 14</Label>
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
                                    <Info size={14}/> RINCIAN ASET KDP
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Kode Barang KDP (Golongan 7)</Label>
                                    <ReferensiSearch onSelect={handleReferenceSelect} type="kdp" />
                                    <input type="hidden" {...register('kode_barang')} />
                                    <input type="hidden" {...register('nama_barang')} />
                                    <p className="text-[10px] text-amber-600">*KDP menggunakan kode golongan 7 (Konstruksi Dalam Pengerjaan)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Deskripsi Barang</Label>
                                    <Input {...register('nama_barang')} readOnly className="bg-slate-50 h-9 text-slate-600" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tgl. Pembukuan</Label>
                                        <Input type="date" {...register('tgl_pembukuan')} className="bg-white h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Estimasi NUP</Label>
                                        <div className="h-9 px-3 py-2 bg-slate-100 border rounded text-sm font-mono flex items-center text-slate-600">
                                            {nextNup || '(Auto)'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RINCIAN LAIN KDP */}
                            <div className="bg-amber-100/50 p-4 rounded-lg border border-amber-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-amber-800 border-b border-amber-300 pb-2 flex items-center gap-2">
                                    <Construction size={14}/> RINCIAN LAIN KDP
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Nama Pembangunan *</Label>
                                    <Input {...register('nama_pembangunan', { required: true })} 
                                           className="bg-white h-9" 
                                           placeholder="Contoh: Pembangunan Gedung Kantor Baru..."/>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Pembangunan</Label>
                                    <Select onValueChange={(v) => setValue('jenis_pembangunan', v)}>
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Pilih Jenis..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Gedung Kantor">Gedung Kantor</SelectItem>
                                            <SelectItem value="Gedung Pendidikan">Gedung Pendidikan</SelectItem>
                                            <SelectItem value="Gedung Kesehatan">Gedung Kesehatan</SelectItem>
                                            <SelectItem value="Jalan">Jalan</SelectItem>
                                            <SelectItem value="Jembatan">Jembatan</SelectItem>
                                            <SelectItem value="Irigasi">Irigasi</SelectItem>
                                            <SelectItem value="Jaringan">Jaringan</SelectItem>
                                            <SelectItem value="Bangunan Air">Bangunan Air</SelectItem>
                                            <SelectItem value="Instalasi">Instalasi</SelectItem>
                                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold flex items-center gap-1">
                                        <MapPin size={12}/> Lokasi KDP
                                    </Label>
                                    <Input {...register('lokasi_kdp')} 
                                           className="bg-white h-9" 
                                           placeholder="Nama lokasi / koordinat..."/>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Alamat Lengkap KDP</Label>
                                    <Textarea {...register('alamat_kdp')} 
                                              className="bg-white" 
                                              rows={2}
                                              placeholder="Alamat lengkap lokasi pembangunan..."/>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Keterangan Tambahan</Label>
                                    <Input {...register('keterangan')} placeholder="Catatan lain..." className="bg-white h-9"/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* KONTRAK */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                                    <span className="flex items-center gap-2"><FileText size={14}/> KONTRAK</span>
                                    {selectedDokumen && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Linked</span>}
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nomor Kontrak</Label>
                                        <Input {...register('no_kontrak')} className="bg-white h-9" placeholder="No. Kontrak..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tanggal Kontrak</Label>
                                        <Input type="date" {...register('tgl_kontrak')} className="bg-white h-9" readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Nilai Kontrak (Rp)</Label>
                                    <Input type="number" {...register('nilai_kontrak')} 
                                           className="bg-white h-9 font-bold text-right text-blue-700" 
                                           readOnly={!!selectedDokumen}/>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nama Kontraktor</Label>
                                        <Input {...register('nama_kontraktor')} className="bg-white h-9" placeholder="CV/PT..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">NPWP Kontraktor</Label>
                                        <Input {...register('npwp_kontraktor')} className="bg-white h-9" placeholder="NPWP..." readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>
                            </div>

                            {/* PEMBAYARAN / TERMIN */}
                            <div className="bg-amber-100/50 p-4 rounded-lg border border-amber-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-amber-800 border-b border-amber-300 pb-2 flex items-center gap-2">
                                    <Calculator size={14}/> PEMBAYARAN / TERMIN
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Pembayaran</Label>
                                    <RadioGroup 
                                        defaultValue="uang_muka" 
                                        onValueChange={(v) => setValue('jenis_pembayaran', v)} 
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="uang_muka" id="jb1" className="text-amber-600 border-amber-600" />
                                            <Label htmlFor="jb1" className="text-xs font-bold text-amber-700">Uang Muka</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="termin" id="jb2" className="text-blue-600 border-blue-600" />
                                            <Label htmlFor="jb2" className="text-xs font-bold text-blue-700">Termin</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {jenisPembayaran === 'termin' && (
                                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded border border-blue-200">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-blue-800">Termin Ke-</Label>
                                            <Input type="number" min="1" {...register('termin_ke')} className="bg-white h-9 font-bold"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-blue-800">Dari Total Termin</Label>
                                            <Input type="number" min="1" {...register('total_termin')} className="bg-white h-9 font-bold"/>
                                        </div>
                                    </div>
                                )}

                                <Separator className="my-2"/>

                                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">
                                            Nilai {jenisPembayaran === 'uang_muka' ? 'Uang Muka' : `Termin ${terminKe}`} (Rp) *
                                        </Label>
                                        <Input type="number" {...register('nilai_termin', { required: true })} 
                                               className="bg-white h-9 font-bold text-right"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Persentase (%)</Label>
                                        <div className="h-9 flex items-center justify-end px-3 font-bold text-amber-700 bg-amber-50 border rounded">
                                            {persentaseOtomatis}%
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {nilaiKontrak > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-600">
                                            <span>Progress Pembayaran</span>
                                            <span>{formatCurrency(nilaiTermin)} dari {formatCurrency(nilaiKontrak)}</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-amber-500 transition-all" 
                                                style={{ width: `${Math.min(parseFloat(persentaseOtomatis), 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Catatan Termin</Label>
                                    <Textarea {...register('catatan_termin')} 
                                              className="bg-white" 
                                              rows={2}
                                              placeholder={`Catatan untuk ${jenisPembayaran === 'uang_muka' ? 'uang muka' : `termin ke-${terminKe}`}...`}/>
                                </div>
                            </div>

                            {/* PPK */}
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">PPK & PEROLEHAN</h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Dasar Harga</Label>
                                    <RadioGroup defaultValue="Perolehan" onValueChange={(v) => setValue('dasar_harga', v)} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Perolehan" id="h1k" />
                                            <Label htmlFor="h1k" className="text-xs">Harga Perolehan</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Taksiran" id="h2k" />
                                            <Label htmlFor="h2k" className="text-xs">Harga Taksiran</Label>
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
                        <Button type="button" variant="outline" onClick={() => reset()} className="min-w-[100px]">Reset</Button>
                        <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800 text-white min-w-[150px]">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            SIMPAN KDP
                        </Button>
                    </div>
                </form>
            </CardContent>

            {/* Document Selection Modal */}
            <Dialog open={isDocModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Sumber Dokumen (Kontrak KDP)</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {dokumenList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada dokumen KDP tersimpan.<br/>
                                <span className="text-xs">Silakan rekam dokumen dengan Kategori "KDP" terlebih dahulu.</span>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-left">
                                        <th className="p-2 border">Jenis & Nomor</th>
                                        <th className="p-2 border">Tanggal</th>
                                        <th className="p-2 border">Nilai Kontrak</th>
                                        <th className="p-2 border">Kontraktor</th>
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
                                            <td className="p-2 border text-xs">
                                                <div>{doc.nama_penyedia || '-'}</div>
                                                <div className="text-slate-400">{doc.npwp_penyedia || ''}</div>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <Button size="sm" variant="ghost" className="h-6 text-xs bg-amber-50 text-amber-700" onClick={() => handleSelectDoc(doc)}>
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
