/**
 * LabelBMN.jsx - Halaman Manajemen Pelabelan Stiker BMN
 * Desain stiker berdasarkan analisis dokumen Word dan gambar contoh
 * 
 * Ukuran Stiker:
 * - Kecil: 2.38cm x 3.98cm (portrait) - QR 72% atas, Info 28% bawah
 * - Sedang: 6.98cm x 2.21cm (landscape) - QR 50%, Info 50%
 * - Besar: 9.49cm x 3.22cm (landscape) - QR 50%, Info 50%
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { 
  Printer, Search, Plus, Trash2, Package, Tag, QrCode, 
  CheckCircle2, XCircle, History, LayoutGrid, Settings2,
  Link2, RefreshCw, Eye, Palette, Image, ChevronDown, ChevronUp, Square, Circle
} from 'lucide-react';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';

// ==================== CONSTANTS ====================
const STICKER_SIZES = {
  kecil: { width: 23.8, height: 39.8, label: 'Kecil (2.38x3.98cm)', desc: 'Aksesori' },
  sedang: { width: 69.8, height: 22.1, label: 'Sedang (6.98x2.21cm)', desc: 'Standar' },
  besar: { width: 94.9, height: 32.2, label: 'Besar (9.49x3.22cm)', desc: 'Mesin Besar' }
};

const CANVAS_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210x297mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297x420mm)' }
};

const CROP_MARK_LENGTH = 3;
const MARGIN = 5;
const GAP = 2;

// QR Code Options
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

const DEFAULT_QR_SETTINGS = {
  size: 200,
  margin: 0,
  dotsColor: '#000000',
  dotsStyle: 'square',
  cornerSquareColor: '#000000',
  cornerSquareStyle: 'square',
  cornerDotColor: '#000000',
  cornerDotStyle: 'square',
  backgroundColor: '#ffffff',
  logoEnabled: true,
  logoSize: 25,
  logoBackgroundEnabled: true,
  logoBackgroundColor: '#ffffff',
  errorCorrectionLevel: 'M'
};

const ERROR_CORRECTION_LEVELS = [
  { value: 'L', label: 'Low (7%)' },
  { value: 'M', label: 'Medium (15%)' },
  { value: 'Q', label: 'Quartile (25%)' },
  { value: 'H', label: 'High (30%)' }
];

const COLOR_PRESETS = [
  { name: 'Klasik', dots: '#000000', corner: '#000000', bg: '#ffffff' },
  { name: 'Biru Tua', dots: '#1a365d', corner: '#0f172a', bg: '#ffffff' },
  { name: 'Hijau', dots: '#166534', corner: '#14532d', bg: '#ffffff' },
  { name: 'Merah', dots: '#991b1b', corner: '#7f1d1d', bg: '#ffffff' },
];

// ==================== QR CODE COMPONENT ====================
const StyledQRCode = ({ data, settings, logoUrl, size = 200 }) => {
  const qrRef = useRef(null);

  useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.innerHTML = '';

    const qrOptions = {
      width: size,
      height: size,
      type: 'svg',
      data: data || 'SAMPLE001',
      margin: settings.margin || 0,
      qrOptions: { errorCorrectionLevel: settings.errorCorrectionLevel || 'M' },
      dotsOptions: { color: settings.dotsColor || '#000000', type: settings.dotsStyle || 'square' },
      cornersSquareOptions: { color: settings.cornerSquareColor || '#000000', type: settings.cornerSquareStyle || 'square' },
      cornersDotOptions: { color: settings.cornerDotColor || '#000000', type: settings.cornerDotStyle || 'square' },
      backgroundOptions: { color: settings.backgroundColor || '#ffffff' }
    };

    if (settings.logoEnabled && logoUrl) {
      qrOptions.image = logoUrl;
      qrOptions.imageOptions = {
        crossOrigin: 'anonymous',
        margin: settings.logoBackgroundEnabled ? 2 : 0,
        imageSize: (settings.logoSize || 25) / 100,
        hideBackgroundDots: true
      };
    }

    const qrCode = new QRCodeStyling(qrOptions);
    qrCode.append(qrRef.current);
  }, [data, settings, logoUrl, size]);

  return <div ref={qrRef} style={{ width: size, height: size }} />;
};

// ==================== STICKER COMPONENTS - EXACT MATCH TO SAMPLES ====================

/**
 * Stiker KECIL - 2.38cm x 3.98cm (Portrait/Vertical)
 * Layout: QR 72% atas, Info 28% bawah
 * Golden divider antara QR dan info
 */
