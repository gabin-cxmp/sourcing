// --- Global Variables ---
const exhibitorsList = document.getElementById('exhibitors-list');
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');
const checkboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');
const paginationButtonsWrapper = document.querySelector('.pagination-buttons_wrapper');
const exportPDFButton = document.getElementById('export-pdf_button');

const urlCsv = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTda139g0YsEDh0AW3PQ2hGvZpFlSQlS4QlOqjUKN5tJWCzgXmRDl-S8k3V3drnHyD3ax-_zqnyAoIp/pub?gid=0&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFMnAIVzcRLBXNXvNPcoDe3fmWeRXteipd6O5qvwOADkRcDc4VuF7dWuqP5s7HEFOif0eykCQM4hYm/pub?output=csv'
];

let allData = [];
let visibleFilteredData = [];
let paginatedData = [];

const itemsPerPage = 20;
let currentPage = 1;

// --- Load & Clean CSV ---
const cleanData = async (url) => {
  const response = await fetch(url);
  const rawText = await response.text();

  const csvBody = rawText.split(/\r?\n/).slice(1).join('\n').trim();
  const parsed = Papa.parse(csvBody, { header: true, skipEmptyLines: true });

  return parsed.data
    .map(({ "": _, ...rest }) => rest)
    .filter(item => item['Supplier Name']);
};

const loadAllData = async (urls) => {
  const allArrays = await Promise.all(urls.map(cleanData));
  return allArrays
    .flat()
    .sort((a, b) => a['Supplier Name']?.localeCompare(b['Supplier Name']));
};

// --- Render ---
const renderItem = (item) => {
  const container = document.createElement('div');
  container.className = 'card';

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

// --- Get filtered data for export (based on filters only) ---
const getDataForExport = () => {
  const selectedFilters = Array.from(
    document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked')
  ).map(cb => cb.id.toLowerCase());

  return allData.filter(item => {
    const focus = item['Focus']?.toLowerCase() || '';
    return selectedFilters.length === 0 || selectedFilters.includes(focus);
  });
};

// --- Format data for export ---
const formatExportData = data => {
  return data.map((item, idx) => ({
    number: idx + 1,
    name: item['Supplier Name'].toUpperCase(),
    focus: item['Focus'],
    country: item['Supplier Country'],
  }));
};

const generatePDF = async (data) => {
  // Crée un nouveau document PDF
  const pdfDoc = await PDFLib.PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Charge tes fonts locales (attention au chemin relatif à ta page)
  const fontBoldBytes = await fetch('../assets/fonts/theinhardt-bold.otf').then(res => res.arrayBuffer());
  const fontMediumBytes = await fetch('../assets/fonts/theinhardt-medium.otf').then(res => res.arrayBuffer());
  const fontRegularBytes = await fetch('../assets/fonts/theinhardt-regular.otf').then(res => res.arrayBuffer());

  // Embed les fonts dans le document
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  const fontMedium = await pdfDoc.embedFont(fontMediumBytes);
  const fontRegular = await pdfDoc.embedFont(fontRegularBytes);

  // Crée une page
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  // Titre
  const title = 'My Tradeshow Journey';
  const titleFontSize = 32;
  page.drawText(title, {
    x: 50,
    y: height - 80,
    size: titleFontSize,
    font: fontBold,
    color: PDFLib.rgb(0, 0, 0),
  });

  // Position initiale pour les lignes
  let yPosition = height - 140;
  const lineHeight = 18;

  // Boucle sur tes données et affiche chaque ligne en format simple
  data.forEach((item, idx) => {
    if (yPosition < 50) {
      // Nouvelle page si on arrive en bas
      yPosition = height - 50;
      pdfDoc.addPage();
    }

    // Numéro + Nom (en gras)
    page.drawText(`${idx + 1}. ${item.name}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: PDFLib.rgb(0, 0, 0),
    });
    yPosition -= lineHeight;

    // Focus (regular)
    page.drawText(`Focus: ${item.focus}`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: fontRegular,
      color: PDFLib.rgb(0.2, 0.2, 0.2),
    });
    yPosition -= lineHeight/1.2;

    // Country (medium)
    page.drawText(`Country: ${item.country}`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: fontMedium,
      color: PDFLib.rgb(0.2, 0.2, 0.2),
    });
    yPosition -= lineHeight + 10;
  });

  // Génère le PDF en Uint8Array
  const pdfBytes = await pdfDoc.save();

  // Crée un blob et télécharge le fichier
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'my-tradeshow-journey.pdf';
  link.click();

  // Nettoyage
  URL.revokeObjectURL(link.href);
};


// --- Filters & Search ---
const handleFiltersAndSearch = () => {
  noResults.classList.add('hidden');
  currentPage = 1;

  const searchValue = searchInput.value.toLowerCase().trim();
  const selectedFilters = Array.from(
    document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked')
  ).map(cb => cb.id.toLowerCase());

  visibleFilteredData = allData.filter(item => {
    const name = item['Supplier Name']?.toLowerCase() || '';
    const focus = item['Focus']?.toLowerCase() || '';

    const matchesSearch = !searchValue || name.includes(searchValue);
    const matchesFilters = selectedFilters.length === 0 || selectedFilters.includes(focus);

    return matchesSearch && matchesFilters;
  });

  if (visibleFilteredData.length === 0) {
    noResults.classList.remove('hidden');
  }

  paginateResults();
};

// --- Pagination ---
const paginateResults = () => {
  paginationButtonsWrapper.innerHTML = '';

  const numberOfResults = visibleFilteredData.length;
  const totalPages = Math.ceil(numberOfResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Back Button
  const backButton = document.createElement('button');
  backButton.textContent = "Back";
  backButton.disabled = currentPage === 1;
  backButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      paginateResults();
    }
  });
  paginationButtonsWrapper.appendChild(backButton);

  // Page Buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    if (i === currentPage) pageButton.classList.add('active');
    pageButton.addEventListener('click', () => {
      currentPage = i;
      paginateResults();
    });
    paginationButtonsWrapper.appendChild(pageButton);
  }

  // Next Button
  const nextButton = document.createElement('button');
  nextButton.textContent = "Next";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      paginateResults();
    }
  });
  paginationButtonsWrapper.appendChild(nextButton);

  if(totalPages === 1){
    paginationButtonsWrapper.innerHTML = '';
  }

  // Paginate & render
  paginatedData = visibleFilteredData.slice(startIndex, endIndex);
  renderList(paginatedData);
};

// --- Enable/Disable Export Button ---
const updateExportButtonState = () => {
  const hasFilterSelected = document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked').length > 0;
  exportPDFButton.disabled = !hasFilterSelected;
};

// --- Event Listeners ---
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

// Export Button Click
exportPDFButton.addEventListener('click', () => {
  const dataToExport = getDataForExport();
  const formattedData = formatExportData(dataToExport);
  generatePDF(formattedData);
});

// --- Initialization ---
const main = async () => {
  allData = await loadAllData(urlCsv);
  visibleFilteredData = allData;
  paginateResults();
  updateExportButtonState();
};

main();
