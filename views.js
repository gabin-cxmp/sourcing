import { DOM, CONFIG } from './constants.js';
import { STATE } from './state.js';
import { normalizeStr, getUrlParam, updatePagination } from './utils.js';

export const createExhibitorCard = (item) => {
  const container = document.createElement('a');
  container.className = 'card';
  container.href = `?supplier-name=${encodeURIComponent(item['Supplier Name'])}`;
  
  container.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState({}, '', container.href);
    renderMicroView();
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
};

export const renderExhibitorsList = (data) => {
  DOM.exhibitorsList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  data.forEach(item => fragment.appendChild(createExhibitorCard(item)));
  DOM.exhibitorsList.appendChild(fragment);
};

export const renderPagination = (totalItems, currentPage) => {
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
        updatePagination();
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
      updatePagination();
    }));
    if (startPage > 2) {
      DOM.paginationButtonsWrapper.appendChild(createButton('...', true, () => {}));
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    DOM.paginationButtonsWrapper.appendChild(
      createButton(i, false, () => {
        STATE.currentPage = i;
        updatePagination();
      }, i === currentPage)
    );
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      DOM.paginationButtonsWrapper.appendChild(createButton('...', true, () => {}));
    }
    DOM.paginationButtonsWrapper.appendChild(createButton(totalPages, false, () => {
      STATE.currentPage = totalPages;
      updatePagination();
    }));
  }
  
  // Next Button
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
  DOM.microviewContainer.classList.remove('hidden');

  DOM.microviewTitle.textContent = supplierData['Supplier Name'];
  DOM.microviewCountry.textContent = "Country: " + supplierData['Supplier Country'];
  DOM.microviewFocus.textContent = "Focus: " + supplierData['Focus'];

  renderCertifications(supplierData, supplierNorm);

  DOM.microviewContactButton.onclick = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${supplierData['Contact Email']}`;
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

const renderCertifications = (supplierData, supplierNorm) => {
  DOM.certificationsList.innerHTML = '';
  const startIndex = STATE.allData.findIndex(item =>
    normalizeStr(item['Supplier Name']) === supplierNorm
  );
  const products = STATE.allData.slice(startIndex, startIndex + CONFIG.itemsPerPage);

  const addedCertifications = new Set();
  let hasHandmade = false;
  let hasRecycled = false;
  let hasOrganic = false;

  // Company Certifications
  const companyCertKey = Object.keys(supplierData).find(
    key => key.toLowerCase().includes('company certifications')
  );

  if (companyCertKey && supplierData[companyCertKey]) {
    supplierData[companyCertKey].split(',').forEach(cert => {
      const trimmedCert = cert.trim();
      if (trimmedCert) addedCertifications.add(trimmedCert);
    });
  }

  // Product-level certifications
  products.forEach(prod => {
    const certVal = prod['Raw Material Certfications (if applicable)'];
    if (certVal) {
      DOM.certificationsList.appendChild(createCertificationItem(certVal));
    }

    if (prod['Handmade']?.toLowerCase() === 'yes') hasHandmade = true;
    
    const ecoVal = prod['Recycled/Organic (if applicable)']?.toLowerCase();
    if (ecoVal) {
      if (ecoVal.includes('recycled')) hasRecycled = true;
      if (ecoVal.includes('organic')) hasOrganic = true;
    }
  });

  // Add virtual certifications
  if (hasHandmade) addedCertifications.add('Handmade');
  if (hasRecycled) addedCertifications.add('Recycled');
  if (hasOrganic) addedCertifications.add('Organic');

  addedCertifications.forEach(certText => {
    DOM.certificationsList.appendChild(createCertificationItem(certText));
  });
};

const createCertificationItem = (text) => {
  const cert = document.createElement('li');
  cert.textContent = text;
  return cert;
};