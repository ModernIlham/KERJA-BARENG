import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  AlignLeft, AlignRight, Ruler, QrCode, Type, Square, PaintBucket, 
  Rows3, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown,
  Table2, Settings2, LayoutGrid
} from 'lucide-react';

// ==================== ALIGNMENT SELECTOR COMPONENTS ====================
const POSITION_ICONS = {
  'top-left': '↖', 'top-center': '↑', 'top-right': '↗',
  'center-left': '←', 'center': '•', 'center-right': '→',
  'bottom-left': '↙', 'bottom-center': '↓', 'bottom-right': '↘'
};

const POSITION_LABELS = {
  'top-left': 'Atas Kiri', 'top-center': 'Atas Tengah', 'top-right': 'Atas Kanan',
  'center-left': 'Tengah Kiri', 'center': 'Tengah', 'center-right': 'Tengah Kanan',
  'bottom-left': 'Bawah Kiri', 'bottom-center': 'Bawah Tengah', 'bottom-right': 'Bawah Kanan'
};

const POSITIONS_GRID = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', 'center', 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right']
];

export const FullAlignSelectorComponent = ({ value, onChange, label }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="grid grid-cols-3 gap-1 mt-1 p-1 border rounded-lg bg-slate-50">
      {POSITIONS_GRID.flat().map(pos => (
        <Button
          key={pos}
          variant={value === pos ? 'default' : 'ghost'}
          size="sm"
          className="h-6 w-full p-0 text-[10px]"
          onClick={() => onChange(pos)}
          title={POSITION_LABELS[pos]}
        >
          {POSITION_ICONS[pos]}
        </Button>
      ))}
    </div>
    <p className="text-[9px] text-gray-500 mt-1">Posisi: {POSITION_LABELS[value] || 'Tengah'}</p>
  </div>
);

// Border control component
export const BorderControlComponent = ({ design, updateField, prefix, label }) => (
  <div className="space-y-2 p-2 border rounded-lg bg-slate-50">
    <Label className="text-xs font-medium">{label}</Label>
    <div className="grid grid-cols-4 gap-1">
      {['top', 'right', 'bottom', 'left'].map(side => (
        <div key={side} className="flex flex-col items-center">
          <Switch 
            checked={design[`${prefix}_${side}`] !== false} 
            onCheckedChange={v => updateField(`${prefix}_${side}`, v)} 
          />
          <span className="text-[9px] text-gray-500 capitalize">{side}</span>
        </div>
      ))}
    </div>
  </div>
);

// ==================== ROW TYPES FOR DYNAMIC TABLE ====================
const ROW_TYPES = [
  { value: 'header', label: 'Header (Instansi + Kode UAKPB)' },
  { value: 'kode_nup', label: 'Kode Barang + NUP' },
  { value: 'kode', label: 'Kode Barang (Full Width)' },
  { value: 'nama', label: 'Nama Barang' },
  { value: 'deskripsi', label: 'Deskripsi (Merk - Tipe)' },
  { value: 'tahun_merk_tipe', label: 'Tahun - Merk - Tipe' },
  { value: 'warning', label: 'Teks Peringatan' },
  { value: 'gold_stripe', label: 'Gold Stripe (Dekoratif)' },
  { value: 'custom_text', label: 'Teks Kustom' },
  { value: 'spacer', label: 'Spacer (Jarak Kosong)' },
  { value: 'nup_only', label: 'NUP Saja' }
];

// Default rows configuration
const getDefaultRows = (sizeType) => {
  if (sizeType === 'kecil') {
    return [
      { id: 'row_1', type: 'nama_nup', enabled: true, show_border_bottom: true, columns: [
        { type: 'nama', flex: 1 },
        { type: 'nup', width: '7mm' }
      ]},
      { id: 'row_2', type: 'kode', enabled: true, show_border_bottom: true },
      { id: 'row_3', type: 'tahun_merk_tipe', enabled: true, show_border_bottom: false }
    ];
  }
  return [
    { id: 'row_1', type: 'kode_nup', enabled: true, show_border_bottom: true, columns: [
      { type: 'kode', flex: 1 },
      { type: 'nup', width: '12mm' }
    ]},
    { id: 'row_2', type: 'nama', enabled: true, show_border_bottom: true },
    { id: 'row_3', type: 'deskripsi', enabled: true, show_border_bottom: true },
    { id: 'row_4', type: 'warning', enabled: true, show_border_bottom: false }
  ];
};

