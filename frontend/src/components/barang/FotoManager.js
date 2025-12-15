import React, { useState } from 'react';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, X, Star, Upload, Trash, Maximize2, Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FotoManager({ isOpen, onClose, item, onSuccess }) {
    const [uploading, setUploading] = useState(false);
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
        // No default description anymore

        try {
            await api.post(`/api/barang/${item._id}/upload-fotos`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Foto berhasil diupload");
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

    const handleOpenNewTab = (url) => {
        window.open(getImageUrl(url), '_blank', 'noopener,noreferrer');
    };

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manajemen Foto: {item.nama_barang}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Gallery Grid */}
                    <div className="flex-1 overflow-y-auto p-4 border rounded-md bg-slate-50 min-h-[300px]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {item.fotos && item.fotos.length > 0 ? (
                                item.fotos.map((foto, idx) => (
                                    <div key={idx} className={`relative group border rounded-lg overflow-hidden flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow ${foto.is_thumbnail ? 'ring-2 ring-blue-500' : ''}`}>
                                        <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                            <img src={getImageUrl(foto.url)} alt="asset" className="w-full h-full object-cover" />
                                            
                                            {foto.is_thumbnail && (
                                                <div className="absolute top-2 left-2 bg-blue-500 text-white p-1.5 rounded-full shadow-md z-10">
                                                    <Star size={14} fill="white" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={() => handleOpenNewTab(foto.url)} className="p-2 bg-white rounded-full hover:bg-blue-50 text-slate-700 shadow-md transform hover:scale-110 transition-transform" title="Buka di Tab Baru">
                                                    <Maximize2 size={18} />
                                                </button>
                                                <button onClick={() => handleSetThumbnail(foto.url)} className="p-2 bg-white rounded-full hover:bg-blue-50 text-blue-600 shadow-md transform hover:scale-110 transition-transform" title="Jadikan Thumbnail">
                                                    <Star size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(foto.url)} className="p-2 bg-white rounded-full hover:bg-red-50 text-red-600 shadow-md transform hover:scale-110 transition-transform" title="Hapus">
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Description Area */}
                                        <div className="p-2 bg-white text-xs border-t">
                                            {editingDesc && editingDesc.url === foto.url ? (
                                                <div className="flex gap-1 items-center">
                                                    <Input 
                                                        value={editingDesc.text} 
                                                        onChange={(e) => setEditingDesc({...editingDesc, text: e.target.value})}
                                                        className="h-7 text-[10px] px-2 bg-white flex-1"
                                                        autoFocus
                                                        placeholder="Ket..."
                                                    />
                                                    <button onClick={handleUpdateDescription} className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded border border-green-200"><Save size={12}/></button>
                                                    <button onClick={() => setEditingDesc(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200"><X size={12}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start group/desc gap-1">
                                                    <span className="truncate flex-1 font-medium text-slate-600 leading-tight" title={foto.keterangan || "Klik edit untuk tambah keterangan"}>
                                                        {foto.keterangan || <i className="text-slate-300 font-normal">Tanpa keterangan</i>}
                                                    </span>
                                                    <button 
                                                        onClick={() => setEditingDesc({ url: foto.url, text: foto.keterangan || '' })}
                                                        className="opacity-0 group-hover/desc:opacity-100 text-blue-500 hover:text-blue-700 p-0.5"
                                                        title="Edit Keterangan"
                                                    >
                                                        <Edit2 size={12}/>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                    <Upload className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">Belum ada foto.</p>
                                    <p className="text-xs">Silakan upload foto baru di bawah.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm shrink-0">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 mb-1"><Upload size={16}/> Upload Foto Baru</h4>
                                <p className="text-[10px] text-slate-500">Pilih satu atau lebih file (JPG, PNG, WEBP)</p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <Input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        onChange={handleUpload}
                                        disabled={uploading}
                                        className="file:bg-slate-900 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:text-xs file:mr-3 hover:file:bg-slate-800 bg-slate-50 cursor-pointer pr-8 w-full"
                                    />
                                    {uploading && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <Loader2 className="animate-spin text-slate-900 w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
