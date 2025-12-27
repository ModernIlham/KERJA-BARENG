import React from 'react';
import QRCodeStyling from 'qr-code-styling';

// ==================== STYLED QR CODE COMPONENT ====================
export const StyledQRCode = ({ data, settings = {}, logoUrl, size = 80, style = {} }) => {
  const qrRef = React.useRef(null);
  const qrInstance = React.useRef(null);

  React.useEffect(() => {
    if (!qrRef.current) return;

    const qrOptions = {
      width: size,
      height: size,
      data: data || 'SAMPLE',
      dotsOptions: {
        color: settings.dotsColor || '#000000',
        type: settings.dotsStyle || 'square'
      },
      backgroundOptions: {
        color: settings.backgroundColor || '#ffffff'
      },
      cornersSquareOptions: {
        color: settings.cornerSquareColor || '#000000',
        type: settings.cornerSquareStyle || 'square'
      },
      cornersDotOptions: {
        color: settings.cornerDotColor || '#000000',
        type: settings.cornerDotStyle || 'square'
      },
      qrOptions: {
        errorCorrectionLevel: settings.errorCorrectionLevel || 'M'
      }
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

    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling(qrOptions);
      qrRef.current.innerHTML = '';
      qrInstance.current.append(qrRef.current);
    } else {
      qrInstance.current.update(qrOptions);
    }
  }, [data, settings, logoUrl, size]);

  return <div ref={qrRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }} />;
};

