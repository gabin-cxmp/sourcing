// -----------------------------
// --- Configuration & Constantes ---
// -----------------------------
const CONFIG = {
  itemsPerPage: 20,
  csvUrls: [
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTda139g0YsEDh0AW3PQ2hGvZpFlSQlS4QlOqjUKN5tJWCzgXmRDl-S8k3V3drnHyD3ax-_zqnyAoIp/pub?gid=0&single=true&output=csv',
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFMnAIVzcRLBXNXvNPcoDe3fmWeRXteipd6O5qvwOADkRcDc4VuF7dWuqP5s7HEFOif0eykCQM4hYm/pub?output=csv'
  ]
};

// -----------------------------
// --- Éléments DOM ---
// -----------------------------
const DOM = {
  exhibitorsList: document.getElementById('exhibitors-list'),
  searchInput: document.getElementById('searchInput'),
  noResults: document.getElementById('noResults'),
  checkboxes: document.querySelectorAll('.checkbox-container input[type="checkbox"]'),
  paginationButtonsWrapper: document.querySelector('.pagination-buttons_wrapper'),
  exportPDFButton: document.getElementById('export-pdf_button'),
  listContainer: document.getElementById('list-container'),
  microviewContainer: document.getElementById('microview-container'),
  loaders: document.querySelectorAll('.loader'),
  goBackButton: document.getElementById('back-button_micro'),
  microviewContentWrapper: document.getElementById('microview-main-content_wrapper'),
  microviewTitle: document.getElementById('microview-title'),
  microviewCountry: document.getElementById('microview-country'),
  microviewFocus: document.getElementById('microview-focus'),
  microviewContactButton : document.getElementById('microview-contact_button'),
  certificationsList: document.getElementById('certifications-list'),
  certificationsWrapper: document.querySelector('.certifications_wrapper')
};

// -----------------------------
// --- État de l'application ---
// -----------------------------
const STATE = {
  allData: [],
  exhibitorsOnly: [],
  visibleFilteredData: [],
  paginatedData: [],
  currentSupplier: null,
  currentPage: 1
};

// -----------------------------
// --- Fonctions utilitaires ---
// -----------------------------
const utils = {
  normalizeStr: (str) => str ? str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '',
  
  debounce: (func, delay) => {
    let timer;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(context, args), delay);
    };
  },
  
  getUrlParam: (param) => new URLSearchParams(window.location.search).get(param)
};

// -----------------------------
// --- Gestion des données ---
// -----------------------------
const dataService = {
  cleanData: async (url) => {
    const response = await fetch(url);
    const rawText = await response.text();
    const csvBody = rawText.split(/\r?\n/).slice(1).join('\n').trim();
    const parsed = Papa.parse(csvBody, { header: true, skipEmptyLines: true });
    return parsed.data.map(({ "": _, ...rest }) => rest);
  },
  
  loadAllData: async (urls) => {
    DOM.loaders.forEach(loader => loader.classList.remove('hidden'));
    const allArrays = await Promise.all(urls.map(dataService.cleanData));
    DOM.loaders.forEach(loader => loader.classList.add('hidden'));
    DOM.microviewContentWrapper.classList.remove('hidden');
    
    const allData = allArrays.flat();
    const exhibitorsOnly = allData
    .filter(item => item['Supplier Name'])
    .sort((a, b) => a['Supplier Name'].localeCompare(b['Supplier Name']));
    
    return { allData, exhibitorsOnly };
  }
};

// -----------------------------
// --- Rendering ---
// -----------------------------
const render = {
  createExhibitorCard: (item) => {
    const container = document.createElement('a');
    container.className = 'card';
    container.href = `?supplier-name=${encodeURIComponent(item['Supplier Name'])}`;
    container.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', container.href);
      microView.render();
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
  },
  
  exhibitorsList: (data) => {
    DOM.exhibitorsList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    data.forEach(item => fragment.appendChild(render.createExhibitorCard(item)));
    DOM.exhibitorsList.appendChild(fragment);
  },
  
  pagination: (totalItems, currentPage) => {
    DOM.paginationButtonsWrapper.innerHTML = '';
    const totalPages = Math.ceil(totalItems / CONFIG.itemsPerPage);
    
    if (totalPages <= 1) return;
    
    const createButton = (text, disabled, onClick, active = false) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      if (disabled) btn.disabled = true;
      if (active) btn.classList.add('active');
      btn.addEventListener('click', onClick);
      return btn;
    };
    
    // Back Button
    DOM.paginationButtonsWrapper.appendChild(
      createButton('Back', currentPage === 1, () => {
        if (currentPage > 1) {
          STATE.currentPage--;
          pagination.update();
        }
      })
    );
    
    // Page Buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      DOM.paginationButtonsWrapper.appendChild(createButton('1', false, () => {
        STATE.currentPage = 1;
        pagination.update();
      }));
      if (startPage > 2) {
        DOM.paginationButtonsWrapper.appendChild(createButton('...', true, () => {}));
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      DOM.paginationButtonsWrapper.appendChild(
        createButton(i, false, () => {
          STATE.currentPage = i;
          pagination.update();
        }, i === currentPage)
      );
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        DOM.paginationButtonsWrapper.appendChild(createButton('...', true, () => {}));
      }
      DOM.paginationButtonsWrapper.appendChild(createButton(totalPages, false, () => {
        STATE.currentPage = totalPages;
        pagination.update();
      }));
    }
    
    // Next Button
    DOM.paginationButtonsWrapper.appendChild(
      createButton('Next', currentPage === totalPages, () => {
        if (currentPage < totalPages) {
          STATE.currentPage++;
          pagination.update();
        }
      })
    );
  }
};

