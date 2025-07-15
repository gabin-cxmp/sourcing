// -----------------------------
// --- Global Variables & DOM ---
// -----------------------------
const exhibitorsList = document.getElementById('exhibitors-list');
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');
const checkboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');
const paginationButtonsWrapper = document.querySelector('.pagination-buttons_wrapper');
const exportPDFButton = document.getElementById('export-pdf_button');
const listContainer = document.getElementById('list-container');
const microviewContainer = document.getElementById('microview-container');
const loader = document.getElementById('loader');

const urlCsv = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTda139g0YsEDh0AW3PQ2hGvZpFlSQlS4QlOqjUKN5tJWCzgXmRDl-S8k3V3drnHyD3ax-_zqnyAoIp/pub?gid=0&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFMnAIVzcRLBXNXvNPcoDe3fmWeRXteipd6O5qvwOADkRcDc4VuF7dWuqP5s7HEFOif0eykCQM4hYm/pub?output=csv'
];

let allData = [];
let visibleFilteredData = [];
let paginatedData = [];

const itemsPerPage = 20;
let currentPage = 1;

// -----------------------------
// --- Data Loading & Cleaning ---
// -----------------------------
const cleanData = async (url) => {
  const response = await fetch(url);
  const rawText = await response.text();

  // Remove header manually to avoid duplicates, then parse CSV with header:true
  const csvBody = rawText.split(/\r?\n/).slice(1).join('\n').trim();
  const parsed = Papa.parse(csvBody, { header: true, skipEmptyLines: true });

  return parsed.data
    .map(({ "": _, ...rest }) => rest) // Remove unnamed empty columns if any
    .filter(item => item['Supplier Name']); // Filter out empty entries
};

const loadAllData = async (urls) => {
  loader.classList.remove('hidden');

  // Load all CSV files concurrently and flatten results
  const allArrays = await Promise.all(urls.map(cleanData));
  loader.classList.add('hidden');

  return allArrays
    .flat()
    .sort((a, b) => a['Supplier Name']?.localeCompare(b['Supplier Name']));
};

// -----------------------------
// --- Rendering ---
// -----------------------------
const renderItem = (item) => {
  const container = document.createElement('a');
  container.className = 'card';
  container.href = `?supplier-name=${encodeURIComponent(item['Supplier Name'])}`;
  container.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState({}, '', container.href);
    microView();
  });

  const title = document.createElement('p');
  title.className = 'card-title';
  title.textContent = item['Supplier Name'].toUpperCase();

  const country = document.createElement('p');
  country.textContent = item['Supplier Country'];

  const focus = document.createElement('p');
  focus.textContent = item['Focus'];

  container.append(title, country, focus);
  return container;
};

const renderList = (data) => {
  exhibitorsList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  data.forEach(item => fragment.appendChild(renderItem(item)));
  exhibitorsList.appendChild(fragment);
};

// -----------------------------
// --- Filtering & Searching ---
// -----------------------------
const handleFiltersAndSearch = () => {
  noResults.classList.add('hidden');
  currentPage = 1;

  const searchValue = searchInput.value.toLowerCase().trim();
  const selectedFilters = Array.from(
    document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked')
  ).map(cb => cb.id.toLowerCase());

  visibleFilteredData = allData.filter(item => {
    const name = (item['Supplier Name'] || '').toLowerCase();
    const focus = (item['Focus'] || '').toLowerCase();

    const matchesSearch = !searchValue || name.includes(searchValue);
    const matchesFilters = selectedFilters.length === 0 || selectedFilters.includes(focus);

    return matchesSearch && matchesFilters;
  });

  if (visibleFilteredData.length === 0) {
    noResults.classList.remove('hidden');
  }

  paginateResults();
};

