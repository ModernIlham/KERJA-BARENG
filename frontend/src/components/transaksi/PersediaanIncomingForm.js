import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Plus, Save, Trash, ShoppingCart, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';

export default function PersediaanIncomingForm({ onSuccess }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [itemsList, setItemsList] = useState([]);
    
    // Evidence File
    const [buktiFile, setBuktiFile] = useState(null);
    
    // Header state
    const [header, setHeader] = useState({
        dokumen_ref: '',
        keterangan: ''
    });

    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            jumlah: '',
            nilai_satuan: '',
            expired_date: ''
        }
    });

    const jumlah = watch('jumlah');
    const nilaiSatuan = watch('nilai_satuan');

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
        if (!header.dokumen_ref) return toast.error("Isi Nomor Dokumen / Nota");

        setLoading(true);
        const t = toast.loading("Menyimpan transaksi...");
        
        try {
            const payload = {
                items: itemsList.map(i => ({
                    persediaan_id: i.persediaan_id,
                    jumlah: i.jumlah,
                    nilai_satuan: i.nilai_satuan,
                    expired_date: i.expired_date
                })),
                dokumen_ref: header.dokumen_ref,
                keterangan: header.keterangan
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
            setHeader({ dokumen_ref: '', keterangan: '' });
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

    return (
        <div className="space-y-6 mb-8">
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                        <Plus size={18}/> Form Barang Masuk (Persediaan)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-1 space-y-1">
                            <Label className="text-xs">No. Dokumen / Nota Dinas</Label>
                            <Input 
                                value={header.dokumen_ref} 
                                onChange={(e) => setHeader({...header, dokumen_ref: e.target.value})}
                                placeholder="Nomor Dokumen..."
                                className="bg-white"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs">Keterangan (Global)</Label>
                            <Input 
                                value={header.keterangan} 
                                onChange={(e) => setHeader({...header, keterangan: e.target.value})}
                                placeholder="Keterangan transaksi..."
                                className="bg-white"
                            />
                        </div>
                        <div className="md:col-span-1 space-y-1">
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

                    <div className="border-t border-blue-200 my-4"></div>

                    {/* Item Entry Section */}
                    <form onSubmit={handleSubmit(handleAddItem)}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4 space-y-1">
                                <BarangSearch 
                                    key={selectedItem ? 'selected' : itemsList.length} // Force reset on list change
                                    type="persediaan" 
                                    onSelect={handleItemSelect}
                                />
                                {selectedItem && (
                                    <div className="text-[10px] text-blue-600 mt-1">
                                        Stok: {selectedItem.stok} {selectedItem.satuan} | Harga: {formatCurrency(selectedItem.nilai_satuan)}
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
                                    Tambah Item
                                </Button>
                            </div>
                        </div>
                        {/* Preview Line Total */}
                        {(jumlah && nilaiSatuan) && (
                            <div className="text-right text-xs font-semibold text-slate-600 mt-2">
                                Estimasi Subtotal: {formatCurrency(jumlah * nilaiSatuan)}
                            </div>
                        )}
                    </form>
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
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Expired</TableHead>
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
                                        <TableCell className="text-center font-bold">{item.jumlah}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.nilai_satuan)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.total)}</TableCell>
                                        <TableCell className="text-xs">{item.expired_date || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                                <Trash size={14}/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-slate-50 font-bold">
                                    <TableCell colSpan={3} className="text-right">Grand Total:</TableCell>
                                    <TableCell className="text-right text-blue-700">{formatCurrency(grandTotal)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        <div className="mt-4 flex justify-end">
                            <Button 
                                onClick={onSubmitAll} 
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                                Simpan Semua Transaksi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