// -----------------------------
// --- Filtrage & Recherche ---
// -----------------------------
const filters = {
  apply: () => {
    DOM.noResults.classList.add('hidden');
    STATE.currentPage = 1;
    
    const searchValue = DOM.searchInput.value.toLowerCase().trim();
    const selectedFilters = Array.from(
      document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked')
    ).map(cb => cb.id.toLowerCase());
    
    STATE.visibleFilteredData = STATE.exhibitorsOnly.filter(item => {
      const name = (item['Supplier Name'] || '').toLowerCase();
      const focus = (item['Focus'] || '').toLowerCase();
      
      const matchesSearch = !searchValue || name.includes(searchValue);
      const matchesFilters = selectedFilters.length === 0 || selectedFilters.includes(focus);
      
      return matchesSearch && matchesFilters;
    });
    
    if (STATE.visibleFilteredData.length === 0) {
      DOM.noResults.classList.remove('hidden');
    }
    
    pagination.update();
  },
  
  updateExportButton: () => {
    const hasFilterSelected = document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked').length > 0;
    DOM.exportPDFButton.disabled = !hasFilterSelected;
  }
};

// -----------------------------
// --- Pagination ---
// -----------------------------
const pagination = {
  update: () => {
    const startIndex = (STATE.currentPage - 1) * CONFIG.itemsPerPage;
    const endIndex = startIndex + CONFIG.itemsPerPage;
    
    STATE.paginatedData = STATE.visibleFilteredData.slice(startIndex, endIndex);
    render.exhibitorsList(STATE.paginatedData);
    render.pagination(STATE.visibleFilteredData.length, STATE.currentPage);
  }
};

// -----------------------------
// --- Micro View ---
// -----------------------------
const microView = {
  getCurrentSupplier: () => {
    const supplierName = utils.getUrlParam('supplier-name');
    if (!supplierName) return null;
    
    return STATE.allData.find(item => 
      utils.normalizeStr(item['Supplier Name']) === utils.normalizeStr(supplierName)
    );
  },
  
  renderCertifications: (supplier) => {
    DOM.certificationsList.innerHTML = '';
    
    const certKeys = [
      "Company Certifications \n(if applicable)",
      "Recycled/Organic (if applicable)",
      "Raw Material Certfications (if applicable)",
      "Other Raw Material Certifications (if applicable)"
    ];
    
    const conditionalCerts = [
      { key: "Handmade", label: "Handmade" }
    ];
    
    const certs = [];
    
    certKeys.forEach((key) => {
      const value = supplier[key]?.trim();
      if (value) certs.push(value);
    });
    
    conditionalCerts.forEach(({ key, label }) => {
      if (supplier[key]?.trim().toLowerCase() === "yes") {
        certs.push(label);
      }
    });
    
    if (certs.length > 0) {
      DOM.certificationsWrapper.querySelector('p').textContent = "Certifications:";
      certs.forEach((cert) => {
        const li = document.createElement("li");
        li.textContent = cert;
        DOM.certificationsList.appendChild(li);
      });
    } else {
      DOM.certificationsWrapper.querySelector('p').textContent = "No certifications listed";
    }
  },
  
    render: (isInitialLoad = false) => {
    STATE.currentSupplier = microView.getCurrentSupplier();
    
    if (!STATE.currentSupplier) {
      DOM.listContainer.classList.remove('hidden');
      DOM.microviewContainer.classList.add('hidden');
      if (isInitialLoad) {
        pagination.update();
      }
      return;
    }
    
    DOM.listContainer.classList.add('hidden');
    DOM.microviewContainer.classList.remove('hidden');
    
    DOM.microviewTitle.textContent = STATE.currentSupplier['Supplier Name'];
    DOM.microviewCountry.textContent = `Country: ${STATE.currentSupplier['Supplier Country'] || 'Not specified'}`;
    DOM.microviewFocus.textContent = `Focus: ${STATE.currentSupplier['Focus'] || 'Not specified'}`;
    DOM.microviewContactButton.href = `mailto: ${STATE.currentSupplier['Email']}`;
    
    microView.renderCertifications(STATE.currentSupplier);
  }
};