const StikerKecil = ({ data, instansi, qrSettings = DEFAULT_QR_SETTINGS }) => {
  return (
    <div 
      className="stiker-kecil bg-white relative overflow-hidden flex flex-col"
      style={{ 
        width: '23.8mm', 
        height: '39.8mm', 
        border: '0.5pt solid #000',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* QR Code Area - 72% height */}
      <div 
        className="flex items-center justify-center"
        style={{ 
          height: '72%',
          background: qrSettings?.backgroundColor || '#ffffff',
          padding: '1mm'
        }}
      >
        <StyledQRCode 
          data={data.kode_register || data.kode_barang}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={100}
        />
      </div>
      
      {/* Golden Divider */}
      <div style={{ height: '1.5pt', background: '#c9a227' }} />
      
      {/* Info Area - 28% height */}
      <div className="flex-1 flex flex-col px-1" style={{ paddingRight: '3.5mm', paddingTop: '0.5mm' }}>
        {/* Row 1: Nama Barang + NUP */}
        <div className="flex items-start justify-between">
          <div className="font-bold leading-tight flex-1 line-clamp-1" style={{ fontSize: '7pt' }}>
            {data.nama_barang}
          </div>
          <div className="font-bold ml-1" style={{ fontSize: '14pt', lineHeight: 1 }}>
            {data.nup || '1'}
          </div>
        </div>
        
        {/* Row 2: Kode Barang */}
        <div className="font-mono font-semibold" style={{ fontSize: '6pt' }}>
          {data.kode_barang}
        </div>
        
        {/* Row 3: Tahun - Merk */}
        <div className="leading-tight truncate" style={{ fontSize: '5pt', color: '#333' }}>
          {data.tahun || new Date().getFullYear()} - {data.merk_tipe || data.merk || '-'}
        </div>
      </div>
      
      {/* Vertical Code Strip - 8-10% width, NO BORDER */}
      <div 
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ 
          writingMode: 'vertical-rl', 
          fontSize: '5pt', 
          width: '3mm',
          color: '#333'
        }}
      >
        {data.kode_vertikal}
      </div>
    </div>
  );
};

/**
 * Stiker SEDANG - 6.98cm x 2.21cm (Landscape/Horizontal)
 * Layout: QR 50-55% kiri, Info 45-50% kanan
 * TIDAK ADA golden divider (hanya garis hitam)
 * NUP: Angka besar di kanan (bukan format "NUP : X")
 */
