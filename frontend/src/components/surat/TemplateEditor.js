import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
    Table, Code, Type, FileText, Variable, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';

const VARIABLES = [
    { code: '{{ nomor_surat }}', label: 'Nomor Surat' },
    { code: '{{ tanggal }}', label: 'Tanggal Surat' },
    { code: '{{ lampiran }}', label: 'Lampiran' },
    { code: '{{ perihal }}', label: 'Perihal' },
    { code: '{{ kepada }}', label: 'Tujuan (Kepada)' },
    { code: '{{ daftar_barang }}', label: 'Tabel Barang (Otomatis)' },
    { code: '{{ nama_instansi }}', label: 'Nama Instansi' },
    { code: '{{ alamat_instansi }}', label: 'Alamat Instansi' },
    { code: '{{ ttd_nama }}', label: 'Nama Penandatangan' },
    { code: '{{ ttd_nip }}', label: 'NIP Penandatangan' },
    { code: '{{ ttd_jabatan }}', label: 'Jabatan Penandatangan' },
    { code: '{{ ttd_image }}', label: 'Gambar Tanda Tangan Digital' },
];

export default function TemplateEditor({ template, onClose, onSuccess }) {
    const [formData, setFormData] = useState(template || {
        nama_template: '',
        jenis: 'UMUM',
        konten: `
<div style="font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.5;">
    <!-- KOP SURAT -->
    <div style="text-align: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 30px;">
        <h3 style="margin: 0; font-size: 16pt; text-transform: uppercase;">PEMERINTAH REPUBLIK INDONESIA</h3>
        <h2 style="margin: 0; font-size: 18pt; font-weight: bold;">{{ nama_instansi }}</h2>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">{{ alamat_instansi }}</p>
    </div>

    <!-- HEADER -->
    <div style="text-align: center; margin-bottom: 30px;">
        <h3 style="text-decoration: underline; margin: 0; text-transform: uppercase;">SURAT KETERANGAN</h3>
        <p style="margin: 5px 0;">Nomor: {{ nomor_surat }}</p>
    </div>

    <!-- ISI -->
    <div style="text-align: justify;">
        <p>Yang bertanda tangan di bawah ini:</p>
        <table style="width: 100%; margin-left: 20px;">
            <tr><td style="width: 150px;">Nama</td><td>: {{ ttd_nama }}</td></tr>
            <tr><td>NIP</td><td>: {{ ttd_nip }}</td></tr>
            <tr><td>Jabatan</td><td>: {{ ttd_jabatan }}</td></tr>
        </table>

        <p style="margin-top: 20px;">Dengan ini menerangkan bahwa:</p>
        <!-- ISI CUSTOM DISINI -->
        <p>[Isi surat ketik disini...]</p>

        <p style="margin-top: 20px;">Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
    </div>

    <!-- TANDA TANGAN -->
    <div style="margin-top: 50px; float: right; width: 250px; text-align: center;">
        <p>Ditetapkan di: [Kota]</p>
        <p>Pada tanggal: {{ tanggal }}</p>
        <p style="margin-top: 10px; margin-bottom: 5px;">{{ ttd_jabatan }}</p>
        
        <!-- Placeholder TTD Digital -->
        <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
            {{ ttd_image }}
        </div>
        
        <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">{{ ttd_nama }}</p>
        <p style="margin: 0;">NIP. {{ ttd_nip }}</p>
    </div>
    <div style="clear: both;"></div>
</div>
        `
    });

    const insertVariable = (code) => {
        const textarea = document.getElementById('template-editor-area');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.konten;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        setFormData({ ...formData, konten: before + code + after });
        
        // Restore focus (approximate)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + code.length, start + code.length);
        }, 0);
    };

    const handleSave = async () => {
        try {
            if (template) {
                await api.put(`/api/surat/templates/${template.id}`, formData);
                toast.success("Template berhasil diperbarui");
            } else {
                await api.post('/api/surat/templates', formData);
                toast.success("Template berhasil dibuat");
            }
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error("Gagal menyimpan template");
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <div className="flex-none space-y-4 mb-4">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                        <Label>Nama Template Surat</Label>
                        <Input 
                            value={formData.nama_template} 
                            onChange={(e) => setFormData({...formData, nama_template: e.target.value})} 
                            placeholder="Contoh: Surat Perintah Mulai Kerja"
                            className="font-bold"
                        />
                    </div>
                    <div className="w-[200px] space-y-1">
                        <Label>Kategori</Label>
                        <select 
                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                            value={formData.jenis}
                            onChange={(e) => setFormData({...formData, jenis: e.target.value})}
                        >
                            <option value="UMUM">Surat Umum</option>
                            <option value="BAST">Berita Acara (BAST)</option>
                            <option value="SK">Surat Keputusan (SK)</option>
                            <option value="SPK">Surat Perintah Kerja</option>
                            <option value="UNDANGAN">Undangan</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0 border-t pt-4">
                {/* LEFT: EDITOR & VARIABLES */}
                <div className="w-1/2 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2"><Code size={16}/> Kode HTML Template</Label>
                        <div className="text-xs text-slate-500">Gunakan HTML & CSS standar untuk layout</div>
                    </div>
                    
                    {/* Toolbar Simpel */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded border">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertVariable('<b></b>')} title="Bold"><Bold size={12}/></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertVariable('<i></i>')} title="Italic"><Italic size={12}/></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertVariable('<u></u>')} title="Underline"><Underline size={12}/></Button>
                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertVariable('<div style="text-align: center;"></div>')} title="Center"><AlignCenter size={12}/></Button>
                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertVariable('<br/>')} title="Enter / Baris Baru"><Type size={12}/></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertVariable('<table border="1" style="width:100%; border-collapse:collapse;"><tr><td>Cell</td></tr></table>')} title="Insert Table"><Table size={12}/></Button>
                    </div>

                    <Textarea 
                        id="template-editor-area"
                        className="flex-1 font-mono text-xs leading-relaxed resize-none p-4"
                        value={formData.konten}
                        onChange={(e) => setFormData({...formData, konten: e.target.value})}
                        spellCheck="false"
                    />

                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <Label className="text-xs font-bold text-blue-800 mb-2 block flex items-center gap-1"><Variable size={12}/> Variabel Dinamis (Klik untuk sisipkan)</Label>
                        <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                            {VARIABLES.map(v => (
                                <button 
                                    key={v.code}
                                    onClick={() => insertVariable(v.code)}
                                    className="px-2 py-1 bg-white border border-blue-200 rounded text-[10px] text-blue-700 hover:bg-blue-100 transition-colors"
                                    title={v.label}
                                >
                                    {v.code}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: PREVIEW */}
                <div className="w-1/2 flex flex-col gap-2">
                    <Label className="flex items-center gap-2"><FileText size={16}/> Live Preview (Kertas A4)</Label>
                    <div className="flex-1 bg-slate-200 rounded overflow-y-auto p-4 flex justify-center">
                        <div 
                            className="bg-white shadow-lg w-[210mm] min-h-[297mm] p-0 origin-top transform scale-75 sm:scale-90 lg:scale-100 transition-transform"
                            dangerouslySetInnerHTML={{ 
                                __html: formData.konten
                                    .replace(/{{ ttd_image }}/g, '<div style="border:1px dashed #ccc; padding:5px; color:#aaa; font-size:10px; display:inline-block;">[TTD DIGITAL]</div>') 
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-none pt-4 flex justify-end gap-2 border-t mt-4">
                <Button variant="outline" onClick={onClose}>Batal</Button>
                <Button onClick={handleSave} className="bg-slate-900 text-white">
                    <Save className="mr-2 h-4 w-4"/> Simpan Template
                </Button>
            </div>
        </div>
    );
}