// -----------------------------
// --- Pagination ---
// -----------------------------
const paginateResults = () => {
  paginationButtonsWrapper.innerHTML = '';

  const totalItems = visibleFilteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Helper to create buttons
  const createButton = (text, disabled, onClick, active = false) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    if (disabled) btn.disabled = true;
    if (active) btn.classList.add('active');
    btn.addEventListener('click', onClick);
    return btn;
  };

  // Back Button
  paginationButtonsWrapper.appendChild(
    createButton('Back', currentPage === 1, () => {
      if (currentPage > 1) {
        currentPage--;
        paginateResults();
      }
    })
  );

  // Page Number Buttons
  for (let i = 1; i <= totalPages; i++) {
    paginationButtonsWrapper.appendChild(
      createButton(i, false, () => {
        currentPage = i;
        paginateResults();
      }, i === currentPage)
    );
  }

  // Next Button
  paginationButtonsWrapper.appendChild(
    createButton('Next', currentPage === totalPages, () => {
      if (currentPage < totalPages) {
        currentPage++;
        paginateResults();
      }
    })
  );

  if (totalPages <= 1) {
    paginationButtonsWrapper.innerHTML = ''; // Hide pagination if 1 or 0 pages
  }

  paginatedData = visibleFilteredData.slice(startIndex, endIndex);
  renderList(paginatedData);
};

// -----------------------------
// --- Export PDF ---
// -----------------------------
const getDataForExport = () => {
  const selectedFilters = Array.from(
    document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked')
  ).map(cb => cb.id.toLowerCase());

  return allData.filter(item => {
    const focus = (item['Focus'] || '').toLowerCase();
    return selectedFilters.length === 0 || selectedFilters.includes(focus);
  });
};

const formatExportData = (data) => {
  return data.map((item, idx) => ({
    number: idx + 1,
    name: item['Supplier Name'].toUpperCase(),
    focus: item['Focus'],
    country: item['Supplier Country'],
  }));
};

