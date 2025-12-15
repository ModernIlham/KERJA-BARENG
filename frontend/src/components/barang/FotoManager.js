import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, X, Star, Upload, Trash, Maximize2, Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FotoManager({ isOpen, onClose, item, onSuccess }) {
    const [uploading, setUploading] = useState(false);
    const [description, setDescription] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [editingDesc, setEditingDesc] = useState(null); // { url, text }

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (process.env.REACT_APP_BACKEND_URL) {
             const baseUrl = process.env.REACT_APP_BACKEND_URL;
             const cleanPath = url.startsWith('/') ? url : `/${url}`;
             return `${baseUrl}${cleanPath}`;
        }
        return url.startsWith('/') ? url : `/${url}`;
    };

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            fd.append('files', files[i]);
        }
        if (description) fd.append('keterangan', description);

        try {
            await api.post(`/api/barang/${item._id}/upload-fotos`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Foto berhasil diupload");
            setDescription('');
            onSuccess(); 
        } catch (err) {
            toast.error("Gagal upload foto");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (url) => {
        if (!window.confirm("Hapus foto ini?")) return;
        try {
            await api.delete(`/api/barang/${item._id}/foto`, { data: { url } });
            toast.success("Foto dihapus");
            onSuccess();
        } catch (err) {
            toast.error("Gagal hapus foto");
        }
    };

    const handleSetThumbnail = async (url) => {
        try {
            await api.put(`/api/barang/${item._id}/set-thumbnail`, { url });
            toast.success("Thumbnail diupdate");
            onSuccess();
        } catch (err) {
            toast.error("Gagal set thumbnail");
        }
    };

    const handleUpdateDescription = async () => {
        if (!editingDesc) return;
        try {
            await api.put(`/api/barang/${item._id}/foto-metadata`, { 
                url: editingDesc.url, 
                keterangan: editingDesc.text 
            });
            toast.success("Keterangan diupdate");
            setEditingDesc(null);
            onSuccess();
        } catch (err) {
            toast.error("Gagal update keterangan");
        }
    };

    if (!item) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Manajemen Foto: {item.nama_barang}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        {/* Gallery Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-2 border rounded-md">
                            {item.fotos && item.fotos.length > 0 ? (
                                item.fotos.map((foto, idx) => (
                                    <div key={idx} className={`relative group border rounded-lg overflow-hidden flex flex-col ${foto.is_thumbnail ? 'ring-2 ring-blue-500' : ''}`}>
                                        <div className="relative h-32 bg-black">
                                            <img src={getImageUrl(foto.url)} alt="asset" className="w-full h-full object-contain" />
                                            
                                            {foto.is_thumbnail && (
                                                <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full text-xs shadow-sm z-10">
                                                    <Star size={12} fill="white" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={() => setZoomImage(getImageUrl(foto.url))} className="p-1.5 bg-white rounded-full hover:bg-blue-50 text-slate-700" title="Perbesar">
                                                    <Maximize2 size={16} />
                                                </button>
                                                <button onClick={() => handleSetThumbnail(foto.url)} className="p-1.5 bg-white rounded-full hover:bg-blue-50 text-blue-600" title="Jadikan Thumbnail">
                                                    <Star size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(foto.url)} className="p-1.5 bg-white rounded-full hover:bg-red-50 text-red-600" title="Hapus">
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Description Area */}
                                        <div className="p-2 bg-slate-50 text-xs border-t flex-1">
                                            {editingDesc && editingDesc.url === foto.url ? (
                                                <div className="flex gap-1">
                                                    <Input 
                                                        value={editingDesc.text} 
                                                        onChange={(e) => setEditingDesc({...editingDesc, text: e.target.value})}
                                                        className="h-6 text-[10px] px-1"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleUpdateDescription} className="text-green-600 hover:text-green-700"><Save size={14}/></button>
                                                    <button onClick={() => setEditingDesc(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start group/desc">
                                                    <span className="truncate flex-1" title={foto.keterangan}>{foto.keterangan || <i className="text-slate-400">Tanpa ket.</i>}</span>
                                                    <button 
                                                        onClick={() => setEditingDesc({ url: foto.url, text: foto.keterangan || '' })}
                                                        className="opacity-0 group-hover/desc:opacity-100 text-blue-500 hover:text-blue-700 ml-1"
                                                    >
                                                        <Edit2 size={12}/>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-10 text-slate-400 text-sm">
                                    Belum ada foto. Silakan upload.
                                </div>
                            )}
                        </div>

                        {/* Upload Section */}
                        <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2"><Upload size={16}/> Upload Foto Baru</h4>
                            <div className="space-y-2">
                                <Label>Keterangan (Opsional, untuk semua file yg dipilih)</Label>
                                <Input 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Contoh: Tampak Depan, Kondisi Rusak, dll"
                                    className="bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={handleUpload}
                                    disabled={uploading}
                                    className="file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-2 file:py-1 file:text-xs file:mr-2 hover:file:bg-blue-700 bg-white"
                                />
                                {uploading && <Loader2 className="animate-spin text-blue-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500">Bisa pilih banyak foto sekaligus. Format: JPG, PNG, WEBP.</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>Tutup</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Zoom Modal - Updated for Better Closing */}
            {zoomImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" 
                    onClick={() => setZoomImage(null)}
                >
                    {/* Explicit Close Button with High Z-Index */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoomImage(null);
                        }}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-[110]"
                        aria-label="Close fullscreen"
                    >
                        <X size={32} />
                    </button>
                    
                    <img 
                        src={zoomImage} 
                        alt="Zoomed" 
                        className="max-w-full max-h-full object-contain rounded shadow-2xl cursor-default"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
                    />
                </div>
            )}
        </>
    );
}
