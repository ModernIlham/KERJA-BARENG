import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, X, Star, Upload, Trash, Maximize2, Save, Edit2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

// Fullscreen Zoom Component
const FullscreenViewer = ({ src, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    // Lock body scroll
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setScale(s => Math.min(s + 0.5, 4));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setScale(s => Math.max(s - 0.5, 1)); // Don't zoom out smaller than 1
        if (scale <= 1.5) setPosition({ x: 0, y: 0 }); // Reset pos if zooming out fully
    };

    const handleReset = (e) => {
        e.stopPropagation();
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const onMouseDown = (e) => {
        if (scale > 1) {
            setIsDragging(true);
            setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
            e.preventDefault(); // Prevent native drag
        }
    };

    const onMouseMove = (e) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            });
        }
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    // Portal to body
    return createPortal(
        <div 
            className="fixed inset-0 z-[100000] bg-black/95 flex items-center justify-center touch-none"
            onClick={onClose}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            {/* Top Bar with Close */}
            <div 
                className="absolute top-0 left-0 right-0 p-4 flex justify-end z-[100002]" 
                onClick={e => e.stopPropagation()}
            >
                <button 
                    type="button"
                    onClick={onClose}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all"
                >
                    <X size={32} />
                </button>
            </div>

            {/* Bottom Controls */}
            <div 
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100002] flex gap-4 bg-black/50 p-3 rounded-full backdrop-blur-md border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                <button type="button" onClick={handleZoomOut} className="text-white hover:text-blue-400 disabled:opacity-50" disabled={scale <= 1}>
                    <ZoomOut size={24} />
                </button>
                <span className="text-white font-mono w-12 text-center select-none pt-0.5">{Math.round(scale * 100)}%</span>
                <button type="button" onClick={handleZoomIn} className="text-white hover:text-blue-400 disabled:opacity-50" disabled={scale >= 4}>
                    <ZoomIn size={24} />
                </button>
            </div>

            {/* Image Area */}
            <div 
                className="relative w-full h-full flex items-center justify-center overflow-hidden p-6"
                style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
                <img 
                    src={src} 
                    alt="Fullscreen" 
                    className="max-w-full max-h-full object-contain transition-transform duration-100"
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` 
                    }}
                    onMouseDown={onMouseDown}
                    onClick={e => e.stopPropagation()} // Stop closing when clicking image
                />
            </div>
        </div>,
        document.body
    );
};

export default function FotoManager({ isOpen, onClose, item, onSuccess }) {
    const [uploading, setUploading] = useState(false);
    const [description, setDescription] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [editingDesc, setEditingDesc] = useState(null); 

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
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manajemen Foto: {item.nama_barang}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        {/* Gallery Grid */}
                        <div className="flex-1 overflow-y-auto p-2 border rounded-md min-h-[300px]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {item.fotos && item.fotos.length > 0 ? (
                                    item.fotos.map((foto, idx) => (
                                        <div key={idx} className={`relative group border rounded-lg overflow-hidden flex flex-col bg-white ${foto.is_thumbnail ? 'ring-2 ring-blue-500' : ''}`}>
                                            <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                                                <img src={getImageUrl(foto.url)} alt="asset" className="max-w-full max-h-full object-contain" />
                                                
                                                {foto.is_thumbnail && (
                                                    <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full text-xs shadow-sm z-10">
                                                        <Star size={12} fill="white" />
                                                    </div>
                                                )}
                                                
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button onClick={() => setZoomImage(getImageUrl(foto.url))} className="p-1.5 bg-white rounded-full hover:bg-blue-50 text-slate-700 shadow-md" title="Perbesar">
                                                        <Maximize2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleSetThumbnail(foto.url)} className="p-1.5 bg-white rounded-full hover:bg-blue-50 text-blue-600 shadow-md" title="Jadikan Thumbnail">
                                                        <Star size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(foto.url)} className="p-1.5 bg-white rounded-full hover:bg-red-50 text-red-600 shadow-md" title="Hapus">
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Description Area */}
                                            <div className="p-2 bg-slate-50 text-xs border-t">
                                                {editingDesc && editingDesc.url === foto.url ? (
                                                    <div className="flex gap-1 items-center">
                                                        <Input 
                                                            value={editingDesc.text} 
                                                            onChange={(e) => setEditingDesc({...editingDesc, text: e.target.value})}
                                                            className="h-6 text-[10px] px-1 bg-white"
                                                            autoFocus
                                                        />
                                                        <button onClick={handleUpdateDescription} className="text-green-600 hover:text-green-700 bg-white p-1 rounded border shadow-sm"><Save size={12}/></button>
                                                        <button onClick={() => setEditingDesc(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded border shadow-sm"><X size={12}/></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between items-start group/desc gap-1">
                                                        <span className="truncate flex-1 font-medium text-slate-600" title={foto.keterangan}>{foto.keterangan || <i className="text-slate-400 font-normal">Tanpa keterangan</i>}</span>
                                                        <button 
                                                            onClick={() => setEditingDesc({ url: foto.url, text: foto.keterangan || '' })}
                                                            className="opacity-0 group-hover/desc:opacity-100 text-blue-500 hover:text-blue-700"
                                                        >
                                                            <Edit2 size={12}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-10 text-slate-400 text-sm flex flex-col items-center">
                                        <Upload className="h-8 w-8 mb-2 opacity-50" />
                                        Belum ada foto. Silakan upload.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload Section */}
                        <div className="bg-slate-50 p-4 rounded-lg border space-y-3 shrink-0">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800"><Upload size={16}/> Upload Foto Baru</h4>
                            <div className="space-y-2">
                                <Label>Keterangan (Opsional)</Label>
                                <Input 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Contoh: Tampak Depan..."
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
                                    className="file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-2 file:py-1 file:text-xs file:mr-2 hover:file:bg-blue-700 bg-white cursor-pointer"
                                />
                                {uploading && <Loader2 className="animate-spin text-blue-600" />}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={onClose}>Tutup</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Zoom Modal */}
            {zoomImage && (
                <FullscreenViewer 
                    src={zoomImage} 
                    onClose={() => setZoomImage(null)} 
                />
            )}
        </>
    );
}
