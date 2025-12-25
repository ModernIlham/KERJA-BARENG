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

  return <div ref={qrRef} style={{ width: size, height: size }} />;
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
      flexDirection: 'column',
      fontFamily: "'Roboto', Arial, sans-serif",
      overflow: 'hidden'
    },
    mainContainer: {
      display: 'flex',
      flex: 1,
      minHeight: 0
    },
    leftContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 'calc(100% - 13px)'
    },
    qrArea: {
      aspectRatio: '1/1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: '1px solid #2c2c2c',
      padding: '2px',
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
      <div style={styles.mainContainer}>
        <div style={styles.leftContent}>
          <div style={styles.qrArea}>
            <StyledQRCode 
              data={data.kode_barang}
              settings={qrSettings}
              logoUrl={instansi?.logo_url}
              size={72}
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
          data={data.kode_barang}
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
          data={data.kode_barang}
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
const PrintPage = ({ items, canvasSize, instansi, qrSettings, onClose, onPrintComplete }) => {
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);
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
  const [showPrintPage, setShowPrintPage] = useState(false);
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
