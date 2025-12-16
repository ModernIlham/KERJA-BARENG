import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';

export default function PersediaanIncomingForm({ onSuccess }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Header state (persisted between entries)
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

    const onSubmit = async (data) => {
        if (!selectedItem) return toast.error("Pilih barang terlebih dahulu");
        if (!header.dokumen_ref) return toast.error("Isi Nomor Dokumen / Nota");

        setLoading(true);
        try {
            const payload = {
                jenis: 'in',
                persediaan_id: selectedItem._id,
                jumlah: parseInt(data.jumlah),
                nilai_satuan: parseFloat(data.nilai_satuan),
                expired_date: data.expired_date || null,
                keterangan: header.keterangan,
                dokumen_ref: header.dokumen_ref,
            };

            await api.post('/api/persediaan-transaksi/in', payload);
            
            toast.success(`Berhasil menambahkan: ${selectedItem.nama_barang}`);
            
            // Reset item fields ONLY, keep header
            setSelectedItem(null);
            reset({
                jumlah: '',
                nilai_satuan: '',
                expired_date: ''
            });
            // Force reset search input? BarangSearch needs key to reset or exposed method.
            // Using key prop on BarangSearch to force re-mount is simplest.
            
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal menyimpan transaksi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-blue-200 bg-blue-50/50 mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                    <Plus size={18}/> Form Barang Masuk (Persediaan)
                </CardTitle>
            </CardHeader>
            <CardContent>
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
                    <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs">Keterangan (Global)</Label>
                        <Input 
                            value={header.keterangan} 
                            onChange={(e) => setHeader({...header, keterangan: e.target.value})}
                            placeholder="Keterangan transaksi..."
                            className="bg-white"
                        />
                    </div>
                </div>

                <div className="border-t border-blue-200 my-4"></div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4 space-y-1">
                            <BarangSearch 
                                key={selectedItem ? 'selected' : 'empty'} // Reset on submit
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
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs">Harga Satuan</Label>
                            <Input 
                                type="number" 
                                {...register('nilai_satuan', {required: true})} 
                                className="bg-white"
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
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-4 w-4"/> : <Save className="h-4 w-4 mr-2"/>}
                                Simpan Item
                            </Button>
                        </div>
                    </div>
                    {/* Preview Total */}
                    {(jumlah && nilaiSatuan) && (
                        <div className="text-right text-xs font-semibold text-slate-600 mt-2">
                            Total Item: {formatCurrency(jumlah * nilaiSatuan)}
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
