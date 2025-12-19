import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Eraser, Save, PenTool, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';

export default function SignaturePad({ pegawaiId, existingSignature, onSuccess }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [mode, setMode] = useState('draw'); // 'draw' or 'upload'
    const [uploadFile, setUploadFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (mode === 'draw') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'black';
                
                // Handle high DPI
                const ratio = window.devicePixelRatio || 1;
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                ctx.scale(ratio, ratio);
            }
        }
    }, [mode]);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            
            if (mode === 'draw') {
                if (!hasDrawn) return toast.error("Silakan tanda tangan terlebih dahulu");
                
                const canvas = canvasRef.current;
                const dataUrl = canvas.toDataURL('image/png');
                const blob = await (await fetch(dataUrl)).blob();
                formData.append('file', blob, 'signature.png');
            } else {
                if (!uploadFile) return toast.error("Pilih file tanda tangan");
                formData.append('file', uploadFile);
            }

            await api.post(`/api/pegawai/${pegawaiId}/signature`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success("Tanda tangan digital tersimpan");
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error("Gagal menyimpan tanda tangan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 justify-center">
                <Button 
                    size="sm" 
                    variant={mode === 'draw' ? 'default' : 'outline'} 
                    onClick={() => setMode('draw')}
                    className={mode === 'draw' ? 'bg-slate-900 text-white' : ''}
                >
                    <PenTool size={16} className="mr-2"/> Gambar Langsung
                </Button>
                <Button 
                    size="sm" 
                    variant={mode === 'upload' ? 'default' : 'outline'} 
                    onClick={() => setMode('upload')}
                    className={mode === 'upload' ? 'bg-slate-900 text-white' : ''}
                >
                    <Upload size={16} className="mr-2"/> Upload Scan
                </Button>
            </div>

            {mode === 'draw' ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white touch-none mx-auto w-full max-w-md">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-[200px] cursor-crosshair rounded-xl"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                    <div className="text-center text-xs text-slate-400 py-1 border-t border-slate-100">
                        Area Tanda Tangan Digital
                    </div>
                </div>
            ) : (
                <div className="h-[200px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <input 
                        type="file" 
                        accept="image/png,image/jpeg" 
                        className="hidden" 
                        id="sig-upload"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                    />
                    <label htmlFor="sig-upload" className="cursor-pointer">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                            <Upload size={24} className="text-blue-600"/>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                            {uploadFile ? uploadFile.name : "Klik untuk upload gambar tanda tangan"}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">Gunakan format PNG Transparan agar hasil maksimal</p>
                    </label>
                </div>
            )}

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                {existingSignature ? (
                    <div className="flex items-center gap-2">
                        <img src={existingSignature} alt="Current" className="h-8 bg-white border rounded p-1"/>
                        <span className="text-xs text-green-600 font-medium flex items-center"><Check size={12} className="mr-1"/> Sudah ada</span>
                    </div>
                ) : (
                    <span className="text-xs text-slate-500 italic">Belum ada tanda tangan</span>
                )}

                <div className="flex gap-2">
                    {mode === 'draw' && (
                        <Button size="sm" variant="ghost" onClick={clearCanvas} className="text-red-500">
                            <Eraser size={16}/>
                        </Button>
                    )}
                    <Button size="sm" onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                        {loading ? "Menyimpan..." : "Simpan Tanda Tangan"}
                    </Button>
                </div>
            </div>
        </div>
    );
}