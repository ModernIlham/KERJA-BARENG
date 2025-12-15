import React, { useState } from 'react';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, X, Star, Upload, Trash } from 'lucide-react';
import { toast } from 'sonner';

export default function FotoManager({ isOpen, onClose, item, onSuccess }) {
    const [uploading, setUploading] = useState(false);
    const [description, setDescription] = useState('');

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
            onSuccess(); // Refresh parent
        } catch (err) {
            toast.error("Gagal upload foto");
            console.error(err);
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

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Manajemen Foto: {item.nama_barang}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2 border rounded-md">
                        {item.fotos && item.fotos.length > 0 ? (
                            item.fotos.map((foto, idx) => (
                                <div key={idx} className={`relative group border rounded-lg overflow-hidden ${foto.is_thumbnail ? 'ring-2 ring-blue-500' : ''}`}>
                                    <img src={`http://localhost:8001${foto.url}`} alt="asset" className="w-full h-32 object-cover" />
                                    {foto.is_thumbnail && (
                                        <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full text-xs shadow-sm">
                                            <Star size={12} fill="white" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => handleSetThumbnail(foto.url)} className="p-1 bg-white rounded-full hover:bg-blue-100 text-blue-600" title="Jadikan Thumbnail">
                                            <Star size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(foto.url)} className="p-1 bg-white rounded-full hover:bg-red-100 text-red-600" title="Hapus">
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                    {foto.keterangan && (
                                        <div className="absolute bottom-0 w-full bg-black/60 text-white text-[10px] p-1 truncate text-center">
                                            {foto.keterangan}
                                        </div>
                                    )}
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
    );
}
