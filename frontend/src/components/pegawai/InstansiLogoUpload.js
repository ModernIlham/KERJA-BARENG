import React, { useRef } from 'react';
import { Button } from '../ui/button';
import { Camera, Trash, Upload } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';

export default function InstansiLogoUpload({ logoUrl, onSuccess }) {
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) return toast.error("Ukuran file maksimal 2MB");
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error("Format harus JPG/PNG/WEBP");

        const formData = new FormData();
        formData.append('file', file);

        const t = toast.loading("Mengupload logo...");
        try {
            await api.post('/api/settings/instansi/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Logo berhasil diupdate", { id: t });
            onSuccess();
        } catch (error) {
            toast.error("Gagal upload logo", { id: t });
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Hapus logo instansi?")) return;
        try {
            await api.delete('/api/settings/instansi/logo');
            toast.success("Logo dihapus");
            onSuccess();
        } catch (error) {
            toast.error("Gagal menghapus logo");
        }
    };

    return (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded border border-slate-200">
            <div className="w-20 h-20 bg-white border rounded flex items-center justify-center overflow-hidden shadow-sm">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo Instansi" className="w-full h-full object-contain p-1" />
                ) : (
                    <BuildingIconPlaceholder />
                )}
            </div>
            
            <div className="flex-1 space-y-2">
                <div className="text-sm font-medium text-slate-700">Logo Instansi</div>
                <div className="text-xs text-slate-500">
                    Format: JPG/PNG/WEBP (Maks. 2MB). Digunakan untuk kop surat.
                </div>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={14} className="mr-2"/> Upload Logo
                    </Button>
                    {logoUrl && (
                        <Button 
                            type="button"
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDelete}
                        >
                            <Trash size={14} className="mr-2"/> Hapus
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function BuildingIconPlaceholder() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
        </svg>
    );
}
