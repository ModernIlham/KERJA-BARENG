/**
 * LabelBMN.jsx - Halaman Manajemen Pelabelan Stiker BMN
 * Features:
 * - 3 ukuran stiker: Kecil, Sedang, Besar
 * - Canvas A4/A3 dengan crop marks untuk mesin cutting
 * - Tracking status cetak
 * - Parent-Child asset relationship (Induk-Anak untuk aksesori)
 * - QR Code dengan logo instansi embedded
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
import { 
  Printer, Search, Plus, Trash2, Package, Tag, QrCode, 
  CheckCircle2, XCircle, History, LayoutGrid, Settings2,
  ChevronRight, Link2, Unlink, RefreshCw, Download, FileText, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

// ==================== CONSTANTS ====================
const STICKER_SIZES = {
  kecil: { width: 35, height: 50, label: 'Kecil (35x50mm)', desc: 'Aksesori' },
  sedang: { width: 60, height: 90, label: 'Sedang (60x90mm)', desc: 'Standar' },
  besar: { width: 90, height: 130, label: 'Besar (90x130mm)', desc: 'Mesin Besar' }
};

const CANVAS_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210x297mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297x420mm)' }
};

const CROP_MARK_LENGTH = 5; // mm
const MARGIN = 10; // mm from edge
const GAP = 3; // mm between stickers

// ==================== QR CODE GENERATOR ====================
const generateQRCodeDataURL = async (text, size = 100) => {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (err) {
    console.error('QR generation error:', err);
    return null;
  }
};

// ==================== STICKER COMPONENTS ====================

// Stiker Kecil Component (untuk aksesori)
const StikerKecil = ({ data, instansi, qrDataUrl, scale = 1 }) => {
  const s = (val) => val * scale;
  
  return (
    <div 
      className="stiker-kecil bg-white border border-black relative overflow-hidden"
      style={{ width: `${s(35)}mm`, height: `${s(50)}mm`, fontSize: `${s(6)}px` }}
    >
      {/* QR Code Area */}
      <div className="absolute inset-0 flex flex-col">
        {/* QR Code with Logo */}
        <div className="flex-1 flex items-center justify-center p-1 relative">
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR" className="w-full h-auto max-h-full object-contain" />
          )}
          {/* Logo overlay */}
          {instansi?.logo_url && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img 
                src={instansi.logo_url} 
                alt="Logo" 
                className="w-1/3 h-auto opacity-90"
                style={{ filter: 'drop-shadow(0 0 1px white)' }}
              />
            </div>
          )}
        </div>
        
        {/* Gold separator line */}
        <div className="h-[2px] bg-amber-500 mx-1"></div>
        
        {/* Info Area */}
        <div className="p-1 space-y-0.5" style={{ fontSize: `${s(5)}px` }}>
          <div className="font-bold truncate">{data.nama_aksesori || data.nama_barang}</div>
          <div className="text-[0.7em] text-gray-600">{data.kode_display}</div>
          <div className="text-[0.65em] truncate">{data.tahun} - {data.parent_nama || data.nama_barang}</div>
        </div>
        
        {/* Vertical Code on Right */}
        <div 
          className="absolute right-0 top-0 h-full flex items-center justify-center bg-white"
          style={{ writingMode: 'vertical-rl', fontSize: `${s(4)}px`, width: `${s(4)}mm` }}
        >
          <span className="text-gray-500">{data.kode_vertikal}</span>
        </div>
      </div>
    </div>
  );
};