const StikerSedang = ({ data, instansi, qrSettings = DEFAULT_QR_SETTINGS }) => {
  return (
    <div 
      className="stiker-sedang bg-white relative overflow-hidden flex"
      style={{ 
        width: '69.8mm', 
        height: '22.1mm', 
        border: '0.5pt solid #000',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* QR Code Area - 50% width */}
      <div 
        className="flex items-center justify-center"
        style={{ 
          width: '50%', 
          borderRight: '0.5pt solid #000',
          background: qrSettings?.backgroundColor || '#ffffff'
        }}
      >
        <StyledQRCode 
          data={data.kode_register || data.kode_barang}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={78}
        />
      </div>
      
      {/* Info Area - 50% width */}
      <div className="flex-1 flex flex-col relative" style={{ paddingRight: '4.5mm' }}>
        {/* Header: Instansi + Kode UAKPB */}
        <div 
          className="flex items-center px-1 border-b border-black"
          style={{ paddingTop: '0.8mm', paddingBottom: '0.5mm' }}
        >
          {instansi?.logo_url && (
            <img src={instansi.logo_url} alt="" style={{ height: '4mm', width: '4mm', marginRight: '1mm' }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: '8pt' }}>
              {instansi?.nama_instansi || 'INSTANSI'}
            </div>
            <div className="font-mono truncate" style={{ fontSize: '6pt', color: '#333' }}>
              {instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}
            </div>
          </div>
        </div>
        
        {/* Row 2: Kode Barang + NUP (angka besar) */}
        <div 
          className="flex items-center justify-between px-1 border-b border-black"
          style={{ paddingTop: '0.3mm', paddingBottom: '0.3mm' }}
        >
          <div className="font-mono font-bold" style={{ fontSize: '9pt' }}>
            {data.kode_barang}
          </div>
          <div className="font-bold" style={{ fontSize: '13pt', lineHeight: 1 }}>
            {data.nup || '1'}
          </div>
        </div>
        
        {/* Row 3: Nama Barang */}
        <div className="px-1" style={{ paddingTop: '0.3mm' }}>
          <div className="font-semibold truncate" style={{ fontSize: '7pt' }}>
            {data.nama_barang}
          </div>
        </div>
        
        {/* Row 4: Merk/Brand */}
        <div className="px-1 flex-1">
          <div className="truncate" style={{ fontSize: '6pt', color: '#555' }}>
            {data.merk || '-'}
          </div>
        </div>
        
        {/* Footer: Tidak Untuk Diperjualbelikan */}
        <div 
          className="text-center font-bold border-t border-black"
          style={{ fontSize: '5pt', color: '#dc2626', paddingTop: '0.3mm', paddingBottom: '0.3mm' }}
        >
          Tidak Untuk Diperjualbelikan
        </div>
      </div>
      
      {/* Vertical Code Strip - 6-8% width, NO BORDER */}
      <div 
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ 
          writingMode: 'vertical-rl', 
          fontSize: '6pt', 
          width: '4mm',
          color: '#333'
        }}
      >
        {data.kode_vertikal}
      </div>
    </div>
  );
};

/**
 * Stiker BESAR - 9.49cm x 3.22cm (Landscape/Horizontal)
 * Layout: QR 50% kiri, Info 50% kanan
 * Golden divider di bawah header
 * NUP: Format "NUP : X" di sebelah kanan kode barang
 */
const StikerBesar = ({ data, instansi, qrSettings = DEFAULT_QR_SETTINGS }) => {
  return (
    <div 
      className="stiker-besar bg-white relative overflow-hidden flex"
      style={{ 
        width: '94.9mm', 
        height: '32.2mm', 
        border: '0.5pt solid #000',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* QR Code Area - 50% width */}
      <div 
        className="flex items-center justify-center"
        style={{ 
          width: '50%', 
          borderRight: '0.5pt solid #000',
          background: qrSettings?.backgroundColor || '#ffffff'
        }}
      >
        <StyledQRCode 
          data={data.kode_register || data.kode_barang}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={115}
        />
      </div>
      
      {/* Info Area - 50% width */}
      <div className="flex-1 flex flex-col relative" style={{ paddingRight: '5mm' }}>
        {/* Header: Logo + Instansi + Kode UAKPB */}
        <div 
          className="flex items-center px-1.5"
          style={{ paddingTop: '1mm', paddingBottom: '0.8mm' }}
        >
          {instansi?.logo_url && (
            <img src={instansi.logo_url} alt="" style={{ height: '6mm', width: '6mm', marginRight: '1.5mm' }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ fontSize: '11pt' }}>
              {instansi?.nama_instansi || 'INSTANSI'}
            </div>
            <div className="font-mono truncate" style={{ fontSize: '8pt', color: '#333' }}>
              {instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}
            </div>
          </div>
        </div>
        
        {/* Golden Divider */}
        <div style={{ height: '2pt', background: '#c9a227' }} />
        
        {/* Row 2: Kode Barang + NUP */}
        <div 
          className="flex items-center justify-between px-1.5 border-b border-black"
          style={{ paddingTop: '0.8mm', paddingBottom: '0.5mm' }}
        >
          <div className="font-mono font-bold" style={{ fontSize: '11pt' }}>
            {data.kode_barang}
          </div>
          <div style={{ fontSize: '11pt' }}>
            <span style={{ color: '#555' }}>NUP : </span>
            <span className="font-bold">{data.nup || '1'}</span>
          </div>
        </div>
        
        {/* Row 3: Nama Barang */}
        <div className="px-1.5" style={{ paddingTop: '0.5mm' }}>
          <div className="font-semibold" style={{ fontSize: '10pt' }}>
            {data.nama_barang}
          </div>
        </div>
        
        {/* Row 4: Deskripsi/Merk/Tipe */}
        <div className="px-1.5 flex-1">
          <div className="line-clamp-2" style={{ fontSize: '8pt', color: '#555' }}>
            {data.merk_tipe || data.merk || '-'}
          </div>
        </div>
        
        {/* Footer: Tidak Untuk Diperjualbelikan */}
        <div 
          className="text-center font-bold border-t border-black"
          style={{ fontSize: '7pt', color: '#dc2626', paddingTop: '0.5mm', paddingBottom: '0.5mm' }}
        >
          Tidak Untuk Diperjualbelikan
        </div>
      </div>
      
      {/* Vertical Code Strip - 5% width, NO BORDER */}
      <div 
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ 
          writingMode: 'vertical-rl', 
          fontSize: '7pt', 
          width: '4.5mm',
          color: '#333'
        }}
      >
        {data.kode_vertikal}
      </div>
    </div>
  );
};

