import { DOM, CONFIG } from './constants.js';
import { STATE } from './state.js';
import { normalizeStr, getUrlParam, updatePagination } from './utils.js';
import { getProductsForSupplier } from './utils.js';

export const createExhibitorCard = (item) => {
  const container = document.createElement('div');
  container.className = 'card';
  container.href = `?supplier-name=${encodeURIComponent(item['Supplier Name'])}`;

  const contentContainer = document.createElement('div');
  contentContainer.classList.add('card_content-container');

  const title = document.createElement('p');
  title.className = 'card-title';
  title.textContent = item['Supplier Name'].toUpperCase();

  const country = document.createElement('p');
  country.classList.add('card-country');
  country.textContent = item['Supplier Country'];

  const focus = document.createElement('p');
  focus.textContent = item['Focus'];

  const seeMore = document.createElement('a');
  seeMore.classList.add('card-see-more');

  const plusIcon = document.createElement('img');
  plusIcon.setAttribute("src", "assets/img/chevron-right.svg");

  seeMore.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState({}, '', container.href);
    renderMicroView();
  });

  contentContainer.append(title, country, focus);
  seeMore.append(plusIcon);

  container.append(contentContainer, seeMore);
  return container;
};

export const renderExhibitorsList = (data) => {
  const container = DOM.exhibitorsList;

  const oldCards = Array.from(container.children);
  oldCards.forEach(card => {
    card.classList.add('hidden-out');
  });

  setTimeout(() => {
    container.innerHTML = '';

    const fragment = document.createDocumentFragment();

    data.forEach(item => {
      const card = createExhibitorCard(item);
      card.classList.add('hidden-initial');
      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newCards = Array.from(container.children);
        newCards.forEach(card => card.classList.remove('hidden-initial'));
      });
    });

  }, 300);
};

export const renderPagination = (totalItems, currentPage) => {
  DOM.paginationButtonsWrapper.innerHTML = '';
  const totalPages = Math.ceil(totalItems / CONFIG.itemsPerPage);

  if (totalPages <= 1) return;

  const createButton = (text, disabled, onClick, active = false, className = 'secondary-button') => {
    const btn = document.createElement('button');
    btn.textContent = text;
    if (disabled) btn.disabled = true;
    if (active) btn.classList.add('active');
    if (className) btn.classList.add(className);
    btn.addEventListener('click', onClick);
    return btn;
  };

  DOM.paginationButtonsWrapper.appendChild(
    createButton('Back', currentPage === 1, () => {
      if (currentPage > 1) {
        STATE.currentPage--;
        updatePagination();
      }
    })
  );

  const numberButtonsContainer = document.createElement('div');
  numberButtonsContainer.className = 'number-buttons';

  const maxVisiblePages = window.matchMedia("(width <= 500px)").matches === false ? 5 : 3;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    numberButtonsContainer.appendChild(createButton('1', false, () => {
      STATE.currentPage = 1;
      updatePagination();
    }));
    if (startPage > 2) {
      numberButtonsContainer.appendChild(createButton('...', true, () => {}));
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    numberButtonsContainer.appendChild(
      createButton(i, false, () => {
        STATE.currentPage = i;
        updatePagination();
      }, i === currentPage)
    );
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      numberButtonsContainer.appendChild(createButton('...', true, () => {}));
    }
    numberButtonsContainer.appendChild(createButton(totalPages, false, () => {
      STATE.currentPage = totalPages;
      updatePagination();
    }));
  }

  DOM.paginationButtonsWrapper.appendChild(numberButtonsContainer);

  DOM.paginationButtonsWrapper.appendChild(
    createButton('Next', currentPage === totalPages, () => {
      if (currentPage < totalPages) {
        STATE.currentPage++;
        updatePagination();
      }
    })
  );
};