// ==================== ALIGNMENT HELPER ====================
const getAlignmentStyle = (alignment) => {
  const alignMap = {
    'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' },
    'top-center': { alignItems: 'flex-start', justifyContent: 'center', textAlign: 'center' },
    'top-right': { alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right' },
    'center-left': { alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left' },
    'center': { alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
    'center-right': { alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' },
    'bottom-left': { alignItems: 'flex-end', justifyContent: 'flex-start', textAlign: 'left' },
    'bottom-center': { alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center' },
    'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end', textAlign: 'right' },
    'left': { alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left' },
    'right': { alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }
  };
  return alignMap[alignment] || alignMap['center'];
};

// ==================== MAIN CUSTOM STICKER COMPONENT ====================
const CustomSticker = ({ design, data, instansi, qrSettings = {} }) => {
  const sizeType = design?.size_type || 'sedang';
  
  // ==================== DATA EXTRACTION ====================
  const getTahun = () => {
    if (data.tahun) return data.tahun;
    if (data.tahun_anggaran) return data.tahun_anggaran;
    if (data.tgl_perolehan) {
      const date = new Date(data.tgl_perolehan);
      return date.getFullYear();
    }
    return new Date().getFullYear();
  };
  
  const tahun = getTahun();
  const kodeUakpb = instansi?.kode_uakpb || '';
  const namaInstansi = instansi?.nama || 'Otorita Ibu Kota Nusantara';
  const logoUrl = instansi?.logo_url;
  
  // ==================== DESIGN SETTINGS ====================
  // Dimensions
  const width = design?.width || (sizeType === 'kecil' ? 23.8 : sizeType === 'besar' ? 94.9 : 69.8);
  const height = design?.height || (sizeType === 'kecil' ? 39.8 : sizeType === 'besar' ? 32.2 : 22.1);
  
  // Border settings
  const borderColor = design?.border_color || '#000000';
  const borderWidth = design?.border_width ?? 1;
  const borderRadius = design?.border_radius || 0;
  const sectionBorderWidth = design?.section_border_width ?? borderWidth;
  const sectionBorderColor = design?.section_border_color || borderColor;
  
  // Background & Font
  const bgColor = design?.background_color || '#ffffff';
  const fontFamily = design?.font_family || 'Arial';
  const textColor = design?.text_color || '#1a1a1a';
  
  // Show/Hide toggles
  const showQR = design?.show_qr !== false;
  const showHeader = design?.show_header !== false;
  const showLogo = design?.header_show_logo !== false;
  const showKode = design?.show_kode !== false;
  const showNama = design?.show_nama !== false;
  const showNup = design?.show_nup !== false;
  const showDescription = design?.show_description !== false;
  const showWarning = design?.show_warning !== false;
  const showGoldStripe = design?.show_gold_stripe === true;
  const showNupLabel = design?.show_nup_label !== false;
  const showUakpb = design?.header_show_uakpb !== false;
  
  // Gold Stripe
  const goldStripeColor = design?.gold_stripe_color || '#D4AF37';
  const goldStripeHeight = design?.gold_stripe_height || 2.5;
  const goldStripePosition = design?.gold_stripe_position || 'after_qr';
  
  // Warning
  const warningText = design?.warning_text || 'Tidak Untuk Diperjualbelikan';
  const warningColor = design?.warning_color || '#cc0000';
  const warningFontSize = design?.warning_font_size || 6;
  const warningItalic = design?.warning_italic !== false;
  
  // Header settings
  const headerFontSize = design?.header_font_size || 7;
  const headerSubFontSize = design?.header_sub_font_size || 6;
  const headerBgColor = design?.header_bg_color || '#ffffff';
  const headerPadding = design?.header_padding || 2;
  const headerBorderBottom = design?.header_border_bottom !== false;
  const headerLogoBorder = design?.header_logo_border !== false;
  const logoSize = design?.header_logo_size || 16;
  const headerFontWeight = design?.header_font_weight || 700;
  const headerItalic = design?.header_italic !== false;
  const headerMinHeight = design?.header_min_height || (sizeType === 'besar' ? 9 : 6.5);
  
  // QR Settings
  const qrSize = design?.qr_size || 90;
  const qrMarginTop = design?.qr_margin_top ?? 2;
  const qrMarginRight = design?.qr_margin_right ?? 2;
  const qrMarginBottom = design?.qr_margin_bottom ?? 2;
  const qrMarginLeft = design?.qr_margin_left ?? 2;
  const qrAreaWidth = design?.qr_area_width || height;
  const qrBorderRight = design?.qr_border_right !== false;
  
  // Content settings - Kode
  const kodeFontSize = design?.kode_font_size || 8;
  const kodeFontWeight = design?.kode_font_weight || 700;
  const kodeTextTransform = design?.kode_text_transform || 'none';
  const kodeColor = design?.kode_color || textColor;
  const kodeItalic = design?.kode_italic === true;
  
  // Content settings - Nama
  const namaFontSize = design?.nama_font_size || 7;
  const namaFontWeight = design?.nama_font_weight || 600;
  const namaColor = design?.nama_color || textColor;
  const namaItalic = design?.nama_italic !== false;
  
  // Content settings - NUP
  const nupFontSize = design?.nup_font_size || 10;
  const nupMinWidth = design?.nup_min_width || 12;
  const nupColor = design?.nup_color || textColor;
  const nupBorderLeft = design?.nup_border_left !== false;
  
  // Content settings - Description
  const descFontSize = design?.desc_font_size || 6;
  const descColor = design?.desc_color || textColor;
  const descItalic = design?.desc_italic !== false;
  
  // Alignments
  const qrAlign = getAlignmentStyle(design?.qr_align || design?.qr_full_align || 'center');
  const headerAlign = getAlignmentStyle(design?.header_full_align || 'center-left');
  const kodeAlign = getAlignmentStyle(design?.kode_full_align || 'center-left');
  const namaAlign = getAlignmentStyle(design?.nama_full_align || 'center-left');
  const nupAlign = getAlignmentStyle(design?.nup_full_align || 'center');
  const descAlign = getAlignmentStyle(design?.desc_full_align || 'center-left');
  const warningAlign = getAlignmentStyle(design?.warning_full_align || 'center-left');

  // Gold Stripe inline style
  const goldStripeStyle = {
    height: `${goldStripeHeight}mm`,
    background: goldStripeColor,
    width: '100%',
    flexShrink: 0
  };

  // ==================== STIKER KECIL - Portrait Layout ====================
  if (sizeType === 'kecil') {
    const qrAreaSize = Math.min(width, height * 0.5) * 3.2 * (qrSize / 100);
    
    return (
      <div style={{
        width: `${width}mm`,
        height: `${height}mm`,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: `${borderRadius}px`,
        background: bgColor,
        fontFamily: `${fontFamily}, Arial, sans-serif`,
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* QR Code Area */}
        {showQR && (
          <div style={{
            flex: 1,
            display: 'flex',
            padding: `${qrMarginTop}mm ${qrMarginRight}mm ${qrMarginBottom}mm ${qrMarginLeft}mm`,
            borderBottom: `${sectionBorderWidth}px solid ${sectionBorderColor}`,
            ...qrAlign
          }}>
            <StyledQRCode 
              data={`#${data.kode_register || data.kode_barang}`}
              settings={qrSettings}
              logoUrl={logoUrl}
              size={qrAreaSize}
            />
          </div>
        )}
        
        {/* Gold Stripe - after QR for kecil */}
        {showGoldStripe && goldStripePosition === 'after_qr' && <div style={goldStripeStyle} />}
        
        {/* Content Table */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Row 1: Nama + NUP */}
          {(showNama || showNup) && (
            <div style={{ display: 'flex', borderBottom: `${sectionBorderWidth}px solid ${sectionBorderColor}` }}>
              {showNama && (
                <div style={{
                  flex: 1,
                  padding: '1mm 1.5mm',
                  fontSize: `${namaFontSize}pt`,
                  fontWeight: namaFontWeight,
                  fontStyle: namaItalic ? 'italic' : 'normal',
                  color: namaColor,
                  display: 'flex',
                  borderRight: showNup ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
                  lineHeight: 1.2,
                  ...namaAlign
                }}>
                  {data.nama_barang?.substring(0, 18) || 'Nama Barang'}
                </div>
              )}
              {showNup && (
                <div style={{
                  width: '7mm',
                  padding: '0.5mm',
                  fontSize: `${nupFontSize}pt`,
                  fontWeight: 'bold',
                  color: nupColor,
                  display: 'flex',
                  ...nupAlign
                }}>
                  {data.nup || '1'}
                </div>
              )}
            </div>
          )}
          
          {/* Row 2: Kode Barang */}
          {showKode && (
            <div style={{
              padding: '0.8mm 1.5mm',
              fontSize: `${kodeFontSize}pt`,
              fontWeight: kodeFontWeight,
              fontStyle: kodeItalic ? 'italic' : 'normal',
              textTransform: kodeTextTransform,
              color: kodeColor,
              borderBottom: showDescription ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
              display: 'flex',
              ...kodeAlign
            }}>
              {data.kode_barang || '0000000000'}
            </div>
          )}
          
          {/* Row 3: Tahun - Merk - Tipe */}
          {showDescription && (
            <div style={{
              padding: '0.8mm 1.5mm',
              fontSize: `${descFontSize}pt`,
              fontStyle: descItalic ? 'italic' : 'normal',
              color: descColor,
              lineHeight: 1.2,
              display: 'flex',
              ...descAlign
            }}>
              {tahun} - {data.merk || '-'} - {data.tipe || '-'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== STIKER SEDANG & BESAR - Landscape Layout ====================
  const isBesar = sizeType === 'besar';
  const qrDisplaySize = qrAreaWidth * 3.5 * (qrSize / 100);

  // Count visible content rows to manage flex
  const visibleRows = [showKode, showNama, showDescription, showWarning].filter(Boolean).length;

  return (
    <div style={{
      width: `${width}mm`,
      height: `${height}mm`,
      border: `${borderWidth}px solid ${borderColor}`,
      borderRadius: `${borderRadius}px`,
      background: bgColor,
      fontFamily: `${fontFamily}, Arial, sans-serif`,
      color: textColor,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Left: QR Code Area */}
      {showQR && (
        <div style={{
          width: `${qrAreaWidth}mm`,
          minWidth: `${qrAreaWidth}mm`,
          height: '100%',
          display: 'flex',
          borderRight: qrBorderRight ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
          background: bgColor,
          padding: `${qrMarginTop}mm ${qrMarginRight}mm ${qrMarginBottom}mm ${qrMarginLeft}mm`,
          boxSizing: 'border-box',
          ...qrAlign
        }}>
          <StyledQRCode 
            data={`#${data.kode_register || data.kode_barang}`}
            settings={qrSettings}
            logoUrl={logoUrl}
            size={qrDisplaySize}
          />
        </div>
      )}
      
      {/* Right: Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Gold Stripe - after QR position */}
        {showGoldStripe && goldStripePosition === 'after_qr' && <div style={goldStripeStyle} />}
        
        {/* Header Row: Logo | Nama Instansi + Kode UAKPB */}
        {showHeader && (
          <div style={{
            display: 'flex',
            borderBottom: headerBorderBottom ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
            minHeight: `${headerMinHeight}mm`,
            background: headerBgColor,
            flexShrink: 0
          }}>
            {/* Logo Cell */}
            {showLogo && (
              <div style={{
                width: `${logoSize}px`,
                minWidth: `${logoSize}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: headerLogoBorder ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
                padding: '0.5mm'
              }}>
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                  />
                ) : (
                  <div style={{ 
                    width: '100%', height: '100%', background: '#f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '4pt', color: '#999'
                  }}>Logo</div>
                )}
              </div>
            )}
            
            {/* Nama Instansi + Kode */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: `${headerPadding}px`,
              ...headerAlign
            }}>
              <div style={{
                fontSize: `${headerFontSize}pt`,
                fontWeight: headerFontWeight,
                fontStyle: headerItalic ? 'italic' : 'normal',
                lineHeight: 1.2
              }}>
                {design?.header_text || namaInstansi}
              </div>
              {showUakpb && (
                <div style={{
                  fontSize: `${headerSubFontSize}pt`,
                  fontWeight: 'bold',
                  lineHeight: 1.2
                }}>
                  {kodeUakpb}.{tahun}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Gold Stripe - after header position */}
        {showGoldStripe && goldStripePosition === 'after_header' && <div style={goldStripeStyle} />}
        
        {/* Content Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Row 1: Kode Barang | NUP */}
          {(showKode || showNup) && (
            <div style={{ display: 'flex', borderBottom: (showNama || showDescription || showWarning) ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none' }}>
              {showKode && (
                <div style={{
                  flex: 1,
                  padding: '0.5mm 1.5mm',
                  fontSize: `${kodeFontSize}pt`,
                  fontWeight: kodeFontWeight,
                  fontStyle: kodeItalic ? 'italic' : 'normal',
                  textTransform: kodeTextTransform,
                  color: kodeColor,
                  display: 'flex',
                  ...kodeAlign
                }}>
                  {data.kode_barang || '0000000000'}
                </div>
              )}
              {showNup && (
                <div style={{
                  minWidth: isBesar ? '14mm' : `${nupMinWidth}mm`,
                  padding: '0.5mm 1.5mm',
                  fontSize: `${nupFontSize}pt`,
                  fontWeight: 'bold',
                  color: nupColor,
                  display: 'flex',
                  borderLeft: nupBorderLeft && showKode ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
                  ...nupAlign
                }}>
                  {showNupLabel ? `NUP: ${data.nup || '1'}` : (data.nup || '1')}
                </div>
              )}
            </div>
          )}
          
          {/* Row 2: Nama Barang */}
          {showNama && (
            <div style={{
              padding: '0.5mm 1.5mm',
              fontSize: `${namaFontSize}pt`,
              fontWeight: namaFontWeight,
              fontStyle: namaItalic ? 'italic' : 'normal',
              color: namaColor,
              borderBottom: (showDescription || showWarning) ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              ...namaAlign
            }}>
              {data.nama_barang || 'Nama Barang'}
            </div>
          )}
          
          {/* Row 3: Merk - Tipe */}
          {showDescription && (
            <div style={{
              padding: '0.5mm 1.5mm',
              fontSize: `${descFontSize}pt`,
              fontStyle: descItalic ? 'italic' : 'normal',
              color: descColor,
              flex: visibleRows <= 3 ? 1 : 'none',
              display: 'flex',
              borderBottom: showWarning ? `${sectionBorderWidth}px solid ${sectionBorderColor}` : 'none',
              ...descAlign
            }}>
              {data.merk || '-'} {data.tipe ? `- ${data.tipe}` : ''}
            </div>
          )}
          
          {/* Gold Stripe - before warning position */}
          {goldStripePosition === 'before_warning' && <GoldStripe />}
          
          {/* Row 4: Warning Text (Red) */}
          {showWarning && (
            <div style={{
              padding: '0.5mm 1.5mm',
              fontSize: `${warningFontSize}pt`,
              fontWeight: 'bold',
              fontStyle: warningItalic ? 'italic' : 'normal',
              color: warningColor,
              display: 'flex',
              ...warningAlign
            }}>
              {warningText}
            </div>
          )}
          
          {/* Gold Stripe - bottom position */}
          {goldStripePosition === 'bottom' && <GoldStripe />}
        </div>
      </div>
    </div>
  );
};

export default CustomSticker;