// ==================== ROW EDITOR COMPONENT ====================
const RowEditor = ({ row, index, design, updateRow, removeRow, moveRow, totalRows }) => {
  const updateRowField = (field, value) => {
    updateRow(index, { ...row, [field]: value });
  };

  return (
    <div className="border rounded-lg p-2 bg-white space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
        
        <Switch 
          checked={row.enabled !== false} 
          onCheckedChange={v => updateRowField('enabled', v)}
        />
        
        <Select value={row.type} onValueChange={v => updateRowField('type', v)}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder="Pilih tipe row" />
          </SelectTrigger>
          <SelectContent>
            {ROW_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveRow(index, -1)} disabled={index === 0}>
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveRow(index, 1)} disabled={index === totalRows - 1}>
            <ChevronDown className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeRow(index)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {row.enabled !== false && (
        <div className="pl-6 space-y-2">
          {/* Row-specific settings */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[9px] text-gray-500">Tinggi (mm)</Label>
              <Input 
                type="number" 
                step="0.5"
                value={row.height || 'auto'} 
                onChange={e => updateRowField('height', e.target.value === '' ? 'auto' : parseFloat(e.target.value))} 
                className="h-6 text-xs"
                placeholder="auto"
              />
            </div>
            <div>
              <Label className="text-[9px] text-gray-500">Padding (mm)</Label>
              <Input 
                type="number" 
                step="0.5"
                value={row.padding ?? 0.5} 
                onChange={e => updateRowField('padding', parseFloat(e.target.value))} 
                className="h-6 text-xs"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-1">
                <Switch 
                  checked={row.show_border_bottom !== false} 
                  onCheckedChange={v => updateRowField('show_border_bottom', v)}
                />
                <span className="text-[9px]">Border</span>
              </div>
            </div>
          </div>
          
          {/* Custom text for custom_text type */}
          {row.type === 'custom_text' && (
            <div>
              <Label className="text-[9px] text-gray-500">Teks Kustom</Label>
              <Input 
                value={row.custom_text || ''} 
                onChange={e => updateRowField('custom_text', e.target.value)} 
                className="h-6 text-xs"
                placeholder="Masukkan teks..."
              />
            </div>
          )}
          
          {/* Warning text customization */}
          {row.type === 'warning' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Teks Peringatan</Label>
                <Input 
                  value={row.warning_text || design.warning_text || 'Tidak Untuk Diperjualbelikan'} 
                  onChange={e => updateRowField('warning_text', e.target.value)} 
                  className="h-6 text-xs"
                />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Warna</Label>
                <Input 
                  type="color"
                  value={row.warning_color || design.warning_color || '#cc0000'} 
                  onChange={e => updateRowField('warning_color', e.target.value)} 
                  className="h-6 w-full"
                />
              </div>
            </div>
          )}
          
          {/* Gold stripe settings */}
          {row.type === 'gold_stripe' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Tinggi Stripe</Label>
                <Input 
                  type="number"
                  step="0.5"
                  value={row.stripe_height || 2.5} 
                  onChange={e => updateRowField('stripe_height', parseFloat(e.target.value))} 
                  className="h-6 text-xs"
                />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Warna</Label>
                <Input 
                  type="color"
                  value={row.stripe_color || '#D4AF37'} 
                  onChange={e => updateRowField('stripe_color', e.target.value)} 
                  className="h-6 w-full"
                />
              </div>
            </div>
          )}

          {/* Spacer height */}
          {row.type === 'spacer' && (
            <div>
              <Label className="text-[9px] text-gray-500">Tinggi Spacer (mm)</Label>
              <Input 
                type="number"
                step="0.5"
                value={row.spacer_height || 2} 
                onChange={e => updateRowField('spacer_height', parseFloat(e.target.value))} 
                className="h-6 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== MAIN DESIGN EDITOR FORM ====================
function DesignEditorForm({ design, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...design, [field]: value });
  };
  
  const [activeSection, setActiveSection] = React.useState('struktur');
  
  // Initialize rows if not present
  React.useEffect(() => {
    if (!design.content_rows) {
      onChange({ ...design, content_rows: getDefaultRows(design.size_type || 'sedang') });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.size_type]);
  
  const rows = design.content_rows || getDefaultRows(design.size_type || 'sedang');
  
  const updateRows = (newRows) => {
    onChange({ ...design, content_rows: newRows });
  };
  
  const updateRow = (index, updatedRow) => {
    const newRows = [...rows];
    newRows[index] = updatedRow;
    updateRows(newRows);
  };
  
  const addRow = () => {
    const newRow = {
      id: `row_${Date.now()}`,
      type: 'custom_text',
      enabled: true,
      show_border_bottom: true,
      custom_text: 'Teks baru'
    };
    updateRows([...rows, newRow]);
  };
  
  const removeRow = (index) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    updateRows(newRows);
  };
  
  const moveRow = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;
    const newRows = [...rows];
    [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]];
    updateRows(newRows);
  };
  
  const sections = [
    { id: 'struktur', label: 'Struktur', icon: LayoutGrid },
    { id: 'dimensi', label: 'Dimensi', icon: Ruler },
    { id: 'qr', label: 'QR Code', icon: QrCode },
    { id: 'header', label: 'Header', icon: Type },
    { id: 'konten', label: 'Konten', icon: Rows3 },
    { id: 'border', label: 'Border', icon: Square },
    { id: 'tampilan', label: 'Tampilan', icon: PaintBucket }
  ];
  
  return (
    <div className="space-y-3">
      {/* Section Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {sections.map(s => (
          <Button 
            key={s.id} 
            variant={activeSection === s.id ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveSection(s.id)}
            className="text-xs whitespace-nowrap flex-shrink-0"
          >
            <s.icon className="w-3 h-3 mr-1" />{s.label}
          </Button>
        ))}
      </div>
      
      {/* Nama Template */}
      <div>
        <Label className="text-xs font-medium">Nama Template</Label>
        <Input 
          value={design.name || ''} 
          onChange={e => updateField('name', e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* ==================== STRUKTUR SECTION (NEW) ==================== */}
      {activeSection === 'struktur' && (
        <div className="space-y-3">
          <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>💡 Struktur Stiker</strong>
            <p className="mt-1">Atur urutan dan tampilan setiap baris pada stiker. Aktifkan/nonaktifkan, ubah urutan, atau hapus baris sesuai kebutuhan.</p>
          </div>
          
          {/* Global Element Toggles */}
          <div className="p-3 border rounded-lg space-y-2 bg-slate-50">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" /> Tampilkan Elemen
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">QR Code</span>
                <Switch checked={design.show_qr !== false} onCheckedChange={v => updateField('show_qr', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Header</span>
                <Switch checked={design.show_header !== false} onCheckedChange={v => updateField('show_header', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Logo</span>
                <Switch checked={design.header_show_logo !== false} onCheckedChange={v => updateField('header_show_logo', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Kode Barang</span>
                <Switch checked={design.show_kode !== false} onCheckedChange={v => updateField('show_kode', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Nama Barang</span>
                <Switch checked={design.show_nama !== false} onCheckedChange={v => updateField('show_nama', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">NUP</span>
                <Switch checked={design.show_nup !== false} onCheckedChange={v => updateField('show_nup', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Deskripsi</span>
                <Switch checked={design.show_description !== false} onCheckedChange={v => updateField('show_description', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Peringatan</span>
                <Switch checked={design.show_warning !== false} onCheckedChange={v => updateField('show_warning', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Gold Stripe</span>
                <Switch checked={design.show_gold_stripe === true} onCheckedChange={v => updateField('show_gold_stripe', v)} />
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-xs">Label NUP</span>
                <Switch checked={design.show_nup_label !== false} onCheckedChange={v => updateField('show_nup_label', v)} />
              </div>
            </div>
          </div>
          
          {/* Dynamic Rows Manager */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Table2 className="w-4 h-4" /> Baris Konten ({rows.length})
              </Label>
              <Button size="sm" variant="outline" onClick={addRow} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Tambah Baris
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {rows.map((row, index) => (
                <RowEditor
                  key={row.id}
                  row={row}
                  index={index}
                  design={design}
                  updateRow={updateRow}
                  removeRow={removeRow}
                  moveRow={moveRow}
                  totalRows={rows.length}
                />
              ))}
            </div>
          </div>
          
          {/* Quick Reset */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => updateRows(getDefaultRows(design.size_type || 'sedang'))}
          >
            Reset ke Struktur Default
          </Button>
        </div>
      )}
      
      {/* ==================== DIMENSI SECTION ==================== */}
      {activeSection === 'dimensi' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Lebar (mm)</Label>
              <Input type="number" step="0.1" value={design.width || 69.8} onChange={e => updateField('width', parseFloat(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Tinggi (mm)</Label>
              <Input type="number" step="0.1" value={design.height || 22.1} onChange={e => updateField('height', parseFloat(e.target.value))} className="h-8 text-sm" />
            </div>
          </div>
          
          <div>
            <Label className="text-xs">Orientasi Layout</Label>
            <Select value={design.layout || 'landscape'} onValueChange={v => updateField('layout', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape (Horizontal)</SelectItem>
                <SelectItem value="portrait">Portrait (Vertikal)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Content Padding (px)</Label>
              <Input type="number" value={design.content_padding || 0} onChange={e => updateField('content_padding', parseFloat(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Element Gap (px)</Label>
              <Input type="number" value={design.element_gap || 0} onChange={e => updateField('element_gap', parseFloat(e.target.value))} className="h-8 text-sm" />
            </div>
          </div>

          {/* QR Area Width */}
          <div className="p-2 border rounded-lg space-y-2 bg-slate-50">
            <Label className="text-xs font-medium">Area QR Code</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Lebar Area (mm)</Label>
                <Input type="number" step="0.1" value={design.qr_area_width || design.height || 22.1} onChange={e => updateField('qr_area_width', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Posisi</Label>
                <Select value={design.qr_position || 'left'} onValueChange={v => updateField('qr_position', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Kiri</SelectItem>
                    <SelectItem value="right">Kanan</SelectItem>
                    <SelectItem value="top">Atas</SelectItem>
                    <SelectItem value="bottom">Bawah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Header Area Height */}
          <div className="p-2 border rounded-lg space-y-2 bg-slate-50">
            <Label className="text-xs font-medium">Area Header</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Tinggi Min (mm)</Label>
                <Input type="number" step="0.5" value={design.header_min_height || 6.5} onChange={e => updateField('header_min_height', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Lebar Logo (px)</Label>
                <Input type="number" value={design.header_logo_size || 16} onChange={e => updateField('header_logo_size', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ==================== QR CODE SECTION ==================== */}
      {activeSection === 'qr' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <Label className="text-xs font-medium">Tampilkan QR Code</Label>
            <Switch checked={design.show_qr !== false} onCheckedChange={v => updateField('show_qr', v)} />
          </div>
          
          {design.show_qr !== false && (
            <>
              <div>
                <Label className="text-xs">Posisi QR Code</Label>
                <Select value={design.qr_position || 'left'} onValueChange={v => updateField('qr_position', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Kiri</SelectItem>
                    <SelectItem value="right">Kanan</SelectItem>
                    <SelectItem value="top">Atas</SelectItem>
                    <SelectItem value="bottom">Bawah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Ukuran QR ({design.qr_size || 90}%)</Label>
                <Slider value={[design.qr_size || 90]} onValueChange={([v]) => updateField('qr_size', v)} min={50} max={100} step={1} className="mt-2" />
              </div>
              
              <div>
                <Label className="text-xs font-medium">Margin QR (mm)</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {['top', 'right', 'bottom', 'left'].map(side => (
                    <div key={side}>
                      <Label className="text-[9px] text-gray-500 capitalize">{side === 'top' ? 'Atas' : side === 'bottom' ? 'Bawah' : side === 'left' ? 'Kiri' : 'Kanan'}</Label>
                      <Input type="number" min="0" step="0.5" value={design[`qr_margin_${side}`] ?? 2} onChange={e => updateField(`qr_margin_${side}`, parseFloat(e.target.value))} className="h-7 text-xs" />
                    </div>
                  ))}
                </div>
              </div>
              
              <FullAlignSelectorComponent value={design.qr_align || 'center'} onChange={v => updateField('qr_align', v)} label="Alignment QR (9 Posisi)" />
              
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <Label className="text-xs">Border Kanan QR</Label>
                <Switch checked={design.qr_border_right !== false} onCheckedChange={v => updateField('qr_border_right', v)} />
              </div>
              
              <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 Atur margin ke 0 untuk QR dekat sekali dengan garis border
              </div>
            </>
          )}
        </div>
      )}
      
      {/* ==================== HEADER SECTION ==================== */}
      {activeSection === 'header' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <Label className="text-xs font-medium">Tampilkan Header</Label>
            <Switch checked={design.show_header !== false} onCheckedChange={v => updateField('show_header', v)} />
          </div>
          
          {design.show_header !== false && (
            <>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <Label className="text-xs">Tampilkan Logo</Label>
                <Switch checked={design.header_show_logo !== false} onCheckedChange={v => updateField('header_show_logo', v)} />
              </div>
              
              {design.header_show_logo !== false && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Ukuran Logo (px)</Label>
                    <Input type="number" value={design.header_logo_size || 16} onChange={e => updateField('header_logo_size', parseFloat(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <Switch checked={design.header_logo_border !== false} onCheckedChange={v => updateField('header_logo_border', v)} />
                      <span className="text-xs">Border Logo</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-xs">Teks Header (Nama Instansi)</Label>
                <Input value={design.header_text || ''} onChange={e => updateField('header_text', e.target.value)} className="h-8 text-sm" placeholder="Otorita Ibu Kota Nusantara" />
              </div>
              
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <Label className="text-xs">Tampilkan Kode UAKPB</Label>
                <Switch checked={design.header_show_uakpb !== false} onCheckedChange={v => updateField('header_show_uakpb', v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Font Header (pt)</Label>
                  <Input type="number" step="0.5" value={design.header_font_size || 7.5} onChange={e => updateField('header_font_size', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Font Sub/UAKPB (pt)</Label>
                  <Input type="number" step="0.5" value={design.header_sub_font_size || 6.5} onChange={e => updateField('header_sub_font_size', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Font Weight</Label>
                  <Select value={String(design.header_font_weight || 700)} onValueChange={v => updateField('header_font_weight', parseInt(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="400">Normal</SelectItem>
                      <SelectItem value="500">Medium</SelectItem>
                      <SelectItem value="600">Semi Bold</SelectItem>
                      <SelectItem value="700">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <Switch checked={design.header_italic !== false} onCheckedChange={v => updateField('header_italic', v)} />
                    <span className="text-xs">Italic</span>
                  </div>
                </div>
              </div>
              
              <FullAlignSelectorComponent value={design.header_full_align || 'center-left'} onChange={v => updateField('header_full_align', v)} label="Posisi Header (9 Arah)" />
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Padding (px)</Label>
                  <Input type="number" value={design.header_padding || 4} onChange={e => updateField('header_padding', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Background</Label>
                  <Input type="color" value={design.header_bg_color || '#ffffff'} onChange={e => updateField('header_bg_color', e.target.value)} className="h-8 w-full" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <Label className="text-xs">Border Bawah Header</Label>
                <Switch checked={design.header_border_bottom !== false} onCheckedChange={v => updateField('header_border_bottom', v)} />
              </div>
            </>
          )}
        </div>
      )}
      
      {/* ==================== KONTEN SECTION ==================== */}
      {activeSection === 'konten' && (
        <div className="space-y-3">
          {/* Kode Barang */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="kode" className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={design.show_kode !== false} 
                    onCheckedChange={v => updateField('show_kode', v)}
                    onClick={e => e.stopPropagation()}
                  />
                  Kode Barang
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.kode_font_size || 7.5} onChange={e => updateField('kode_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Weight</Label>
                    <Select value={String(design.kode_font_weight || 700)} onValueChange={v => updateField('kode_font_weight', parseInt(v))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">Normal</SelectItem>
                        <SelectItem value="500">Medium</SelectItem>
                        <SelectItem value="600">Semi Bold</SelectItem>
                        <SelectItem value="700">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Transform</Label>
                    <Select value={design.kode_text_transform || 'none'} onValueChange={v => updateField('kode_text_transform', v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Normal</SelectItem>
                        <SelectItem value="uppercase">UPPERCASE</SelectItem>
                        <SelectItem value="lowercase">lowercase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.kode_color || design.text_color || '#1a1a1a'} onChange={e => updateField('kode_color', e.target.value)} className="h-7 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={design.kode_italic === true} onCheckedChange={v => updateField('kode_italic', v)} />
                  <span className="text-xs">Italic</span>
                </div>
                <FullAlignSelectorComponent value={design.kode_full_align || 'center-left'} onChange={v => updateField('kode_full_align', v)} label="Posisi (9 Arah)" />
              </AccordionContent>
            </AccordionItem>
            
            {/* Nama Barang */}
            <AccordionItem value="nama" className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={design.show_nama !== false} 
                    onCheckedChange={v => updateField('show_nama', v)}
                    onClick={e => e.stopPropagation()}
                  />
                  Nama Barang
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.nama_font_size || 6.5} onChange={e => updateField('nama_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Weight</Label>
                    <Select value={String(design.nama_font_weight || 500)} onValueChange={v => updateField('nama_font_weight', parseInt(v))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">Normal</SelectItem>
                        <SelectItem value="500">Medium</SelectItem>
                        <SelectItem value="600">Semi Bold</SelectItem>
                        <SelectItem value="700">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.nama_color || design.text_color || '#1a1a1a'} onChange={e => updateField('nama_color', e.target.value)} className="h-7 w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={design.nama_italic !== false} onCheckedChange={v => updateField('nama_italic', v)} />
                    <span className="text-xs">Italic</span>
                  </div>
                </div>
                <FullAlignSelectorComponent value={design.nama_full_align || 'center-left'} onChange={v => updateField('nama_full_align', v)} label="Posisi (9 Arah)" />
              </AccordionContent>
            </AccordionItem>
            
            {/* NUP */}
            <AccordionItem value="nup" className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={design.show_nup !== false} 
                    onCheckedChange={v => updateField('show_nup', v)}
                    onClick={e => e.stopPropagation()}
                  />
                  NUP / Quantity
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Switch checked={design.show_nup_label !== false} onCheckedChange={v => updateField('show_nup_label', v)} />
                  <span className="text-xs">Tampilkan Label "NUP:"</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.nup_font_size || 11} onChange={e => updateField('nup_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Min Width (mm)</Label>
                    <Input type="number" value={design.nup_min_width || 12} onChange={e => updateField('nup_min_width', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.nup_color || design.text_color || '#1a1a1a'} onChange={e => updateField('nup_color', e.target.value)} className="h-7 w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={design.nup_border_left !== false} onCheckedChange={v => updateField('nup_border_left', v)} />
                    <span className="text-xs">Border Kiri</span>
                  </div>
                </div>
                <FullAlignSelectorComponent value={design.nup_full_align || 'center'} onChange={v => updateField('nup_full_align', v)} label="Posisi (9 Arah)" />
              </AccordionContent>
            </AccordionItem>
            
            {/* Deskripsi */}
            <AccordionItem value="desc" className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={design.show_description !== false} 
                    onCheckedChange={v => updateField('show_description', v)}
                    onClick={e => e.stopPropagation()}
                  />
                  Deskripsi (Merk - Tipe)
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.desc_font_size || 5.5} onChange={e => updateField('desc_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.desc_color || design.text_color || '#1a1a1a'} onChange={e => updateField('desc_color', e.target.value)} className="h-7 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={design.desc_italic !== false} onCheckedChange={v => updateField('desc_italic', v)} />
                  <span className="text-xs">Italic</span>
                </div>
                <FullAlignSelectorComponent value={design.desc_full_align || 'center-left'} onChange={v => updateField('desc_full_align', v)} label="Posisi (9 Arah)" />
              </AccordionContent>
            </AccordionItem>
            
            {/* Warning */}
            <AccordionItem value="warning" className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={design.show_warning !== false} 
                    onCheckedChange={v => updateField('show_warning', v)}
                    onClick={e => e.stopPropagation()}
                  />
                  Teks Peringatan
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2">
                <div>
                  <Label className="text-[9px] text-gray-500">Teks</Label>
                  <Input value={design.warning_text || 'Tidak Untuk Diperjualbelikan'} onChange={e => updateField('warning_text', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.warning_font_size || 6} onChange={e => updateField('warning_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.warning_color || '#cc0000'} onChange={e => updateField('warning_color', e.target.value)} className="h-7 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={design.warning_italic !== false} onCheckedChange={v => updateField('warning_italic', v)} />
                  <span className="text-xs">Italic</span>
                </div>
                <FullAlignSelectorComponent value={design.warning_full_align || 'center-left'} onChange={v => updateField('warning_full_align', v)} label="Posisi (9 Arah)" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
      
      {/* ==================== BORDER SECTION ==================== */}
      {activeSection === 'border' && (
        <div className="space-y-3">
          <div className="p-3 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Border Luar (Frame)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Tebal (px)</Label>
                <Input type="number" step="0.5" value={design.border_width ?? 1} onChange={e => updateField('border_width', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Warna</Label>
                <Input type="color" value={design.border_color || '#2c2c2c'} onChange={e => updateField('border_color', e.target.value)} className="h-7 w-full" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Radius (px)</Label>
                <Input type="number" value={design.border_radius || 0} onChange={e => updateField('border_radius', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
            <BorderControlComponent design={design} updateField={updateField} prefix="border" label="Sisi Border Aktif" />
          </div>
          
          {/* Section/Cell Borders */}
          <div className="p-3 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Border Dalam (Antar Cell)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Tebal (px)</Label>
                <Input type="number" step="0.5" value={design.section_border_width ?? 1} onChange={e => updateField('section_border_width', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Warna</Label>
                <Input type="color" value={design.section_border_color || design.border_color || '#2c2c2c'} onChange={e => updateField('section_border_color', e.target.value)} className="h-7 w-full" />
              </div>
            </div>
          </div>
          
          {/* Gold Stripe */}
          <div className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Gold Stripe (Dekoratif)</Label>
              <Switch checked={design.show_gold_stripe === true} onCheckedChange={v => updateField('show_gold_stripe', v)} />
            </div>
            {design.show_gold_stripe && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] text-gray-500">Tinggi (mm)</Label>
                    <Input type="number" step="0.5" value={design.gold_stripe_height || 2.5} onChange={e => updateField('gold_stripe_height', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[9px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.gold_stripe_color || '#D4AF37'} onChange={e => updateField('gold_stripe_color', e.target.value)} className="h-7 w-full" />
                  </div>
                </div>
                <div>
                  <Label className="text-[9px] text-gray-500">Posisi</Label>
                  <Select value={design.gold_stripe_position || 'after_qr'} onValueChange={v => updateField('gold_stripe_position', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after_qr">Setelah QR Code</SelectItem>
                      <SelectItem value="after_header">Setelah Header</SelectItem>
                      <SelectItem value="before_warning">Sebelum Peringatan</SelectItem>
                      <SelectItem value="bottom">Paling Bawah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* ==================== TAMPILAN SECTION ==================== */}
      {activeSection === 'tampilan' && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Font Family</Label>
            <Select value={design.font_family || 'Arial'} onValueChange={v => updateField('font_family', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="p-3 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Warna Dasar</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Background</Label>
                <Input type="color" value={design.background_color || '#ffffff'} onChange={e => updateField('background_color', e.target.value)} className="h-8 w-full" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Teks Default</Label>
                <Input type="color" value={design.text_color || '#1a1a1a'} onChange={e => updateField('text_color', e.target.value)} className="h-8 w-full" />
              </div>
            </div>
          </div>
          
          {/* Print Settings */}
          <div className="p-3 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Pengaturan Cetak</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Kolom per Halaman</Label>
                <Input type="number" min="1" max="6" value={design.print_columns || 3} onChange={e => updateField('print_columns', parseInt(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Baris per Halaman</Label>
                <Input type="number" min="1" max="20" value={design.print_rows || 10} onChange={e => updateField('print_rows', parseInt(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[9px] text-gray-500">Jarak Horizontal (mm)</Label>
                <Input type="number" step="0.5" value={design.print_gap_x || 2} onChange={e => updateField('print_gap_x', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Jarak Vertikal (mm)</Label>
                <Input type="number" step="0.5" value={design.print_gap_y || 2} onChange={e => updateField('print_gap_y', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignEditorForm;
