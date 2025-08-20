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

  const selectedCheckboxes = Array.from(DOM.checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.id.toLowerCase());

  const focusFilters = selectedCheckboxes.filter(id => !CONFIG.specialFilters.includes(id));

  // Récupérer la valeur de recherche une seule fois
  const searchValue = normalizeStr(DOM.searchInput.value.trim());

  STATE.filteredData = STATE.exhibitorsOnly.filter(exhibitor => {
    const nameNorm = normalizeStr(exhibitor['Supplier Name']);
    const focusNorm = normalizeStr(exhibitor['Focus']);

    // Recherche étendue : nom d'exposant + Product Types de ses produits
    let matchesSearch = !searchValue || nameNorm.includes(searchValue);
    
    // Si la recherche ne match pas le nom, vérifier les Product Types des produits
    if (!matchesSearch && searchValue) {
      const startIndex = STATE.allData.findIndex(item =>
        normalizeStr(item['Supplier Name']) === nameNorm
      );
      const products = STATE.allData.slice(startIndex, startIndex + 19);
      
      // Chercher dans les Product Types des produits
      matchesSearch = products.some(product => {
        const productType = normalizeStr(product['Product type'] || '');
        return productType.includes(searchValue);
      });
    }

    const matchesFocus = focusFilters.length === 0 || focusFilters.includes(focusNorm);

    const startIndex = STATE.allData.findIndex(item =>
      normalizeStr(item['Supplier Name']) === nameNorm
    );
    const products = STATE.allData.slice(startIndex, startIndex + 19);

    const specialFilterResults = {
      handmade: !selectedCheckboxes.includes('handmade'),
      recycled: !selectedCheckboxes.includes('recycled'),
      organic: !selectedCheckboxes.includes('organic'),
      ethical: !selectedCheckboxes.includes('ethical-manufacturing'),
      limitedEdition: !selectedCheckboxes.includes('limited-edition'),
      whiteLabel: !selectedCheckboxes.includes('white-label'),
    };

    for (const product of products) {
      if (Object.values(specialFilterResults).every(Boolean)) break;

      const handmadeVal = (product['Handmade'] || '').toLowerCase().trim();
      const recOrgVal = (product['Recycled/Organic (if applicable)'] || '').toLowerCase().trim();
      const rawCertVal = (product['Raw Material Certfications (if applicable)'] || '').trim();
      const limitedEditionVal = (product['Is this product a limited edition?'] || '').toLowerCase().trim();
      const whiteLabelVal = (product['Is this product available as Private Label/White Label service?'] || '').toLowerCase().trim();

      if (!specialFilterResults.handmade && handmadeVal === 'yes') specialFilterResults.handmade = true;
      if (!specialFilterResults.recycled && recOrgVal.includes('recycled')) specialFilterResults.recycled = true;
      if (!specialFilterResults.organic && recOrgVal.includes('organic')) specialFilterResults.organic = true;
      if (!specialFilterResults.ethical && rawCertVal) specialFilterResults.ethical = true;
      if (!specialFilterResults.limitedEdition && limitedEditionVal === 'yes') specialFilterResults.limitedEdition = true;
      if (!specialFilterResults.whiteLabel && whiteLabelVal === 'yes') specialFilterResults.whiteLabel = true;
    }

    return matchesSearch &&
      matchesFocus &&
      specialFilterResults.handmade &&
      specialFilterResults.recycled &&
      specialFilterResults.organic &&
      specialFilterResults.ethical &&
      specialFilterResults.limitedEdition &&
      specialFilterResults.whiteLabel;
  });

  if (STATE.filteredData.length === 0) {
    DOM.noResults.classList.remove('hidden');
  }

  // Activer le bouton PDF si au moins une checkbox est cochée OU si au moins 3 caractères sont tapés dans la search
  const rawSearchValue = DOM.searchInput.value.trim();
  const hasValidSearch = rawSearchValue.length >= 3;
  const hasSelectedFilters = selectedCheckboxes.length > 0;
  
  DOM.exportPDFButton.disabled = !(hasValidSearch || hasSelectedFilters) || STATE.filteredData.length === 0;
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

export const getProductsForSupplier = (supplierName, allData, maxItems = 20) => {
  const supplierNorm = normalizeStr(supplierName);
  const startIndex = allData.findIndex(item =>
    normalizeStr(item['Supplier Name']) === supplierNorm
  );
  if (startIndex === -1) return [];
  return allData.slice(startIndex, startIndex + maxItems);
};