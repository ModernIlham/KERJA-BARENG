/**
 * LabelBMN.jsx - Halaman Manajemen Pelabelan Stiker BMN
 * 
 * UKURAN STIKER:
 * - Kecil: 2.38cm × 3.98cm (Portrait)
 * - Sedang: 6.98cm × 2.21cm (Landscape) 
 * - Besar: 9.49cm × 3.22cm (Landscape)
 * 
 * FONT SPECS:
 * - Primary: Roboto, Arial fallback
 * - Minimum readable: 5pt
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
  Link2, RefreshCw, Eye, Palette, Image, ChevronDown, ChevronUp, Square, Circle,
  Copy, Save, RotateCcw, Type, AlignLeft, AlignRight, Ruler, Layers, PaintBucket, Move
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
  const qrRef = useRef(null);

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

// ==================== STICKER COMPONENTS - FROM HTML TEMPLATES ====================

/**
 * Stiker KECIL - 2.38cm × 3.98cm (Portrait)
 * SPESIFIKASI FONT (dari HTML template):
 * - Nama Barang: 6.5pt (bold) - Roboto Condensed atau Arial Narrow
 * - Quantity Box: 10pt (bold) - dapat memuat 5 digit
 * - Kode Inventaris: 8pt (bold) - Roboto atau Arial
 * - Tahun (bold): 5.5pt - Roboto atau Arial  
 * - Deskripsi: 5pt - Roboto atau Arial
 * - Kode Vertikal: 6pt (bold) - Roboto Condensed (TANPA border/background)
 */
const StikerKecil = ({ data, instansi, qrSettings }) => {
  const styles = {
    container: {
      width: '2.38cm',
      height: '3.98cm',
      background: 'white',
      border: '1px solid #2c2c2c',
      display: 'flex',
      fontFamily: "'Roboto', Arial, sans-serif",
      overflow: 'hidden'
    },
    // Main horizontal container
    mainContainer: {
      display: 'flex',
      flex: 1,
      width: '100%'
    },
    // Left content area (excluding vertical code)
    leftContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #2c2c2c'
    },
    // QR Area - box persegi sendiri dengan border bawah
    qrArea: {
      width: '100%',
      aspectRatio: '1/1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: '1px solid #2c2c2c',
      padding: '2px',
      boxSizing: 'border-box',
      background: qrSettings?.backgroundColor || '#ffffff'
    },
    goldStripe: {
      width: '100%',
      height: '3px',
      background: 'linear-gradient(90deg, #D4AF37, #C9A227)'
    },
    infoSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      color: '#1a1a1a',
      minHeight: 0
    },
    namaQtyRow: {
      display: 'flex',
      borderBottom: '1px solid #2c2c2c'
    },
    namaBarang: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '6.5pt',
      fontWeight: 600,
      padding: '2px 3px',
      lineHeight: 1.2,
      borderRight: '1px solid #2c2c2c',
      textAlign: 'center',
      overflow: 'hidden'
    },
    quantityBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10pt',
      fontWeight: 700,
      minWidth: '28px',
      padding: '2px 3px'
    },
    kodeInventaris: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '8pt',
      fontWeight: 700,
      padding: '3px 2px',
      borderBottom: '1px solid #2c2c2c'
    },
    tahunDeskripsi: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontSize: '5pt',
      fontWeight: 400,
      padding: '2px 3px',
      lineHeight: 1.3
    },
    // Vertical code area - di sebelah kanan, TANPA border kiri (sudah ada dari leftContent)
    verticalCode: {
      width: '13px',
      minWidth: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff'
    },
    verticalText: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      fontSize: '6pt',
      fontWeight: 700,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
      color: '#1a1a1a'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.mainContainer}>
        <div style={styles.leftContent}>
          <div style={styles.qrArea}>
            <StyledQRCode 
              data={`#${data.kode_register || data.kode_barang}`}
              settings={qrSettings}
              logoUrl={instansi?.logo_url}
              size={68}
            />
          </div>
          <div style={styles.goldStripe} />
          <div style={styles.infoSection}>
            <div style={styles.namaQtyRow}>
              <div style={styles.namaBarang}>{data.nama_barang}</div>
              <div style={styles.quantityBox}>{data.nup || '1'}</div>
            </div>
            <div style={styles.kodeInventaris}>{data.kode_barang}</div>
            <div style={styles.tahunDeskripsi}>
              <span><strong style={{ fontSize: '5.5pt', fontWeight: 700 }}>{data.tahun || new Date().getFullYear()}</strong> - {data.merk || data.merk_tipe || '-'}</span>
            </div>
          </div>
        </div>
        <div style={styles.verticalCode}>
          <span style={styles.verticalText}>{data.kode_vertikal}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Stiker SEDANG - 6.98cm × 2.21cm (Landscape)
 * SPESIFIKASI FONT (dari HTML template):
 * - Header "Otorita IKN": 7.5pt (bold) - Roboto atau Arial
 * - Kode Registrasi: 6.5pt (bold) - Roboto Condensed
 * - Kode Barang: 7.5pt (bold) - Roboto atau Arial
 * - Nama Barang: 6.5pt (medium) - Roboto atau Arial
 * - Quantity Box: 11pt (bold) - dapat memuat 5 digit
 * - Deskripsi: 5.5pt - Roboto atau Arial
 * - Peringatan Merah: 6pt (bold) - Roboto atau Arial
 * - Kode Vertikal: 6pt (bold) - Roboto Condensed (TANPA border/background)
 */
const StikerSedang = ({ data, instansi, qrSettings }) => {
  const styles = {
    container: {
      width: '6.98cm',
      height: '2.21cm',
      background: 'white',
      border: '1px solid #2c2c2c',
      display: 'flex',
      fontFamily: "'Roboto', Arial, sans-serif",
      overflow: 'hidden'
    },
    qrArea: {
      width: '2.21cm',
      minWidth: '2.21cm',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: '1px solid #2c2c2c',
      padding: '3px',
      background: qrSettings?.backgroundColor || '#ffffff'
    },
    middleContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid #2c2c2c',
      padding: '3px 5px'
    },
    headerLogo: {
      flexShrink: 0
    },
    headerText: {
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '8px',
      minWidth: 0
    },
    headerTitle: {
      fontSize: '7.5pt',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    headerCode: {
      fontSize: '6.5pt',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    mainContent: {
      flex: 1,
      display: 'flex'
    },
    infoSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #2c2c2c'
    },
    kodeQtyRow: {
      display: 'flex',
      borderBottom: '1px solid #2c2c2c'
    },
    kodeInfo: {
      flex: 1,
      padding: '2px 5px'
    },
    kodeBarang: {
      fontSize: '7.5pt',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    namaBarang: {
      fontSize: '6.5pt',
      fontWeight: 500,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    quantityBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11pt',
      fontWeight: 700,
      minWidth: '34px',
      padding: '2px 5px',
      borderLeft: '1px solid #2c2c2c',
      color: '#1a1a1a'
    },
    deskripsiArea: {
      flex: 1,
      padding: '2px 5px'
    },
    deskripsi: {
      fontSize: '5.5pt',
      lineHeight: 1.3,
      color: '#1a1a1a'
    },
    warningText: {
      fontSize: '6pt',
      fontWeight: 700,
      color: '#DC2626',
      marginTop: '2px'
    },
    // Vertical code TANPA border (sesuai permintaan user)
    verticalCode: {
      width: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    verticalText: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      fontSize: '6pt',
      fontWeight: 700,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
      color: '#1a1a1a'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.qrArea}>
        <StyledQRCode 
          data={`#${data.kode_register || data.kode_barang}`}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={70}
        />
      </div>
      
      <div style={styles.middleContent}>
        <div style={styles.headerRow}>
          {instansi?.logo_url && (
            <div style={styles.headerLogo}>
              <img src={instansi.logo_url} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
            </div>
          )}
          <div style={styles.headerText}>
            <span style={styles.headerTitle}>{instansi?.nama_instansi || 'Otorita Ibu Kota Nusantara'}</span>
            <span style={styles.headerCode}>{instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}</span>
          </div>
        </div>
        
        <div style={styles.mainContent}>
          <div style={styles.infoSection}>
            <div style={styles.kodeQtyRow}>
              <div style={styles.kodeInfo}>
                <div style={styles.kodeBarang}>{data.kode_barang}</div>
                <div style={styles.namaBarang}>{data.nama_barang}</div>
              </div>
              <div style={styles.quantityBox}>{data.nup || '1'}</div>
            </div>
            <div style={styles.deskripsiArea}>
              <p style={styles.deskripsi}>{data.merk_tipe || data.merk || '-'}</p>
              <p style={styles.warningText}>Tidak Untuk Diperjualbelikan</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.verticalCode}>
        <span style={styles.verticalText}>{data.kode_vertikal}</span>
      </div>
    </div>
  );
};

