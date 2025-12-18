import { DOM, SUPABASE_CONFIG } from './constants.js';
import { STATE } from './state.js';

const supabase = globalThis.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

export const fetchAllData = async () => {
  const { data: suppliersRaw, error: suppliersError } = await supabase
    .from('public_suppliers')
    .select('* , countries(name), focus_join:focuses!focus(name), secondary_join:focuses!secondary_product_category(name), product_categories(name), tradeshow(name), is_active')
    .order('name');

  const { data: productsRaw, error: productsError } = await supabase
    .from('products')
    .select('* , countries_made_in:countries(name), recycled_org:recycled_organic(name), raw_cert:raw_material_certifications(name), supp:public_suppliers(name), prod_vol:product_volumes(quantity)');

  if (productsError || suppliersError) {
    console.error('Error fetching data:', suppliersError || productsError);
    throw suppliersError || productsError;
  }

  if (!productsRaw || !suppliersRaw) throw new Error('No data returned');

  const exhibitors = suppliersRaw
    .filter(item => item.is_active === true)
    .map(item => ({
      'Supplier Name': item.name,
      'Supplier Country': item.countries?.name || '',
      'Focus': item.focus_join?.name || '',
      'Main Product Category': item.product_categories?.name || '',
      'Stand Number': item.stand || '',
      id: item.id,
      is_active: item.is_active
    }));

  const products = productsRaw.map(item => ({
    'Supplier Name': item.supp?.name || '',
    'Product type': item.type || '',
    'Product Material - Main Composition': item.material || '',
    'Product Material - Secondary Composition (if applicable)': item.material_secondary || '',
    'Product specifications (if applicable)': item.specifications || '',
    'Product Finishing (if applicable)': item.finishing || '',
    'Production volumes': item.prod_vol?.quantity || '',
    'Handmade': item.handmade ? 'Yes' : 'No',
    'Is this product available as Private Label/White Label service?': item.private_label_white_label ? 'Yes' : 'No',
    'Is this product a limited edition?': item.limited_edition ? 'Yes' : 'No',
    'Made in': item.countries_made_in?.name || '',
    'Recycled/Organic (if applicable)': item.recycled_org?.name || '',
    'Raw Material Certfications (if applicable)': item.raw_cert?.name || '',
    'Deadstock': item.deadstock ? 'Yes' : 'No',
    'Other Raw Material Certifications': item.other_raw_material_certifications || '',
    id: item.id,
    reference_name: item.reference_name
  }));

  return { exhibitors, allData: products };
};

export const loadAllData = async () => {
  DOM.loaders.forEach(loader => loader.classList.remove('hidden'));
  DOM.searchInput.disabled = true;
  DOM.checkboxes.forEach(checkbox => checkbox.disabled = true);

  try {
    const { allData, exhibitors } = await fetchAllData();

    DOM.loaders.forEach(loader => loader.classList.add('hidden'));
    DOM.microviewContentWrapper.classList.remove('hidden');
    DOM.searchInput.disabled = false;
    DOM.checkboxes.forEach(checkbox => checkbox.disabled = false);

    return { allData, exhibitorsOnly: exhibitors };
  } catch (error) {
    alert('Failed to load data. Please check your connection.');
    throw error;
  }
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

    page.drawText('Exhibitors list', {
      x: marginX,
      y,
      size: 32,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    const headers = [
      ['EXHIBITOR', 'EXPOSANT', 'name'],
      ['COUNTRY', 'PAYS', 'country'],
      ['CATEGORY', 'Categorie', 'category'],
      ['STAND', '', 'stand'],
    ];

    const usableWidth = pageWidth - marginX * 2;
    const equalColWidth = usableWidth / headers.length;
    const columnWidths = Array(headers.length).fill(equalColWidth);

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

        page.drawText(text, {
          x: x + padding,
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

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    alert('An error occurred while generating the PDF');
  }
};
