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
import { Save, Loader2, ArrowDownToLine, ArrowUpFromLine, Search, CheckSquare, AlertCircle, Package, Box } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import HierarchicalKodeBarangPicker from './HierarchicalKodeBarangPicker';

/**
 * Form untuk Reklasifikasi Persediaan ↔ Aset
 * direction: 'PERSEDIAAN_TO_ASET' | 'ASET_TO_PERSEDIAAN'
 */
export default function ReklasifikasiPersediaanAsetForm({ onSuccess, direction = 'PERSEDIAAN_TO_ASET' }) {
  const [loading, setLoading] = useState(false);
  const [golonganOptions, setGolonganOptions] = useState([]);
  
  // Asset/Persediaan search & selection
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    no_sppa: '',
    no_sppa_2: '',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    golongan_tujuan: '',
    kode_barang_tujuan: '',
    alasan_reklasifikasi: '',
    no_dokumen_pendukung: '',
    keterangan: ''
  });

  const isPersediaanToAset = direction === 'PERSEDIAAN_TO_ASET';

  useEffect(() => {
    fetchGolonganOptions();
  }, []);

  // Reset kode_barang_tujuan when golongan changes
  useEffect(() => {
    if (formData.golongan_tujuan) {
      setFormData(prev => ({ ...prev, kode_barang_tujuan: '' }));
    }
  }, [formData.golongan_tujuan]);

  const fetchGolonganOptions = async () => {
    try {
      const res = await api.get('/api/referensi/golongan');
      if (res.data && res.data.length > 0) {
        // Filter golongan based on direction
        if (isPersediaanToAset) {
          // For Persediaan to Aset, show only Aset golongan (2-7)
          setGolonganOptions(res.data.filter(g => g.kode !== '1'));
        } else {
          // For Aset to Persediaan, only target is golongan 1 (Persediaan)
          setGolonganOptions([{ kode: '1', nama: 'Persediaan' }]);
        }
      }
    } catch (e) {
      // Fallback options
      if (isPersediaanToAset) {
        setGolonganOptions([
          { kode: '2', nama: 'Peralatan dan Mesin' },
          { kode: '3', nama: 'Gedung dan Bangunan' },
          { kode: '4', nama: 'Jalan, Irigasi dan Jaringan' },
          { kode: '5', nama: 'Aset Tetap Lainnya' },
          { kode: '6', nama: 'Konstruksi Dalam Pengerjaan' },
          { kode: '7', nama: 'Aset Tak Berwujud' }
        ]);
      } else {
        setGolonganOptions([{ kode: '1', nama: 'Persediaan' }]);
      }
    }
  };

  // Search items based on direction
  const doSearch = async () => {
    setSearching(true);
    try {
      const endpoint = isPersediaanToAset ? '/api/persediaan' : '/api/barang';
      const res = await api.get(endpoint, {
        params: { 
          search, 
          limit: 10000
        } 
      });
      setItems(res.data.data || []);
    } catch (e) {
      toast.error("Gagal mencari item");
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
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(a => a._id)));
    }
  };

  const selectedItems = items.filter(a => selectedIds.has(a._id));

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error('Pilih item terlebih dahulu');
      return;
    }
    if (!formData.no_sppa.trim() && !formData.no_sppa_2.trim()) {
      toast.error('No SPPA wajib diisi');
      return;
    }
    if (isPersediaanToAset && !formData.golongan_tujuan) {
      toast.error('Pilih golongan tujuan');
      return;
    }
    if (isPersediaanToAset && !formData.kode_barang_tujuan) {
      toast.error('Pilih kode barang tujuan');
      return;
    }
    if (!formData.alasan_reklasifikasi) {
      toast.error('Pilih alasan reklasifikasi');
      return;
    }

    setLoading(true);
    const t = toast.loading(`Memproses reklasifikasi ${selectedIds.size} item...`);
    
    try {
      // Process each selected item
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of selectedItems) {
        try {
          const payload = {
            jenis: direction,
            source_id: item._id,
            source_type: isPersediaanToAset ? 'persediaan' : 'barang',
            kode_barang_asal: item.kode_barang,
            nama_barang: item.nama_barang,
            no_sppa: `${formData.no_sppa}${formData.no_sppa_2 ? '/' + formData.no_sppa_2 : ''}`.trim(),
            tanggal_transaksi: formData.tanggal_transaksi,
            golongan_tujuan: isPersediaanToAset ? formData.golongan_tujuan : '1',
            kode_barang_tujuan: formData.kode_barang_tujuan,
            nilai_perolehan: item.nilai_perolehan || (item.stok * item.nilai_satuan) || 0,
            nilai_satuan: item.nilai_satuan || 0,
            jumlah: item.stok || item.kuantitas || 1,
            satuan: item.satuan,
            merk: item.merk,
            tipe: item.tipe,
            kondisi: item.kondisi || 'Baik',
            alasan_reklasifikasi: formData.alasan_reklasifikasi,
            no_dokumen_pendukung: formData.no_dokumen_pendukung,
            keterangan: formData.keterangan
          };

          await api.post('/api/transaksi-cross/reklasifikasi', payload);
          successCount++;
        } catch (e) {
          console.error(`Error processing item ${item.nama_barang}:`, e);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Berhasil memproses ${successCount} item`, { id: t });
      }
      if (errorCount > 0) {
        toast.error(`Gagal memproses ${errorCount} item`);
      }
      
      // Reset form
      setSelectedIds(new Set());
      setItems([]);
      setSearch('');
      setFormData({
        no_sppa: '',
        no_sppa_2: '',
        tanggal_transaksi: new Date().toISOString().split('T')[0],
        golongan_tujuan: '',
        kode_barang_tujuan: '',
        alasan_reklasifikasi: '',
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

  const colorClass = isPersediaanToAset ? 'text-green-600' : 'text-purple-600';
  const borderClass = isPersediaanToAset ? 'border-green-200' : 'border-purple-200';
  const bgClass = isPersediaanToAset ? 'bg-green-50/30' : 'bg-purple-50/30';
  const headerTextClass = isPersediaanToAset ? 'text-green-800' : 'text-purple-800';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Item Selection */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {isPersediaanToAset ? (
                <Box className={`h-4 w-4 ${colorClass}`} />
              ) : (
                <Package className={`h-4 w-4 ${colorClass}`} />
              )}
              1. Cari & Pilih {isPersediaanToAset ? 'Persediaan' : 'Aset'}
            </CardTitle>
            <CardDescription className="text-xs">
              Cari dan pilih item {isPersediaanToAset ? 'persediaan' : 'aset'} untuk direklasifikasi
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Cari nama / kode barang..." 
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
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${items.length > 0 && selectedIds.size === items.length ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}
                        onClick={selectAll}
                      >
                        {items.length > 0 && selectedIds.size === items.length && <CheckSquare size={10}/>}
                      </div>
                    </TableHead>
                    <TableHead>Kode - Nama Barang</TableHead>
                    <TableHead className="text-right">{isPersediaanToAset ? 'Stok & Nilai' : 'NUP & Nilai'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(a => (
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
                          {a.kode_barang}
                        </div>
                        <div className="font-medium text-slate-700">{a.nama_barang}</div>
                        <div className="text-slate-500 italic">{a.merk || '-'} / {a.tipe || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-right align-top">
                        {isPersediaanToAset ? (
                          <>
                            <div className="font-medium text-slate-700">Stok: {a.stok} {a.satuan}</div>
                            <div className="text-slate-500 font-mono mt-1">
                              {formatCurrency(a.nilai_satuan)}/unit
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-blue-600">NUP {a.nup}</div>
                            <div className="text-slate-500 font-mono mt-1">
                              {formatCurrency(a.nilai_perolehan || a.nilai_buku)}
                            </div>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
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
              <span>{items.length} item ditemukan</span>
              <span className={`font-medium ${colorClass}`}>{selectedIds.size} item dipilih</span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Transaction Details */}
        <Card className={`${borderClass} ${bgClass} h-full`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm ${headerTextClass}`}>
              2. Detail Reklasifikasi {isPersediaanToAset ? 'Persediaan → Aset' : 'Aset → Persediaan'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isPersediaanToAset 
                ? 'Pemindahan item persediaan menjadi aset tetap BMN' 
                : 'Pemindahan aset tetap menjadi persediaan'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Items Summary */}
            {selectedIds.size > 0 && (
              <div className={`p-3 rounded-lg border ${isPersediaanToAset ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                <div className="text-xs font-semibold mb-1">Item Terpilih: {selectedIds.size}</div>
                <div className="text-xs text-slate-600">
                  Total Nilai: <span className="font-mono font-medium">
                    {formatCurrency(selectedItems.reduce((sum, a) => sum + (a.nilai_perolehan || (a.stok * a.nilai_satuan) || 0), 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">No SPPA *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.no_sppa}
                    onChange={(e) => setFormData({...formData, no_sppa: e.target.value})}
                    placeholder="Prefix..."
                    className="bg-white flex-1"
                  />
                  <Input
                    value={formData.no_sppa_2}
                    onChange={(e) => setFormData({...formData, no_sppa_2: e.target.value})}
                    placeholder="Nomor SPPA..."
                    className="bg-white flex-[2]"
                  />
                </div>
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

            {/* Target Details */}
            {isPersediaanToAset && (
              <div className="p-3 bg-white rounded-lg border space-y-3">
                <h4 className="text-xs font-semibold">Detail Aset Tujuan</h4>
                
                <div className="space-y-1">
                  <Label className="text-xs">Golongan Aset Tujuan *</Label>
                  <Select 
                    value={formData.golongan_tujuan} 
                    onValueChange={(v) => setFormData({...formData, golongan_tujuan: v})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Pilih golongan aset..." />
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

                {/* Kode Barang Tujuan - Using Hierarchical Picker */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    Kode Barang Tujuan *
                    {!formData.golongan_tujuan && (
                      <span className="text-amber-600 font-normal">(Pilih golongan dulu)</span>
                    )}
                  </Label>
                  
                  {!formData.golongan_tujuan ? (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>Pilih golongan aset tujuan terlebih dahulu</span>
                    </div>
                  ) : (
                    <HierarchicalKodeBarangPicker
                      golongan={formData.golongan_tujuan}
                      value={formData.kode_barang_tujuan}
                      onChange={(v) => setFormData({...formData, kode_barang_tujuan: v})}
                      placeholder="Klik untuk memilih kode barang..."
                    />
                  )}
                </div>
              </div>
            )}

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
                  <SelectItem value="Perubahan Status">Perubahan Status Penggunaan</SelectItem>
                  <SelectItem value="Koreksi Klasifikasi">Koreksi Kesalahan Klasifikasi</SelectItem>
                  <SelectItem value="Hasil Inventarisasi">Hasil Inventarisasi</SelectItem>
                  <SelectItem value="Penyesuaian Kebijakan">Penyesuaian Kebijakan Akuntansi</SelectItem>
                  <SelectItem value="Hasil Audit">Hasil Audit/Pemeriksaan</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              disabled={loading || selectedIds.size === 0 || (isPersediaanToAset && !formData.kode_barang_tujuan)}
              className={`w-full ${isPersediaanToAset ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Reklasifikasi ({selectedIds.size} item)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
