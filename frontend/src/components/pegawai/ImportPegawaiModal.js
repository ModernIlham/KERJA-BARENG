import React, { useState } from 'react';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../components/ui/input'; // Assuming this import path exists
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Upload, FileDown, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportPegawaiModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { success: int, failed: int, errors: [] }

    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get('/api/pegawai/import/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'template_import_pegawai.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            toast.error("Gagal download template");
        }
    };

    const handleUpload = async () => {
        if (!file) return toast.error("Pilih file excel terlebih dahulu");
        
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/pegawai/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            toast.success("Import selesai");
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.detail || "Gagal import data");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Data Pegawai</DialogTitle>
                    <DialogDescription>
                        Upload file Excel (.xlsx) sesuai template untuk import massal.
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="space-y-6 py-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 space-y-2">
                            <p className="font-semibold flex items-center gap-2"><FileDown size={16}/> Petunjuk Import:</p>
                            <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                                <li>Gunakan template yang disediakan sistem.</li>
                                <li>Kolom <strong>NIP</strong> dan <strong>Nama Lengkap</strong> wajib diisi.</li>
                                <li>Data akan otomatis <strong>di-trim</strong> (spasi dibersihkan).</li>
                                <li>Jika NIP/NIK/NPWP sudah ada, baris tersebut akan <strong>dilewati (skip)</strong>.</li>
                            </ul>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full mt-2 bg-white text-blue-700 border-blue-200 hover:bg-blue-100"
                                onClick={handleDownloadTemplate}
                            >
                                <FileDown className="mr-2 h-4 w-4"/> Download Template Excel
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Upload File Excel</Label>
                            <div className="flex gap-2">
                                <Input 
                                    type="file" 
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-4 justify-center py-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                                <div className="text-xs text-slate-500 uppercase">Berhasil</div>
                            </div>
                            <div className="h-10 w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-600">{result.skipped}</div>
                                <div className="text-xs text-slate-500 uppercase">Dilewati (Duplikat)</div>
                            </div>
                            <div className="h-10 w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                                <div className="text-xs text-slate-500 uppercase">Gagal</div>
                            </div>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div className="bg-red-50 p-3 rounded text-xs text-red-800 max-h-40 overflow-y-auto border border-red-100">
                                <p className="font-bold mb-1">Detail Error:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {result.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="text-center text-sm text-slate-500">
                            Proses import telah selesai.
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!result ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>Batal</Button>
                            <Button onClick={handleUpload} disabled={loading} className="bg-slate-900 text-white">
                                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>}
                                Proses Import
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose} className="w-full">Tutup</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}