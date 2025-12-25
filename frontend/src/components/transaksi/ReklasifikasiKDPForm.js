import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Save, Construction, Loader2, ArrowLeftRight } from 'lucide-react';
import AsyncSelect from 'react-select/async';

export default function ReklasifikasiKDPForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedKDPAsal, setSelectedKDPAsal] = useState(null);
  const [selectedKDPTujuan, setSelectedKDPTujuan] = useState(null);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    no_sppa_2: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    nilai_yang_dipindahkan: 0,
    alasan_reklasifikasi: '',
    no_dokumen_pendukung: '',
    keterangan: ''
  });

  // Search KDP assets
  const searchKDP = async (inputValue) => {
    try {
      const res = await api.get('/api/barang', { 
        params: { 
          search: inputValue, 
          limit: 20,
          golongan: '6' // KDP is usually golongan 6
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const handleSubmit = async () => {
    if (!selectedKDPAsal) {
      toast.error('Pilih KDP asal terlebih dahulu');
      return;
    }
    if (!selectedKDPTujuan) {
      toast.error('Pilih KDP tujuan terlebih dahulu');
      return;
    }
    if (selectedKDPAsal.id === selectedKDPTujuan.id) {
      toast.error('KDP asal dan tujuan tidak boleh sama');
      return;
    }
    if (!formData.no_sppa.trim() && !formData.no_sppa_2.trim()) {
      toast.error('No SPPA wajib diisi');
      return;
    }
    if (formData.nilai_yang_dipindahkan <= 0) {
      toast.error('Nilai yang dipindahkan harus lebih dari 0');
      return;
    }
    if (formData.nilai_yang_dipindahkan > (selectedKDPAsal.nilai_buku || selectedKDPAsal.nilai_perolehan || 0)) {
      toast.error('Nilai yang dipindahkan tidak boleh melebihi nilai KDP asal');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        jenis: 'REKLASIFIKASI_KDP',
        // KDP Asal
        barang_id: selectedKDPAsal.id || selectedKDPAsal._id,
        kode_barang: selectedKDPAsal.kode_barang,
        nup: selectedKDPAsal.nup,
        nama_barang: selectedKDPAsal.nama_barang,
        nilai_asal: selectedKDPAsal.nilai_buku || selectedKDPAsal.nilai_perolehan,
        // KDP Tujuan
        kdp_tujuan_id: selectedKDPTujuan.id || selectedKDPTujuan._id,
        kdp_tujuan_kode: selectedKDPTujuan.kode_barang,
        kdp_tujuan_nama: selectedKDPTujuan.nama_barang,
        kdp_tujuan_nilai_awal: selectedKDPTujuan.nilai_buku || selectedKDPTujuan.nilai_perolehan,
        // Transaction details
        no_sppa: `${formData.no_sppa}${formData.no_sppa_2 ? '/' + formData.no_sppa_2 : ''}`.trim(),
        tanggal_transaksi: formData.tanggal_transaksi,
        nilai_yang_dipindahkan: formData.nilai_yang_dipindahkan,
        alasan_reklasifikasi: formData.alasan_reklasifikasi,
        no_dokumen_pendukung: formData.no_dokumen_pendukung,
        keterangan: formData.keterangan
      };

      await api.post('/api/transaksi/perubahan', payload);
      toast.success('Reklasifikasi antar KDP berhasil dicatat');
      
      // Reset form
      setSelectedKDPAsal(null);
      setSelectedKDPTujuan(null);
      setFormData({
        no_sppa: '',
        no_sppa_2: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        nilai_yang_dipindahkan: 0,
        alasan_reklasifikasi: '',
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

  const nilaiAsalSetelah = (selectedKDPAsal?.nilai_buku || selectedKDPAsal?.nilai_perolehan || 0) - formData.nilai_yang_dipindahkan;
  const nilaiTujuanSetelah = (selectedKDPTujuan?.nilai_buku || selectedKDPTujuan?.nilai_perolehan || 0) + formData.nilai_yang_dipindahkan;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-5 w-5 text-orange-500" />
          RUH Transaksi KDP - Reklasifikasi Antar KDP
        </CardTitle>
        <CardDescription>
          Pencatatan pemindahan nilai dari satu Konstruksi Dalam Pengerjaan ke KDP lainnya
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KDP Asal Selection */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
            KDP Asal (Sumber Nilai)
          </h4>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cari & Pilih KDP Asal *</Label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={searchKDP}
              onChange={(opt) => setSelectedKDPAsal(opt?.data || null)}
              placeholder="Ketik kode/nama KDP asal..."
              noOptionsMessage={() => "Tidak ditemukan"}
              loadingMessage={() => "Mencari..."}
              isClearable
              className="text-sm"
            />
          </div>
          
          {selectedKDPAsal && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-red-600">Kode:</span>
                <p className="font-mono font-medium">{selectedKDPAsal.kode_barang}</p>
              </div>
              <div>
                <span className="text-red-600">Nama:</span>
                <p className="font-medium">{selectedKDPAsal.nama_barang}</p>
              </div>
              <div>
                <span className="text-red-600">Nilai Saat Ini:</span>
                <p className="font-bold">{formatCurrency(selectedKDPAsal.nilai_buku || selectedKDPAsal.nilai_perolehan)}</p>
              </div>
              <div>
                <span className="text-red-600">Nilai Setelah:</span>
                <p className={`font-bold ${nilaiAsalSetelah < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(nilaiAsalSetelah)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
            <ArrowLeftRight className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Pemindahan Nilai</span>
          </div>
        </div>

        {/* KDP Tujuan Selection */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
            KDP Tujuan (Penerima Nilai)
          </h4>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cari & Pilih KDP Tujuan *</Label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={searchKDP}
              onChange={(opt) => setSelectedKDPTujuan(opt?.data || null)}
              placeholder="Ketik kode/nama KDP tujuan..."
              noOptionsMessage={() => "Tidak ditemukan"}
              loadingMessage={() => "Mencari..."}
              isClearable
              className="text-sm"
            />
          </div>
          
          {selectedKDPTujuan && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-green-600">Kode:</span>
                <p className="font-mono font-medium">{selectedKDPTujuan.kode_barang}</p>
              </div>
              <div>
                <span className="text-green-600">Nama:</span>
                <p className="font-medium">{selectedKDPTujuan.nama_barang}</p>
              </div>
              <div>
                <span className="text-green-600">Nilai Saat Ini:</span>
                <p className="font-bold">{formatCurrency(selectedKDPTujuan.nilai_buku || selectedKDPTujuan.nilai_perolehan)}</p>
              </div>
              <div>
                <span className="text-green-600">Nilai Setelah:</span>
                <p className="font-bold text-green-600">{formatCurrency(nilaiTujuanSetelah)}</p>
              </div>
            </div>
          )}
        </div>

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

        {/* Value Transfer */}
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="font-semibold text-orange-800 mb-3">Nilai yang Dipindahkan *</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jumlah Nilai (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={formData.nilai_yang_dipindahkan}
                onChange={(e) => setFormData({...formData, nilai_yang_dipindahkan: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
              {selectedKDPAsal && formData.nilai_yang_dipindahkan > (selectedKDPAsal.nilai_buku || selectedKDPAsal.nilai_perolehan || 0) && (
                <p className="text-red-500 text-xs">Nilai melebihi saldo KDP asal!</p>
              )}
            </div>
            <div className="flex items-end">
              <div className="p-3 bg-white rounded border w-full">
                <p className="text-xs text-slate-500">Nilai Terbaca:</p>
                <p className="font-bold text-lg text-orange-600">{formatCurrency(formData.nilai_yang_dipindahkan)}</p>
              </div>
            </div>
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
                <SelectItem value="Penggabungan Proyek">Penggabungan Proyek</SelectItem>
                <SelectItem value="Pemecahan Proyek">Pemecahan Proyek</SelectItem>
                <SelectItem value="Koreksi Alokasi Biaya">Koreksi Alokasi Biaya</SelectItem>
                <SelectItem value="Perubahan Lingkup Pekerjaan">Perubahan Lingkup Pekerjaan</SelectItem>
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
              placeholder="No BA/Addendum Kontrak"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Keterangan</Label>
          <Textarea
            value={formData.keterangan}
            onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
            placeholder="Penjelasan detail reklasifikasi antar KDP..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || nilaiAsalSetelah < 0 || !selectedKDPAsal || !selectedKDPTujuan}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Reklasifikasi KDP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
