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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2mm',
          borderBottom: `1px solid ${borderColor}`
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
              fontSize: '6.5pt',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: `1px solid ${borderColor}`,
              textAlign: 'center',
              lineHeight: 1.2
            }}>
              {data.nama_barang?.substring(0, 18) || 'Nama Barang'}
            </div>
            <div style={{
              width: '7mm',
              padding: '0.5mm',
              fontSize: '11pt',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {data.nup || '1'}
            </div>
          </div>
          
          {/* Row 2: Kode Barang */}
          <div style={{
            padding: '0.8mm 1.5mm',
            fontSize: '7pt',
            fontWeight: 'bold',
            textAlign: 'center',
            borderBottom: `1px solid ${borderColor}`
          }}>
            {data.kode_barang || '0000000000'}
          </div>
          
          {/* Row 3: Tahun - Merk - Tipe */}
          <div style={{
            padding: '0.8mm 1.5mm',
            fontSize: '5.5pt',
            textAlign: 'center',
            lineHeight: 1.2
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
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: `1px solid ${borderColor}`,
        background: '#ffffff'
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
            justifyContent: 'center',
            padding: '0.5mm 1.5mm'
          }}>
            <div style={{
              fontSize: isBesar ? '8pt' : '6.5pt',
              fontWeight: 'bold',
              fontStyle: 'italic',
              lineHeight: 1.2
            }}>
              {namaInstansi}
            </div>
            <div style={{
              fontSize: isBesar ? '7pt' : '6pt',
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
              fontSize: isBesar ? '10pt' : '8pt',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center'
            }}>
              {data.kode_barang || '0000000000'}
            </div>
            <div style={{
              minWidth: isBesar ? '14mm' : '12mm',
              padding: '0.5mm 1.5mm',
              fontSize: isBesar ? '10pt' : '8pt',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderLeft: `1px solid ${borderColor}`
            }}>
              {isBesar ? data.nup || '1' : data.nup || '1'}
            </div>
          </div>
          
          {/* Row 2: Nama Barang */}
          <div style={{
            padding: '0.5mm 1.5mm',
            fontSize: isBesar ? '9pt' : '7pt',
            fontStyle: 'italic',
            borderBottom: `1px solid ${borderColor}`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {data.nama_barang || 'Nama Barang'}
          </div>
          
          {/* Row 3: Merk - Tipe */}
          <div style={{
            padding: '0.5mm 1.5mm',
            fontSize: isBesar ? '8pt' : '6.5pt',
            fontStyle: 'italic',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            borderBottom: showWarning ? `1px solid ${borderColor}` : 'none'
          }}>
            {data.merk || '-'} {data.tipe ? `- ${data.tipe}` : ''}
          </div>
          
          {/* Row 4: Warning Text (Red) */}
          {showWarning && (
            <div style={{
              padding: '0.5mm 1.5mm',
              fontSize: isBesar ? '7pt' : '5.5pt',
              fontWeight: 'bold',
              fontStyle: 'italic',
              color: '#cc0000',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
