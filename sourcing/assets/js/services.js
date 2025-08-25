import { DOM } from './constants.js';
import { STATE } from './state.js';

export const fetchAndCleanData = async (url) => {
  const response = await fetch(url);
  const rawText = await response.text();
  const csvBody = rawText.split(/\r?\n/).slice(1).join('\n').trim();
  const parsed = Papa.parse(csvBody, { header: true, skipEmptyLines: true });
  return parsed.data.map(({ "": _, ...rest }) => rest);
};

export const loadAllData = async (urls) => {
  DOM.loaders.forEach(loader => loader.classList.remove('hidden'));
  DOM.searchInput.disabled = true; 
  DOM.checkboxes.forEach(checkbox => checkbox.disabled = true);
  const allArrays = await Promise.all(urls.map(fetchAndCleanData));
  DOM.loaders.forEach(loader => loader.classList.add('hidden'));
  DOM.microviewContentWrapper.classList.remove('hidden');
  DOM.searchInput.disabled = false; 
  DOM.checkboxes.forEach(checkbox => checkbox.disabled = false);

  const allData = allArrays.flat();
  const uniqueSuppliersMap = new Map();

  allData.forEach(item => {
    if (item['Supplier Name'] && !uniqueSuppliersMap.has(item['Supplier Name'])) {
      uniqueSuppliersMap.set(item['Supplier Name'], item);
    }
  });

  const exhibitorsOnly = Array.from(uniqueSuppliersMap.values())
    .sort((a, b) => a['Supplier Name'].localeCompare(b['Supplier Name']));

  return { allData, exhibitorsOnly };
};

export const exportPDF = async () => {
  const dataToExport = STATE.filteredData;
  if (dataToExport.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const formattedData = dataToExport.map((item, idx) => ({
      number: idx + 1,
      name: item['Supplier Name'].toUpperCase(),
      category: item['Main Product Category'],
      country: item['Supplier Country'],
      stand: item['Stand Number'] || ''
    }));

    const { PDFDocument, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(window.fontkit);

    const [boldFontBytes, mediumFontBytes, regularFontBytes] = await Promise.all([
      fetch('./assets/fonts/theinhardt-bold.otf').then(res => res.arrayBuffer()),
      fetch('./assets/fonts/theinhardt-medium.otf').then(res => res.arrayBuffer()),
      fetch('./assets/fonts/theinhardt-regular.otf').then(res => res.arrayBuffer()),
    ]);

    const boldFont = await pdfDoc.embedFont(boldFontBytes);
    const mediumFont = await pdfDoc.embedFont(mediumFontBytes);
    const regularFont = await pdfDoc.embedFont(regularFontBytes);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 50;
    const rowHeight = 20;
    const padding = 4;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 50;

    // Draw title
    page.drawText('Exhibitors list', {
      x: marginX,
      y,
      size: 32,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    // Define table columns
    const headers = [
      ['EXHIBITOR', 'EXPOSANT', 'name'],
      ['COUNTRY', 'PAYS', 'country'],
      ['CATEGORY', 'Categorie', 'category'],
      ['STAND', '', 'stand'],
    ];

    // Largeurs égales
    const usableWidth = pageWidth - marginX * 2;
    const equalColWidth = usableWidth / headers.length;
    const columnWidths = Array(headers.length).fill(equalColWidth);

    // Tronquer le texte s'il dépasse
    const truncateText = (text, font, fontSize, maxWidth) => {
      let truncated = text;
      while (font.widthOfTextAtSize(truncated, fontSize) > maxWidth) {
        if (truncated.length <= 1) break;
        truncated = truncated.slice(0, -2) + '…';
      }
      return truncated;
    };

    const drawHeader = () => {
      let x = marginX;
      headers.forEach(([en, fr], i) => {
        page.drawText(en, {
          x: x + padding,
          y,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        if (fr) {
          page.drawText(fr, {
            x: x + padding,
            y: y - 10,
            size: 8,
            font: mediumFont,
            color: rgb(0.4, 0.4, 0.4),
          });
        }
        x += columnWidths[i];
      });
      y -= 35;

      page.drawLine({
        start: { x: marginX, y: y + 16 },
        end: { x: pageWidth - marginX, y: y + 16 },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });
    };

    drawHeader();

    // Draw table rows
    const tableFontSize = 9;
    for (const item of formattedData) {
      if (y < 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - 50;
        drawHeader();
      }

      let x = marginX;

      headers.forEach(([_, __, key], i) => {
        let text = item[key] || '';
        const maxTextWidth = columnWidths[i] - padding * 2;
        text = truncateText(text, regularFont, tableFontSize, maxTextWidth);
        const textWidth = regularFont.widthOfTextAtSize(text, tableFontSize);

        // 🔹 Correct alignement pour la dernière colonne
        const textX = x + padding;

        page.drawText(text, {
          x: textX,
          y: y + 3,
          size: tableFontSize,
          font: regularFont,
          color: rgb(0.1, 0.1, 0.1),
        });

        x += columnWidths[i];
      });

      page.drawLine({
        start: { x: marginX, y: y - 3 },
        end: { x: pageWidth - marginX, y: y - 3 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      y -= rowHeight;
    }

    // Download PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'list-of-exhibitors.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the PDF');
  }
};

