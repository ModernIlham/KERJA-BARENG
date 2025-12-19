import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Printer, Loader2, FileText, PenTool } from 'lucide-react';
import { toast } from 'sonner';

export default function SuratGeneratorModal({ isOpen, onClose, transactionIds, defaultType = 'BAST' }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Custom Data Fields
    const [nomorSurat, setNomorSurat] = useState('');
    const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
    
    // Tanda Tangan
    const [pegawaiList, setPegawaiList] = useState([]);
    const [ttdId, setTtdId] = useState('');
    const [ttdName, setTtdName] = useState('');
    const [ttdNip, setTtdNip] = useState('');
    const [ttdJabatan, setTtdJabatan] = useState('');
    const [ttdImage, setTtdImage] = useState(''); // URL of signature

    // Preview
    const [previewHtml, setPreviewHtml] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            fetchPegawai();
            setPreviewHtml(null);
            setNomorSurat(`.../${defaultType}/${new Date().getFullYear()}`);
        }
    }, [isOpen, defaultType]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/api/surat/templates');
            setTemplates(res.data);
            if (res.data.length > 0) setSelectedTemplate(res.data[0].id);
        } catch (e) { console.error(e); }
    };

    const fetchPegawai = async () => {
        try {
            const res = await api.get('/api/pegawai', { params: { limit: 1000 } });
            setPegawaiList(res.data.data);
        } catch (e) { console.error(e); }
    };

    const handlePegawaiChange = (id) => {
        setTtdId(id);
        const p = pegawaiList.find(i => i._id === id);
        if (p) {
            setTtdName(p.nama_lengkap);
            setTtdNip(p.nip);
            setTtdJabatan(p.jabatan);
            setTtdImage(p.signature_url || '');
        }
    };

    const handlePreview = async () => {
        if (!selectedTemplate) return toast.error("Pilih template dulu");
        setLoading(true);
        try {
            const payload = {
                template_id: selectedTemplate,
                transaksi_ids: transactionIds,
                custom_data: {
                    nomor_surat: nomorSurat,
                    tanggal_surat: tanggalSurat,
                    // TTD Fields
                    ttd_nama: ttdName,
                    ttd_nip: ttdNip,
                    ttd_jabatan: ttdJabatan,
                    ttd_image: ttdImage ? `<img src="http://localhost:8001${ttdImage}" height="80" />` : '' 
                }
            };
            const res = await api.post('/api/surat/generate-preview', payload);
            setPreviewHtml(res.data.html);
        } catch (e) {
            toast.error("Gagal generate preview");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndPrint = async () => {
        if (!previewHtml) return;
        
        try {
            // Save Archive
            const payload = {
                nomor_surat: nomorSurat,
                tanggal_surat: tanggalSurat,
                jenis_surat: defaultType,
                template_id: selectedTemplate,
                transaksi_ids: transactionIds,
                html_content: previewHtml
            };
            await api.post('/api/surat/save-generated', payload);
            
            // Print
            const printWindow = window.open('', '', 'width=800,height=600');
            printWindow.document.write('<html><head><title>Print</title></head><body>');
            printWindow.document.write(previewHtml);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
            
            onClose();
            toast.success("Surat berhasil disimpan & dicetak");
        } catch (e) {
            toast.error("Gagal menyimpan arsip surat");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5"/> Cetak Surat / Berita Acara
                    </DialogTitle>
                    <DialogDescription>
                        Generate dokumen untuk {transactionIds.length} transaksi terpilih.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 overflow-hidden pt-2">
                    {/* LEFT: Config */}
                    <div className="w-1/3 space-y-4 border-r pr-4 overflow-y-auto">
                        <div className="space-y-1">
                            <Label>Template Surat</Label>
                            <select 
                                className="w-full border rounded p-2 text-sm bg-white"
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.nama_template}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="space-y-1">
                            <Label>Nomor Surat</Label>
                            <Input value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} />
                        </div>
                        
                        <div className="space-y-1">
                            <Label>Tanggal Surat</Label>
                            <Input type="date" value={tanggalSurat} onChange={(e) => setTanggalSurat(e.target.value)} />
                        </div>

                        {/* Tanda Tangan Section */}
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-slate-700">
                                <PenTool size={12}/> Penandatangan
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Pilih Pegawai</Label>
                                <select 
                                    className="w-full border rounded p-1 text-xs"
                                    value={ttdId}
                                    onChange={(e) => handlePegawaiChange(e.target.value)}
                                >
                                    <option value="">-- Pilih Pegawai --</option>
                                    {pegawaiList.map(p => (
                                        <option key={p._id} value={p._id}>{p.nama_lengkap}</option>
                                    ))}
                                </select>
                            </div>
                            {ttdId && (
                                <>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nama (di Dokumen)</Label>
                                        <Input className="h-7 text-xs" value={ttdName} onChange={(e) => setTtdName(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Jabatan</Label>
                                        <Input className="h-7 text-xs" value={ttdJabatan} onChange={(e) => setTtdJabatan(e.target.value)} />
                                    </div>
                                    {ttdImage ? (
                                        <div className="text-xs text-green-600 flex items-center gap-1">
                                            <PenTool size={10}/> Tanda tangan digital tersedia
                                        </div>
                                    ) : (
                                        <div className="text-xs text-red-500 italic">
                                            Pegawai ini belum memiliki Tanda Tangan Digital.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <Button onClick={handlePreview} disabled={loading} className="w-full bg-blue-600">
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <FileText className="mr-2 h-4 w-4"/>}
                            Generate Preview
                        </Button>
                    </div>

                    {/* RIGHT: Preview */}
                    <div className="w-2/3 bg-slate-100 rounded border p-4 overflow-y-auto flex justify-center">
                        {previewHtml ? (
                            <div 
                                className="bg-white shadow-lg p-8 min-h-[800px] w-full max-w-[210mm]"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        ) : (
                            <div className="text-slate-400 flex items-center justify-center h-full">
                                Preview surat akan muncul di sini.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-2 border-t mt-2">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSaveAndPrint} disabled={!previewHtml} className="bg-slate-900 text-white">
                        <Printer className="mr-2 h-4 w-4"/> Simpan & Cetak
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}