// -----------------------------
// --- Export PDF ---
// -----------------------------
const pdfExport = {
  getDataForExport: () => {
    const selectedFilters = Array.from(
      document.querySelectorAll('.checkbox-container input[type="checkbox"]:checked')
    ).map(cb => cb.id.toLowerCase());
    
    return STATE.exhibitorsOnly.filter(item => {
      const focus = (item['Focus'] || '').toLowerCase();
      return selectedFilters.length === 0 || selectedFilters.includes(focus);
    });
  },
  
  formatExportData: (data) => {
    return data.map((item, idx) => ({
      number: idx + 1,
      name: item['Supplier Name'].toUpperCase(),
      focus: item['Focus'],
      country: item['Supplier Country'],
      stand: item['Stand Number'] || ''
    }));
  },

  generate: async () => {
    const dataToExport = pdfExport.getDataForExport();
    const formattedData = pdfExport.formatExportData(dataToExport);

    if (formattedData.length === 0) {
      alert('No data to export');
      return;
    }

    try {
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

      const nameColIndex = 0;
      const nameKey = headers[nameColIndex][2];
      const nameColMaxWidth = Math.max(
        boldFont.widthOfTextAtSize(headers[nameColIndex][0], 10),
        mediumFont.widthOfTextAtSize(headers[nameColIndex][1], 8),
        ...formattedData.map(d => regularFont.widthOfTextAtSize(d[nameKey] || '', 9))
      ) + padding * 2;

      const sectorColIndex = 2;
      const sectorKey = headers[sectorColIndex][2];
      const sectorColMaxWidth = Math.max(
        boldFont.widthOfTextAtSize(headers[sectorColIndex][0], 10),
        mediumFont.widthOfTextAtSize(headers[sectorColIndex][1], 8),
        ...formattedData.map(d => regularFont.widthOfTextAtSize(d[sectorKey] || '', 9))
      ) + padding * 2;

      const standColIndex = 3;
      const standKey = headers[standColIndex][2];
      const standColFixedWidth = regularFont.widthOfTextAtSize('WWWWWW', 9) + padding * 2;

      const usableWidth = pageWidth - marginX * 2;
      const otherColsWidth = usableWidth - nameColMaxWidth - sectorColMaxWidth - standColFixedWidth;
      const countryColIndex = 1;
      const countryColWidth = otherColsWidth;

      const columnWidths = [
        nameColMaxWidth,
        countryColWidth,
        sectorColMaxWidth,
        standColFixedWidth
      ];

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
      link.download = 'list-of-exhibitors.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('An error occurred while generating the PDF');
    }
  }
};

// -----------------------------
// --- Gestion des événements ---
// -----------------------------
const events = {
  init: () => {
    DOM.searchInput.addEventListener('input', utils.debounce(filters.apply, 200));
    
    DOM.checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        filters.apply();
        filters.updateExportButton();
      });
    });
    
    window.addEventListener('popstate', microView.render);
    
    DOM.exportPDFButton.addEventListener('click', pdfExport.generate);
    
    DOM.goBackButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.history.length > 1 && document.referrer.includes(window.location.hostname)) {
        history.back();
      } else {
        window.location.href = window.location.pathname;
      }
  });
  }
};

// -----------------------------
// --- Initialisation ---
// -----------------------------
const init = async () => {
  try {
    const { allData, exhibitorsOnly } = await dataService.loadAllData(CONFIG.csvUrls);
    STATE.allData = allData;
    STATE.exhibitorsOnly = exhibitorsOnly;
    STATE.visibleFilteredData = exhibitorsOnly;
    
    if (utils.getUrlParam('supplier-name')) {
      microView.render(true); // true indique que c'est le premier chargement
    } else {
      DOM.listContainer.classList.remove('hidden');
      DOM.microviewContainer.classList.add('hidden');
      pagination.update();
    }
    
    filters.updateExportButton();
    events.init();
  } catch (error) {
    console.error('Initialization error:', error);
    DOM.loaders.forEach(loader => loader.classList.add('hidden'));
    alert('Failed to load data. Please try again later.');
  }
};

// Lancement de l'application
document.addEventListener('DOMContentLoaded', init);