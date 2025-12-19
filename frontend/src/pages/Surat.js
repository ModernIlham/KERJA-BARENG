import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FileText, Plus, Edit, Trash, Printer, Settings, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

// --- SUB-COMPONENTS ---

const TemplateEditor = ({ template, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(template || {
        nama_template: '',
        jenis: 'BAST',
        konten: `
<div style="font-family: Arial, sans-serif; padding: 20px;">
    <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px;">
        <h3>KOP SURAT INSTANSI</h3>
        <p>Alamat Lengkap Instansi</p>
    </div>
    
    <h4 style="text-align: center;">{{ judul_surat }}</h4>
    <p style="text-align: center;">Nomor: {{ nomor_surat }}</p>
    
    <p>Pada hari ini <b>{{ hari }}</b> tanggal <b>{{ tanggal }}</b>, kami yang bertanda tangan di bawah ini:</p>
    
    <p>1. Nama: .................... (Pihak Pertama)<br/>
       2. Nama: .................... (Pihak Kedua)</p>
       
    <p>Telah melakukan serah terima barang sebagai berikut:</p>
    
    <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th>No</th>
                <th>Nama Barang</th>
                <th>Jumlah</th>
                <th>Keterangan</th>
            </tr>
        </thead>
        <tbody>
            {% for item in daftar_barang %}
            <tr>
                <td style="text-align: center;">{{ loop.index }}</td>
                <td>{{ item.nama }}</td>
                <td style="text-align: center;">{{ item.jumlah }} {{ item.satuan }}</td>
                <td>{{ item.keterangan }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    
    <p>Demikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
    
    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="text-align: center;">
            <p>Pihak Pertama</p>
            <br/><br/><br/>
            <p>( ......................... )</p>
        </div>
        <div style="text-align: center;">
            <p>Pihak Kedua</p>
            <br/><br/><br/>
            <p>( ......................... )</p>
        </div>
    </div>
</div>
        `
    });

    const handleSubmit = async () => {
        try {
            if (template) {
                await api.put(`/api/surat/templates/${template.id}`, formData);
                toast.success("Template updated");
            } else {
                await api.post('/api/surat/templates', formData);
                toast.success("Template created");
            }
            onSuccess();
        } catch (e) { toast.error("Failed to save template"); }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label>Nama Template</Label>
                    <Input value={formData.nama_template} onChange={e => setFormData({...formData, nama_template: e.target.value})} placeholder="Contoh: BAST Masuk" />
                </div>
                <div className="space-y-1">
                    <Label>Jenis Transaksi</Label>
                    <select className="w-full border rounded p-2 text-sm" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})}>
                        <option value="BAST">Berita Acara Serah Terima</option>
                        <option value="SBB">Surat Bukti Barang (Keluar)</option>
                        <option value="SPB">Surat Permintaan Barang</option>
                        <option value="LAINNYA">Lainnya</option>
                    </select>
                </div>
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between">
                    <Label>HTML Content (Support Jinja2 Variables)</Label>
                    <div className="text-xs text-slate-500">
                        Vars: <code>{'{{ nomor_surat }}'}</code>, <code>{'{{ tanggal }}'}</code>, <code>{'{{ daftar_barang }}'}</code>
                    </div>
                </div>
                <Textarea 
                    className="h-[400px] font-mono text-xs" 
                    value={formData.konten} 
                    onChange={e => setFormData({...formData, konten: e.target.value})} 
                />
            </div>
            
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Batal</Button>
                <Button onClick={handleSubmit} className="bg-blue-600">Simpan Template</Button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

export default function SuratPage() {
    const [activeTab, setActiveTab] = useState("arsip");
    const [templates, setTemplates] = useState([]);
    const [archives, setArchives] = useState([]);
    
    // Modal States
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [previewHtml, setPreviewHtml] = useState(null);

    useEffect(() => {
        fetchTemplates();
        fetchArchives();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/api/surat/templates');
            setTemplates(res.data);
        } catch(e) { console.error(e); }
    };

    const fetchArchives = async () => {
        try {
            const res = await api.get('/api/surat/arsip');
            setArchives(res.data);
        } catch(e) { console.error(e); }
    };

    const handleDeleteTemplate = async (id) => {
        if(!window.confirm("Hapus template ini?")) return;
        await api.delete(`/api/surat/templates/${id}`);
        fetchTemplates();
    };

    const handlePrint = (htmlContent) => {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write('<html><head><title>Print Surat</title></head><body>');
        printWindow.document.write(htmlContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-8 w-8 text-blue-600" />
                        Manajemen Persuratan
                    </h1>
                    <p className="text-sm text-slate-500">Kelola template dan arsip surat transaksi BMN.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100">
                    <TabsTrigger value="arsip" className="px-6">Arsip Surat</TabsTrigger>
                    <TabsTrigger value="template" className="px-6">Template Editor</TabsTrigger>
                    <TabsTrigger value="settings" className="px-6">Pengaturan Kop</TabsTrigger>
                </TabsList>

                {/* TAB 1: ARSIP */}
                <TabsContent value="arsip" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Riwayat Surat Keluar/Masuk</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Nomor</TableHead>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {archives.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Belum ada arsip surat.</TableCell></TableRow>
                                    ) : archives.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.tanggal_surat}</TableCell>
                                            <TableCell className="font-mono font-bold">{item.nomor_surat}</TableCell>
                                            <TableCell><span className="bg-slate-100 px-2 py-1 rounded text-xs">{item.jenis_surat}</span></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" onClick={() => handlePrint(item.konten_final)}>
                                                    <Printer size={16} className="text-blue-600"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: TEMPLATES */}
                <TabsContent value="template" className="mt-4">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => { setEditingTemplate(null); setIsEditorOpen(true); }} className="bg-slate-900 text-white">
                            <Plus className="mr-2 h-4 w-4"/> Buat Template Baru
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(tpl => (
                            <Card key={tpl.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex justify-between">
                                        {tpl.nama_template}
                                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{tpl.jenis}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-slate-500 mb-4 h-10 overflow-hidden">
                                        HTML Content...
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => { setEditingTemplate(tpl); setIsEditorOpen(true); }}>
                                            <Edit size={14}/> Edit
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteTemplate(tpl.id)}>
                                            <Trash size={14}/>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* TAB 3: SETTINGS (Placeholder) */}
                <TabsContent value="settings" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Pengaturan Kop Surat & Tanda Tangan</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-slate-500 text-sm">
                                Fitur pengaturan global kop surat akan hadir di update berikutnya. 
                                Saat ini silakan edit langsung di dalam Template Editor.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Template Editor Modal */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template' : 'Template Baru'}</DialogTitle>
                    </DialogHeader>
                    <TemplateEditor 
                        template={editingTemplate} 
                        onClose={() => setIsEditorOpen(false)}
                        onSuccess={() => {
                            setIsEditorOpen(false);
                            fetchTemplates();
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
