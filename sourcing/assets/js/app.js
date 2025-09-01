import { CONFIG, DOM } from './constants.js';
import { STATE } from './state.js';
import { loadAllData, exportPDF } from './services.js';
import { debounce, applyFilters, getUrlParam, updatePagination } from './utils.js';
import { initializeAllFilters, renderMicroView, hideMicroView } from './views.js';

// Initialisation
(async () => {
  const { allData, exhibitorsOnly } = await loadAllData(CONFIG.csvUrls);
  STATE.allData = allData;
  STATE.exhibitorsOnly = exhibitorsOnly;
  STATE.filteredData = [...exhibitorsOnly];

  initializeAllFilters();

  const supplierParam = getUrlParam('supplier-name');
  
  if (supplierParam) {
    renderMicroView();
  } else {
    updatePagination();
  }
})();

// Gestion des événements
DOM.searchInput.addEventListener('input', debounce(applyFilters, 300));
DOM.checkboxes.forEach(cb => cb.addEventListener('change', applyFilters));
DOM.exportPDFButton.addEventListener('click', exportPDF);
window.addEventListener('popstate', renderMicroView);

// Expose les fonctions nécessaires globalement si besoin
window.hideMicroView = hideMicroView;