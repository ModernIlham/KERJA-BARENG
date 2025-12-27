import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Type, Image as ImageIcon, QrCode, Square, Trash2, 
  Copy, ZoomIn, ZoomOut, Save, Grid3X3, Upload,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Table, Plus, Minus, RotateCcw, ChevronDown, ChevronUp,
  Move, Barcode, FileImage, Layers, Settings, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { StyledQRCode } from './CustomSticker';

// ==================== CONSTANTS ====================
const PIXEL_SCALE = 3.78; // 1mm = 3.78px approx (at 96 DPI)

const STICKER_TEMPLATES = [
  { 
    id: 'kecil', 
    name: 'Stiker Kecil (23.8x39.8mm)', 
    width: 23.8, 
    height: 39.8,
    elements: [
      { id: 'qr_1', type: 'qr', x: 1.9, y: 1.9, width: 20, height: 20, content: '#{kode_register}', style: {} },
      { id: 'text_1', type: 'text', x: 1.9, y: 23, width: 20, height: 6, content: '{kode_barang}', style: { fontSize: 5, textAlign: 'center' } },
      { id: 'text_2', type: 'text', x: 1.9, y: 29, width: 20, height: 9, content: '{nama_barang}', style: { fontSize: 4, textAlign: 'center' } }
    ]
  },
  { 
    id: 'sedang', 
    name: 'Stiker Sedang (69.8x22.1mm)', 
    width: 69.8, 
    height: 22.1,
    elements: [
      { id: 'qr_1', type: 'qr', x: 1, y: 1, width: 20, height: 20, content: '#{kode_register}', style: {} },
      { id: 'text_1', type: 'text', x: 23, y: 2, width: 45, height: 6, content: '{nama_barang}', style: { fontSize: 7, fontWeight: 'bold' } },
      { id: 'text_2', type: 'text', x: 23, y: 9, width: 45, height: 5, content: '{kode_barang}', style: { fontSize: 6 } },
      { id: 'text_3', type: 'text', x: 23, y: 15, width: 45, height: 5, content: '{merk} - {tipe}', style: { fontSize: 5, color: '#666666' } }
    ]
  },
  { 
    id: 'besar', 
    name: 'Stiker Besar (94.9x32.2mm)', 
    width: 94.9, 
    height: 32.2,
    elements: [
      { id: 'qr_1', type: 'qr', x: 2, y: 2, width: 28, height: 28, content: '#{kode_register}', style: {} },
      { id: 'text_1', type: 'text', x: 33, y: 3, width: 59, height: 8, content: '{nama_barang}', style: { fontSize: 9, fontWeight: 'bold' } },
      { id: 'text_2', type: 'text', x: 33, y: 12, width: 59, height: 6, content: 'Kode: {kode_barang}', style: { fontSize: 7 } },
      { id: 'text_3', type: 'text', x: 33, y: 19, width: 59, height: 5, content: 'Merk: {merk} | Tipe: {tipe}', style: { fontSize: 6 } },
      { id: 'text_4', type: 'text', x: 33, y: 25, width: 59, height: 5, content: 'NUP: {nup} | Tahun: {tahun}', style: { fontSize: 6, color: '#666666' } }
    ]
  },
  { 
    id: 'blank_a4', 
    name: 'Kanvas Kosong A4', 
    width: 210, 
    height: 297,
    elements: []
  },
  { 
    id: 'blank_custom', 
    name: 'Kanvas Kustom', 
    width: 100, 
    height: 50,
    elements: []
  }
];

const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' }
];

const DATA_TAGS = [
  { tag: '{nama_barang}', label: 'Nama Barang' },
  { tag: '{kode_barang}', label: 'Kode Barang' },
  { tag: '{kode_register}', label: 'Kode Register' },
  { tag: '{nup}', label: 'NUP' },
  { tag: '{tahun}', label: 'Tahun' },
  { tag: '{merk}', label: 'Merk' },
  { tag: '{tipe}', label: 'Tipe' },
  { tag: '{nilai_perolehan}', label: 'Nilai Perolehan' },
  { tag: '{nilai_buku}', label: 'Nilai Buku' }
];

