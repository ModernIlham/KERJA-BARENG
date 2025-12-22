import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FileText, Download, Loader2, MapPin, Calendar, Building, Tag, Banknote, Image as ImageIcon, Settings } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'sonner';

export default function KIBModal({ isOpen, onClose, asetId }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orgSettings, setOrgSettings] = useState({
    uapb: '',
    uappb_e1: '',
    uappb_w: '',
    uakpb_nama: '',
    uakpb_kode: ''
  });

  useEffect(() => {
    if (isOpen && asetId) {
      fetchKIBData();
    }
  }, [isOpen, asetId]);

  const fetchKIBData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/aset/kib/${asetId}`);
      setData(res.data);
      setOrgSettings(res.data.org_settings);
    } catch (e) {
      toast.error('Gagal memuat data KIB');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const response = await api.get(`/api/aset/kib/${asetId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KIB_${data?.aset?.kode_barang}_${data?.aset?.nup}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh PDF');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/api/aset/kib/settings', orgSettings);
      toast.success('Pengaturan berhasil disimpan');
      setSettingsOpen(false);
      fetchKIBData();
    } catch (e) {
      toast.error('Gagal menyimpan pengaturan');
    }
  };

  const formatCurrency = (value) => {
    try {
      return `Rp ${(value || 0).toLocaleString('id-ID')}`;
    } catch {
      return 'Rp 0';
    }
  };

  if (!isOpen) return null;

  const aset = data?.aset;
  const kibType = data?.kib_type;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-blue-600" />
              Kartu Identitas Barang (KIB)
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <Settings size={14} className="mr-1" /> Pengaturan
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                disabled={generating || loading}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                {generating ? (
                  <><Loader2 size={14} className="mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><Download size={14} className="mr-1" /> Download PDF</>
                )}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-slate-500">Memuat data...</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Settings Panel */}
            {settingsOpen && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-3">Pengaturan Organisasi KIB</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600">UAPB</label>
                      <Input 
                        value={orgSettings.uapb}
                        onChange={e => setOrgSettings({...orgSettings, uapb: e.target.value})}
                        placeholder="Nama Kementerian/Lembaga"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">UAKPB (Nama Satker)</label>
                      <Input 
                        value={orgSettings.uakpb_nama}
                        onChange={e => setOrgSettings({...orgSettings, uakpb_nama: e.target.value})}
                        placeholder="Nama Satuan Kerja"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">UAPPB-E1</label>
                      <Input 
                        value={orgSettings.uappb_e1}
                        onChange={e => setOrgSettings({...orgSettings, uappb_e1: e.target.value})}
                        placeholder="Eselon I"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Kode UAKPB</label>
                      <Input 
                        value={orgSettings.uakpb_kode}
                        onChange={e => setOrgSettings({...orgSettings, uakpb_kode: e.target.value})}
                        placeholder="Kode Satker"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">UAPPB-W</label>
                      <Input 
                        value={orgSettings.uappb_w}
                        onChange={e => setOrgSettings({...orgSettings, uappb_w: e.target.value})}
                        placeholder="Wilayah"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSaveSettings} className="w-full h-8">
                        Simpan Pengaturan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KIB Header */}
            <div className="text-center border-b pb-4">
              <Badge className="mb-2 bg-blue-100 text-blue-700">
                KIB {kibType?.code} - {kibType?.name}
              </Badge>
              <h2 className="text-xl font-bold text-slate-800">{aset?.nama_barang}</h2>
              <p className="text-sm text-slate-500 font-mono">
                {aset?.kode_barang} / NUP: {aset?.nup}
              </p>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Tag size={14} /> Identitas Barang
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Merk</span>
                      <span className="font-medium">{aset?.merk || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tipe</span>
                      <span className="font-medium">{aset?.tipe || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kondisi</span>
                      <Badge variant="outline">{aset?.kondisi || '-'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <Badge className={aset?.status_aset === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}>
                        {aset?.status_aset || 'Aktif'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Banknote size={14} /> Nilai & Perolehan
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nilai Perolehan</span>
                      <span className="font-bold text-blue-600">{formatCurrency(aset?.nilai_perolehan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nilai Buku</span>
                      <span className="font-medium">{formatCurrency(aset?.nilai_buku)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Penyusutan</span>
                      <span className="text-orange-600">{formatCurrency(aset?.nilai_penyusutan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tgl. Perolehan</span>
                      <span className="font-medium">{aset?.tgl_perolehan || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <MapPin size={14} /> Lokasi
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500 block text-xs">Lokasi Fisik</span>
                      <span className="font-medium">{aset?.lokasi_fisik || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Alamat</span>
                      <span className="font-medium text-xs">{aset?.alamat || '-'}</span>
                    </div>
                    {aset?.ruang && (
                      <div>
                        <span className="text-slate-500 block text-xs">Ruang</span>
                        <span className="font-medium">{aset?.ruang}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Building size={14} /> Informasi Tambahan
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Golongan</span>
                      <span className="font-medium text-xs">{aset?.golongan_barang || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tahun Anggaran</span>
                      <span className="font-medium">{aset?.tahun_anggaran || '-'}</span>
                    </div>
                    {aset?.no_sertifikat && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">No. Sertifikat</span>
                        <span className="font-medium">{aset?.no_sertifikat}</span>
                      </div>
                    )}
                    {aset?.luas_tanah && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Luas Tanah</span>
                        <span className="font-medium">{aset?.luas_tanah} m²</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Photos */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2 mb-3">
                  <ImageIcon size={14} /> Foto Barang
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map(idx => {
                    const foto = aset?.fotos?.[idx];
                    return (
                      <div key={idx} className="aspect-video bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                        {foto?.url ? (
                          <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-slate-400">
                            <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                            <p className="text-xs">Foto {idx + 1}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            Data tidak ditemukan
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
