import { CONFIG, DOM } from './constants.js';
import { STATE } from './state.js';
import { renderExhibitorsList, renderPagination } from './views.js';

export const normalizeStr = (str) => str ? str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

export const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export const getUrlParam = (param) => new URLSearchParams(window.location.search).get(param);

export const applyFilters = () => {
  DOM.noResults.classList.add('hidden');
  STATE.currentPage = 1;

  const searchValue = normalizeStr(DOM.searchInput.value.trim());
  const selectedCheckboxes = Array.from(DOM.checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.id.toLowerCase());

  const focusFilters = selectedCheckboxes.filter(id => !CONFIG.specialFilters.includes(id));

  STATE.filteredData = STATE.exhibitorsOnly.filter(exhibitor => {
    const nameNorm = normalizeStr(exhibitor['Supplier Name']);
    const focusNorm = normalizeStr(exhibitor['Focus']);

    const matchesSearch = !searchValue || nameNorm.includes(searchValue);
    const matchesFocus = focusFilters.length === 0 || focusFilters.includes(focusNorm);

    const startIndex = STATE.allData.findIndex(item =>
      normalizeStr(item['Supplier Name']) === nameNorm
    );
    const products = STATE.allData.slice(startIndex, startIndex + CONFIG.itemsPerPage);

    const specialFilterResults = {
      handmade: !selectedCheckboxes.includes('handmade'),
      recycled: !selectedCheckboxes.includes('recycled'),
      organic: !selectedCheckboxes.includes('organic'),
      ethical: !selectedCheckboxes.includes('ethical-manufacturing')
    };

    for (const product of products) {
      if (Object.values(specialFilterResults).every(Boolean)) break;

      const handmadeVal = (product['Handmade'] || '').toLowerCase().trim();
      const recOrgVal = (product['Recycled/Organic (if applicable)'] || '').toLowerCase().trim();
      const rawCertVal = (product['Raw Material Certfications (if applicable)'] || '').trim();

      if (!specialFilterResults.handmade && handmadeVal === 'yes') specialFilterResults.handmade = true;
      if (!specialFilterResults.recycled && recOrgVal === 'recycled') specialFilterResults.recycled = true;
      if (!specialFilterResults.organic && recOrgVal === 'organic') specialFilterResults.organic = true;
      if (!specialFilterResults.ethical && rawCertVal) specialFilterResults.ethical = true;
    }

    return matchesSearch && matchesFocus && 
      specialFilterResults.handmade && 
      specialFilterResults.recycled && 
      specialFilterResults.organic && 
      specialFilterResults.ethical;
  });

  if (STATE.filteredData.length === 0) {
    DOM.noResults.classList.remove('hidden');
  }

  DOM.exportPDFButton.disabled = selectedCheckboxes.length === 0 || STATE.filteredData.length === 0;
  updatePagination();
};

export const updatePagination = () => {
  const start = (STATE.currentPage - 1) * CONFIG.itemsPerPage;
  const end = start + CONFIG.itemsPerPage;
  const pageData = STATE.filteredData.slice(start, end);
  renderExhibitorsList(pageData);
  renderPagination(STATE.filteredData.length, STATE.currentPage);
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 30); // 30-50ms est en général suffisant
};