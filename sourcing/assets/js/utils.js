import { CONFIG, DOM, FILTER_CONFIG } from './constants.js';
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

export const generateAllFilters = (filtersContainer) => {
  filtersContainer.innerHTML = '';

  Object.entries(FILTER_CONFIG).forEach(([filterKey, config]) => {
    const availableFilters = getAvailableFiltersForType(filterKey, config);
    if (availableFilters.length > 0) {
      const fieldset = createFilterFieldset(filterKey, config, availableFilters);
      filtersContainer.appendChild(fieldset);
    }
  });
};

export const getAvailableFiltersForType = (filterKey, config) => {
  switch (config.type) {
    case 'direct':
      const availableCategories = new Set();
      STATE.exhibitorsOnly.forEach(exhibitor => {
        const value = exhibitor[config.fieldName];
        if (value && value.trim()) availableCategories.add(value.trim());
      });
      return config.possibleValues.filter(value => availableCategories.has(value));

    case 'computed':
      return config.filters.filter(filter => {
        return STATE.exhibitorsOnly.some(exhibitor => {
          const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData);
          return filter.check(products);
        });
      });

    case 'madeIn':
      return getAvailableMadeInCountries(config);

    default:
      return [];
  }
};

export const getAvailableMadeInCountries = (config) => {
  const availableCountries = new Set();
  STATE.exhibitorsOnly.forEach(exhibitor => {
    const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData);
    products.forEach(product => {
      const madeInValue = (product[config.fieldName] || '').trim();
      if (madeInValue) availableCountries.add(madeInValue);
    });
  });
  return Array.from(availableCountries).sort();
};

export const createFilterFieldset = (filterKey, config, availableFilters) => {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'filter-family_container';
  if (filterKey === 'madeIn') fieldset.id = 'made-in-fieldset';

  const activator = document.createElement('div');
  activator.className = 'filter-dropdown_activator';

  const legend = document.createElement('legend');
  legend.textContent = config.legend;

  const arrow = document.createElement('img');
  arrow.src = 'assets/img/chevron-down.svg';
  arrow.alt = '';

  activator.appendChild(legend);
  activator.appendChild(arrow);

  const checkboxesContainer = document.createElement('div');
  checkboxesContainer.className = 'checkboxes-container';

  let sortedFilters;
  if (config.type === 'computed') {
    sortedFilters = [...availableFilters].sort((a, b) => a.label.localeCompare(b.label, 'en'));
  } else {
    sortedFilters = [...availableFilters].sort((a, b) => a.localeCompare(b, 'en'));
  }

  if (config.type === 'direct' || config.type === 'madeIn') {
    sortedFilters.forEach(value => {
      const checkbox = createCheckbox(filterKey, value, value);
      checkboxesContainer.appendChild(checkbox);
    });
  } else if (config.type === 'computed') {
    sortedFilters.forEach(filter => {
      const checkbox = createCheckbox('sustainability', filter.id, filter.label);
      checkboxesContainer.appendChild(checkbox);
    });
  }

  fieldset.appendChild(activator);
  fieldset.appendChild(checkboxesContainer);

  activator.addEventListener('click', () => {
    const isOpen = checkboxesContainer.style.height !== '0px' && checkboxesContainer.style.height !== '';
    checkboxesContainer.style.height = isOpen ? '0px' : checkboxesContainer.scrollHeight + 'px';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-180deg)';
  });

  return fieldset;
};

export const createCheckbox = (filterType, id, label) => {
  const container = document.createElement('div');
  container.className = 'checkbox-container';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;

  switch (filterType) {
    case 'category':
      checkbox.name = 'category';
      checkbox.value = normalizeStr(id).replace(/\s+/g, '-');
      break;
    case 'sustainability':
      checkbox.name = 'sustainability';
      checkbox.value = id;
      break;
    case 'madeIn':
      checkbox.name = 'made-in';
      checkbox.value = id.toLowerCase();
      break;
  }

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  container.appendChild(checkbox);
  container.appendChild(labelEl);

  return container;
};


let isInitialLoad = true;

