import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';

export default function PersediaanTransactionModal({ isOpen, onClose, item, onSuccess }) {
  const [type, setType] = useState('in'); // 'in' or 'out'
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  
  // Reset form when opening/changing item
  React.useEffect(() => {
    if (isOpen && item) {
      reset({
        jumlah: 1,
        nilai_satuan: item.nilai_satuan || 0,
        expired_date: item.expired_date || '',
        keterangan: '',
        unit_penerima: '',
        dokumen_ref: ''
      });
      setType('in');
    }
  }, [isOpen, item, reset]);

  const jumlah = watch('jumlah');
  const nilaiSatuan = watch('nilai_satuan');

  const onSubmit = async (data) => {
    if (!item) return;
    setLoading(true);
    try {
      const payload = {
        jenis: type,
        persediaan_id: item._id,
        jumlah: parseInt(data.jumlah),
        nilai_satuan: type === 'in' ? parseFloat(data.nilai_satuan) : undefined, // Price only relevant for IN
        expired_date: type === 'in' && data.expired_date ? data.expired_date : undefined,
        keterangan: data.keterangan,
        unit_penerima: type === 'out' ? data.unit_penerima : undefined,
        dokumen_ref: data.dokumen_ref
      };

      await api.post(`/api/persediaan-transaksi/${type}`, payload);
      toast.success(`Transaksi Stok ${type === 'in' ? 'Masuk' : 'Keluar'} Berhasil`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Transaksi Gagal");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaksi Persediaan</DialogTitle>
          <DialogDescription>
            {item.nama_barang} ({item.kode_barang})
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'in' ? 'bg-white shadow text-green-700' : 'text-slate-500 hover:bg-slate-200'}`}
            onClick={() => setType('in')}
          >
            Stok Masuk
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'out' ? 'bg-white shadow text-red-700' : 'text-slate-500 hover:bg-slate-200'}`}
            onClick={() => setType('out')}
          >
            Stok Keluar
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-md text-xs space-y-1">
            <div className="flex justify-between">
              <span>Stok Saat Ini:</span>
              <span className="font-bold">{item.stok} {item.satuan}</span>
            </div>
            <div className="flex justify-between">
              <span>Harga Rata-Rata:</span>
              <span className="font-bold">{formatCurrency(item.nilai_satuan)}</span>
            </div>
          </div>

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
            
            {type === 'in' && (
              <div className="space-y-2">
                <Label>Harga Satuan Baru (Rp)</Label>
                <Input 
                  type="number" 
                  {...register('nilai_satuan')}
                />
                <div className="text-[10px] text-slate-500">
                  Total: {formatCurrency((jumlah || 0) * (nilaiSatuan || 0))}
                </div>
              </div>
            )}
          </div>

          {type === 'in' && (
            <div className="space-y-2">
              <Label>Expired Date Baru (Opsional)</Label>
              <Input type="date" {...register('expired_date')} />
            </div>
          )}

          {type === 'out' && (
            <div className="space-y-2">
              <Label>Unit / Pihak Penerima</Label>
              <Input {...register('unit_penerima')} placeholder="Contoh: Bidang Umum" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Referensi Dokumen (No. BA/Nota)</Label>
            <Input {...register('dokumen_ref')} placeholder="No. Dokumen..." />
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea {...register('keterangan')} placeholder="Keterangan tambahan..." className="h-20" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button 
              type="submit" 
              className={type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {type === 'in' ? 'Simpan Stok Masuk' : 'Simpan Stok Keluar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
