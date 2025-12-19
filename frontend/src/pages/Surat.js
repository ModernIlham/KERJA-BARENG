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

// --- MAIN PAGE ---

export default function SuratPage() {
    const [activeTab, setActiveTab] = useState("arsip");
    const [templates, setTemplates] = useState([]);
    const [suratList, setSuratList] = useState([]); // Reused existing state name from previous file content
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Legacy Modal States (Surat Manual)
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedSurat, setSelectedSurat] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        nomor_surat: '',
        tanggal_surat: '',
        jenis_surat: 'Masuk',
        perihal: '',
        related_ref: ''
    });

    // Template Modal States
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    useEffect(() => {
        fetchTemplates();
        fetchSurat();
    }, [search]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/api/surat/templates');
            setTemplates(res.data);
        } catch(e) { console.error(e); }
    };

    const fetchSurat = async () => { // Existing fetch function reused
        setLoading(true);
        try {
            const res = await api.get('/api/surat/', { params: { search } });
            setSuratList(res.data); // Using setSuratList from original file logic
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Legacy Create
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/surat/', formData);
            toast.success("Surat tercatat");
            setIsAddOpen(false);
            setFormData({ nomor_surat: '', tanggal_surat: '', jenis_surat: 'Masuk', perihal: '', related_ref: '' });
            fetchSurat();
            setSelectedSurat(res.data);
            setIsUploadOpen(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Gagal menyimpan");
        }
    };

    // Legacy Upload
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!e.target.file.files[0]) return toast.error("Pilih file");
        setUploading(true);
        const fd = new FormData();
        fd.append('file', e.target.file.files[0]);
        try {
            await api.post(`/api/surat/${selectedSurat._id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success("File terupload");
            setIsUploadOpen(false);
            fetchSurat();
        } catch (err) { toast.error("Upload gagal"); } finally { setUploading(false); }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Hapus surat ini?")) return;
        try {
            await api.delete(`/api/surat/${id}`);
            toast.success("Terhapus");
            fetchSurat();
        } catch(e) { toast.error("Gagal hapus"); }
    };

    const handleDeleteTemplate = async (id) => {
        if(!window.confirm("Hapus template ini?")) return;
        await api.delete(`/api/surat/templates/${id}`);
        fetchTemplates();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-8 w-8 text-blue-600" />
                        Manajemen Persuratan
                    </h1>
                    <p className="text-sm text-slate-500">Kelola arsip surat, template, dan tanda tangan digital.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100">
                    <TabsTrigger value="arsip" className="px-6">Arsip Surat</TabsTrigger>
                    <TabsTrigger value="template" className="px-6">Template Editor (Nadine Style)</TabsTrigger>
                </TabsList>

                {/* TAB 1: ARSIP (Existing Logic) */}
                <TabsContent value="arsip" className="mt-4">
                    <div className="flex justify-end mb-4">
                        <Button className="bg-slate-900 text-white" onClick={() => setIsAddOpen(true)}>
                            <Plus className="mr-2 h-4 w-4"/> Catat Surat Manual
                        </Button>
                    </div>
                    
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input placeholder="Cari Nomor / Perihal..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)}/>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Nomor Surat</TableHead>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead>Perihal</TableHead>
                                        <TableHead className="text-right">File</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : suratList.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Belum ada surat.</TableCell></TableRow>
                                    ) : (
                                        suratList.map((surat) => (
                                            <TableRow key={surat._id}>
                                                <TableCell className="text-xs">{surat.tanggal_surat}</TableCell>
                                                <TableCell className="font-medium text-xs font-mono">{surat.nomor_surat}</TableCell>
                                                <TableCell><span className="bg-slate-100 px-2 py-1 rounded text-xs">{surat.jenis_surat}</span></TableCell>
                                                <TableCell className="text-sm max-w-[300px] truncate">{surat.perihal}</TableCell>
                                                <TableCell className="text-right">
                                                    {surat.file_path ? (
                                                        <a href={`http://localhost:8001${surat.file_path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Lihat</a>
                                                    ) : (
                                                        <button onClick={() => { setSelectedSurat(surat); setIsUploadOpen(true); }} className="text-slate-400 hover:text-slate-700 text-xs">Upload</button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(surat._id)} className="h-6 w-6 p-0 text-red-500"><Trash size={14}/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: TEMPLATES (New Feature) */}
                <TabsContent value="template" className="mt-4">
                    <div className="flex justify-between mb-4">
                        <div className="text-sm text-slate-500 italic">
                            Buat template standar dinas yang rapi. Gunakan variable dinamis untuk otomatisasi.
                        </div>
                        <Button onClick={() => { setEditingTemplate(null); setIsEditorOpen(true); }} className="bg-slate-900 text-white">
                            <Plus className="mr-2 h-4 w-4"/> Buat Template Baru
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(tpl => (
                            <Card key={tpl.id} className="hover:shadow-md transition-shadow cursor-pointer group border-l-4 border-l-blue-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex justify-between items-start">
                                        <span className="truncate">{tpl.nama_template}</span>
                                        <Settings size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors"/>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2 mb-4">
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase font-bold">{tpl.jenis}</span>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="outline" onClick={() => { setEditingTemplate(tpl); setIsEditorOpen(true); }}>
                                            <Edit size={14} className="mr-1"/> Edit
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteTemplate(tpl.id)}>
                                            <Trash size={14}/>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Template Editor Modal (Fullscreen) */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <DialogContent className="max-w-full w-[95vw] h-[95vh] p-6 flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template Surat' : 'Template Surat Baru'}</DialogTitle>
                        <DialogDescription>Gunakan editor di bawah untuk menyusun format surat standar.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <TemplateEditor 
                            template={editingTemplate} 
                            onClose={() => setIsEditorOpen(false)}
                            onSuccess={() => {
                                setIsEditorOpen(false);
                                fetchTemplates();
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manual Add Modal (Legacy) */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Catat Surat Manual</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Nomor Surat</Label><Input required value={formData.nomor_surat} onChange={e => setFormData({...formData, nomor_surat: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Tanggal</Label><Input required type="date" value={formData.tanggal_surat} onChange={e => setFormData({...formData, tanggal_surat: e.target.value})} /></div>
                        </div>
                        <div className="space-y-2"><Label>Perihal</Label><Input required value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} /></div>
                        <Button type="submit" className="w-full bg-slate-900">Simpan</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Upload Modal (Legacy) */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <Input type="file" name="file" accept=".pdf,.jpg" required />
                        <Button type="submit" className="w-full" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}