export const applyFilters = (userTriggered = false) => {
  // Collect filter data for GTM tracking BEFORE any other logic
  const categoryCheckboxes = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.id);
  const sustainabilityCheckboxes = Array.from(document.querySelectorAll('input[name="sustainability"]:checked')).map(cb => cb.id);
  const madeInFiltersForTracking = Array.from(document.querySelectorAll('input[name="made-in"]:checked')).map(cb => cb.value);
  const rawSearchValue = DOM.searchInput.value.trim();

  console.log('🧪 TEST:', {
  hasDataLayer: !!window.dataLayer,
  userTriggered,
  isInitialLoad,
  nbCategories: categoryCheckboxes.length,
  nbSustainability: sustainabilityCheckboxes.length,
  nbMadeIn: madeInFiltersForTracking.length,
  searchLength: rawSearchValue.length
});

  // Send filter data to GTM/GA (only if triggered by user, not initial load)
  if (window.dataLayer && userTriggered && !isInitialLoad && (categoryCheckboxes.length > 0 || sustainabilityCheckboxes.length > 0 || madeInFiltersForTracking.length > 0 || rawSearchValue.length >= 3)) {
    try {
      window.dataLayer.push({
        'event': 'apply_filters',
        'filter_categories': categoryCheckboxes,
        'filter_sustainability': sustainabilityCheckboxes,
        'filter_made_in': madeInFiltersForTracking,
        'search_term': rawSearchValue,
        'total_filters_applied': categoryCheckboxes.length + sustainabilityCheckboxes.length + madeInFiltersForTracking.length + (rawSearchValue ? 1 : 0)
      });
    } catch (e) {
      console.warn('GTM tracking failed:', e);
    }
  }

  isInitialLoad = false;

  DOM.noResults.classList.add('hidden');
  STATE.currentPage = 1;

  // For filtering logic, use normalized values
  const madeInFilters = Array.from(document.querySelectorAll('input[name="made-in"]:checked')).map(cb => normalizeStr(cb.value.trim()));

  const searchValue = normalizeStr(DOM.searchInput.value.trim());

  const hasValidSearch = rawSearchValue.length >= 3;
  const hasSelectedFilters = categoryCheckboxes.length > 0 || sustainabilityCheckboxes.length > 0 || madeInFilters.length > 0;

  // Set areFiltersApplied to true if there are active filters being applied
  STATE.areFiltersApplied = hasValidSearch || hasSelectedFilters;

  STATE.filteredData = STATE.exhibitorsOnly.filter(exhibitor => {
    const nameNorm = normalizeStr(exhibitor['Supplier Name']);
    const categoryNorm = normalizeStr(exhibitor['Main Product Category']);

    let matchesSearch = !searchValue || nameNorm.includes(searchValue);
    if (!matchesSearch && searchValue) {
      const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData);
      matchesSearch = products.some(product => normalizeStr(product['Product type'] || '').includes(searchValue));
    }

    const matchesCategory = categoryCheckboxes.length === 0 || categoryCheckboxes.includes(exhibitor['Main Product Category']);

    const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData);
    let matchesMadeIn = madeInFilters.length === 0;
    if (!matchesMadeIn) {
      matchesMadeIn = products.some(product => {
        const madeInList = (product['Made in'] || '').split(',').map(s => normalizeStr(s.trim()));
        return madeInFilters.some(filter => madeInList.some(mi => mi === filter));
      });
    }

    let matchesSustainability = sustainabilityCheckboxes.length === 0;
    if (!matchesSustainability) {
      const sustainabilityResults = {
        handmade: !sustainabilityCheckboxes.includes('handmade'),
        recycled: !sustainabilityCheckboxes.includes('recycled'),
        organic: !sustainabilityCheckboxes.includes('organic'),
        'limited-edition': !sustainabilityCheckboxes.includes('limited-edition'),
        'white-label': !sustainabilityCheckboxes.includes('white-label'),
      };

      for (const product of products) {
        if (Object.values(sustainabilityResults).every(Boolean)) break;

        const handmadeVal = (product['Handmade'] || '').toLowerCase().trim();
        const recOrgVal = (product['Recycled/Organic (if applicable)'] || '').toLowerCase().trim();
        const limitedEditionVal = (product['Is this product a limited edition?'] || '').toLowerCase().trim();
        const whiteLabelVal = (product['Is this product available as Private Label/White Label service?'] || '').toLowerCase().trim();

        if (!sustainabilityResults.handmade && handmadeVal === 'yes') sustainabilityResults.handmade = true;
        if (!sustainabilityResults.recycled && recOrgVal.includes('recycled')) sustainabilityResults.recycled = true;
        if (!sustainabilityResults.organic && recOrgVal.includes('organic')) sustainabilityResults.organic = true;
        if (!sustainabilityResults['limited-edition'] && limitedEditionVal === 'yes') sustainabilityResults['limited-edition'] = true;
        if (!sustainabilityResults['white-label'] && whiteLabelVal === 'yes') sustainabilityResults['white-label'] = true;
      }

      matchesSustainability = Object.values(sustainabilityResults).every(Boolean);
    }

    return matchesSearch && matchesCategory && matchesMadeIn && matchesSustainability;
  });

  if (STATE.filteredData.length === 0) DOM.noResults.classList.remove('hidden');

  const exportButton = document.getElementById('export-pdf_button');
  if (exportButton) {
    exportButton.disabled = !(hasValidSearch || hasSelectedFilters) || STATE.filteredData.length === 0;
  }

  // Update reset button state after filters are applied
  updateResetButton();

  updatePagination();
};


export const updatePagination = () => {
  const start = (STATE.currentPage - 1) * CONFIG.itemsPerPage;
  const end = start + CONFIG.itemsPerPage;
  const pageData = STATE.filteredData.slice(start, end);
  renderExhibitorsList(pageData);
  renderPagination(STATE.filteredData.length, STATE.currentPage);
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 30);
};

export const updateApplyButton = () => {
  const hasSelectedFilters = Array.from(DOM.checkboxes).some(cb => cb.checked);
  DOM.applyFiltersButton.disabled = !hasSelectedFilters;
};

export const updateResetButton = () => {
  DOM.resetFiltersButton.disabled = !STATE.areFiltersApplied;
};

export const resetAllFilters = () => {
  // Reset search input
  DOM.searchInput.value = '';

  // Uncheck all checkboxes
  const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
  allCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });

  // Reset state
  STATE.filteredData = [...STATE.exhibitorsOnly];
  STATE.currentPage = 1;
  STATE.areFiltersApplied = false;

  // Update UI
  updateApplyButton();
  updateResetButton();

  // Re-render with all data
  DOM.noResults.classList.add('hidden');
  updatePagination();

  // Update export button
  const exportButton = document.getElementById('export-pdf_button');
  if (exportButton) {
    exportButton.disabled = true;
  }
};

export const getProductsForSupplier = (supplierName, allData) => {
  const supplierNorm = normalizeStr(supplierName);
  return allData.filter(item => normalizeStr(item['Supplier Name']) === supplierNorm).filter(item => item);
};
