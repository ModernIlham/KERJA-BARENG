
import os

file_path = "/app/frontend/src/pages/LabelBMN.jsx"

with open(file_path, "r") as f:
    content = f.read()

# Define old handlePrint function (copy-pasted from execute_bash output)
old_handle_print = """  const handlePrint = async () => {
    // Get print area content
    const printArea = printRef.current;
    if (!printArea) return;
    
    // Show loading toast
    toast.info('Menyiapkan halaman cetak...', { duration: 2000 });
    
    // First, generate QR codes as data URLs
    const qrDataUrls = {};
    const qrPromises = items.map(async (item, idx) => {
      const pageIdx = Math.floor(idx / itemsPerPage);
      const itemIdx = idx % itemsPerPage;
      const qrData = item.kode_register || item.kode_barang || 'UNKNOWN';
      
      try {
        const qr = new QRCodeStyling({
          width: 200,
          height: 200,
          data: `#${qrData}`,
          dotsOptions: { color: "#000000", type: "square" },
          backgroundOptions: { color: "#ffffff" },
          qrOptions: { errorCorrectionLevel: "M" }
        });
        
        const blob = await qr.getRawData("png");
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            qrDataUrls[`${pageIdx}-${itemIdx}`] = reader.result;
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch {
        return Promise.resolve();
      }
    });
    
    await Promise.all(qrPromises);
    
    // Build HTML content with QR codes
    const size = STICKER_SIZES[items[0]?.ukuran || 'sedang'];
    const isPortrait = (items[0]?.ukuran || 'sedang') === 'kecil';
    const pageWidth = canvasSize === 'A3' ? '297mm' : '210mm';
    const pageHeight = canvasSize === 'A3' ? '420mm' : '297mm';
    const pageSize = canvasSize === 'A3' ? 'A3 portrait' : 'A4 portrait';
    
    let pagesHtml = '';
    
    for (let pageIdx = 0; pageIdx < pages; pageIdx++) {
      const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
      
      let stickersHtml = pageItems.map((item, idx) => {
        const stickerData = prepareStickerData(item);
        const qrUrl = qrDataUrls[`${pageIdx}-${idx}`] || '';
        
        if (isPortrait) {
          return `
            <div style="width: ${size.width}mm; height: ${size.height}mm; border: 0.5px solid #ccc; background: white; display: flex; flex-direction: column; padding: 1mm; overflow: hidden; box-sizing: border-box;">
              <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
                ${qrUrl ? `<img src="${qrUrl}" style="width: ${size.width * 0.7}mm; height: ${size.width * 0.7}mm;" />` : `<div style="width: ${size.width * 0.7}mm; height: ${size.width * 0.7}mm; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 6px;">QR</div>`}
              </div>
              <div style="text-align: center; padding: 1mm;">
                <div style="font-size: 5px; font-weight: bold;">NUP: ${stickerData.nup || '1'}</div>
                <div style="font-size: 4px;">#${stickerData.kode_register || ''}</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div style="width: ${size.width}mm; height: ${size.height}mm; border: 0.5px solid #ccc; background: white; display: flex; flex-direction: row; padding: 1mm; overflow: hidden; box-sizing: border-box;">
              <div style="width: ${size.height * 0.85}mm; height: ${size.height - 2}mm; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${qrUrl ? `<img src="${qrUrl}" style="width: ${size.height * 0.8}mm; height: ${size.height * 0.8}mm;" />` : `<div style="width: ${size.height * 0.8}mm; height: ${size.height * 0.8}mm; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 6px;">QR</div>`}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding-left: 1mm; overflow: hidden;">
                ${instansi?.nama ? `<div style="font-size: 5px; font-weight: bold; margin-bottom: 0.5mm;">${instansi.nama.substring(0, 25)}</div>` : ''}
                <div style="font-size: 5px; font-weight: bold; margin-bottom: 0.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stickerData.nama_barang?.substring(0, 30) || ''}</div>
                <div style="font-size: 4px; color: #333; margin-bottom: 0.5mm;">#${stickerData.kode_register || ''}</div>
                <div style="font-size: 3.5px; color: #666;">${stickerData.merk_tipe?.substring(0, 25) || ''} | ${stickerData.tahun || ''}</div>
                <div style="font-size: 3.5px; color: #666;">${stickerData.kode_vertikal || ''}</div>
              </div>
            </div>
          `;
        }
      }).join('');
      
      pagesHtml += `
        <div style="width: ${pageWidth}; min-height: ${pageHeight}; padding: ${MARGIN}mm; background: white; page-break-after: ${pageIdx < pages - 1 ? 'always' : 'auto'}; box-sizing: border-box;">
          <div style="display: grid; gap: ${GAP}mm; grid-template-columns: repeat(${cols}, ${size.width}mm);">
            ${stickersHtml}
          </div>
        </div>
      `;
    }
    
    // Build complete HTML document
    const htmlContent = `
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
          }
          .print-button {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 9999;
          }
          .print-button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Cetak Sekarang</button>
        ${pagesHtml}
      </body>
      </html>
    `;
    
    // Create blob URL and open
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (!printWindow) {
      toast.error('Pop-up diblokir. Izinkan pop-up untuk situs ini.');
      URL.revokeObjectURL(url);
      return;
    }
    
    // Cleanup after window closes
    const checkClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkClosed);
        URL.revokeObjectURL(url);
      }
    }, 1000);
    
    // Fallback cleanup after 30 seconds
    setTimeout(() => {
      clearInterval(checkClosed);
      URL.revokeObjectURL(url);
    }, 30000);
    
    if (onPrintComplete) setTimeout(() => onPrintComplete(), 2000);
  };"""