// ==================== MAIN COMPONENT ====================
export default function StickerCanvasEditor({ design, onSave, onBack }) {
  // Canvas State
  const [canvasSize, setCanvasSize] = useState({ 
    width: design?.width || 69.8, 
    height: design?.height || 22.1 
  });
  const [elements, setElements] = useState(design?.elements || STICKER_TEMPLATES[1].elements);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(2);
  const [showGrid, setShowGrid] = useState(true);
  const [activeToolTab, setActiveToolTab] = useState('elements');
  
  // Modal states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableConfig, setTableConfig] = useState({ rows: 2, cols: 2 });
  
  // File upload ref
  const fileInputRef = useRef(null);
  
  // Selection
  const selectedElement = elements.find(el => el.id === selectedId);

  // ==================== HANDLERS ====================
  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);
  
  const addElement = (type, customProps = {}) => {
    const newId = `${type}_${generateId()}`;
    const defaultProps = {
      text: { x: 5, y: 5, width: 30, height: 8, content: 'Teks Baru', style: { fontSize: 8, color: '#000000', fontFamily: 'Arial' } },
      qr: { x: 5, y: 5, width: 20, height: 20, content: '#{kode_register}', style: {} },
      image: { x: 5, y: 5, width: 20, height: 20, content: '', style: {} },
      shape: { x: 5, y: 5, width: 20, height: 10, content: '', style: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'solid', borderColor: '#000000', borderRadius: 0 } },
      table: { x: 5, y: 5, width: 40, height: 20, content: '', style: {}, tableData: customProps.tableData || [[{ content: '', colspan: 1, rowspan: 1 }, { content: '', colspan: 1, rowspan: 1 }], [{ content: '', colspan: 1, rowspan: 1 }, { content: '', colspan: 1, rowspan: 1 }]] },
      barcode: { x: 5, y: 5, width: 40, height: 15, content: '{kode_barang}', style: { format: 'CODE128' } }
    };
    
    const newElement = {
      id: newId,
      type,
      ...defaultProps[type],
      ...customProps
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
    const newId = `${element.type}_${generateId()}`;
    const newElement = { ...element, id: newId, x: element.x + 3, y: element.y + 3 };
    setElements([...elements, newElement]);
    setSelectedId(newId);
  };

  const moveElementLayer = (id, direction) => {
    const idx = elements.findIndex(el => el.id === id);
    if (idx === -1) return;
    
    const newElements = [...elements];
    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    
    if (targetIdx >= 0 && targetIdx < elements.length) {
      [newElements[idx], newElements[targetIdx]] = [newElements[targetIdx], newElements[idx]];
      setElements(newElements);
    }
  };

  const applyTemplate = (template) => {
    setCanvasSize({ width: template.width, height: template.height });
    setElements(template.elements.map(el => ({ ...el, id: `${el.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })));
    setSelectedId(null);
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" diterapkan`);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (selectedElement?.type === 'image') {
        updateElement(selectedElement.id, { content: event.target.result });
      } else {
        addElement('image', { content: event.target.result });
      }
      toast.success('Gambar berhasil diunggah');
    };
    reader.readAsDataURL(file);
  };

  const handleAddTable = () => {
    const tableData = Array(tableConfig.rows).fill(null).map(() => 
      Array(tableConfig.cols).fill(null).map(() => ({ content: '', colspan: 1, rowspan: 1 }))
    );
    addElement('table', { tableData, width: tableConfig.cols * 15, height: tableConfig.rows * 8 });
    setShowTableDialog(false);
  };

  const updateTableCell = (rowIdx, colIdx, changes) => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const newTableData = selectedElement.tableData.map((row, rIdx) => 
      row.map((cell, cIdx) => 
        rIdx === rowIdx && cIdx === colIdx ? { ...cell, ...changes } : cell
      )
    );
    updateElement(selectedElement.id, { tableData: newTableData });
  };

  const addTableRow = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const cols = selectedElement.tableData[0]?.length || 2;
    const newRow = Array(cols).fill(null).map(() => ({ content: '', colspan: 1, rowspan: 1 }));
    updateElement(selectedElement.id, { 
      tableData: [...selectedElement.tableData, newRow],
      height: selectedElement.height + 8
    });
  };

  const addTableColumn = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const newTableData = selectedElement.tableData.map(row => [...row, { content: '', colspan: 1, rowspan: 1 }]);
    updateElement(selectedElement.id, { 
      tableData: newTableData,
      width: selectedElement.width + 15
    });
  };

  const resetCanvas = () => {
    if (confirm('Yakin ingin mengosongkan kanvas?')) {
      setElements([]);
      setSelectedId(null);
    }
  };

  const handleSave = () => {
    const designData = {
      width: canvasSize.width,
      height: canvasSize.height,
      elements: elements
    };
    onSave?.(designData);
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
              cursor: 'move',
              padding: '1px'
            }}
          >
            {element.content}
          </div>
        );
      
      case 'qr':
        return (
          <div style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StyledQRCode 
              data={element.content?.replace('{kode_register}', 'SAMPLE-001-2024').replace('{kode_barang}', '3.06.02.01.001')} 
              size={Math.min(element.width, element.height) * PIXEL_SCALE * 0.95}
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        );
      
      case 'image':
        return (
          <div style={{ width: '100%', height: '100%', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: element.content ? 'none' : '1px dashed #ccc' }}>
            {element.content ? (
              <img src={element.content} className="w-full h-full object-contain" alt="" />
            ) : (
              <div className="text-center text-gray-400">
                <FileImage className="w-6 h-6 mx-auto mb-1 opacity-30" />
                <span className="text-[8px]">Klik untuk upload</span>
              </div>
            )}
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
      
      case 'table':
        return (
          <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '6pt', tableLayout: 'fixed' }}>
            <tbody>
              {element.tableData?.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td 
                      key={cIdx}
                      colSpan={cell.colspan || 1}
                      rowSpan={cell.rowspan || 1}
                      style={{ 
                        border: '0.5px solid #333', 
                        padding: '1px 2px',
                        textAlign: cell.textAlign || 'left',
                        verticalAlign: 'middle',
                        overflow: 'hidden'
                      }}
                    >
                      {cell.content || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      
      case 'barcode':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <div className="text-center">
              <Barcode className="w-full h-8 text-gray-700" />
              <span style={{ fontSize: '6pt', fontFamily: 'monospace' }}>{element.content || '000000000'}</span>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px]">
      {/* LEFT SIDEBAR - Tools */}
      <Card className="w-64 flex-shrink-0 rounded-none border-r flex flex-col">
        <CardHeader className="py-3 px-3 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4" /> Alat Desain
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <Tabs value={activeToolTab} onValueChange={setActiveToolTab}>
            <TabsList className="w-full grid grid-cols-2 rounded-none">
              <TabsTrigger value="elements" className="text-xs">Elemen</TabsTrigger>
              <TabsTrigger value="canvas" className="text-xs">Kanvas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="elements" className="p-3 space-y-3 m-0">
              {/* Add Elements */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Tambah Elemen</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-16 flex-col gap-1" onClick={() => addElement('text')}>
                    <Type className="w-5 h-5" />
                    <span className="text-[10px]">Teks</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-16 flex-col gap-1" onClick={() => addElement('qr')}>
                    <QrCode className="w-5 h-5" />
                    <span className="text-[10px]">QR Code</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-16 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px]">Gambar</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-16 flex-col gap-1" onClick={() => setShowTableDialog(true)}>
                    <Table className="w-5 h-5" />
                    <span className="text-[10px]">Tabel</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-16 flex-col gap-1" onClick={() => addElement('shape')}>
                    <Square className="w-5 h-5" />
                    <span className="text-[10px]">Kotak</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-16 flex-col gap-1" onClick={() => addElement('barcode')}>
                    <Barcode className="w-5 h-5" />
                    <span className="text-[10px]">Barcode</span>
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Template Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Template</Label>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowTemplateDialog(true)}>
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Pilih Template
                </Button>
              </div>
              
              <Separator />
              
              {/* Elements List */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Elemen ({elements.length})</Label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {elements.map((el, idx) => (
                    <div 
                      key={el.id}
                      className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer hover:bg-slate-100 ${selectedId === el.id ? 'bg-blue-50 border border-blue-300' : 'bg-slate-50'}`}
                      onClick={() => setSelectedId(el.id)}
                    >
                      {el.type === 'text' && <Type className="w-3 h-3" />}
                      {el.type === 'qr' && <QrCode className="w-3 h-3" />}
                      {el.type === 'image' && <ImageIcon className="w-3 h-3" />}
                      {el.type === 'table' && <Table className="w-3 h-3" />}
                      {el.type === 'shape' && <Square className="w-3 h-3" />}
                      {el.type === 'barcode' && <Barcode className="w-3 h-3" />}
                      <span className="flex-1 truncate">{el.type === 'text' ? el.content?.substring(0, 15) : el.type}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {elements.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      Kanvas kosong
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="canvas" className="p-3 space-y-3 m-0">
              {/* Canvas Size */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Ukuran Kanvas (mm)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-400">Lebar</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={canvasSize.width} 
                      onChange={e => setCanvasSize(prev => ({ ...prev, width: parseFloat(e.target.value) || 50 }))} 
                      className="h-8 text-xs" 
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Tinggi</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={canvasSize.height} 
                      onChange={e => setCanvasSize(prev => ({ ...prev, height: parseFloat(e.target.value) || 50 }))} 
                      className="h-8 text-xs" 
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* View Options */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Tampilan</Label>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Tampilkan Grid</span>
                  <Button variant={showGrid ? 'default' : 'outline'} size="sm" className="h-7" onClick={() => setShowGrid(!showGrid)}>
                    <Grid3X3 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs flex-1">Zoom</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}>
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(z + 0.5, 5))}>
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Actions */}
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-red-600" onClick={resetCanvas}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Kanvas
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* CENTER - Canvas Area */}
      <div className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center p-8 relative">
        <div 
          className="bg-white shadow-xl relative transition-transform duration-200"
          style={{ 
            width: `${canvasSize.width * PIXEL_SCALE}px`, 
            height: `${canvasSize.height * PIXEL_SCALE}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            backgroundImage: showGrid ? 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)' : 'none',
            backgroundSize: `${5 * PIXEL_SCALE}px ${5 * PIXEL_SCALE}px`, // 5mm grid
            border: '1px solid #d1d5db'
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
              className={`group ${selectedId === el.id ? 'outline outline-2 outline-blue-500 z-10' : 'hover:outline hover:outline-1 hover:outline-blue-300'}`}
              enableResizing={selectedId === el.id}
            >
              {renderElementContent(el)}
            </Rnd>
          ))}
          
          {/* Canvas Info Overlay */}
          <div className="absolute bottom-1 right-1 text-[8px] text-gray-400 bg-white/80 px-1 rounded">
            {canvasSize.width.toFixed(1)} x {canvasSize.height.toFixed(1)} mm
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Properties Panel */}
      <Card className="w-72 flex-shrink-0 rounded-none border-l flex flex-col">
        <CardHeader className="py-3 px-3 border-b">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Properti
            </span>
            {selectedElement && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplikat" onClick={() => duplicateElement(selectedElement)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Layer Up" onClick={() => moveElementLayer(selectedElement.id, 'up')}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Layer Down" onClick={() => moveElementLayer(selectedElement.id, 'down')}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" title="Hapus" onClick={() => deleteElement(selectedElement.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-4">
          {!selectedElement ? (
            <div className="text-center text-gray-400 py-8">
              <Move className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Pilih elemen untuk mengedit propertinya</p>
            </div>
          ) : (
            <>
              {/* Common Properties - Position & Size */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Posisi & Ukuran (mm)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-400">X</Label>
                    <Input type="number" step="0.1" value={selectedElement.x.toFixed(1)} onChange={e => updateElement(selectedElement.id, { x: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Y</Label>
                    <Input type="number" step="0.1" value={selectedElement.y.toFixed(1)} onChange={e => updateElement(selectedElement.id, { y: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Lebar</Label>
                    <Input type="number" step="0.1" value={selectedElement.width.toFixed(1)} onChange={e => updateElement(selectedElement.id, { width: parseFloat(e.target.value) || 10 })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Tinggi</Label>
                    <Input type="number" step="0.1" value={selectedElement.height.toFixed(1)} onChange={e => updateElement(selectedElement.id, { height: parseFloat(e.target.value) || 10 })} className="h-7 text-xs" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Text Properties */}
              {selectedElement.type === 'text' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Konten Teks</Label>
                    <Input 
                      value={selectedElement.content} 
                      onChange={e => updateElement(selectedElement.id, { content: e.target.value })} 
                      className="h-8 text-xs" 
                      placeholder="Masukkan teks..."
                    />
                    <div className="flex gap-1 flex-wrap">
                      {DATA_TAGS.map(({ tag, label }) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="cursor-pointer text-[9px] px-1 py-0 hover:bg-blue-50" 
                          onClick={() => updateElement(selectedElement.id, { content: selectedElement.content + tag })}
                          title={label}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Gaya Teks</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-gray-400">Font</Label>
                        <Select value={selectedElement.style?.fontFamily || 'Arial'} onValueChange={v => updateStyle(selectedElement.id, { fontFamily: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-400">Ukuran (pt)</Label>
                        <Input type="number" value={selectedElement.style?.fontSize || 8} onChange={e => updateStyle(selectedElement.id, { fontSize: parseFloat(e.target.value) || 8 })} className="h-7 text-xs" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-400 w-10">Warna</Label>
                      <Input type="color" value={selectedElement.style?.color || '#000000'} onChange={e => updateStyle(selectedElement.id, { color: e.target.value })} className="h-7 w-12 p-0 border-none" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant={selectedElement.style?.fontWeight === 'bold' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateStyle(selectedElement.id, { fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold className="w-3 h-3" /></Button>
                      <Button variant={selectedElement.style?.fontStyle === 'italic' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateStyle(selectedElement.id, { fontStyle: selectedElement.style?.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic className="w-3 h-3" /></Button>
                      <Button variant={selectedElement.style?.textDecoration === 'underline' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => updateStyle(selectedElement.id, { textDecoration: selectedElement.style?.textDecoration === 'underline' ? 'none' : 'underline' })}><Underline className="w-3 h-3" /></Button>
                      <div className="w-px bg-gray-200 mx-1" />
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
                </div>
              )}
              
              {/* QR Properties */}
              {selectedElement.type === 'qr' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500">Data QR Code</Label>
                  <Select value={selectedElement.content} onValueChange={v => updateElement(selectedElement.id, { content: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#{kode_register}"># Kode Register</SelectItem>
                      <SelectItem value="#{kode_barang}"># Kode Barang</SelectItem>
                      <SelectItem value="{nup}">NUP</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-400">Prefix # akan otomatis ditambahkan sesuai pengaturan</p>
                </div>
              )}
              
              {/* Image Properties */}
              {selectedElement.type === 'image' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500">Gambar/Logo</Label>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {selectedElement.content ? 'Ganti Gambar' : 'Upload Gambar'}
                  </Button>
                  {selectedElement.content && (
                    <Button variant="ghost" size="sm" className="w-full text-red-600" onClick={() => updateElement(selectedElement.id, { content: '' })}>
                      Hapus Gambar
                    </Button>
                  )}
                </div>
              )}
              
              {/* Shape Properties */}
              {selectedElement.type === 'shape' && (
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-gray-500">Properti Kotak</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-400">Background</Label>
                      <Input type="color" value={selectedElement.style?.backgroundColor || '#ffffff'} onChange={e => updateStyle(selectedElement.id, { backgroundColor: e.target.value })} className="h-7 w-full p-0" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-400">Border</Label>
                      <Input type="color" value={selectedElement.style?.borderColor || '#000000'} onChange={e => updateStyle(selectedElement.id, { borderColor: e.target.value })} className="h-7 w-full p-0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-400">Tebal Border</Label>
                      <Input type="number" min="0" value={selectedElement.style?.borderWidth || 1} onChange={e => updateStyle(selectedElement.id, { borderWidth: parseInt(e.target.value) || 0 })} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-400">Radius</Label>
                      <Input type="number" min="0" value={selectedElement.style?.borderRadius || 0} onChange={e => updateStyle(selectedElement.id, { borderRadius: parseInt(e.target.value) || 0 })} className="h-7 text-xs" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Table Properties */}
              {selectedElement.type === 'table' && (
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-gray-500">Properti Tabel</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={addTableRow}>
                      <Plus className="w-3 h-3 mr-1" /> Baris
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={addTableColumn}>
                      <Plus className="w-3 h-3 mr-1" /> Kolom
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Edit Isi Sel</Label>
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded">
                      {selectedElement.tableData?.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1">
                          {row.map((cell, cIdx) => (
                            <Input 
                              key={cIdx}
                              value={cell.content}
                              onChange={e => updateTableCell(rIdx, cIdx, { content: e.target.value })}
                              className="h-6 text-[10px] flex-1 min-w-0"
                              placeholder={`R${rIdx+1}C${cIdx+1}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Barcode Properties */}
              {selectedElement.type === 'barcode' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500">Data Barcode</Label>
                  <Input 
                    value={selectedElement.content} 
                    onChange={e => updateElement(selectedElement.id, { content: e.target.value })} 
                    className="h-8 text-xs" 
                    placeholder="{kode_barang}"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {DATA_TAGS.slice(0, 4).map(({ tag }) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="cursor-pointer text-[9px] px-1 py-0" 
                        onClick={() => updateElement(selectedElement.id, { content: tag })}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        
        {/* Save Button */}
        <div className="p-3 border-t">
          <Button className="w-full" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Simpan Desain
          </Button>
        </div>
      </Card>

      {/* Hidden file input */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload}
      />

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pilih Template</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {STICKER_TEMPLATES.map(template => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => applyTemplate(template)}
              >
                <CardContent className="p-3 text-center">
                  <div 
                    className="mx-auto mb-2 bg-slate-100 border flex items-center justify-center"
                    style={{ 
                      width: Math.min(template.width * 1.5, 120), 
                      height: Math.min(template.height * 1.5, 80) 
                    }}
                  >
                    <span className="text-[8px] text-gray-400">{template.width}x{template.height}mm</span>
                  </div>
                  <p className="text-xs font-medium">{template.name}</p>
                  <p className="text-[10px] text-gray-500">{template.elements.length} elemen</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Tabel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jumlah Baris</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="10"
                  value={tableConfig.rows} 
                  onChange={e => setTableConfig(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))} 
                />
              </div>
              <div>
                <Label>Jumlah Kolom</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="10"
                  value={tableConfig.cols} 
                  onChange={e => setTableConfig(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))} 
                />
              </div>
            </div>
            <div className="bg-slate-100 p-4 rounded flex items-center justify-center">
              <div className="border border-gray-400" style={{ display: 'grid', gridTemplateColumns: `repeat(${tableConfig.cols}, 20px)`, gridTemplateRows: `repeat(${tableConfig.rows}, 16px)` }}>
                {Array(tableConfig.rows * tableConfig.cols).fill(0).map((_, i) => (
                  <div key={i} className="border border-gray-300 bg-white" />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>Batal</Button>
            <Button onClick={handleAddTable}>Tambah Tabel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
