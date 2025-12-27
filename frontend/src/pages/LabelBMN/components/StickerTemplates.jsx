
import React, { useRef, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';

// ==================== SHARED QR COMPONENT ====================
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

// ==================== STICKER TEMPLATES ====================

/**
 * Stiker KECIL - 2.38cm × 3.98cm (Portrait)
 */
export const StikerKecil = ({ data, instansi, qrSettings }) => {
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
 */
export const StikerSedang = ({ data, instansi, qrSettings }) => {
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
 */
export const StikerBesar = ({ data, instansi, qrSettings }) => {
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
