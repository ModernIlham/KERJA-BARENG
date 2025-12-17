import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Plus, Save, Trash, MinusCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function PersediaanOutgoingForm({ onSuccess }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [itemsList, setItemsList] = useState([]);
    
    // Dropdown Data
    const [units, setUnits] = useState([]);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [filteredPegawai, setFilteredPegawai] = useState([]);

    // Evidence File
    const [buktiFile, setBuktiFile] = useState(null);
    
    // Header state
    const [header, setHeader] = useState({
        dokumen_ref: '',
        keterangan: '',
        unit_penerima: '', // ID Unit
        pegawai_id: '' // ID Pegawai
    });

    const { register, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            jumlah: ''
        }
    });

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const fetchDropdowns = async () => {
        try {
            const [unitRes, pegRes] = await Promise.all([
                api.get('/api/settings/unit-kerja'),
                api.get('/api/pegawai?limit=1000') // Get all pegawai
            ]);
            setUnits(unitRes.data);
            setPegawaiList(pegRes.data.data);
            setFilteredPegawai(pegRes.data.data);
        } catch (e) {
            console.error("Failed to load dropdowns", e);
        }
    };

    // Filter Pegawai when Unit changes
    useEffect(() => {
        if (!header.unit_penerima) {
            setFilteredPegawai(pegawaiList);
        } else {
            // Find unit name from ID
            const unit = units.find(u => u.id === header.unit_penerima);
            if (unit) {
                // Filter pegawai by matching unit name in eselon fields
                // Simple matching: check if unit name is in eselon3 or eselon4
                const filtered = pegawaiList.filter(p => 
                    p.eselon3 === unit.nama_unit || 
                    p.eselon4 === unit.nama_unit ||
                    p.unit_kerja_baru?.eselon3 === unit.nama_unit // handling inconsistent data structure if any
                );
                // If filter result is empty (maybe names don't match exactly), show all to be safe?
                // Or try loose match
                if (filtered.length > 0) setFilteredPegawai(filtered);
                else setFilteredPegawai(pegawaiList); // Fallback
            }
        }
    }, [header.unit_penerima, units, pegawaiList]);

    const handleItemSelect = (item) => {
        setSelectedItem(item);
    };

    const handleAddItem = (data) => {
        if (!selectedItem) return toast.error("Pilih barang terlebih dahulu");
        
        const qty = parseInt(data.jumlah);
        if (qty > selectedItem.stok) {
            return toast.error(`Stok tidak cukup! Tersedia: ${selectedItem.stok}`);
        }

        const newItem = {
            id: Date.now(),
            persediaan_id: selectedItem._id,
            kode_barang: selectedItem.kode_barang,
            nama_barang: selectedItem.nama_barang,
            jumlah: qty,
            satuan: selectedItem.satuan,
            nilai_satuan: selectedItem.nilai_satuan || 0,
            total: qty * (selectedItem.nilai_satuan || 0)
        };

        setItemsList([...itemsList, newItem]);
        toast.success("Item ditambahkan ke daftar");
        
        setSelectedItem(null);
        reset({ jumlah: '' });
    };

    const handleRemoveItem = (id) => {
        setItemsList(itemsList.filter(i => i.id !== id));
    };

    const onSubmitAll = async () => {
        if (itemsList.length === 0) return toast.error("Daftar item masih kosong");
        if (!header.dokumen_ref) return toast.error("Isi Nomor Dokumen / Nota");
        if (!header.unit_penerima) return toast.error("Pilih Unit Penerima");
        if (!header.pegawai_id) return toast.error("Pilih Pegawai Penerima");

        setLoading(true);
        const t = toast.loading("Memproses transaksi...");
        
        try {
            // 1. Submit Transaction Data
            const unitObj = units.find(u => u.id === header.unit_penerima);
            const unitName = unitObj ? unitObj.nama_unit : header.unit_penerima;

            const payload = {
                items: itemsList.map(i => ({
                    persediaan_id: i.persediaan_id,
                    jumlah: i.jumlah,
                    nilai_satuan: 0 
                })),
                dokumen_ref: header.dokumen_ref,
                keterangan: header.keterangan,
                unit_penerima: unitName, // Send Name, not ID
                pegawai_id: header.pegawai_id
            };

            const res = await api.post('/api/persediaan-transaksi/out/bulk', payload);
            const createdIds = res.data.ids;
            
            // 2. Upload Evidence if exists
            if (buktiFile && createdIds && createdIds.length > 0) {
                toast.loading("Mengupload bukti foto...", { id: t });
                const formData = new FormData();
                formData.append('file', buktiFile);
                formData.append('ids', createdIds.join(',')); // Send comma separated IDs

                await api.post('/api/persediaan-transaksi/upload-bukti', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            toast.success(`Berhasil! ${itemsList.length} item diproses`, { id: t });
            
            // Reset
            setItemsList([]);
            setHeader({ dokumen_ref: '', keterangan: '', unit_penerima: '', pegawai_id: '' });
            setBuktiFile(null);
            
            if (onSuccess) onSuccess();

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal menyimpan transaksi", { id: t });
        } finally {
            setLoading(false);
        }
    };

    const preventDecimal = (e) => {
        if (e.key === '.' || e.key === ',') {
            e.preventDefault();
        }
    };

    return (
        <div className="space-y-6 mb-8">
            <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-red-800 flex items-center gap-2">
                        <MinusCircle size={18}/> Form Barang Keluar (Persediaan)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <Label className="text-xs">No. Dokumen / Nota Dinas</Label>
                            <Input 
                                value={header.dokumen_ref} 
                                onChange={(e) => setHeader({...header, dokumen_ref: e.target.value})}
                                placeholder="Nomor Dokumen..."
                                className="bg-white"
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="text-xs">Unit / Pihak Penerima</Label>
                            <Select 
                                value={header.unit_penerima} 
                                onValueChange={(val) => setHeader({...header, unit_penerima: val})}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Pilih Unit Kerja" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.nama_unit}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Pegawai Penerima</Label>
                            <Select 
                                value={header.pegawai_id} 
                                onValueChange={(val) => setHeader({...header, pegawai_id: val})}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Pilih Pegawai" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {filteredPegawai.map(p => (
                                        <SelectItem key={p._id} value={p._id}>{p.nama_lengkap}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Keterangan</Label>
                            <Input 
                                value={header.keterangan} 
                                onChange={(e) => setHeader({...header, keterangan: e.target.value})}
                                placeholder="Keperluan..."
                                className="bg-white"
                            />
                        </div>

                         <div className="space-y-1 md:col-span-2">
                            <Label className="text-xs">Bukti Foto (Surat Jalan / Serah Terima)</Label>
                            <div className="flex gap-2 items-center">
                                <Input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => setBuktiFile(e.target.files[0])}
                                    className="bg-white"
                                />
                                {buktiFile && <span className="text-green-600 text-xs font-bold"><Upload size={14} className="inline mr-1"/>Siap Upload</span>}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-red-200 my-4"></div>

                    {/* Item Entry Section */}
                    <form onSubmit={handleSubmit(handleAddItem)}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-6 space-y-1">
                                <BarangSearch 
                                    key={selectedItem ? 'selected' : itemsList.length} 
                                    type="persediaan" 
                                    onSelect={handleItemSelect}
                                />
                                {selectedItem && (
                                    <div className="text-[10px] text-red-600 mt-1 font-bold">
                                        Stok Tersedia: {selectedItem.stok} {selectedItem.satuan}
                                    </div>
                                )}
                            </div>
                            
                            <div className="md:col-span-3 space-y-1">
                                <Label className="text-xs">Jumlah Keluar</Label>
                                <Input 
                                    type="number" 
                                    {...register('jumlah', {required: true, min: 1})} 
                                    placeholder="Qty"
                                    className="bg-white font-semibold"
                                    onKeyDown={preventDecimal}
                                />
                            </div>

                            <div className="md:col-span-3">
                                <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-800 text-white" variant="secondary">
                                    <Plus className="h-4 w-4 mr-2"/>
                                    Tambah Item
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Items List Table */}
            {itemsList.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex justify-between items-center">
                            <span>Daftar Item yang Akan Dikeluarkan</span>
                            <span className="text-red-700 font-bold">{itemsList.length} Item</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode / Nama Barang</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead>Satuan</TableHead>
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
                                        <TableCell className="text-center font-bold text-red-600">{item.jumlah}</TableCell>
                                        <TableCell>{item.satuan}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                                <Trash size={14}/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="mt-4 flex justify-end">
                            <Button 
                                onClick={onSubmitAll} 
                                className="bg-red-600 hover:bg-red-700 text-white min-w-[200px]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                                Proses Pengeluaran Barang
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