# New modular implementation
new_handle_print = """  const preparePrintContent = async () => {
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
          dotsOptions: { color: "#000000", type: "square" },
          backgroundOptions: { color: "#ffffff" },
          qrOptions: { errorCorrectionLevel: "M" }
        });
        
        const blob = await qr.getRawData("png");
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            qrDataUrls[`${pageIdx}-${itemIdx}`] = reader.result;
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch {
        return Promise.resolve();
      }
    });
    
    await Promise.all(qrPromises);
    
    // Build HTML content with QR codes
    const size = STICKER_SIZES[items[0]?.ukuran || 'sedang'];
    const isPortrait = (items[0]?.ukuran || 'sedang') === 'kecil';
    const pageWidth = canvasSize === 'A3' ? '297mm' : '210mm';
    const pageHeight = canvasSize === 'A3' ? '420mm' : '297mm';
    const pageSize = canvasSize === 'A3' ? 'A3 portrait' : 'A4 portrait';
    
    let pagesHtml = '';
    
    for (let pageIdx = 0; pageIdx < pages; pageIdx++) {
      const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
      
      let stickersHtml = pageItems.map((item, idx) => {
        const stickerData = prepareStickerData(item);
        const qrUrl = qrDataUrls[`${pageIdx}-${idx}`] || '';
        
        if (isPortrait) {
          // KECIL Layout (Portrait)
          return `
            <div style="width: ${size.width}mm; height: ${size.height}mm; border: 0.5px solid #ccc; background: white; display: flex; flex-direction: column; padding: 1mm; overflow: hidden; box-sizing: border-box;">
              <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
                ${qrUrl ? `<img src="${qrUrl}" style="width: ${size.width * 0.7}mm; height: ${size.width * 0.7}mm;" />` : `<div style="width: ${size.width * 0.7}mm; height: ${size.width * 0.7}mm; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 6px;">QR</div>`}
              </div>
              <div style="text-align: center; padding: 1mm;">
                <div style="font-size: 6.5pt; font-weight: bold; font-family: Roboto, Arial, sans-serif;">${stickerData.nama_barang?.substring(0, 15)}</div>
                <div style="font-size: 5pt; font-weight: bold; margin-top: 1px;">NUP: ${stickerData.nup || '1'}</div>
                <div style="font-size: 4pt; font-family: monospace;">#${stickerData.kode_register || ''}</div>
              </div>
            </div>
          `;
        } else {
          // SEDANG/BESAR Layout (Landscape)
          return `
            <div style="width: ${size.width}mm; height: ${size.height}mm; border: 0.5px solid #ccc; background: white; display: flex; flex-direction: row; padding: 1mm; overflow: hidden; box-sizing: border-box; font-family: Roboto, Arial, sans-serif;">
              <div style="width: ${size.height * 0.85}mm; height: ${size.height - 2}mm; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${qrUrl ? `<img src="${qrUrl}" style="width: ${size.height * 0.8}mm; height: ${size.height * 0.8}mm;" />` : `<div style="width: ${size.height * 0.8}mm; height: ${size.height * 0.8}mm; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 6px;">QR</div>`}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding-left: 2mm; overflow: hidden;">
                ${instansi?.nama ? `<div style="font-size: 7.5pt; font-weight: bold; margin-bottom: 0.5mm;">${instansi.nama.substring(0, 30)}</div>` : ''}
                <div style="font-size: 6.5pt; font-weight: bold; margin-bottom: 0.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stickerData.nama_barang?.substring(0, 40) || ''}</div>
                <div style="font-size: 7.5pt; font-weight: bold; margin-bottom: 0.5mm;">#${stickerData.kode_register || ''}</div>
                <div style="font-size: 5.5pt; color: #333; margin-bottom: 0.5mm;">${stickerData.merk_tipe || '-'} | ${stickerData.tahun || ''}</div>
                <div style="font-size: 6pt; font-weight: bold; color: #000;">${stickerData.kode_vertikal || ''}</div>
              </div>
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
      
      // Use direct window write instead of Blob URL for better reliability
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast.error('Pop-up diblokir. Izinkan pop-up untuk situs ini.');
        return;
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for resources to load then print
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
  };"""

content = content.replace(old_handle_print, new_handle_print)

# Update the button to call handlePdfGeneration
old_button = """            {onGeneratePdf && (
              <Button 
                onClick={onGeneratePdf} 
                disabled={generatingPdf}
                className="bg-green-600 hover:bg-green-700"
              >"""

new_button = """            {onGeneratePdf && (
              <Button 
                onClick={handlePdfGeneration} 
                disabled={generatingPdf}
                className="bg-green-600 hover:bg-green-700"
              >"""

content = content.replace(old_button, new_button)

with open(file_path, "w") as f:
    f.write(content)
