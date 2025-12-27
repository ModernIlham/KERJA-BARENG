
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, RefreshCw, Save, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';
import CustomSticker from './CustomSticker';

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
const MARGIN = 8;  // Margin lebih besar untuk cutting
const GAP = 4;     // Jarak antar stiker untuk cutting (4mm)

// Basic default designs for immediate use while loading from API
const BASIC_DEFAULTS = {
  kecil: { layout: 'portrait', width: 23.8, height: 39.8, size_type: 'kecil' },
  sedang: { layout: 'landscape', width: 69.8, height: 22.1, size_type: 'sedang' },
  besar: { layout: 'landscape', width: 94.9, height: 32.2, size_type: 'besar' }
};

const PrintPage = ({ items, canvasSize, instansi, qrSettings, onClose, onPrintComplete, activeDesigns, onGeneratePdf, generatingPdf }) => {
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
      
      // Fallback: This component ideally shouldn't fetch data directly if possible,
      // but keeping it for standalone compatibility. 
      // In a pure component, we'd expect all data via props.
      try {
        // Mock API calls or import api if needed. For refactoring, assuming props are passed.
        // If not, we fallback to basics.
        setDesigns(BASIC_DEFAULTS);
      } catch {
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
    kode_vertikal: `${item.kode_barang?.substring(0, 6) || '000000'}T/${item.nup || '1'}/${item.tahun || item.tahun_anggaran || (item.tgl_perolehan ? item.tgl_perolehan.substring(0, 4) : new Date().getFullYear())}`,
    merk_tipe: item.merk && item.tipe ? `${item.merk} - ${item.tipe}` : item.merk || item.tipe || '',
    tahun: item.tahun || item.tahun_anggaran || (item.tgl_perolehan ? item.tgl_perolehan.substring(0, 4) : new Date().getFullYear())
  });
  
  const preparePrintContent = async () => {
    // Show loading toast
    toast.info('Menyiapkan halaman cetak...', { duration: 1000 });
    
    // First, generate QR codes as data URLs
    const qrDataUrls = {};
    const qrPromises = items.map(async (item, idx) => {
      const pageIdx = Math.floor(idx / itemsPerPage);
      const itemIdx = idx % itemsPerPage;
      const qrData = item.kode_register || item.kode_barang || 'UNKNOWN';
      
      try {
        const qr = new QRCodeStyling({
          width: 300, // Higher resolution for PDF/Print
          height: 300,
          data: `#${qrData}`,
          dotsOptions: { color: qrSettings?.dotsColor || "#000000", type: qrSettings?.dotsStyle || "square" },
          backgroundOptions: { color: qrSettings?.backgroundColor || "#ffffff" },
          qrOptions: { errorCorrectionLevel: qrSettings?.errorCorrectionLevel || "M" },
          // Apply other QR settings
          cornersSquareOptions: { color: qrSettings?.cornerSquareColor || "#000000", type: qrSettings?.cornerSquareStyle || "square" },
          cornersDotOptions: { color: qrSettings?.cornerDotColor || "#000000", type: qrSettings?.cornerDotStyle || "square" }
        });
        
        // Add logo if enabled
        if (qrSettings?.logoEnabled && instansi?.logo_url) {
            qr.update({
                image: instansi.logo_url,
                imageOptions: {
                    crossOrigin: 'anonymous',
                    margin: qrSettings.logoBackgroundEnabled ? 2 : 0,
                    imageSize: (qrSettings.logoSize || 25) / 100,
                    hideBackgroundDots: true
                }
            });
        }
        
        const blob = await qr.getRawData("png");
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            qrDataUrls[`${pageIdx}-${itemIdx}`] = reader.result;
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("QR Generation Error:", e);
        return Promise.resolve();
      }
    });
    
    await Promise.all(qrPromises);
    
    // Build HTML content with QR codes
    const size = STICKER_SIZES[items[0]?.ukuran || 'sedang'];
    const pageWidth = canvasSize === 'A3' ? '297mm' : '210mm';
    const pageHeight = canvasSize === 'A3' ? '420mm' : '297mm';
    const pageSize = canvasSize === 'A3' ? 'A3 portrait' : 'A4 portrait';
    
    let pagesHtml = '';
    
    for (let pageIdx = 0; pageIdx < pages; pageIdx++) {
      const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
      
      let stickersHtml = pageItems.map((item, idx) => {
        const stickerData = prepareStickerData(item);
        const qrUrl = qrDataUrls[`${pageIdx}-${idx}`] || '';
        const sizeType = item.ukuran || 'sedang';
        const design = designs[sizeType] || BASIC_DEFAULTS[sizeType];
        const itemSize = STICKER_SIZES[sizeType];
        
        // Get design settings with fallbacks
        const bgColor = design.background_color || '#ffffff';
        const borderWidth = design.border_width || 1;
        const borderColor = design.border_color || '#2c2c2c';
        const borderRadius = design.border_radius || 0;
        const fontFamily = design.font_family || 'Roboto';
        const textColor = design.text_color || '#1a1a1a';
        
        // Header settings
        const showHeader = design.show_header !== false;
        const headerFontSize = design.header_font_size || 7;
        const headerSubFontSize = design.header_sub_font_size || 6.5;
        
        // Content settings
        const kodeFontSize = design.kode_font_size || 8;
        const kodeFontWeight = design.kode_font_weight || 700;
        const namaFontSize = design.nama_font_size || 6.5;
        const namaFontWeight = design.nama_font_weight || 600;
        const descFontSize = design.desc_font_size || 5;
        
        // NUP settings
        const showNup = design.show_nup !== false;
        const nupFontSize = design.nup_font_size || 10;
        const nupMinWidth = design.nup_min_width || 28;
        
        // Vertical code settings
        const showVerticalCode = design.show_vertical_code !== false;
        const verticalFontSize = design.vertical_font_size || 6;
        const verticalWidth = design.vertical_width || 13;
        
        // Gold stripe settings
        const showGoldStripe = design.show_gold_stripe !== false;
        const goldStripeHeight = design.gold_stripe_height || 3;
        const goldStripeColor = design.gold_stripe_color || '#D4AF37';
        
        // QR settings from design
        const qrSize = design.qr_size || 100;
        
        if (sizeType === 'kecil') {
          // KECIL Layout (Portrait) - with design settings
          return `
            <div style="width: ${itemSize.width}mm; height: ${itemSize.height}mm; border: ${borderWidth}px solid ${borderColor}; border-radius: ${borderRadius}px; background: ${bgColor}; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; font-family: ${fontFamily}, Arial, sans-serif; color: ${textColor};">
              ${showGoldStripe ? `<div style="height: ${goldStripeHeight}mm; background: ${goldStripeColor}; width: 100%;"></div>` : ''}
              <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 1mm;">
                ${qrUrl ? `<img src="${qrUrl}" style="width: ${itemSize.width * 0.75 * (qrSize / 100)}mm; height: ${itemSize.width * 0.75 * (qrSize / 100)}mm;" />` : `<div style="width: ${itemSize.width * 0.75}mm; height: ${itemSize.width * 0.75}mm; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 6px;">QR</div>`}
              </div>
              <div style="text-align: center; padding: 1mm 2mm; background: ${bgColor};">
                <div style="font-size: ${kodeFontSize}pt; font-weight: ${kodeFontWeight}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stickerData.kode_barang || ''}</div>
                <div style="font-size: ${namaFontSize}pt; font-weight: ${namaFontWeight}; margin-top: 0.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stickerData.nama_barang?.substring(0, 20) || ''}</div>
                ${showNup ? `<div style="font-size: ${nupFontSize}pt; font-weight: bold; margin-top: 0.5mm;">NUP: ${stickerData.nup || '1'}</div>` : ''}
              </div>
              ${showVerticalCode ? `<div style="font-size: ${verticalFontSize}pt; text-align: center; padding: 1mm; border-top: 0.5px solid ${borderColor};">${stickerData.kode_vertikal || ''}</div>` : ''}
            </div>
          `;
        } else {
          // SEDANG/BESAR Layout (Landscape) - with design settings
          const qrAreaWidth = itemSize.height * 0.95;
          const qrDisplaySize = qrAreaWidth * 0.9 * (qrSize / 100);
          
          return `
            <div style="width: ${itemSize.width}mm; height: ${itemSize.height}mm; border: ${borderWidth}px solid ${borderColor}; border-radius: ${borderRadius}px; background: ${bgColor}; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box; font-family: ${fontFamily}, Arial, sans-serif; color: ${textColor};">
              <!-- QR Area -->
              <div style="width: ${qrAreaWidth}mm; min-width: ${qrAreaWidth}mm; height: 100%; display: flex; align-items: center; justify-content: center; border-right: ${borderWidth}px solid ${borderColor};">
                ${qrUrl ? `<img src="${qrUrl}" style="width: ${qrDisplaySize}mm; height: ${qrDisplaySize}mm;" />` : `<div style="width: ${qrDisplaySize}mm; height: ${qrDisplaySize}mm; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 6px;">QR</div>`}
              </div>
              
              <!-- Content Area -->
              <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                ${showHeader ? `
                  <div style="padding: 1mm 2mm; border-bottom: ${borderWidth}px solid ${borderColor}; background: ${bgColor};">
                    <div style="font-size: ${headerFontSize}pt; font-weight: 700;">${instansi?.nama || ''}</div>
                    <div style="font-size: ${headerSubFontSize}pt; font-weight: 700;">${instansi?.kode_uakpb || ''}.${stickerData.tahun || ''}</div>
                  </div>
                ` : ''}
                
                <!-- Main Content -->
                <div style="flex: 1; display: flex; padding: 1mm;">
                  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding-right: 1mm; min-width: 0;">
                    <div style="font-size: ${kodeFontSize}pt; font-weight: ${kodeFontWeight}; margin-bottom: 0.5mm;">${stickerData.kode_barang || ''}</div>
                    <div style="font-size: ${namaFontSize}pt; font-weight: ${namaFontWeight}; margin-bottom: 0.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stickerData.nama_barang || ''}</div>
                    <div style="font-size: ${descFontSize}pt; color: #666; margin-bottom: 0.5mm;">${stickerData.merk_tipe || '-'}</div>
                  </div>
                  
                  ${showNup ? `
                    <div style="min-width: ${nupMinWidth}px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: ${borderWidth}px solid ${borderColor}; padding-left: 1mm;">
                      <div style="font-size: 5pt; color: #666;">NUP</div>
                      <div style="font-size: ${nupFontSize}pt; font-weight: 700;">${stickerData.nup || '1'}</div>
                    </div>
                  ` : ''}
                </div>
                
                ${showGoldStripe ? `<div style="height: ${goldStripeHeight}mm; background: ${goldStripeColor}; width: 100%;"></div>` : ''}
              </div>
              
              ${showVerticalCode ? `
                <div style="width: ${verticalWidth}px; min-width: ${verticalWidth}px; display: flex; align-items: center; justify-content: center; border-left: ${borderWidth}px solid ${borderColor};">
                  <span style="writing-mode: vertical-rl; text-orientation: mixed; font-size: ${verticalFontSize}pt; font-weight: 700; white-space: nowrap;">${stickerData.kode_vertikal || ''}</span>
                </div>
              ` : ''}
            </div>
          `;
        }
      }).join('');
      
      pagesHtml += `
        <div style="width: ${pageWidth}; min-height: ${pageHeight}; padding: ${MARGIN}mm; background: white; page-break-after: ${pageIdx < pages - 1 ? 'always' : 'auto'}; box-sizing: border-box; position: relative;">
          <div style="display: grid; gap: ${GAP}mm; grid-template-columns: repeat(${cols}, ${size.width}mm);">
            ${stickersHtml}
          </div>
        </div>
      `;
    }
    
    // Build complete HTML document
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cetak Label BMN</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            background: white;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: ${pageSize}; margin: 0; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
            button { display: none !important; }
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .print-button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ CETAK SEKARANG</button>
        ${pagesHtml}
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const htmlContent = await preparePrintContent();
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Pop-up diblokir. Izinkan pop-up untuk situs ini.');
        return;
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        if (onPrintComplete) onPrintComplete();
      }, 1000);
      
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Gagal menyiapkan dokumen cetak");
    }
  };
  
  const handlePdfGeneration = async () => {
    if (!onGeneratePdf) return;
    try {
      const htmlContent = await preparePrintContent();
      onGeneratePdf(htmlContent);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Gagal menyiapkan data untuk PDF");
    }
  };
  
  const renderSticker = (item, stickerData) => {
    const sizeType = item.ukuran || 'sedang';
    const design = designs[sizeType] || BASIC_DEFAULTS[sizeType];
    
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
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; z-index: 99999 !important; }
          .no-print { display: none !important; }
          @page { size: ${canvasSize}; margin: 0; }
        }
      `}</style>
      
      <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-auto no-print">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
          <div>
            <h2 className="font-bold">Preview Cetak Label ({items.length} stiker)</h2>
            <p className="text-sm text-gray-500">Canvas: {canvasSize} | {cols}x{rows} per halaman | {pages} halaman</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            {onGeneratePdf && (
              <Button 
                onClick={handlePdfGeneration} 
                disabled={generatingPdf}
                className="bg-green-600 hover:bg-green-700"
              >
                {generatingPdf ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Generate PDF (Background)</>
                )}
              </Button>
            )}
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />Cetak Langsung ({pages} Hal)
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
    </>
  );
};

export default PrintPage;
