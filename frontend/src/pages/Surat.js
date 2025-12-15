import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { FileText, Upload, Trash, Search, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Surat() {
  const [suratList, setSuratList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
      nomor_surat: '',
      tanggal_surat: '',
      jenis_surat: 'Masuk',
      perihal: '',
      related_ref: ''
  });

  useEffect(() => {
    fetchSurat();
  }, [search]);

  const fetchSurat = async () => {
    setLoading(true);
    try {
        const res = await api.get('/api/surat/', { params: { search } });
        setSuratList(res.data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreate = async (e) => {
      e.preventDefault();
      try {
          const res = await api.post('/api/surat/', formData);
          toast.success("Surat tercatat");
          setIsAddOpen(false);
          setFormData({ nomor_surat: '', tanggal_surat: '', jenis_surat: 'Masuk', perihal: '', related_ref: '' });
          fetchSurat();
          
          // Auto open upload
          setSelectedSurat(res.data);
          setIsUploadOpen(true);
      } catch (err) {
          toast.error(err.response?.data?.detail || "Gagal menyimpan");
      }
  };

  const handleUpload = async (e) => {
      e.preventDefault();
      if (!e.target.file.files[0]) return toast.error("Pilih file");
      
      setUploading(true);
      const fd = new FormData();
      fd.append('file', e.target.file.files[0]);
      
      try {
          await api.post(`/api/surat/${selectedSurat._id}/upload`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success("File terupload");
          setIsUploadOpen(false);
          fetchSurat();
      } catch (err) {
          toast.error("Upload gagal");
      } finally {
          setUploading(false);
      }
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Hapus surat ini?")) return;
      try {
          await api.delete(`/api/surat/${id}`);
          toast.success("Terhapus");
          fetchSurat();
      } catch(e) { toast.error("Gagal hapus"); }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-8 w-8 text-blue-600" />
                    Manajemen Persuratan
                </h1>
                <p className="text-sm text-slate-500 mt-1">Arsip surat masuk, keluar, dan berita acara.</p>
            </div>
            <Button className="bg-slate-900 text-white" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4"/> Catat Surat
            </Button>
        </div>

        <Card>
            <CardHeader className="pb-3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Cari Nomor / Perihal..." 
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Nomor Surat</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Perihal</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead className="text-right">File</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                        ) : suratList.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Belum ada surat.</TableCell></TableRow>
                        ) : (
                            suratList.map((surat) => (
                                <TableRow key={surat._id}>
                                    <TableCell className="text-xs">{surat.tanggal_surat}</TableCell>
                                    <TableCell className="font-medium text-xs font-mono">{surat.nomor_surat}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-[10px] ${
                                            surat.jenis_surat === 'Masuk' ? 'bg-green-100 text-green-700' : 
                                            surat.jenis_surat === 'Keluar' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'
                                        }`}>{surat.jenis_surat}</span>
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[300px] truncate" title={surat.perihal}>{surat.perihal}</TableCell>
                                    <TableCell className="text-xs text-slate-500">{surat.related_ref || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        {surat.file_path ? (
                                            <a href={`http://localhost:8001${surat.file_path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center justify-end gap-1 text-xs">
                                                <ExternalLink size={12}/> Lihat
                                            </a>
                                        ) : (
                                            <button onClick={() => { setSelectedSurat(surat); setIsUploadOpen(true); }} className="text-slate-400 hover:text-slate-700 text-xs flex items-center justify-end gap-1 ml-auto">
                                                <Upload size={12}/> Upload
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(surat._id)} className="h-6 w-6 p-0 text-red-500"><Trash size={14}/></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Modal Add */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Catat Surat Baru</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nomor Surat</Label>
                            <Input required value={formData.nomor_surat} onChange={e => setFormData({...formData, nomor_surat: e.target.value})} placeholder="e.g. 001/BMN/2024" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Surat</Label>
                            <Input required type="date" value={formData.tanggal_surat} onChange={e => setFormData({...formData, tanggal_surat: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Jenis Surat</Label>
                        <select className="w-full border rounded px-3 py-2 text-sm" value={formData.jenis_surat} onChange={e => setFormData({...formData, jenis_surat: e.target.value})}>
                            <option value="Masuk">Surat Masuk</option>
                            <option value="Keluar">Surat Keluar</option>
                            <option value="Berita Acara">Berita Acara (BA)</option>
                            <option value="SK">SK / Keputusan</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Perihal</Label>
                        <Input required value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Referensi (Opsional)</Label>
                        <Input placeholder="ID Transaksi / Kode Barang" value={formData.related_ref} onChange={e => setFormData({...formData, related_ref: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full bg-slate-900">Simpan</Button>
                </form>
            </DialogContent>
        </Dialog>

        {/* Modal Upload */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Dokumen Fisik</DialogTitle>
                    <DialogDescription>Untuk Surat No: {selectedSurat?.nomor_surat}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Pilih File (PDF/Image)</Label>
                        <Input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600" disabled={uploading}>
                        {uploading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>} Upload
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
