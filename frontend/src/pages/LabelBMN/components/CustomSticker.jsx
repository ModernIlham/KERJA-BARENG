import React from 'react';
import QRCodeStyling from 'qr-code-styling';

// Styled QR Code Component with Logo
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

// Helper function to convert alignment value to CSS flexbox styles
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

// Main CustomSticker Component
const CustomSticker = ({ design, data, instansi, qrSettings = {} }) => {
  const sizeType = design?.size_type || 'sedang';
  
  // Get tahun from various sources
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
  
  // Common styles
  const borderColor = design?.border_color || '#000000';
  const fontFamily = design?.font_family || 'Arial';
  const goldStripeColor = design?.gold_stripe_color || '#D4AF37';
  const warningText = design?.warning_text || 'Tidak Untuk Diperjualbelikan';
  const showWarning = design?.show_warning !== false;
  
  // Get alignments from design
  const qrAlign = getAlignmentStyle(design?.qr_full_align || design?.qr_align || 'center');
  const headerAlign = getAlignmentStyle(design?.header_full_align || 'center-left');
  const kodeAlign = getAlignmentStyle(design?.kode_full_align || 'center-left');
  const namaAlign = getAlignmentStyle(design?.nama_full_align || 'center-left');
  const nupAlign = getAlignmentStyle(design?.nup_full_align || 'center');
  const descAlign = getAlignmentStyle(design?.desc_full_align || 'center-left');
  const warningAlign = getAlignmentStyle(design?.warning_full_align || 'center');

  // STIKER KECIL - Portrait Layout
  if (sizeType === 'kecil') {
    return (
      <div style={{
        width: `${design?.width || 23.8}mm`,
        height: `${design?.height || 39.8}mm`,
        border: `1px solid ${borderColor}`,
        background: '#ffffff',
        fontFamily: `${fontFamily}, Arial, sans-serif`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* QR Code Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          padding: '2mm',
          borderBottom: `1px solid ${borderColor}`,
          ...qrAlign
        }}>
          <StyledQRCode 
            data={`#${data.kode_register || data.kode_barang}`}
            settings={qrSettings}
            logoUrl={logoUrl}
            size={Math.floor((design?.width || 23.8) * 3.2)}
          />
        </div>
        
        {/* Gold Stripe */}
        <div style={{
          height: '2.5mm',
          background: goldStripeColor,
          width: '100%'
        }} />
        
        {/* Content Table */}
        <div style={{
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Row 1: Nama + NUP */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${borderColor}`
          }}>
            <div style={{
              flex: 1,
              padding: '1mm 1.5mm',
              fontSize: `${design?.nama_font_size || 6.5}pt`,
              fontWeight: design?.nama_font_weight || 'bold',
              display: 'flex',
              borderRight: `1px solid ${borderColor}`,
              lineHeight: 1.2,
              ...namaAlign
            }}>
              {data.nama_barang?.substring(0, 18) || 'Nama Barang'}
            </div>
            <div style={{
              width: '7mm',
              padding: '0.5mm',
              fontSize: `${design?.nup_font_size || 11}pt`,
              fontWeight: 'bold',
              display: 'flex',
              ...nupAlign
            }}>
              {data.nup || '1'}
            </div>
          </div>
          
          {/* Row 2: Kode Barang */}
          <div style={{
            padding: '0.8mm 1.5mm',
            fontSize: `${design?.kode_font_size || 7}pt`,
            fontWeight: design?.kode_font_weight || 'bold',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            ...kodeAlign
          }}>
            {data.kode_barang || '0000000000'}
          </div>
          
          {/* Row 3: Tahun - Merk - Tipe */}
          <div style={{
            padding: '0.8mm 1.5mm',
            fontSize: `${design?.desc_font_size || 5.5}pt`,
            lineHeight: 1.2,
            display: 'flex',
            ...descAlign
          }}>
            {tahun} - {data.merk || '-'} - {data.tipe || '-'}
          </div>
        </div>
      </div>
    );
  }

  // STIKER SEDANG & BESAR - Landscape Layout
  const isBesar = sizeType === 'besar';
  const stickerWidth = design?.width || (isBesar ? 94.9 : 69.8);
  const stickerHeight = design?.height || (isBesar ? 32.2 : 22.1);
  const qrAreaWidth = stickerHeight; // QR area is square based on height

  return (
    <div style={{
      width: `${stickerWidth}mm`,
      height: `${stickerHeight}mm`,
      border: `1px solid ${borderColor}`,
      background: '#ffffff',
      fontFamily: `${fontFamily}, Arial, sans-serif`,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Left: QR Code Area */}
      <div style={{
        width: `${qrAreaWidth}mm`,
        minWidth: `${qrAreaWidth}mm`,
        height: '100%',
        display: 'flex',
        borderRight: `1px solid ${borderColor}`,
        background: '#ffffff',
        ...qrAlign
      }}>
        <StyledQRCode 
          data={`#${data.kode_register || data.kode_barang}`}
          settings={qrSettings}
          logoUrl={logoUrl}
          size={Math.floor(qrAreaWidth * 3.5)}
        />
      </div>
      
      {/* Right: Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Header Row: Logo | Nama Instansi + Kode UAKPB */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${borderColor}`,
          minHeight: isBesar ? '9mm' : '6.5mm'
        }}>
          {/* Logo Cell */}
          <div style={{
            width: isBesar ? '9mm' : '6.5mm',
            minWidth: isBesar ? '9mm' : '6.5mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: `1px solid ${borderColor}`,
            padding: '0.5mm'
          }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain' 
                }} 
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4pt',
                color: '#999'
              }}>Logo</div>
            )}
          </div>
          
          {/* Nama Instansi + Kode */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '0.5mm 1.5mm',
            ...headerAlign
          }}>
            <div style={{
              fontSize: `${design?.header_font_size || (isBesar ? 8 : 6.5)}pt`,
              fontWeight: 'bold',
              fontStyle: 'italic',
              lineHeight: 1.2
            }}>
              {namaInstansi}
            </div>
            <div style={{
              fontSize: `${design?.header_sub_font_size || (isBesar ? 7 : 6)}pt`,
              fontWeight: 'bold',
              lineHeight: 1.2
            }}>
              {kodeUakpb}.{tahun}
            </div>
          </div>
        </div>
        
        {/* Content Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Row 1: Kode Barang | NUP */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${borderColor}`
          }}>
            <div style={{
              flex: 1,
              padding: '0.5mm 1.5mm',
              fontSize: `${design?.kode_font_size || (isBesar ? 10 : 8)}pt`,
              fontWeight: design?.kode_font_weight || 'bold',
              display: 'flex',
              ...kodeAlign
            }}>
              {data.kode_barang || '0000000000'}
            </div>
            <div style={{
              minWidth: isBesar ? '14mm' : '12mm',
              padding: '0.5mm 1.5mm',
              fontSize: `${design?.nup_font_size || (isBesar ? 10 : 8)}pt`,
              fontWeight: 'bold',
              display: 'flex',
              borderLeft: `1px solid ${borderColor}`,
              ...nupAlign
            }}>
              {data.nup || '1'}
            </div>
          </div>
          
          {/* Row 2: Nama Barang */}
          <div style={{
            padding: '0.5mm 1.5mm',
            fontSize: `${design?.nama_font_size || (isBesar ? 9 : 7)}pt`,
            fontStyle: 'italic',
            borderBottom: `1px solid ${borderColor}`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            ...namaAlign
          }}>
            {data.nama_barang || 'Nama Barang'}
          </div>
          
          {/* Row 3: Merk - Tipe */}
          <div style={{
            padding: '0.5mm 1.5mm',
            fontSize: `${design?.desc_font_size || (isBesar ? 8 : 6.5)}pt`,
            fontStyle: 'italic',
            flex: 1,
            display: 'flex',
            borderBottom: showWarning ? `1px solid ${borderColor}` : 'none',
            ...descAlign
          }}>
            {data.merk || '-'} {data.tipe ? `- ${data.tipe}` : ''}
          </div>
          
          {/* Row 4: Warning Text (Red) */}
          {showWarning && (
            <div style={{
              padding: '0.5mm 1.5mm',
              fontSize: `${design?.warning_font_size || (isBesar ? 7 : 5.5)}pt`,
              fontWeight: 'bold',
              fontStyle: 'italic',
              color: design?.warning_color || '#cc0000',
              display: 'flex',
              ...warningAlign
            }}>
              {warningText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomSticker;
