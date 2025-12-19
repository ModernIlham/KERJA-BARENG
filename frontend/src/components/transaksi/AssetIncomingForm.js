import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, Save, Calendar as CalendarIcon, Info, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import ReferensiSearch from '../barang/ReferensiSearch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export default function AssetIncomingForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [nextNup, setNextNup] = useState(null);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Document Selection State
    const [isDocModalOpen, setIsModalOpen] = useState(false);
    const [dokumenList, setDokumenList] = useState([]);
    const [selectedDokumen, setSelectedDokumen] = useState(null);
    
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
            periode: 'normal',
            
            // New Fields
            npwp_penyedia: '',
            nama_penyedia: ''
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
    
    // Document Selection Logic
    const handleOpenDocModal = async () => {
        setIsModalOpen(true);
        try {
            const res = await api.get('/api/dokumen-sumber');
            setDokumenList(res.data.data);
        } catch (e) { console.error(e); }
    };
    
    const handleSelectDoc = (doc) => {
        setSelectedDokumen(doc);
        
        // Auto-fill fields
        setValue('jenis_dokumen', doc.jenis_dokumen);
        setValue('nomor_dokumen', doc.nomor_dokumen);
        setValue('tgl_dokumen', doc.tanggal_dokumen);
        
        // Match PPK
        if (doc.ppk_id) {
            // Find PPK Name if needed or just ID? 
            // The form uses nama_ppk value mostly, let's try to match it
            // Or better, use ID if backend supports it. The current form uses name?
            // Let's check original form: it sends "nama_ppk" string.
            if (doc.ppk_nama) setValue('nama_ppk', doc.ppk_nama);
        }
        
        if (doc.nama_penyedia) setValue('nama_penyedia', doc.nama_penyedia);
        if (doc.npwp_penyedia) setValue('npwp_penyedia', doc.npwp_penyedia);
        if (doc.uraian) setValue('keterangan', doc.uraian);
        
        setIsModalOpen(false);
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
                        uakpb: kodeUakpb, // Save UAKPB snapshot
                        
                        // New Optional Fields
                        nama_penyedia: data.nama_penyedia,
                        npwp_penyedia: data.npwp_penyedia
                    },
                    
                    // Link to Source Doc
                    dokumen_sumber_id: selectedDokumen?._id
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
                    keterangan: data.keterangan || `Perolehan BMN (${data.jenis_dokumen})`,
                    dokumen_sumber_id: selectedDokumen?._id
                });
            }

            toast.success(`Berhasil mencatat ${data.jumlah} aset baru`, { id: t });
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
        <Card className="border-slate-300 shadow-sm bg-slate-50/50">
            <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Save className="h-5 w-5 text-blue-600"/>
                    RUH Transaksi BMN Perolehan - Pembelian
                </CardTitle>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>Input data perolehan aset tetap sesuai standar SIMAN/BMN</span>
                    <div className="flex items-center gap-2">
                        {/* Source Doc Selection */}
                        {selectedDokumen ? (
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                                <span className="font-bold">Ref: {selectedDokumen.nomor_dokumen}</span>
                                <button onClick={clearDocSelection}><X size={12}/></button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleOpenDocModal} className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Search className="mr-1 h-3 w-3"/> Pilih Dokumen Sumber
                            </Button>
                        )}
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                            Kode UAKPB: <strong>{kodeUakpb || 'Belum diset'}</strong>
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
                                    <RadioGroupItem value="normal" id="p1" />
                                    <Label htmlFor="p1" className="text-xs">Normal (1-12)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="13" id="p13" />
                                    <Label htmlFor="p13" className="text-xs">Periode 13 (Unaudited)</Label>
                                </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-slate-50 p-3 rounded border border-slate-100">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">Nama Rekanan / Penyedia</Label>
                            <Input {...register('nama_penyedia')} className="bg-white h-9" placeholder="Nama PT/CV/Toko..."/>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">NPWP Rekanan</Label>
                            <Input {...register('npwp_penyedia')} className="bg-white h-9" placeholder="00.000.000.0-000.000"/>
                        </div>
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
                                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                                    <span>BAST / KUITANSI (DOKUMEN)</span>
                                    {selectedDokumen && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Linked to Ref</span>}
                                </h3>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Jenis Dokumen</Label>
                                    <Select 
                                        onValueChange={(v) => setValue('jenis_dokumen', v)} 
                                        defaultValue="Kuitansi"
                                        value={watch('jenis_dokumen')}
                                    >
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
                                        <Input {...register('nomor_dokumen', {required: true})} className="bg-white" placeholder="No. Dokumen..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Tanggal Dokumen</Label>
                                        <Input type="date" {...register('tgl_dokumen')} className="bg-white" readOnly={!!selectedDokumen}/>
                                    </div>
                                </div>

                                {/* SPM Readonly Info */}
                                {selectedDokumen && (selectedDokumen.nomor_spm || selectedDokumen.tanggal_spm) && (
                                    <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-2 rounded border border-yellow-100">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-semibold text-slate-600">Nomor SPM/SPBY</Label>
                                            <div className="text-xs font-mono font-bold text-slate-800">{selectedDokumen.nomor_spm || '-'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-semibold text-slate-600">Tanggal SPM/SPBY</Label>
                                            <div className="text-xs font-mono font-bold text-slate-800">{selectedDokumen.tanggal_spm || '-'}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Document Attachments Link */}
                                {selectedDokumen && (selectedDokumen.dokumen_attachments?.length > 0 || selectedDokumen.file_url) && (
                                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                        <Label className="text-[10px] font-semibold text-blue-800 mb-1 block">Dokumen Pendukung:</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDokumen.dokumen_attachments?.map((doc, idx) => (
                                                <a key={idx} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded text-[10px] text-blue-600 hover:bg-blue-50">
                                                    <FileText size={10}/> {doc.original_name || 'Dokumen'}
                                                </a>
                                            ))}
                                            {!selectedDokumen.dokumen_attachments?.length && selectedDokumen.file_url && (
                                                <a href={selectedDokumen.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-1 rounded text-[10px] text-blue-600 hover:bg-blue-50">
                                                    <FileText size={10}/> File Utama
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">No. Kontrak (Jika ada)</Label>
                                    <Input {...register('no_kontrak')} className="bg-white"/>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Nama Rekanan / Penyedia</Label>
                                        <Input {...register('nama_penyedia')} className="bg-white" placeholder="CV/PT..." readOnly={!!selectedDokumen}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">NPWP Rekanan</Label>
                                        <Input {...register('npwp_penyedia')} className="bg-white" placeholder="NPWP..." readOnly={!!selectedDokumen}/>
                                    </div>
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
                                    <Select 
                                        onValueChange={(v) => setValue('nama_ppk', v)}
                                        value={watch('nama_ppk')}
                                        disabled={!!selectedDokumen && !!watch('nama_ppk')}
                                    >
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

            {/* Document Selection Modal */}
            <Dialog open={isDocModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Dokumen Sumber</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <div className="mb-4">
                            <Input placeholder="Cari Dokumen..." className="mb-2" />
                        </div>
                        {dokumenList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada dokumen sumber tersimpan.<br/>
                                <span className="text-xs">Silakan rekam dokumen terlebih dahulu di menu Referensi Dokumen.</span>
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-left">
                                        <th className="p-2 border">Jenis & No</th>
                                        <th className="p-2 border">Tanggal</th>
                                        <th className="p-2 border">Penyedia / PPK</th>
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
                                            <td className="p-2 border">
                                                <div className="text-xs font-semibold">{doc.nama_penyedia || '-'}</div>
                                                <div className="text-xs text-slate-500">{doc.ppk_nama || '-'}</div>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <Button size="sm" variant="ghost" className="h-6 text-xs bg-blue-50 text-blue-700" onClick={() => handleSelectDoc(doc)}>
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
