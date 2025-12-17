import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Camera, Trash, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Slider } from '../ui/slider';
import getCroppedImg from '../../lib/cropImage'; // We need to create this helper

export default function PegawaiPhotoUpload({ pegawai, onSuccess }) {
    const fileInputRef = useRef(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // Validation
            if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran file maksimal 5MB");
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error("Format harus JPG/PNG/WEBP");

            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            
            const formData = new FormData();
            formData.append('file', croppedImageBlob, 'profile.jpg');

            const t = toast.loading("Mengupload foto...");
            await api.post(`/api/pegawai/${pegawai._id}/upload-foto`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Foto profil berhasil diupdate", { id: t });
            
            setIsCropping(false);
            setImageSrc(null);
            onSuccess();
        } catch (e) {
            console.error(e);
            toast.error("Gagal memproses gambar");
        }
    };

    const handleCancel = () => {
        setIsCropping(false);
        setImageSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
        <>
            <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded border border-slate-200">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                            <Camera size={40} className="text-slate-300" />
                        )}
                    </div>
                    
                    {photoUrl && (
                        <button 
                            onClick={handleDelete}
                            className="absolute bottom-1 right-1 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-md transition-transform hover:scale-110"
                            title="Hapus Foto"
                            type="button"
                        >
                            <Trash size={14} />
                        </button>
                    )}
                </div>

                <div className="text-center w-full">
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
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {photoUrl ? "Ganti Foto" : "Upload Foto"}
                    </Button>
                    <p className="text-[10px] text-slate-400 mt-2">Format JPG/PNG, Maks. 5MB</p>
                </div>
            </div>

            <Dialog open={isCropping} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sesuaikan Foto Profil</DialogTitle>
                    </DialogHeader>
                    
                    <div className="relative h-[300px] w-full bg-slate-900 rounded-md overflow-hidden">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            showGrid={false}
                            cropShape="round"
                        />
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <ZoomOut size={16} className="text-slate-500"/>
                        <Slider 
                            value={[zoom]} 
                            min={1} 
                            max={3} 
                            step={0.1} 
                            onValueChange={(val) => setZoom(val[0])}
                            className="flex-1"
                        />
                        <ZoomIn size={16} className="text-slate-500"/>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={handleCancel}>
                            <X size={16} className="mr-2"/> Batal
                        </Button>
                        <Button onClick={handleUpload} className="bg-slate-900 text-white">
                            <Check size={16} className="mr-2"/> Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