// Stiker Sedang Component
const StikerSedang = ({ data, instansi, qrDataUrl, scale = 1 }) => {
  const s = (val) => val * scale;
  
  return (
    <div 
      className="stiker-sedang bg-white border border-black relative overflow-hidden flex"
      style={{ width: `${s(60)}mm`, height: `${s(90)}mm`, fontSize: `${s(7)}px` }}
    >
      {/* Left: QR Code Area */}
      <div className="w-1/2 border-r border-black flex items-center justify-center p-1 relative">
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR" className="w-full h-auto object-contain" />
        )}
        {/* Logo overlay */}
        {instansi?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img 
              src={instansi.logo_url} 
              alt="Logo" 
              className="w-1/3 h-auto opacity-90"
              style={{ filter: 'drop-shadow(0 0 2px white)' }}
            />
          </div>
        )}
      </div>
      
      {/* Right: Info Area */}
      <div className="w-1/2 flex flex-col relative">
        {/* Header */}
        <div className="border-b border-black p-1 flex items-center gap-1">
          {instansi?.logo_url && (
            <img src={instansi.logo_url} alt="" className="w-4 h-4 object-contain" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate leading-tight" style={{ fontSize: `${s(6)}px` }}>
              {instansi?.nama_instansi || 'INSTANSI'}
            </div>
            <div className="text-gray-600 truncate" style={{ fontSize: `${s(5)}px` }}>
              {data.kode_register_full}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-1 space-y-1" style={{ fontSize: `${s(6)}px` }}>
          <div className="flex justify-between">
            <span className="text-gray-600">{data.nup || '1'}</span>
          </div>
          <div className="font-bold">{data.kategori_singkat}</div>
          <div className="text-[0.9em] leading-tight line-clamp-3">
            {data.deskripsi}
          </div>
        </div>
        
        {/* Footer - Red Warning */}
        <div 
          className="text-center font-bold italic p-0.5"
          style={{ fontSize: `${s(5)}px`, color: '#dc2626' }}
        >
          Tidak Untuk Diperjualbelikan
        </div>
        
        {/* Vertical Code */}
        <div 
          className="absolute right-0 top-0 h-full flex items-center justify-center bg-white border-l border-black"
          style={{ writingMode: 'vertical-rl', fontSize: `${s(4.5)}px`, width: `${s(5)}mm` }}
        >
          <span className="text-gray-500">{data.kode_vertikal}</span>
        </div>
      </div>
    </div>
  );
};

// Stiker Besar Component (scaled up version of Sedang)
const StikerBesar = ({ data, instansi, qrDataUrl, scale = 1 }) => {
  const s = (val) => val * scale;
  
  return (
    <div 
      className="stiker-besar bg-white border-2 border-black relative overflow-hidden flex"
      style={{ width: `${s(90)}mm`, height: `${s(130)}mm`, fontSize: `${s(9)}px` }}
    >
      {/* Left: QR Code Area */}
      <div className="w-1/2 border-r-2 border-black flex items-center justify-center p-2 relative">
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR" className="w-full h-auto object-contain" />
        )}
        {/* Logo overlay */}
        {instansi?.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img 
              src={instansi.logo_url} 
              alt="Logo" 
              className="w-1/3 h-auto opacity-90"
              style={{ filter: 'drop-shadow(0 0 3px white)' }}
            />
          </div>
        )}
      </div>
      
      {/* Right: Info Area */}
      <div className="w-1/2 flex flex-col relative">
        {/* Header */}
        <div className="border-b-2 border-black p-2 flex items-center gap-2">
          {instansi?.logo_url && (
            <img src={instansi.logo_url} alt="" className="w-6 h-6 object-contain" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate leading-tight" style={{ fontSize: `${s(8)}px` }}>
              {instansi?.nama_instansi || 'INSTANSI'}
            </div>
            <div className="text-gray-600 truncate" style={{ fontSize: `${s(6)}px` }}>
              {data.kode_register_full}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-2 space-y-2" style={{ fontSize: `${s(8)}px` }}>
          <div className="flex justify-between">
            <span className="text-gray-600">NUP: {data.nup || '1'}</span>
            <span className="font-bold">{data.tahun}</span>
          </div>
          <div className="font-bold text-lg">{data.kategori_singkat}</div>
          <div className="leading-tight line-clamp-4">
            {data.deskripsi}
          </div>
        </div>
        
        {/* Footer - Red Warning */}
        <div 
          className="text-center font-bold italic p-1 border-t border-black"
          style={{ fontSize: `${s(7)}px`, color: '#dc2626' }}
        >
          Tidak Untuk Diperjualbelikan
        </div>
        
        {/* Vertical Code */}
        <div 
          className="absolute right-0 top-0 h-full flex items-center justify-center bg-white border-l-2 border-black"
          style={{ writingMode: 'vertical-rl', fontSize: `${s(6)}px`, width: `${s(7)}mm` }}
        >
          <span className="text-gray-700 font-medium">{data.kode_vertikal}</span>
        </div>
      </div>
    </div>
  );
};

