import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Save, Search, Package, Loader2, Plus, Minus, AlertTriangle } from 'lucide-react';
import AsyncSelect from 'react-select/async';

export default function PerubahanKuantitasForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    no_sppa_2: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    jenis_perubahan: 'BERTAMBAH', // BERTAMBAH or BERKURANG
    kuantitas_awal: 0,
    kuantitas_perubahan: 1,
    kuantitas_akhir: 0,
    alasan: '',
    dokumen_pendukung: '',
    keterangan: ''
  });

  // Search assets
  const searchAssets = async (inputValue) => {
    try {
      const res = await api.get('/api/barang', { 
        params: { search: inputValue, limit: 20 } 
      });
      return res.data.data.map(item => ({
        value: item.id || item._id,
        label: `${item.kode_barang || ''} - ${item.nama_barang}`,
        data: item
      }));
    } catch (e) {
      return [];
    }
  };

  const handleAssetSelect = (option) => {
    if (option) {
      setSelectedAsset(option.data);
      const kuantitasAwal = option.data.kuantitas || option.data.jumlah || 1;
      setFormData(prev => ({
        ...prev,
        kuantitas_awal: kuantitasAwal,
        kuantitas_akhir: kuantitasAwal + prev.kuantitas_perubahan
      }));
    } else {
      setSelectedAsset(null);
      setFormData(prev => ({
        ...prev,
        kuantitas_awal: 0,
        kuantitas_akhir: 0
      }));
    }
  };

  // Calculate final quantity when values change
  useEffect(() => {
    const awal = parseInt(formData.kuantitas_awal) || 0;
    const perubahan = parseInt(formData.kuantitas_perubahan) || 0;
    
    let akhir;
    if (formData.jenis_perubahan === 'BERTAMBAH') {
      akhir = awal + perubahan;
    } else {
      akhir = awal - perubahan;
    }
    
    setFormData(prev => ({ ...prev, kuantitas_akhir: akhir }));
  }, [formData.kuantitas_awal, formData.kuantitas_perubahan, formData.jenis_perubahan]);

  const handleSubmit = async () => {
    if (!selectedAsset) {
      toast.error('Pilih aset terlebih dahulu');
      return;
    }
    if (!formData.no_sppa.trim() && !formData.no_sppa_2.trim()) {
      toast.error('No SPPA wajib diisi');
      return;
    }
    if (formData.kuantitas_perubahan <= 0) {
      toast.error('Kuantitas perubahan harus lebih dari 0');
      return;
    }
    if (formData.kuantitas_akhir < 0) {
      toast.error('Kuantitas akhir tidak boleh negatif');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        jenis: 'PERUBAHAN_KUANTITAS',
        sub_jenis: formData.jenis_perubahan,
        barang_id: selectedAsset.id || selectedAsset._id,
        kode_barang: selectedAsset.kode_barang,
        nup: selectedAsset.nup,
        nama_barang: selectedAsset.nama_barang,
        no_sppa: `${formData.no_sppa}${formData.no_sppa_2 ? '/' + formData.no_sppa_2 : ''}`.trim(),
        tanggal_transaksi: formData.tanggal_transaksi,
        kuantitas_awal: formData.kuantitas_awal,
        kuantitas_perubahan: formData.kuantitas_perubahan,
        kuantitas_akhir: formData.kuantitas_akhir,
        alasan: formData.alasan,
        dokumen_pendukung: formData.dokumen_pendukung,
        keterangan: formData.keterangan
      };

      await api.post('/api/transaksi/perubahan', payload);
      toast.success('Perubahan kuantitas berhasil dicatat');
      
      // Reset form
      setSelectedAsset(null);
      setFormData({
        no_sppa: '',
        no_sppa_2: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        jenis_perubahan: 'BERTAMBAH',
        kuantitas_awal: 0,
        kuantitas_perubahan: 1,
        kuantitas_akhir: 0,
        alasan: '',
        dokumen_pendukung: '',
        keterangan: ''
      });
      
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyimpan perubahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          RUH Transaksi BMN - Perubahan Kuantitas
        </CardTitle>
        <CardDescription>
          Pencatatan perubahan jumlah/kuantitas barang milik negara (bertambah atau berkurang)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Asset Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cari & Pilih Aset *</Label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={searchAssets}
            onChange={handleAssetSelect}
            placeholder="Ketik kode/nama aset untuk mencari..."
            noOptionsMessage={() => "Tidak ditemukan"}
            loadingMessage={() => "Mencari..."}
            isClearable
            className="text-sm"
          />
        </div>

        {/* Selected Asset Info */}
        {selectedAsset && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Aset Terpilih:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-blue-600">Kode Barang:</span>
                <p className="font-mono font-medium">{selectedAsset.kode_barang}</p>
              </div>
              <div>
                <span className="text-blue-600">NUP:</span>
                <p className="font-medium">{selectedAsset.nup || '-'}</p>
              </div>
              <div>
                <span className="text-blue-600">Nama:</span>
                <p className="font-medium">{selectedAsset.nama_barang}</p>
              </div>
              <div>
                <span className="text-blue-600">Kuantitas Saat Ini:</span>
                <p className="font-bold text-lg">{selectedAsset.kuantitas || selectedAsset.jumlah || 1}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>No SPPA *</Label>
            <div className="flex gap-2">
              <Input
                value={formData.no_sppa}
                onChange={(e) => setFormData({...formData, no_sppa: e.target.value})}
                placeholder="Prefix..."
                className="flex-1"
              />
              <Input
                value={formData.no_sppa_2}
                onChange={(e) => setFormData({...formData, no_sppa_2: e.target.value})}
                placeholder="Nomor SPPA..."
                className="flex-[2]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Transaksi *</Label>
            <Input
              type="date"
              value={formData.tanggal_transaksi}
              onChange={(e) => setFormData({...formData, tanggal_transaksi: e.target.value})}
            />
          </div>
        </div>

        {/* Quantity Change Section */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-semibold mb-4">Detail Perubahan Kuantitas</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Jenis Perubahan *</Label>
              <Select 
                value={formData.jenis_perubahan} 
                onValueChange={(v) => setFormData({...formData, jenis_perubahan: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BERTAMBAH">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-500" />
                      Bertambah
                    </div>
                  </SelectItem>
                  <SelectItem value="BERKURANG">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-500" />
                      Berkurang
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Kuantitas Awal</Label>
              <Input
                type="number"
                value={formData.kuantitas_awal}
                readOnly
                className="bg-slate-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Jumlah Perubahan *</Label>
              <Input
                type="number"
                min="1"
                value={formData.kuantitas_perubahan}
                onChange={(e) => setFormData({...formData, kuantitas_perubahan: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Kuantitas Akhir</Label>
              <Input
                type="number"
                value={formData.kuantitas_akhir}
                readOnly
                className={`font-bold ${formData.kuantitas_akhir < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
              />
            </div>
          </div>

          {formData.kuantitas_akhir < 0 && (
            <div className="mt-3 p-2 bg-red-100 rounded flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Kuantitas akhir tidak boleh negatif!
            </div>
          )}
        </div>

        {/* Reason and Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alasan Perubahan *</Label>
            <Select 
              value={formData.alasan} 
              onValueChange={(v) => setFormData({...formData, alasan: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Temuan Inventarisasi">Temuan Inventarisasi</SelectItem>
                <SelectItem value="Koreksi Data">Koreksi Data</SelectItem>
                <SelectItem value="Hasil Pemeriksaan">Hasil Pemeriksaan</SelectItem>
                <SelectItem value="Hasil Stock Opname">Hasil Stock Opname</SelectItem>
                <SelectItem value="Pecah/Gabung Unit">Pecah/Gabung Unit</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>No Dokumen Pendukung</Label>
            <Input
              value={formData.dokumen_pendukung}
              onChange={(e) => setFormData({...formData, dokumen_pendukung: e.target.value})}
              placeholder="No BA/SK/Surat pendukung"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Keterangan</Label>
          <Textarea
            value={formData.keterangan}
            onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
            placeholder="Keterangan tambahan..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSubmit} disabled={loading || formData.kuantitas_akhir < 0}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Perubahan Kuantitas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
