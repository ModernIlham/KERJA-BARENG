import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Eraser, Save, PenTool, Upload, Check, Trash2, Plus, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';

// Stroke smoothing helper using catmull-rom spline
function getStroke(points, options = {}) {
  const {
    size = 5,
    smoothing = 0.5,
    thinning = 0.5,
    streamline = 0.5,
    simulatePressure = true,
  } = options;

  if (points.length < 2) return points;

  const smoothedPoints = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      smoothedPoints.push(points[i]);
    } else {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      const smoothX = curr.x + (next.x - prev.x) * smoothing * 0.1;
      const smoothY = curr.y + (next.y - prev.y) * smoothing * 0.1;
      
      smoothedPoints.push({ x: smoothX, y: smoothY, pressure: curr.pressure || 0.5 });
    }
  }

  return smoothedPoints.map((point, i) => {
    let pressure = point.pressure || 0.5;
    
    if (simulatePressure) {
      // Simulate pressure based on velocity
      if (i > 0) {
        const prev = smoothedPoints[i - 1];
        const dist = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
        const velocity = Math.min(dist / 10, 1);
        pressure = 1 - velocity * thinning;
      }
    }

    return {
      ...point,
      size: size * (0.5 + pressure * 0.5)
    };
  });
}

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0066FF' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Green', value: '#4A7C4E' },
  { name: 'Red', value: '#8B2323' },
];

const STYLE_PRESETS = {
  Default: { strokeWidth: 5, smoothing: 0.4, thinning: 0.3, streamline: 0.55, angle: 0 },
  Elegant: { strokeWidth: 3, smoothing: 0.6, thinning: 0.5, streamline: 0.7, angle: 15 },
  Bold: { strokeWidth: 8, smoothing: 0.3, thinning: 0.1, streamline: 0.4, angle: 0 },
  Quick: { strokeWidth: 4, smoothing: 0.2, thinning: 0.4, streamline: 0.3, angle: 0 },
};

