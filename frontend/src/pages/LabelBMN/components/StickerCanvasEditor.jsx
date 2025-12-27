
import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Type, Image as ImageIcon, QrCode, Square, Move, Trash2, 
  Copy, Layers, ZoomIn, ZoomOut, Save, RotateCcw,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline
} from 'lucide-react';
import { toast } from 'sonner';
import { StyledQRCode } from './CustomSticker'; // Reuse QR component

const PIXEL_SCALE = 3.78; // 1mm = 3.78px approx (at 96 DPI)

const DEFAULT_ELEMENTS = [
  { id: 'qr_1', type: 'qr', x: 2, y: 2, width: 20, height: 20, content: '{kode_barang}', style: {} },
  { id: 'text_1', type: 'text', x: 25, y: 5, width: 40, height: 8, content: '{nama_barang}', style: { fontSize: 8, fontWeight: 'bold' } },
  { id: 'text_2', type: 'text', x: 25, y: 15, width: 40, height: 6, content: '{kode_barang}', style: { fontSize: 7 } }
];

export default function StickerCanvasEditor({ design, onSave, onBack }) {
  // Canvas State
  const [canvasSize, setCanvasSize] = useState({ width: design?.width || 69.8, height: design?.height || 22.1 });
  const [elements, setElements] = useState(design?.elements || DEFAULT_ELEMENTS);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(2); // 200% zoom default for better visibility
  const [showGrid, setShowGrid] = useState(true);
  
  // Selection
  const selectedElement = elements.find(el => el.id === selectedId);

  // ==================== HANDLERS ====================

  const addElement = (type) => {
    const newId = `${type}_${Date.now()}`;
    const newElement = {
      id: newId,
      type,
      x: 5,
      y: 5,
      width: type === 'qr' ? 20 : 30,
      height: type === 'qr' ? 20 : 8,
      content: type === 'text' ? 'Text Baru' : type === 'qr' ? '{kode_barang}' : '',
      style: { fontSize: 8, color: '#000000' }
    };
    setElements([...elements, newElement]);
    setSelectedId(newId);
  };

  const updateElement = (id, changes) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...changes } : el));
  };

  const updateStyle = (id, styleChanges) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, style: { ...el.style, ...styleChanges } } : el
    ));
  };

  const deleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const duplicateElement = (element) => {
    const newId = `${element.type}_${Date.now()}`;
    const newElement = {
      ...element,
      id: newId,
      x: element.x + 2,
      y: element.y + 2
    };
    setElements([...elements, newElement]);
    setSelectedId(newId);
  };

  // ==================== RENDERERS ====================

  const renderElementContent = (element) => {
    switch (element.type) {
      case 'text':
        return (
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.style?.textAlign === 'center' ? 'center' : element.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
              fontSize: `${element.style?.fontSize || 8}pt`,
              fontWeight: element.style?.fontWeight,
              fontStyle: element.style?.fontStyle,
              textDecoration: element.style?.textDecoration,
              color: element.style?.color || '#000',
              fontFamily: element.style?.fontFamily || 'Arial',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              cursor: 'move'
            }}
          >
            {element.content}
          </div>
        );
      case 'qr':
        return (
          <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <StyledQRCode 
              data={element.content} 
              size={100} // Render size (scaled by CSS)
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        );
      case 'image':
        return (
          <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888' }}>
            {element.content ? <img src={element.content} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-6 h-6 opacity-20" />}
          </div>
        );
      case 'shape':
        return (
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              background: element.style?.backgroundColor || 'transparent',
              border: `${element.style?.borderWidth || 1}px ${element.style?.borderStyle || 'solid'} ${element.style?.borderColor || '#000'}`,
              borderRadius: `${element.style?.borderRadius || 0}px`
            }} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* TOOLBAR */}
      <Card className="w-16 flex-shrink-0 flex flex-col items-center py-4 gap-4 bg-slate-50 border-r">
        <Button variant="ghost" size="icon" title="Teks" onClick={() => addElement('text')}><Type className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" title="QR Code" onClick={() => addElement('qr')}><QrCode className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" title="Gambar" onClick={() => addElement('image')}><ImageIcon className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" title="Kotak" onClick={() => addElement('shape')}><Square className="w-5 h-5" /></Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" title="Zoom In" onClick={() => setZoom(z => Math.min(z + 0.5, 5))}><ZoomIn className="w-5 h-5" /></Button>
        <span className="text-xs font-mono">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" title="Zoom Out" onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}><ZoomOut className="w-5 h-5" /></Button>
      </Card>

      {/* CANVAS AREA */}
      <div className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center p-8 relative">
        <div 
          className="bg-white shadow-xl relative transition-transform duration-200"
          style={{ 
            width: `${canvasSize.width * PIXEL_SCALE}px`, 
            height: `${canvasSize.height * PIXEL_SCALE}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            backgroundImage: showGrid ? 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)' : 'none',
            backgroundSize: `${10 * PIXEL_SCALE}px ${10 * PIXEL_SCALE}px` // 10mm grid
          }}
          onClick={() => setSelectedId(null)}
        >
          {elements.map(el => (
            <Rnd
              key={el.id}
              size={{ width: el.width * PIXEL_SCALE, height: el.height * PIXEL_SCALE }}
              position={{ x: el.x * PIXEL_SCALE, y: el.y * PIXEL_SCALE }}
              onDragStop={(e, d) => {
                updateElement(el.id, { x: d.x / PIXEL_SCALE, y: d.y / PIXEL_SCALE });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateElement(el.id, {
                  width: parseInt(ref.style.width) / PIXEL_SCALE,
                  height: parseInt(ref.style.height) / PIXEL_SCALE,
                  x: position.x / PIXEL_SCALE,
                  y: position.y / PIXEL_SCALE
                });
              }}
              bounds="parent"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(el.id);
              }}
              className={`group hover:outline hover:outline-1 hover:outline-blue-300 ${selectedId === el.id ? 'outline outline-2 outline-blue-500 z-10' : ''}`}
            >
              {renderElementContent(el)}
            </Rnd>
          ))}
        </div>
      </div>

      {/* PROPERTIES PANEL */}
      <Card className="w-72 flex-shrink-0 border-l bg-white flex flex-col">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Properti
            {selectedElement && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateElement(selectedElement)}><Copy className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteElement(selectedElement.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedElement ? (
            <div className="text-center text-gray-400 py-8">
              <Move className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Pilih elemen untuk mengedit</p>
            </div>
          ) : (
            <>
              {/* Common Properties */}
              <div className="space-y-2">
                <Label className="text-xs">Posisi & Ukuran (mm)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">X</Label>
                    <Input type="number" step="0.1" value={selectedElement.x.toFixed(1)} onChange={e => updateElement(selectedElement.id, { x: parseFloat(e.target.value) })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Y</Label>
                    <Input type="number" step="0.1" value={selectedElement.y.toFixed(1)} onChange={e => updateElement(selectedElement.id, { y: parseFloat(e.target.value) })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">W</Label>
                    <Input type="number" step="0.1" value={selectedElement.width.toFixed(1)} onChange={e => updateElement(selectedElement.id, { width: parseFloat(e.target.value) })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">H</Label>
                    <Input type="number" step="0.1" value={selectedElement.height.toFixed(1)} onChange={e => updateElement(selectedElement.id, { height: parseFloat(e.target.value) })} className="h-7 text-xs" />
                  </div>
                </div>
              </div>

              {/* Text Properties */}
              {selectedElement.type === 'text' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Konten Teks</Label>
                    <Input value={selectedElement.content} onChange={e => updateElement(selectedElement.id, { content: e.target.value })} className="h-8 text-xs" />
                    <div className="flex gap-1 flex-wrap">
                      {['{nama_barang}', '{kode_barang}', '{nup}', '{tahun}', '{merk}'].map(tag => (
                        <Badge key={tag} variant="outline" className="cursor-pointer text-[10px] px-1" onClick={() => updateElement(selectedElement.id, { content: selectedElement.content + tag })}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Gaya Teks</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-gray-500">Size (pt)</Label>
                        <Input type="number" value={selectedElement.style?.fontSize || 8} onChange={e => updateStyle(selectedElement.id, { fontSize: parseFloat(e.target.value) })} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500">Color</Label>
                        <Input type="color" value={selectedElement.style?.color || '#000000'} onChange={e => updateStyle(selectedElement.id, { color: e.target.value })} className="h-7 w-full p-0" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant={selectedElement.style?.fontWeight === 'bold' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateStyle(selectedElement.id, { fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold className="w-3 h-3" /></Button>
                      <Button variant={selectedElement.style?.fontStyle === 'italic' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateStyle(selectedElement.id, { fontStyle: selectedElement.style?.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic className="w-3 h-3" /></Button>
                      <Button variant={selectedElement.style?.textDecoration === 'underline' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateStyle(selectedElement.id, { textDecoration: selectedElement.style?.textDecoration === 'underline' ? 'none' : 'underline' })}><Underline className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex gap-1">
                      {['left', 'center', 'right'].map(align => (
                        <Button 
                          key={align} 
                          variant={selectedElement.style?.textAlign === align ? 'default' : 'outline'} 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateStyle(selectedElement.id, { textAlign: align })}
                        >
                          {align === 'left' ? <AlignLeft className="w-3 h-3" /> : align === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {/* QR Properties */}
              {selectedElement.type === 'qr' && (
                <div className="space-y-2">
                  <Label className="text-xs">Data QR</Label>
                  <Select value={selectedElement.content} onValueChange={v => updateElement(selectedElement.id, { content: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="{kode_barang}">Kode Barang</SelectItem>
                      <SelectItem value="{kode_register}">Kode Register</SelectItem>
                      <SelectItem value="{nup}">NUP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </CardContent>
        <div className="p-4 border-t">
          <Button className="w-full" onClick={() => onSave({ ...design, elements, width: canvasSize.width, height: canvasSize.height })}>
            <Save className="w-4 h-4 mr-2" />
            Simpan Design
          </Button>
        </div>
      </Card>
    </div>
  );
}
