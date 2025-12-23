import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { 
  Eraser, Save, PenTool, Upload, Trash2, Plus, X, Pencil, 
  Maximize2, Minimize2, Move, ZoomIn, ZoomOut, Check, AlertTriangle, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { getStroke } from 'perfect-freehand';

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0066FF' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Green', value: '#4A7C4E' },
  { name: 'Red', value: '#8B2323' },
];

const STYLE_PRESETS = {
  Default: { size: 5, smoothing: 0.5, thinning: 0.3, streamline: 0.55 },
  Elegant: { size: 3, smoothing: 0.7, thinning: 0.5, streamline: 0.7 },
  Bold: { size: 8, smoothing: 0.4, thinning: 0.1, streamline: 0.5 },
  Quick: { size: 4, smoothing: 0.3, thinning: 0.4, streamline: 0.3 },
};

// Convert perfect-freehand stroke points to SVG path
function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

// Process uploaded image - convert to B&W and remove background
async function processUploadedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Process pixels - convert to B&W and remove white background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate grayscale value
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Threshold for background removal (adjust as needed)
          // If pixel is very light (close to white), make it transparent
          if (gray > 220) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          } else {
            // Convert to black (or dark color) for signature
            const blackValue = gray < 128 ? 0 : Math.max(0, gray - 50);
            data[i] = blackValue;
            data[i + 1] = blackValue;
            data[i + 2] = blackValue;
            data[i + 3] = 255;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        canvas.toBlob((blob) => {
          resolve({
            blob,
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height
          });
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdvancedSignaturePad({ 
  pegawaiId, 
  existingSignatures = [], 
  existingInitials = [],
  onSuccess,
  type = 'signature'
}) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [allStrokes, setAllStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState('draw');
  const [uploadFile, setUploadFile] = useState(null);
  const [processedUpload, setProcessedUpload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Canvas size modes
  const [expandedCanvas, setExpandedCanvas] = useState(false);
  
  // Transform mode (after drawing)
  const [transformMode, setTransformMode] = useState(false);
  const [signatureTransform, setSignatureTransform] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Advanced settings
  const [color, setColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [stylePreset, setStylePreset] = useState('Default');
  const [size, setSize] = useState(5);
  const [smoothing, setSmoothing] = useState(0.5);
  const [thinning, setThinning] = useState(0.3);
  const [streamline, setStreamline] = useState(0.55);
  const [angle, setAngle] = useState(0);
  
  // Saved items management
  const [savedItems, setSavedItems] = useState(type === 'signature' ? existingSignatures : existingInitials);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  const maxSlots = 3;
  const itemLabel = type === 'signature' ? 'Tanda Tangan' : 'Paraf';
  
  // Canvas dimensions based on expanded state
  const canvasHeight = expandedCanvas 
    ? (type === 'initial' ? 250 : 350) 
    : (type === 'initial' ? 150 : 200);

  // Get stroke options for perfect-freehand
  const getStrokeOptions = useCallback(() => ({
    size,
    thinning,
    smoothing,
    streamline,
    easing: (t) => t,
    start: { taper: 0, cap: true },
    end: { taper: size * 0.5, cap: true },
    simulatePressure: true,
  }), [size, thinning, smoothing, streamline]);

  // Transform point with angle rotation and scale/offset - ALWAYS apply transform
  const transformPoint = useCallback((point, centerX, centerY) => {
    let x = point[0];
    let y = point[1];
    
    // Always apply scale and offset (not just in transform mode)
    x = (x - centerX) * signatureTransform.scale + centerX + signatureTransform.offsetX;
    y = (y - centerY) * signatureTransform.scale + centerY + signatureTransform.offsetY;
    
    // Apply angle rotation
    if (angle !== 0) {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = x - centerX;
      const ry = y - centerY;
      x = rx * cos - ry * sin + centerX;
      y = rx * sin + ry * cos + centerY;
    }
    
    return [x, y, point[2] || 0.5];
  }, [angle, signatureTransform]);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const currentOptions = getStrokeOptions();
    
    // Draw all completed strokes
    allStrokes.forEach(stroke => {
      const transformedPoints = stroke.points.map(p => transformPoint(p, centerX, centerY));
      const outlinePoints = getStroke(transformedPoints, currentOptions);
      const pathData = getSvgPathFromStroke(outlinePoints);
      const path = new Path2D(pathData);
      ctx.fillStyle = stroke.color;
      ctx.fill(path);
    });
    
    // Draw current stroke (while drawing)
    if (points.length > 0 && !transformMode) {
      const transformedPoints = points.map(p => transformPoint(p, centerX, centerY));
      const outlinePoints = getStroke(transformedPoints, currentOptions);
      const pathData = getSvgPathFromStroke(outlinePoints);
      const path = new Path2D(pathData);
      ctx.fillStyle = color;
      ctx.fill(path);
    }
    
    // Draw transform boundary box in transform mode
    if (transformMode && allStrokes.length > 0) {
      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      allStrokes.forEach(stroke => {
        stroke.points.forEach(p => {
          const tp = transformPoint(p, centerX, centerY);
          minX = Math.min(minX, tp[0]);
          minY = Math.min(minY, tp[1]);
          maxX = Math.max(maxX, tp[0]);
          maxY = Math.max(maxY, tp[1]);
        });
      });
      
      // Add padding
      const padding = 10;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      
      // Draw selection box
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
      
      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#0066FF';
      [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
      });
      
      // Draw move icon in center
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 102, 255, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#0066FF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [allStrokes, points, color, transformPoint, getStrokeOptions, transformMode]);

  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (mode === 'draw' && isModalOpen) {
      const timer = setTimeout(initCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, isModalOpen, initCanvas, expandedCanvas]);

  useEffect(() => {
    const preset = STYLE_PRESETS[stylePreset];
    if (preset) {
      setSize(preset.size);
      setSmoothing(preset.smoothing);
      setThinning(preset.thinning);
      setStreamline(preset.streamline);
    }
  }, [stylePreset]);

  // Redraw when settings change
  useEffect(() => {
    if (isModalOpen && mode === 'draw') {
      redrawCanvas();
    }
  }, [angle, isModalOpen, mode, redrawCanvas, signatureTransform, transformMode]);

  useEffect(() => {
    if (isModalOpen && mode === 'draw' && allStrokes.length > 0) {
      redrawCanvas();
    }
  }, [size, smoothing, thinning, streamline, isModalOpen, mode, allStrokes.length, redrawCanvas]);

  const getPointerPosition = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY, pressure;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      pressure = e.touches[0].force || 0.5;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
      pressure = e.pressure || 0.5;
    }
    
    if (clientX === undefined || clientY === undefined) return null;
    return [clientX - rect.left, clientY - rect.top, pressure];
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const point = getPointerPosition(e);
    if (!point) return;
    
    if (transformMode) {
      // Start dragging to move signature
      setIsDragging(true);
      setDragStart({ x: point[0], y: point[1] });
    } else {
      // Start drawing
      setIsDrawing(true);
      setHasDrawn(true);
      setPoints([point]);
    }
  };

  const handlePointerMove = (e) => {
    const point = getPointerPosition(e);
    if (!point) return;
    
    if (transformMode && isDragging) {
      e.preventDefault();
      const dx = point[0] - dragStart.x;
      const dy = point[1] - dragStart.y;
      setSignatureTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy
      }));
      setDragStart({ x: point[0], y: point[1] });
    } else if (isDrawing && !transformMode) {
      e.preventDefault();
      setPoints(prev => [...prev, point]);
      redrawCanvas();
    }
  };

  const handlePointerUp = () => {
    if (transformMode) {
      setIsDragging(false);
    } else if (isDrawing) {
      if (points.length > 0) {
        setAllStrokes(prev => [...prev, { points: [...points], color }]);
      }
      setIsDrawing(false);
      setPoints([]);
    }
  };

  useEffect(() => {
    if (isDrawing && points.length > 0) {
      redrawCanvas();
    }
  }, [points, isDrawing, redrawCanvas]);

  const clearCanvas = () => {
    setPoints([]);
    setAllStrokes([]);
    setHasDrawn(false);
    setTransformMode(false);
    setSignatureTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleScaleChange = (delta) => {
    setSignatureTransform(prev => ({
      ...prev,
      scale: Math.max(0.3, Math.min(2, prev.scale + delta))
    }));
  };

  const resetTransform = () => {
    setSignatureTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  // Handle file upload with processing
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadFile(file);
    
    try {
      toast.info('Memproses gambar...');
      const processed = await processUploadedImage(file);
      setProcessedUpload(processed);
      toast.success('Gambar berhasil diproses');
    } catch (err) {
      toast.error('Gagal memproses gambar');
      console.error(err);
    }
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
        if (!hasDrawn || allStrokes.length === 0) {
          toast.error(`Silakan ${type === 'signature' ? 'tanda tangan' : 'paraf'} terlebih dahulu`);
          setLoading(false);
          return;
        }
        
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        formData.append('file', blob, `${type}_${Date.now()}.png`);
      } else {
        if (!processedUpload) {
          toast.error(`Pilih dan proses file ${itemLabel.toLowerCase()} terlebih dahulu`);
          setLoading(false);
          return;
        }
        formData.append('file', processedUpload.blob, `${type}_${Date.now()}.png`);
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
      setProcessedUpload(null);
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
        <DialogContent className="max-w-2xl transition-all duration-300" style={{ maxWidth: expandedCanvas ? '56rem' : '42rem' }}>
          <DialogHeader>
            <DialogTitle>Buat {itemLabel} Digital Baru</DialogTitle>
            <DialogDescription>
              Gambar {itemLabel.toLowerCase()} dengan mouse atau stylus
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 justify-center">
              <Button 
                size="sm" 
                variant={mode === 'draw' ? 'default' : 'outline'} 
                onClick={() => { setMode('draw'); setProcessedUpload(null); setUploadFile(null); }}
                className={mode === 'draw' ? 'bg-slate-800' : ''}
              >
                <PenTool size={16} className="mr-2"/> Gambar Langsung
              </Button>
              <Button 
                size="sm" 
                variant={mode === 'upload' ? 'default' : 'outline'} 
                onClick={() => { setMode('upload'); clearCanvas(); }}
                className={mode === 'upload' ? 'bg-slate-800' : ''}
              >
                <Upload size={16} className="mr-2"/> Upload File
              </Button>
            </div>
            
            {mode === 'draw' ? (
              <>
                {/* Color & Tools Row */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Color</span>
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          color === c.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => { setCustomColor(e.target.value); setColor(e.target.value); }}
                        className="absolute opacity-0 w-6 h-6 cursor-pointer"
                      />
                      <div 
                        className={`w-6 h-6 rounded-full border-2 border-slate-300 cursor-pointer ${
                          !COLORS.find(c => c.value === color) ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                        }`}
                        style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedCanvas(!expandedCanvas)}
                      className="p-2 hover:bg-slate-200 rounded transition-colors"
                      title={expandedCanvas ? 'Perkecil Canvas' : 'Perbesar Canvas'}
                    >
                      {expandedCanvas ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {showAdvanced ? 'hide' : 'advanced'}
                    </button>
                  </div>
                </div>
                
                {/* Advanced Settings Panel */}
                {showAdvanced && (
                  <div className="bg-gradient-to-br from-slate-50 to-teal-50 p-4 rounded-xl border border-teal-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Styles</span>
                      <div className="flex gap-2">
                        {Object.keys(STYLE_PRESETS).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setStylePreset(preset)}
                            className={`px-3 py-1 text-sm rounded-full border transition-all ${
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-24">Stroke Width</span>
                        <Slider value={[size]} onValueChange={([v]) => setSize(v)} min={1} max={16} step={1} className="flex-1" />
                        <span className="text-sm text-slate-500 w-10">{size}px</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-24">Smoothing</span>
                        <Slider value={[smoothing * 100]} onValueChange={([v]) => setSmoothing(v / 100)} min={0} max={100} step={5} className="flex-1" />
                        <span className="text-sm text-slate-500 w-10">{smoothing.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-24">Thinning</span>
                        <Slider value={[thinning * 100]} onValueChange={([v]) => setThinning(v / 100)} min={-100} max={100} step={5} className="flex-1" />
                        <span className="text-sm text-slate-500 w-10">{thinning.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-24">Streamline</span>
                        <Slider value={[streamline * 100]} onValueChange={([v]) => setStreamline(v / 100)} min={0} max={100} step={5} className="flex-1" />
                        <span className="text-sm text-slate-500 w-10">{streamline.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Canvas Area */}
                <div className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden">
                  <div style={{ width: '100%', height: `${canvasHeight}px`, touchAction: 'none' }}>
                    <canvas
                      ref={canvasRef}
                      className={`w-full h-full ${transformMode ? 'cursor-move' : 'cursor-crosshair'}`}
                      style={{ touchAction: 'none' }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                    />
                  </div>
                </div>
                
                {/* Transform Controls */}
                {allStrokes.length > 0 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant={transformMode ? "default" : "outline"}
                      onClick={() => setTransformMode(!transformMode)}
                      className={transformMode ? "bg-blue-600" : ""}
                    >
                      <Move size={16} className="mr-1" />
                      {transformMode ? 'Mode Edit Aktif' : 'Atur Posisi & Ukuran'}
                    </Button>
                    
                    {transformMode && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleScaleChange(0.1)}>
                          <ZoomIn size={16} className="mr-1" /> Perbesar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleScaleChange(-0.1)}>
                          <ZoomOut size={16} className="mr-1" /> Perkecil
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetTransform}>
                          <RotateCcw size={16} className="mr-1" /> Reset
                        </Button>
                        <span className="text-xs text-slate-500 ml-2">
                          Skala: {Math.round(signatureTransform.scale * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Canvas Info & Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {allStrokes.length > 0 ? `${allStrokes.length} garis` : `Area ${itemLabel} Digital`}
                    {transformMode && ' • Drag untuk pindahkan'}
                  </span>
                  <Button size="sm" variant="outline" onClick={clearCanvas} className="text-red-500 border-red-200 hover:bg-red-50">
                    <Eraser size={16} className="mr-1"/> Hapus & Ulang
                  </Button>
                </div>
              </>
            ) : (
              /* Upload Mode */
              <div className="space-y-4">
                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Tips untuk hasil terbaik:</p>
                    <ul className="text-amber-700 mt-1 space-y-0.5 text-xs">
                      <li>• Gunakan <strong>kertas putih polos</strong> tanpa garis</li>
                      <li>• Tanda tangani dengan <strong>pena hitam/biru gelap</strong></li>
                      <li>• Foto dalam <strong>pencahayaan merata</strong>, hindari bayangan</li>
                      <li>• Background akan <strong>otomatis dihapus</strong> dan dikonversi hitam-putih</li>
                    </ul>
                  </div>
                </div>
                
                {/* Upload Area */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-6 text-center">
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg,image/jpg" 
                    className="hidden" 
                    id={`sig-upload-${type}`}
                    onChange={handleFileUpload}
                  />
                  <label htmlFor={`sig-upload-${type}`} className="cursor-pointer block">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-3 inline-block">
                      <Upload size={24} className="text-blue-600"/>
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {uploadFile ? uploadFile.name : `Klik untuk upload ${itemLabel.toLowerCase()}`}
                    </p>
                  </label>
                </div>
                
                {/* Processed Preview */}
                {processedUpload && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Hasil Proses (Background Dihapus):</p>
                    <div className="border rounded-lg p-4 bg-[repeating-conic-gradient(#e5e5e5_0%_25%,white_0%_50%)_50%/16px_16px] flex justify-center">
                      <img 
                        src={processedUpload.dataUrl} 
                        alt="Processed signature" 
                        className="max-h-32 object-contain"
                      />
                    </div>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check size={14} /> Background berhasil dihapus dan dikonversi ke hitam-putih
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || transformMode || (mode === 'draw' && allStrokes.length === 0) || (mode === 'upload' && !processedUpload)} 
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              title={transformMode ? "Matikan mode edit terlebih dahulu" : ""}
            >
              <Save size={16} className="mr-2" />
              {loading ? "Menyimpan..." : transformMode ? "Selesaikan Edit Dulu" : `Simpan ${itemLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus {itemLabel}?
            </DialogTitle>
            <DialogDescription>
              {itemLabel} #{deleteIndex !== null ? deleteIndex + 1 : ''} akan dihapus permanen.
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
