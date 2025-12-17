import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import BarangSearch from '../barang/BarangSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function AddTransactionModal({ isOpen, onClose, type, assetType, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Dropdown Data
  const [units, setUnits] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [filteredPegawai, setFilteredPegawai] = useState([]);
  
  // Evidence File
  const [buktiFile, setBuktiFile] = useState(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm();
  
  const jumlah = watch('jumlah');
  const nilaiSatuan = watch('nilai_satuan');
  const selectedUnit = watch('unit_penerima_id'); // We'll use ID internally

  useEffect(() => {
      if(isOpen) {
          reset();
          setSelectedItem(null);
          setBuktiFile(null);
          fetchDropdowns();
      }
  }, [isOpen]);

  useEffect(() => {
      if(selectedItem) {
          setValue('nilai_satuan', selectedItem.nilai_satuan || 0);
          if (type === 'out') setValue('nilai_satuan', selectedItem.nilai_satuan || 0); // Readonly
      }
  }, [selectedItem]);

  const fetchDropdowns = async () => {
        try {
            const [unitRes, pegRes] = await Promise.all([
                api.get('/api/settings/unit-kerja'),
                api.get('/api/pegawai?limit=1000') 
            ]);
            setUnits(unitRes.data);
            setPegawaiList(pegRes.data.data);
            setFilteredPegawai(pegRes.data.data);
        } catch (e) {
            console.error("Failed to load dropdowns", e);
        }
  };

  // Filter Pegawai
  useEffect(() => {
      if (!selectedUnit) {
          setFilteredPegawai(pegawaiList);
      } else {
          const unit = units.find(u => u.id === selectedUnit);
          if (unit) {
             const filtered = pegawaiList.filter(p => 
                p.eselon3 === unit.nama_unit || 
                p.eselon4 === unit.nama_unit
             );
             if (filtered.length > 0) setFilteredPegawai(filtered);
             else setFilteredPegawai(pegawaiList);
          }
      }
  }, [selectedUnit, units, pegawaiList]);

  const onSubmit = async (data) => {
    if (!selectedItem) return toast.error("Pilih barang terlebih dahulu");
    
    setLoading(true);
    const t = toast.loading("Menyimpan transaksi...");

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
          endpoint = `/api/persediaan-transaksi/${type}`; 
          payload.persediaan_id = selectedItem._id;
          if (type === 'in') {
              payload.nilai_satuan = parseFloat(data.nilai_satuan);
              payload.expired_date = data.expired_date || null;
          }
          if (type === 'out') {
              const unitObj = units.find(u => u.id === data.unit_penerima_id);
              payload.unit_penerima = unitObj ? unitObj.nama_unit : '';
          }
      } else {
          // Aset Tetap
          endpoint = `/api/transaksi/`;
          payload.jenis = type === 'in' ? 'MASUK' : 'KELUAR';
          payload.barang_id = selectedItem._id;
          payload.nilai_satuan = parseFloat(data.nilai_satuan);
      }

      const res = await api.post(endpoint, payload);
      const newTxId = res.data.id || (res.data._id ? res.data._id : null);

      // Upload Evidence
      if (buktiFile && newTxId) {
            toast.loading("Mengupload bukti...", { id: t });
            const formData = new FormData();
            formData.append('file', buktiFile);
            
            let uploadEndpoint = assetType === 'persediaan' 
                ? `/api/persediaan-transaksi/${newTxId}/upload-bukti` // Not supporting bulk upload here yet, assumes single ID endpoint added?
                // Wait, I added upload-bukti to /persediaan-transaksi/upload-bukti for BULK.
                // But for single? 
                // Ah, I need to check if I added single ID upload support for persediaan. 
                // I added `upload_bukti_bulk` in `persediaan_transaksi.py` which takes `ids` string.
                // So I can use that endpoint even for single ID!
                : `/api/transaksi/${newTxId}/upload-bukti`;
            
            if (assetType === 'persediaan') {
                 // Use bulk endpoint for single id
                 uploadEndpoint = `/api/persediaan-transaksi/upload-bukti`;
                 formData.append('ids', newTxId);
            } else {
                 formData.append('keterangan', "Bukti Transaksi");
            }
            
            await api.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
      }

      toast.success("Transaksi berhasil disimpan", { id: t });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Transaksi Gagal", { id: t });
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
                  disabled={type === 'out' && assetType === 'persediaan'} 
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

          {/* Unit & Pegawai Dropdowns (For OUT or Asset Assign) */}
          {(type === 'out' || assetType === 'aset') && (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Unit / Pihak Penerima</Label>
                    <Select onValueChange={(val) => setValue('unit_penerima_id', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Unit" />
                        </SelectTrigger>
                        <SelectContent>
                            {units.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.nama_unit}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Pegawai Penerima</Label>
                    <Select onValueChange={(val) => setValue('pegawai_id', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Pegawai" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {filteredPegawai.map(p => (
                                <SelectItem key={p._id} value={p._id}>{p.nama_lengkap}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
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

          {/* Evidence Upload */}
          <div className="space-y-2">
                <Label>Bukti Foto (Opsional)</Label>
                <div className="flex gap-2 items-center">
                    <Input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setBuktiFile(e.target.files[0])}
                    />
                    {buktiFile && <Upload size={16} className="text-green-600"/>}
                </div>
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