// ==================== PRINT CANVAS COMPONENT ====================
const PrintCanvas = ({ items, canvasSize, instansi, onClose }) => {
  const printRef = useRef(null);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Generate QR codes for all items
  useEffect(() => {
    const generateQRCodes = async () => {
      setLoading(true);
      const codes = {};
      for (const item of items) {
        const qrText = `#${item.kode_register || item.kode_barang}-${item.nup || '1'}`;
        codes[item.id] = await generateQRCodeDataURL(qrText, 200);
      }
      setQrCodes(codes);
      setLoading(false);
    };
    generateQRCodes();
  }, [items]);
  
  const canvas = CANVAS_SIZES[canvasSize];
  
  // Calculate grid layout
  const calculateGrid = useCallback(() => {
    if (items.length === 0) return { cols: 0, rows: 0, itemsPerPage: 0 };
    
    const size = STICKER_SIZES[items[0].ukuran];
    const usableWidth = canvas.width - (2 * MARGIN);
    const usableHeight = canvas.height - (2 * MARGIN);
    
    const cols = Math.floor((usableWidth + GAP) / (size.width + GAP));
    const rows = Math.floor((usableHeight + GAP) / (size.height + GAP));
    
    return { cols, rows, itemsPerPage: cols * rows };
  }, [items, canvasSize]);
  
  const { cols, rows, itemsPerPage } = calculateGrid();
  const pages = Math.ceil(items.length / itemsPerPage) || 1;
  
  // Prepare sticker data
  const prepareStickerData = (item) => ({
    ...item,
    kode_display: `#${item.kode_register || `${item.kode_barang}-${item.nup || '1'}`}`,
    kode_register_full: item.kode_register || `${item.kode_barang}-${item.nup || '1'}`,
    kode_vertikal: `${item.kode_barang?.substring(0, 6) || '000000'}T/${item.nup || '1'}/${new Date().getFullYear()}`,
    kategori_singkat: item.golongan_barang?.split(' ')[0] || item.kategori || 'Aset',
    deskripsi: `${item.nama_barang}${item.merk ? ` - ${item.merk}` : ''}${item.tipe ? ` ${item.tipe}` : ''}`,
    tahun: item.tahun_anggaran || item.tgl_perolehan?.substring(0, 4) || new Date().getFullYear()
  });
  
  const handlePrint = () => {
    window.print();
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
          <p className="text-sm text-gray-500">Canvas: {canvasSize} | {cols}x{rows} per halaman | {pages} halaman</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Cetak
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
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              {/* Crop Marks - Corners */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                {/* Top-Left */}
                <line x1="0" y1={`${CROP_MARK_LENGTH}mm`} x2="0" y2="0" stroke="black" strokeWidth="0.5" />
                <line x1="0" y1="0" x2={`${CROP_MARK_LENGTH}mm`} y2="0" stroke="black" strokeWidth="0.5" />
                
                {/* Top-Right */}
                <line x1={`${canvas.width}mm`} y1={`${CROP_MARK_LENGTH}mm`} x2={`${canvas.width}mm`} y2="0" stroke="black" strokeWidth="0.5" />
                <line x1={`${canvas.width}mm`} y1="0" x2={`${canvas.width - CROP_MARK_LENGTH}mm`} y2="0" stroke="black" strokeWidth="0.5" />
                
                {/* Bottom-Left */}
                <line x1="0" y1={`${canvas.height - CROP_MARK_LENGTH}mm`} x2="0" y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.5" />
                <line x1="0" y1={`${canvas.height}mm`} x2={`${CROP_MARK_LENGTH}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.5" />
                
                {/* Bottom-Right */}
                <line x1={`${canvas.width}mm`} y1={`${canvas.height - CROP_MARK_LENGTH}mm`} x2={`${canvas.width}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.5" />
                <line x1={`${canvas.width}mm`} y1={`${canvas.height}mm`} x2={`${canvas.width - CROP_MARK_LENGTH}mm`} y2={`${canvas.height}mm`} stroke="black" strokeWidth="0.5" />
                
                {/* Registration marks for cutting machine */}
                {pageItems.map((_, idx) => {
                  const col = idx % cols;
                  const row = Math.floor(idx / cols);
                  const x = MARGIN + col * (size.width + GAP);
                  const y = MARGIN + row * (size.height + GAP);
                  
                  return (
                    <g key={idx}>
                      {/* Corner marks for each sticker */}
                      <line x1={`${x - 2}mm`} y1={`${y}mm`} x2={`${x}mm`} y2={`${y}mm`} stroke="black" strokeWidth="0.3" />
                      <line x1={`${x}mm`} y1={`${y - 2}mm`} x2={`${x}mm`} y2={`${y}mm`} stroke="black" strokeWidth="0.3" />
                      
                      <line x1={`${x + size.width}mm`} y1={`${y}mm`} x2={`${x + size.width + 2}mm`} y2={`${y}mm`} stroke="black" strokeWidth="0.3" />
                      <line x1={`${x + size.width}mm`} y1={`${y - 2}mm`} x2={`${x + size.width}mm`} y2={`${y}mm`} stroke="black" strokeWidth="0.3" />
                      
                      <line x1={`${x - 2}mm`} y1={`${y + size.height}mm`} x2={`${x}mm`} y2={`${y + size.height}mm`} stroke="black" strokeWidth="0.3" />
                      <line x1={`${x}mm`} y1={`${y + size.height}mm`} x2={`${x}mm`} y2={`${y + size.height + 2}mm`} stroke="black" strokeWidth="0.3" />
                      
                      <line x1={`${x + size.width}mm`} y1={`${y + size.height}mm`} x2={`${x + size.width + 2}mm`} y2={`${y + size.height}mm`} stroke="black" strokeWidth="0.3" />
                      <line x1={`${x + size.width}mm`} y1={`${y + size.height}mm`} x2={`${x + size.width}mm`} y2={`${y + size.height + 2}mm`} stroke="black" strokeWidth="0.3" />
                    </g>
                  );
                })}
              </svg>
              
              {/* Stickers Grid */}
              <div 
                className="absolute grid"
                style={{ 
                  top: `${MARGIN}mm`,
                  left: `${MARGIN}mm`,
                  gridTemplateColumns: `repeat(${cols}, ${size.width}mm)`,
                  gap: `${GAP}mm`
                }}
              >
                {pageItems.map((item, idx) => {
                  const stickerData = prepareStickerData(item);
                  const StickerComponent = 
                    item.ukuran === 'kecil' ? StikerKecil :
                    item.ukuran === 'besar' ? StikerBesar : StikerSedang;
                  
                  return (
                    <StickerComponent 
                      key={idx}
                      data={stickerData}
                      instansi={instansi}
                      qrDataUrl={qrCodes[item.id]}
                    />
                  );
                })}
              </div>
              
              {/* Page Number */}
              <div className="absolute bottom-2 right-4 text-xs text-gray-400">
                Halaman {pageIdx + 1} / {pages}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-content { padding: 0; }
          .print-page {
            page-break-after: always;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .print-page:last-child {
            page-break-after: auto;
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
            Kode Induk: #{parentAsset?.kode_register || `${parentAsset?.kode_barang}-${parentAsset?.nup || '1'}`}
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
    // Log print batch
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
          <TabsTrigger value="cetak" className="flex items-center gap-1">
            <Printer className="w-4 h-4" />
            Antrian Cetak ({selectedItems.length})
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            Riwayat Cetak
          </TabsTrigger>
        </TabsList>
        
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
                              #{asset.kode_register || `${asset.kode_barang}-${asset.nup || '1'}`}
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
                  <p className="text-sm">Pilih aset dari tab "Daftar Aset"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                      <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="font-medium">{item.nama_barang}</div>
                        <div className="text-xs text-gray-500">
                          #{item.kode_register || `${item.kode_barang}-${item.nup || '1'}`}
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
          onClose={() => {
            handlePrintComplete();
          }}
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
