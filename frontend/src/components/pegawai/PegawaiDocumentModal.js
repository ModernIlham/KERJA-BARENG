import React, { useState } from 'react';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { FileText, Trash, Eye, Upload, Loader2, File, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PegawaiDocumentModal({ isOpen, onClose, pegawai, onSuccess }) {
    const [file, setFile] = useState(null);
    const [keterangan, setKeterangan] = useState('');
    const [loading, setLoading] = useState(false);

    if (!pegawai) return null;

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            if (selected.size > 1024 * 1024) {
                toast.error("Ukuran file maksimal 1MB");
                e.target.value = null; // Reset
                setFile(null);
                return;
            }
            setFile(selected);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !keterangan) return toast.error("File dan Keterangan wajib diisi");

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('keterangan', keterangan);

        try {
            await api.post(`/api/pegawai/${pegawai._id}/upload-dokumen`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Dokumen diupload");
            setFile(null);
            setKeterangan('');
            if (onSuccess) onSuccess(); // Refresh parent to get updated list
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal upload");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm("Hapus dokumen ini?")) return;
        try {
            await api.delete(`/api/pegawai/${pegawai._id}/dokumen/${docId}`);
            toast.success("Dokumen dihapus");
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error("Gagal menghapus");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Dokumen Pegawai</DialogTitle>
                    <DialogDescription>
                        Kelola dokumen pendukung untuk {pegawai.nama_lengkap}. Maksimal 1MB per file (PDF/Gambar).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Upload Form */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Upload size={16}/> Upload Dokumen Baru
                        </h3>
                        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                            <div className="sm:col-span-5 space-y-1">
                                <Label className="text-xs">File (PDF/Scan)</Label>
                                <Input 
                                    type="file" 
                                    accept=".pdf, image/*" 
                                    onChange={handleFileChange}
                                    className="bg-white h-9 text-xs cursor-pointer"
                                />
                            </div>
                            <div className="sm:col-span-5 space-y-1">
                                <Label className="text-xs">Keterangan Dokumen</Label>
                                <Input 
                                    value={keterangan} 
                                    onChange={(e) => setKeterangan(e.target.value)} 
                                    placeholder="Contoh: SK CPNS, KTP, KK..."
                                    className="bg-white h-9 text-xs"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={loading} className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white">
                                    {loading ? <Loader2 className="animate-spin h-4 w-4"/> : "Upload"}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Document List */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Daftar Dokumen Tersimpan</h3>
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-100">
                                    <TableRow>
                                        <TableHead className="w-[50px]">No</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                        <TableHead className="text-center w-[100px]">Tipe</TableHead>
                                        <TableHead className="w-[150px]">Tanggal Upload</TableHead>
                                        <TableHead className="text-center w-[100px]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pegawai.dokumen && pegawai.dokumen.length > 0 ? (
                                        pegawai.dokumen.map((doc, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-center">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-sm">{doc.keterangan}</div>
                                                    <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{doc.original_name}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {doc.file_type === 'pdf' ? 
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-100">PDF</span> : 
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100">IMG</span>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600">
                                                    {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm') : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                                            <a href={doc.file_url} target="_blank" rel="noreferrer" title="Lihat">
                                                                <Eye className="h-4 w-4 text-blue-600"/>
                                                            </a>
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                                                            onClick={() => handleDelete(doc.id)}
                                                            title="Hapus"
                                                        >
                                                            <Trash className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2"/>
                                                Belum ada dokumen diupload.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}