const generatePDF = async (formattedData) => {
  const { PDFDocument, rgb } = PDFLib;
  const pdfDoc = await PDFLib.PDFDocument.create();
  pdfDoc.registerFontkit(window.fontkit);

  const [boldFontBytes, mediumFontBytes, regularFontBytes] = await Promise.all([
    fetch('/assets/fonts/theinhardt-bold.otf').then(res => res.arrayBuffer()),
    fetch('/assets/fonts/theinhardt-medium.otf').then(res => res.arrayBuffer()),
    fetch('/assets/fonts/theinhardt-regular.otf').then(res => res.arrayBuffer()),
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

  // Titre
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
    ['SECTOR', 'SECTEUR', 'focus'],
    ['STAND', '', 'stand'],
  ];

  // Colonne "name" - largeur max du contenu + padding
  const nameColIndex = 0;
  const nameKey = headers[nameColIndex][2];
  const nameColMaxWidth = Math.max(
    boldFont.widthOfTextAtSize(headers[nameColIndex][0], 10),
    mediumFont.widthOfTextAtSize(headers[nameColIndex][1], 8),
    ...formattedData.map(d =>
      regularFont.widthOfTextAtSize(d[nameKey] || '', 9)
    )
  ) 
  // Colonne "sector" - largeur max du contenu + padding (dynamique)
  const sectorColIndex = 2;
  const sectorKey = headers[sectorColIndex][2];
  const sectorColMaxWidth = Math.max(
    boldFont.widthOfTextAtSize(headers[sectorColIndex][0], 10),
    mediumFont.widthOfTextAtSize(headers[sectorColIndex][1], 8),
    ...formattedData.map(d =>
      regularFont.widthOfTextAtSize(d[sectorKey] || '', 9)
    )
  ) + padding * 2;

  // Colonne "stand" - largeur fixe suffisante pour ~6 caractères
  const standColIndex = 3;
  const standKey = headers[standColIndex][2];
  // Calcule la largeur de 6 caractères "W" (largeur max possible) + padding
  const standColFixedWidth = regularFont.widthOfTextAtSize('WWWWWW', 9) + padding * 2;

  // Colonne "country" - largeur restante
  const usableWidth = pageWidth - marginX * 2;
  const otherColsWidth = usableWidth - nameColMaxWidth - sectorColMaxWidth - standColFixedWidth;
  const countryColIndex = 1;
  const countryColWidth = otherColsWidth;

  const columnWidths = [];
  columnWidths[nameColIndex] = nameColMaxWidth;
  columnWidths[countryColIndex] = countryColWidth;
  columnWidths[sectorColIndex] = sectorColMaxWidth;
  columnWidths[standColIndex] = standColFixedWidth;

  // Fonction pour dessiner l'entête
  const drawHeader = () => {
    let x = marginX;

    headers.forEach(([en, fr], i) => {
      // Texte anglais (gras)
      page.drawText(en, {
        x: x + padding,
        y,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Texte français (sous-titre)
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

    // Ligne épaisse sous en-tête
    page.drawLine({
      start: { x: marginX, y: y + 16 },
      end: { x: pageWidth - marginX, y: y + 16 },
      thickness: 1.5,
      color: rgb(0, 0, 0),
    });
  };

  drawHeader();

  // Taille police pour le tableau
  const tableFontSize = 8;

  formattedData.forEach((item) => {
    if (y < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
      drawHeader();
    }

    let x = marginX;

    headers.forEach(([_, __, key], i) => {
      let text = item[key] || '';

      // Pour la colonne "stand", on aligne à droite
      if (i === standColIndex) {
        const textWidth = regularFont.widthOfTextAtSize(text, tableFontSize);
        page.drawText(text, {
          x: x + columnWidths[i] - padding - textWidth,
          y: y + 3,
          size: tableFontSize,
          font: regularFont,
          color: rgb(0.1, 0.1, 0.1),
        });
      } else {
        // Alignement normal à gauche + padding
        page.drawText(text, {
          x: x + padding,
          y: y + 3,
          size: tableFontSize,
          font: regularFont,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      x += columnWidths[i];
    });

    // Ligne grise séparatrice
    page.drawLine({
      start: { x: marginX, y: y - 3 },
      end: { x: pageWidth - marginX, y: y - 3 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    y -= rowHeight;
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'list-of-exhibitors.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// -----------------------------
// --- Micro View ---
// -----------------------------
const normalizeStr = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getUrlParam = () => {
  const supplierName = new URLSearchParams(document.location.search).get('supplier-name');
  if (!supplierName) return null;

  return allData.find(item => normalizeStr(item['Supplier Name']) === normalizeStr(supplierName));
};

const microView = () => {
  const supplier = getUrlParam();
  microviewContainer.innerHTML = '';

  if (!supplier) {
    listContainer.classList.remove('hidden');
    microviewContainer.classList.add('hidden');
    return;
  }

  listContainer.classList.add('hidden');
  microviewContainer.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  const title = document.createElement('p');
  title.className = 'microview-title';
  title.textContent = supplier['Supplier Name'].toUpperCase();

  const country = document.createElement('p');
  country.textContent = supplier['Supplier Country'];

  const focus = document.createElement('p');
  focus.textContent = supplier['Focus'];

  fragment.append(title, country, focus);
  microviewContainer.appendChild(fragment);
};

// -----------------------------
// --- UI Updates ---
// -----------------------------
const updateExportButtonState = () => {
  const hasFilterSelected = document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked').length > 0;
  exportPDFButton.disabled = !hasFilterSelected;
};

// -----------------------------
// --- Event Listeners ---
// -----------------------------
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(handleFiltersAndSearch, 200);
});

checkboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    handleFiltersAndSearch();
    updateExportButtonState();
  });
});

window.addEventListener('popstate', () => {
  microView();
});

exportPDFButton.addEventListener('click', () => {
  const dataToExport = getDataForExport();
  const formattedData = formatExportData(dataToExport);
  generatePDF(formattedData);
});

// -----------------------------
// --- Initialization ---
// -----------------------------
const main = async () => {
  allData = await loadAllData(urlCsv);
  visibleFilteredData = allData;
  microView();
  paginateResults();
  updateExportButtonState();
};

main();
