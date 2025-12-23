import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Eraser, Save, PenTool, Upload, Check, Trash2, Plus, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0066FF' },
  { name: 'Navy', value: '#1E3A5F' },
  { name: 'Green', value: '#4A7C4E' },
  { name: 'Red', value: '#8B2323' },
];

const STYLE_PRESETS = {
  Default: { strokeWidth: 3, smoothing: 0.5, thinning: 0.5, streamline: 0.5, angle: 0 },
  Elegant: { strokeWidth: 2, smoothing: 0.7, thinning: 0.6, streamline: 0.7, angle: 0 },
  Bold: { strokeWidth: 5, smoothing: 0.3, thinning: 0.2, streamline: 0.4, angle: 0 },
  Quick: { strokeWidth: 2.5, smoothing: 0.2, thinning: 0.4, streamline: 0.3, angle: 0 },
};

export default function AdvancedSignaturePad({ 
  pegawaiId, 
  existingSignatures = [], 
  existingInitials = [],
  onSuccess,
  type = 'signature'
}) {
  const canvasRef = useRef(null);
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
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [smoothing, setSmoothing] = useState(0.5);
  const [thinning, setThinning] = useState(0.5);
  const [streamline, setStreamline] = useState(0.5);
  const [angle, setAngle] = useState(0);
  
  // Drawing state
  const pointsRef = useRef([]);
  const lastPointRef = useRef(null);
  const velocityRef = useRef(0);
  
  // Saved items management
  const [savedItems, setSavedItems] = useState(type === 'signature' ? existingSignatures : existingInitials);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  const maxSlots = 3;
  const itemLabel = type === 'signature' ? 'Tanda Tangan' : 'Paraf';

  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Set actual size in memory
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Apply rotation if angle is set
    if (angle !== 0) {
      ctx.translate(rect.width / 2, rect.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.translate(-rect.width / 2, -rect.height / 2);
    }
    
    // Set default styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    
    // Clear any existing content
    ctx.fillStyle = 'white';
    ctx.fillRect(-1000, -1000, canvas.width + 2000, canvas.height + 2000);
  }, [color, angle]);

  useEffect(() => {
    if (mode === 'draw' && isModalOpen) {
      const timer = setTimeout(initCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, isModalOpen, initCanvas]);

  useEffect(() => {
    const preset = STYLE_PRESETS[stylePreset];
    if (preset) {
      setStrokeWidth(preset.strokeWidth);
      setSmoothing(preset.smoothing);
      setThinning(preset.thinning);
      setStreamline(preset.streamline);
      setAngle(preset.angle);
    }
  }, [stylePreset]);

  // Re-init canvas when angle changes
  useEffect(() => {
    if (mode === 'draw' && isModalOpen && !hasDrawn) {
      initCanvas();
    }
  }, [angle, mode, isModalOpen, hasDrawn, initCanvas]);

  const getPointerPosition = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) return null;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      time: Date.now(),
      pressure: e.pressure ?? 0.5
    };
  };

  const calculateVelocity = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dt = Math.max(p2.time - p1.time, 1);
    return Math.sqrt(dx * dx + dy * dy) / dt;
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  const getStrokeWidth = (velocity) => {
    // Base width from slider
    const baseWidth = strokeWidth;
    
    // Normalize velocity (typical values 0-2)
    const normalizedVelocity = Math.min(velocity * 2, 1);
    
    // Thinning effect: faster = thinner
    const thinningFactor = 1 - (normalizedVelocity * thinning);
    
    // Calculate final width
    const width = baseWidth * Math.max(thinningFactor, 0.3);
    
    return Math.max(width, 0.5);
  };

  const drawSmoothLine = (ctx, points) => {
    if (points.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (points.length === 2) {
      // Just two points, draw a simple line
      const [p1, p2] = points;
      ctx.beginPath();
      ctx.lineWidth = getStrokeWidth(calculateVelocity(p1, p2));
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      return;
    }
    
    // For multiple points, use quadratic curves for smoothing
    const last = points.length - 1;
    
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      
      // Calculate velocity for this segment
      const velocity = calculateVelocity(p0, p1);
      const width = getStrokeWidth(velocity);
      
      // Smooth the velocity changes
      velocityRef.current = lerp(velocityRef.current, velocity, 1 - streamline);
      
      ctx.beginPath();
      ctx.lineWidth = width;
      
      if (i === 1) {
        // First segment
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      } else {
        // Use smoothing for middle segments
        const p_prev = points[i - 2];
        
        // Calculate control point based on smoothing
        const smoothFactor = smoothing;
        const cpX = p0.x + (p1.x - p_prev.x) * smoothFactor * 0.25;
        const cpY = p0.y + (p1.y - p_prev.y) * smoothFactor * 0.25;
        
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cpX, cpY, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        ctx.lineTo(p1.x, p1.y);
      }
      
      ctx.stroke();
    }
  };

  const startDrawing = (e) => {
    e.preventDefault();
    
    const point = getPointerPosition(e);
    if (!point) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    setHasDrawn(true);
    
    pointsRef.current = [point];
    lastPointRef.current = point;
    velocityRef.current = 0;
    
    // Draw initial dot
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const point = getPointerPosition(e);
    if (!point) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const lastPoint = lastPointRef.current;
    
    // Calculate distance from last point
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Streamline: skip points that are too close
    const minDistance = 1 + (1 - streamline) * 3;
    if (distance < minDistance) return;
    
    // Add point
    pointsRef.current.push(point);
    
    // Keep only recent points for smoothing (based on smoothing value)
    const maxPoints = Math.floor(3 + smoothing * 5);
    if (pointsRef.current.length > maxPoints) {
      pointsRef.current = pointsRef.current.slice(-maxPoints);
    }
    
    // Draw the smooth line
    drawSmoothLine(ctx, pointsRef.current);
    
    lastPointRef.current = point;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Draw final segment if needed
    if (pointsRef.current.length >= 2) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const points = pointsRef.current;
        const lastTwo = points.slice(-2);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = getStrokeWidth(0.1); // Thin end
        ctx.beginPath();
        ctx.moveTo(lastTwo[0].x, lastTwo[0].y);
        ctx.lineTo(lastTwo[1].x, lastTwo[1].y);
        ctx.stroke();
      }
    }
    
    pointsRef.current = [];
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    setHasDrawn(false);
    pointsRef.current = [];
    lastPointRef.current = null;
    velocityRef.current = 0;
    
    // Re-init
    initCanvas();
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
        
        // Create a new canvas without the white background for PNG transparency
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Copy the drawing (without white background)
        exportCtx.drawImage(canvas, 0, 0);
        
        const dataUrl = exportCanvas.toDataURL('image/png');
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
                          color === c.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
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
                      className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
                    >
                      {showAdvanced ? 'hide' : 'advanced'}
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Stroke Width</span>
                        <Slider
                          value={[strokeWidth]}
                          onValueChange={([v]) => setStrokeWidth(v)}
                          min={0.5}
                          max={8}
                          step={0.5}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-16 text-right">{strokeWidth}px</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Smoothing</span>
                        <Slider
                          value={[smoothing * 100]}
                          onValueChange={([v]) => setSmoothing(v / 100)}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-16 text-right">{Math.round(smoothing * 100)}%</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Thinning</span>
                        <Slider
                          value={[thinning * 100]}
                          onValueChange={([v]) => setThinning(v / 100)}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-16 text-right">{Math.round(thinning * 100)}%</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Streamline</span>
                        <Slider
                          value={[streamline * 100]}
                          onValueChange={([v]) => setStreamline(v / 100)}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-16 text-right">{Math.round(streamline * 100)}%</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 w-28">Angle</span>
                        <Slider
                          value={[angle]}
                          onValueChange={([v]) => setAngle(v)}
                          min={-30}
                          max={30}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm text-slate-500 w-16 text-right">{angle}°</span>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="text-xs text-slate-500 bg-white/50 p-2 rounded">
                      <strong>Tips:</strong> Thinning mengatur variasi tebal-tipis berdasarkan kecepatan. 
                      Smoothing menghaluskan garis. Streamline mengurangi getaran.
                    </div>
                  </div>
                )}
                
                {/* Canvas Area */}
                <div 
                  className="border-2 border-slate-300 rounded-xl bg-white touch-none mx-auto w-full overflow-hidden"
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    transition: 'transform 0.3s ease'
                  }}
                >
                  <div style={{ width: '100%', height: type === 'initial' ? '150px' : '200px' }}>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full cursor-crosshair"
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
                </div>
                
                {/* Canvas Info */}
                <div className="text-center text-xs text-slate-400">
                  Area {itemLabel} Digital - Gambar dengan mouse atau layar sentuh
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
                  <p className="text-xs text-slate-500 mt-1">Format PNG dengan background transparan direkomendasikan</p>
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
