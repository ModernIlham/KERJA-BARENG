import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Save, Loader2, ArrowDownToLine, CheckCircle2, Clock, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ReklasifikasiMasukForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [formData, setFormData] = useState({
    tanggal_terima: new Date().toISOString().split('T')[0],
    catatan_penerimaan: ''
  });

  useEffect(() => {
    fetchPendingReklasifikasi();
  }, []);

  const fetchPendingReklasifikasi = async () => {
    setLoadingPending(true);
    try {
      const res = await api.get('/api/transaksi/reklasifikasi/pending');
      setPendingItems(res.data || []);
    } catch (e) {
      console.error('Error fetching pending:', e);
      toast.error('Gagal memuat data reklasifikasi pending');
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
  };

  const handleConfirmMasuk = async () => {
    if (!selectedItem) {
      toast.error('Pilih transaksi reklasifikasi terlebih dahulu');
      return;
    }

    setLoading(true);
    const t = toast.loading('Memproses reklasifikasi masuk...');

    try {
      const payload = {
        jenis: 'REKLASIFIKASI_MASUK',
        barang_id: selectedItem.barang_id,
        no_sppa: selectedItem.no_sppa,
        tanggal_transaksi: formData.tanggal_terima,
        golongan_awal: selectedItem.golongan_awal,
        golongan_baru: selectedItem.golongan_baru,
        kode_barang_baru: selectedItem.kode_barang_baru,
        nama_barang: selectedItem.nama_barang,
        nilai_perolehan: selectedItem.nilai_perolehan,
        nilai_buku: selectedItem.nilai_buku,
        alasan_reklasifikasi: selectedItem.alasan_reklasifikasi,
        unit_asal: selectedItem.unit_asal,
        unit_tujuan: selectedItem.unit_tujuan,
        linked_transaction_id: selectedItem.id,
        keterangan: `Diterima dari Reklasifikasi Keluar No. ${selectedItem.no_sppa}. ${formData.catatan_penerimaan || ''}`
      };

      await api.post('/api/transaksi/perubahan', payload);
      
      toast.success('Reklasifikasi Masuk berhasil dicatat!', { id: t });
      
      // Reset form and refresh
      setSelectedItem(null);
      setFormData({
        tanggal_terima: new Date().toISOString().split('T')[0],
        catatan_penerimaan: ''
      });
      fetchPendingReklasifikasi();
      
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error('Error:', e);
      toast.error(e.response?.data?.detail || 'Gagal memproses reklasifikasi masuk', { id: t });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Reklasifikasi List */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Reklasifikasi Keluar Menunggu Konfirmasi
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchPendingReklasifikasi}
                disabled={loadingPending}
              >
                <RefreshCw className={`h-4 w-4 ${loadingPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Pilih transaksi untuk dikonfirmasi sebagai Reklasifikasi Masuk
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="border rounded-md flex-1 overflow-auto max-h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No SPPA & Tanggal</TableHead>
                    <TableHead>Aset</TableHead>
                    <TableHead>Reklasifikasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPending ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        <p className="text-sm text-slate-500 mt-2">Memuat data...</p>
                      </TableCell>
                    </TableRow>
                  ) : pendingItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
                        <p className="text-sm text-slate-500">Tidak ada reklasifikasi pending</p>
                        <p className="text-xs text-slate-400">Semua transaksi sudah dikonfirmasi</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingItems.map(item => (
                      <TableRow 
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`cursor-pointer transition-colors ${
                          selectedItem?.id === item.id 
                            ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <TableCell className="text-xs align-top">
                          <div className="font-bold text-slate-800">{item.no_sppa}</div>
                          <div className="text-slate-500">{formatDate(item.created_at)}</div>
                          <Badge variant="outline" className="mt-1 bg-orange-50 text-orange-700 text-[10px]">
                            Pending
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs align-top">
                          <div className="font-medium">{item.nama_barang}</div>
                          <div className="text-slate-500 font-mono">
                            {item.kode_barang} / NUP {item.nup}
                          </div>
                          <div className="text-slate-500 mt-1">
                            {formatCurrency(item.nilai_perolehan || 0)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs align-top">
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 line-through">{item.golongan_awal}</span>
                            <span>→</span>
                            <span className="text-green-600 font-medium">{item.golongan_baru}</span>
                          </div>
                          {item.kode_barang_baru && (
                            <div className="text-slate-500 font-mono mt-1">
                              → {item.kode_barang_baru}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="text-xs text-slate-500">
              {pendingItems.length} transaksi menunggu konfirmasi
            </div>
          </CardContent>
        </Card>

        {/* Right: Confirmation Form */}
        <Card className="border-blue-200 bg-blue-50/30 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Konfirmasi Reklasifikasi Masuk
            </CardTitle>
            <CardDescription className="text-xs">
              Terima aset yang telah direklasifikasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItem ? (
              <>
                {/* Selected Transaction Info */}
                <div className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-blue-800">Detail Transaksi</h4>
                    <Badge className="bg-orange-500">Dari Reklasifikasi Keluar</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">No SPPA:</span>
                      <p className="font-bold">{selectedItem.no_sppa}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tanggal Keluar:</span>
                      <p className="font-medium">{formatDate(selectedItem.tanggal_transaksi || selectedItem.created_at)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm">Aset</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="font-medium">{selectedItem.nama_barang}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {selectedItem.kode_barang} / NUP {selectedItem.nup}
                      </p>
                      <div className="flex justify-between mt-2 text-xs">
                        <span>Nilai Perolehan:</span>
                        <span className="font-bold">{formatCurrency(selectedItem.nilai_perolehan || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs text-slate-500 mb-2">Perubahan Golongan:</p>
                    <div className="flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-red-50 to-green-50 rounded">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">Golongan Lama</p>
                        <p className="font-bold text-red-600">{selectedItem.golongan_awal || '-'}</p>
                      </div>
                      <div className="text-2xl">→</div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">Golongan Baru</p>
                        <p className="font-bold text-green-600">{selectedItem.golongan_baru || '-'}</p>
                      </div>
                    </div>
                    {selectedItem.kode_barang_baru && (
                      <p className="text-center text-xs mt-2 text-slate-600">
                        Kode Baru: <span className="font-mono font-bold">{selectedItem.kode_barang_baru}</span>
                      </p>
                    )}
                  </div>

                  {selectedItem.alasan_reklasifikasi && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-slate-500">Alasan:</p>
                      <p className="text-sm">{selectedItem.alasan_reklasifikasi}</p>
                    </div>
                  )}
                </div>

                {/* Confirmation Form */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal Terima *</Label>
                    <Input
                      type="date"
                      value={formData.tanggal_terima}
                      onChange={(e) => setFormData({...formData, tanggal_terima: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Catatan Penerimaan</Label>
                    <Textarea
                      value={formData.catatan_penerimaan}
                      onChange={(e) => setFormData({...formData, catatan_penerimaan: e.target.value})}
                      placeholder="Catatan tambahan saat penerimaan..."
                      rows={2}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handleConfirmMasuk}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Konfirmasi Reklasifikasi Masuk</>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Pilih Transaksi</p>
                <p className="text-xs mt-1">
                  Pilih transaksi dari daftar di sebelah kiri untuk dikonfirmasi
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
