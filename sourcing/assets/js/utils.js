/* utils.js */
import { CONFIG, DOM, MADE_IN_VALUES } from './constants.js';
import { STATE } from './state.js';
import { renderExhibitorsList, renderPagination } from './views.js';

// Configuration des filtres - à ajouter aussi dans constants.js si préféré
export const FILTER_CONFIG = {
  category: {
    legend: 'Category',
    fieldName: 'Main Product Category',
    type: 'direct', // valeur directe du champ
    possibleValues: [
      'Suppliers / Service providers',
      'Textile accessories',
      'Sourcing / Manufacturing',
      'Accessoires lingerie',
      'Ready-to-wear',
      'Other accessories',
      'Bags / Leather goods',
      'Jewellery'
    ]
  },
  sustainability: {
    legend: 'Sustainability',
    type: 'computed', // valeurs calculées depuis plusieurs champs
    filters: [
      {
        id: 'recycled',
        label: 'Recycled Products',
        check: (products) => products.some(p => 
          (p['Recycled/Organic (if applicable)'] || '').toLowerCase().includes('recycled')
        )
      },
      {
        id: 'handmade',
        label: 'Handmade Products',
        check: (products) => products.some(p => 
          (p['Handmade'] || '').toLowerCase() === 'yes'
        )
      },
      {
        id: 'organic',
        label: 'Organic Products',
        check: (products) => products.some(p => 
          (p['Recycled/Organic (if applicable)'] || '').toLowerCase().includes('organic')
        )
      },
      {
        id: 'limited-edition',
        label: 'Limited Edition',
        check: (products) => products.some(p => 
          (p['Is this product a limited edition?'] || '').toLowerCase() === 'yes'
        )
      },
      {
        id: 'white-label',
        label: 'White Label',
        check: (products) => products.some(p => 
          (p['Is this product available as Private Label/White Label service?'] || '').toLowerCase() === 'yes'
        )
      }
    ]
  },
  madeIn: {
    legend: 'Made In',
    fieldName: 'Made in',
    type: 'madeIn', // type spécial pour Made In
    possibleValues: MADE_IN_VALUES
  }
};

export const normalizeStr = (str) => str ? str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

export const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export const getUrlParam = (param) => new URLSearchParams(window.location.search).get(param);

// Nouvelle fonction pour générer tous les filtres dynamiquement
export const generateAllFilters = (filtersContainer) => {
  // Vider le container
  filtersContainer.innerHTML = '';
  
  Object.entries(FILTER_CONFIG).forEach(([filterKey, config]) => {
    const availableFilters = getAvailableFiltersForType(filterKey, config);
    
    // Ne créer le fieldset que s'il y a des filtres disponibles
    if (availableFilters.length > 0) {
      const fieldset = createFilterFieldset(filterKey, config, availableFilters);
      filtersContainer.appendChild(fieldset);
    }
  });

};

export const getAvailableFiltersForType = (filterKey, config) => {
  switch (config.type) {
    case 'direct':
      // Pour les filtres directs (comme Category)
      const availableCategories = new Set();
      STATE.exhibitorsOnly.forEach(exhibitor => {
        const value = exhibitor[config.fieldName];
        if (value && value.trim()) {
          availableCategories.add(value.trim());
        }
      });
      
      return config.possibleValues.filter(value => 
        availableCategories.has(value)
      );
      
    case 'computed':
      // Pour les filtres calculés (comme Sustainability)
      return config.filters.filter(filter => {
        return STATE.exhibitorsOnly.some(exhibitor => {
          const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData, 19);
          return filter.check(products);
        });
      });
      
    case 'madeIn':
      // Pour Made In
      return getAvailableMadeInCountries(config);
      
    default:
      return [];
  }
};

export const getAvailableMadeInCountries = (config) => {
  const availableCountries = new Set();
  
  STATE.exhibitorsOnly.forEach(exhibitor => {
    const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData, 19);
    
    products.forEach(product => {
      const madeInValue = (product[config.fieldName] || '').trim();
      if (madeInValue) {
        const normalizedMadeIn = normalizeStr(madeInValue);
        
        config.possibleValues.forEach(country => {
          const normalizedCountry = normalizeStr(country);
          if (normalizedMadeIn.includes(normalizedCountry)) {
            availableCountries.add(country);
          }
        });
      }
    });
  });
  
  return Array.from(availableCountries);
};

