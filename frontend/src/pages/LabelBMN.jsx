/**
 * LabelBMN.jsx - Halaman Manajemen Pelabelan Stiker BMN
 * Features:
 * - 3 ukuran stiker: Kecil (2.38x3.98cm), Sedang (6.98x2.21cm), Besar (9.49x3.22cm)
 * - Canvas A4/A3 dengan crop marks untuk mesin cutting
 * - Tracking status cetak
 * - Parent-Child asset relationship (Induk-Anak untuk aksesori)
 * - Advanced QR Code customization (eye patterns, body patterns, colors)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { 
  Printer, Search, Plus, Trash2, Package, Tag, QrCode, 
  CheckCircle2, XCircle, History, LayoutGrid, Settings2,
  ChevronRight, Link2, Unlink, RefreshCw, Download, FileText, Eye,
  Palette, Image, Sliders, ChevronDown, ChevronUp, Square, Circle
} from 'lucide-react';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';

// ==================== CONSTANTS ====================
// Ukuran stiker sesuai permintaan user (dalam mm)
const STICKER_SIZES = {
  kecil: { width: 23.8, height: 39.8, label: 'Kecil (2.38x3.98cm)', desc: 'Aksesori' },
  sedang: { width: 69.8, height: 22.1, label: 'Sedang (6.98x2.21cm)', desc: 'Standar' },
  besar: { width: 94.9, height: 32.2, label: 'Besar (9.49x3.22cm)', desc: 'Mesin Besar' }
};

const CANVAS_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210x297mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297x420mm)' }
};

const CROP_MARK_LENGTH = 3; // mm - reduced
const MARGIN = 5; // mm from edge - reduced for more stickers
const GAP = 2; // mm between stickers - reduced

// QR Code Pattern Options
const DOT_STYLES = [
  { value: 'square', label: 'Kotak' },
  { value: 'dots', label: 'Bulat' },
  { value: 'rounded', label: 'Kotak Bulat' },
  { value: 'extra-rounded', label: 'Extra Bulat' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Bulat' }
];

const CORNER_SQUARE_STYLES = [
  { value: 'square', label: 'Kotak' },
  { value: 'dot', label: 'Bulat' },
  { value: 'extra-rounded', label: 'Extra Bulat' }
];

const CORNER_DOT_STYLES = [
  { value: 'square', label: 'Kotak' },
  { value: 'dot', label: 'Bulat' }
];

// Default QR Settings with Advanced Options
const DEFAULT_QR_SETTINGS = {
  size: 200,
  margin: 0,
  // Body/Dots
  dotsColor: '#000000',
  dotsStyle: 'square',
  // External Eye (Corner Square)
  cornerSquareColor: '#000000',
  cornerSquareStyle: 'square',
  // Internal Eye (Corner Dot)
  cornerDotColor: '#000000',
  cornerDotStyle: 'square',
  // Background
  backgroundColor: '#ffffff',
  // Logo
  logoEnabled: true,
  logoSize: 25,
  logoBackgroundEnabled: true,
  logoBackgroundColor: '#ffffff',
  // Error Correction
  errorCorrectionLevel: 'M'
};

const ERROR_CORRECTION_LEVELS = [
  { value: 'L', label: 'Low (7%)', desc: 'Minimum koreksi' },
  { value: 'M', label: 'Medium (15%)', desc: 'Rekomendasi' },
  { value: 'Q', label: 'Quartile (25%)', desc: 'Dengan logo' },
  { value: 'H', label: 'High (30%)', desc: 'Maximum koreksi' }
];

const COLOR_PRESETS = [
  { name: 'Klasik', dots: '#000000', corner: '#000000', bg: '#ffffff' },
  { name: 'Biru Tua', dots: '#1a365d', corner: '#0f172a', bg: '#ffffff' },
  { name: 'Hijau', dots: '#166534', corner: '#14532d', bg: '#ffffff' },
  { name: 'Merah', dots: '#991b1b', corner: '#7f1d1d', bg: '#ffffff' },
  { name: 'Ungu', dots: '#5b21b6', corner: '#4c1d95', bg: '#ffffff' },
  { name: 'Navy Gold', dots: '#1e3a5f', corner: '#b45309', bg: '#fef3c7' },
];

// ==================== QR CODE COMPONENT WITH STYLING ====================
const StyledQRCode = ({ data, settings, logoUrl, size = 200, className = "" }) => {
  const qrRef = useRef(null);

  useEffect(() => {
    if (!qrRef.current) return;

    // Clear previous QR code
    qrRef.current.innerHTML = '';

    const qrOptions = {
      width: size,
      height: size,
      type: 'svg',
      data: data || '#SAMPLE-001',
      margin: settings.margin || 0,
      qrOptions: {
        errorCorrectionLevel: settings.errorCorrectionLevel || 'M'
      },
      dotsOptions: {
        color: settings.dotsColor || '#000000',
        type: settings.dotsStyle || 'square'
      },
      cornersSquareOptions: {
        color: settings.cornerSquareColor || '#000000',
        type: settings.cornerSquareStyle || 'square'
      },
      cornersDotOptions: {
        color: settings.cornerDotColor || '#000000',
        type: settings.cornerDotStyle || 'square'
      },
      backgroundOptions: {
        color: settings.backgroundColor || '#ffffff'
      }
    };

    // Add logo if enabled
    if (settings.logoEnabled && logoUrl) {
      qrOptions.image = logoUrl;
      qrOptions.imageOptions = {
        crossOrigin: 'anonymous',
        margin: settings.logoBackgroundEnabled ? 2 : 0,
        imageSize: (settings.logoSize || 25) / 100,
        hideBackgroundDots: true
      };
    }

    // Create new QR code instance every time
    const qrCode = new QRCodeStyling(qrOptions);
    qrCode.append(qrRef.current);

    return () => {
      // Cleanup
    };
  }, [data, settings, logoUrl, size]);

  // Handle logo background overlay
  const logoBackgroundStyle = settings.logoEnabled && logoUrl && settings.logoBackgroundEnabled ? {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${(settings.logoSize || 25) + 5}%`,
    height: `${(settings.logoSize || 25) + 5}%`,
    backgroundColor: settings.logoBackgroundColor || '#ffffff',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  } : null;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div ref={qrRef} className="w-full h-full" />
      {logoBackgroundStyle && (
        <div style={logoBackgroundStyle}>
          <img 
            src={logoUrl} 
            alt="Logo" 
            style={{ 
              width: '80%', 
              height: '80%', 
              objectFit: 'contain' 
            }} 
          />
        </div>
      )}
    </div>
  );
};

// ==================== QR SETTINGS PANEL (Advanced) ====================
const QRSettingsPanel = ({ settings, onChange, instansi, previewText = "#SAMPLE-001" }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeSection, setActiveSection] = useState('body');
  
  const updateSetting = (key, value) => {
    onChange({ ...settings, [key]: value });
  };
  
  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="py-3 border-b bg-blue-100/50">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="w-4 h-4 text-blue-600" />
          Customisasi QR Code
          <Badge variant="outline" className="ml-auto text-xs">Advanced Style</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Preview Section */}
        <div className="flex gap-4">
          {/* QR Preview */}
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1">Preview</div>
            <div 
              className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white overflow-hidden"
              style={{ backgroundColor: settings.backgroundColor }}
            >
              <StyledQRCode 
                data={previewText}
                settings={settings}
                logoUrl={instansi?.logo_url}
                size={150}
              />
            </div>
          </div>
          
          {/* Quick Settings */}
          <div className="flex-1 space-y-3">
            {/* Size */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label>Ukuran (px)</Label>
                <span className="text-gray-500">{settings.size}px</span>
              </div>
              <Slider
                value={[settings.size]}
                onValueChange={([val]) => updateSetting('size', val)}
                min={100}
                max={400}
                step={10}
                className="w-full"
              />
            </div>
            
            {/* Margin */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label>Margin (blocks)</Label>
                <span className="text-gray-500">{settings.margin}</span>
              </div>
              <Slider
                value={[settings.margin]}
                onValueChange={([val]) => updateSetting('margin', val)}
                min={0}
                max={4}
                step={1}
                className="w-full"
              />
            </div>

            {/* Error Correction Level */}
            <div>
              <Label className="text-xs mb-1 block">Error Correction</Label>
              <Select 
                value={settings.errorCorrectionLevel} 
                onValueChange={(val) => updateSetting('errorCorrectionLevel', val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ERROR_CORRECTION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Color Presets */}
        <div>
          <Label className="text-xs mb-2 block">Preset Warna</Label>
          <div className="flex flex-wrap gap-1">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  updateSetting('dotsColor', preset.dots);
                  updateSetting('cornerSquareColor', preset.corner);
                  updateSetting('cornerDotColor', preset.corner);
                  updateSetting('backgroundColor', preset.bg);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50 text-xs"
                title={preset.name}
              >
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: preset.dots }} />
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: preset.corner }} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Opsi Lanjutan (Pattern & Style)
        </button>
        
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t">
            {/* Section Tabs */}
            <div className="flex gap-1 border-b">
              {[
                { id: 'body', label: 'Body Pattern', icon: Square },
                { id: 'external', label: 'External Eye', icon: Square },
                { id: 'internal', label: 'Internal Eye', icon: Circle },
                { id: 'logo', label: 'Logo', icon: Image }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeSection === id 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Body Pattern Section */}
            {activeSection === 'body' && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  Body Pattern (Titik-titik QR)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bentuk</Label>
                    <Select 
                      value={settings.dotsStyle} 
                      onValueChange={(val) => updateSetting('dotsStyle', val)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOT_STYLES.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <div className="flex gap-1 mt-1">
                      <input 
                        type="color"
                        value={settings.dotsColor}
                        onChange={(e) => updateSetting('dotsColor', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border"
                      />
                      <Input 
                        value={settings.dotsColor}
                        onChange={(e) => updateSetting('dotsColor', e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Warna Background</Label>
                  <div className="flex gap-1 mt-1">
                    <input 
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.backgroundColor}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                      className="h-8 text-xs font-mono flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* External Eye Pattern Section */}
            {activeSection === 'external' && (
              <div className="space-y-3 p-3 bg-orange-50 rounded-lg">
                <h4 className="text-xs font-semibold text-orange-700 flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  External Eye Pattern (Kotak Luar Sudut)
                </h4>
                <p className="text-xs text-orange-600">
                  Mengatur tampilan kotak besar di 3 sudut QR code
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bentuk</Label>
                    <Select 
                      value={settings.cornerSquareStyle} 
                      onValueChange={(val) => updateSetting('cornerSquareStyle', val)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CORNER_SQUARE_STYLES.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <div className="flex gap-1 mt-1">
                      <input 
                        type="color"
                        value={settings.cornerSquareColor}
                        onChange={(e) => updateSetting('cornerSquareColor', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border"
                      />
                      <Input 
                        value={settings.cornerSquareColor}
                        onChange={(e) => updateSetting('cornerSquareColor', e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Internal Eye Pattern Section */}
            {activeSection === 'internal' && (
              <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
                <h4 className="text-xs font-semibold text-purple-700 flex items-center gap-2">
                  <Circle className="w-4 h-4" />
                  Internal Eye Pattern (Titik Dalam Sudut)
                </h4>
                <p className="text-xs text-purple-600">
                  Mengatur tampilan titik kecil di dalam kotak sudut
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bentuk</Label>
                    <Select 
                      value={settings.cornerDotStyle} 
                      onValueChange={(val) => updateSetting('cornerDotStyle', val)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CORNER_DOT_STYLES.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <div className="flex gap-1 mt-1">
                      <input 
                        type="color"
                        value={settings.cornerDotColor}
                        onChange={(e) => updateSetting('cornerDotColor', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border"
                      />
                      <Input 
                        value={settings.cornerDotColor}
                        onChange={(e) => updateSetting('cornerDotColor', e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logo Section */}
            {activeSection === 'logo' && (
              <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                <h4 className="text-xs font-semibold text-green-700 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Logo Instansi
                </h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoEnabled" className="text-xs">Tampilkan Logo</Label>
                  <Switch 
                    id="logoEnabled"
                    checked={settings.logoEnabled}
                    onCheckedChange={(checked) => updateSetting('logoEnabled', checked)}
                  />
                </div>
                
                {settings.logoEnabled && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <Label>Ukuran Logo</Label>
                        <span className="text-gray-500">{settings.logoSize}%</span>
                      </div>
                      <Slider
                        value={[settings.logoSize]}
                        onValueChange={([val]) => updateSetting('logoSize', val)}
                        min={15}
                        max={35}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="logoBgEnabled" className="text-xs">Background Logo (Putih)</Label>
                      <Switch 
                        id="logoBgEnabled"
                        checked={settings.logoBackgroundEnabled}
                        onCheckedChange={(checked) => updateSetting('logoBackgroundEnabled', checked)}
                      />
                    </div>
                    
                    {settings.logoBackgroundEnabled && (
                      <div>
                        <Label className="text-xs">Warna Background Logo</Label>
                        <div className="flex gap-1 mt-1">
                          <input 
                            type="color"
                            value={settings.logoBackgroundColor}
                            onChange={(e) => updateSetting('logoBackgroundColor', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border"
                          />
                          <Input 
                            value={settings.logoBackgroundColor}
                            onChange={(e) => updateSetting('logoBackgroundColor', e.target.value)}
                            className="h-8 text-xs font-mono flex-1"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {instansi?.logo_url && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border">
                    <img src={instansi.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xs text-gray-600">Logo dari Profil Instansi</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Quick Tips */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2 text-xs">
              <Settings2 className="w-3 h-3" />
              Tips Customisasi QR Code
            </h4>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Gunakan <strong>Error Correction High</strong> jika menambahkan logo</li>
              <li>• <strong>Warna kontras tinggi</strong> untuk hasil scan terbaik</li>
              <li>• Logo sebaiknya tidak melebihi <strong>30%</strong> dari ukuran QR</li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

// ==================== STICKER COMPONENTS - REDESIGNED ====================

// Stiker Kecil Component - Ukuran: 2.38cm x 3.98cm (vertical/portrait)
// Sesuai contoh gambar user
const StikerKecil = ({ data, instansi, qrSettings = DEFAULT_QR_SETTINGS }) => {
  // Font sizes for small sticker (in pt)
  const fontSize = {
    namaBarang: '7pt',
    nup: '14pt',
    kodeBarang: '6pt',
    merkTipe: '5pt',
    kodeVertical: '5pt'
  };
  
  return (
    <div 
      className="stiker-kecil bg-white relative overflow-hidden flex flex-col"
      style={{ 
        width: '23.8mm', 
        height: '39.8mm', 
        border: '1px solid #000',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Top: QR Code Area - Full width, fills space */}
      <div 
        className="flex items-center justify-center relative"
        style={{ 
          height: '65%',
          borderBottom: '2px solid #c9a227',
          background: qrSettings?.backgroundColor || '#ffffff',
          padding: '1mm'
        }}
      >
        <StyledQRCode 
          data={data.kode_register || data.kode_barang}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={85}
        />
      </div>
      
      {/* Bottom: Info Area */}
      <div className="flex-1 flex flex-col justify-between p-1 pr-4" style={{ minHeight: 0 }}>
        {/* Nama Barang & NUP */}
        <div className="flex items-start justify-between gap-1">
          <div className="font-bold leading-tight flex-1" style={{ fontSize: fontSize.namaBarang }}>
            {data.nama_barang}
          </div>
          <div className="font-bold" style={{ fontSize: fontSize.nup }}>
            {data.nup || '1'}
          </div>
        </div>
        
        {/* Kode Barang */}
        <div className="font-mono font-bold" style={{ fontSize: fontSize.kodeBarang }}>
          {data.kode_barang}
        </div>
        
        {/* Tahun - Merk/Tipe */}
        <div className="leading-tight" style={{ fontSize: fontSize.merkTipe, color: '#333' }}>
          {data.tahun || new Date().getFullYear()} - {data.merk_tipe || data.merk || ''}
        </div>
      </div>
      
      {/* Vertical Code on Right Edge - NO BORDER */}
      <div 
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ 
          writingMode: 'vertical-rl', 
          fontSize: fontSize.kodeVertical, 
          width: '3.5mm',
          color: '#333',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <span>{data.kode_vertikal}</span>
      </div>
    </div>
  );
};

// Stiker Sedang Component - Ukuran: 6.98cm x 2.21cm (horizontal/landscape)
// Sesuai contoh gambar user
const StikerSedang = ({ data, instansi, qrSettings = DEFAULT_QR_SETTINGS }) => {
  // Font sizes for medium sticker (in pt)
  const fontSize = {
    instansi: '8pt',
    kodeUakpb: '6pt',
    kodeBarang: '9pt',
    nup: '12pt',
    namaBarang: '7pt',
    merkTipe: '6pt',
    warning: '5pt',
    kodeVertical: '6pt'
  };
  
  return (
    <div 
      className="stiker-sedang bg-white relative overflow-hidden flex"
      style={{ 
        width: '69.8mm', 
        height: '22.1mm', 
        border: '1px solid #000',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Left: QR Code Area - Takes ~32% width, fills height */}
      <div 
        className="flex items-center justify-center relative"
        style={{ 
          width: '32%', 
          borderRight: '1px solid #000',
          background: qrSettings?.backgroundColor || '#ffffff'
        }}
      >
        <StyledQRCode 
          data={data.kode_register || data.kode_barang}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={75}
        />
      </div>
      
      {/* Right: Info Area */}
      <div className="flex-1 flex flex-col relative" style={{ minWidth: 0, paddingRight: '4mm' }}>
        {/* Header: Logo + Instansi + Kode UAKPB */}
        <div className="flex items-center border-b px-1" style={{ borderColor: '#c9a227', paddingTop: '0.5mm', paddingBottom: '0.5mm' }}>
          {instansi?.logo_url && (
            <img src={instansi.logo_url} alt="" style={{ height: '5mm', width: '5mm', objectFit: 'contain', marginRight: '1mm' }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: fontSize.instansi }}>
              {instansi?.nama_instansi || 'INSTANSI'}
            </div>
            <div className="font-mono truncate" style={{ fontSize: fontSize.kodeUakpb, color: '#333' }}>
              {instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}
            </div>
          </div>
        </div>
        
        {/* Middle: Kode Barang + NUP */}
        <div className="flex items-center justify-between px-1 border-b border-gray-300" style={{ paddingTop: '0.5mm', paddingBottom: '0.5mm' }}>
          <div className="font-mono font-bold" style={{ fontSize: fontSize.kodeBarang }}>
            {data.kode_barang}
          </div>
          <div className="font-bold" style={{ fontSize: fontSize.nup }}>
            {data.nup || '1'}
          </div>
        </div>
        
        {/* Nama Barang */}
        <div className="px-1" style={{ paddingTop: '0.3mm' }}>
          <div className="font-semibold leading-tight truncate" style={{ fontSize: fontSize.namaBarang }}>
            {data.nama_barang}
          </div>
        </div>
        
        {/* Merk/Tipe */}
        <div className="px-1 flex-1">
          <div className="leading-tight truncate" style={{ fontSize: fontSize.merkTipe, color: '#555' }}>
            {data.merk_tipe || data.merk || ''}
          </div>
        </div>
        
        {/* Footer Warning */}
        <div 
          className="text-center italic border-t border-gray-300"
          style={{ fontSize: fontSize.warning, color: '#dc2626', paddingTop: '0.3mm', paddingBottom: '0.3mm' }}
        >
          Tidak Untuk Diperjualbelikan
        </div>
      </div>
      
      {/* Vertical Code on Right Edge - NO BORDER/BACKGROUND */}
      <div 
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ 
          writingMode: 'vertical-rl', 
          fontSize: fontSize.kodeVertical, 
          width: '4mm',
          color: '#333',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <span>{data.kode_vertikal}</span>
      </div>
    </div>
  );
};

// Stiker Besar Component - Ukuran: 9.49cm x 3.22cm (horizontal/landscape)
// Sesuai contoh gambar user - REDESIGNED to match PDF exactly
const StikerBesar = ({ data, instansi, qrSettings = DEFAULT_QR_SETTINGS }) => {
  // Font sizes for large sticker (in pt)
  const fontSize = {
    instansi: '11pt',
    kodeUakpb: '8pt',
    kodeBarang: '12pt',
    nupLabel: '8pt',
    nup: '14pt',
    namaBarang: '10pt',
    merkTipe: '9pt',
    warning: '7pt',
    kodeVertical: '7pt'
  };
  
  return (
    <div 
      className="stiker-besar bg-white relative overflow-hidden flex"
      style={{ 
        width: '94.9mm', 
        height: '32.2mm', 
        border: '1.5px solid #000',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Left: QR Code Area - Takes ~34% width, fills height */}
      <div 
        className="flex items-center justify-center relative"
        style={{ 
          width: '34%', 
          borderRight: '1px solid #000',
          background: qrSettings?.backgroundColor || '#ffffff'
        }}
      >
        <StyledQRCode 
          data={data.kode_register || data.kode_barang}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={110}
        />
      </div>
      
      {/* Right: Info Area */}
      <div className="flex-1 flex flex-col relative" style={{ minWidth: 0, paddingRight: '5mm' }}>
        {/* Header: Logo + Instansi + Kode UAKPB */}
        <div className="flex items-center border-b px-2" style={{ borderColor: '#c9a227', borderWidth: '2px', paddingTop: '1mm', paddingBottom: '1mm' }}>
          {instansi?.logo_url && (
            <img src={instansi.logo_url} alt="" style={{ height: '7mm', width: '7mm', objectFit: 'contain', marginRight: '2mm' }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: fontSize.instansi }}>
              {instansi?.nama_instansi || 'INSTANSI'}
            </div>
            <div className="font-mono truncate" style={{ fontSize: fontSize.kodeUakpb, color: '#333' }}>
              {instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}
            </div>
          </div>
        </div>
        
        {/* Middle: Kode Barang + NUP */}
        <div className="flex items-center justify-between px-2 border-b border-gray-300" style={{ paddingTop: '1mm', paddingBottom: '1mm' }}>
          <div className="font-mono font-bold" style={{ fontSize: fontSize.kodeBarang }}>
            {data.kode_barang}
          </div>
          <div>
            <span style={{ fontSize: fontSize.nupLabel, color: '#555' }}>NUP : </span>
            <span className="font-bold" style={{ fontSize: fontSize.nup }}>{data.nup || '1'}</span>
          </div>
        </div>
        
        {/* Nama Barang */}
        <div className="px-2" style={{ paddingTop: '0.5mm' }}>
          <div className="font-semibold leading-tight" style={{ fontSize: fontSize.namaBarang }}>
            {data.nama_barang}
          </div>
        </div>
        
        {/* Merk/Tipe */}
        <div className="px-2 flex-1">
          <div className="leading-tight" style={{ fontSize: fontSize.merkTipe, color: '#555' }}>
            {data.merk_tipe || data.merk || ''}
          </div>
        </div>
        
        {/* Footer Warning */}
        <div 
          className="text-center italic border-t border-gray-400"
          style={{ fontSize: fontSize.warning, color: '#dc2626', paddingTop: '0.5mm', paddingBottom: '0.5mm' }}
        >
          Tidak Untuk Diperjualbelikan
        </div>
      </div>
      
      {/* Vertical Code on Right Edge - NO BORDER/BACKGROUND */}
      <div 
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ 
          writingMode: 'vertical-rl', 
          fontSize: fontSize.kodeVertical, 
          width: '5mm',
          color: '#333',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <span>{data.kode_vertikal}</span>
      </div>
    </div>
  );
};

// ==================== PRINT CANVAS COMPONENT ====================
const PrintCanvas = ({ items, canvasSize, instansi, qrSettings, onClose, onPrintComplete }) => {
  const printRef = useRef(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Small delay to ensure QR codes are rendered
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [items]);
  
  const canvas = CANVAS_SIZES[canvasSize];
  
  // Calculate grid layout with minimal margins
  const calculateGrid = useCallback(() => {
    if (items.length === 0) return { cols: 0, rows: 0, itemsPerPage: 0 };
    
    const size = STICKER_SIZES[items[0].ukuran];
    const usableWidth = canvas.width - (2 * MARGIN);
    const usableHeight = canvas.height - (2 * MARGIN);
    
    const cols = Math.floor((usableWidth + GAP) / (size.width + GAP));
    const rows = Math.floor((usableHeight + GAP) / (size.height + GAP));
    
    return { cols: Math.max(cols, 1), rows: Math.max(rows, 1), itemsPerPage: Math.max(cols * rows, 1) };
  }, [items, canvasSize, canvas]);
  
  const { cols, rows, itemsPerPage } = calculateGrid();
  const pages = Math.ceil(items.length / itemsPerPage) || 1;
  
  // Prepare sticker data
  const prepareStickerData = (item) => ({
    ...item,
    kode_register: item.kode_register || item.kode_barang,
    kode_vertikal: `${item.kode_barang?.substring(0, 6) || '000000'}T/${item.nup || '1'}/${item.tahun || new Date().getFullYear()}`,
    merk_tipe: item.merk && item.tipe 
      ? `${item.merk} - ${item.tipe}` 
      : item.merk || item.tipe || '',
    tahun: item.tahun_anggaran || item.tgl_perolehan?.substring(0, 4) || new Date().getFullYear()
  });
  
  const handlePrint = () => {
    window.print();
    // Call onPrintComplete after printing
    if (onPrintComplete) {
      setTimeout(() => onPrintComplete(), 500);
    }
  };
  
  const renderSticker = (item, stickerData) => {
    switch (item.ukuran) {
      case 'kecil':
        return <StikerKecil data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
      case 'sedang':
        return <StikerSedang data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
      case 'besar':
      default:
        return <StikerBesar data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Generating QR Codes...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-auto">
      {/* Action Bar */}
      <div className="no-print sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
        <div>
          <h2 className="font-bold">Preview Cetak Label ({items.length} stiker)</h2>
          <p className="text-sm text-gray-500">
            Canvas: {canvasSize} | {cols}x{rows} per halaman | {pages} halaman total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Cetak Semua ({pages} Halaman)
          </Button>
        </div>
      </div>
      
      {/* Print Content */}
      <div ref={printRef} className="print-content p-4">
        {Array.from({ length: pages }).map((_, pageIdx) => {
          const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
          const size = STICKER_SIZES[items[0].ukuran];
          
          return (
            <div 
              key={pageIdx}
              className="print-page bg-white mx-auto mb-4 relative"
              style={{ 
                width: `${canvas.width}mm`, 
                height: `${canvas.height}mm`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                pageBreakAfter: 'always'
              }}
            >
              {/* Page Number - No Print */}
              <div className="no-print absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                Halaman {pageIdx + 1} dari {pages}
              </div>
              
              {/* Crop Marks */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                {/* Corner marks */}
                <line x1="0" y1={`${CROP_MARK_LENGTH}mm`} x2="0" y2="0" stroke="black" strokeWidth="0.3" />
                <line x1="0" y1="0" x2={`${CROP_MARK_LENGTH}mm`} y2="0" stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1={`${CROP_MARK_LENGTH}mm`} x2={`${canvas.width}mm`} y2="0" stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1="0" x2={`${canvas.width - CROP_MARK_LENGTH}mm`} y2="0" stroke="black" strokeWidth="0.3" />
                <line x1="0" y1={`${canvas.height - CROP_MARK_LENGTH}mm`} x2="0" y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
                <line x1="0" y1={`${canvas.height}mm`} x2={`${CROP_MARK_LENGTH}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1={`${canvas.height - CROP_MARK_LENGTH}mm`} x2={`${canvas.width}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1={`${canvas.height}mm`} x2={`${canvas.width - CROP_MARK_LENGTH}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
              </svg>
              
              {/* Stickers Grid */}
              <div 
                className="absolute grid"
                style={{ 
                  left: `${MARGIN}mm`, 
                  top: `${MARGIN}mm`,
                  gap: `${GAP}mm`,
                  gridTemplateColumns: `repeat(${cols}, ${size.width}mm)`
                }}
              >
                {pageItems.map((item, idx) => {
                  const stickerData = prepareStickerData(item);
                  return (
                    <div key={idx}>
                      {renderSticker(item, stickerData)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { 
            page-break-after: always;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          @page {
            size: ${canvasSize};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

// ==================== CHILD ASSET MODAL ====================
const ChildAssetModal = ({ open, onClose, parentAsset, onSuccess }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newChild, setNewChild] = useState({ nama_aksesori: '', keterangan: '' });
  
  const loadChildren = async () => {
    if (!parentAsset?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/label-bmn/child-assets/${parentAsset.id}`);
      setChildren(res.data);
    } catch (err) {
      toast.error('Gagal memuat data aksesori');
    }
    setLoading(false);
  };
  
  useEffect(() => {
    if (open && parentAsset) {
      loadChildren();
    }
  }, [open, parentAsset]);
  
  const handleAddChild = async () => {
    if (!newChild.nama_aksesori.trim()) {
      toast.error('Nama aksesori harus diisi');
      return;
    }
    
    try {
      await api.post('/api/label-bmn/child-asset', {
        parent_barang_id: parentAsset.id,
        nama_aksesori: newChild.nama_aksesori,
        keterangan: newChild.keterangan
      });
      toast.success('Aksesori berhasil ditambahkan');
      setNewChild({ nama_aksesori: '', keterangan: '' });
      loadChildren();
      onSuccess?.();
    } catch (err) {
      toast.error('Gagal menambah aksesori');
    }
  };
  
  const handleDeleteChild = async (childId) => {
    if (!confirm('Hapus aksesori ini?')) return;
    
    try {
      await api.delete(`/api/label-bmn/child-asset/${childId}`);
      toast.success('Aksesori dihapus');
      loadChildren();
      onSuccess?.();
    } catch (err) {
      toast.error('Gagal menghapus aksesori');
    }
  };
  
  const AKSESORI_PRESETS = [
    'Charger/Adaptor', 'Tas Laptop', 'Mouse', 'Keyboard', 'Kabel Power',
    'Baterai Cadangan', 'Docking Station', 'USB Hub', 'Headset', 'Webcam',
    'Remote Control', 'Kabel Data', 'Stand/Bracket', 'Cover/Case'
  ];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Kelola Aksesori - {parentAsset?.nama_barang}
          </DialogTitle>
          <DialogDescription>
            Kode Induk: #{parentAsset?.kode_register || parentAsset?.kode_barang}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add New Child */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Tambah Aksesori Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1 mb-2">
                {AKSESORI_PRESETS.map((preset) => (
                  <Badge 
                    key={preset}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50"
                    onClick={() => setNewChild({ ...newChild, nama_aksesori: preset })}
                  >
                    {preset}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Nama aksesori (cth: Charger Laptop)"
                  value={newChild.nama_aksesori}
                  onChange={(e) => setNewChild({ ...newChild, nama_aksesori: e.target.value })}
                  className="flex-1"
                />
                <Input 
                  placeholder="Keterangan (opsional)"
                  value={newChild.keterangan}
                  onChange={(e) => setNewChild({ ...newChild, keterangan: e.target.value })}
                  className="flex-1"
                />
                <Button onClick={handleAddChild}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Children List */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-2">Nama Aksesori</th>
                  <th className="text-left p-2">Kode Label</th>
                  <th className="text-center p-2">Cetak</th>
                  <th className="text-center p-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center p-4">Memuat...</td></tr>
                ) : children.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-4 text-gray-500">Belum ada aksesori</td></tr>
                ) : children.map((child) => (
                  <tr key={child.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{child.nama_aksesori}</div>
                      {child.keterangan && <div className="text-xs text-gray-500">{child.keterangan}</div>}
                    </td>
                    <td className="p-2">
                      <code className="bg-slate-100 px-1 rounded text-xs">#{child.kode_register_anak}</code>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant={child.print_count > 0 ? 'default' : 'secondary'}>
                        {child.print_count}x
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteChild(child.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== MAIN COMPONENT ====================
export default function LabelBMN() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [instansi, setInstansi] = useState(null);
  
  // Selection
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedSize, setSelectedSize] = useState('sedang');
  const [canvasSize, setCanvasSize] = useState('A4');
  
  // QR Settings (Advanced)
  const [qrSettings, setQrSettings] = useState(DEFAULT_QR_SETTINGS);
  
  // Modals
  const [showPrintCanvas, setShowPrintCanvas] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeTab, setActiveTab] = useState('daftar');
  
  // Load data
  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/label-bmn/assets', {
        params: { search, status_cetak: statusFilter, page, limit: 50 }
      });
      setAssets(res.data.data);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      toast.error('Gagal memuat data aset');
    }
    setLoading(false);
  };
  
  const loadStats = async () => {
    try {
      const res = await api.get('/api/label-bmn/print-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };
  
  const loadInstansi = async () => {
    try {
      const res = await api.get('/api/label-bmn/instansi-info');
      setInstansi(res.data);
    } catch (err) {
      console.error('Failed to load instansi info');
    }
  };
  
  useEffect(() => {
    loadAssets();
  }, [search, statusFilter, page]);
  
  useEffect(() => {
    loadStats();
    loadInstansi();
  }, []);
  
  // Selection handlers
  const toggleSelect = (asset) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === asset.id);
      if (exists) {
        return prev.filter((i) => i.id !== asset.id);
      }
      return [...prev, { ...asset, ukuran: selectedSize }];
    });
  };
  
  const selectAll = () => {
    if (selectedItems.length === assets.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(assets.map((a) => ({ ...a, ukuran: selectedSize })));
    }
  };
  
  const handlePrint = async () => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal 1 aset untuk dicetak');
      return;
    }
    setShowPrintCanvas(true);
  };
  
  const handlePrintComplete = async () => {
    try {
      await api.post('/api/label-bmn/print-batch', {
        items: selectedItems.map((item) => ({
          barang_id: item.id,
          ukuran: item.ukuran,
          is_child: false
        })),
        canvas_size: canvasSize
      });
      toast.success('Pencetakan berhasil dicatat');
      loadAssets();
      loadStats();
      setSelectedItems([]);
    } catch (err) {
      toast.error('Gagal mencatat pencetakan');
    }
    setShowPrintCanvas(false);
  };
  
  const openChildModal = (asset) => {
    setSelectedParent(asset);
    setShowChildModal(true);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Manajemen Label BMN
          </h1>
          <p className="text-slate-500 mt-1">Cetak stiker identitas aset dengan QR Code</p>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="flex gap-3">
            <Card className="px-4 py-2">
              <div className="text-xs text-gray-500">Total Aset</div>
              <div className="text-xl font-bold">{stats.total_assets}</div>
            </Card>
            <Card className="px-4 py-2 bg-green-50 border-green-200">
              <div className="text-xs text-green-600">Sudah Cetak</div>
              <div className="text-xl font-bold text-green-700">{stats.assets_printed}</div>
            </Card>
            <Card className="px-4 py-2 bg-amber-50 border-amber-200">
              <div className="text-xs text-amber-600">Belum Cetak</div>
              <div className="text-xl font-bold text-amber-700">{stats.assets_not_printed}</div>
            </Card>
            <Card className="px-4 py-2 bg-purple-50 border-purple-200">
              <div className="text-xs text-purple-600">Aksesori</div>
              <div className="text-xl font-bold text-purple-700">{stats.total_child_assets}</div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daftar" className="flex items-center gap-1">
            <LayoutGrid className="w-4 h-4" />
            Daftar Aset
          </TabsTrigger>
          <TabsTrigger value="qr-settings" className="flex items-center gap-1">
            <Palette className="w-4 h-4" />
            Customisasi QR
          </TabsTrigger>
          <TabsTrigger value="cetak" className="flex items-center gap-1">
            <Printer className="w-4 h-4" />
            Antrian Cetak ({selectedItems.length})
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            Riwayat Cetak
          </TabsTrigger>
        </TabsList>
        
        {/* TAB: QR Settings */}
        <TabsContent value="qr-settings" className="space-y-4">
          <QRSettingsPanel 
            settings={qrSettings}
            onChange={setQrSettings}
            instansi={instansi}
            previewText={selectedItems[0]?.kode_register || selectedItems[0]?.kode_barang || "SAMPLE001"}
          />
        </TabsContent>
        
        {/* TAB: Daftar Aset */}
        <TabsContent value="daftar" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Cari Aset</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Nama, kode, merk..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="w-40">
                  <Label className="text-xs">Status Cetak</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua</SelectItem>
                      <SelectItem value="belum_cetak">Belum Cetak</SelectItem>
                      <SelectItem value="sudah_cetak">Sudah Cetak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-48">
                  <Label className="text-xs">Ukuran Stiker Default</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STICKER_SIZES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label} - {val.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-40">
                  <Label className="text-xs">Ukuran Kertas</Label>
                  <Select value={canvasSize} onValueChange={setCanvasSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CANVAS_SIZES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={loadAssets} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedItems.length === assets.length && assets.length > 0}
                onCheckedChange={selectAll}
              />
              <span className="text-sm text-gray-500">
                {selectedItems.length} aset dipilih
              </span>
            </div>
            
            <Button onClick={handlePrint} disabled={selectedItems.length === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Cetak Label ({selectedItems.length})
            </Button>
          </div>
          
          {/* Assets Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-10 p-3"></th>
                    <th className="text-left p-3">Kode / Nama Barang</th>
                    <th className="text-left p-3">Merk / Tipe</th>
                    <th className="text-center p-3">Status Label</th>
                    <th className="text-center p-3">Aksesori</th>
                    <th className="text-center p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center p-8">Memuat data...</td></tr>
                  ) : assets.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-gray-500">Tidak ada data</td></tr>
                  ) : assets.map((asset) => {
                    const isSelected = selectedItems.some((i) => i.id === asset.id);
                    return (
                      <tr key={asset.id} className={`border-t ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(asset)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{asset.nama_barang}</div>
                          <div className="text-xs text-gray-500">
                            <code className="bg-slate-100 px-1 rounded">
                              #{asset.kode_register || asset.kode_barang}
                            </code>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>{asset.merk || '-'}</div>
                          <div className="text-xs text-gray-500">{asset.tipe || ''}</div>
                        </td>
                        <td className="text-center p-3">
                          {asset.print_count > 0 ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {asset.print_count}x
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Belum
                            </Badge>
                          )}
                        </td>
                        <td className="text-center p-3">
                          {asset.children?.length > 0 ? (
                            <Badge variant="outline" className="cursor-pointer" onClick={() => openChildModal(asset)}>
                              <Link2 className="w-3 h-3 mr-1" />
                              {asset.children.length}
                            </Badge>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => openChildModal(asset)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                        <td className="text-center p-3">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openChildModal(asset)}
                              title="Kelola Aksesori"
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedItems([{ ...asset, ukuran: selectedSize }]);
                                setShowPrintCanvas(true);
                              }}
                              title="Preview & Cetak"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Sebelumnya
                </Button>
                <span className="px-3 py-1 text-sm">
                  Halaman {page} dari {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* TAB: Antrian Cetak */}
        <TabsContent value="cetak" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Antrian Cetak ({selectedItems.length} stiker)</span>
                <div className="flex gap-2">
                  <Select value={canvasSize} onValueChange={setCanvasSize}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CANVAS_SIZES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handlePrint} disabled={selectedItems.length === 0}>
                    <Printer className="w-4 h-4 mr-2" />
                    Cetak
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Belum ada aset di antrian cetak</p>
                  <p className="text-sm">Pilih aset dari tab Daftar Aset</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                      <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="font-medium">{item.nama_barang}</div>
                        <div className="text-xs text-gray-500">
                          #{item.kode_register || item.kode_barang}
                        </div>
                      </div>
                      <Select 
                        value={item.ukuran} 
                        onValueChange={(val) => {
                          setSelectedItems((prev) => 
                            prev.map((i) => i.id === item.id ? { ...i, ukuran: val } : i)
                          );
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STICKER_SIZES).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB: Riwayat */}
        <TabsContent value="riwayat">
          <PrintHistoryTab />
        </TabsContent>
      </Tabs>
      
      {/* Print Canvas Modal */}
      {showPrintCanvas && (
        <PrintCanvas 
          items={selectedItems}
          canvasSize={canvasSize}
          instansi={instansi}
          qrSettings={qrSettings}
          onClose={() => setShowPrintCanvas(false)}
          onPrintComplete={handlePrintComplete}
        />
      )}
      
      {/* Child Asset Modal */}
      <ChildAssetModal 
        open={showChildModal}
        onClose={() => setShowChildModal(false)}
        parentAsset={selectedParent}
        onSuccess={() => loadAssets()}
      />
    </div>
  );
}

// ==================== PRINT HISTORY TAB ====================
function PrintHistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/label-bmn/print-history', { params: { limit: 100 } });
        setHistory(res.data.data);
      } catch (err) {
        toast.error('Gagal memuat riwayat');
      }
      setLoading(false);
    };
    loadHistory();
  }, []);
  
  if (loading) {
    return <div className="text-center py-8">Memuat riwayat...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Pencetakan Label</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Belum ada riwayat pencetakan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-3">Waktu Cetak</th>
                  <th className="text-left p-3">Nama Barang</th>
                  <th className="text-left p-3">Kode</th>
                  <th className="text-center p-3">Ukuran</th>
                  <th className="text-left p-3">Dicetak Oleh</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      {new Date(log.printed_at).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3">
                      {log.barang?.nama_barang || '-'}
                    </td>
                    <td className="p-3">
                      <code className="bg-slate-100 px-1 rounded text-xs">
                        #{log.barang?.kode_register || log.barang_id}
                      </code>
                    </td>
                    <td className="text-center p-3">
                      <Badge variant="outline">
                        {STICKER_SIZES[log.ukuran]?.label || log.ukuran}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-500">
                      {log.printed_by || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
