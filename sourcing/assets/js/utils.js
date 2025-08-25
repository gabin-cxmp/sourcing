/* utils.js */
import { CONFIG, DOM, MADE_IN_VALUES } from './constants.js';
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

export const generateMadeInCheckboxes = (container) => {
  MADE_IN_VALUES.forEach(country => {
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-container';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = country;
    checkbox.name = 'made-in';
    checkbox.value = country.toLowerCase();
    
    const label = document.createElement('label');
    label.setAttribute('for', country);
    label.textContent = country;
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    container.appendChild(checkboxContainer);
  });
};


// Fonction applyFilters modifiée pour inclure les filtres "Made In"
export const applyFilters = () => {
  DOM.noResults.classList.add('hidden');
  STATE.currentPage = 1;

  const selectedCheckboxes = Array.from(DOM.checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.id.toLowerCase());

  // Récupérer les filtres "Made In" sélectionnés
  const madeInFilters = Array.from(document.querySelectorAll('input[name="made-in"]:checked'))
    .map(cb => normalizeStr(cb.value.trim())); // toujours clean

  const categoryFilters = selectedCheckboxes.filter(id => !CONFIG.specialFilters.includes(id));

  const searchValue = normalizeStr(DOM.searchInput.value.trim());

  STATE.filteredData = STATE.exhibitorsOnly.filter(exhibitor => {
    const nameNorm = normalizeStr(exhibitor['Supplier Name']);
    const categoryNorm = normalizeStr(exhibitor['Main Product Category']);

    // Recherche étendue : nom d'exposant + Product Types
    let matchesSearch = !searchValue || nameNorm.includes(searchValue);
    
    if (!matchesSearch && searchValue) {
      const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData, 19);
      matchesSearch = products.some(product => {
        const productType = normalizeStr(product['Product type'] || '');
        return productType.includes(searchValue);
      });
    }

    const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(categoryNorm);

    // Récupérer les produits de ce fournisseur pour tous les filtres
    const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData, 19);

    // Vérifier les filtres "Made In"
    let matchesMadeIn = madeInFilters.length === 0;
    if (!matchesMadeIn) {
      matchesMadeIn = products.some(product => {
        const productMadeIn = normalizeStr((product['Made in'] || '').trim());
        // includes pour tolérer "Made in China", "China Mainland", etc.
        return madeInFilters.some(filter => productMadeIn.includes(filter));
      });
    }

    // Filtres spéciaux existants
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
      matchesCategory &&
      matchesMadeIn &&
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
  const hasSelectedFilters = selectedCheckboxes.length > 0 || madeInFilters.length > 0;
  
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