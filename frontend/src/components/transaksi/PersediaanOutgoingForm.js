import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Plus, Save, Trash, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';

export default function PersediaanOutgoingForm({ onSuccess }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [itemsList, setItemsList] = useState([]);
    
    // Header state
    const [header, setHeader] = useState({
        dokumen_ref: '',
        keterangan: '',
        unit_penerima: ''
    });

    const { register, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            jumlah: ''
        }
    });

    const jumlah = watch('jumlah');

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
            nilai_satuan: selectedItem.nilai_satuan || 0, // Estimasi
            total: qty * (selectedItem.nilai_satuan || 0) // Estimasi
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
        if (!header.unit_penerima) return toast.error("Isi Unit / Pihak Penerima");

        setLoading(true);
        try {
            const payload = {
                items: itemsList.map(i => ({
                    persediaan_id: i.persediaan_id,
                    jumlah: i.jumlah,
                    nilai_satuan: 0 // Not relevant for OUT, calculated by backend FIFO
                })),
                dokumen_ref: header.dokumen_ref,
                keterangan: header.keterangan,
                unit_penerima: header.unit_penerima
            };

            await api.post('/api/persediaan-transaksi/out/bulk', payload);
            
            toast.success(`Berhasil memproses pengeluaran ${itemsList.length} item`);
            
            setItemsList([]);
            setHeader({ dokumen_ref: '', keterangan: '', unit_penerima: '' });
            
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal menyimpan transaksi");
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                            <Input 
                                value={header.unit_penerima} 
                                onChange={(e) => setHeader({...header, unit_penerima: e.target.value})}
                                placeholder="Bagian Umum / Nama Pegawai..."
                                className="bg-white"
                            />
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
