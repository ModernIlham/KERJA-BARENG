import React from 'react';
import { Button } from '../ui/button';
import { Camera, Trash } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';

export default function PegawaiPhotoUpload({ pegawai, onSuccess }) {
    const fileInputRef = React.useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        if (file.size > 2 * 1024 * 1024) return toast.error("Ukuran file maksimal 2MB");
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error("Format harus JPG/PNG/WEBP");

        const formData = new FormData();
        formData.append('file', file);

        const t = toast.loading("Mengupload foto...");
        try {
            await api.post(`/api/pegawai/${pegawai._id}/upload-foto`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Foto profil berhasil diupdate", { id: t });
            onSuccess();
        } catch (error) {
            toast.error("Gagal upload foto", { id: t });
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Hapus foto profil ini?")) return;
        try {
            await api.delete(`/api/pegawai/${pegawai._id}/foto`);
            toast.success("Foto dihapus");
            onSuccess();
        } catch (error) {
            toast.error("Gagal menghapus foto");
        }
    };

    const photoUrl = pegawai.foto_thumbnail_url || pegawai.foto_url;

    return (
        <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded border border-slate-200">
            <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                    ) : (
                        <Camera size={32} className="text-slate-300" />
                    )}
                </div>
                
                {photoUrl && (
                    <button 
                        onClick={handleDelete}
                        className="absolute bottom-0 right-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm"
                        title="Hapus Foto"
                        type="button"
                    >
                        <Trash size={12} />
                    </button>
                )}
            </div>

            <div className="text-center">
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
                    className="text-xs"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {photoUrl ? "Ganti Foto" : "Upload Foto"}
                </Button>
                <p className="text-[10px] text-slate-400 mt-1">Maks. 2MB (JPG/PNG)</p>
            </div>
        </div>
    );
}
