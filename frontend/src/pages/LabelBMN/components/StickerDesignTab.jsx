
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RotateCcw, Trash2, Eye, Settings2, Plus, Save, Layers, Tag, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import CustomSticker from './CustomSticker';
import DesignEditorForm from './DesignEditorForm';
import QRCustomizationPanel from './QRCustomizationPanel';

// Default configs (moved from LabelBMN.jsx)
const DEFAULT_DESIGN_CONFIGS = {
  kecil: {
    name: "Stiker Kecil - Default",
    size_type: "kecil",
    width: 23.8,
    height: 39.8,
    layout: "portrait",
    // Show/Hide toggles
    show_qr: true,
    show_header: false,
    show_kode: true,
    show_nama: true,
    show_nup: true,
    show_description: true,
    show_warning: false,
    show_gold_stripe: true,
    show_nup_label: false,
    // QR Settings
    qr_position: "top",
    qr_size: 100,
    qr_margin_top: 0,
    qr_margin_bottom: 0,
    qr_margin_left: 0,
    qr_margin_right: 0,
    qr_align: "center",
    qr_border_right: true,
    qr_area_width: 23.8,
    // Header settings
    header_show_logo: false,
    header_logo_size: 12,
    header_logo_border: true,
    header_font_size: 6.5,
    header_sub_font_size: 6,
    header_font_weight: 700,
    header_italic: true,
    header_text: "",
    header_bg_color: "#ffffff",
    header_full_align: "center-left",
    header_padding: 3,
    header_border_bottom: true,
    header_show_uakpb: true,
    header_min_height: 5,
    // Kode settings
    kode_font_size: 8,
    kode_font_weight: 700,
    kode_full_align: "center-left",
    kode_text_transform: "none",
    kode_color: "#1a1a1a",
    kode_italic: false,
    // Nama settings
    nama_font_size: 6.5,
    nama_font_weight: 600,
    nama_full_align: "center-left",
    nama_color: "#1a1a1a",
    nama_italic: false,
    // NUP settings
    nup_font_size: 10,
    nup_min_width: 7,
    nup_full_align: "center",
    nup_color: "#1a1a1a",
    nup_border_left: true,
    // Description settings
    desc_font_size: 5,
    desc_full_align: "center-left",
    desc_color: "#1a1a1a",
    desc_italic: false,
    // Warning settings
    warning_text: "",
    warning_font_size: 5,
    warning_color: "#DC2626",
    warning_full_align: "center-left",
    warning_italic: true,
    // Gold stripe
    gold_stripe_height: 3,
    gold_stripe_color: "#D4AF37",
    gold_stripe_position: "after_qr",
    // Border settings
    border_width: 1,
    border_color: "#2c2c2c",
    border_radius: 0,
    border_top: true,
    border_right: true,
    border_bottom: true,
    border_left: true,
    section_border_width: 1,
    section_border_color: "#2c2c2c",
    // General appearance
    font_family: "Arial",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    content_padding: 0,
    element_gap: 0,
    // Print settings
    print_columns: 4,
    print_rows: 6,
    print_gap_x: 2,
    print_gap_y: 2
  },
  sedang: {
    name: "Stiker Sedang - Default",
    size_type: "sedang",
    width: 69.8,
    height: 22.1,
    layout: "landscape",
    // Show/Hide toggles
    show_qr: true,
    show_header: true,
    show_kode: true,
    show_nama: true,
    show_nup: true,
    show_description: true,
    show_warning: true,
    show_gold_stripe: false,
    show_nup_label: false,
    // QR Settings
    qr_position: "left",
    qr_size: 100,
    qr_margin_top: 0,
    qr_margin_bottom: 0,
    qr_margin_left: 0,
    qr_margin_right: 0,
    qr_align: "center",
    qr_border_right: true,
    qr_area_width: 22.1,
    // Header settings
    header_show_logo: true,
    header_logo_size: 16,
    header_logo_border: true,
    header_font_size: 7.5,
    header_sub_font_size: 6.5,
    header_font_weight: 700,
    header_italic: true,
    header_text: "Otorita Ibu Kota Nusantara",
    header_bg_color: "#ffffff",
    header_full_align: "center-left",
    header_padding: 4,
    header_border_bottom: true,
    header_show_uakpb: true,
    header_min_height: 6.5,
    // Kode settings
    kode_font_size: 7.5,
    kode_font_weight: 700,
    kode_full_align: "center-left",
    kode_text_transform: "none",
    kode_color: "#1a1a1a",
    kode_italic: false,
    // Nama settings
    nama_font_size: 6.5,
    nama_font_weight: 500,
    nama_full_align: "center-left",
    nama_color: "#1a1a1a",
    nama_italic: true,
    // NUP settings
    nup_font_size: 11,
    nup_min_width: 12,
    nup_full_align: "center",
    nup_color: "#1a1a1a",
    nup_border_left: true,
    // Description settings
    desc_font_size: 5.5,
    desc_full_align: "center-left",
    desc_color: "#1a1a1a",
    desc_italic: true,
    // Warning settings
    warning_text: "Tidak Untuk Diperjualbelikan",
    warning_font_size: 6,
    warning_color: "#DC2626",
    warning_full_align: "center-left",
    warning_italic: true,
    // Gold stripe
    gold_stripe_height: 2.5,
    gold_stripe_color: "#D4AF37",
    gold_stripe_position: "after_qr",
    // Border settings
    border_width: 1,
    border_color: "#2c2c2c",
    border_radius: 0,
    border_top: true,
    border_right: true,
    border_bottom: true,
    border_left: true,
    section_border_width: 1,
    section_border_color: "#2c2c2c",
    // General appearance
    font_family: "Arial",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    content_padding: 0,
    element_gap: 0,
    // Print settings
    print_columns: 3,
    print_rows: 10,
    print_gap_x: 2,
    print_gap_y: 2
  },
  besar: {
    name: "Stiker Besar - Default",
    size_type: "besar",
    width: 94.9,
    height: 32.2,
    layout: "landscape",
    // Show/Hide toggles
    show_qr: true,
    show_header: true,
    show_kode: true,
    show_nama: true,
    show_nup: true,
    show_description: true,
    show_warning: true,
    show_gold_stripe: false,
    show_nup_label: true,
    // QR Settings
    qr_position: "left",
    qr_size: 100,
    qr_margin_top: 0,
    qr_margin_bottom: 0,
    qr_margin_left: 0,
    qr_margin_right: 0,
    qr_align: "center",
    qr_border_right: true,
    qr_area_width: 32.2,
    // Header settings
    header_show_logo: true,
    header_logo_size: 22,
    header_logo_border: true,
    header_font_size: 10,
    header_sub_font_size: 9,
    header_font_weight: 700,
    header_italic: true,
    header_text: "Otorita Ibu Kota Nusantara",
    header_bg_color: "#ffffff",
    header_full_align: "center-left",
    header_padding: 5,
    header_border_bottom: true,
    header_show_uakpb: true,
    header_min_height: 9,
    // Kode settings
    kode_font_size: 10,
    kode_font_weight: 700,
    kode_full_align: "center-left",
    kode_text_transform: "none",
    kode_color: "#1a1a1a",
    kode_italic: false,
    // Nama settings
    nama_font_size: 9,
    nama_font_weight: 500,
    nama_full_align: "center-left",
    nama_color: "#1a1a1a",
    nama_italic: true,
    // NUP settings
    nup_font_size: 14,
    nup_min_width: 14,
    nup_full_align: "center",
    nup_color: "#1a1a1a",
    nup_border_left: true,
    // Description settings
    desc_font_size: 8,
    desc_full_align: "center-left",
    desc_color: "#1a1a1a",
    desc_italic: true,
    // Warning settings
    warning_text: "Tidak Untuk Diperjualbelikan",
    warning_font_size: 9,
    warning_color: "#DC2626",
    warning_full_align: "center-left",
    warning_italic: true,
    // Gold stripe
    gold_stripe_height: 3,
    gold_stripe_color: "#D4AF37",
    gold_stripe_position: "after_qr",
    // Border settings
    border_width: 1,
    border_color: "#2c2c2c",
    border_radius: 0,
    border_top: true,
    border_right: true,
    border_bottom: true,
    border_left: true,
    section_border_width: 1,
    section_border_color: "#2c2c2c",
    // General appearance
    font_family: "Arial",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    content_padding: 0,
    element_gap: 0,
    // Print settings
    print_columns: 2,
    print_rows: 8,
    print_gap_x: 2,
    print_gap_y: 2
  }
};

