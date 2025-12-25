import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  Upload, FileText, Trash2, Loader2, PenTool, User, Search,
  Download, Eye, Plus, X, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const JENIS_DOKUMEN_OPTIONS = [
  { value: 'pendukung', label: 'Dokumen Pendukung' },
  { value: 'sk', label: 'Surat Keputusan' },
  { value: 'ba', label: 'Berita Acara' },
  { value: 'sppa', label: 'Dokumen SPPA' }
];

const POSISI_TTD_OPTIONS = [
  { value: 'Petugas', label: 'Petugas' },
  { value: 'Penyerah', label: 'Penyerah' },
  { value: 'Penerima', label: 'Penerima' },
  { value: 'PPK', label: 'PPK (Pejabat Pembuat Komitmen)' },
  { value: 'PPSPM', label: 'PPSPM' },
  { value: 'Kepala', label: 'Kepala/Pimpinan' },
  { value: 'Saksi', label: 'Saksi' }
];

export default function TransaksiDokumenManager({ transaksiId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [dokumenList, setDokumenList] = useState([]);
  const [tandaTanganList, setTandaTanganList] = useState([]);
  
  // Upload Dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadJenis, setUploadJenis] = useState('pendukung');
  const [uploadKeterangan, setUploadKeterangan] = useState('');
  
  // Signature Dialog
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [pegawaiSearch, setPegawaiSearch] = useState('');
  const [pegawaiList, setPegawaiList] = useState([]);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [signaturePosisi, setSignaturePosisi] = useState('Petugas');
  const [signatureKeterangan, setSignatureKeterangan] = useState('');
  const [searchingPegawai, setSearchingPegawai] = useState(false);

  const fetchData = useCallback(async () => {
    if (!transaksiId) return;
    
    setLoading(true);
    try {
      const res = await api.get(`/api/transaksi-dokumen/${transaksiId}/dokumen`);
      setDokumenList(res.data.dokumen_pendukung || []);
      setTandaTanganList(res.data.tanda_tangan || []);
    } catch (e) {
      console.error('Error fetching dokumen:', e);
    } finally {
      setLoading(false);
    }
  }, [transaksiId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchPegawai = async () => {
    setSearchingPegawai(true);
    try {
      // Include all pegawai, but show which ones have signatures
      const res = await api.get('/api/transaksi-dokumen/pegawai-with-signature', {
        params: { search: pegawaiSearch, limit: 20, include_all: true }
      });
      setPegawaiList(res.data || []);
    } catch (e) {
      console.error('Error searching pegawai:', e);
      toast.error('Gagal mencari pegawai');
    } finally {
      setSearchingPegawai(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file PDF terlebih dahulu');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('jenis_dokumen', uploadJenis);
    formData.append('keterangan', uploadKeterangan);
    
    try {
      await api.post(`/api/transaksi-dokumen/${transaksiId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Dokumen berhasil diupload');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadKeterangan('');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal upload dokumen');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDokumen = async (dokumenId) => {
    if (!window.confirm('Hapus dokumen ini?')) return;
    
    try {
      await api.delete(`/api/transaksi-dokumen/${transaksiId}/dokumen/${dokumenId}`);
      toast.success('Dokumen berhasil dihapus');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error('Gagal menghapus dokumen');
    }
  };

  const handleAddSignature = async () => {
    if (!selectedPegawai) {
      toast.error('Pilih pegawai terlebih dahulu');
      return;
    }
    
    setSigningLoading(true);
    try {
      await api.post(`/api/transaksi-dokumen/${transaksiId}/signature`, {
        pegawai_id: selectedPegawai.id,
        posisi: signaturePosisi,
        keterangan: signatureKeterangan
      });
      toast.success('Tanda tangan berhasil ditambahkan');
      setSignatureDialogOpen(false);
      setSelectedPegawai(null);
      setSignatureKeterangan('');
      setPegawaiList([]);
      fetchData();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menambahkan tanda tangan');
    } finally {
      setSigningLoading(false);
    }
  };

  const handleDeleteSignature = async (signatureId) => {
    if (!window.confirm('Hapus tanda tangan ini?')) return;
    
    try {
      await api.delete(`/api/transaksi-dokumen/${transaksiId}/signature/${signatureId}`);
      toast.success('Tanda tangan berhasil dihapus');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error('Gagal menghapus tanda tangan');
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Dokumen Pendukung
              </CardTitle>
              <CardDescription className="text-xs">
                Upload dokumen PDF sebagai lampiran transaksi
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Upload PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dokumenList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Belum ada dokumen pendukung
            </div>
          ) : (
            <div className="space-y-2">
              {dokumenList.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{doc.original_name}</div>
                      <div className="text-xs text-slate-500">
                        <Badge variant="outline" className="text-[10px] mr-2">
                          {JENIS_DOKUMEN_OPTIONS.find(j => j.value === doc.jenis_dokumen)?.label || doc.jenis_dokumen}
                        </Badge>
                        {formatFileSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                      </div>
                      {doc.keterangan && (
                        <div className="text-xs text-slate-600 mt-1">{doc.keterangan}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteDokumen(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signatures Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <PenTool className="h-4 w-4 text-green-600" />
                Tanda Tangan Digital
              </CardTitle>
              <CardDescription className="text-xs">
                Tambahkan tanda tangan pegawai dari database
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSignatureDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Tambah TTD
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tandaTanganList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <PenTool className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Belum ada tanda tangan
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tandaTanganList.map((ttd) => (
                <div 
                  key={ttd.id} 
                  className="p-3 bg-green-50 rounded-lg border border-green-200 relative"
                >
                  <button 
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteSignature(ttd.id)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  <div className="flex items-start gap-3">
                    {ttd.signature_url && (
                      <img 
                        src={ttd.signature_url} 
                        alt="TTD" 
                        className="w-16 h-12 object-contain border rounded bg-white"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-green-800">{ttd.posisi}</div>
                      <div className="text-sm font-medium truncate">{ttd.nama_pegawai}</div>
                      <div className="text-xs text-slate-600">{ttd.nip || '-'}</div>
                      <div className="text-xs text-slate-500 truncate">{ttd.jabatan || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {formatDate(ttd.signed_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload Dokumen PDF
            </DialogTitle>
            <DialogDescription>
              Upload dokumen pendukung untuk transaksi ini
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">File PDF *</Label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-slate-500">Maksimal 10MB</p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Jenis Dokumen</Label>
              <Select value={uploadJenis} onValueChange={setUploadJenis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_DOKUMEN_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Keterangan</Label>
              <Textarea
                value={uploadKeterangan}
                onChange={(e) => setUploadKeterangan(e.target.value)}
                placeholder="Deskripsi dokumen..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-green-600" />
              Tambah Tanda Tangan
            </DialogTitle>
            <DialogDescription>
              Pilih pegawai yang memiliki tanda tangan digital
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Pegawai */}
            <div className="space-y-1">
              <Label className="text-xs">Cari Pegawai</Label>
              <div className="flex gap-2">
                <Input
                  value={pegawaiSearch}
                  onChange={(e) => setPegawaiSearch(e.target.value)}
                  placeholder="Nama / NIP / Jabatan..."
                  onKeyDown={(e) => e.key === 'Enter' && searchPegawai()}
                />
                <Button variant="secondary" onClick={searchPegawai} disabled={searchingPegawai}>
                  {searchingPegawai ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Pegawai List */}
            {pegawaiList.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {pegawaiList.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => p.has_signature ? setSelectedPegawai(p) : null}
                    className={`p-3 flex items-center gap-3 border-b last:border-b-0 ${
                      p.has_signature 
                        ? 'cursor-pointer hover:bg-slate-50' 
                        : 'opacity-50 cursor-not-allowed bg-slate-50'
                    } ${selectedPegawai?.id === p.id ? 'bg-green-50 border-green-200' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.nama_lengkap}</div>
                      <div className="text-xs text-slate-500">{p.nip || '-'} • {p.jabatan || '-'}</div>
                      {!p.has_signature && (
                        <div className="text-xs text-red-500">Belum memiliki TTD digital</div>
                      )}
                    </div>
                    {p.signature_url && p.has_signature && (
                      <img src={p.signature_url} alt="TTD" className="w-12 h-8 object-contain border rounded" />
                    )}
                    {selectedPegawai?.id === p.id && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected Pegawai */}
            {selectedPegawai && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-green-800 mb-1">Terpilih:</div>
                <div className="flex items-center gap-3">
                  {selectedPegawai.signature_url && (
                    <img 
                      src={selectedPegawai.signature_url} 
                      alt="TTD" 
                      className="w-20 h-14 object-contain border rounded bg-white"
                    />
                  )}
                  <div>
                    <div className="font-medium">{selectedPegawai.nama_lengkap}</div>
                    <div className="text-xs text-slate-600">{selectedPegawai.nip}</div>
                    <div className="text-xs text-slate-500">{selectedPegawai.jabatan}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Posisi */}
            <div className="space-y-1">
              <Label className="text-xs">Posisi / Peran *</Label>
              <Select value={signaturePosisi} onValueChange={setSignaturePosisi}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSISI_TTD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Keterangan */}
            <div className="space-y-1">
              <Label className="text-xs">Keterangan (opsional)</Label>
              <Input
                value={signatureKeterangan}
                onChange={(e) => setSignatureKeterangan(e.target.value)}
                placeholder="Catatan tambahan..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureDialogOpen(false)}>Batal</Button>
            <Button 
              onClick={handleAddSignature} 
              disabled={signingLoading || !selectedPegawai}
              className="bg-green-600 hover:bg-green-700"
            >
              {signingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
              Tambahkan TTD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
