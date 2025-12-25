import React, { useState } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Save, Package, Loader2, TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react';
import AsyncSelect from 'react-select/async';

export default function KoreksiNilaiForm({ onSuccess, type = 'BMN' }) {
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    no_sppa_2: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    jenis_koreksi: 'BERTAMBAH', // BERTAMBAH or BERKURANG
    nilai_perolehan_awal: 0,
    nilai_buku_awal: 0,
    nilai_koreksi: 0,
    nilai_perolehan_akhir: 0,
    nilai_buku_akhir: 0,
    alasan_koreksi: '',
    dasar_koreksi: '',
    no_dokumen_pendukung: '',
    keterangan: ''
  });

  // Search assets
  const searchAssets = async (inputValue) => {
    try {
      const endpoint = type === 'KDP' ? '/api/barang' : '/api/barang';
      const res = await api.get(endpoint, { 
        params: { 
          search: inputValue, 
          limit: 20,
          ...(type === 'KDP' ? { golongan: 'KDP' } : {})
        } 
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
      const nilaiPerolehan = option.data.nilai_perolehan || 0;
      const nilaiBuku = option.data.nilai_buku || option.data.nilai_perolehan || 0;
      setFormData(prev => ({
        ...prev,
        nilai_perolehan_awal: nilaiPerolehan,
        nilai_buku_awal: nilaiBuku,
        nilai_perolehan_akhir: nilaiPerolehan,
        nilai_buku_akhir: nilaiBuku
      }));
    } else {
      setSelectedAsset(null);
      setFormData(prev => ({
        ...prev,
        nilai_perolehan_awal: 0,
        nilai_buku_awal: 0,
        nilai_perolehan_akhir: 0,
        nilai_buku_akhir: 0
      }));
    }
  };

  const handleKoreksiChange = (value) => {
    const koreksi = parseFloat(value) || 0;
    const awalPerolehan = formData.nilai_perolehan_awal;
    const awalBuku = formData.nilai_buku_awal;
    
    let akhirPerolehan, akhirBuku;
    if (formData.jenis_koreksi === 'BERTAMBAH') {
      akhirPerolehan = awalPerolehan + koreksi;
      akhirBuku = awalBuku + koreksi;
    } else {
      akhirPerolehan = awalPerolehan - koreksi;
      akhirBuku = awalBuku - koreksi;
    }
    
    setFormData(prev => ({
      ...prev,
      nilai_koreksi: koreksi,
      nilai_perolehan_akhir: akhirPerolehan,
      nilai_buku_akhir: akhirBuku
    }));
  };

  const handleJenisChange = (jenis) => {
    const koreksi = formData.nilai_koreksi;
    const awalPerolehan = formData.nilai_perolehan_awal;
    const awalBuku = formData.nilai_buku_awal;
    
    let akhirPerolehan, akhirBuku;
    if (jenis === 'BERTAMBAH') {
      akhirPerolehan = awalPerolehan + koreksi;
      akhirBuku = awalBuku + koreksi;
    } else {
      akhirPerolehan = awalPerolehan - koreksi;
      akhirBuku = awalBuku - koreksi;
    }
    
    setFormData(prev => ({
      ...prev,
      jenis_koreksi: jenis,
      nilai_perolehan_akhir: akhirPerolehan,
      nilai_buku_akhir: akhirBuku
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
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
    if (formData.nilai_koreksi <= 0) {
      toast.error('Nilai koreksi harus lebih dari 0');
      return;
    }
    if (formData.nilai_buku_akhir < 0) {
      toast.error('Nilai buku akhir tidak boleh negatif');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        jenis: type === 'KDP' ? 'KOREKSI_NILAI_KDP' : 'KOREKSI_NILAI_BMN',
        sub_jenis: formData.jenis_koreksi,
        barang_id: selectedAsset.id || selectedAsset._id,
        kode_barang: selectedAsset.kode_barang,
        nup: selectedAsset.nup,
        nama_barang: selectedAsset.nama_barang,
        no_sppa: `${formData.no_sppa}${formData.no_sppa_2 ? '/' + formData.no_sppa_2 : ''}`.trim(),
        tanggal_transaksi: formData.tanggal_transaksi,
        nilai_perolehan_awal: formData.nilai_perolehan_awal,
        nilai_buku_awal: formData.nilai_buku_awal,
        nilai_koreksi: formData.nilai_koreksi,
        nilai_perolehan_akhir: formData.nilai_perolehan_akhir,
        nilai_buku_akhir: formData.nilai_buku_akhir,
        alasan_koreksi: formData.alasan_koreksi,
        dasar_koreksi: formData.dasar_koreksi,
        no_dokumen_pendukung: formData.no_dokumen_pendukung,
        keterangan: formData.keterangan
      };

      await api.post('/api/transaksi/perubahan', payload);
      toast.success(`Koreksi nilai ${type} berhasil dicatat`);
      
      // Reset form
      setSelectedAsset(null);
      setFormData({
        no_sppa: '',
        no_sppa_2: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        jenis_koreksi: 'BERTAMBAH',
        nilai_perolehan_awal: 0,
        nilai_buku_awal: 0,
        nilai_koreksi: 0,
        nilai_perolehan_akhir: 0,
        nilai_buku_akhir: 0,
        alasan_koreksi: '',
        dasar_koreksi: '',
        no_dokumen_pendukung: '',
        keterangan: ''
      });
      
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyimpan koreksi');
    } finally {
      setLoading(false);
    }
  };

  const isBertambah = formData.jenis_koreksi === 'BERTAMBAH';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className={`h-5 w-5 ${type === 'KDP' ? 'text-orange-500' : 'text-green-500'}`} />
          RUH Transaksi {type} - Koreksi Perubahan Nilai
        </CardTitle>
        <CardDescription>
          Pencatatan koreksi nilai {type === 'KDP' ? 'Konstruksi Dalam Pengerjaan' : 'Barang Milik Negara'} (bertambah atau berkurang)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Asset Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cari & Pilih Aset {type} *</Label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={searchAssets}
            onChange={handleAssetSelect}
            placeholder={`Ketik kode/nama ${type} untuk mencari...`}
            noOptionsMessage={() => "Tidak ditemukan"}
            loadingMessage={() => "Mencari..."}
            isClearable
            className="text-sm"
          />
        </div>

        {/* Selected Asset Info */}
        {selectedAsset && (
          <div className={`p-4 rounded-lg border ${type === 'KDP' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
            <h4 className={`font-semibold mb-2 ${type === 'KDP' ? 'text-orange-800' : 'text-green-800'}`}>Aset Terpilih:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className={type === 'KDP' ? 'text-orange-600' : 'text-green-600'}>Kode Barang:</span>
                <p className="font-mono font-medium">{selectedAsset.kode_barang}</p>
              </div>
              <div>
                <span className={type === 'KDP' ? 'text-orange-600' : 'text-green-600'}>NUP:</span>
                <p className="font-medium">{selectedAsset.nup || '-'}</p>
              </div>
              <div>
                <span className={type === 'KDP' ? 'text-orange-600' : 'text-green-600'}>Nama:</span>
                <p className="font-medium">{selectedAsset.nama_barang}</p>
              </div>
              <div>
                <span className={type === 'KDP' ? 'text-orange-600' : 'text-green-600'}>Nilai Buku Saat Ini:</span>
                <p className="font-bold">{formatCurrency(selectedAsset.nilai_buku || selectedAsset.nilai_perolehan)}</p>
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

        {/* Value Correction Section */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-semibold mb-4">Detail Koreksi Nilai</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Jenis Koreksi *</Label>
              <Select 
                value={formData.jenis_koreksi} 
                onValueChange={handleJenisChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BERTAMBAH">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Koreksi Bertambah
                    </div>
                  </SelectItem>
                  <SelectItem value="BERKURANG">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Koreksi Berkurang
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nilai Koreksi (Rp) *</Label>
              <Input
                type="number"
                min="0"
                value={formData.nilai_koreksi}
                onChange={(e) => handleKoreksiChange(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Value Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Nilai Buku Awal</p>
              <p className="font-bold text-lg">{formatCurrency(formData.nilai_buku_awal)}</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <ArrowRight className="h-6 w-6 text-slate-400" />
              <p className={`text-sm font-semibold ${isBertambah ? 'text-green-600' : 'text-red-600'}`}>
                {isBertambah ? '+' : '-'} {formatCurrency(formData.nilai_koreksi)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Nilai Buku Akhir</p>
              <p className={`font-bold text-lg ${formData.nilai_buku_akhir < 0 ? 'text-red-600' : isBertambah ? 'text-green-600' : ''}`}>
                {formatCurrency(formData.nilai_buku_akhir)}
              </p>
            </div>
          </div>

          {formData.nilai_buku_akhir < 0 && (
            <div className="mt-3 p-2 bg-red-100 rounded flex items-center gap-2 text-red-700 text-sm">
              <TrendingDown className="h-4 w-4" />
              Nilai buku akhir tidak boleh negatif!
            </div>
          )}
        </div>

        {/* Reason and Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alasan Koreksi *</Label>
            <Select 
              value={formData.alasan_koreksi} 
              onValueChange={(v) => setFormData({...formData, alasan_koreksi: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hasil Penilaian Ulang">Hasil Penilaian Ulang</SelectItem>
                <SelectItem value="Koreksi Kesalahan Pencatatan">Koreksi Kesalahan Pencatatan</SelectItem>
                <SelectItem value="Penyesuaian Nilai Wajar">Penyesuaian Nilai Wajar</SelectItem>
                <SelectItem value="Hasil Audit">Hasil Audit/Pemeriksaan</SelectItem>
                <SelectItem value="Kapitalisasi Biaya">Kapitalisasi Biaya Tambahan</SelectItem>
                <SelectItem value="Revaluasi Aset">Revaluasi Aset</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Dasar Koreksi</Label>
            <Select 
              value={formData.dasar_koreksi} 
              onValueChange={(v) => setFormData({...formData, dasar_koreksi: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih dasar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laporan Penilaian KJPP">Laporan Penilaian KJPP</SelectItem>
                <SelectItem value="Berita Acara Rekonsiliasi">Berita Acara Rekonsiliasi</SelectItem>
                <SelectItem value="SK Penetapan Nilai">SK Penetapan Nilai</SelectItem>
                <SelectItem value="Hasil LHP BPK">Hasil LHP BPK</SelectItem>
                <SelectItem value="Hasil Audit Internal">Hasil Audit Internal</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>No Dokumen Pendukung</Label>
          <Input
            value={formData.no_dokumen_pendukung}
            onChange={(e) => setFormData({...formData, no_dokumen_pendukung: e.target.value})}
            placeholder="No Laporan Penilaian/BA/SK"
          />
        </div>

        <div className="space-y-2">
          <Label>Keterangan</Label>
          <Textarea
            value={formData.keterangan}
            onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
            placeholder="Penjelasan detail koreksi nilai..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || formData.nilai_buku_akhir < 0}
            className={type === 'KDP' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Koreksi Nilai {type}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
