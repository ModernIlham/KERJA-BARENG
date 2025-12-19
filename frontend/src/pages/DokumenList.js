import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Plus, Search, FileText, Edit, Trash, Upload } from 'lucide-react';
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

    useEffect(() => {
        fetchDocs();
        fetchPpk();
    }, [search]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/dokumen-sumber', { params: { search } });
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
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input 
                            placeholder="Cari No Dokumen / Penyedia..." 
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
                                <TableHead>Jenis & Nomor</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>PPK & Penyedia</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : docs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Belum ada data dokumen.</TableCell>
                                </TableRow>
                            ) : (
                                docs.map(doc => (
                                    <TableRow key={doc._id}>
                                        <TableCell>
                                            <div className="font-bold text-slate-800">{doc.jenis_dokumen}</div>
                                            <div className="font-mono text-xs text-blue-600">{doc.nomor_dokumen}</div>
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
                                        <TableCell className="max-w-[200px] truncate text-slate-500 text-xs">
                                            {doc.uraian}
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
    const { register, handleSubmit, reset, setValue } = useForm();
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    // Register fields handled by custom components (Select)
    useEffect(() => {
        register('jenis_dokumen', { required: true });
        register('ppk_id');
    }, [register]);

    useEffect(() => {
        if (initialData) {
            reset(initialData);
            setSelectedFile(null);
            // Manually set values for Select components if needed, though reset usually handles it if names match
            if (initialData.jenis_dokumen) setValue('jenis_dokumen', initialData.jenis_dokumen);
            if (initialData.ppk_id) setValue('ppk_id', initialData.ppk_id);
        } else {
            reset({
                jenis_dokumen: 'Kontrak',
                tanggal_dokumen: new Date().toISOString().split('T')[0],
                nilai_total: 0
            });
            setValue('jenis_dokumen', 'Kontrak'); // Default
            setSelectedFile(null);
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

            // 2. Upload File if selected
            if (selectedFile && docId) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                
                const tUpload = toast.loading("Mengupload file dokumen...");
                try {
                    await api.post(`/api/dokumen-sumber/${docId}/upload`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    toast.success("File berhasil diupload", { id: tUpload });
                } catch (e) {
                    toast.error("Gagal upload file, tapi data tersimpan", { id: tUpload });
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Dokumen Sumber' : 'Tambah Dokumen Sumber Baru'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                                    <SelectItem value="Non Kontrak BLU">Non Kontrak BLU</SelectItem>
                                    <SelectItem value="SPM">SPM</SelectItem>
                                    <SelectItem value="SP2D">SP2D</SelectItem>
                                    <SelectItem value="BAST">BAST</SelectItem>
                                    <SelectItem value="Kuitansi">Kuitansi</SelectItem>
                                    <SelectItem value="Keputusan">Keputusan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Nomor Dokumen *</Label>
                            <Input {...register('nomor_dokumen', {required: true})} placeholder="Nomor..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Tanggal Dokumen *</Label>
                            <Input type="date" {...register('tanggal_dokumen', {required: true})} />
                        </div>
                        <div className="space-y-1">
                            <Label>Nilai Total (Rp)</Label>
                            <Input type="number" {...register('nilai_total')} placeholder="0" />
                        </div>
                    </div>

                    {/* New Fields for SPM */}
                    <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-3 rounded border border-yellow-100">
                        <div className="space-y-1">
                            <Label>Nomor SPM/SPBY</Label>
                            <Input {...register('nomor_spm')} placeholder="Nomor SPM..." />
                        </div>
                        <div className="space-y-1">
                            <Label>Tanggal SPM/SPBY</Label>
                            <Input type="date" {...register('tanggal_spm')} />
                        </div>
                    </div>

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
                            <Label>Akun Belanja (Opsional)</Label>
                            <Input {...register('akun_belanja')} placeholder="Kode Akun..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
                        <div className="space-y-1">
                            <Label>Nama Penyedia / Rekanan</Label>
                            <Input {...register('nama_penyedia')} placeholder="CV / PT..." />
                        </div>
                        <div className="space-y-1">
                            <Label>NPWP Penyedia</Label>
                            <Input {...register('npwp_penyedia')} placeholder="NPWP..." />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Uraian / Keterangan</Label>
                        <Textarea {...register('uraian')} placeholder="Keterangan singkat tentang dokumen ini..." />
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-2 border-t pt-4">
                        <Label className="flex items-center gap-2">
                            <Upload size={16}/> Upload Dokumen (Multi Upload)
                        </Label>
                        <div className="flex gap-2 items-center">
                            <Input 
                                type="file" 
                                accept="application/pdf,image/*"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                className="cursor-pointer"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Pilih file baru untuk menambah dokumen. (PDF/JPG/PNG, Max 10MB)
                        </p>

                        {/* List of existing attachments */}
                        {initialData?.dokumen_attachments && initialData.dokumen_attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                                <Label className="text-xs font-semibold">File Tersimpan:</Label>
                                {initialData.dokumen_attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <FileText size={12} className="text-blue-600"/>
                                            <span className="truncate max-w-[200px]">{file.original_name || 'Dokumen'}</span>
                                        </div>
                                        <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-[10px]">
                                            Lihat
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Fallback for legacy single file */}
                        {!initialData?.dokumen_attachments?.length && initialData?.file_url && (
                            <div className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 p-2 rounded mt-2">
                                <FileText size={12}/>
                                <a href={initialData.file_url} target="_blank" rel="noreferrer" className="underline">Lihat File Utama</a>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={loading} className="bg-slate-900 text-white">
                            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>}
                            Simpan Dokumen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