export default function AdvancedSignaturePad({ 
  pegawaiId, 
  existingSignatures = [], 
  existingInitials = [],
  onSuccess,
  type = 'signature' // 'signature' or 'initial'
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState('draw');
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced settings
  const [color, setColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [stylePreset, setStylePreset] = useState('Default');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [smoothing, setSmoothing] = useState(0.4);
  const [thinning, setThinning] = useState(0.3);
  const [streamline, setStreamline] = useState(0.55);
  const [angle, setAngle] = useState(0);
  
  // Points for smooth drawing
  const pointsRef = useRef([]);
  
  // Saved items management
  const [savedItems, setSavedItems] = useState(type === 'signature' ? existingSignatures : existingInitials);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  const maxSlots = 3;
  const itemLabel = type === 'signature' ? 'Tanda Tangan' : 'Paraf';

  useEffect(() => {
    if (mode === 'draw' && isModalOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, isModalOpen, initCanvas]);

  useEffect(() => {
    // Apply preset
    const preset = STYLE_PRESETS[stylePreset];
    if (preset) {
      setStrokeWidth(preset.strokeWidth);
      setSmoothing(preset.smoothing);
      setThinning(preset.thinning);
      setStreamline(preset.streamline);
      setAngle(preset.angle);
    }
  }, [stylePreset]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    contextRef.current = ctx;
    
    // Set canvas size
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(ratio, ratio);
    
    // Reset transform first
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    
    // Apply rotation transform
    if (angle !== 0) {
      ctx.translate(rect.width / 2, rect.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.translate(-rect.width / 2, -rect.height / 2);
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }, [color, angle]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pressure: e.pressure || 0.5
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const point = getCoordinates(e);
    pointsRef.current = [point];
    setIsDrawing(true);
    setHasDrawn(true);
    
    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const point = getCoordinates(e);
    pointsRef.current.push(point);
    
    const ctx = contextRef.current;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    // Apply stroke settings
    const smoothedPoints = getStroke(pointsRef.current, {
      size: strokeWidth,
      smoothing,
      thinning,
      streamline,
      simulatePressure: true
    });
    
    if (smoothedPoints.length > 1) {
      const lastPoint = smoothedPoints[smoothedPoints.length - 1];
      const prevPoint = smoothedPoints[smoothedPoints.length - 2];
      
      ctx.lineWidth = lastPoint.size || strokeWidth;
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      pointsRef.current = [];
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initCanvas();
    setHasDrawn(false);
    pointsRef.current = [];
  };

  const handleSave = async () => {
    if (savedItems.length >= maxSlots) {
      toast.error(`Maksimal ${maxSlots} ${itemLabel.toLowerCase()}`);
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      
      if (mode === 'draw') {
        if (!hasDrawn) {
          toast.error(`Silakan ${type === 'signature' ? 'tanda tangan' : 'paraf'} terlebih dahulu`);
          setLoading(false);
          return;
        }
        
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        formData.append('file', blob, `${type}_${Date.now()}.png`);
      } else {
        if (!uploadFile) {
          toast.error(`Pilih file ${itemLabel.toLowerCase()}`);
          setLoading(false);
          return;
        }
        formData.append('file', uploadFile);
      }
      
      formData.append('type', type);
      formData.append('slot', savedItems.length.toString());

      const response = await api.post(`/api/pegawai/${pegawaiId}/signature-advanced`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newItem = response.data.url;
      setSavedItems([...savedItems, newItem]);
      
      toast.success(`${itemLabel} berhasil disimpan`);
      setIsModalOpen(false);
      clearCanvas();
      setUploadFile(null);
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(`Gagal menyimpan ${itemLabel.toLowerCase()}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteIndex === null) return;
    
    setLoading(true);
    try {
      await api.delete(`/api/pegawai/${pegawaiId}/signature-advanced`, {
        data: { type, slot: deleteIndex }
      });
      
      const newItems = savedItems.filter((_, i) => i !== deleteIndex);
      setSavedItems(newItems);
      toast.success(`${itemLabel} berhasil dihapus`);
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(`Gagal menghapus ${itemLabel.toLowerCase()}`);
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setDeleteIndex(null);
    }
  };

  const confirmDelete = (index) => {
    setDeleteIndex(index);
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{itemLabel} Digital</h3>
          <p className="text-xs text-slate-500">Maksimal {maxSlots} {itemLabel.toLowerCase()}</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => setIsModalOpen(true)}
          disabled={savedItems.length >= maxSlots}
          className="bg-slate-900 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 mr-1" /> Tambah {itemLabel}
        </Button>
      </div>
      
      {/* Saved Items Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((slot) => (
          <div 
            key={slot}
            className={`relative h-24 border-2 rounded-lg overflow-hidden transition-all ${
              savedItems[slot] 
                ? 'border-green-200 bg-white' 
                : 'border-dashed border-slate-200 bg-slate-50'
            }`}
          >
            {savedItems[slot] ? (
              <>
                <img 
                  src={savedItems[slot]} 
                  alt={`${itemLabel} ${slot + 1}`}
                  className="w-full h-full object-contain p-2"
                />
                <button
                  onClick={() => confirmDelete(slot)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  #{slot + 1}
                </span>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Pencil className="h-5 w-5 mb-1" />
                <span className="text-[10px]">Slot {slot + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Draw Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat {itemLabel} Digital Baru</DialogTitle>
            <DialogDescription>
              Buat {itemLabel.toLowerCase()} dengan menggambar langsung atau upload file
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 justify-center">
              <Button 
                size="sm" 
                variant={mode === 'draw' ? 'default' : 'outline'} 
                onClick={() => setMode('draw')}
                className={mode === 'draw' ? 'bg-slate-800' : ''}
              >
                <PenTool size={16} className="mr-2"/> Gambar Langsung
              </Button>
              <Button 
                size="sm" 
                variant={mode === 'upload' ? 'default' : 'outline'} 
                onClick={() => setMode('upload')}
                className={mode === 'upload' ? 'bg-slate-800' : ''}
              >
                <Upload size={16} className="mr-2"/> Upload File
              </Button>
            </div>
            
            {mode === 'draw' ? (
              <>
                {/* Color Picker */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Color</span>
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          color === c.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setColor(e.target.value);
                        }}
                        className="absolute opacity-0 w-7 h-7 cursor-pointer"
                      />
                      <div 
                        className={`w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center cursor-pointer ${
                          !COLORS.find(c => c.value === color) ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                        style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                      >
                        <Pencil className="h-3 w-3 text-white drop-shadow" />
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-blue-600 underline ml-2"
                    >
                      advanced
                    </button>
                  </div>
                </div>
                
                {/* Advanced Settings Panel */}
                {showAdvanced && (
                  <div className="bg-gradient-to-br from-slate-50 to-teal-50 p-4 rounded-xl border border-teal-100 space-y-4">
                    {/* Style Presets */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Styles</span>
                      <div className="flex gap-2">
                        {Object.keys(STYLE_PRESETS).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setStylePreset(preset)}
                            className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                              stylePreset === preset
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Sliders */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Stroke Width</span>
                        <Slider
                          value={[strokeWidth]}
                          onValueChange={([v]) => setStrokeWidth(v)}
                          min={1}
                          max={15}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-12 text-right">{strokeWidth}px</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Smoothing</span>
                        <Slider
                          value={[smoothing * 100]}
                          onValueChange={([v]) => setSmoothing(v / 100)}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-12 text-right">{smoothing.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Thinning</span>
                        <Slider
                          value={[thinning * 100]}
                          onValueChange={([v]) => setThinning(v / 100)}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-12 text-right">{thinning.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Streamline</span>
                        <Slider
                          value={[streamline * 100]}
                          onValueChange={([v]) => setStreamline(v / 100)}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-12 text-right">{streamline.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Angle</span>
                        <Slider
                          value={[angle]}
                          onValueChange={([v]) => {
                            setAngle(v);
                            setTimeout(initCanvas, 50);
                          }}
                          min={-45}
                          max={45}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-12 text-right">{angle}°</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Canvas Area */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white touch-none mx-auto w-full">
                  <div style={{ width: '100%', height: type === 'initial' ? '150px' : '200px' }}>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full cursor-crosshair rounded-t-xl"
                      style={{ touchAction: 'none' }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div className="text-center text-xs text-slate-400 py-1 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                    Area {itemLabel} Digital - Gambar di sini
                  </div>
                </div>
                
                {/* Canvas Actions */}
                <div className="flex justify-center">
                  <Button size="sm" variant="outline" onClick={clearCanvas} className="text-red-500 border-red-200 hover:bg-red-50">
                    <Eraser size={16} className="mr-2"/> Hapus & Ulang
                  </Button>
                </div>
              </>
            ) : (
              /* Upload Mode */
              <div className="h-[200px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <input 
                  type="file" 
                  accept="image/png,image/jpeg" 
                  className="hidden" 
                  id={`sig-upload-${type}`}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                <label htmlFor={`sig-upload-${type}`} className="cursor-pointer">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                    <Upload size={24} className="text-blue-600"/>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {uploadFile ? uploadFile.name : `Klik untuk upload ${itemLabel.toLowerCase()}`}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Gunakan format PNG Transparan agar hasil maksimal</p>
                </label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
              <Save size={16} className="mr-2" />
              {loading ? "Menyimpan..." : `Simpan ${itemLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus {itemLabel}?
            </DialogTitle>
            <DialogDescription>
              {itemLabel} #{deleteIndex !== null ? deleteIndex + 1 : ''} akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
