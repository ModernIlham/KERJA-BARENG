import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Plus, Search, FileText, Edit, Trash, Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

export default function DokumenList() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [ppkList, setPpkList] = useState([]);
    
    // Filter State
    const [filterKategori, setFilterKategori] = useState('Umum');

    useEffect(() => {
        fetchDocs();
        fetchPpk();
    }, [search, filterKategori]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/dokumen-sumber', { params: { search, kategori: filterKategori === 'Semua' ? '' : filterKategori } });
            setDocs(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchPpk = async () => {
        try {
            const res = await api.get('/api/pegawai/pejabat', { params: { role: 'PPK' } });
            setPpkList(res.data);
        } catch (e) { console.error(e); }
    };

    const handleCreate = () => {
        setSelectedDoc(null);
        setIsModalOpen(true);
    };

    const handleEdit = (doc) => {
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus dokumen ini?")) return;
        try {
            await api.delete(`/api/dokumen-sumber/${id}`);
            toast.success("Dokumen dihapus");
            fetchDocs();
        } catch (e) {
            toast.error("Gagal menghapus");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Referensi Dokumen Sumber</h1>
                    <p className="text-sm text-slate-500">Master data dokumen (SPM, Kontrak, BAST) untuk referensi transaksi</p>
                </div>
                <Button onClick={handleCreate} className="bg-slate-900 text-white">
                    <Plus className="mr-2 h-4 w-4"/> Tambah Dokumen
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                        <div className="flex gap-2 items-center">
                            <Label className="text-xs">Kategori:</Label>
                            <Select value={filterKategori} onValueChange={setFilterKategori}>
                                <SelectTrigger className="w-[200px] h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Semua">Semua Kategori</SelectItem>
                                    <SelectItem value="Umum">Umum</SelectItem>
                                    <SelectItem value="Persediaan">Persediaan</SelectItem>
                                    <SelectItem value="Aset Tetap Pembelian">Aset Tetap - Pembelian</SelectItem>
                                    <SelectItem value="Aset Tetap Transfer Masuk">Aset Tetap - Transfer Masuk</SelectItem>
                                    <SelectItem value="Aset Tetap KDP Perolehan">Aset Tetap - KDP Perolehan</SelectItem>
                                    <SelectItem value="Aset Tetap Pengembangan Langsung">Aset Tetap - Pengembangan Langsung</SelectItem>
                                    <SelectItem value="Aset Tetap Pengembangan KDP">Aset Tetap - Pengembangan KDP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative max-w-sm w-full md:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input 
                                placeholder="Cari No Dokumen / Penyedia..." 
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jenis & Nomor</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>PPK & Penyedia</TableHead>
                                <TableHead>SPM & BAST</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : docs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">Belum ada data dokumen.</TableCell>
                                </TableRow>
                            ) : (
                                docs.map(doc => (
                                    <TableRow key={doc._id}>
                                        <TableCell>
                                            <div className="font-bold text-slate-800">{doc.jenis_dokumen}</div>
                                            <div className="font-mono text-xs text-blue-600">{doc.nomor_dokumen}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                                doc.kategori === 'Persediaan' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                doc.kategori?.startsWith('Aset Tetap') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}>
                                                {doc.kategori || 'Umum'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{doc.tanggal_dokumen}</TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                <span className="font-semibold">PPK:</span> {doc.ppk_nama || '-'}
                                            </div>
                                            <div className="text-xs">
                                                <span className="font-semibold">Penyedia:</span> {doc.nama_penyedia || '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {doc.file_spm_url ? (
                                                    <a href={doc.file_spm_url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-green-600 hover:underline">
                                                        <FileText size={10} /> SPM
                                                    </a>
                                                ) : <span className="text-xs text-slate-400">- No SPM</span>}
                                                
                                                {doc.file_bast_url ? (
                                                    <a href={doc.file_bast_url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-purple-600 hover:underline">
                                                        <FileText size={10} /> BAST
                                                    </a>
                                                ) : <span className="text-xs text-slate-400">- No BAST</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(doc)}>
                                                    <Edit className="h-4 w-4 text-slate-600"/>
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc._id)}>
                                                    <Trash className="h-4 w-4 text-red-500"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DokumenForm 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialData={selectedDoc}
                onSuccess={() => {
                    setIsModalOpen(false);
                    fetchDocs();
                }}
                ppkList={ppkList}
            />
        </div>
    );
}

function DokumenForm({ isOpen, onClose, initialData, onSuccess, ppkList }) {
    const { register, handleSubmit, reset, setValue, watch } = useForm();
    const [loading, setLoading] = useState(false);
    
    // File States
    const [spmFile, setSpmFile] = useState(null);
    const [bastFile, setBastFile] = useState(null);

    // Register fields handled by custom components (Select)
    useEffect(() => {
        register('jenis_dokumen', { required: true });
        register('ppk_id');
        register('kategori', { required: true });
    }, [register]);

    useEffect(() => {
        if (initialData) {
            reset(initialData);
            setSpmFile(null);
            setBastFile(null);
            if (initialData.jenis_dokumen) setValue('jenis_dokumen', initialData.jenis_dokumen);
            if (initialData.ppk_id) setValue('ppk_id', initialData.ppk_id);
            if (initialData.kategori) setValue('kategori', initialData.kategori);
        } else {
            reset({
                jenis_dokumen: 'Kontrak',
                kategori: 'Umum',
                tanggal_dokumen: new Date().toISOString().split('T')[0],
                nilai_total: 0
            });
            setValue('jenis_dokumen', 'Kontrak'); // Default
            setValue('kategori', 'Umum'); // Default
            setSpmFile(null);
            setBastFile(null);
        }
    }, [initialData, isOpen, reset, setValue]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Find PPK Name
            if (data.ppk_id) {
                const ppk = ppkList.find(p => p._id === data.ppk_id);
                if (ppk) data.ppk_nama = ppk.nama_lengkap;
            }

            let docId = initialData?._id;

            // 1. Create or Update Data
            if (initialData) {
                await api.put(`/api/dokumen-sumber/${initialData._id}`, data);
                toast.success("Data dokumen diperbarui");
            } else {
                const res = await api.post('/api/dokumen-sumber', data);
                docId = res.data._id || res.data.id;
                toast.success("Data dokumen dibuat");
            }

            // 2. Upload SPM if selected
            if (spmFile && docId) {
                const formData = new FormData();
                formData.append('file', spmFile);
                try {
                    await api.post(`/api/dokumen-sumber/${docId}/upload?type=spm`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    toast.success("SPM berhasil diupload");
                } catch (e) {
                    toast.error("Gagal upload SPM");
                }
            }

            // 3. Upload BAST if selected
            if (bastFile && docId) {
                const formData = new FormData();
                formData.append('file', bastFile);
                try {
                    await api.post(`/api/dokumen-sumber/${docId}/upload?type=bast`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    toast.success("BAST berhasil diupload");
                } catch (e) {
                    toast.error("Gagal upload BAST");
                }
            }

            onSuccess();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal menyimpan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Dokumen Sumber' : 'Tambah Dokumen Sumber Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* General Info */}
                    <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div className="space-y-1">
                            <Label>Kategori / Peruntukan *</Label>
                            <Select 
                                onValueChange={(v) => setValue('kategori', v)} 
                                defaultValue={initialData?.kategori || "Umum"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Umum">Umum</SelectItem>
                                    <SelectItem value="Persediaan">Persediaan</SelectItem>
                                    <SelectItem value="Aset Tetap Pembelian">Aset Tetap - Pembelian</SelectItem>
                                    <SelectItem value="Aset Tetap Transfer Masuk">Aset Tetap - Transfer Masuk</SelectItem>
                                    <SelectItem value="Aset Tetap KDP Perolehan">Aset Tetap - KDP Perolehan</SelectItem>
                                    <SelectItem value="Aset Tetap Pengembangan Langsung">Aset Tetap - Pengembangan Langsung</SelectItem>
                                    <SelectItem value="Aset Tetap Pengembangan KDP">Aset Tetap - Pengembangan KDP</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500">Pilih kategori agar muncul di menu transaksi yang sesuai.</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Jenis Dokumen</Label>
                            <Select 
                                onValueChange={(v) => setValue('jenis_dokumen', v)} 
                                defaultValue={initialData?.jenis_dokumen || "Kontrak"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Kontrak">Kontrak</SelectItem>
                                    <SelectItem value="Kontrak BLU">Kontrak BLU</SelectItem>
                                    <SelectItem value="SPM">SPM</SelectItem>
                                    <SelectItem value="SP2D">SP2D</SelectItem>
                                    <SelectItem value="BAST">BAST</SelectItem>
                                    <SelectItem value="Kuitansi">Kuitansi</SelectItem>
                                    <SelectItem value="Keputusan">Keputusan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Nomor Dokumen Utama *</Label>
                            <Input {...register('nomor_dokumen', {required: true})} placeholder="Nomor Kontrak/SK..." />
                        </div>
                        <div className="space-y-1">
                            <Label>Tanggal Dokumen *</Label>
                            <Input type="date" {...register('tanggal_dokumen', {required: true})} />
                        </div>
                    </div>

                    {/* Section: SPM */}
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-100 space-y-3">
                        <h3 className="font-bold text-sm text-yellow-800">Informasi SPM</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Nomor SPM</Label>
                                <Input {...register('nomor_spm')} placeholder="Nomor SPM..." />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal SPM</Label>
                                <Input type="date" {...register('tanggal_spm')} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="flex items-center gap-2">
                                <Upload size={14}/> Upload Dokumen SPM
                            </Label>
                            <Input 
                                type="file" 
                                accept="application/pdf,image/*"
                                onChange={(e) => setSpmFile(e.target.files[0])}
                                className="bg-white"
                            />
                            {initialData?.file_spm_url && (
                                <div className="mt-1 text-xs">
                                    <a href={initialData.file_spm_url} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-1">
                                        <Eye size={12}/> Lihat File SPM Tersimpan
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: BAST */}
                    <div className="bg-purple-50 p-4 rounded border border-purple-100 space-y-3">
                        <h3 className="font-bold text-sm text-purple-800">Informasi BAST PPK ke KPB</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>No BAST PPK ke KPB</Label>
                                <Input {...register('nomor_bast')} placeholder="Nomor BAST..." />
                            </div>
                            <div className="space-y-1">
                                <Label>Tanggal BAST</Label>
                                <Input type="date" {...register('tanggal_bast')} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="flex items-center gap-2">
                                <Upload size={14}/> Upload Dokumen BAST
                            </Label>
                            <Input 
                                type="file" 
                                accept="application/pdf,image/*"
                                onChange={(e) => setBastFile(e.target.files[0])}
                                className="bg-white"
                            />
                            {initialData?.file_bast_url && (
                                <div className="mt-1 text-xs">
                                    <a href={initialData.file_bast_url} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-1">
                                        <Eye size={12}/> Lihat File BAST Tersimpan
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Other Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>PPK (Pejabat Pembuat Komitmen)</Label>
                            <Select 
                                onValueChange={(v) => setValue('ppk_id', v)} 
                                defaultValue={initialData?.ppk_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih PPK..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ppkList.map(ppk => (
                                        <SelectItem key={ppk._id} value={ppk._id}>{ppk.nama_lengkap}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Akun Belanja</Label>
                            <Input {...register('akun_belanja')} placeholder="Kode Akun..." />
                        </div>
                        <div className="space-y-1">
                            <Label>Nama Penyedia</Label>
                            <Input {...register('nama_penyedia')} placeholder="CV / PT..." />
                        </div>
                        <div className="space-y-1">
                            <Label>NPWP Penyedia</Label>
                            <Input {...register('npwp_penyedia')} placeholder="NPWP..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Nilai Total (Rp)</Label>
                            <Input type="number" {...register('nilai_total')} placeholder="0" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Uraian</Label>
                        <Textarea {...register('uraian')} placeholder="Keterangan singkat..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={loading} className="bg-slate-900 text-white">
                            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
