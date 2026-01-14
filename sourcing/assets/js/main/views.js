/* view.js */
import { DOM, CONFIG } from './constants.js';
import { STATE } from './state.js';
import { normalizeStr, getUrlParam, updatePagination } from './utils.js';
import { generateAllFilters, getProductsForSupplier } from './utils.js';

// Fonction d'initialisation à ajouter dans views.js
export const initializeAllFilters = () => {
  const filtersContainer = document.getElementById('dynamic-filters-container');
  
  if (filtersContainer) {
    // Générer tous les filtres dynamiquement
    generateAllFilters(filtersContainer);
    
    updateDOMReferences();
  }
};

const updateDOMReferences = () => {
  DOM.checkboxes = document.querySelectorAll('input[name="category"]');
};

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

  const focusAndCategory = document.createElement('div');
  focusAndCategory.classList.add('focus-and-category');

  const focus = document.createElement('p');
  focus.textContent = item['Focus'];

  const category = document.createElement('p');
  category.textContent = item['Main Product Category'];

  const span = document.createElement('span');
  span.textContent = focus.textContent != '' && category.textContent != '' ? '>' : '';

  focusAndCategory.append(focus, span, category)

  const seeMore = document.createElement('a');
  seeMore.classList.add('card-see-more');

  const plusIcon = document.createElement('img');
  plusIcon.setAttribute("src", "assets/img/chevron-right.svg");

  seeMore.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState({}, '', container.href);
    renderMicroView();
  });

  contentContainer.append(title, country, focusAndCategory);
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

  window.scrollTo({ top: 0});

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
  DOM.microviewStand.textContent = supplierData['Stand Number'];
  if(DOM.microviewStand.textContent == ''){
    DOM.microviewStand.parentElement.style.display = "none";
  }
  DOM.microviewCountry.textContent = supplierData['Supplier Country'];
  DOM.microviewFocus.textContent = supplierData['Focus'];
  DOM.microviewCategory.textContent = supplierData['Main Product Category'];
  DOM.microviewSpan.textContent = DOM.microviewFocus.textContent != '' && DOM.microviewCategory.textContent != '' ?  '>' : '';

  const products = getProductsForSupplier(supplierData['Supplier Name'], STATE.allData);

  renderCertifications(supplierData, products);

  renderMicroviewProductDetails(products);

  renderPlanView(supplierData);

  if (supplierData['Email']) {
   // DOM.microviewContactButton.classList.remove('hidden');
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
        if (trimmed && trimmed!== "None") {
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

const renderPlanView = (supplierData) => {
  const standNumber = supplierData['Stand Number'];
  
  // Reset all plan containers - hide them all first
  if (DOM.groundFloorPlanContainer) DOM.groundFloorPlanContainer.style.display = 'none';
  if (DOM.firstFloorPlanContainer) DOM.firstFloorPlanContainer.style.display = 'none';
  if (DOM.secondFloorPlanContainer) DOM.secondFloorPlanContainer.style.display = 'none';
  
  // Reset opacity on all Plan groups
  [DOM.groundFloorPlanContainer, DOM.firstFloorPlanContainer, DOM.secondFloorPlanContainer].forEach(container => {
    if (container) {
      const svg = container.querySelector('svg');
      if (svg) {
        const planGroup = svg.querySelector('g#Plan');
        if (planGroup) {
          Array.from(planGroup.children).forEach(child => {
            child.style.opacity = '1';
            child.style.filter = '';
          });
        }
      }
    }
  });
  
  // If no stand number, don't show any plan
  if (!standNumber || standNumber.trim() === '') {
    return;
  }
  
  // Determine floor based on stand number prefix
  const standStr = standNumber.trim();
  let floorPrefix = null;
  let targetContainer = null;
  let svgElement = null;
  
  if (standStr.startsWith('7.1')) {
    floorPrefix = '7.1';
    targetContainer = DOM.groundFloorPlanContainer;
  } else if (standStr.startsWith('7.2')) {
    floorPrefix = '7.2';
    targetContainer = DOM.firstFloorPlanContainer;
  } else if (standStr.startsWith('7.3')) {
    floorPrefix = '7.3';
    targetContainer = DOM.secondFloorPlanContainer;
  } else {
    // If stand doesn't start with 7.1, 7.2 or 7.3, show first floor plan
    floorPrefix = '7.2';
    targetContainer = DOM.firstFloorPlanContainer;
  }
  
  // Show the target container
  targetContainer.style.display = 'block';

  // Get the plan container (zoom wrapper)
  const planContainer = targetContainer.querySelector('.plan-container');
  svgElement = targetContainer.querySelector('svg');
  if (!svgElement || !planContainer) {
    return;
  }

  // Initialize zoom and pan functionality
  initializeSvgZoomAndPan(svgElement, planContainer);
  
  // Extract the stand identifier(s)
  let standIdentifier;
  if (standStr.startsWith('7.1') || standStr.startsWith('7.2') || standStr.startsWith('7.3')) {
    // For standard stands, extract identifier after floor prefix
    standIdentifier = standStr.replace(/^7\.\d[\s\-]*/i, '').trim();
  } else {
    // For non-standard stands, use the full stand name as identifier
    standIdentifier = standStr;
  }

  if (!standIdentifier) {
    return;
  }

  // Split by slash to handle multiple stands
  const standParts = standIdentifier.split('/').map(part => part.trim()).filter(part => part);

  // Find all groups that match any of the stand identifiers
  const allGroups = svgElement.querySelectorAll('g[id]');
  const targetGroups = [];

  for (const standPart of standParts) {
    for (const group of allGroups) {
      const groupId = group.getAttribute('id');
      if (!groupId || groupId === 'Plan' || groupId === floorPrefix || groupId === 'Legende') {
        continue;
      }

      // Check if the group ID contains the stand identifier
      // Group IDs are space-separated like "F18 G17 F14 F12 G11"
      const standIds = groupId.split(/\s+/);
      if (standIds.includes(standPart)) {
        targetGroups.push(group);
        break; // Found a match for this stand part
      }

      // For non-standard stands, also check if group ID exactly matches the stand identifier
      if (groupId === standPart) {
        targetGroups.push(group);
        break;
      }
    }
  }

  // If no target groups found, return
  if (targetGroups.length === 0) {
    console.log('No target groups found for stand parts:', standParts);
    return;
  }


  // If we found target groups, highlight them and dim the rest of the Plan group
  if (targetGroups.length > 0) {
    console.log('Highlighting target groups for:', supplierData['Supplier Name']);
    const planGroup = svgElement.querySelector('g#Plan');
    if (planGroup) {
      // Get bounding boxes of all target groups
      const targetBoxes = [];
      targetGroups.forEach(targetGroup => {
        try {
          const box = targetGroup.getBBox();
          if (box) targetBoxes.push(box);
        } catch (e) {
          console.warn('Could not get bounding box for target group', e);
        }
      });

      if (targetBoxes.length > 0) {
        // Get all direct children of the Plan group
        const planChildren = Array.from(planGroup.children);

        planChildren.forEach(child => {
          // Skip if this is the borders group
          if (child.getAttribute && child.getAttribute('id') === 'borders') {
            return;
          }

          let childBox = null;
          try {
            childBox = child.getBBox ? child.getBBox() : null;

            if (childBox) {
              // Check if the child element overlaps with any of the target groups
              let isInAnyGroup = false;
              for (const targetBox of targetBoxes) {
                const overlapX = Math.max(0, Math.min(childBox.x + childBox.width, targetBox.x + targetBox.width) - Math.max(childBox.x, targetBox.x));
                const overlapY = Math.max(0, Math.min(childBox.y + childBox.height, targetBox.y + targetBox.height) - Math.max(childBox.y, targetBox.y));
                const overlapArea = overlapX * overlapY;
                const childArea = childBox.width * childBox.height;

                // Only keep opacity 1 if there's significant overlap (at least 50% of the child element is within the target)
                if (overlapArea > 0 && childArea > 0 && (overlapArea / childArea) > 0.5) {
                  isInAnyGroup = true;
                  break;
                }
              }

              child.style.opacity = isInAnyGroup ? '1' : '0.2';
            } else {
              // If we can't get bounding box, dim it
              child.style.opacity = '0.2';
            }
          } catch (e) {
            // If there's an error, dim the element
            child.style.opacity = '0.2';
          }
        });
      } else {
        // If we can't get target boxes, dim all plan elements
        const planChildren = Array.from(planGroup.children);
        planChildren.forEach(child => {
          child.style.opacity = '0.2';
        });
      }
    }

    // Add drop shadow to all target groups to make them stand out
    targetGroups.forEach(targetGroup => {
      targetGroup.style.filter = 'drop-shadow(0px 2px 6px rgba(0,0,0,0.25))';
    });
  }
}

const initializeSvgZoomAndPan = (svgElement, container) => {
  if (container.dataset.zoomInitialized === 'true') {
    return;
  }
  container.dataset.zoomInitialized = 'true';
  
  // Configuration initiale du SVG pour un rendu optimal
  svgElement.style.transition = 'none';
  svgElement.style.transformOrigin = 'top left';
  
  // Obtenir les dimensions originales du viewBox
  const viewBox = svgElement.viewBox.baseVal;
  const originalWidth = viewBox.width;
  const originalHeight = viewBox.height;
  
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  
  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const ZOOM_SPEED = 0.1;
  
  const resetTransform = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  };
  
  const updateTransform = () => {
    // Utiliser viewBox au lieu de transform scale pour éviter la pixelisation
    const newWidth = originalWidth / scale;
    const newHeight = originalHeight / scale;
    
    // Calculer les coordonnées viewBox en fonction de la position
    const viewBoxX = -translateX * (originalWidth / (container.getBoundingClientRect().width * scale));
    const viewBoxY = -translateY * (originalHeight / (container.getBoundingClientRect().height * scale));
    
    svgElement.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${newWidth} ${newHeight}`);
  };
  
  const constrainTranslation = () => {
    const containerRect = container.getBoundingClientRect();
    
    // Calculer les limites en fonction du viewBox actuel
    const svgDisplayWidth = containerRect.width;
    const svgDisplayHeight = containerRect.height;
    
    // Limites de translation
    const maxTranslateX = 0;
    const minTranslateX = svgDisplayWidth - (svgDisplayWidth * scale);
    const maxTranslateY = 0;
    const minTranslateY = svgDisplayHeight - (svgDisplayHeight * scale);

    const tolerance = 50;
    
    translateX = Math.min(maxTranslateX + tolerance, Math.max(minTranslateX - tolerance, translateX));
    translateY = Math.min(maxTranslateY + tolerance, Math.max(minTranslateY - tolerance, translateY));
  };
  
  updateTransform();
  
  // Wheel zoom
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = -Math.sign(e.deltaY);
    const zoomFactor = 1 + (delta * ZOOM_SPEED);
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor));
    
    if (newScale !== scale) {
      const svgPointX = (mouseX - translateX) / scale;
      const svgPointY = (mouseY - translateY) / scale;
      
      scale = newScale;
      translateX = mouseX - svgPointX * scale;
      translateY = mouseY - svgPointY * scale;

      constrainTranslation();
      updateTransform();
    }
  }, { passive: false });
  
  // Mouse drag
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      translateX = startTranslateX + (e.clientX - startX);
      translateY = startTranslateY + (e.clientY - startY);
      updateTransform();
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = 'grab';
      constrainTranslation();
      updateTransform();
    }
  };
  
  container.addEventListener('mousedown', handleMouseDown);
  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseup', handleMouseUp);
  container.addEventListener('mouseleave', handleMouseUp);
  
  // Double click to reset
  container.addEventListener('dblclick', (e) => {
    e.preventDefault();
    resetTransform();
  });
  
  // Touch support
  let touchStartDistance = 0;
  let touchStartScale = 1;
  let touchStartTranslateX = 0;
  let touchStartTranslateY = 0;
  let touchStartCenterX = 0;
  let touchStartCenterY = 0;
  let lastTapTime = 0;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTapTime;

      if (timeDiff < 300 && timeDiff > 0) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        if (scale > MIN_SCALE) {
          resetTransform();
        } else {
          const newScale = 2;
          const svgPointX = (touchX - translateX) / scale;
          const svgPointY = (touchY - translateY) / scale;

          scale = newScale;
          translateX = touchX - svgPointX * scale;
          translateY = touchY - svgPointY * scale;

          constrainTranslation();
          updateTransform();
        }
        lastTapTime = 0;
        return;
      }
      lastTapTime = currentTime;

      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      isDragging = false;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      touchStartDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      touchStartScale = scale;
      touchStartTranslateX = translateX;
      touchStartTranslateY = translateY;
      touchStartCenterX = (touch1.clientX + touch2.clientX) / 2;
      touchStartCenterY = (touch1.clientY + touch2.clientY) / 2;
    }
  }, { passive: false });
  
  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      translateX = startTranslateX + (e.touches[0].clientX - startX);
      translateY = startTranslateY + (e.touches[0].clientY - startY);
      updateTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, touchStartScale * (distance / touchStartDistance)));
      
      const rect = container.getBoundingClientRect();
      const centerX = touchStartCenterX - rect.left;
      const centerY = touchStartCenterY - rect.top;
      
      const svgPointX = (centerX - touchStartTranslateX) / touchStartScale;
      const svgPointY = (centerY - touchStartTranslateY) / touchStartScale;
      
      scale = newScale;
      translateX = centerX - svgPointX * scale;
      translateY = centerY - svgPointY * scale;

      updateTransform();
    }
  }, { passive: false });
  
  const handleTouchEnd = () => {
    if (isDragging) {
      isDragging = false;
      constrainTranslation();
      updateTransform();
    } else {
      constrainTranslation();
      updateTransform();
    }
  };
  
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  
  // Boutons de contrôle
  createZoomControls(container, {
    zoomIn: () => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const newScale = Math.min(MAX_SCALE, scale * 1.3);
      const svgPointX = (centerX - translateX) / scale;
      const svgPointY = (centerY - translateY) / scale;
      
      scale = newScale;
      translateX = centerX - svgPointX * scale;
      translateY = centerY - svgPointY * scale;
      
      constrainTranslation();
      updateTransform();
    },
    zoomOut: () => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const newScale = Math.max(MIN_SCALE, scale / 1.3);
      const svgPointX = (centerX - translateX) / scale;
      const svgPointY = (centerY - translateY) / scale;
      
      scale = newScale;
      translateX = centerX - svgPointX * scale;
      translateY = centerY - svgPointY * scale;
      
      constrainTranslation();
      updateTransform();
    },
    reset: resetTransform
  });
};

// Création des contrôles de zoom
const createZoomControls = (container, actions) => {
  // Vérifier si les contrôles existent déjà
  if (container.querySelector('.zoom-controls')) {
    return;
  }

  const controls = document.createElement('div');
  controls.className = 'zoom-controls';
  
  const zoomInBtn = document.createElement('button');
  zoomInBtn.className = 'zoom-btn zoom-in';
  zoomInBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  zoomInBtn.setAttribute('aria-label', 'Zoom in');
  zoomInBtn.onclick = actions.zoomIn;
  
  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.className = 'zoom-btn zoom-out';
  zoomOutBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  zoomOutBtn.setAttribute('aria-label', 'Zoom out');
  zoomOutBtn.onclick = actions.zoomOut;
  
  const resetBtn = document.createElement('button');
  resetBtn.className = 'zoom-btn zoom-reset';
  resetBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10C4 6.686 6.686 4 10 4C13.314 4 16 6.686 16 10C16 13.314 13.314 16 10 16C6.686 16 4 13.314 4 10Z" stroke="currentColor" stroke-width="2"/><path d="M10 7V10L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  resetBtn.setAttribute('aria-label', 'Reset zoom');
  resetBtn.onclick = actions.reset;
  
  controls.appendChild(zoomInBtn);
  controls.appendChild(zoomOutBtn);
  controls.appendChild(resetBtn);
  
  container.appendChild(controls);
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