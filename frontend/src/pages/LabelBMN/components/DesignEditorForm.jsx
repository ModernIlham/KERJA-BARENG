
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AlignLeft, AlignRight, Ruler, QrCode, Type, Square, PaintBucket } from 'lucide-react';

// ==================== ALIGNMENT SELECTOR COMPONENTS ====================
// Simple horizontal alignment selector (left, center, right)
export const AlignSelectorSimple = ({ value, onChange, label }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="flex gap-1 mt-1">
      {['left', 'center', 'right'].map(align => (
        <Button
          key={align}
          variant={value === align ? 'default' : 'outline'}
          size="sm"
          className="h-7 w-8 p-0"
          onClick={() => onChange(align)}
        >
          {align === 'left' && <AlignLeft className="w-3 h-3" />}
          {align === 'center' && <span className="text-xs">≡</span>}
          {align === 'right' && <AlignRight className="w-3 h-3" />}
        </Button>
      ))}
    </div>
  </div>
);

// Full alignment selector - 9 positions (3x3 grid)
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

// ==================== DESIGN EDITOR FORM ====================
function DesignEditorForm({ design, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...design, [field]: value });
  };
  
  const [activeSection, setActiveSection] = React.useState('dimensi');
  
  const sections = [
    { id: 'dimensi', label: 'Dimensi', icon: Ruler },
    { id: 'qr', label: 'QR Code', icon: QrCode },
    { id: 'header', label: 'Header', icon: Type },
    { id: 'konten', label: 'Konten', icon: AlignLeft },
    { id: 'border', label: 'Border', icon: Square },
    { id: 'tampilan', label: 'Tampilan', icon: PaintBucket }
  ];
  
  return (
    <div className="space-y-3">
      {/* Section Tabs - Scrollable */}
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
        </div>
      )}
      
      {/* ==================== QR CODE SECTION ==================== */}
      {activeSection === 'qr' && (
        <div className="space-y-3">
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
            <Label className="text-xs font-medium">Margin QR (px) - Jarak ke Garis</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              <div>
                <Label className="text-[9px] text-gray-500">Atas</Label>
                <Input type="number" min="0" step="0.5" value={design.qr_margin_top ?? 2} onChange={e => updateField('qr_margin_top', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Kanan</Label>
                <Input type="number" min="0" step="0.5" value={design.qr_margin_right ?? 2} onChange={e => updateField('qr_margin_right', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Bawah</Label>
                <Input type="number" min="0" step="0.5" value={design.qr_margin_bottom ?? 2} onChange={e => updateField('qr_margin_bottom', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-gray-500">Kiri</Label>
                <Input type="number" min="0" step="0.5" value={design.qr_margin_left ?? 2} onChange={e => updateField('qr_margin_left', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
          </div>
          
          <FullAlignSelectorComponent value={design.qr_align || 'center'} onChange={v => updateField('qr_align', v)} label="Alignment QR (9 Posisi)" />
          
          <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
            💡 Atur margin ke 0 untuk QR dekat sekali dengan garis border
          </div>
        </div>
      )}
      
      {/* ... (Other sections follow similarly, keeping it concise for this tool call) ... */}
      {/* To save tokens and tool calls, I'll include the other sections if you wish, or you can implement incrementally. */}
      {/* Including remaining sections for completeness as requested by user intent */}
      
      {/* ==================== HEADER SECTION ==================== */}
      {activeSection === 'header' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Tampilkan Header</Label>
            <Switch checked={design.show_header} onCheckedChange={v => updateField('show_header', v)} />
          </div>
          
          {design.show_header && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Tampilkan Logo</Label>
                <Switch checked={design.header_show_logo} onCheckedChange={v => updateField('header_show_logo', v)} />
              </div>
              
              {design.header_show_logo && (
                <div>
                  <Label className="text-xs">Ukuran Logo (px)</Label>
                  <Input type="number" value={design.header_logo_size || 16} onChange={e => updateField('header_logo_size', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
              )}
              
              <div>
                <Label className="text-xs">Teks Header</Label>
                <Input value={design.header_text || ''} onChange={e => updateField('header_text', e.target.value)} className="h-8 text-sm" placeholder="Nama Instansi" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Font Header (pt)</Label>
                  <Input type="number" step="0.5" value={design.header_font_size || 7.5} onChange={e => updateField('header_font_size', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Font Sub (pt)</Label>
                  <Input type="number" step="0.5" value={design.header_sub_font_size || 6.5} onChange={e => updateField('header_sub_font_size', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
              </div>
              
              <FullAlignSelectorComponent value={design.header_full_align || 'center-left'} onChange={v => updateField('header_full_align', v)} label="Posisi Header (9 Arah)" />
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Padding Header (px)</Label>
                  <Input type="number" value={design.header_padding || 4} onChange={e => updateField('header_padding', parseFloat(e.target.value))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Background</Label>
                  <Input type="color" value={design.header_bg_color || '#ffffff'} onChange={e => updateField('header_bg_color', e.target.value)} className="h-8 w-full" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
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
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Kode Barang</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Font (pt)</Label>
                <Input type="number" step="0.5" value={design.kode_font_size || 7.5} onChange={e => updateField('kode_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Weight</Label>
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
            <div>
              <Label className="text-[10px] text-gray-500">Transform</Label>
              <Select value={design.kode_text_transform || 'none'} onValueChange={v => updateField('kode_text_transform', v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Normal</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FullAlignSelectorComponent value={design.kode_full_align || 'center-left'} onChange={v => updateField('kode_full_align', v)} label="Posisi Kode (9 Arah)" />
          </div>
          
          {/* Nama Barang */}
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Nama Barang</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Font (pt)</Label>
                <Input type="number" step="0.5" value={design.nama_font_size || 6.5} onChange={e => updateField('nama_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Weight</Label>
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
            <FullAlignSelectorComponent value={design.nama_full_align || 'center-left'} onChange={v => updateField('nama_full_align', v)} label="Posisi Nama (9 Arah)" />
          </div>
          
          {/* NUP/Quantity */}
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">NUP / Quantity</Label>
              <Switch checked={design.show_nup} onCheckedChange={v => updateField('show_nup', v)} />
            </div>
            {design.show_nup && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.nup_font_size || 11} onChange={e => updateField('nup_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Min Width (px)</Label>
                    <Input type="number" value={design.nup_min_width || 34} onChange={e => updateField('nup_min_width', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <FullAlignSelectorComponent value={design.nup_full_align || 'center'} onChange={v => updateField('nup_full_align', v)} label="Posisi NUP (9 Arah)" />
              </>
            )}
          </div>
          
          {/* Deskripsi */}
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Deskripsi</Label>
              <Switch checked={design.show_description} onCheckedChange={v => updateField('show_description', v)} />
            </div>
            {design.show_description && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.desc_font_size || 5.5} onChange={e => updateField('desc_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <FullAlignSelectorComponent value={design.desc_full_align || 'top-left'} onChange={v => updateField('desc_full_align', v)} label="Posisi Deskripsi (9 Arah)" />
              </>
            )}
          </div>
        </div>
      )}
      
      {/* ==================== BORDER SECTION ==================== */}
      {activeSection === 'border' && (
        <div className="space-y-3">
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Border Luar (Frame)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Tebal</Label>
                <Input type="number" step="0.5" value={design.border_width || 1} onChange={e => updateField('border_width', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Warna</Label>
                <Input type="color" value={design.border_color || '#2c2c2c'} onChange={e => updateField('border_color', e.target.value)} className="h-7 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Radius</Label>
                <Input type="number" value={design.border_radius || 0} onChange={e => updateField('border_radius', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
            <BorderControlComponent design={design} updateField={updateField} prefix="border" label="Sisi Border Aktif" />
          </div>
          
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Gold Stripe (Dekoratif)</Label>
              <Switch checked={design.show_gold_stripe} onCheckedChange={v => updateField('show_gold_stripe', v)} />
            </div>
            {design.show_gold_stripe && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Tinggi</Label>
                    <Input type="number" value={design.gold_stripe_height || 3} onChange={e => updateField('gold_stripe_height', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.gold_stripe_color || '#D4AF37'} onChange={e => updateField('gold_stripe_color', e.target.value)} className="h-7 w-full" />
                  </div>
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
            <Select value={design.font_family || 'Roboto'} onValueChange={v => updateField('font_family', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Warna Dasar</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Background</Label>
                <Input type="color" value={design.background_color || '#ffffff'} onChange={e => updateField('background_color', e.target.value)} className="h-8 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Teks</Label>
                <Input type="color" value={design.text_color || '#1a1a1a'} onChange={e => updateField('text_color', e.target.value)} className="h-8 w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignEditorForm;
