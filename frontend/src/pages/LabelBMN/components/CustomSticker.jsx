
import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

// ==================== QR CODE COMPONENT ====================
export const StyledQRCode = ({ data, settings, logoUrl, size = 200, style = {} }) => {
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

// ==================== CUSTOM STICKER COMPONENT ====================
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
        {/* QR Area */}
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
          {/* Inner wrapper for alignment */}
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
                  {instansi?.kode_uakpb ? `${instansi.kode_uakpb}.${data.tahun || data.tahun_anggaran || (data.tgl_perolehan ? new Date(data.tgl_perolehan).getFullYear() : new Date().getFullYear())}` : `Tahun ${data.tahun || data.tahun_anggaran || (data.tgl_perolehan ? new Date(data.tgl_perolehan).getFullYear() : new Date().getFullYear())}`}
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
                      {data.merk || '-'}{data.tipe ? ` - ${data.tipe}` : ''}
                    </p>
                  </div>
                )}
                
                {/* Warning Text */}
                {design.show_warning && (
                  <div style={{ 
                    marginTop: 'auto', // Push to bottom if space allows
                    display: 'flex',
                    ...getFullAlignStyle(design.warning_full_align || 'bottom-left')
                  }}>
                    <p style={{ 
                      fontSize: `${design.warning_font_size || 6}pt`, 
                      fontWeight: design.warning_font_weight || 700, 
                      color: design.warning_color || '#DC2626',
                      textAlign: getFullAlignStyle(design.warning_full_align || 'bottom-left').textAlign
                    }}>
                      {design.warning_text || "Tidak Untuk Diperjualbelikan"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Vertical Code Area */}
            {design.show_vertical_code && (
              <div style={{
                width: `${design.vertical_width || 13}px`,
                minWidth: `${design.vertical_width || 13}px`,
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
      </div>
    );
  } else {
    // Portrait Layout (kecil style)
    return (
      <div style={{
        width: `${design.width}mm`,
        height: `${design.height}mm`,
        background: design.background_color || '#ffffff',
        borderWidth: `${design.border_width || 1}px`,
        borderStyle: design.border_style || 'solid',
        borderColor: design.border_color || '#2c2c2c',
        borderRadius: `${design.border_radius || 0}px`,
        display: 'flex',
        flexDirection: 'column', // Vertical stack
        fontFamily: `'${design.font_family || 'Roboto'}', Arial, sans-serif`,
        overflow: 'hidden',
        color: design.text_color || '#1a1a1a',
        padding: design.content_padding || 0
      }}>
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* QR Area */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: getBorderStyle(true),
              padding: '2px',
              background: qrSettings?.backgroundColor || '#ffffff',
              ...getFullAlignStyle(design.qr_align || 'center')
            }}>
              <StyledQRCode 
                data={`#${data.kode_register || data.kode_barang}`}
                settings={qrSettings}
                logoUrl={instansi?.logo_url}
                size={Math.max(10, Math.floor(
                  ((design.width || 23.8) * 3.78) * ((design.qr_size || 85) / 100)
                ))}
              />
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
              {/* Nama & Qty Row */}
              <div style={{ display: 'flex', borderBottom: getBorderStyle() }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${design.nama_font_size || 6.5}pt`,
                  fontWeight: design.nama_font_weight || 600,
                  padding: '2px 3px',
                  lineHeight: 1.2,
                  textAlign: 'center',
                  borderRight: getBorderStyle()
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
              
              {/* Kode Inventaris */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${design.kode_font_size || 8}pt`,
                fontWeight: design.kode_font_weight || 700,
                padding: `${design.kode_padding || 3}px 2px`,
                borderBottom: getBorderStyle(),
                background: design.kode_bg_color || '#ffffff',
                letterSpacing: `${design.kode_letter_spacing || 0}px`,
                textTransform: design.kode_text_transform || 'none'
              }}>
                {data.kode_barang}
              </div>
              
              {/* Tahun & Deskripsi */}
              {design.show_description && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: `${design.desc_font_size || 5}pt`,
                  fontWeight: 400,
                  padding: '2px 3px',
                  lineHeight: 1.3,
                  background: design.desc_bg_color || '#ffffff'
                }}>
                  <span>
                    <strong>{data.tahun || data.tahun_anggaran || (data.tgl_perolehan ? new Date(data.tgl_perolehan).getFullYear() : new Date().getFullYear())}</strong> - {data.merk || '-'}{data.tipe ? ` ${data.tipe}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Vertical Code */}
          {design.show_vertical_code && (
            <div style={{
              width: `${design.vertical_width || 13}px`,
              minWidth: `${design.vertical_width || 13}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              borderLeft: design.vertical_show_border ? getBorderStyle() : 'none'
            }}>
              <span style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: `${design.vertical_font_size || 6}pt`,
                fontWeight: 700,
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
                color: '#1a1a1a'
              }}>
                {data.kode_vertikal}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default CustomSticker;
