import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Plus, Save, Trash, Upload, Info, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export default function PersediaanIncomingForm({ onSuccess }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [itemsList, setItemsList] = useState([]);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Evidence File
    const [buktiFile, setBuktiFile] = useState(null);
    
    // Document Selection
    const [isDocModalOpen, setIsModalOpen] = useState(false);
    const [dokumenList, setDokumenList] = useState([]);
    const [selectedDokumen, setSelectedDokumen] = useState(null);

    // Header state
    const [header, setHeader] = useState({
        dokumen_ref: '', // No Dokumen
        no_bukti: '',
        tgl_dokumen: new Date().toISOString().split('T')[0],
        tgl_buku: new Date().toISOString().split('T')[0],
        jenis_dokumen: 'Kontrak',
        keterangan: '',
        no_kontrak: '',
        ppk_id: '',
        ppk_nama: '',
        npwp: '',
        nama_pemilik_npwp: ''
    });

    // Item Form
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            jumlah: '',
            nilai_satuan: '',
            expired_date: ''
        }
    });

    const jumlah = watch('jumlah');
    const nilaiSatuan = watch('nilai_satuan');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
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

    const handleItemSelect = (item) => {
        setSelectedItem(item);
        setValue('nilai_satuan', item.nilai_satuan || 0);
    };

    // Document Selection Logic
    const handleOpenDocModal = async () => {
        setIsModalOpen(true);
        try {
            // FILTER ONLY 'Persediaan' or 'Umum'
            const res = await api.get('/api/dokumen-sumber', { params: { kategori: 'Persediaan' } });
            setDokumenList(res.data.data);
        } catch (e) { console.error(e); }
    };
    
    const handleSelectDoc = (doc) => {
        setSelectedDokumen(doc);
        
        setHeader(prev => ({
            ...prev,
            dokumen_ref: doc.nomor_dokumen,
            jenis_dokumen: doc.jenis_dokumen,
            tgl_dokumen: doc.tanggal_dokumen,
            keterangan: doc.uraian || prev.keterangan,
            ppk_id: doc.ppk_id || prev.ppk_id,
            ppk_nama: doc.ppk_nama || prev.ppk_nama,
            npwp: doc.npwp_penyedia || prev.npwp,
            nama_pemilik_npwp: doc.nama_penyedia || prev.nama_pemilik_npwp
        }));
        
        setIsModalOpen(false);
        toast.success("Data dokumen disalin");
    };
    
    const clearDocSelection = () => {
        setSelectedDokumen(null);
        setHeader(prev => ({
            ...prev,
            dokumen_ref: '',
            ppk_id: '',
            ppk_nama: '',
            npwp: '',
            nama_pemilik_npwp: ''
        }));
    };

    const handleAddItem = (data) => {
        if (!selectedItem) return toast.error("Pilih barang terlebih dahulu");
        
        const newItem = {
            id: Date.now(), // Temp ID
            persediaan_id: selectedItem._id,
            kode_barang: selectedItem.kode_barang,
            nama_barang: selectedItem.nama_barang,
            golongan: selectedItem.golongan_barang || selectedItem.detail_lainnya?.sub_sub_kelompok || '-',
            satuan: selectedItem.satuan || 'Buah',
            jumlah: parseInt(data.jumlah),
            nilai_satuan: parseFloat(data.nilai_satuan),
            expired_date: data.expired_date || null,
            total: parseInt(data.jumlah) * parseFloat(data.nilai_satuan)
        };

        setItemsList([...itemsList, newItem]);
        toast.success("Item ditambahkan ke daftar");
        
        // Reset item fields
        setSelectedItem(null);
        reset({
            jumlah: '',
            nilai_satuan: '',
            expired_date: ''
        });
    };

    const handleRemoveItem = (id) => {
        setItemsList(itemsList.filter(i => i.id !== id));
    };

    const onSubmitAll = async () => {
        if (itemsList.length === 0) return toast.error("Daftar item masih kosong");
        if (!header.dokumen_ref) return toast.error("Isi Nomor Dokumen");
        if (!header.no_bukti) return toast.error("Isi Nomor Bukti");

        setLoading(true);
        const t = toast.loading("Menyimpan transaksi persediaan...");
        
        try {
            const payload = {
                items: itemsList.map(i => ({
                    persediaan_id: i.persediaan_id,
                    jumlah: i.jumlah,
                    nilai_satuan: i.nilai_satuan,
                    expired_date: i.expired_date
                })),
                dokumen_ref: header.dokumen_ref,
                no_bukti: header.no_bukti,
                tgl_dokumen: header.tgl_dokumen,
                tgl_buku: header.tgl_buku,
                jenis_dokumen: header.jenis_dokumen,
                keterangan: header.keterangan,
                
                // Extra fields
                no_kontrak: header.no_kontrak,
                ppk_id: header.ppk_id,
                ppk_nama: header.ppk_nama,
                npwp: header.npwp,
                nama_pemilik_npwp: header.nama_pemilik_npwp,
                
                // Link
                dokumen_sumber_id: selectedDokumen?._id
            };

            const res = await api.post('/api/persediaan-transaksi/in/bulk', payload);
            const createdIds = res.data.ids;
            
            // Upload Evidence if exists
            if (buktiFile && createdIds && createdIds.length > 0) {
                toast.loading("Mengupload bukti foto...", { id: t });
                const formData = new FormData();
                formData.append('file', buktiFile);
                formData.append('ids', createdIds.join(',')); // Send comma separated IDs

                await api.post('/api/persediaan-transaksi/upload-bukti', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            toast.success(`Berhasil menyimpan ${itemsList.length} item transaksi`, { id: t });
            
            setItemsList([]);
            // Reset header but keep dates today
            setHeader(prev => ({ 
                ...prev, 
                dokumen_ref: '', 
                no_bukti: '', 
                keterangan: '',
                no_kontrak: '',
                npwp: '',
                nama_pemilik_npwp: ''
            }));
            setSelectedDokumen(null);
            setBuktiFile(null);
            
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal menyimpan transaksi", { id: t });
        } finally {
            setLoading(false);
        }
    };

    const grandTotal = itemsList.reduce((sum, item) => sum + item.total, 0);

    const preventDecimal = (e) => {
        if (e.key === '.' || e.key === ',') {
            e.preventDefault();
        }
    };
    
    // Derived state for PPK selection
    const handlePpkChange = (ppkId) => {
        const ppk = ppkList.find(p => p._id === ppkId);
        if (ppk) {
            setHeader(prev => ({ ...prev, ppk_id: ppk._id, ppk_nama: ppk.nama_lengkap }));
        }
    };

    return (
        <div className="space-y-6 mb-8">
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
                            <Plus size={18}/> Transaksi Masuk Persediaan (Pembelian)
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {/* Source Doc Selection */}
                            {selectedDokumen ? (
                                <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">
                                    <span className="font-bold text-xs">Ref: {selectedDokumen.nomor_dokumen}</span>
                                    <button onClick={clearDocSelection}><X size={12}/></button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleOpenDocModal} className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <Search className="mr-1 h-3 w-3"/> Pilih Dokumen Sumber (Persediaan)
                                </Button>
                            )}
                            <div className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                Kode UAKPB: <strong>{kodeUakpb || 'Belum diset'}</strong>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {/* Header Section - Compact Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Column 1: Document Basics */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1">Dokumen</h3>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">No. Dokumen *</Label>
                                <Input 
                                    value={header.dokumen_ref} 
                                    onChange={(e) => setHeader({...header, dokumen_ref: e.target.value})}
                                    placeholder="No. Dok..."
                                    className="bg-white h-9 text-xs"
                                    readOnly={!!selectedDokumen}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Tgl Dokumen *</Label>
                                <Input 
                                    type="date"
                                    value={header.tgl_dokumen} 
                                    onChange={(e) => setHeader({...header, tgl_dokumen: e.target.value})}
                                    className="bg-white h-9 text-xs"
                                    readOnly={!!selectedDokumen}
                                />
                            </div>
                            
                            {/* SPM Info (Read Only) */}
                            {selectedDokumen && (selectedDokumen.nomor_spm || selectedDokumen.tanggal_spm) && (
                                <div className="p-2 bg-yellow-50 rounded border border-yellow-100 space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">No SPM/SPBY</span>
                                        <span className="text-[10px] font-mono font-bold">{selectedDokumen.nomor_spm || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">Tgl SPM</span>
                                        <span className="text-[10px] font-mono font-bold">{selectedDokumen.tanggal_spm || '-'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Document Links */}
                            {selectedDokumen && (selectedDokumen.dokumen_attachments?.length > 0 || selectedDokumen.file_url) && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-blue-800">File Dokumen:</Label>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedDokumen.dokumen_attachments?.map((doc, idx) => (
                                            <a key={idx} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-0.5 rounded text-[9px] text-blue-600 hover:bg-blue-50">
                                                <FileText size={8}/> {doc.original_name?.substring(0,10) || 'Doc'}...
                                            </a>
                                        ))}
                                        {!selectedDokumen.dokumen_attachments?.length && selectedDokumen.file_url && (
                                            <a href={selectedDokumen.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-white border border-blue-200 px-2 py-0.5 rounded text-[9px] text-blue-600 hover:bg-blue-50">
                                                <FileText size={8}/> File
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-1 pt-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Jenis Dokumen</Label>
                                <RadioGroup 
                                    value={header.jenis_dokumen} 
                                    onValueChange={(v) => setHeader({...header, jenis_dokumen: v})} 
                                    className="flex gap-4 flex-wrap"
                                >
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Kontrak" id="r1" className="h-3 w-3"/>
                                        <Label htmlFor="r1" className="text-[10px]">Kontrak</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Non_Kontrak" id="r2" className="h-3 w-3"/>
                                        <Label htmlFor="r2" className="text-[10px]">Non-Kontrak</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Kontrak_BLU" id="r3" className="h-3 w-3"/>
                                        <Label htmlFor="r3" className="text-[10px]">Kontrak BLU</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="Non_Kontrak_BLU" id="r4" className="h-3 w-3"/>
                                        <Label htmlFor="r4" className="text-[10px]">Non-Kontrak BLU</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* Column 2: Evidence & Contract */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1">Bukti & Kontrak</h3>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">No. Bukti / Kuitansi *</Label>
                                <Input 
                                    value={header.no_bukti} 
                                    onChange={(e) => setHeader({...header, no_bukti: e.target.value})}
                                    className="bg-white h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Tgl Pembukuan *</Label>
                                <Input 
                                    type="date"
                                    value={header.tgl_buku} 
                                    onChange={(e) => setHeader({...header, tgl_buku: e.target.value})}
                                    className="bg-white h-9 text-xs"
                                />
                            </div>
                            {(header.jenis_dokumen.includes('Kontrak')) && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-slate-600">Nomor Kontrak</Label>
                                    <Input 
                                        value={header.no_kontrak} 
                                        onChange={(e) => setHeader({...header, no_kontrak: e.target.value})}
                                        className="bg-white h-9 text-xs"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Column 3: Supplier & PPK */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1">Pihak Terkait</h3>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Pejabat Pembuat Komitmen (PPK)</Label>
                                <Select 
                                    onValueChange={handlePpkChange} 
                                    value={header.ppk_id}
                                    disabled={!!selectedDokumen && !!header.ppk_id}
                                >
                                    <SelectTrigger className="h-9 bg-white text-xs">
                                        <SelectValue placeholder="Pilih PPK..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ppkList.map(ppk => (
                                            <SelectItem key={ppk._id} value={ppk._id} className="text-xs">{ppk.nama_lengkap}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-slate-600">NPWP</Label>
                                    <Input 
                                        value={header.npwp} 
                                        onChange={(e) => setHeader({...header, npwp: e.target.value})}
                                        className="bg-white h-9 text-xs"
                                        readOnly={!!selectedDokumen}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-slate-600">Rekanan</Label>
                                    <Input 
                                        value={header.nama_pemilik_npwp} 
                                        onChange={(e) => setHeader({...header, nama_pemilik_npwp: e.target.value})}
                                        className="bg-white h-9 text-xs"
                                        readOnly={!!selectedDokumen}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold text-slate-600">Keterangan / Bukti Foto</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        value={header.keterangan} 
                                        onChange={(e) => setHeader({...header, keterangan: e.target.value})}
                                        placeholder="Ket..."
                                        className="bg-white h-9 text-xs flex-1"
                                    />
                                    <div className="relative">
                                        <Input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setBuktiFile(e.target.files[0])}
                                            className="w-[80px] h-9 text-[10px] p-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-blue-200 my-4"></div>

                    {/* Item Entry Section */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Info size={14}/> Input Barang Persediaan
                        </h3>
                        <form onSubmit={handleSubmit(handleAddItem)}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-4 space-y-1">
                                    <BarangSearch 
                                        key={selectedItem ? 'selected' : itemsList.length} 
                                        type="persediaan" 
                                        onSelect={handleItemSelect}
                                    />
                                    {selectedItem && (
                                        <div className="text-[10px] text-blue-600 mt-1">
                                            Stok: {selectedItem.stok} {selectedItem.satuan} | Harga Terakhir: {formatCurrency(selectedItem.nilai_satuan)}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-xs">Jumlah</Label>
                                    <Input 
                                        type="number" 
                                        {...register('jumlah', {required: true, min: 1})} 
                                        placeholder="Qty"
                                        className="bg-white h-9 font-semibold"
                                        onKeyDown={preventDecimal}
                                        step="1"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-xs">Harga Satuan</Label>
                                    <Input 
                                        type="number" 
                                        {...register('nilai_satuan', {required: true})} 
                                        className="bg-white h-9"
                                        onKeyDown={preventDecimal}
                                        step="1"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-xs">Expired Date</Label>
                                    <Input 
                                        type="date" 
                                        {...register('expired_date')} 
                                        className="bg-white h-9"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-800 text-white" variant="secondary">
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Tambah
                                    </Button>
                                </div>
                            </div>
                            {/* Preview Line Total */}
                            {(jumlah && nilaiSatuan) && (
                                <div className="text-right text-xs font-semibold text-slate-600 mt-2">
                                    Subtotal: {formatCurrency(jumlah * nilaiSatuan)}
                                </div>
                            )}
                        </form>
                    </div>
                </CardContent>
            </Card>

            {/* Items List Table */}
            {itemsList.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex justify-between items-center">
                            <span>Daftar Item yang Akan Disimpan</span>
                            <span className="text-blue-700 font-bold">{itemsList.length} Item</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode / Nama Barang</TableHead>
                                    <TableHead>Golongan (Sub-Sub Kel)</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {itemsList.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-bold">{item.nama_barang}</div>
                                            <div className="text-xs text-slate-500">{item.kode_barang}</div>
                                        </TableCell>
                                        <TableCell className="text-xs">{item.golongan}</TableCell>
                                        <TableCell className="text-center font-bold">
                                            {item.jumlah} <span className="text-[10px] font-normal text-slate-500">{item.satuan}</span>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.nilai_satuan)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.total)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                                <Trash size={14}/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-slate-50 font-bold">
                                    <TableCell colSpan={4} className="text-right">Grand Total:</TableCell>
                                    <TableCell className="text-right text-blue-700">{formatCurrency(grandTotal)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        <div className="mt-4 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => {
                                setItemsList([]);
                                setHeader(prev => ({ ...prev, dokumen_ref: '', no_bukti: '' }));
                            }}>
                                Batal
                            </Button>
                            <Button 
                                onClick={onSubmitAll} 
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                                Simpan Transaksi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Document Selection Modal */}
            <Dialog open={isDocModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Dokumen Sumber (Persediaan)</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <div className="mb-4">
                            <Input placeholder="Cari Dokumen..." className="mb-2" />
                        </div>
                        {dokumenList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Tidak ada dokumen sumber khusus Persediaan tersimpan.<br/>
                                <span className="text-xs">Silakan rekam dokumen dengan Kategori "Persediaan" atau "Umum" terlebih dahulu.</span>
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
        </div>
    );
}
