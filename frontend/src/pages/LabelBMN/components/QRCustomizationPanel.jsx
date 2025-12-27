
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { QrCode, Save, RotateCcw, Trash2, Layers, Palette } from 'lucide-react';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';
import CustomSticker from './CustomSticker';
import { StikerKecil, StikerSedang, StikerBesar } from './StickerTemplates';

// ==================== CONSTANTS ====================
// Default QR Settings
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

// ==================== QR CODE COMPONENT ====================
const StyledQRCode = ({ data, settings, logoUrl, size = 200, style = {} }) => {
  const qrRef = React.useRef(null);

  useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.innerHTML = '';

    const qrOptions = {
      width: size,
      height: size,
      type: 'svg',
      data: data || 'SAMPLE001',
      margin: settings?.margin || 0,
      qrOptions: { errorCorrectionLevel: settings?.errorCorrectionLevel || 'M' },
      dotsOptions: { color: settings?.dotsColor || '#000000', type: settings?.dotsStyle || 'square' },
      cornersSquareOptions: { color: settings?.cornerSquareColor || '#000000', type: settings?.cornerSquareStyle || 'square' },
      cornersDotOptions: { color: settings?.cornerDotColor || '#000000', type: settings?.cornerDotStyle || 'square' },
      backgroundOptions: { color: settings?.backgroundColor || '#ffffff' }
    };

    if (settings?.logoEnabled && logoUrl) {
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

  return <div ref={qrRef} style={{ width: size, height: size, ...style }} />;
};

function QRCustomizationPanel({ qrSettings, onSettingsChange, instansi, qrTemplates, onQrTemplatesChange, activeDesigns, api }) {
  const [localSettings, setLocalSettings] = useState(qrSettings || DEFAULT_QR_SETTINGS);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [previewStickerType, setPreviewStickerType] = useState('kecil');
  
  // Use shared templates from parent if available
  const templates = qrTemplates || [];
  
  // Get active design for current preview type
  const currentActiveDesign = activeDesigns?.[previewStickerType];
  
  useEffect(() => {
    if (qrSettings) setLocalSettings(qrSettings);
  }, [qrSettings]);
  
  const updateSetting = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };
  
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return toast.error('Masukkan nama template');
    setSavingTemplate(true);
    try {
      await api.post('/api/label-bmn/qr-template', { name: templateName, ...localSettings });
      toast.success('Template QR berhasil disimpan');
      setTemplateName('');
      // Notify parent to reload templates
      onQrTemplatesChange?.();
    } catch {
      toast.error('Gagal menyimpan template');
    } finally {
      setSavingTemplate(false);
    }
  };
  
  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Hapus template QR ini?')) return;
    try {
      await api.delete(`/api/label-bmn/qr-template/${templateId}`);
      toast.success('Template dihapus');
      onQrTemplatesChange?.();
    } catch {
      toast.error('Gagal menghapus');
    }
  };
  
  const handleLoadTemplate = (template) => {
    const newSettings = {
      ...DEFAULT_QR_SETTINGS,
      ...template,
      name: undefined,
      id: undefined,
      created_at: undefined,
      updated_at: undefined
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
    toast.success(`Template "${template.name}" dimuat`);
  };
  
  const handleReset = () => {
    setLocalSettings(DEFAULT_QR_SETTINGS);
    onSettingsChange(DEFAULT_QR_SETTINGS);
    toast.info('Pengaturan direset ke default');
  };
  
  // Sample data for preview - dengan format register aset yang benar
  const sampleData = {
    kode_barang: '1B2111EC4E19B902E063BBAAD80A6667',
    kode_register: '1B2111EC4E19B902E063BBAAD80A6667',
    nama_barang: 'Laptop HP EliteBook 840',
    merk: 'HP',
    tipe: 'EliteBook 840 G8',
    nup: '1',
    tahun: '2024',
    kode_vertikal: '103010T/1/2024'
  };
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Left - QR Preview */}
      <Card className="col-span-1">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2"><QrCode className="w-4 h-4" />Preview QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-4 bg-slate-100 min-h-[300px]">
          <div className="bg-white p-4 rounded-lg shadow">
            <StyledQRCode 
              data={`#${sampleData.kode_barang}`}
              settings={localSettings}
              logoUrl={instansi?.logo_url}
              size={150}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Data: #{sampleData.kode_barang}</p>
        </CardContent>
        
        {/* Save Template */}
        <div className="p-3 border-t space-y-2">
          <Label className="text-xs font-medium">Simpan sebagai Template</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="Nama template..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" onClick={handleSaveTemplate} disabled={savingTemplate}>
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Middle - QR Settings */}
      <Card className="col-span-1">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Palette className="w-4 h-4" />Pengaturan QR</span>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="w-3 h-3 mr-1" />Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[450px] overflow-y-auto">
          {/* Body Dots */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Body Pattern</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Warna</Label>
                <Input type="color" value={localSettings.dotsColor || '#000000'} onChange={e => updateSetting('dotsColor', e.target.value)} className="h-8 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Style</Label>
                <Select value={localSettings.dotsStyle || 'square'} onValueChange={v => updateSetting('dotsStyle', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="dots">Dots</SelectItem>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="classy">Classy</SelectItem>
                    <SelectItem value="classy-rounded">Classy Rounded</SelectItem>
                    <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Corner Squares (External Eye) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">External Eye Pattern</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Warna</Label>
                <Input type="color" value={localSettings.cornerSquareColor || '#000000'} onChange={e => updateSetting('cornerSquareColor', e.target.value)} className="h-8 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Style</Label>
                <Select value={localSettings.cornerSquareStyle || 'square'} onValueChange={v => updateSetting('cornerSquareStyle', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="dot">Dot</SelectItem>
                    <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Corner Dots (Internal Eye) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Internal Eye Pattern</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Warna</Label>
                <Input type="color" value={localSettings.cornerDotColor || '#000000'} onChange={e => updateSetting('cornerDotColor', e.target.value)} className="h-8 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Style</Label>
                <Select value={localSettings.cornerDotStyle || 'square'} onValueChange={v => updateSetting('cornerDotStyle', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="dot">Dot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Background */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Background</Label>
            <Input type="color" value={localSettings.backgroundColor || '#ffffff'} onChange={e => updateSetting('backgroundColor', e.target.value)} className="h-8 w-full" />
          </div>
          
          {/* QR Size in Pixels */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Ukuran QR Code (px)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Ukuran ({localSettings.size || 200}px)</Label>
                <Slider value={[localSettings.size || 200]} onValueChange={([v]) => updateSetting('size', v)} min={50} max={400} step={10} className="mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Atau input manual</Label>
                <Input type="number" value={localSettings.size || 200} onChange={e => updateSetting('size', parseInt(e.target.value) || 200)} className="h-8 text-sm" min={50} max={500} />
              </div>
            </div>
            <p className="text-[10px] text-gray-500">Ukuran QR code dalam pixel untuk cetak</p>
          </div>
          
          {/* Margin (blocks) - Quiet Zone */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Margin (blocks)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Margin ({localSettings.margin || 0} blocks)</Label>
                <Slider value={[localSettings.margin || 0]} onValueChange={([v]) => updateSetting('margin', v)} min={0} max={10} step={1} className="mt-1" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Atau input manual</Label>
                <Input type="number" value={localSettings.margin || 0} onChange={e => updateSetting('margin', parseInt(e.target.value) || 0)} className="h-8 text-sm" min={0} max={20} />
              </div>
            </div>
            <p className="text-[10px] text-gray-500">Quiet zone di sekitar QR code (dalam satuan modul/blocks)</p>
          </div>
          
          {/* Logo Settings */}
          <div className="space-y-2 p-2 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Logo di Tengah QR</Label>
              <Switch checked={localSettings.logoEnabled} onCheckedChange={v => updateSetting('logoEnabled', v)} />
            </div>
            {localSettings.logoEnabled && (
              <>
                <div>
                  <Label className="text-[10px] text-gray-500">Ukuran Logo ({localSettings.logoSize || 25}%)</Label>
                  <Slider value={[localSettings.logoSize || 25]} onValueChange={([v]) => updateSetting('logoSize', v)} min={10} max={40} step={1} className="mt-1" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-gray-500">Background Putih</Label>
                  <Switch checked={localSettings.logoBackgroundEnabled} onCheckedChange={v => updateSetting('logoBackgroundEnabled', v)} />
                </div>
              </>
            )}
          </div>
          
          {/* Error Correction */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Error Correction Level</Label>
            <Select value={localSettings.errorCorrectionLevel || 'M'} onValueChange={v => updateSetting('errorCorrectionLevel', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (7%)</SelectItem>
                <SelectItem value="M">Medium (15%)</SelectItem>
                <SelectItem value="Q">Quartile (25%)</SelectItem>
                <SelectItem value="H">High (30%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Right - Templates */}
      <Card className="col-span-1">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" />Template QR Tersimpan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[450px] overflow-y-auto">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada template</p>
              <p className="text-xs">Atur style QR lalu simpan sebagai template</p>
            </div>
          ) : (
            templates.map(template => (
              <div key={template.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{template.name}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteTemplate(template.id)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
                <div className="flex gap-1 mb-2">
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: template.dotsColor || '#000' }} title="Body" />
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: template.cornerSquareColor || '#000' }} title="External Eye" />
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: template.cornerDotColor || '#000' }} title="Internal Eye" />
                  <div className="w-5 h-5 rounded border" style={{ backgroundColor: template.backgroundColor || '#fff' }} title="Background" />
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleLoadTemplate(template)}>
                  Gunakan Template
                </Button>
              </div>
            ))
          )}
        </CardContent>
        
        {/* Preview with sticker - All sizes using active design */}
        <div className="p-3 border-t">
          <Label className="text-xs font-medium mb-2 block">Preview di Stiker (Design Aktif)</Label>
          <div className="flex gap-1 mb-2">
            {['kecil', 'sedang', 'besar'].map(type => (
              <Button
                key={type}
                size="sm"
                variant={previewStickerType === type ? 'default' : 'outline'}
                onClick={() => setPreviewStickerType(type)}
                className="text-xs capitalize h-7 flex-1"
              >
                {type}
              </Button>
            ))}
          </div>
          <div className="bg-slate-100 p-4 rounded-lg flex items-center justify-center min-h-[180px] overflow-hidden">
            {currentActiveDesign ? (
              <div 
                className="transform origin-center"
                style={{
                  transform: previewStickerType === 'kecil' 
                    ? 'scale(1)' 
                    : previewStickerType === 'sedang' 
                      ? 'scale(0.7)' 
                      : 'scale(0.45)'
                }}
              >
                <CustomSticker 
                  data={sampleData} 
                  design={currentActiveDesign} 
                  instansi={instansi} 
                  qrSettings={localSettings} 
                />
              </div>
            ) : (
              <div 
                className="transform origin-center"
                style={{
                  transform: previewStickerType === 'kecil' 
                    ? 'scale(1)' 
                    : previewStickerType === 'sedang' 
                      ? 'scale(0.7)' 
                      : 'scale(0.45)'
                }}
              >
                {previewStickerType === 'kecil' && (
                  <StikerKecil data={sampleData} instansi={instansi} qrSettings={localSettings} />
                )}
                {previewStickerType === 'sedang' && (
                  <StikerSedang data={sampleData} instansi={instansi} qrSettings={localSettings} />
                )}
                {previewStickerType === 'besar' && (
                  <StikerBesar data={sampleData} instansi={instansi} qrSettings={localSettings} />
                )}
              </div>
            )}
          </div>
          {currentActiveDesign && (
            <p className="text-[10px] text-gray-500 mt-1 text-center">
              Menggunakan design: {currentActiveDesign.name}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default QRCustomizationPanel;
