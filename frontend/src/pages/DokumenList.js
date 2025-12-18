import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Plus, Search, FileText, Edit, Trash, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

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
    const { register, handleSubmit, reset, setValue, watch } = useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            reset(initialData);
        } else {
            reset({
                jenis_dokumen: 'Kontrak',
                tanggal_dokumen: new Date().toISOString().split('T')[0],
                nilai_total: 0
            });
        }
    }, [initialData, isOpen, reset]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Find PPK Name
            if (data.ppk_id) {
                const ppk = ppkList.find(p => p._id === data.ppk_id);
                if (ppk) data.ppk_nama = ppk.nama_lengkap;
            }

            if (initialData) {
                await api.put(`/api/dokumen-sumber/${initialData._id}`, data);
                toast.success("Dokumen diperbarui");
            } else {
                await api.post('/api/dokumen-sumber', data);
                toast.success("Dokumen dibuat");
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
            <DialogContent className="max-w-2xl">
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