function StickerDesignTab({ instansi, qrSettings, onQrSettingsChange, qrTemplates, onQrTemplatesChange, api }) {
  const [designs, setDesigns] = useState({ kecil: [], sedang: [], besar: [], custom: [] });
  const [selectedSizeType, setSelectedSizeType] = useState('sedang');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [editingDesign, setEditingDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQRTemplates, setShowQRTemplates] = useState(false);
  const [activeDesignIds, setActiveDesignIds] = useState({});
  
  // Function to apply QR template - properly apply to qrSettings
  const setQrSettingsFromTemplate = (template) => {
    const newSettings = {
      size: template.size || 200,
      margin: template.margin || 0,
      dotsColor: template.dotsColor || template.bodyColor || '#000000',
      dotsStyle: template.dotsStyle || template.bodyStyle || 'square',
      cornerSquareColor: template.cornerSquareColor || template.eyeColor || '#000000',
      cornerSquareStyle: template.cornerSquareStyle || template.eyeStyle || 'square',
      cornerDotColor: template.cornerDotColor || '#000000',
      cornerDotStyle: template.cornerDotStyle || 'square',
      backgroundColor: template.backgroundColor || '#ffffff',
      logoEnabled: template.logoEnabled !== false,
      logoSize: template.logoSize || 25,
      logoBackgroundEnabled: template.logoBackgroundEnabled !== false,
      logoBackgroundColor: template.logoBackgroundColor || '#ffffff',
      errorCorrectionLevel: template.errorCorrectionLevel || 'M'
    };
    onQrSettingsChange?.(newSettings);
    toast.success(`Template QR "${template.name}" berhasil diterapkan`);
  };
  
  // Load designs and active designs
  useEffect(() => {
    loadDesigns();
    loadActiveDesigns();
  }, []);
  
  const loadActiveDesigns = async () => {
    try {
      // Load active design for each size
      const [kecilRes, sedangRes, besarRes] = await Promise.all([
        api.get('/api/label-bmn/sticker-design/active/kecil').catch(() => ({ data: null })),
        api.get('/api/label-bmn/sticker-design/active/sedang').catch(() => ({ data: null })),
        api.get('/api/label-bmn/sticker-design/active/besar').catch(() => ({ data: null }))
      ]);
      
      setActiveDesignIds({
        kecil: kecilRes.data?.id || `default_kecil`,
        sedang: sedangRes.data?.id || `default_sedang`,
        besar: besarRes.data?.id || `default_besar`
      });
    } catch {
      // Use defaults
      setActiveDesignIds({
        kecil: 'default_kecil',
        sedang: 'default_sedang',
        besar: 'default_besar'
      });
    }
  };
  
  const loadDesigns = async () => {
    try {
      const res = await api.get('/api/label-bmn/sticker-designs');
      setDesigns(res.data);
      
      // Set default selected design
      const defaultDesign = res.data[selectedSizeType]?.find(d => d.is_default) || res.data[selectedSizeType]?.[0];
      if (defaultDesign) {
        setSelectedDesign(defaultDesign);
        setEditingDesign({ ...defaultDesign });
      }
    } catch (err) {
      toast.error('Gagal memuat design stiker');
      // Use local defaults
      const defaultDesign = { ...DEFAULT_DESIGN_CONFIGS[selectedSizeType], id: `default_${selectedSizeType}` };
      setSelectedDesign(defaultDesign);
      setEditingDesign({ ...defaultDesign });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectSizeType = useCallback((sizeType) => {
    // Prevent state leakage by clearing current state first  
    setSelectedSizeType(sizeType);
    
    // Immediately get design for the new size type
    const designList = designs[sizeType] || [];
    const defaultDesign = designList.find(d => d.is_default) || designList[0] || { ...DEFAULT_DESIGN_CONFIGS[sizeType], id: `default_${sizeType}` };
    
    // Update both states at once to avoid intermediate state
    setSelectedDesign(defaultDesign);
    setEditingDesign({ ...defaultDesign });
  }, [designs]);
  
  const handleSelectDesign = (design) => {
    setSelectedDesign(design);
    setEditingDesign({ ...design });
  };
  
  const handleSaveDesign = async () => {
    if (!editingDesign) return;
    setSaving(true);
    
    try {
      // Cek apakah design sudah ada di database (bukan default dari kode)
      const isDefaultFromCode = editingDesign.id?.startsWith('default_');
      const hasDbId = editingDesign.id && !isDefaultFromCode;
      
      if (hasDbId) {
        // Update existing design di database
        await api.put(`/api/label-bmn/sticker-design/${editingDesign.id}`, editingDesign);
        toast.success('Design berhasil diperbarui');
        // Update local state
        setDesigns(prev => {
          const sizeType = editingDesign.size_type || selectedSizeType;
          const updatedList = (prev[sizeType] || []).map(d => 
            d.id === editingDesign.id ? { ...editingDesign } : d
          );
          return { ...prev, [sizeType]: updatedList };
        });
        setSelectedDesign({ ...editingDesign });
      } else {
        // Design default dari kode - simpan sebagai design baru di database
        // Tapi dengan nama yang sama (bukan nama baru dengan suffix)
        const designToSave = {
          ...editingDesign,
          id: undefined, // Hapus ID default agar API membuat ID baru
          is_default: true // Tandai sebagai default untuk size ini
        };
        
        const res = await api.post('/api/label-bmn/sticker-design', designToSave);
        toast.success('Design default berhasil disimpan');
        
        // Update dengan design baru dari server
        const newDesign = res.data.design;
        setSelectedDesign(newDesign);
        setEditingDesign({ ...newDesign });
        
        // Reload designs
        const designsRes = await api.get('/api/label-bmn/sticker-designs');
        setDesigns(designsRes.data);
      }
    } catch (err) {
      toast.error('Gagal menyimpan design');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDuplicateDesign = async (design) => {
    try {
      const res = await api.post(`/api/label-bmn/sticker-design/${design.id}/duplicate`);
      toast.success('Design berhasil diduplikasi');
      await loadDesigns();
      setSelectedDesign(res.data.design);
      setEditingDesign(res.data.design);
    } catch (err) {
      toast.error('Gagal menduplikasi design');
    }
  };
  
  const handleDeleteDesign = async (design) => {
    if (design.id?.startsWith('default_')) {
      return toast.error('Tidak dapat menghapus design default');
    }
    if (!confirm('Hapus design ini?')) return;
    
    try {
      await api.delete(`/api/label-bmn/sticker-design/${design.id}`);
      toast.success('Design dihapus');
      await loadDesigns();
    } catch (err) {
      toast.error('Gagal menghapus design');
    }
  };
  
  const handleSetActive = async () => {
    if (!selectedDesign) return;
    try {
      await api.post('/api/label-bmn/sticker-design/set-active', {
        size_type: selectedSizeType,
        design_id: selectedDesign.id
      });
      // Update local active design state
      setActiveDesignIds(prev => ({
        ...prev,
        [selectedSizeType]: selectedDesign.id
      }));
      toast.success('Design aktif berhasil diatur');
    } catch (err) {
      toast.error('Gagal mengatur design aktif');
    }
  };
  
  const handleResetToDefault = () => {
    const defaultConfig = DEFAULT_DESIGN_CONFIGS[selectedSizeType];
    if (defaultConfig) {
      setEditingDesign({ ...defaultConfig, id: editingDesign?.id, name: editingDesign?.name });
      toast.info('Design direset ke default');
    }
  };
  
  // Sample data for preview
  const sampleData = {
    kode_barang: '1030101001000001',
    kode_register: '1030101001000001',
    nama_barang: 'Laptop HP EliteBook 840',
    merk: 'HP',
    tipe: 'EliteBook 840 G8',
    nup: '1',
    tahun: '2024',
    kode_vertikal: '103010T/1/2024'
  };
  
  // Reset all designs to default
  const handleResetAllDesigns = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA design kustom?\n\nSemua salinan/kustom akan dihapus dan hanya design default yang tersisa.\n\nTindakan ini tidak dapat dibatalkan!')) {
      return;
    }
    
    try {
      // Reset sticker designs
      await api.delete('/api/label-bmn/sticker-designs/reset-all');
      
      // Reset QR templates
      await api.delete('/api/label-bmn/qr-templates/reset-all');
      onQrTemplatesChange?.();
      
      // Reset active design state
      setActiveDesignIds({
        kecil: 'default_kecil',
        sedang: 'default_sedang',
        besar: 'default_besar'
      });
      
      toast.success('Semua design berhasil direset ke default');
      
      // Reload designs
      await loadDesigns();
    } catch (err) {
      toast.error('Gagal mereset design');
    }
  };
  
  if (loading) return <div className="text-center py-8">Memuat...</div>;
  
  return (
    <div className="space-y-4">
      {/* Size Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {['kecil', 'sedang', 'besar'].map(size => (
          <Button 
            key={size}
            variant={selectedSizeType === size ? 'default' : 'outline'}
            onClick={() => handleSelectSizeType(size)}
            className="capitalize"
          >
            <Tag className="w-4 h-4 mr-2" />
            Stiker {size}
          </Button>
        ))}
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setShowQRTemplates(prev => !prev)}>
          <QrCode className="w-4 h-4 mr-2" />
          Template QR
        </Button>
        <Button variant="destructive" size="sm" onClick={handleResetAllDesigns}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Semua ke Default
        </Button>
      </div>
      
      {/* QR Templates Panel */}
      {showQRTemplates && (
        <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
          <QRCustomizationPanel 
            qrSettings={qrSettings} 
            onSettingsChange={onQrSettingsChange}
            instansi={instansi}
            qrTemplates={qrTemplates}
            onQrTemplatesChange={onQrTemplatesChange}
            activeDesigns={activeDesignIds}
            api={api}
          />
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        {/* Left Panel - Design List */}
        <Card className="col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Layers className="w-4 h-4" />Template Design</span>
              <Button size="sm" variant="outline" onClick={() => handleDuplicateDesign(selectedDesign || { ...DEFAULT_DESIGN_CONFIGS[selectedSizeType], id: `default_${selectedSizeType}` })}>
                <Plus className="w-4 h-4 mr-1" />Baru
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {(designs[selectedSizeType] || []).map(design => {
              const isActive = activeDesignIds[selectedSizeType] === design.id;
              const isSelected = selectedDesign?.id === design.id;
              return (
                <div 
                  key={design.id}
                  onClick={() => handleSelectDesign(design)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    isActive 
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                      : isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {isActive && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {design.name}
                      </div>
                      <div className="text-xs text-gray-500">{design.width}mm × {design.height}mm</div>
                    </div>
                    <div className="flex gap-1 items-center">
                      {isActive && <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">AKTIF</Badge>}
                      {design.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      {!design.id?.startsWith('default_') && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteDesign(design); }}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Middle Panel - Preview */}
        <Card className="col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" />Preview Stiker</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4 bg-slate-100 min-h-[350px]">
            <div className="transform scale-150">
              {editingDesign && (
                <CustomSticker design={editingDesign} data={sampleData} instansi={instansi} qrSettings={qrSettings} />
              )}
            </div>
          </CardContent>
          <div className="p-3 border-t flex gap-2 justify-center flex-wrap">
            <Button size="sm" variant="outline" onClick={handleResetToDefault}>
              <RotateCcw className="w-4 h-4 mr-1" />Reset
            </Button>
            <Button size="sm" onClick={handleSaveDesign} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Menyimpan...' : 'Simpan Design'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSetActive}>
              <CheckCircle2 className="w-4 h-4 mr-1" />Set Aktif
            </Button>
          </div>
        </Card>
        
        {/* Right Panel - Editor */}
        <Card className="col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" />Editor Design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[450px] overflow-y-auto">
            {editingDesign && (
              <DesignEditorForm design={editingDesign} onChange={setEditingDesign} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StickerDesignTab;