export const createFilterFieldset = (filterKey, config, availableFilters) => {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'filter-family_container';
  if (filterKey === 'madeIn') fieldset.id = 'made-in-fieldset';
  
  // Créer le header du dropdown
  const activator = document.createElement('div');
  activator.className = 'filter-dropdown_activator';
  
  const legend = document.createElement('legend');
  legend.textContent = config.legend;
  
  const arrow = document.createElement('img');
  arrow.src = 'assets/img/chevron-down.svg';
  arrow.alt = '';
  
  activator.appendChild(legend);
  activator.appendChild(arrow);
  
  // Créer le container des checkboxes
  const checkboxesContainer = document.createElement('div');
  checkboxesContainer.className = 'checkboxes-container';

  // 🔑 Tri des filtres avant affichage
  let sortedFilters;
  if (config.type === 'computed') {
    sortedFilters = [...availableFilters].sort((a, b) =>
      a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
    );
  } else {
    sortedFilters = [...availableFilters].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
  }

  // Générer les checkboxes selon le type
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
  
  // Ajouter la fonctionnalité dropdown
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
  
  // Adapter le name selon le type de filtre
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
  
  // Ajouter l'event listener
  checkbox.addEventListener('change', applyFilters);
  
  container.appendChild(checkbox);
  container.appendChild(labelEl);
  
  return container;
};

// Ancienne fonction generateMadeInCheckboxes - maintenant obsolète mais gardée pour compatibilité temporaire
export const generateMadeInCheckboxes = (container) => {
  console.warn('generateMadeInCheckboxes est obsolète, utilisez generateAllFilters à la place');
  // Récupérer tous les pays "Made in" qui ont des résultats dans les données
  const availableCountries = getAvailableMadeInCountries(FILTER_CONFIG.madeIn);
  
  availableCountries.forEach(country => {
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

// Fonction applyFilters modifiée pour fonctionner avec le nouveau système
export const applyFilters = () => {
  DOM.noResults.classList.add('hidden');
  STATE.currentPage = 1;

  // Récupérer tous les checkboxes cochées de tous les types
  const categoryCheckboxes = Array.from(document.querySelectorAll('input[name="category"]:checked'))
    .map(cb => cb.id);
  
  const sustainabilityCheckboxes = Array.from(document.querySelectorAll('input[name="sustainability"]:checked'))
    .map(cb => cb.id);

  const madeInFilters = Array.from(document.querySelectorAll('input[name="made-in"]:checked'))
    .map(cb => normalizeStr(cb.value.trim()));

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

    // Vérifier les filtres de catégorie
    const matchesCategory = categoryCheckboxes.length === 0 || categoryCheckboxes.includes(exhibitor['Main Product Category']);

    // Récupérer les produits de ce fournisseur pour tous les filtres
    const products = getProductsForSupplier(exhibitor['Supplier Name'], STATE.allData, 19);

    // Vérifier les filtres "Made In"
    let matchesMadeIn = madeInFilters.length === 0;
    if (!matchesMadeIn) {
      matchesMadeIn = products.some(product => {
        const productMadeIn = normalizeStr((product['Made in'] || '').trim());
        return madeInFilters.some(filter => productMadeIn.includes(filter));
      });
    }

    // Vérifier les filtres de durabilité
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

    return matchesSearch &&
      matchesCategory &&
      matchesMadeIn &&
      matchesSustainability;
  });

  if (STATE.filteredData.length === 0) {
    DOM.noResults.classList.remove('hidden');
  }

  // Activer le bouton PDF si au moins une checkbox est cochée OU si au moins 3 caractères sont tapés dans la search
  const rawSearchValue = DOM.searchInput.value.trim();
  const hasValidSearch = rawSearchValue.length >= 3;
  const hasSelectedFilters = categoryCheckboxes.length > 0 || sustainabilityCheckboxes.length > 0 || madeInFilters.length > 0;
  
  const exportButton = document.getElementById('export-pdf_button');
  if (exportButton) {
    exportButton.disabled = !(hasValidSearch || hasSelectedFilters) || STATE.filteredData.length === 0;
  }
  
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
  }, 30);
};

export const getProductsForSupplier = (supplierName, allData, maxItems = 20) => {
  const supplierNorm = normalizeStr(supplierName);
  const startIndex = allData.findIndex(item =>
    normalizeStr(item['Supplier Name']) === supplierNorm
  );
  if (startIndex === -1) return [];
  return allData.slice(startIndex, startIndex + maxItems);
};