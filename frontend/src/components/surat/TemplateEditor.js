import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
    Table, Code, Type, FileText, Variable, Save, LayoutTemplate, Palette, Eye, Scissors 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { KOP_STYLES, EXAMPLE_TEMPLATES } from './KopSuratDesigns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    const [activeTab, setActiveTab] = useState("editor");
    const [instansi, setInstansi] = useState({});
    
    const [formData, setFormData] = useState(template || {
        nama_template: '',
        jenis: 'UMUM',
        kop_style: 'standard', // Default
        custom_kop_html: '', // For Custom Kop
        css_style: '', // CSS Custom
        konten: '' // HTML Content
    });

    // Load Instansi Data for Preview
    useEffect(() => {
        const fetchInstansi = async () => {
            try {
                const res = await api.get('/api/settings/instansi');
                setInstansi(res.data);
            } catch (e) { console.error(e); }
        };
        fetchInstansi();
    }, []);

    // Load Example if Empty
    const loadExample = (key) => {
        if (!window.confirm("Isi editor akan ditimpa dengan contoh. Lanjutkan?")) return;
        const ex = EXAMPLE_TEMPLATES[key];
        setFormData({
            ...formData,
            nama_template: ex.name,
            jenis: ex.jenis || 'UMUM',
            css_style: ex.css,
            konten: ex.html
        });
        toast.success("Contoh template dimuat");
    };

    const insertVariable = (code) => {
        const textarea = document.getElementById('template-editor-area');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.konten || '';
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        setFormData({ ...formData, konten: before + code + after });
        
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

    // Render Preview
    const renderPreview = () => {
        const kopConfig = KOP_STYLES[formData.kop_style] || KOP_STYLES.standard;
        // If Custom, use custom_kop_html from state, else use render func
        const kopHtml = formData.kop_style === 'custom' 
            ? kopConfig.render(instansi, formData.custom_kop_html) 
            : kopConfig.render(instansi);
            
        const kopCss = kopConfig.css;
        
        const fullHtml = `
            <style>
                ${kopCss}
                ${formData.css_style}
            </style>
            <div class="document-root">
                ${kopHtml}
                <div class="content-body">
                    ${(formData.konten || '')
                        .replace(/{{ ttd_image }}/g, '<div style="border:1px dashed #ccc; padding:5px; color:#aaa; font-size:10px; display:inline-block; width:100px; text-align:center;">[TTD DIGITAL]</div>')
                        .replace(/{{ nama_instansi }}/g, instansi.nama_instansi || 'NAMA INSTANSI')
                        .replace(/{{ alamat_instansi }}/g, instansi.alamat || 'Alamat Instansi')
                    }
                </div>
            </div>
        `;
        
        return { __html: fullHtml };
    };

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            {/* HEADER CONFIG */}
            <div className="flex-none space-y-4 mb-4 border-b pb-4">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                        <Label>Nama Template</Label>
                        <Input 
                            value={formData.nama_template} 
                            onChange={(e) => setFormData({...formData, nama_template: e.target.value})} 
                            placeholder="Contoh: Surat Perintah Tugas"
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
                    <div className="w-[250px] space-y-1">
                        <Label>Desain Kop Surat</Label>
                        <select 
                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                            value={formData.kop_style}
                            onChange={(e) => setFormData({...formData, kop_style: e.target.value})}
                        >
                            {Object.values(KOP_STYLES).map(style => (
                                <option key={style.id} value={style.id}>{style.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <div className="text-xs text-slate-500">
                        Pilih template awal untuk mempercepat pembuatan:
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadExample('sppb')} className="h-7 text-xs border-purple-200 text-purple-700">SPPB</Button>
                        <Button variant="outline" size="sm" onClick={() => loadExample('lpb')} className="h-7 text-xs border-blue-200 text-blue-700">LPB</Button>
                        <Button variant="outline" size="sm" onClick={() => loadExample('bast_full')} className="h-7 text-xs border-green-200 text-green-700">BAST</Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* LEFT: EDITOR TABS */}
                <div className="w-1/2 flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="w-full justify-start bg-slate-100 p-0 border-b rounded-none h-10">
                            <TabsTrigger value="editor" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-10 px-6">
                                <Code size={14} className="mr-2"/> HTML Editor
                            </TabsTrigger>
                            <TabsTrigger value="css" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-pink-600 rounded-none h-10 px-6">
                                <Palette size={14} className="mr-2"/> CSS Style
                            </TabsTrigger>
                            {formData.kop_style === 'custom' && (
                                <TabsTrigger value="kop" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none h-10 px-6">
                                    <LayoutTemplate size={14} className="mr-2"/> Custom Kop
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="editor" className="flex-1 flex flex-col gap-2 mt-2 data-[state=inactive]:hidden">
                            {/* Toolbar HTML */}
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded border">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertVariable('<b></b>')} title="Bold"><Bold size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertVariable('<i></i>')} title="Italic"><Italic size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertVariable('<u></u>')} title="Underline"><Underline size={14}/></Button>
                                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertVariable('<div class="text-center"></div>')} title="Center"><AlignCenter size={14}/></Button>
                                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertVariable('<br/>')} title="Enter / Baris Baru"><Type size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertVariable('<table class="data-table"><thead><tr><th>No</th><th>Item</th></tr></thead><tbody><tr><td>1</td><td>...</td></tr></tbody></table>')} title="Insert Data Table"><Table size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => insertVariable('<div class="page-break"></div>')} title="Insert Page Break"><Scissors size={14}/></Button>
                            </div>

                            <Textarea 
                                id="template-editor-area"
                                className="flex-1 font-mono text-xs leading-relaxed resize-none p-4 border-slate-300"
                                value={formData.konten}
                                onChange={(e) => setFormData({...formData, konten: e.target.value})}
                                spellCheck="false"
                                placeholder="Ketikan kode HTML konten surat disini..."
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
                        </TabsContent>

                        <TabsContent value="css" className="flex-1 flex flex-col gap-2 mt-2 data-[state=inactive]:hidden">
                            <div className="bg-pink-50 p-3 rounded border border-pink-100 text-xs text-pink-800 mb-2">
                                Gunakan CSS untuk mengatur layout halaman, tabel, dan font. Class <code>.page-break</code> sudah tersedia untuk memisahkan halaman.
                            </div>
                            <Textarea 
                                className="flex-1 font-mono text-xs leading-relaxed resize-none p-4 border-pink-200 bg-slate-50"
                                value={formData.css_style}
                                onChange={(e) => setFormData({...formData, css_style: e.target.value})}
                                spellCheck="false"
                                placeholder=".my-class { font-size: 12px; color: black; }"
                            />
                        </TabsContent>

                        <TabsContent value="kop" className="flex-1 flex flex-col gap-2 mt-2 data-[state=inactive]:hidden">
                            <div className="bg-orange-50 p-3 rounded border border-orange-100 text-xs text-orange-800 mb-2">
                                Desain Kop Surat Custom. Anda bisa menggunakan HTML & CSS bebas disini.
                            </div>
                            <Textarea 
                                className="flex-1 font-mono text-xs leading-relaxed resize-none p-4 border-orange-200 bg-slate-50"
                                value={formData.custom_kop_html || ''}
                                onChange={(e) => setFormData({...formData, custom_kop_html: e.target.value})}
                                spellCheck="false"
                                placeholder="<div>HTML KOP SURAT CUSTOM...</div>"
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* RIGHT: PREVIEW */}
                <div className="w-1/2 flex flex-col gap-2 border-l pl-4">
                    <Label className="flex items-center gap-2"><Eye size={16}/> Live Preview (A4)</Label>
                    <div className="flex-1 bg-slate-200 rounded overflow-y-auto p-4 flex justify-center">
                        <div 
                            className="bg-white shadow-lg w-[210mm] min-h-[297mm] p-[10mm] origin-top transform scale-75 sm:scale-90 lg:scale-100 transition-transform text-black"
                            dangerouslySetInnerHTML={renderPreview()}
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