/**
 * Stiker BESAR - 9.49cm × 3.22cm (Landscape)
 * SPESIFIKASI FONT (dari HTML template):
 * - Header "Otorita IKN": 10pt (bold) - Roboto atau Arial
 * - Kode Registrasi: 9pt (bold) - Roboto Condensed
 * - Kode Barang: 10pt (bold) - Roboto atau Arial
 * - Nama Barang: 9pt (medium) - Roboto atau Arial
 * - Quantity Box: 14pt (bold) - dapat memuat 5 digit
 * - Deskripsi: 8pt - Roboto atau Arial
 * - Peringatan Merah: 9pt (bold) - Roboto atau Arial
 * - Kode Vertikal: 9pt (bold) - Roboto Condensed (TANPA border/background)
 */
const StikerBesar = ({ data, instansi, qrSettings }) => {
  const styles = {
    container: {
      width: '9.49cm',
      height: '3.22cm',
      background: 'white',
      border: '1px solid #2c2c2c',
      display: 'flex',
      fontFamily: "'Roboto', Arial, sans-serif",
      overflow: 'hidden'
    },
    qrArea: {
      width: '3.22cm',
      minWidth: '3.22cm',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: '1px solid #2c2c2c',
      padding: '5px',
      background: qrSettings?.backgroundColor || '#ffffff'
    },
    middleContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid #2c2c2c',
      padding: '5px 8px'
    },
    headerLogo: {
      flexShrink: 0
    },
    headerText: {
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '12px',
      minWidth: 0
    },
    headerTitle: {
      fontSize: '10pt',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    headerCode: {
      fontSize: '9pt',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    mainContent: {
      flex: 1,
      display: 'flex'
    },
    infoSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #2c2c2c'
    },
    kodeQtyRow: {
      display: 'flex',
      borderBottom: '1px solid #2c2c2c'
    },
    kodeInfo: {
      flex: 1,
      padding: '3px 8px'
    },
    kodeBarang: {
      fontSize: '10pt',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    namaBarang: {
      fontSize: '9pt',
      fontWeight: 500,
      lineHeight: 1.2,
      color: '#1a1a1a'
    },
    quantityBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14pt',
      fontWeight: 700,
      minWidth: '45px',
      padding: '3px 8px',
      borderLeft: '1px solid #2c2c2c',
      color: '#1a1a1a'
    },
    deskripsiArea: {
      flex: 1,
      padding: '3px 8px'
    },
    deskripsi: {
      fontSize: '8pt',
      lineHeight: 1.3,
      color: '#1a1a1a'
    },
    warningText: {
      fontSize: '9pt',
      fontWeight: 700,
      color: '#DC2626',
      marginTop: '3px'
    },
    // Vertical code TANPA border (sesuai permintaan user)
    verticalCode: {
      width: '21px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    verticalText: {
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      fontSize: '9pt',
      fontWeight: 700,
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
      color: '#1a1a1a'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.qrArea}>
        <StyledQRCode 
          data={`#${data.kode_register || data.kode_barang}`}
          settings={qrSettings}
          logoUrl={instansi?.logo_url}
          size={105}
        />
      </div>
      
      <div style={styles.middleContent}>
        <div style={styles.headerRow}>
          {instansi?.logo_url && (
            <div style={styles.headerLogo}>
              <img src={instansi.logo_url} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            </div>
          )}
          <div style={styles.headerText}>
            <span style={styles.headerTitle}>{instansi?.nama_instansi || 'Otorita Ibu Kota Nusantara'}</span>
            <span style={styles.headerCode}>{instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}</span>
          </div>
        </div>
        
        <div style={styles.mainContent}>
          <div style={styles.infoSection}>
            <div style={styles.kodeQtyRow}>
              <div style={styles.kodeInfo}>
                <div style={styles.kodeBarang}>{data.kode_barang}</div>
                <div style={styles.namaBarang}>{data.nama_barang}</div>
              </div>
              <div style={styles.quantityBox}>{data.nup || '1'}</div>
            </div>
            <div style={styles.deskripsiArea}>
              <p style={styles.deskripsi}>{data.merk_tipe || data.merk || '-'}</p>
              <p style={styles.warningText}>Tidak Untuk Diperjualbelikan</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.verticalCode}>
        <span style={styles.verticalText}>{data.kode_vertikal}</span>
      </div>
    </div>
  );
};

// ==================== PRINT PAGE COMPONENT ====================
// Basic default designs for immediate use while loading from API
const BASIC_DEFAULTS = {
  kecil: { layout: 'portrait', width: 23.8, height: 39.8, size_type: 'kecil' },
  sedang: { layout: 'landscape', width: 69.8, height: 22.1, size_type: 'sedang' },
  besar: { layout: 'landscape', width: 94.9, height: 32.2, size_type: 'besar' }
};

