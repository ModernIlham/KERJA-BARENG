import html2pdf from 'html2pdf.js';

/**
 * Export element to PDF with standardized settings
 * @param {HTMLElement} element - The DOM element to export
 * @param {string} filename - Name for the PDF file (without .pdf extension)
 * @param {object} options - Additional options
 */
export const exportToPdf = (element, filename, options = {}) => {
    if (!element) {
        console.error('No element provided for PDF export');
        return Promise.reject('No element provided');
    }

    const defaultOptions = {
        margin: [5, 5, 5, 5], // narrow margins [top, right, bottom, left] in mm
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'landscape' // landscape A4
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return html2pdf()
        .set(mergedOptions)
        .from(element)
        .save()
        .then(() => {
            console.log('PDF exported successfully:', filename);
        })
        .catch((error) => {
            console.error('PDF export failed:', error);
            throw error;
        });
};

/**
 * Export element to PDF with portrait orientation
 */
export const exportToPdfPortrait = (element, filename, options = {}) => {
    return exportToPdf(element, filename, {
        ...options,
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait'
        }
    });
};

/**
 * Export with custom margins
 */
export const exportToPdfWithMargins = (element, filename, margins = [10, 10, 10, 10], options = {}) => {
    return exportToPdf(element, filename, {
        ...options,
        margin: margins
    });
};

export default exportToPdf;
