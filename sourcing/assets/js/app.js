import { DOM } from './constants.js';
import { STATE } from './state.js';
import { loadAllData, exportPDF } from './services.js';
import { debounce, applyFilters, getUrlParam, updatePagination, updateApplyButton } from './utils.js';
import { initializeAllFilters, renderMicroView, hideMicroView } from './views.js';

(async () => {
  try {
    const { allData, exhibitorsOnly } = await loadAllData();
    STATE.allData = allData;
    STATE.exhibitorsOnly = exhibitorsOnly;
    STATE.filteredData = Array.isArray(exhibitorsOnly) ? [...exhibitorsOnly] : [];

    initializeAllFilters();

    DOM.checkboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');

    DOM.checkboxes.forEach(cb => cb.addEventListener('change', updateApplyButton));
    DOM.applyFiltersButton.addEventListener('click', applyFilters);

    const supplierParam = getUrlParam('supplier-name');

    if (supplierParam) {
      renderMicroView();
    } else {
      updatePagination();
    }
  } catch (error) {
    console.error('Initialization failed:', error);
  }
})();

DOM.searchInput.addEventListener('input', debounce(applyFilters, 300));
DOM.exportPDFButton.addEventListener('click', exportPDF);
window.addEventListener('popstate', renderMicroView);

window.hideMicroView = hideMicroView;
