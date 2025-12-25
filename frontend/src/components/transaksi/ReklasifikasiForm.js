import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Save, Package, Loader2, ArrowDownToLine, ArrowUpFromLine, AlertCircle } from 'lucide-react';
import AsyncSelect from 'react-select/async';

export default function ReklasifikasiForm({ onSuccess, direction = 'MASUK' }) {
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [golonganOptions, setGolonganOptions] = useState([]);
  const [kodeBarangOptions, setKodeBarangOptions] = useState([]);
  const [loadingKodeBarang, setLoadingKodeBarang] = useState(false);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    golongan_awal: '',
    golongan_baru: '',
    kode_barang_baru: '',
    alasan_reklasifikasi: '',
    unit_asal: '',
    unit_tujuan: '',
    no_dokumen_pendukung: '',
    keterangan: ''
  });

  useEffect(() => {
    fetchGolonganOptions();
  }, []);

  // Fetch kode barang when golongan_baru changes
  useEffect(() => {
    if (formData.golongan_baru) {
      fetchKodeBarangByGolongan(formData.golongan_baru);
      // Reset kode_barang_baru when golongan changes
      setFormData(prev => ({ ...prev, kode_barang_baru: '' }));
    } else {
      setKodeBarangOptions([]);
    }
  }, [formData.golongan_baru]);

  const fetchGolonganOptions = async () => {
    try {
      const res = await api.get('/api/referensi/golongan');
      setGolonganOptions(res.data || []);
    } catch (e) {
      // Fallback options
      setGolonganOptions([
        { kode: '1', nama: 'Tanah' },
        { kode: '2', nama: 'Peralatan dan Mesin' },
        { kode: '3', nama: 'Gedung dan Bangunan' },
        { kode: '4', nama: 'Jalan, Irigasi dan Jaringan' },
        { kode: '5', nama: 'Aset Tetap Lainnya' },
        { kode: '6', nama: 'Konstruksi Dalam Pengerjaan' },
        { kode: '7', nama: 'Aset Tak Berwujud' }
      ]);
    }
  };

  const fetchKodeBarangByGolongan = async (golongan) => {
    setLoadingKodeBarang(true);
    try {
      // Fetch all barang
      const res = await api.get('/api/barang', { 
        params: { 
          limit: 500 
        } 
      });
      
      // Get unique kode_barang from the results, filtered by golongan
      const uniqueKodes = [];
      const seenKodes = new Set();
      
      // Find golongan name from options
      const golonganInfo = golonganOptions.find(g => g.kode === golongan);
      const golonganNama = golonganInfo ? golonganInfo.nama : '';
      
      (res.data.data || []).forEach(item => {
        const kodeBarang = item.kode_barang || '';
        const itemGolongan = item.golongan_barang || '';
        
        // Filter by golongan - multiple match strategies:
        // 1. Match "X - Nama" pattern exactly
        // 2. Match golongan nama in the string (e.g., "Tanah" in "2 - Tanah")
        // 3. Match first character of kode_barang with golongan kode
        const matchByPattern = itemGolongan.startsWith(`${golongan} -`);
        const matchByNama = golonganNama && itemGolongan.toLowerCase().includes(golonganNama.toLowerCase());
        const matchByKode = kodeBarang.startsWith(golongan);
        
        const matchesGolongan = matchByPattern || matchByNama || matchByKode;
        
        if (matchesGolongan && kodeBarang && !seenKodes.has(kodeBarang)) {
          seenKodes.add(kodeBarang);
          uniqueKodes.push({
            kode: kodeBarang,
            nama: item.nama_barang
          });
        }
      });
      
      // Sort by kode
      uniqueKodes.sort((a, b) => a.kode.localeCompare(b.kode));
      
      setKodeBarangOptions(uniqueKodes);
    } catch (e) {
      console.error('Error fetching kode barang:', e);
      setKodeBarangOptions([]);
    } finally {
      setLoadingKodeBarang(false);
    }
  };

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
        golongan_awal: option.data.golongan_barang || option.data.kode_barang?.substring(0, 1) || ''
      }));
    } else {
      setSelectedAsset(null);
      setFormData(prev => ({
        ...prev,
        golongan_awal: ''
      }));
    }
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
    if (!formData.no_sppa.trim()) {
      toast.error('No SPPA wajib diisi');
      return;
    }
    if (!formData.golongan_baru) {
      toast.error('Pilih golongan baru');
      return;
    }
    if (formData.golongan_awal === formData.golongan_baru) {
      toast.error('Golongan baru harus berbeda dari golongan awal');
      return;
    }
    if (!formData.kode_barang_baru) {
      toast.error('Pilih kode barang baru');
      return;
    }
    if (!formData.alasan_reklasifikasi) {
      toast.error('Pilih alasan reklasifikasi');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        jenis: direction === 'MASUK' ? 'REKLASIFIKASI_MASUK' : 'REKLASIFIKASI_KELUAR',
        barang_id: selectedAsset.id || selectedAsset._id,
        kode_barang: selectedAsset.kode_barang,
        nup: selectedAsset.nup,
        nama_barang: selectedAsset.nama_barang,
        no_sppa: formData.no_sppa,
        tanggal_transaksi: formData.tanggal_transaksi,
        golongan_awal: formData.golongan_awal,
        golongan_baru: formData.golongan_baru,
        kode_barang_baru: formData.kode_barang_baru,
        nilai_perolehan: selectedAsset.nilai_perolehan,
        nilai_buku: selectedAsset.nilai_buku,
        alasan_reklasifikasi: formData.alasan_reklasifikasi,
        unit_asal: formData.unit_asal,
        unit_tujuan: formData.unit_tujuan,
        no_dokumen_pendukung: formData.no_dokumen_pendukung,
        keterangan: formData.keterangan
      };

      await api.post('/api/transaksi/perubahan', payload);
      toast.success(`Reklasifikasi ${direction.toLowerCase()} berhasil dicatat`);
      
      // Reset form
      setSelectedAsset(null);
      setFormData({
        no_sppa: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        golongan_awal: '',
        golongan_baru: '',
        kode_barang_baru: '',
        alasan_reklasifikasi: '',
        unit_asal: '',
        unit_tujuan: '',
        no_dokumen_pendukung: '',
        keterangan: ''
      });
      
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyimpan reklasifikasi');
    } finally {
      setLoading(false);
    }
  };

  const isMasuk = direction === 'MASUK';
  const colorClass = isMasuk ? 'text-blue-500' : 'text-red-500';
  const bgClass = isMasuk ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200';
  const headerTextClass = isMasuk ? 'text-blue-800' : 'text-red-800';
  const labelClass = isMasuk ? 'text-blue-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isMasuk ? (
            <ArrowDownToLine className={`h-5 w-5 ${colorClass}`} />
          ) : (
            <ArrowUpFromLine className={`h-5 w-5 ${colorClass}`} />
          )}
          RUH Transaksi BMN - {isMasuk ? 'Perolehan' : 'Penghapusan'} - Reklasifikasi {direction}
        </CardTitle>
        <CardDescription>
          {isMasuk 
            ? 'Pencatatan aset yang masuk dari perubahan golongan/klasifikasi BMN' 
            : 'Pencatatan aset yang keluar karena perubahan golongan/klasifikasi BMN'}
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
          <div className={`p-4 rounded-lg border ${bgClass}`}>
            <h4 className={`font-semibold mb-2 ${headerTextClass}`}>Aset Terpilih:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className={labelClass}>Kode Barang:</span>
                <p className="font-mono font-medium">{selectedAsset.kode_barang}</p>
              </div>
              <div>
                <span className={labelClass}>NUP:</span>
                <p className="font-medium">{selectedAsset.nup || '-'}</p>
              </div>
              <div>
                <span className={labelClass}>Nama:</span>
                <p className="font-medium">{selectedAsset.nama_barang}</p>
              </div>
              <div>
                <span className={labelClass}>Nilai Perolehan:</span>
                <p className="font-bold">{formatCurrency(selectedAsset.nilai_perolehan)}</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className={labelClass}>Golongan Saat Ini:</span>
                <p className="font-medium">{selectedAsset.golongan_barang || selectedAsset.kode_barang?.substring(0, 1) || '-'}</p>
              </div>
              <div>
                <span className={labelClass}>Nilai Buku:</span>
                <p className="font-medium">{formatCurrency(selectedAsset.nilai_buku)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>No SPPA *</Label>
            <Input
              value={formData.no_sppa}
              onChange={(e) => setFormData({...formData, no_sppa: e.target.value})}
              placeholder="Masukkan No SPPA"
            />
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

        {/* Reclassification Details */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-semibold mb-4">Detail Reklasifikasi</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Golongan Awal</Label>
              <Input
                value={formData.golongan_awal}
                readOnly
                className="bg-slate-100"
                placeholder="Terisi otomatis dari aset terpilih"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Golongan Baru *</Label>
              <Select 
                value={formData.golongan_baru} 
                onValueChange={(v) => setFormData({...formData, golongan_baru: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih golongan baru..." />
                </SelectTrigger>
                <SelectContent>
                  {golonganOptions.map(g => (
                    <SelectItem key={g.kode} value={g.kode}>
                      {g.kode} - {g.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Kode Barang Baru - Now Required and Filtered by Golongan */}
          <div className="mt-4 space-y-2">
            <Label className="flex items-center gap-1">
              Kode Barang Baru *
              {!formData.golongan_baru && (
                <span className="text-xs text-amber-600 font-normal ml-2">
                  (Pilih golongan baru terlebih dahulu)
                </span>
              )}
            </Label>
            
            {!formData.golongan_baru ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Pilih golongan baru terlebih dahulu untuk melihat daftar kode barang</span>
              </div>
            ) : loadingKodeBarang ? (
              <div className="p-3 bg-slate-100 border rounded-lg text-slate-600 text-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Memuat daftar kode barang...</span>
              </div>
            ) : kodeBarangOptions.length === 0 ? (
              <div className="space-y-2">
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-sm">
                  Tidak ada kode barang ditemukan untuk golongan ini. Masukkan kode barang secara manual:
                </div>
                <Input
                  value={formData.kode_barang_baru}
                  onChange={(e) => setFormData({...formData, kode_barang_baru: e.target.value})}
                  placeholder="Masukkan kode barang baru"
                />
              </div>
            ) : (
              <Select 
                value={formData.kode_barang_baru} 
                onValueChange={(v) => setFormData({...formData, kode_barang_baru: v})}
              >
                <SelectTrigger className={!formData.kode_barang_baru ? 'border-amber-300' : ''}>
                  <SelectValue placeholder="Pilih kode barang baru..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {kodeBarangOptions.map(kb => (
                    <SelectItem key={kb.kode} value={kb.kode}>
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{kb.kode}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[300px]">{kb.nama}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {formData.golongan_baru && kodeBarangOptions.length > 0 && (
              <p className="text-xs text-slate-500">
                Menampilkan {kodeBarangOptions.length} kode barang untuk golongan {formData.golongan_baru}
              </p>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alasan Reklasifikasi *</Label>
            <Select 
              value={formData.alasan_reklasifikasi} 
              onValueChange={(v) => setFormData({...formData, alasan_reklasifikasi: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Perubahan Fungsi">Perubahan Fungsi/Penggunaan</SelectItem>
                <SelectItem value="Koreksi Klasifikasi">Koreksi Kesalahan Klasifikasi</SelectItem>
                <SelectItem value="Hasil Inventarisasi">Hasil Inventarisasi</SelectItem>
                <SelectItem value="Penyesuaian SAP">Penyesuaian Standar Akuntansi</SelectItem>
                <SelectItem value="Hasil Audit">Hasil Audit/Pemeriksaan</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>No Dokumen Pendukung</Label>
            <Input
              value={formData.no_dokumen_pendukung}
              onChange={(e) => setFormData({...formData, no_dokumen_pendukung: e.target.value})}
              placeholder="No SK/BA Reklasifikasi"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Unit Asal</Label>
            <Input
              value={formData.unit_asal}
              onChange={(e) => setFormData({...formData, unit_asal: e.target.value})}
              placeholder="Unit pengelola awal"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Unit Tujuan</Label>
            <Input
              value={formData.unit_tujuan}
              onChange={(e) => setFormData({...formData, unit_tujuan: e.target.value})}
              placeholder="Unit pengelola baru"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Keterangan</Label>
          <Textarea
            value={formData.keterangan}
            onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
            placeholder="Penjelasan detail reklasifikasi..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.kode_barang_baru || (formData.golongan_awal === formData.golongan_baru && formData.golongan_baru)}
            className={!isMasuk ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Reklasifikasi {direction}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