// ==================== QR SETTINGS PANEL ====================
const QRSettingsPanel = ({ settings, onChange, instansi, previewText = "SAMPLE001" }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeSection, setActiveSection] = useState('body');
  
  const updateSetting = (key, value) => onChange({ ...settings, [key]: value });
  
  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="py-3 border-b bg-blue-100/50">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="w-4 h-4 text-blue-600" />
          Customisasi QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1">Preview</div>
            <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
              <StyledQRCode data={previewText} settings={settings} logoUrl={instansi?.logo_url} size={150} />
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label>Ukuran (px)</Label>
                <span className="text-gray-500">{settings.size}px</span>
              </div>
              <Slider value={[settings.size]} onValueChange={([val]) => updateSetting('size', val)} min={100} max={400} step={10} />
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label>Margin</Label>
                <span className="text-gray-500">{settings.margin}</span>
              </div>
              <Slider value={[settings.margin]} onValueChange={([val]) => updateSetting('margin', val)} min={0} max={4} step={1} />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Error Correction</Label>
              <Select value={settings.errorCorrectionLevel} onValueChange={(val) => updateSetting('errorCorrectionLevel', val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ERROR_CORRECTION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
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
              >
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: preset.dots }} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Opsi Lanjutan (Pattern & Style)
        </button>
        
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t">
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
                    activeSection === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>

            {activeSection === 'body' && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700">Body Pattern</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bentuk</Label>
                    <Select value={settings.dotsStyle} onValueChange={(val) => updateSetting('dotsStyle', val)}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{DOT_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <div className="flex gap-1 mt-1">
                      <input type="color" value={settings.dotsColor} onChange={(e) => updateSetting('dotsColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
                      <Input value={settings.dotsColor} onChange={(e) => updateSetting('dotsColor', e.target.value)} className="h-8 text-xs font-mono flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'external' && (
              <div className="space-y-3 p-3 bg-orange-50 rounded-lg">
                <h4 className="text-xs font-semibold text-orange-700">External Eye Pattern</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bentuk</Label>
                    <Select value={settings.cornerSquareStyle} onValueChange={(val) => updateSetting('cornerSquareStyle', val)}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{CORNER_SQUARE_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <div className="flex gap-1 mt-1">
                      <input type="color" value={settings.cornerSquareColor} onChange={(e) => updateSetting('cornerSquareColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
                      <Input value={settings.cornerSquareColor} onChange={(e) => updateSetting('cornerSquareColor', e.target.value)} className="h-8 text-xs font-mono flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'internal' && (
              <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
                <h4 className="text-xs font-semibold text-purple-700">Internal Eye Pattern</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bentuk</Label>
                    <Select value={settings.cornerDotStyle} onValueChange={(val) => updateSetting('cornerDotStyle', val)}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{CORNER_DOT_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <div className="flex gap-1 mt-1">
                      <input type="color" value={settings.cornerDotColor} onChange={(e) => updateSetting('cornerDotColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
                      <Input value={settings.cornerDotColor} onChange={(e) => updateSetting('cornerDotColor', e.target.value)} className="h-8 text-xs font-mono flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'logo' && (
              <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                <h4 className="text-xs font-semibold text-green-700">Logo Instansi</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Tampilkan Logo</Label>
                  <Switch checked={settings.logoEnabled} onCheckedChange={(checked) => updateSetting('logoEnabled', checked)} />
                </div>
                {settings.logoEnabled && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <Label>Ukuran Logo</Label>
                        <span className="text-gray-500">{settings.logoSize}%</span>
                      </div>
                      <Slider value={[settings.logoSize]} onValueChange={([val]) => updateSetting('logoSize', val)} min={15} max={35} step={5} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Background Logo (Putih)</Label>
                      <Switch checked={settings.logoBackgroundEnabled} onCheckedChange={(checked) => updateSetting('logoBackgroundEnabled', checked)} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== PRINT CANVAS ====================
const PrintCanvas = ({ items, canvasSize, instansi, qrSettings, onClose, onPrintComplete }) => {
  const [loading, setLoading] = useState(true);
  const canvas = CANVAS_SIZES[canvasSize];
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [items]);
  
  const calculateGrid = useCallback(() => {
    if (items.length === 0) return { cols: 0, rows: 0, itemsPerPage: 0 };
    const size = STICKER_SIZES[items[0].ukuran];
    const usableWidth = canvas.width - (2 * MARGIN);
    const usableHeight = canvas.height - (2 * MARGIN);
    const cols = Math.floor((usableWidth + GAP) / (size.width + GAP));
    const rows = Math.floor((usableHeight + GAP) / (size.height + GAP));
    return { cols: Math.max(cols, 1), rows: Math.max(rows, 1), itemsPerPage: Math.max(cols * rows, 1) };
  }, [items, canvas]);
  
  const { cols, rows, itemsPerPage } = calculateGrid();
  const pages = Math.ceil(items.length / itemsPerPage) || 1;
  
  const prepareStickerData = (item) => ({
    ...item,
    kode_register: item.kode_register || item.kode_barang,
    kode_vertikal: `${item.kode_barang?.substring(0, 6) || '000000'}T/${item.nup || '1'}/${item.tahun || new Date().getFullYear()}`,
    merk_tipe: item.merk && item.tipe ? `${item.merk} - ${item.tipe}` : item.merk || item.tipe || '',
    tahun: item.tahun_anggaran || item.tgl_perolehan?.substring(0, 4) || new Date().getFullYear()
  });
  
  const handlePrint = () => {
    window.print();
    if (onPrintComplete) setTimeout(() => onPrintComplete(), 500);
  };
  
  const renderSticker = (item, stickerData) => {
    switch (item.ukuran) {
      case 'kecil': return <StikerKecil data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
      case 'sedang': return <StikerSedang data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
      default: return <StikerBesar data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Generating QR Codes...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-auto">
      <div className="no-print sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
        <div>
          <h2 className="font-bold">Preview Cetak Label ({items.length} stiker)</h2>
          <p className="text-sm text-gray-500">Canvas: {canvasSize} | {cols}x{rows} per halaman | {pages} halaman</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />Cetak Semua ({pages} Halaman)
          </Button>
        </div>
      </div>
      
      <div className="print-content p-4">
        {Array.from({ length: pages }).map((_, pageIdx) => {
          const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
          const size = STICKER_SIZES[items[0].ukuran];
          
          return (
            <div key={pageIdx} className="print-page bg-white mx-auto mb-4 relative" style={{ width: `${canvas.width}mm`, height: `${canvas.height}mm`, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', pageBreakAfter: 'always' }}>
              <div className="no-print absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">Hal {pageIdx + 1}/{pages}</div>
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <line x1="0" y1={`${CROP_MARK_LENGTH}mm`} x2="0" y2="0" stroke="black" strokeWidth="0.3" />
                <line x1="0" y1="0" x2={`${CROP_MARK_LENGTH}mm`} y2="0" stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1={`${CROP_MARK_LENGTH}mm`} x2={`${canvas.width}mm`} y2="0" stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1="0" x2={`${canvas.width - CROP_MARK_LENGTH}mm`} y2="0" stroke="black" strokeWidth="0.3" />
                <line x1="0" y1={`${canvas.height - CROP_MARK_LENGTH}mm`} x2="0" y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
                <line x1="0" y1={`${canvas.height}mm`} x2={`${CROP_MARK_LENGTH}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1={`${canvas.height - CROP_MARK_LENGTH}mm`} x2={`${canvas.width}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
                <line x1={`${canvas.width}mm`} y1={`${canvas.height}mm`} x2={`${canvas.width - CROP_MARK_LENGTH}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.3" />
              </svg>
              
              <div className="absolute grid" style={{ left: `${MARGIN}mm`, top: `${MARGIN}mm`, gap: `${GAP}mm`, gridTemplateColumns: `repeat(${cols}, ${size.width}mm)` }}>
                {pageItems.map((item, idx) => <div key={idx}>{renderSticker(item, prepareStickerData(item))}</div>)}
              </div>
            </div>
          );
        })}
      </div>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { page-break-after: always; margin: 0 !important; box-shadow: none !important; }
          .print-page:last-child { page-break-after: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          @page { size: ${canvasSize}; margin: 0; }
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
  
  useEffect(() => {
    if (open && parentAsset?.id) {
      setLoading(true);
      api.get(`/api/label-bmn/child-assets/${parentAsset.id}`)
        .then(res => setChildren(res.data))
        .catch(() => toast.error('Gagal memuat data aksesori'))
        .finally(() => setLoading(false));
    }
  }, [open, parentAsset]);
  
  const handleAddChild = async () => {
    if (!newChild.nama_aksesori.trim()) return toast.error('Nama aksesori harus diisi');
    try {
      await api.post('/api/label-bmn/child-asset', { parent_barang_id: parentAsset.id, ...newChild });
      toast.success('Aksesori berhasil ditambahkan');
      setNewChild({ nama_aksesori: '', keterangan: '' });
      api.get(`/api/label-bmn/child-assets/${parentAsset.id}`).then(res => setChildren(res.data));
      onSuccess?.();
    } catch { toast.error('Gagal menambah aksesori'); }
  };
  
  const PRESETS = ['Charger/Adaptor', 'Tas Laptop', 'Mouse', 'Keyboard', 'Kabel Power', 'USB Hub', 'Headset'];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5" />Kelola Aksesori - {parentAsset?.nama_barang}</DialogTitle>
          <DialogDescription>Kode: #{parentAsset?.kode_register || parentAsset?.kode_barang}</DialogDescription>
        </DialogHeader>
        
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Tambah Aksesori</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">{PRESETS.map(p => <Badge key={p} variant="outline" className="cursor-pointer hover:bg-blue-50" onClick={() => setNewChild({ ...newChild, nama_aksesori: p })}>{p}</Badge>)}</div>
            <div className="flex gap-2">
              <Input placeholder="Nama aksesori" value={newChild.nama_aksesori} onChange={e => setNewChild({ ...newChild, nama_aksesori: e.target.value })} className="flex-1" />
              <Input placeholder="Keterangan" value={newChild.keterangan} onChange={e => setNewChild({ ...newChild, keterangan: e.target.value })} className="flex-1" />
              <Button onClick={handleAddChild}><Plus className="w-4 h-4 mr-1" />Tambah</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="text-left p-2">Nama</th><th className="text-left p-2">Kode</th><th className="text-center p-2">Aksi</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={3} className="text-center p-4">Memuat...</td></tr> :
               children.length === 0 ? <tr><td colSpan={3} className="text-center p-4 text-gray-500">Belum ada aksesori</td></tr> :
               children.map(c => (
                 <tr key={c.id} className="border-t">
                   <td className="p-2">{c.nama_aksesori}</td>
                   <td className="p-2"><code className="bg-slate-100 px-1 rounded text-xs">#{c.kode_register_anak}</code></td>
                   <td className="text-center p-2"><Button variant="ghost" size="sm" onClick={async () => { await api.delete(`/api/label-bmn/child-asset/${c.id}`); api.get(`/api/label-bmn/child-assets/${parentAsset.id}`).then(res => setChildren(res.data)); }}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
                 </tr>
               ))}
            </tbody>
          </table>
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
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedSize, setSelectedSize] = useState('sedang');
  const [canvasSize, setCanvasSize] = useState('A4');
  const [qrSettings, setQrSettings] = useState(DEFAULT_QR_SETTINGS);
  const [showPrintCanvas, setShowPrintCanvas] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeTab, setActiveTab] = useState('daftar');
  
  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/label-bmn/assets', { params: { search, status_cetak: statusFilter, page, limit: 50 } });
      setAssets(res.data.data);
      setTotalPages(res.data.total_pages);
    } catch { toast.error('Gagal memuat data aset'); }
    setLoading(false);
  };
  
  useEffect(() => { loadAssets(); }, [search, statusFilter, page]);
  useEffect(() => {
    api.get('/api/label-bmn/print-stats').then(res => setStats(res.data)).catch(() => {});
    api.get('/api/label-bmn/instansi-info').then(res => setInstansi(res.data)).catch(() => {});
  }, []);
  
  const toggleSelect = (asset) => {
    setSelectedItems(prev => prev.find(i => i.id === asset.id) ? prev.filter(i => i.id !== asset.id) : [...prev, { ...asset, ukuran: selectedSize }]);
  };
  
  const selectAll = () => {
    setSelectedItems(selectedItems.length === assets.length ? [] : assets.map(a => ({ ...a, ukuran: selectedSize })));
  };
  
  const handlePrint = () => {
    if (selectedItems.length === 0) return toast.error('Pilih minimal 1 aset');
    setShowPrintCanvas(true);
  };
  
  const handlePrintComplete = async () => {
    try {
      await api.post('/api/label-bmn/print-batch', { items: selectedItems.map(i => ({ barang_id: i.id, ukuran: i.ukuran, is_child: false })), canvas_size: canvasSize });
      toast.success('Pencetakan dicatat');
      loadAssets();
      setSelectedItems([]);
    } catch { toast.error('Gagal mencatat'); }
    setShowPrintCanvas(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Tag className="w-6 h-6" />Manajemen Label BMN</h1>
          <p className="text-slate-500 mt-1">Cetak stiker identitas aset dengan QR Code</p>
        </div>
        {stats && (
          <div className="flex gap-3">
            <Card className="px-4 py-2"><div className="text-xs text-gray-500">Total</div><div className="text-xl font-bold">{stats.total_assets}</div></Card>
            <Card className="px-4 py-2 bg-green-50 border-green-200"><div className="text-xs text-green-600">Cetak</div><div className="text-xl font-bold text-green-700">{stats.assets_printed}</div></Card>
            <Card className="px-4 py-2 bg-amber-50 border-amber-200"><div className="text-xs text-amber-600">Belum</div><div className="text-xl font-bold text-amber-700">{stats.assets_not_printed}</div></Card>
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daftar" className="flex items-center gap-1"><LayoutGrid className="w-4 h-4" />Daftar Aset</TabsTrigger>
          <TabsTrigger value="qr-settings" className="flex items-center gap-1"><Palette className="w-4 h-4" />Customisasi QR</TabsTrigger>
          <TabsTrigger value="cetak" className="flex items-center gap-1"><Printer className="w-4 h-4" />Antrian ({selectedItems.length})</TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-1"><History className="w-4 h-4" />Riwayat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="qr-settings"><QRSettingsPanel settings={qrSettings} onChange={setQrSettings} instansi={instansi} previewText={selectedItems[0]?.kode_register || "SAMPLE001"} /></TabsContent>
        
        <TabsContent value="daftar" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Cari Aset</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Nama, kode, merk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                  </div>
                </div>
                <div className="w-40">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua</SelectItem>
                      <SelectItem value="belum_cetak">Belum Cetak</SelectItem>
                      <SelectItem value="sudah_cetak">Sudah Cetak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <Label className="text-xs">Ukuran Stiker</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STICKER_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label className="text-xs">Kertas</Label>
                  <Select value={canvasSize} onValueChange={setCanvasSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CANVAS_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={loadAssets} variant="outline"><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Checkbox checked={selectedItems.length === assets.length && assets.length > 0} onCheckedChange={selectAll} />
              <span className="text-sm text-gray-500">{selectedItems.length} dipilih</span>
            </div>
            <Button onClick={handlePrint} disabled={selectedItems.length === 0}><Printer className="w-4 h-4 mr-2" />Cetak ({selectedItems.length})</Button>
          </div>
          
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100"><tr>
                  <th className="w-10 p-3"></th>
                  <th className="text-left p-3">Kode / Nama Barang</th>
                  <th className="text-left p-3">Merk / Tipe</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Aksi</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} className="text-center p-8">Memuat...</td></tr> :
                   assets.length === 0 ? <tr><td colSpan={5} className="text-center p-8 text-gray-500">Tidak ada data</td></tr> :
                   assets.map(asset => {
                     const isSelected = selectedItems.some(i => i.id === asset.id);
                     return (
                       <tr key={asset.id} className={`border-t ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                         <td className="p-3 text-center"><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(asset)} /></td>
                         <td className="p-3">
                           <div className="font-medium">{asset.nama_barang}</div>
                           <code className="text-xs bg-slate-100 px-1 rounded">#{asset.kode_register || asset.kode_barang}</code>
                         </td>
                         <td className="p-3"><div>{asset.merk || '-'}</div><div className="text-xs text-gray-500">{asset.tipe || ''}</div></td>
                         <td className="text-center p-3">
                           {asset.print_count > 0 ? <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />{asset.print_count}x</Badge> : <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Belum</Badge>}
                         </td>
                         <td className="text-center p-3">
                           <div className="flex justify-center gap-1">
                             <Button variant="ghost" size="sm" onClick={() => { setSelectedParent(asset); setShowChildModal(true); }}><Link2 className="w-4 h-4" /></Button>
                             <Button variant="ghost" size="sm" onClick={() => { setSelectedItems([{ ...asset, ukuran: selectedSize }]); setShowPrintCanvas(true); }}><Eye className="w-4 h-4" /></Button>
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <span className="px-3 py-1 text-sm">Hal {page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="cetak" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Antrian ({selectedItems.length})</span>
                <div className="flex gap-2">
                  <Select value={canvasSize} onValueChange={setCanvasSize}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CANVAS_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={handlePrint} disabled={selectedItems.length === 0}><Printer className="w-4 h-4 mr-2" />Cetak</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><Package className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>Pilih aset dari tab Daftar Aset</p></div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                      <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="font-medium">{item.nama_barang}</div>
                        <div className="text-xs text-gray-500">#{item.kode_register || item.kode_barang}</div>
                      </div>
                      <Select value={item.ukuran} onValueChange={val => setSelectedItems(prev => prev.map(i => i.id === item.id ? { ...i, ukuran: val } : i))}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STICKER_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedItems(prev => prev.filter(i => i.id !== item.id))}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="riwayat"><PrintHistoryTab /></TabsContent>
      </Tabs>
      
      {showPrintCanvas && <PrintCanvas items={selectedItems} canvasSize={canvasSize} instansi={instansi} qrSettings={qrSettings} onClose={() => setShowPrintCanvas(false)} onPrintComplete={handlePrintComplete} />}
      <ChildAssetModal open={showChildModal} onClose={() => setShowChildModal(false)} parentAsset={selectedParent} onSuccess={loadAssets} />
    </div>
  );
}

function PrintHistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/api/label-bmn/print-history', { params: { limit: 100 } })
      .then(res => setHistory(res.data.data))
      .catch(() => toast.error('Gagal memuat riwayat'))
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <div className="text-center py-8">Memuat...</div>;
  
  return (
    <Card>
      <CardHeader><CardTitle>Riwayat Cetak</CardTitle></CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><History className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>Belum ada riwayat</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="text-left p-3">Waktu</th><th className="text-left p-3">Barang</th><th className="text-center p-3">Ukuran</th></tr></thead>
            <tbody>
              {history.map(log => (
                <tr key={log.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">{new Date(log.printed_at).toLocaleString('id-ID')}</td>
                  <td className="p-3">{log.barang?.nama_barang || '-'}</td>
                  <td className="text-center p-3"><Badge variant="outline">{STICKER_SIZES[log.ukuran]?.label || log.ukuran}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
