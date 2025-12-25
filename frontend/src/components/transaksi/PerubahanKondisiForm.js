import React, { useState } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Save, Package, Loader2, ArrowRight, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import AsyncSelect from 'react-select/async';
import { Badge } from '../ui/badge';

const KONDISI_OPTIONS = [
  { value: 'Baik', label: 'Baik (B)', color: 'bg-green-100 text-green-700' },
  { value: 'Rusak Ringan', label: 'Rusak Ringan (RR)', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Rusak Berat', label: 'Rusak Berat (RB)', color: 'bg-red-100 text-red-700' }
];

export default function PerubahanKondisiForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    no_sppa_2: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    kondisi_awal: '',
    kondisi_akhir: '',
    penyebab: '',
    tanggal_kejadian: '',
    lokasi_kejadian: '',
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
      setFormData(prev => ({
        ...prev,
        kondisi_awal: option.data.kondisi || 'Baik'
      }));
    } else {
      setSelectedAsset(null);
      setFormData(prev => ({
        ...prev,
        kondisi_awal: ''
      }));
    }
  };

  const getKondisiBadge = (kondisi) => {
    const opt = KONDISI_OPTIONS.find(o => o.value === kondisi);
    return opt ? opt.color : 'bg-slate-100 text-slate-700';
  };

  const getKondisiIcon = (kondisi) => {
    switch (kondisi) {
      case 'Baik': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Rusak Ringan': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'Rusak Berat': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedAsset) {
      toast.error('Pilih aset terlebih dahulu');
      return;
    }
    if (!formData.no_sppa.trim() && !formData.no_sppa_2.trim()) {
      toast.error('No SPPA wajib diisi');
      return;
    }
    if (!formData.kondisi_akhir) {
      toast.error('Pilih kondisi akhir');
      return;
    }
    if (formData.kondisi_awal === formData.kondisi_akhir) {
      toast.error('Kondisi akhir harus berbeda dari kondisi awal');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        jenis: 'PERUBAHAN_KONDISI',
        barang_id: selectedAsset.id || selectedAsset._id,
        kode_barang: selectedAsset.kode_barang,
        nup: selectedAsset.nup,
        nama_barang: selectedAsset.nama_barang,
        no_sppa: `${formData.no_sppa}${formData.no_sppa_2 ? '/' + formData.no_sppa_2 : ''}`.trim(),
        tanggal_transaksi: formData.tanggal_transaksi,
        kondisi_awal: formData.kondisi_awal,
        kondisi_akhir: formData.kondisi_akhir,
        penyebab: formData.penyebab,
        tanggal_kejadian: formData.tanggal_kejadian,
        lokasi_kejadian: formData.lokasi_kejadian,
        dokumen_pendukung: formData.dokumen_pendukung,
        keterangan: formData.keterangan
      };

      await api.post('/api/transaksi/perubahan', payload);
      toast.success('Perubahan kondisi berhasil dicatat');
      
      // Reset form
      setSelectedAsset(null);
      setFormData({
        no_sppa: '',
        no_sppa_2: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        kondisi_awal: '',
        kondisi_akhir: '',
        penyebab: '',
        tanggal_kejadian: '',
        lokasi_kejadian: '',
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
          <Package className="h-5 w-5 text-amber-500" />
          RUH Transaksi BMN - Perubahan Kondisi
        </CardTitle>
        <CardDescription>
          Pencatatan perubahan kondisi barang milik negara (Baik ↔ Rusak Ringan ↔ Rusak Berat)
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
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">Aset Terpilih:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-amber-600">Kode Barang:</span>
                <p className="font-mono font-medium">{selectedAsset.kode_barang}</p>
              </div>
              <div>
                <span className="text-amber-600">NUP:</span>
                <p className="font-medium">{selectedAsset.nup || '-'}</p>
              </div>
              <div>
                <span className="text-amber-600">Nama:</span>
                <p className="font-medium">{selectedAsset.nama_barang}</p>
              </div>
              <div>
                <span className="text-amber-600">Kondisi Saat Ini:</span>
                <div className="flex items-center gap-2 mt-1">
                  {getKondisiIcon(selectedAsset.kondisi)}
                  <Badge className={getKondisiBadge(selectedAsset.kondisi)}>
                    {selectedAsset.kondisi || 'Baik'}
                  </Badge>
                </div>
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

        {/* Condition Change Section */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-semibold mb-4">Detail Perubahan Kondisi</h4>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Kondisi Awal */}
            <div className="text-center p-4 bg-white rounded-lg border min-w-[150px]">
              <p className="text-xs text-slate-500 mb-2">Kondisi Awal</p>
              <div className="flex flex-col items-center gap-2">
                {getKondisiIcon(formData.kondisi_awal)}
                <Badge className={getKondisiBadge(formData.kondisi_awal)}>
                  {formData.kondisi_awal || '-'}
                </Badge>
              </div>
            </div>
            
            {/* Arrow */}
            <ArrowRight className="h-8 w-8 text-slate-400" />
            
            {/* Kondisi Akhir */}
            <div className="text-center p-4 bg-white rounded-lg border min-w-[150px]">
              <p className="text-xs text-slate-500 mb-2">Kondisi Akhir *</p>
              <Select 
                value={formData.kondisi_akhir} 
                onValueChange={(v) => setFormData({...formData, kondisi_akhir: v})}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {KONDISI_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {getKondisiIcon(opt.value)}
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.kondisi_awal && formData.kondisi_akhir && formData.kondisi_awal === formData.kondisi_akhir && (
            <div className="p-2 bg-yellow-100 rounded flex items-center gap-2 text-yellow-700 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Kondisi akhir harus berbeda dari kondisi awal
            </div>
          )}
        </div>

        {/* Cause and Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Penyebab Perubahan *</Label>
            <Select 
              value={formData.penyebab} 
              onValueChange={(v) => setFormData({...formData, penyebab: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih penyebab..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aus/Usang">Aus/Usang (Normal)</SelectItem>
                <SelectItem value="Kecelakaan">Kecelakaan/Insiden</SelectItem>
                <SelectItem value="Bencana Alam">Bencana Alam</SelectItem>
                <SelectItem value="Kelalaian">Kelalaian Pengguna</SelectItem>
                <SelectItem value="Perbaikan">Setelah Perbaikan/Pemeliharaan</SelectItem>
                <SelectItem value="Hasil Pemeriksaan">Hasil Pemeriksaan</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Tanggal Kejadian</Label>
            <Input
              type="date"
              value={formData.tanggal_kejadian}
              onChange={(e) => setFormData({...formData, tanggal_kejadian: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Lokasi Kejadian</Label>
            <Input
              value={formData.lokasi_kejadian}
              onChange={(e) => setFormData({...formData, lokasi_kejadian: e.target.value})}
              placeholder="Lokasi saat terjadi perubahan kondisi"
            />
          </div>
          
          <div className="space-y-2">
            <Label>No Dokumen Pendukung</Label>
            <Input
              value={formData.dokumen_pendukung}
              onChange={(e) => setFormData({...formData, dokumen_pendukung: e.target.value})}
              placeholder="No BA/Laporan Kerusakan"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Keterangan</Label>
          <Textarea
            value={formData.keterangan}
            onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
            placeholder="Deskripsi detail kerusakan atau perbaikan..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (formData.kondisi_awal === formData.kondisi_akhir && formData.kondisi_akhir)}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Perubahan Kondisi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
