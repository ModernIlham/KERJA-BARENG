import React, { useState } from 'react';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Upload, FileDown, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportPegawaiModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [result, setResult] = useState(null);

    const handleDownloadTemplate = async () => {
        setDownloading(true);
        try {
            const res = await api.get('/api/pegawai/import/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'template_import_pegawai.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Template berhasil didownload");
        } catch (e) {
            toast.error("Gagal download template");
        } finally {
            setDownloading(false);
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        Import Data Pegawai
                    </DialogTitle>
                    <DialogDescription>
                        Upload file Excel (.xlsx) untuk import data pegawai secara massal.
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="space-y-5 py-2">
                        {/* Template Download Section */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileDown className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 text-sm">Template Excel dengan Dropdown</h4>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Download template yang sudah dilengkapi dropdown pilihan sesuai data sistem.
                                    </p>
                                    <ul className="text-[11px] text-blue-600 mt-2 space-y-0.5">
                                        <li>✓ Dropdown Status Kepegawaian (PNS, PPPK, Non-ASN, dll)</li>
                                        <li>✓ Dropdown Pangkat/Golongan sesuai aturan</li>
                                        <li>✓ Dropdown Unit Kerja (Eselon 1-4) dari database</li>
                                        <li>✓ Sheet Referensi Data dan Petunjuk Pengisian</li>
                                    </ul>
                                    <Button 
                                        size="sm" 
                                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white w-full"
                                        onClick={handleDownloadTemplate}
                                        disabled={downloading}
                                    >
                                        {downloading ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Mengunduh...</>
                                        ) : (
                                            <><FileDown className="mr-2 h-4 w-4"/> Download Template Excel</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-amber-800">
                                <p className="font-medium">Tips Import:</p>
                                <ul className="mt-1 space-y-0.5">
                                    <li>• Gunakan dropdown pada template untuk menghindari kesalahan input</li>
                                    <li>• Hapus baris contoh (baris 2 hijau) sebelum import</li>
                                    <li>• Data duplikat (NIP/NIK/NPWP sama) akan dilewati otomatis</li>
                                </ul>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Upload File Excel</Label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                <Input 
                                    type="file" 
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="cursor-pointer border-0 p-0"
                                />
                                {file && (
                                    <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        {/* Result Stats */}
                        <div className="flex items-center gap-4 justify-center py-4 bg-slate-50 rounded-lg">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">{result.success}</div>
                                <div className="text-xs text-slate-500 uppercase font-medium">Berhasil</div>
                            </div>
                            <div className="h-12 w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-slate-500">{result.skipped}</div>
                                <div className="text-xs text-slate-500 uppercase font-medium">Dilewati</div>
                            </div>
                            <div className="h-12 w-px bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-600">{result.failed}</div>
                                <div className="text-xs text-slate-500 uppercase font-medium">Gagal</div>
                            </div>
                        </div>

                        {/* Success Message */}
                        {result.success > 0 && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm text-green-800">
                                    {result.success} data pegawai berhasil diimport ke sistem.
                                </span>
                            </div>
                        )}

                        {/* Skipped Info */}
                        {result.skipped > 0 && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
                                <span className="font-medium">{result.skipped} data dilewati</span> karena NIP/NIK/NPWP sudah ada di database.
                            </div>
                        )}

                        {/* Errors */}
                        {result.errors && result.errors.length > 0 && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                <p className="font-semibold text-red-800 text-sm flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Detail Error ({result.errors.length})
                                </p>
                                <div className="max-h-32 overflow-y-auto text-xs text-red-700 space-y-1">
                                    {result.errors.map((err, i) => (
                                        <div key={i} className="flex items-start gap-1">
                                            <span className="text-red-400">•</span>
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!result ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>Batal</Button>
                            <Button 
                                onClick={handleUpload} 
                                disabled={loading || !file} 
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {loading ? (
                                    <><Loader2 className="animate-spin mr-2 h-4 w-4"/> Memproses...</>
                                ) : (
                                    <><Upload className="mr-2 h-4 w-4"/> Proses Import</>
                                )}
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
