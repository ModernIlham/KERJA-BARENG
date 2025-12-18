import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Plus, Save, Trash, Upload, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function PersediaanIncomingForm({ onSuccess }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [itemsList, setItemsList] = useState([]);
    const [ppkList, setPpkList] = useState([]);
    const [kodeUakpb, setKodeUakpb] = useState('');
    
    // Evidence File
    const [buktiFile, setBuktiFile] = useState(null);
    
    // Header state handled via react-hook-form for better validation
    // Note: We use a separate form context for header if we want validation there?
    // Or just simple state. The previous implementation used state for header.
    // Let's use state for header to keep it simple, but expanded.
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
                nama_pemilik_npwp: header.nama_pemilik_npwp
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
                    <CardTitle className="text-lg font-bold text-blue-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Plus size={18}/> Transaksi Masuk Persediaan (Pembelian)
                        </div>
                        <div className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            Kode UAKPB: <strong>{kodeUakpb || 'Belum diset'}</strong>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Left Column: Document Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 border-b pb-1">Informasi Dokumen</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">No. Dokumen *</Label>
                                    <Input 
                                        value={header.dokumen_ref} 
                                        onChange={(e) => setHeader({...header, dokumen_ref: e.target.value})}
                                        placeholder="No. Dok..."
                                        className="bg-white h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Tgl Dokumen *</Label>
                                    <Input 
                                        type="date"
                                        value={header.tgl_dokumen} 
                                        onChange={(e) => setHeader({...header, tgl_dokumen: e.target.value})}
                                        className="bg-white h-8"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">No. Bukti *</Label>
                                    <Input 
                                        value={header.no_bukti} 
                                        onChange={(e) => setHeader({...header, no_bukti: e.target.value})}
                                        placeholder="No. Bukti..."
                                        className="bg-white h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Tgl Buku *</Label>
                                    <Input 
                                        type="date"
                                        value={header.tgl_buku} 
                                        onChange={(e) => setHeader({...header, tgl_buku: e.target.value})}
                                        className="bg-white h-8"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-semibold">Jenis Dokumen</Label>
                                <RadioGroup 
                                    value={header.jenis_dokumen} 
                                    onValueChange={(v) => setHeader({...header, jenis_dokumen: v})} 
                                    className="grid grid-cols-1 gap-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Kontrak" id="r1" />
                                        <Label htmlFor="r1" className="text-xs font-normal">Kontrak Penerimaan Barang</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Non_Kontrak" id="r2" />
                                        <Label htmlFor="r2" className="text-xs font-normal">Non Kontrak / Penerimaan Barang</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Kontrak_BLU" id="r3" />
                                        <Label htmlFor="r3" className="text-xs font-normal">Kontrak BLU Penerimaan Barang BLU</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Non_Kontrak_BLU" id="r4" />
                                        <Label htmlFor="r4" className="text-xs font-normal">Non Kontrak / Penerimaan Barang BLU</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* Right Column: Additional Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 border-b pb-1">Detail Tambahan</h3>
                            
                            <div className="space-y-1">
                                <Label className="text-xs">Pejabat Pembuat Komitmen (PPK)</Label>
                                <Select onValueChange={handlePpkChange}>
                                    <SelectTrigger className="h-8 bg-white">
                                        <SelectValue placeholder="Pilih PPK..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ppkList.map(ppk => (
                                            <SelectItem key={ppk._id} value={ppk._id}>{ppk.nama_lengkap}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(header.jenis_dokumen.includes('Kontrak')) && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Nomor Kontrak</Label>
                                    <Input 
                                        value={header.no_kontrak} 
                                        onChange={(e) => setHeader({...header, no_kontrak: e.target.value})}
                                        className="bg-white h-8"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">NPWP (Opsional)</Label>
                                    <Input 
                                        value={header.npwp} 
                                        onChange={(e) => setHeader({...header, npwp: e.target.value})}
                                        className="bg-white h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Nama Pemilik NPWP</Label>
                                    <Input 
                                        value={header.nama_pemilik_npwp} 
                                        onChange={(e) => setHeader({...header, nama_pemilik_npwp: e.target.value})}
                                        className="bg-white h-8"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <Label className="text-xs">Keterangan</Label>
                                <Input 
                                    value={header.keterangan} 
                                    onChange={(e) => setHeader({...header, keterangan: e.target.value})}
                                    placeholder="Keterangan transaksi..."
                                    className="bg-white h-8"
                                />
                            </div>

                            <div className="space-y-1 pt-2">
                                <Label className="text-xs">Bukti Foto (Opsional)</Label>
                                <div className="flex gap-2 items-center">
                                    <Input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => setBuktiFile(e.target.files[0])}
                                        className="bg-white h-9 text-xs"
                                    />
                                    {buktiFile && <Upload size={16} className="text-green-600"/>}
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
                                        className="bg-white font-semibold"
                                        onKeyDown={preventDecimal}
                                        step="1"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-xs">Harga Satuan</Label>
                                    <Input 
                                        type="number" 
                                        {...register('nilai_satuan', {required: true})} 
                                        className="bg-white"
                                        onKeyDown={preventDecimal}
                                        step="1"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-xs">Expired Date</Label>
                                    <Input 
                                        type="date" 
                                        {...register('expired_date')} 
                                        className="bg-white"
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
        </div>
    );
}