const PrintPage = ({ items, canvasSize, instansi, qrSettings, onClose, onPrintComplete, activeDesigns }) => {
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState(activeDesigns || BASIC_DEFAULTS);
  const printRef = useRef(null);
  const canvas = CANVAS_SIZES[canvasSize];
  
  // Load active designs if not provided
  useEffect(() => {
    const loadActiveDesigns = async () => {
      if (activeDesigns) {
        setDesigns(activeDesigns);
        return;
      }
      
      try {
        // Load active design for each size
        const [kecilRes, sedangRes, besarRes] = await Promise.all([
          api.get('/api/label-bmn/sticker-design/active/kecil').catch(() => ({ data: null })),
          api.get('/api/label-bmn/sticker-design/active/sedang').catch(() => ({ data: null })),
          api.get('/api/label-bmn/sticker-design/active/besar').catch(() => ({ data: null }))
        ]);
        
        setDesigns({
          kecil: kecilRes.data || BASIC_DEFAULTS.kecil,
          sedang: sedangRes.data || BASIC_DEFAULTS.sedang,
          besar: besarRes.data || BASIC_DEFAULTS.besar
        });
      } catch {
        // Use defaults
        setDesigns(BASIC_DEFAULTS);
      }
    };
    
    loadActiveDesigns();
  }, [activeDesigns]);
  
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
    const sizeType = item.ukuran || 'sedang';
    const design = designs[sizeType] || BASIC_DEFAULTS[sizeType];
    
    // Use CustomSticker with active design for proper alignment support
    return <CustomSticker design={design} data={stickerData} instansi={instansi} qrSettings={qrSettings} />;
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
        <div className="bg-white p-8 rounded-lg text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Generating QR Codes...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* 
        CRITICAL PRINT STYLES - Mengikuti template HTML dari user
        Hanya #print-area yang akan terlihat saat dicetak
      */}
      <style>{`
        @media print {
          /* Sembunyikan SEMUA elemen terlebih dahulu */
          body * {
            visibility: hidden !important;
          }
          
          /* Tampilkan HANYA area cetak dan semua child-nya */
          #print-area,
          #print-area * {
            visibility: visible !important;
          }
          
          /* Posisikan area cetak di pojok kiri atas */
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          
          /* Page break untuk setiap halaman */
          .print-page {
            page-break-after: always !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          
          .print-page:last-child {
            page-break-after: auto !important;
          }
          
          /* Sembunyikan elemen no-print */
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Pengaturan body untuk cetak */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Pengaturan halaman cetak */
          @page {
            size: ${canvasSize};
            margin: 0;
          }
        }
      `}</style>
      
      {/* Screen UI - Disembunyikan saat mencetak dengan class no-print */}
      <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-auto no-print">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
          <div>
            <h2 className="font-bold">Preview Cetak Label ({items.length} stiker)</h2>
            <p className="text-sm text-gray-500">Canvas: {canvasSize} | {cols}x{rows} per halaman | {pages} halaman</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />Cetak ({pages} Halaman)
            </Button>
          </div>
        </div>
        
        <div className="p-4 flex flex-col items-center">
          {Array.from({ length: pages }).map((_, pageIdx) => {
            const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
            const size = STICKER_SIZES[items[0].ukuran];
            
            return (
              <div 
                key={pageIdx}
                className="bg-white mb-4 relative"
                style={{ 
                  width: `${canvas.width}mm`, 
                  height: `${canvas.height}mm`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                  Hal {pageIdx + 1}/{pages}
                </div>
                
                <div 
                  className="absolute grid"
                  style={{ 
                    left: `${MARGIN}mm`, 
                    top: `${MARGIN}mm`,
                    gap: `${GAP}mm`,
                    gridTemplateColumns: `repeat(${cols}, ${size.width}mm)`
                  }}
                >
                  {pageItems.map((item, idx) => (
                    <div key={idx}>{renderSticker(item, prepareStickerData(item))}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 
        AREA CETAK - Hanya ini yang tampil saat mencetak
        ID "print-area" digunakan oleh CSS @media print
      */}
      <div id="print-area" ref={printRef} className="fixed left-0 top-0 hidden print:block">
        {Array.from({ length: pages }).map((_, pageIdx) => {
          const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
          const size = STICKER_SIZES[items[0].ukuran];
          
          return (
            <div 
              key={pageIdx}
              className="print-page bg-white relative"
              style={{ 
                width: `${canvas.width}mm`, 
                height: `${canvas.height}mm`
              }}
            >
              {/* Crop Marks */}
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
              
              <div 
                className="absolute grid"
                style={{ 
                  left: `${MARGIN}mm`, 
                  top: `${MARGIN}mm`,
                  gap: `${GAP}mm`,
                  gridTemplateColumns: `repeat(${cols}, ${size.width}mm)`
                }}
              >
                {pageItems.map((item, idx) => (
                  <div key={idx}>{renderSticker(item, prepareStickerData(item))}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
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
  const [qrTemplates, setQrTemplates] = useState([]);
  const [showPrintPage, setShowPrintPage] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeTab, setActiveTab] = useState('daftar');
  const [activeDesigns, setActiveDesigns] = useState({});
  
  // Load QR templates - shared between QRCustomizationPanel and StickerDesignTab
  const loadQrTemplates = async () => {
    try {
      const res = await api.get('/api/label-bmn/qr-templates');
      setQrTemplates(res.data);
    } catch {
      // Ignore error
    }
  };
  
  // Load active designs for each size
  const loadActiveDesigns = async () => {
    try {
      const [kecilRes, sedangRes, besarRes] = await Promise.all([
        api.get('/api/label-bmn/sticker-design/active/kecil').catch(() => ({ data: null })),
        api.get('/api/label-bmn/sticker-design/active/sedang').catch(() => ({ data: null })),
        api.get('/api/label-bmn/sticker-design/active/besar').catch(() => ({ data: null }))
      ]);
      
      setActiveDesigns({
        kecil: kecilRes.data || null,
        sedang: sedangRes.data || null,
        besar: besarRes.data || null
      });
    } catch {
      // Use null for fallback to legacy components
    }
  };
  
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
    loadQrTemplates(); // Load QR templates on mount
    loadActiveDesigns(); // Load active designs on mount
  }, []);
  
  const toggleSelect = (asset) => {
    setSelectedItems(prev => prev.find(i => i.id === asset.id) ? prev.filter(i => i.id !== asset.id) : [...prev, { ...asset, ukuran: selectedSize }]);
  };
  
  const selectAll = () => {
    setSelectedItems(selectedItems.length === assets.length ? [] : assets.map(a => ({ ...a, ukuran: selectedSize })));
  };
  
  const handlePrint = () => {
    if (selectedItems.length === 0) return toast.error('Pilih minimal 1 aset');
    setShowPrintPage(true);
  };
  
  const handlePrintComplete = async () => {
    try {
      await api.post('/api/label-bmn/print-batch', { items: selectedItems.map(i => ({ barang_id: i.id, ukuran: i.ukuran, is_child: false })), canvas_size: canvasSize });
      toast.success('Pencetakan dicatat');
      loadAssets();
      setSelectedItems([]);
    } catch { toast.error('Gagal mencatat'); }
    setShowPrintPage(false);
  };
  
  // Handler untuk cetak aksesori dari modal
  const handlePrintChildAssets = (childAssets, parentAsset) => {
    // Prepare child assets for printing with parent info
    const itemsForPrint = childAssets.map(child => ({
      id: child.id,
      kode_barang: child.kode_register_anak,
      kode_register: child.kode_register_anak,
      nama_barang: child.nama_aksesori,
      merk: parentAsset?.merk || '',
      tipe: parentAsset?.tipe || '',
      nup: '1',
      tahun: new Date().getFullYear().toString(),
      ukuran: 'kecil', // Aksesori selalu ukuran kecil
      is_child: true,
      child_id: child.id,
      parent_id: parentAsset?.id
    }));
    
    setSelectedItems(itemsForPrint);
    setShowPrintPage(true);
  };
  
  // Handler untuk print complete aksesori
  const handleChildPrintComplete = async () => {
    try {
      const childItems = selectedItems.filter(i => i.is_child);
      if (childItems.length > 0) {
        await api.post('/api/label-bmn/print-batch', { 
          items: childItems.map(i => ({ 
            barang_id: i.parent_id, 
            ukuran: i.ukuran, 
            is_child: true,
            child_id: i.child_id 
          })), 
          canvas_size: canvasSize 
        });
        toast.success('Pencetakan aksesori dicatat');
      }
      loadAssets();
      setSelectedItems([]);
    } catch { toast.error('Gagal mencatat'); }
    setShowPrintPage(false);
  };
  
  return (
    <div className="space-y-6 print:hidden">
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
          <TabsTrigger value="cetak" className="flex items-center gap-1"><Printer className="w-4 h-4" />Antrian ({selectedItems.length})</TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-1"><History className="w-4 h-4" />Riwayat</TabsTrigger>
          <TabsTrigger value="qr-custom" className="flex items-center gap-1"><QrCode className="w-4 h-4" />Kustomisasi QR</TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-1"><Settings2 className="w-4 h-4" />Pengaturan Design</TabsTrigger>
        </TabsList>
        
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
                  <th className="text-center p-3">Aksesori</th>
                  <th className="text-center p-3">Status Cetak</th>
                  <th className="text-center p-3">Aksi</th>
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} className="text-center p-8">Memuat...</td></tr> :
                   assets.length === 0 ? <tr><td colSpan={6} className="text-center p-8 text-gray-500">Tidak ada data</td></tr> :
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
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => { setSelectedParent(asset); setShowChildModal(true); }}
                             className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                           >
                             <Link2 className="w-4 h-4 mr-1" />
                             {asset.child_count > 0 ? (
                               <Badge variant="secondary" className="ml-1">{asset.child_count}</Badge>
                             ) : (
                               <span className="text-xs">Kelola</span>
                             )}
                           </Button>
                         </td>
                         <td className="text-center p-3">
                           {asset.print_count > 0 ? (
                             <div className="flex flex-col items-center gap-1">
                               <Badge className="bg-green-100 text-green-700">
                                 <CheckCircle2 className="w-3 h-3 mr-1" />{asset.print_count}x
                               </Badge>
                               {asset.last_printed && (
                                 <span className="text-xs text-gray-400">
                                   {new Date(asset.last_printed).toLocaleDateString('id-ID')}
                                 </span>
                               )}
                             </div>
                           ) : (
                             <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Belum</Badge>
                           )}
                         </td>
                         <td className="text-center p-3">
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => { setSelectedItems([{ ...asset, ukuran: selectedSize }]); setShowPrintPage(true); }}
                             title="Preview & Cetak"
                           >
                             <Eye className="w-4 h-4" />
                           </Button>
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
        
        <TabsContent value="qr-custom">
          <QRCustomizationPanel qrSettings={qrSettings} onSettingsChange={setQrSettings} instansi={instansi} qrTemplates={qrTemplates} onQrTemplatesChange={loadQrTemplates} activeDesigns={activeDesigns} />
        </TabsContent>
        
        <TabsContent value="design"><StickerDesignTab instansi={instansi} qrSettings={qrSettings} onQrSettingsChange={setQrSettings} qrTemplates={qrTemplates} onQrTemplatesChange={loadQrTemplates} /></TabsContent>
      </Tabs>
      
      {showPrintPage && (
        <PrintPage 
          items={selectedItems}
          canvasSize={canvasSize}
          instansi={instansi}
          qrSettings={qrSettings}
          onClose={() => setShowPrintPage(false)}
          onPrintComplete={selectedItems.some(i => i.is_child) ? handleChildPrintComplete : handlePrintComplete}
        />
      )}
      
      {showChildModal && (
        <ChildAssetModal 
          open={showChildModal}
          onClose={() => setShowChildModal(false)}
          parentAsset={selectedParent}
          onSuccess={loadAssets}
          onPrintChild={handlePrintChildAssets}
        />
      )}
    </div>
  );
}

// ==================== CHILD ASSET MODAL ====================
function ChildAssetModal({ open, onClose, parentAsset, onSuccess, onPrintChild }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newChild, setNewChild] = useState({ nama_aksesori: '', keterangan: '' });
  const [selectedChildren, setSelectedChildren] = useState([]);
  
  useEffect(() => {
    if (open && parentAsset?.id) {
      setLoading(true);
      setSelectedChildren([]);
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
  
  const handleDeleteChild = async (childId) => {
    try {
      await api.delete(`/api/label-bmn/child-asset/${childId}`);
      toast.success('Aksesori dihapus');
      setChildren(prev => prev.filter(c => c.id !== childId));
      onSuccess?.();
    } catch { toast.error('Gagal menghapus aksesori'); }
  };
  
  const toggleSelectChild = (child) => {
    setSelectedChildren(prev => 
      prev.find(c => c.id === child.id) 
        ? prev.filter(c => c.id !== child.id)
        : [...prev, child]
    );
  };
  
  const handlePrintSelected = () => {
    if (selectedChildren.length === 0) return toast.error('Pilih minimal 1 aksesori');
    // Pass selected children to parent for printing
    onPrintChild?.(selectedChildren, parentAsset);
    onClose();
  };
  
  const PRESETS = ['Charger/Adaptor', 'Tas Laptop', 'Mouse', 'Keyboard', 'Kabel Power', 'USB Hub', 'Headset', 'Kabel Data', 'Stand/Dudukan'];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5" />Kelola Aksesori - {parentAsset?.nama_barang}</DialogTitle>
          <DialogDescription>Kode: #{parentAsset?.kode_register || parentAsset?.kode_barang}</DialogDescription>
        </DialogHeader>
        
        {/* Add New Accessory */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Tambah Aksesori Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {PRESETS.map(p => (
                <Badge 
                  key={p} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-blue-50 transition-colors" 
                  onClick={() => setNewChild({ ...newChild, nama_aksesori: p })}
                >
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Nama aksesori (contoh: Charger Laptop)" 
                value={newChild.nama_aksesori} 
                onChange={e => setNewChild({ ...newChild, nama_aksesori: e.target.value })} 
                className="flex-1" 
              />
              <Input 
                placeholder="Keterangan (opsional)" 
                value={newChild.keterangan} 
                onChange={e => setNewChild({ ...newChild, keterangan: e.target.value })} 
                className="flex-1" 
              />
              <Button onClick={handleAddChild}><Plus className="w-4 h-4 mr-1" />Tambah</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Accessory List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Package className="w-4 h-4" />Daftar Aksesori ({children.length})</span>
              {children.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handlePrintSelected} 
                  disabled={selectedChildren.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Cetak Label ({selectedChildren.length})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-10 p-2"></th>
                    <th className="text-left p-2">Nama Aksesori</th>
                    <th className="text-left p-2">Kode Register</th>
                    <th className="text-center p-2">Status Cetak</th>
                    <th className="text-center p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center p-4">Memuat...</td></tr>
                  ) : children.length === 0 ? (
                    <tr><td colSpan={5} className="text-center p-4 text-gray-500">Belum ada aksesori terdaftar</td></tr>
                  ) : (
                    children.map(child => {
                      const isSelected = selectedChildren.some(c => c.id === child.id);
                      return (
                        <tr key={child.id} className={`border-t ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <td className="p-2 text-center">
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => toggleSelectChild(child)} 
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{child.nama_aksesori}</div>
                            {child.keterangan && <div className="text-xs text-gray-500">{child.keterangan}</div>}
                          </td>
                          <td className="p-2">
                            <code className="bg-slate-100 px-1 rounded text-xs">#{child.kode_register_anak}</code>
                          </td>
                          <td className="text-center p-2">
                            {child.print_count > 0 ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />{child.print_count}x
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />Belum
                              </Badge>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteChild(child.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Info Section */}
        <div className="text-xs text-gray-500 bg-slate-50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Kode register aksesori otomatis dibuat berdasarkan kode aset induk</li>
            <li>Pilih aksesori yang akan dicetak, lalu klik tombol &quot;Cetak Label&quot;</li>
            <li>Stiker aksesori menggunakan ukuran Kecil (2.38x3.98cm)</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== PRINT HISTORY TAB ====================
function PrintHistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [dateFilter, setDateFilter] = useState('semua');
  
  useEffect(() => {
    Promise.all([
      api.get('/api/label-bmn/print-history', { params: { limit: 100 } }),
      api.get('/api/label-bmn/print-stats')
    ])
      .then(([historyRes, statsRes]) => {
        setHistory(historyRes.data.data || []);
        setStats(statsRes.data);
      })
      .catch(() => toast.error('Gagal memuat riwayat'))
      .finally(() => setLoading(false));
  }, []);
  
  // Filter history by date
  const filteredHistory = history.filter(log => {
    if (dateFilter === 'semua') return true;
    const logDate = new Date(log.printed_at);
    const today = new Date();
    if (dateFilter === 'hari_ini') {
      return logDate.toDateString() === today.toDateString();
    }
    if (dateFilter === 'minggu_ini') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return logDate >= weekAgo;
    }
    if (dateFilter === 'bulan_ini') {
      return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
    }
    return true;
  });
  
  if (loading) return <div className="text-center py-8">Memuat...</div>;
  
  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-gray-500">Total Aset</div>
            <div className="text-2xl font-bold">{stats.total_assets?.toLocaleString() || 0}</div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-xs text-green-600">Sudah Dicetak</div>
            <div className="text-2xl font-bold text-green-700">{stats.assets_printed?.toLocaleString() || 0}</div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="text-xs text-amber-600">Belum Dicetak</div>
            <div className="text-2xl font-bold text-amber-700">{stats.assets_not_printed?.toLocaleString() || 0}</div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-xs text-blue-600">Total Cetak</div>
            <div className="text-2xl font-bold text-blue-700">{stats.total_prints?.toLocaleString() || 0}</div>
          </Card>
        </div>
      )}
      
      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><History className="w-5 h-5" />Riwayat Cetak Label</span>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Waktu</SelectItem>
                <SelectItem value="hari_ini">Hari Ini</SelectItem>
                <SelectItem value="minggu_ini">7 Hari Terakhir</SelectItem>
                <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Belum ada riwayat cetak</p>
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
                  {filteredHistory.map(log => (
                    <tr key={log.id} className="border-t hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium">{new Date(log.printed_at).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-gray-500">{new Date(log.printed_at).toLocaleTimeString('id-ID')}</div>
                      </td>
                      <td className="p-3">{log.barang?.nama_barang || log.nama_barang || '-'}</td>
                      <td className="p-3">
                        <code className="text-xs bg-slate-100 px-1 rounded">
                          #{log.barang?.kode_barang || log.kode_barang || '-'}
                        </code>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant="outline"
                          className={
                            log.ukuran === 'kecil' ? 'border-purple-300 text-purple-700' :
                            log.ukuran === 'sedang' ? 'border-blue-300 text-blue-700' :
                            'border-green-300 text-green-700'
                          }
                        >
                          {STICKER_SIZES[log.ukuran]?.label || log.ukuran}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-500 text-sm max-w-[150px] truncate">
                        {typeof log.printed_by === 'object' 
                          ? (log.printed_by?.full_name || log.printed_by?.email || 'Admin')
                          : (log.printed_by || 'System')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredHistory.length > 0 && (
            <div className="text-xs text-gray-400 mt-4 text-center">
              Menampilkan {filteredHistory.length} dari {history.length} riwayat cetak
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== QR CODE CUSTOMIZATION PANEL ====================
function QRCustomizationPanel({ qrSettings, onSettingsChange, instansi, qrTemplates, onQrTemplatesChange, activeDesigns }) {
  const [localSettings, setLocalSettings] = useState(qrSettings);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [previewStickerType, setPreviewStickerType] = useState('kecil');
  
  // Use shared templates from parent if available
  const templates = qrTemplates || [];
  
  // Get active design for current preview type
  const currentActiveDesign = activeDesigns?.[previewStickerType];
  
  useEffect(() => {
    setLocalSettings(qrSettings);
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
          <div className="bg-slate-100 p-3 rounded-lg flex justify-center overflow-auto">
            {currentActiveDesign ? (
              <div className={`transform ${previewStickerType === 'sedang' ? 'scale-75' : previewStickerType === 'besar' ? 'scale-50' : ''} origin-center`}>
                <CustomSticker 
                  data={sampleData} 
                  design={currentActiveDesign} 
                  instansi={instansi} 
                  qrSettings={localSettings} 
                />
              </div>
            ) : (
              <>
                {previewStickerType === 'kecil' && (
                  <StikerKecil data={sampleData} instansi={instansi} qrSettings={localSettings} />
                )}
                {previewStickerType === 'sedang' && (
                  <div className="transform scale-75 origin-center">
                    <StikerSedang data={sampleData} instansi={instansi} qrSettings={localSettings} />
                  </div>
                )}
                {previewStickerType === 'besar' && (
                  <div className="transform scale-50 origin-center">
                    <StikerBesar data={sampleData} instansi={instansi} qrSettings={localSettings} />
                  </div>
                )}
              </>
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


// ==================== DEFAULT STICKER DESIGN CONFIGS (ADVANCED) ====================
const DEFAULT_DESIGN_CONFIGS = {
  kecil: {
    name: "Stiker Kecil - Default",
    size_type: "kecil",
    width: 23.8,
    height: 39.8,
    layout: "portrait",
    
    // QR Code Settings (Advanced)
    qr_position: "top",
    qr_size: 100,
    qr_padding: 0,
    // QR margins - default 0 untuk dekat dengan border
    qr_margin_top: 0,
    qr_margin_bottom: 0,
    qr_margin_left: 0,
    qr_margin_right: 0,
    qr_align: "center",
    
    // Header Settings
    show_header: false,
    header_show_logo: false,
    header_font_size: 6.5,
    header_sub_font_size: 6,
    header_text: "",
    header_bg_color: "#ffffff",
    header_text_color: "#1a1a1a",
    header_align: "center",
    header_padding: 3,
    header_border_bottom: true,
    
    // Kode Barang Settings
    kode_font_size: 8,
    kode_font_weight: 700,
    kode_align: "center",
    kode_padding: 3,
    kode_bg_color: "#ffffff",
    kode_text_color: "#1a1a1a",
    kode_border_bottom: true,
    kode_letter_spacing: 0,
    kode_text_transform: "none",
    
    // Nama Barang Settings
    nama_font_size: 6.5,
    nama_font_weight: 600,
    nama_align: "center",
    nama_padding: 2,
    nama_line_height: 1.2,
    nama_max_lines: 2,
    
    // NUP Settings
    show_nup: true,
    nup_font_size: 10,
    nup_min_width: 28,
    nup_bg_color: "#ffffff",
    nup_text_color: "#1a1a1a",
    nup_border_left: true,
    nup_align: "center",
    
    // Description Settings
    show_description: true,
    desc_font_size: 5,
    desc_align: "center",
    desc_line_height: 1.3,
    desc_padding: 2,
    desc_bg_color: "#ffffff",
    
    // Warning Settings
    show_warning: false,
    warning_text: "",
    warning_font_size: 5,
    warning_color: "#DC2626",
    warning_align: "center",
    warning_font_weight: 700,
    
    // Vertical Code Settings
    show_vertical_code: true,
    vertical_font_size: 6,
    vertical_width: 13,
    vertical_show_border: false,
    vertical_bg_color: "#ffffff",
    vertical_text_color: "#1a1a1a",
    vertical_letter_spacing: 0.3,
    
    // Gold Stripe Settings
    show_gold_stripe: true,
    gold_stripe_height: 3,
    gold_stripe_color: "#D4AF37",
    gold_stripe_gradient: true,
    gold_stripe_color_end: "#C9A227",
    
    // Border & Frame Settings
    border_width: 1,
    border_color: "#2c2c2c",
    border_style: "solid",
    border_radius: 0,
    border_top: true,
    border_right: true,
    border_bottom: true,
    border_left: true,
    
    // Section Borders (Table-like)
    section_border_width: 1,
    section_border_color: "#2c2c2c",
    section_border_style: "solid",
    
    // Background & Shading
    font_family: "Roboto",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    
    // Advanced Spacing
    content_padding: 0,
    element_gap: 0
  },
  sedang: {
    name: "Stiker Sedang - Default",
    size_type: "sedang",
    width: 69.8,
    height: 22.1,
    layout: "landscape",
    
    // QR Code Settings (Advanced)
    qr_position: "left",
    qr_size: 100,
    qr_padding: 0,
    // QR margins - default 0 untuk dekat dengan border
    qr_margin_top: 0,
    qr_margin_bottom: 0,
    qr_margin_left: 0,
    qr_margin_right: 0,
    qr_align: "center",
    
    // Header Settings
    show_header: true,
    header_show_logo: true,
    header_logo_size: 16,
    header_font_size: 7.5,
    header_sub_font_size: 6.5,
    header_text: "Otorita Ibu Kota Nusantara",
    header_bg_color: "#ffffff",
    header_text_color: "#1a1a1a",
    header_align: "left",
    header_padding: 4,
    header_border_bottom: true,
    
    // Kode Barang Settings
    kode_font_size: 7.5,
    kode_font_weight: 700,
    kode_align: "left",
    kode_padding: 4,
    kode_bg_color: "#ffffff",
    kode_text_color: "#1a1a1a",
    kode_border_bottom: false,
    kode_letter_spacing: 0,
    kode_text_transform: "none",
    
    // Nama Barang Settings
    nama_font_size: 6.5,
    nama_font_weight: 500,
    nama_align: "left",
    nama_padding: 4,
    nama_line_height: 1.2,
    nama_max_lines: 1,
    
    // NUP Settings
    show_nup: true,
    nup_font_size: 11,
    nup_min_width: 34,
    nup_bg_color: "#ffffff",
    nup_text_color: "#1a1a1a",
    nup_border_left: true,
    nup_align: "center",
    
    // Description Settings
    show_description: true,
    desc_font_size: 5.5,
    desc_align: "left",
    desc_line_height: 1.3,
    desc_padding: 4,
    desc_bg_color: "#ffffff",
    
    // Warning Settings
    show_warning: true,
    warning_text: "Tidak Untuk Diperjualbelikan",
    warning_font_size: 6,
    warning_color: "#DC2626",
    warning_align: "left",
    warning_font_weight: 700,
    
    // Vertical Code Settings
    show_vertical_code: true,
    vertical_font_size: 6,
    vertical_width: 13,
    vertical_show_border: false,
    vertical_bg_color: "#ffffff",
    vertical_text_color: "#1a1a1a",
    vertical_letter_spacing: 0.3,
    
    // Gold Stripe Settings
    show_gold_stripe: false,
    gold_stripe_height: 3,
    gold_stripe_color: "#D4AF37",
    gold_stripe_gradient: true,
    gold_stripe_color_end: "#C9A227",
    
    // Border & Frame Settings
    border_width: 1,
    border_color: "#2c2c2c",
    border_style: "solid",
    border_radius: 0,
    border_top: true,
    border_right: true,
    border_bottom: true,
    border_left: true,
    
    // Section Borders
    section_border_width: 1,
    section_border_color: "#2c2c2c",
    section_border_style: "solid",
    
    // Background & Shading
    font_family: "Roboto",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    
    // Advanced Spacing
    content_padding: 0,
    element_gap: 0
  },
  besar: {
    name: "Stiker Besar - Default",
    size_type: "besar",
    width: 94.9,
    height: 32.2,
    layout: "landscape",
    
    // QR Code Settings (Advanced)
    qr_position: "left",
    qr_size: 100,
    qr_padding: 0,
    // QR margins - default 0 untuk dekat dengan border
    qr_margin_top: 0,
    qr_margin_bottom: 0,
    qr_margin_left: 0,
    qr_margin_right: 0,
    qr_align: "center",
    
    // Header Settings
    show_header: true,
    header_show_logo: true,
    header_logo_size: 22,
    header_font_size: 10,
    header_sub_font_size: 9,
    header_text: "Otorita Ibu Kota Nusantara",
    header_bg_color: "#ffffff",
    header_text_color: "#1a1a1a",
    header_align: "left",
    header_padding: 5,
    header_border_bottom: true,
    
    // Kode Barang Settings
    kode_font_size: 10,
    kode_font_weight: 700,
    kode_align: "left",
    kode_padding: 5,
    kode_bg_color: "#ffffff",
    kode_text_color: "#1a1a1a",
    kode_border_bottom: false,
    kode_letter_spacing: 0,
    kode_text_transform: "none",
    
    // Nama Barang Settings
    nama_font_size: 9,
    nama_font_weight: 500,
    nama_align: "left",
    nama_padding: 5,
    nama_line_height: 1.2,
    nama_max_lines: 1,
    
    // NUP Settings
    show_nup: true,
    nup_font_size: 14,
    nup_min_width: 45,
    nup_bg_color: "#ffffff",
    nup_text_color: "#1a1a1a",
    nup_border_left: true,
    nup_align: "center",
    
    // Description Settings
    show_description: true,
    desc_font_size: 8,
    desc_align: "left",
    desc_line_height: 1.3,
    desc_padding: 5,
    desc_bg_color: "#ffffff",
    
    // Warning Settings
    show_warning: true,
    warning_text: "Tidak Untuk Diperjualbelikan",
    warning_font_size: 9,
    warning_color: "#DC2626",
    warning_align: "left",
    warning_font_weight: 700,
    
    // Vertical Code Settings
    show_vertical_code: true,
    vertical_font_size: 9,
    vertical_width: 21,
    vertical_show_border: false,
    vertical_bg_color: "#ffffff",
    vertical_text_color: "#1a1a1a",
    vertical_letter_spacing: 0.5,
    
    // Gold Stripe Settings
    show_gold_stripe: false,
    gold_stripe_height: 3,
    gold_stripe_color: "#D4AF37",
    gold_stripe_gradient: true,
    gold_stripe_color_end: "#C9A227",
    
    // Border & Frame Settings
    border_width: 1,
    border_color: "#2c2c2c",
    border_style: "solid",
    border_radius: 0,
    border_top: true,
    border_right: true,
    border_bottom: true,
    border_left: true,
    
    // Section Borders
    section_border_width: 1,
    section_border_color: "#2c2c2c",
    section_border_style: "solid",
    
    // Background & Shading
    font_family: "Roboto",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    
    // Advanced Spacing
    content_padding: 0,
    element_gap: 0
  }
};

// ==================== STICKER DESIGN EDITOR TAB ====================
function StickerDesignTab({ instansi, qrSettings, onQrSettingsChange, qrTemplates, onQrTemplatesChange }) {
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
      if (editingDesign.id?.startsWith('default_') || !editingDesign.id) {
        // Create new design from default - only when ID is default
        const res = await api.post('/api/label-bmn/sticker-design', {
          ...editingDesign,
          name: editingDesign.name.includes('(Kustom)') ? editingDesign.name : `${editingDesign.name} (Kustom)`
        });
        toast.success('Design baru berhasil disimpan');
        // Update selected design with new data from server
        const newDesign = res.data.design;
        setSelectedDesign(newDesign);
        setEditingDesign({ ...newDesign });
        // Reload designs but keep the newly created design selected
        const designsRes = await api.get('/api/label-bmn/sticker-designs');
        setDesigns(designsRes.data);
      } else {
        // Update existing - always update the selected design in place
        await api.put(`/api/label-bmn/sticker-design/${editingDesign.id}`, editingDesign);
        toast.success('Design berhasil diperbarui');
        // Update local state without full reload
        setDesigns(prev => {
          const sizeType = editingDesign.size_type || selectedSizeType;
          const updatedList = (prev[sizeType] || []).map(d => 
            d.id === editingDesign.id ? { ...editingDesign } : d
          );
          return { ...prev, [sizeType]: updatedList };
        });
        // Keep selection
        setSelectedDesign({ ...editingDesign });
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
        <QRTemplatesPanel 
          qrSettings={qrSettings} 
          onSelectTemplate={setQrSettingsFromTemplate}
          templates={qrTemplates}
          onTemplatesChange={onQrTemplatesChange}
        />
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

// ==================== QR TEMPLATES PANEL ====================
function QRTemplatesPanel({ qrSettings, onSelectTemplate, templates, onTemplatesChange }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return toast.error('Masukkan nama template');
    setSaving(true);
    
    try {
      const templateData = {
        name: newTemplateName,
        ...qrSettings
      };
      
      await api.post('/api/label-bmn/qr-template', templateData);
      toast.success('Template QR berhasil disimpan');
      setNewTemplateName('');
      onTemplatesChange?.(); // Notify parent to reload
    } catch {
      toast.error('Gagal menyimpan template');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Hapus template QR ini?')) return;
    try {
      await api.delete(`/api/label-bmn/qr-template/${templateId}`);
      toast.success('Template dihapus');
      onTemplatesChange?.(); // Notify parent to reload
    } catch {
      toast.error('Gagal menghapus template');
    }
  };
  
  const handleSetActive = async (template) => {
    try {
      await api.post('/api/label-bmn/qr-template/set-active', { template_id: template.id });
      // Apply template settings immediately to the UI
      onSelectTemplate?.(template);
      toast.success(`Template QR "${template.name}" diterapkan`);
    } catch {
      toast.error('Gagal mengatur template aktif');
    }
  };
  
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Template QR Code Tersimpan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Save current QR settings as template */}
        <div className="flex gap-2">
          <Input 
            placeholder="Nama template baru..."
            value={newTemplateName}
            onChange={e => setNewTemplateName(e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" onClick={handleSaveTemplate} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? 'Menyimpan...' : 'Simpan QR Saat Ini'}
          </Button>
        </div>
        
        {/* Template List */}
        {(!templates || templates.length === 0) ? (
          <div className="text-center py-4 text-sm text-gray-500">
            <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Belum ada template QR tersimpan</p>
            <p className="text-xs">Atur style QR di tab &quot;Kustomisasi QR&quot; lalu simpan sebagai template</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {templates.map(template => (
              <div 
                key={template.id}
                className="p-2 border rounded-lg bg-white hover:border-blue-400 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate flex-1">{template.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: template.dotsColor || template.bodyColor || '#000' }}
                    title="Body"
                  />
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: template.cornerSquareColor || template.eyeColor || '#000' }}
                    title="External Eye"
                  />
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: template.cornerDotColor || '#000' }}
                    title="Internal Eye"
                  />
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: template.backgroundColor || '#fff' }}
                    title="Background"
                  />
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full mt-2 h-6 text-xs"
                  onClick={() => handleSetActive(template)}
                >
                  Gunakan
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-gray-500 bg-white p-2 rounded">
          💡 Tip: Untuk mengubah style QR, gunakan panel &quot;Kustomisasi QR Code&quot; di tab &quot;Kustomisasi QR&quot;
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== ALIGNMENT SELECTOR COMPONENTS ====================
// Simple horizontal alignment selector (left, center, right)
const AlignSelectorSimple = ({ value, onChange, label }) => (
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

const FullAlignSelectorComponent = ({ value, onChange, label }) => (
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
const BorderControlComponent = ({ design, updateField, prefix, label }) => (
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

// ==================== DESIGN EDITOR FORM (ADVANCED) ====================
function DesignEditorForm({ design, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...design, [field]: value });
  };
  
  const [activeSection, setActiveSection] = useState('dimensi');
  
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
      
      {/* ==================== QR CODE SECTION (ADVANCED) ==================== */}
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
      
      {/* ==================== KONTEN SECTION (ADVANCED) ==================== */}
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Letter Spacing</Label>
                <Input type="number" step="0.1" value={design.kode_letter_spacing || 0} onChange={e => updateField('kode_letter_spacing', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Padding (px)</Label>
                <Input type="number" value={design.kode_padding || 4} onChange={e => updateField('kode_padding', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
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
            <div>
              <Label className="text-[10px] text-gray-500">Line Height</Label>
              <Input type="number" step="0.1" value={design.nama_line_height || 1.2} onChange={e => updateField('nama_line_height', parseFloat(e.target.value))} className="h-7 text-xs" />
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Background</Label>
                    <Input type="color" value={design.nup_bg_color || '#ffffff'} onChange={e => updateField('nup_bg_color', e.target.value)} className="h-7 w-full" />
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Label className="text-[10px] text-gray-500">Border Kiri</Label>
                    <Switch checked={design.nup_border_left !== false} onCheckedChange={v => updateField('nup_border_left', v)} />
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
                  <div>
                    <Label className="text-[10px] text-gray-500">Line Height</Label>
                    <Input type="number" step="0.1" value={design.desc_line_height || 1.3} onChange={e => updateField('desc_line_height', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500">Padding (px)</Label>
                  <Input type="number" value={design.desc_padding || 4} onChange={e => updateField('desc_padding', parseFloat(e.target.value))} className="h-7 text-xs" />
                </div>
                <FullAlignSelectorComponent value={design.desc_full_align || 'top-left'} onChange={v => updateField('desc_full_align', v)} label="Posisi Deskripsi (9 Arah)" />
              </>
            )}
          </div>
          
          {/* Warning */}
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Warning Text</Label>
              <Switch checked={design.show_warning} onCheckedChange={v => updateField('show_warning', v)} />
            </div>
            {design.show_warning && (
              <>
                <Input value={design.warning_text || ''} onChange={e => updateField('warning_text', e.target.value)} className="h-7 text-xs" placeholder="Teks peringatan..." />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.warning_font_size || 6} onChange={e => updateField('warning_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Warna</Label>
                    <Input type="color" value={design.warning_color || '#DC2626'} onChange={e => updateField('warning_color', e.target.value)} className="h-7 w-full" />
                  </div>
                </div>
                <FullAlignSelectorComponent value={design.warning_full_align || 'bottom-left'} onChange={v => updateField('warning_full_align', v)} label="Posisi Warning (9 Arah)" />
              </>
            )}
          </div>
          
          {/* Vertical Code */}
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Kode Vertikal</Label>
              <Switch checked={design.show_vertical_code} onCheckedChange={v => updateField('show_vertical_code', v)} />
            </div>
            {design.show_vertical_code && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Font (pt)</Label>
                    <Input type="number" step="0.5" value={design.vertical_font_size || 6} onChange={e => updateField('vertical_font_size', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Lebar Area (px)</Label>
                    <Input type="number" value={design.vertical_width || 13} onChange={e => updateField('vertical_width', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Letter Spacing</Label>
                    <Input type="number" step="0.1" value={design.vertical_letter_spacing || 0.3} onChange={e => updateField('vertical_letter_spacing', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Label className="text-[10px] text-gray-500">Show Border</Label>
                    <Switch checked={design.vertical_show_border} onCheckedChange={v => updateField('vertical_show_border', v)} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* ==================== BORDER SECTION ==================== */}
      {activeSection === 'border' && (
        <div className="space-y-3">
          {/* Page Border (Outer Frame) */}
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Border Luar (Frame)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Tebal (px)</Label>
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
            <div>
              <Label className="text-[10px] text-gray-500">Style</Label>
              <Select value={design.border_style || 'solid'} onValueChange={v => updateField('border_style', v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <BorderControlComponent design={design} updateField={updateField} prefix="border" label="Sisi Border Aktif" />
          </div>
          
          {/* Section Border (Inner Dividers) */}
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Border Section (Pemisah)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Tebal (px)</Label>
                <Input type="number" step="0.5" value={design.section_border_width || 1} onChange={e => updateField('section_border_width', parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Warna</Label>
                <Input type="color" value={design.section_border_color || '#2c2c2c'} onChange={e => updateField('section_border_color', e.target.value)} className="h-7 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Style</Label>
                <Select value={design.section_border_style || 'solid'} onValueChange={v => updateField('section_border_style', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Gold Stripe */}
          <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Gold Stripe (Dekoratif)</Label>
              <Switch checked={design.show_gold_stripe} onCheckedChange={v => updateField('show_gold_stripe', v)} />
            </div>
            {design.show_gold_stripe && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Tinggi (px)</Label>
                    <Input type="number" value={design.gold_stripe_height || 3} onChange={e => updateField('gold_stripe_height', parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Warna Utama</Label>
                    <Input type="color" value={design.gold_stripe_color || '#D4AF37'} onChange={e => updateField('gold_stripe_color', e.target.value)} className="h-7 w-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-gray-500">Gradient</Label>
                  <Switch checked={design.gold_stripe_gradient !== false} onCheckedChange={v => updateField('gold_stripe_gradient', v)} />
                </div>
                {design.gold_stripe_gradient !== false && (
                  <div>
                    <Label className="text-[10px] text-gray-500">Warna Akhir</Label>
                    <Input type="color" value={design.gold_stripe_color_end || '#C9A227'} onChange={e => updateField('gold_stripe_color_end', e.target.value)} className="h-7 w-full" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* ==================== TAMPILAN SECTION ==================== */}
      {activeSection === 'tampilan' && (
        <div className="space-y-3">
          {/* Font Family */}
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
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
                <SelectItem value="Tahoma">Tahoma</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Colors */}
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
          
          {/* Section Shading */}
          <div className="p-2 border rounded-lg space-y-2">
            <Label className="text-xs font-medium">Shading / Background Section</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Header BG</Label>
                <Input type="color" value={design.header_bg_color || '#ffffff'} onChange={e => updateField('header_bg_color', e.target.value)} className="h-7 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Kode BG</Label>
                <Input type="color" value={design.kode_bg_color || '#ffffff'} onChange={e => updateField('kode_bg_color', e.target.value)} className="h-7 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">NUP BG</Label>
                <Input type="color" value={design.nup_bg_color || '#ffffff'} onChange={e => updateField('nup_bg_color', e.target.value)} className="h-7 w-full" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Deskripsi BG</Label>
                <Input type="color" value={design.desc_bg_color || '#ffffff'} onChange={e => updateField('desc_bg_color', e.target.value)} className="h-7 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Vertikal BG</Label>
                <Input type="color" value={design.vertical_bg_color || '#ffffff'} onChange={e => updateField('vertical_bg_color', e.target.value)} className="h-7 w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CUSTOM STICKER COMPONENT (ADVANCED) ====================
const CustomSticker = ({ design, data, instansi, qrSettings }) => {
  // Helper untuk alignment sederhana
  const getJustify = (align) => align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const getTextAlign = (align) => align || 'left';
  
  // Helper untuk 9-posisi alignment (full alignment)
  const getFullAlignStyle = (fullAlign) => {
    if (!fullAlign) return {};
    
    const alignMap = {
      'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' },
      'top-center': { alignItems: 'flex-start', justifyContent: 'center', textAlign: 'center' },
      'top-right': { alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right' },
      'center-left': { alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left' },
      'center': { alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
      'center-right': { alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' },
      'bottom-left': { alignItems: 'flex-end', justifyContent: 'flex-start', textAlign: 'left' },
      'bottom-center': { alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center' },
      'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end', textAlign: 'right' }
    };
    
    return alignMap[fullAlign] || alignMap['center'];
  };
  
  // Helper untuk border style
  const getBorderStyle = (side = true) => {
    if (!side) return 'none';
    return `${design.section_border_width || 1}px ${design.section_border_style || 'solid'} ${design.section_border_color || '#2c2c2c'}`;
  };
  
  // Landscape layout (sedang/besar style)
  if (design.layout === 'landscape') {
    return (
      <div 
        style={{
          width: `${design.width}mm`,
          height: `${design.height}mm`,
          background: design.background_color || '#ffffff',
          borderWidth: `${design.border_width || 1}px`,
          borderStyle: design.border_style || 'solid',
          borderColor: design.border_color || '#2c2c2c',
          borderTopWidth: design.border_top === false ? 0 : `${design.border_width || 1}px`,
          borderRightWidth: design.border_right === false ? 0 : `${design.border_width || 1}px`,
          borderBottomWidth: design.border_bottom === false ? 0 : `${design.border_width || 1}px`,
          borderLeftWidth: design.border_left === false ? 0 : `${design.border_width || 1}px`,
          borderRadius: `${design.border_radius || 0}px`,
          display: 'flex',
          fontFamily: `'${design.font_family || 'Roboto'}', Arial, sans-serif`,
          overflow: 'hidden',
          color: design.text_color || '#1a1a1a',
          padding: design.content_padding || 0
        }}
      >
        {/* QR Area - dengan margin yang bisa diatur sampai 0 dan resize dari center */}
        <div style={{
          width: `${design.height}mm`,
          minWidth: `${design.height}mm`,
          maxWidth: `${design.height}mm`,
          height: `${design.height}mm`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: getBorderStyle(true),
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          background: qrSettings?.backgroundColor || '#ffffff',
        }}>
          {/* Inner wrapper for alignment - QR akan selalu resize dari center */}
          <div style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            ...getFullAlignStyle(design.qr_align || 'center')
          }}>
            <StyledQRCode 
              data={`#${data.kode_register || data.kode_barang}`}
              settings={qrSettings}
              logoUrl={instansi?.logo_url}
              size={Math.max(10, Math.floor(
                ((design.height || 22.1) * 3.78) * ((design.qr_size || 100) / 100) - 
                ((design.qr_margin_top || 0) + (design.qr_margin_bottom || 0) + (design.qr_margin_left || 0) + (design.qr_margin_right || 0))
              ))}
              style={{
                marginTop: `${design.qr_margin_top !== undefined ? design.qr_margin_top : 0}px`,
                marginRight: `${design.qr_margin_right !== undefined ? design.qr_margin_right : 0}px`,
                marginBottom: `${design.qr_margin_bottom !== undefined ? design.qr_margin_bottom : 0}px`,
                marginLeft: `${design.qr_margin_left !== undefined ? design.qr_margin_left : 0}px`,
                transition: 'all 0.15s ease-out'
              }}
            />
          </div>
        </div>
        
        {/* Middle Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: design.element_gap || 0 }}>
          {/* Header */}
          {design.show_header && (
            <div style={{
              display: 'flex',
              borderBottom: design.header_border_bottom !== false ? getBorderStyle() : 'none',
              padding: `${design.header_padding || 4}px`,
              background: design.header_bg_color || '#ffffff',
              ...getFullAlignStyle(design.header_full_align || 'center-left')
            }}>
              {design.header_show_logo && instansi?.logo_url && (
                <img src={instansi.logo_url} alt="" style={{ width: `${design.header_logo_size || 16}px`, height: `${design.header_logo_size || 16}px`, objectFit: 'contain', marginRight: '8px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: getFullAlignStyle(design.header_full_align || 'center-left').textAlign }}>
                <span style={{ fontSize: `${design.header_font_size || 7.5}pt`, fontWeight: 700, lineHeight: 1.2, color: design.header_text_color || '#1a1a1a' }}>
                  {design.header_text || instansi?.nama_instansi || 'Nama Instansi'}
                </span>
                <span style={{ fontSize: `${design.header_sub_font_size || 6.5}pt`, fontWeight: 700, lineHeight: 1.2 }}>
                  {instansi?.kode_uakpb || ''}KP.{data.tahun || new Date().getFullYear()}
                </span>
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: design.show_vertical_code ? getBorderStyle() : 'none' }}>
              {/* Kode & NUP Row */}
              <div style={{ display: 'flex', borderBottom: getBorderStyle() }}>
                <div style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: `${design.kode_padding || 4}px`,
                  background: design.kode_bg_color || '#ffffff',
                  ...getFullAlignStyle(design.kode_full_align || 'center-left')
                }}>
                  <div style={{ 
                    fontSize: `${design.kode_font_size || 7.5}pt`, 
                    fontWeight: design.kode_font_weight || 700, 
                    lineHeight: 1.2,
                    letterSpacing: `${design.kode_letter_spacing || 0}px`,
                    textTransform: design.kode_text_transform || 'none',
                    textAlign: getFullAlignStyle(design.kode_full_align || 'center-left').textAlign
                  }}>
                    {data.kode_barang}
                  </div>
                  <div style={{ 
                    fontSize: `${design.nama_font_size || 6.5}pt`, 
                    fontWeight: design.nama_font_weight || 500, 
                    lineHeight: design.nama_line_height || 1.2,
                    textAlign: getFullAlignStyle(design.nama_full_align || 'center-left').textAlign,
                    ...getFullAlignStyle(design.nama_full_align || 'center-left')
                  }}>
                    {data.nama_barang}
                  </div>
                </div>
                {design.show_nup && (
                  <div style={{
                    display: 'flex',
                    fontSize: `${design.nup_font_size || 11}pt`,
                    fontWeight: 700,
                    minWidth: `${design.nup_min_width || 34}px`,
                    padding: '2px 5px',
                    borderLeft: design.nup_border_left !== false ? getBorderStyle() : 'none',
                    background: design.nup_bg_color || '#ffffff',
                    color: design.nup_text_color || '#1a1a1a',
                    ...getFullAlignStyle(design.nup_full_align || 'center')
                  }}>
                    {data.nup || '1'}
                  </div>
                )}
              </div>
              
              {/* Description & Warning Content Area */}
              <div style={{ 
                flex: 1, 
                display: 'flex',
                flexDirection: 'column',
                padding: `${design.desc_padding || 4}px`,
                background: design.desc_bg_color || '#ffffff',
                position: 'relative'
              }}>
                {/* Description */}
                {design.show_description && (
                  <div style={{ 
                    display: 'flex',
                    ...getFullAlignStyle(design.desc_full_align)
                  }}>
                    <p style={{ 
                      fontSize: `${design.desc_font_size || 5.5}pt`, 
                      lineHeight: design.desc_line_height || 1.3,
                      textAlign: getFullAlignStyle(design.desc_full_align).textAlign || getTextAlign(design.desc_align)
                    }}>
                      {data.merk_tipe || data.merk || '-'}
                    </p>
                  </div>
                )}
                
                {/* Warning with 9-position alignment */}
                {design.show_warning && (
                  <div style={{ 
                    flex: 1,
                    display: 'flex',
                    ...getFullAlignStyle(design.warning_full_align || 'bottom-left')
                  }}>
                    <p style={{ 
                      fontSize: `${design.warning_font_size || 6}pt`, 
                      fontWeight: design.warning_font_weight || 700, 
                      color: design.warning_color || '#DC2626',
                      textAlign: getFullAlignStyle(design.warning_full_align).textAlign || getTextAlign(design.warning_align)
                    }}>
                      {design.warning_text || 'Tidak Untuk Diperjualbelikan'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Vertical Code */}
        {design.show_vertical_code && (
          <div style={{
            width: `${design.vertical_width || 13}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: design.vertical_bg_color || '#ffffff',
            borderLeft: design.vertical_show_border ? getBorderStyle() : 'none'
          }}>
            <span style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: `${design.vertical_font_size || 6}pt`,
              fontWeight: 700,
              letterSpacing: `${design.vertical_letter_spacing || 0.3}px`,
              whiteSpace: 'nowrap',
              color: design.vertical_text_color || '#1a1a1a'
            }}>
              {data.kode_vertikal}
            </span>
          </div>
        )}
      </div>
    );
  }
  
  // Portrait layout (kecil style)
  return (
    <div 
      style={{
        width: `${design.width}mm`,
        height: `${design.height}mm`,
        background: design.background_color || '#ffffff',
        borderWidth: `${design.border_width || 1}px`,
        borderStyle: design.border_style || 'solid',
        borderColor: design.border_color || '#2c2c2c',
        borderTopWidth: design.border_top === false ? 0 : `${design.border_width || 1}px`,
        borderRightWidth: design.border_right === false ? 0 : `${design.border_width || 1}px`,
        borderBottomWidth: design.border_bottom === false ? 0 : `${design.border_width || 1}px`,
        borderLeftWidth: design.border_left === false ? 0 : `${design.border_width || 1}px`,
        borderRadius: `${design.border_radius || 0}px`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: `'${design.font_family || 'Roboto'}', Arial, sans-serif`,
        overflow: 'hidden',
        color: design.text_color || '#1a1a1a',
        padding: design.content_padding || 0
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: design.show_vertical_code ? `calc(100% - ${design.vertical_width || 13}px)` : '100%' }}>
          {/* QR Area - dengan margin yang bisa diatur sampai 0 dan resize dari center */}
          <div style={{
            width: `${design.width}mm`,
            height: `${design.width}mm`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: getBorderStyle(),
            padding: 0,
            margin: 0,
            boxSizing: 'border-box',
            background: qrSettings?.backgroundColor || '#ffffff',
          }}>
            {/* Inner wrapper for alignment - QR akan selalu resize dari center */}
            <div style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              ...getFullAlignStyle(design.qr_align || 'center')
            }}>
              <StyledQRCode 
                data={`#${data.kode_register || data.kode_barang}`}
                settings={qrSettings}
                logoUrl={instansi?.logo_url}
                size={Math.max(10, Math.floor(
                  ((design.width || 23.8) * 3.78) * ((design.qr_size || 100) / 100) - 
                  ((design.qr_margin_top || 0) + (design.qr_margin_bottom || 0) + (design.qr_margin_left || 0) + (design.qr_margin_right || 0))
                ))}
                style={{
                  marginTop: `${design.qr_margin_top !== undefined ? design.qr_margin_top : 0}px`,
                  marginRight: `${design.qr_margin_right !== undefined ? design.qr_margin_right : 0}px`,
                  marginBottom: `${design.qr_margin_bottom !== undefined ? design.qr_margin_bottom : 0}px`,
                  marginLeft: `${design.qr_margin_left !== undefined ? design.qr_margin_left : 0}px`,
                  transition: 'all 0.15s ease-out'
                }}
              />
            </div>
          </div>
          
          {/* Gold Stripe */}
          {design.show_gold_stripe && (
            <div style={{
              width: '100%',
              height: `${design.gold_stripe_height || 3}px`,
              background: design.gold_stripe_gradient !== false 
                ? `linear-gradient(90deg, ${design.gold_stripe_color || '#D4AF37'}, ${design.gold_stripe_color_end || '#C9A227'})`
                : design.gold_stripe_color || '#D4AF37'
            }} />
          )}
          
          {/* Info Section */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Nama & NUP Row */}
            <div style={{ display: 'flex', borderBottom: getBorderStyle() }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: getJustify(design.nama_align),
                fontSize: `${design.nama_font_size || 6.5}pt`,
                fontWeight: design.nama_font_weight || 600,
                padding: `${design.nama_padding || 2}px 3px`,
                lineHeight: design.nama_line_height || 1.2,
                borderRight: design.show_nup ? getBorderStyle() : 'none',
                textAlign: 'center',
                overflow: 'hidden'
              }}>
                {data.nama_barang}
              </div>
              {design.show_nup && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${design.nup_font_size || 10}pt`,
                  fontWeight: 700,
                  minWidth: `${design.nup_min_width || 28}px`,
                  padding: '2px 3px',
                  background: design.nup_bg_color || '#ffffff'
                }}>
                  {data.nup || '1'}
                </div>
              )}
            </div>
            
            {/* Kode */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: getJustify(design.kode_align),
              fontSize: `${design.kode_font_size || 8}pt`,
              fontWeight: design.kode_font_weight || 700,
              padding: `${design.kode_padding || 3}px 2px`,
              borderBottom: design.show_description ? getBorderStyle() : 'none',
              letterSpacing: `${design.kode_letter_spacing || 0}px`,
              textTransform: design.kode_text_transform || 'none',
              background: design.kode_bg_color || '#ffffff'
            }}>
              {data.kode_barang}
            </div>
            
            {/* Description */}
            {design.show_description && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: getJustify(design.desc_align),
                textAlign: 'center',
                fontSize: `${design.desc_font_size || 5}pt`,
                fontWeight: 400,
                padding: `${design.desc_padding || 2}px 3px`,
                lineHeight: design.desc_line_height || 1.3,
                background: design.desc_bg_color || '#ffffff'
              }}>
                <span>
                  <strong style={{ fontSize: `${(design.desc_font_size || 5) + 0.5}pt`, fontWeight: 700 }}>
                    {data.tahun || new Date().getFullYear()}
                  </strong>
                  {' - '}{data.merk_tipe || data.merk || '-'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Vertical Code */}
        {design.show_vertical_code && (
          <div style={{
            width: `${design.vertical_width || 13}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: design.vertical_bg_color || '#ffffff',
            borderLeft: design.vertical_show_border ? getBorderStyle() : 'none'
          }}>
            <span style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: `${design.vertical_font_size || 6}pt`,
              fontWeight: 700,
              letterSpacing: `${design.vertical_letter_spacing || 0.3}px`,
              whiteSpace: 'nowrap',
              color: design.vertical_text_color || '#1a1a1a'
            }}>
              {data.kode_vertikal}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main export