export const renderMicroView = () => {
  const supplierParam = getUrlParam('supplier-name');
  if (!supplierParam) {
    hideMicroView();
    return;
  }

  const supplierNameDecoded = decodeURIComponent(supplierParam);
  const supplierNorm = normalizeStr(supplierNameDecoded);

  const supplierData = STATE.exhibitorsOnly.find(
    ex => normalizeStr(ex['Supplier Name']) === supplierNorm
  );
  if (!supplierData) {
    hideMicroView();
    return;
  }

  STATE.currentSupplier = supplierData;

  DOM.listContainer.classList.add('hidden');

  const microview = DOM.microviewContainer;

  microview.classList.remove('hidden');

  DOM.microviewContactButton.classList.add('hidden');
  DOM.microviewTitle.textContent = supplierData['Supplier Name'];
  DOM.microviewCountry.textContent = supplierData['Supplier Country'];
  DOM.microviewFocus.textContent = supplierData['Focus'];

  const products = getProductsForSupplier(supplierData['Supplier Name'], STATE.allData);

  renderCertifications(supplierData, products);

  renderMicroviewProductDetails(products);

  if (supplierData['Email']) {
    DOM.microviewContactButton.classList.remove('hidden');
  }

  DOM.microviewContactButton.onclick = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${supplierData['Email']}`;
  };

  DOM.goBackButton.onclick = () => {
    const cameFromInternalNav = document.referrer && document.referrer.includes(window.location.hostname);

    if (cameFromInternalNav) {
      DOM.listContainer.classList.remove('hidden');
      DOM.microviewContainer.classList.add('hidden');
      window.history.pushState({}, '', window.location.pathname);
    } else {
      window.location.href = window.location.origin + window.location.pathname;
    }
  };
};

export const hideMicroView = () => {
  DOM.listContainer.classList.remove('hidden');
  DOM.microviewContainer.classList.add('hidden');
  STATE.currentSupplier = null;
};

const renderCertifications = (supplierData, products) => {
  DOM.certificationsList.innerHTML = '';
  const addedCertifications = new Set();

  let hasHandmade = false;
  let hasRecycled = false;
  let hasOrganic = false;
  let hasWhiteLabel = false;
  let hasLimitedEdition = false;

  const companyCertKey = Object.keys(supplierData).find(
    key => key.toLowerCase().includes('company certifications')
  );

  if (companyCertKey && supplierData[companyCertKey]) {
    supplierData[companyCertKey].split(',').forEach(cert => {
      const trimmedCert = cert.trim();
      if (trimmedCert) {
        addedCertifications.add(`company|${trimmedCert}`);
      }
    });
  }

  products.forEach(prod => {
    const certVal = prod['Raw Material Certfications (if applicable)'];
    if (certVal) {
      certVal.split(',').forEach(rawCert => {
        const trimmed = rawCert.trim();
        if (trimmed) {
          addedCertifications.add(`raw|${trimmed}`);
        }
      });
    }

    if (prod['Handmade']?.toLowerCase() === 'yes') hasHandmade = true;

    const ecoVal = prod['Recycled/Organic (if applicable)']?.toLowerCase();
    if (ecoVal) {
      if (ecoVal.includes('recycled')) hasRecycled = true;
      if (ecoVal.includes('organic')) hasOrganic = true;
    }

    if (prod["Is this product available as Private Label/White Label service?"]?.toLowerCase() === 'yes') {
      hasWhiteLabel = true;
    }

    if (prod["Is this product a limited edition?"]?.toLowerCase() === 'yes') {
      hasLimitedEdition = true;
    }
  });

  if (hasHandmade) addedCertifications.add('handmade|Handmade');
  if (hasRecycled) addedCertifications.add('recycled|Recycled');
  if (hasOrganic) addedCertifications.add('organic|Organic');
  if (hasWhiteLabel) addedCertifications.add('white|White Label');
  if (hasLimitedEdition) addedCertifications.add('limited|Limited Edition');

  addedCertifications.forEach(entry => {
    const [type, text] = entry.split('|');
    DOM.certificationsList.appendChild(createCertificationItem(text, type));
  });
};

const createCertificationItem = (text, type) => {
  const li = document.createElement('li');
  li.textContent = text;

  if (type) {
    li.classList.add(type);
  }

  return li;
};

const renderMicroviewProductDetails = (products) => {
  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const transformValue = (val) => {
    return val
      .toLowerCase()
      .split(' ')
      .map(capitalize)
      .join(' ');
  };

  const updateField = (id, fieldName) => {
    const values = [
      ...new Set(
        products
          .map(p => p[fieldName])
          .filter(Boolean)
          .flatMap(v => v.split(',').map(s => s.trim()).filter(Boolean))
          .map(transformValue)
      )
    ];

    const el = document.getElementById(id);
    const parent = el?.parentElement;
    if (!el || !parent) return;

    if (!values.length) {
      parent.style.display = 'none';
    } else {
      el.textContent = values.join(' - ');
      parent.style.display = '';
    }
  };

  updateField('microview-type', 'Product type');
  updateField('microview-material', 'Product Material - Main Composition');
  updateField('microview-material-secondary', 'Product Material - Secondary Composition (if applicable)');
  updateField('microview-specification', 'Product specifications (if applicable)');
  updateField('microview-finishing', 'Product Finishing (if applicable)');
  updateField('microview-volumes', 'Production volumes');
};


DOM.filterDropdownActivator.forEach(activator => {
  const container = activator.nextElementSibling;
  const arrow = activator.children[1];
  activator.addEventListener('click', () => {
    const isOpen = container.style.height !== '0px' && container.style.height !== '';
    container.style.height = isOpen ? '0px' : container.scrollHeight + 'px';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-180deg)';
  });
});
