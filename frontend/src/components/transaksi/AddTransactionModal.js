import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';

export default function AddTransactionModal({ isOpen, onClose, type, assetType, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  
  const jumlah = watch('jumlah');
  const nilaiSatuan = watch('nilai_satuan');

  useEffect(() => {
      if(isOpen) {
          reset();
          setSelectedItem(null);
      }
  }, [isOpen]);

  useEffect(() => {
      if(selectedItem) {
          setValue('nilai_satuan', selectedItem.nilai_satuan || 0);
          if (type === 'out') setValue('nilai_satuan', selectedItem.nilai_satuan || 0); // Readonly
      }
  }, [selectedItem]);

  const onSubmit = async (data) => {
    if (!selectedItem) return toast.error("Pilih barang terlebih dahulu");
    setLoading(true);
    try {
      let endpoint = '';
      let payload = {
          jenis: type, // 'in' or 'out' / 'MASUK' or 'KELUAR'
          jumlah: parseInt(data.jumlah),
          keterangan: data.keterangan,
          dokumen_ref: data.dokumen_ref,
          pegawai_id: data.pegawai_id
      };

      if (assetType === 'persediaan') {
          endpoint = `/api/persediaan-transaksi/${type}`; // 'in' or 'out'
          payload.persediaan_id = selectedItem._id;
          if (type === 'in') {
              payload.nilai_satuan = parseFloat(data.nilai_satuan);
              payload.expired_date = data.expired_date || null;
          }
          if (type === 'out') {
              payload.unit_penerima = data.unit_penerima;
          }
      } else {
          // Aset Tetap
          endpoint = `/api/transaksi/`;
          payload.jenis = type === 'in' ? 'MASUK' : 'KELUAR';
          payload.barang_id = selectedItem._id;
          payload.nilai_satuan = parseFloat(data.nilai_satuan);
      }

      await api.post(endpoint, payload);
      toast.success("Transaksi berhasil disimpan");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Transaksi Gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
              {type === 'in' ? 'Barang Masuk' : 'Barang Keluar'} - {assetType === 'persediaan' ? 'Persediaan' : 'Aset Tetap'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <BarangSearch type={assetType} onSelect={setSelectedItem} />
          
          {selectedItem && (
              <div className="p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                  <div className="font-bold">{selectedItem.nama_barang}</div>
                  <div>Stok Saat Ini: {selectedItem.stok}</div>
              </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jumlah {type === 'in' ? 'Masuk' : 'Keluar'} *</Label>
              <Input 
                type="number" 
                min="1" 
                {...register('jumlah', { required: true, min: 1 })}
                className="font-bold"
              />
            </div>
            
            {(type === 'in' || assetType === 'aset') && (
              <div className="space-y-2">
                <Label>Harga Satuan (Rp)</Label>
                <Input 
                  type="number" 
                  {...register('nilai_satuan')}
                  disabled={type === 'out' && assetType === 'persediaan'} // Fixed price for inventory out
                />
              </div>
            )}
          </div>
          
          {/* Total Value Preview */}
          <div className="text-right text-xs text-slate-500 font-medium">
             Total: {formatCurrency((jumlah || 0) * (nilaiSatuan || 0))}
          </div>

          {assetType === 'persediaan' && type === 'in' && (
            <div className="space-y-2">
              <Label>Expired Date (Opsional)</Label>
              <Input type="date" {...register('expired_date')} />
            </div>
          )}

          {type === 'out' && assetType === 'persediaan' && (
            <div className="space-y-2">
              <Label>Unit Penerima</Label>
              <Input {...register('unit_penerima')} placeholder="Bagian Umum..." />
            </div>
          )}

          <div className="space-y-2">
            <Label>No. Dokumen / Nota Dinas</Label>
            <Input {...register('dokumen_ref')} placeholder="No. BA/Surat..." />
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea {...register('keterangan')} placeholder="Keterangan..." className="h-20" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-slate-900" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
