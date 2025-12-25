import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';
import { Save, Loader2, ArrowDownToLine, ArrowUpFromLine, Search, CheckSquare, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import HierarchicalKodeBarangPicker from './HierarchicalKodeBarangPicker';

export default function ReklasifikasiForm({ onSuccess, direction = 'MASUK' }) {
  const [loading, setLoading] = useState(false);
  const [golonganOptions, setGolonganOptions] = useState([]);
  const [kodeBarangOptions, setKodeBarangOptions] = useState([]);
  const [loadingKodeBarang, setLoadingKodeBarang] = useState(false);
  
  // Asset search & selection (like AssetOutgoingForm)
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
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

  // Fetch kode barang when golongan_baru changes - from Referensi Kodefikasi BMN
  useEffect(() => {
    if (formData.golongan_baru) {
      fetchKodeBarangFromReferensi(formData.golongan_baru);
      // Reset kode_barang_baru when golongan changes
      setFormData(prev => ({ ...prev, kode_barang_baru: '' }));
    } else {
      setKodeBarangOptions([]);
    }
  }, [formData.golongan_baru]);

  const fetchGolonganOptions = async () => {
    try {
      // Try to get golongan from referensi kodefikasi first
      const res = await api.get('/api/referensi/golongan');
      if (res.data && res.data.length > 0) {
        setGolonganOptions(res.data);
      } else {
        throw new Error('Empty golongan data');
      }
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

  // Fetch kode barang from Referensi Kodefikasi BMN
  const fetchKodeBarangFromReferensi = async (golongan) => {
    setLoadingKodeBarang(true);
    try {
      // Get kode barang from referensi kodefikasi filtered by golongan
      const res = await api.get(`/api/referensi/by-golongan/${golongan}`, {
        params: { limit: 1000 }
      });
      
      if (res.data && res.data.length > 0) {
        setKodeBarangOptions(res.data.map(item => ({
          kode: item.kode,
          nama: item.uraian
        })));
      } else {
        // Fallback: try to get from existing barang collection
        await fetchKodeBarangFromBarang(golongan);
      }
    } catch (e) {
      console.error('Error fetching from referensi:', e);
      // Fallback: try to get from existing barang collection
      await fetchKodeBarangFromBarang(golongan);
    } finally {
      setLoadingKodeBarang(false);
    }
  };

  // Fallback: fetch from barang collection
  const fetchKodeBarangFromBarang = async (golongan) => {
    try {
      const res = await api.get('/api/barang', { 
        params: { limit: 10000 } 
      });
      
      const uniqueKodes = [];
      const seenKodes = new Set();
      const golonganInfo = golonganOptions.find(g => g.kode === golongan);
      const golonganNama = golonganInfo ? golonganInfo.nama.toLowerCase() : '';
      
      (res.data.data || []).forEach(item => {
        const kodeBarang = item.kode_barang || '';
        const itemGolongan = item.golongan_barang || '';
        const itemGolonganLower = itemGolongan.toLowerCase();
        
        let matchesGolongan = false;
        if (golonganNama && itemGolonganLower.includes(golonganNama)) {
          matchesGolongan = true;
        }
        
        if (matchesGolongan && kodeBarang && !seenKodes.has(kodeBarang)) {
          seenKodes.add(kodeBarang);
          uniqueKodes.push({
            kode: kodeBarang,
            nama: item.nama_barang
          });
        }
      });
      
      uniqueKodes.sort((a, b) => a.kode.localeCompare(b.kode));
      setKodeBarangOptions(uniqueKodes);
    } catch (e) {
      console.error('Error fetching from barang:', e);
      setKodeBarangOptions([]);
    }
  };

  // Search assets - like AssetOutgoingForm
  const doSearch = async () => {
    setSearching(true);
    try {
      const res = await api.get('/api/barang', {
        params: { 
          search, 
          limit: 10000
        } 
      });
      setAssets(res.data.data || []);
    } catch (e) {
      toast.error("Gagal mencari aset");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map(a => a._id)));
    }
  };

  const selectedAssets = assets.filter(a => selectedIds.has(a._id));

  // Get golongan awal from selected assets
  const getGolonganAwal = () => {
    if (selectedAssets.length === 0) return '-';
    const golongans = [...new Set(selectedAssets.map(a => a.golongan_barang || a.kode_barang?.substring(0, 1) || '-'))];
    return golongans.join(', ');
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
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
    if (!formData.kode_barang_baru) {
      toast.error('Pilih kode barang baru');
      return;
    }
    if (!formData.alasan_reklasifikasi) {
      toast.error('Pilih alasan reklasifikasi');
      return;
    }

    setLoading(true);
    const t = toast.loading(`Memproses reklasifikasi ${selectedIds.size} aset...`);
    
    try {
      // Process each selected asset
      let successCount = 0;
      let errorCount = 0;
      
      for (const asset of selectedAssets) {
        try {
          const payload = {
            jenis: direction === 'MASUK' ? 'REKLASIFIKASI_MASUK' : 'REKLASIFIKASI_KELUAR',
            barang_id: asset.id || asset._id,
            kode_barang: asset.kode_barang,
            nup: asset.nup,
            nama_barang: asset.nama_barang,
            no_sppa: formData.no_sppa,
            tanggal_transaksi: formData.tanggal_transaksi,
            golongan_awal: asset.golongan_barang || asset.kode_barang?.substring(0, 1) || '',
            golongan_baru: formData.golongan_baru,
            kode_barang_baru: formData.kode_barang_baru,
            nilai_perolehan: asset.nilai_perolehan,
            nilai_buku: asset.nilai_buku,
            alasan_reklasifikasi: formData.alasan_reklasifikasi,
            unit_asal: formData.unit_asal,
            unit_tujuan: formData.unit_tujuan,
            no_dokumen_pendukung: formData.no_dokumen_pendukung,
            keterangan: formData.keterangan
          };

          await api.post('/api/transaksi/perubahan', payload);
          successCount++;
        } catch (e) {
          console.error(`Error processing asset ${asset.nama_barang}:`, e);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Berhasil memproses ${successCount} aset`, { id: t });
      }
      if (errorCount > 0) {
        toast.error(`Gagal memproses ${errorCount} aset`);
      }
      
      // Reset form
      setSelectedIds(new Set());
      setAssets([]);
      setSearch('');
      setFormData({
        no_sppa: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
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
      toast.error(e.response?.data?.detail || 'Gagal menyimpan reklasifikasi', { id: t });
    } finally {
      setLoading(false);
    }
  };

  const isMasuk = direction === 'MASUK';
  const colorClass = isMasuk ? 'text-blue-500' : 'text-red-500';
  const borderClass = isMasuk ? 'border-blue-200' : 'border-red-200';
  const bgClass = isMasuk ? 'bg-blue-50/30' : 'bg-red-50/30';
  const headerTextClass = isMasuk ? 'text-blue-800' : 'text-red-800';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Asset Selection */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {isMasuk ? (
                <ArrowDownToLine className={`h-4 w-4 ${colorClass}`} />
              ) : (
                <ArrowUpFromLine className={`h-4 w-4 ${colorClass}`} />
              )}
              1. Cari & Pilih Aset
            </CardTitle>
            <CardDescription className="text-xs">
              Cari dan pilih satu atau lebih aset untuk reklasifikasi
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Cari nama / kode barang / NUP..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
              />
              <Button onClick={doSearch} variant="secondary" disabled={searching}>
                {searching ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}
              </Button>
            </div>
            
            <div className="border rounded-md flex-1 overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <div 
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${assets.length > 0 && selectedIds.size === assets.length ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}
                        onClick={selectAll}
                      >
                        {assets.length > 0 && selectedIds.size === assets.length && <CheckSquare size={10}/>}
                      </div>
                    </TableHead>
                    <TableHead>Kode Barang - NUP & Nama</TableHead>
                    <TableHead className="text-right">Golongan & Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(a => (
                    <TableRow 
                      key={a._id} 
                      onClick={() => toggleSelect(a._id)} 
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.has(a._id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                          {selectedIds.has(a._id) && <CheckSquare size={10}/>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        <div className="font-bold text-slate-800">
                          {a.kode_barang} - <span className="text-blue-600">NUP {a.nup}</span>
                        </div>
                        <div className="font-medium text-slate-700">{a.nama_barang}</div>
                        <div className="text-slate-500 italic">{a.merk || '-'} / {a.tipe || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-right align-top">
                        <div className="font-medium text-slate-700">{a.golongan_barang || '-'}</div>
                        <div className="text-slate-500 font-mono mt-1">
                          {formatCurrency(a.nilai_perolehan)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {assets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                        {search ? 'Tidak ada hasil. Coba kata kunci lain.' : 'Ketik kata kunci dan klik Cari'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between text-xs text-slate-500">
              <span>{assets.length} aset ditemukan</span>
              <span className="font-medium text-blue-600">{selectedIds.size} aset dipilih</span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Transaction Details */}
        <Card className={`${borderClass} ${bgClass} h-full`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm ${headerTextClass}`}>
              2. Detail Reklasifikasi {direction}
            </CardTitle>
            <CardDescription className="text-xs">
              {isMasuk 
                ? 'Pencatatan aset yang masuk dari perubahan golongan BMN' 
                : 'Pencatatan aset yang keluar karena perubahan golongan BMN'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Assets Summary */}
            {selectedIds.size > 0 && (
              <div className={`p-3 rounded-lg border ${isMasuk ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-xs font-semibold mb-1">Aset Terpilih: {selectedIds.size}</div>
                <div className="text-xs text-slate-600">
                  Golongan Awal: <span className="font-medium">{getGolonganAwal()}</span>
                </div>
                <div className="text-xs text-slate-600">
                  Total Nilai: <span className="font-mono font-medium">
                    {formatCurrency(selectedAssets.reduce((sum, a) => sum + (a.nilai_perolehan || 0), 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">No SPPA *</Label>
                <Input
                  value={formData.no_sppa}
                  onChange={(e) => setFormData({...formData, no_sppa: e.target.value})}
                  placeholder="Masukkan No SPPA"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal Transaksi *</Label>
                <Input
                  type="date"
                  value={formData.tanggal_transaksi}
                  onChange={(e) => setFormData({...formData, tanggal_transaksi: e.target.value})}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Reclassification Details */}
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <h4 className="text-xs font-semibold">Detail Reklasifikasi</h4>
              
              <div className="space-y-1">
                <Label className="text-xs">Golongan Baru *</Label>
                <Select 
                  value={formData.golongan_baru} 
                  onValueChange={(v) => setFormData({...formData, golongan_baru: v})}
                >
                  <SelectTrigger className="bg-white">
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

              {/* Kode Barang Baru - Required */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  Kode Barang Baru *
                  {!formData.golongan_baru && (
                    <span className="text-amber-600 font-normal">(Pilih golongan dulu)</span>
                  )}
                </Label>
                
                {!formData.golongan_baru ? (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>Pilih golongan baru terlebih dahulu</span>
                  </div>
                ) : loadingKodeBarang ? (
                  <div className="p-2 bg-slate-100 border rounded text-slate-600 text-xs flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memuat daftar kode barang...</span>
                  </div>
                ) : kodeBarangOptions.length === 0 ? (
                  <div className="space-y-1">
                    <div className="p-2 bg-slate-100 border rounded text-slate-600 text-xs">
                      Tidak ada kode barang untuk golongan ini. Input manual:
                    </div>
                    <Input
                      value={formData.kode_barang_baru}
                      onChange={(e) => setFormData({...formData, kode_barang_baru: e.target.value})}
                      placeholder="Masukkan kode barang baru"
                      className="bg-white"
                    />
                  </div>
                ) : (
                  <>
                    <Select 
                      value={formData.kode_barang_baru} 
                      onValueChange={(v) => setFormData({...formData, kode_barang_baru: v})}
                    >
                      <SelectTrigger className={`bg-white ${!formData.kode_barang_baru ? 'border-amber-300' : ''}`}>
                        <SelectValue placeholder="Pilih kode barang baru..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {kodeBarangOptions.map(kb => (
                          <SelectItem key={kb.kode} value={kb.kode}>
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-medium">{kb.kode}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[280px]">{kb.nama}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-500">
                      {kodeBarangOptions.length} kode untuk golongan {formData.golongan_baru}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-1">
              <Label className="text-xs">Alasan Reklasifikasi *</Label>
              <Select 
                value={formData.alasan_reklasifikasi} 
                onValueChange={(v) => setFormData({...formData, alasan_reklasifikasi: v})}
              >
                <SelectTrigger className="bg-white">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">No Dokumen Pendukung</Label>
                <Input
                  value={formData.no_dokumen_pendukung}
                  onChange={(e) => setFormData({...formData, no_dokumen_pendukung: e.target.value})}
                  placeholder="No SK/BA"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Tujuan</Label>
                <Input
                  value={formData.unit_tujuan}
                  onChange={(e) => setFormData({...formData, unit_tujuan: e.target.value})}
                  placeholder="Unit pengelola baru"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Keterangan</Label>
              <Textarea
                value={formData.keterangan}
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                placeholder="Penjelasan detail reklasifikasi..."
                rows={2}
                className="bg-white"
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedIds.size === 0 || !formData.kode_barang_baru}
              className={`w-full ${!isMasuk ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Reklasifikasi {direction} ({selectedIds.size} aset)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
