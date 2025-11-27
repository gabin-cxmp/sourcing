// Bundle file - combines all modules for better loading performance
import { requireAuth, sessionState, signOut, CONFIG, getSession } from './core.js';
import { DOM, setLoading, showMessage, populateSelect } from './ui.js';
import { Suppliers, Products, Lookups } from './api.js';

const App = {
  async init() {
    const page = document.body?.dataset?.page;
    if (page === 'dashboard') await this.initDashboard();
    if (page === 'login') await this.initLogin();
  },

  async initDashboard() {
    // Check authentication immediately
    const session = await getSession();
    if (!session) {
      window.location.replace('https://wsn-events.com/sourcing/login/');
      return;
    }

    sessionState.setSession(session);
    await this.loadDashboard();
    this.bindDashboardEvents();
  },

  async initLogin() {
    const { supabase } = await import('./core.js');
    const { DOM } = await import('./ui.js');

    const loginForm = DOM.qs('#loginForm');
    const messageEl = DOM.qs('#message');
    const submitBtn = DOM.qs('#submitBtn');
    const emailInput = DOM.qs('#email');

    if (!loginForm || !messageEl || !submitBtn || !emailInput) return;

    const setLoading = (isLoading) => {
      submitBtn.disabled = isLoading;
      submitBtn.innerHTML = isLoading ? 'Loading<span class="loading"></span>' : 'Send magic link';
    };

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = emailInput.value.trim();
      if (!email) return DOM.showMessage(messageEl, 'Please enter your email.', 'error');
      if (!isValidEmail(email)) return DOM.showMessage(messageEl, 'Invalid email address.', 'error');

      setLoading(true);
      DOM.showMessage(messageEl, 'Sending magic link...', 'info');

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/${CONFIG.REDIRECT_AFTER_LOGIN}`,
          },
        });

        if (error) {
          let friendly = error.message || 'An error occurred.';

          // Handle different types of errors
          if (error.message?.toLowerCase().includes('not found')) {
            friendly = 'User not found.';
          } else if (error.message?.toLowerCase().includes('signups not allowed') ||
                     error.message?.toLowerCase().includes('signup') ||
                     error.status === 422) {
            friendly = 'Unknown e-mail address';
          } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
            friendly = 'Unknown e-mail address';
          }

          DOM.showMessage(messageEl, `❌ ${friendly}`, 'error');
          return;
        }

        DOM.showMessage(messageEl, '✅ Magic link sent. Check your email.', 'success');
        loginForm.reset();
      } catch (err) {
        console.error('Unexpected error:', err);
        DOM.showMessage(messageEl, '❌ An error occurred. Please try again later.', 'error');
      } finally {
        setLoading(false);
      }
    });
  },

  async loadDashboard() {
    const { DOM } = await import('./ui.js');
    const messageEl = DOM.qs('#message');
    const loaderEl = DOM.qs('#loader');
    const formEl = DOM.qs('#user-form');

    // Show loading state
    if (formEl) {
      formEl.style.opacity = '0';
      formEl.style.transform = 'translateY(16px)';
      formEl.style.transition = 'opacity 0.45s ease, transform 0.6s ease';
      formEl.style.pointerEvents = 'none';
    }

    if (loaderEl) {
      loaderEl.style.display = 'flex';
      loaderEl.style.opacity = '0';
      loaderEl.style.transition = 'opacity 0.45s ease';
      requestAnimationFrame(() => { loaderEl.style.opacity = '1'; });
    }

    try {
      // Load supplier data first to ensure supplierId is available
      await this.loadSupplierData();
      // Then load products once supplierId is set
      await this.loadProducts();
    } catch (e) {
      console.error(e);
      DOM.showMessage(messageEl, 'Unable to load your data.', 'error');
    } finally {
      // Hide loading state
      if (loaderEl) {
        loaderEl.style.opacity = '0';
        setTimeout(() => { loaderEl.style.display = 'none'; }, 450);
      }
      if (formEl) {
        formEl.style.pointerEvents = '';
        requestAnimationFrame(() => {
          formEl.style.opacity = '1';
          formEl.style.transform = 'translateY(0)';
        });
      }
    }
  },

  async loadSupplierData() {
    const supplier = await Suppliers.get();
    const { DOM } = await import('./ui.js');

    // Fill form fields
    const nameInput = DOM.qs('#supplierName');
    if (nameInput && supplier?.name) nameInput.value = supplier.name;

    const certificationsInput = DOM.qs('#certifications');
    if (certificationsInput && supplier?.company_certifications) certificationsInput.value = supplier.company_certifications;

    const userNameSpan = DOM.qs('.user-name');
    if (userNameSpan && supplier?.name) userNameSpan.textContent = supplier.name;

    // Populate and set select values
    const [countries, focus, categories] = await Promise.all([
      Lookups.listCountries(),
      Lookups.listFocus(),
      Lookups.listCategories(),
    ]);

    DOM.populateSelect(DOM.qs('#countrySelect'), countries, {
      valueKey: 'id', labelKey: 'name', placeholder: 'Select a country'
    });
    DOM.populateSelect(DOM.qs('#focusSelect'), focus, {
      valueKey: 'id', labelKey: 'name', placeholder: 'Select a focus'
    });
    DOM.populateSelect(DOM.qs('#mainCategorySelect'), categories, {
      valueKey: 'id', labelKey: 'name', placeholder: 'Select a category'
    });
    DOM.populateSelect(DOM.qs('#secondaryCategorySelect'), categories, {
      valueKey: 'id', labelKey: 'name', placeholder: 'Select a category'
    });

    // Set current values
    const countrySelect = DOM.qs('#countrySelect');
    if (countrySelect && supplier?.country) countrySelect.value = supplier.country;

    const focusSelect = DOM.qs('#focusSelect');
    if (focusSelect && supplier?.focus) focusSelect.value = supplier.focus;

    const mainCatSelect = DOM.qs('#mainCategorySelect');
    if (mainCatSelect && supplier?.main_product_category) mainCatSelect.value = supplier.main_product_category;

    const secondaryCatSelect = DOM.qs('#secondaryCategorySelect');
    if (secondaryCatSelect && supplier?.secondary_product_category) secondaryCatSelect.value = supplier.secondary_product_category;

    this.initialSupplier = { ...supplier };
  },

  async loadProducts() {
    const products = await Products.list();
    this.renderProducts(products);
  },

  renderProducts(products) {
    const { DOM } = window.ui || { DOM: { qs: (s) => document.querySelector(s) } };
    const listEl = DOM.qs('#products-list');
    if (!listEl) return;

    const productsLoader = DOM.qs('#products-loader');
    if (productsLoader) {
      productsLoader.style.display = 'flex';
      productsLoader.style.opacity = '0';
      productsLoader.style.transition = 'opacity 0.45s ease';
      requestAnimationFrame(() => { productsLoader.style.opacity = '1'; });
    }

    listEl.style.opacity = '0';

    listEl.innerHTML = products.map(p => this.renderProductItem(p)).join('');

    if (productsLoader) {
      productsLoader.style.opacity = '0';
      setTimeout(() => { productsLoader.style.display = 'none'; }, 450);
    }

    requestAnimationFrame(() => { listEl.style.opacity = '1'; });

    this.bindProductEvents(products);
  },

  renderProductItem(p) {
    const badges = [
      p.handmade ? 'Handmade' : '',
      p.private_label_white_label ? 'Private/White Label' : '',
      p.limited_edition ? 'Limited edition' : '',
      p.deadstock ? 'Deadstock' : ''
    ].filter(Boolean).map(DOM.createBadge).join('');

    const details = [
      DOM.createMeta('Type', DOM.capitalizeWords(p.type)),
      DOM.createMeta('Material', DOM.capitalizeWords(p.material)),
      p.material_secondary ? DOM.createMeta('Secondary', DOM.capitalizeWords(p.material_secondary)) : '',
      p.finishing ? DOM.createMeta('Finishing', DOM.capitalizeWords(p.finishing)) : '',
      p.specifications ? DOM.createMeta('Specifications', DOM.capitalizeWords(p.specifications)) : '',
      p.product_volumes ? DOM.createMeta('Production volume', p.product_volumes.quantity) : '',
      p.countries ? DOM.createMeta('Made in', p.countries.name) : '',
      (p.recycled_organic_table && String(p.recycled_organic) !== '3') ? DOM.createMeta('Recycled/Organic', p.recycled_organic_table.name) : '',
      p.raw_material_certifications_table ? DOM.createMeta('Raw material cert.', p.raw_material_certifications_table.name) : '',
      p.other_raw_material_certifications ? DOM.createMeta('Other cert.', DOM.capitalizeWords(p.other_raw_material_certifications)) : '',
    ].filter(Boolean);

    const rows = [];
    for (let i = 0; i < details.length; i += 2) {
      const a = details[i] || '';
      const b = details[i + 1] || '';
      rows.push(`<div class="meta-row details">${a}${b}</div>`);
    }

    return `
      <div class="product-item" data-id="${p.id}">
        <div class="product-info">
          <h3>${p.reference_name || 'Product'}</h3>
          <div class="meta-row">${badges}</div>
          ${rows.join('')}
        </div>
        <div class="product-actions">
          <button class="btn-modify">Update</button>
          <button class="btn-delete">Delete</button>
        </div>
      </div>`;
  },

  bindProductEvents(products) {
    const { DOM } = window.ui || { DOM: { qs: (s) => document.querySelector(s) } };
    const listEl = DOM.qs('#products-list');
    if (!listEl) return;

    listEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const item = e.target.closest('.product-item');
        const id = item?.getAttribute('data-id');
        if (!id) return;
        const product = products.find(p => String(p.id) === String(id));
        if (product) await this.openDeleteModal(product);
      });
    });

    listEl.querySelectorAll('.btn-modify').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const item = e.target.closest('.product-item');
        const id = item?.getAttribute('data-id');
        if (!id) return;
        const product = products.find(p => String(p.id) === String(id));
        if (product) await this.openProductModal(product);
      });
    });
  },

  bindDashboardEvents() {
    const { DOM } = window.ui || { DOM: { qs: (s) => document.querySelector(s) } };

    // Edit button
    const editBtn = DOM.qs('.btn-edit');
    if (editBtn) {
      let isEditMode = false;

      editBtn.addEventListener('click', async () => {
        if (!isEditMode) {
          this.enableEditMode();
          isEditMode = true;
          editBtn.textContent = 'Save informations';
        } else {
          await this.saveSupplierData();
          this.disableEditMode();
          isEditMode = false;
          editBtn.textContent = 'Update';
        }
      });
    }

    // Add product button
    const createBtn = DOM.qs('.btn-add');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.openProductModal(null, true));
    }

    // Logout button
    const logoutBtn = DOM.qs('.btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', signOut);
    }
  },

  enableEditMode() {
    const { DOM } = window.ui || { DOM: { qs: (s) => document.querySelector(s) } };
    const controls = [
      '#supplierName', '#certifications', '#countrySelect',
      '#focusSelect', '#mainCategorySelect', '#secondaryCategorySelect'
    ].map(sel => DOM.qs(sel)).filter(Boolean);

    controls.forEach(el => { el.disabled = false; });

    // Add required marks
    const requiredIds = ['supplierName', 'countrySelect', 'focusSelect', 'mainCategorySelect', 'secondaryCategorySelect'];
    requiredIds.forEach(id => {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label && !label.querySelector('.req-mark')) {
        const span = document.createElement('span');
        span.className = 'req-mark';
        span.style.color = 'red';
        span.textContent = ' *';
        label.appendChild(span);
      }
    });
  },

  disableEditMode() {
    const controls = [
      '#supplierName', '#certifications', '#countrySelect',
      '#focusSelect', '#mainCategorySelect', '#secondaryCategorySelect'
    ].map(sel => document.querySelector(sel)).filter(Boolean);

    controls.forEach(el => { el.disabled = true; });
    document.querySelectorAll('.req-mark').forEach(n => n.remove());
  },

  async saveSupplierData() {
  const messageEl = document.querySelector('#message');
  const editBtn = document.querySelector('.btn-edit');

  const payload = {
    name: document.querySelector('#supplierName')?.value?.trim() || null,
    company_certifications: document.querySelector('#certifications')?.value?.trim() || null,
    country: document.querySelector('#countrySelect')?.value || null,
    focus: document.querySelector('#focusSelect')?.value || null,
    main_product_category: document.querySelector('#mainCategorySelect')?.value || null,
    secondary_product_category: document.querySelector('#secondaryCategorySelect')?.value || null,
  };

  const changed = Object.keys(payload).some(
    k => (this.initialSupplier?.[k] ?? null) !== (payload[k] ?? null)
  );

  if (!changed) {
    showMessage(messageEl, 'No changes to save.', 'info');
    return;
  }

  setLoading(editBtn, true, 'Saving...');

  try {
    // 💥 HERE IS THE MISSING PART
    const updatedSupplier = await Suppliers.update(payload);

    // Update local state
    this.initialSupplier = { ...updatedSupplier };

    showMessage(messageEl, 'Informations saved successfully.', 'success');

    // Reload products and UI
    await this.loadProducts();

  } catch (e) {
    console.error('Save supplier failed:', e);
    showMessage(messageEl, 'Unable to save.', 'error');
  } finally {
    setLoading(editBtn, false, 'Update');
  }
},

  async openProductModal(product, isNewProduct = false) {
    const { DOM } = window.ui || { DOM: { qs: (s) => document.querySelector(s) } };
    const template = DOM.qs('#productModalTemplate');
    if (!template) return;

    const modal = template.cloneNode(true);
    modal.id = '';
    modal.style.display = '';

    const titleEl = modal.querySelector('.product-modal-title');
    titleEl.textContent = isNewProduct ? 'Add New Product' : 'Update Product';

    const form = modal.querySelector('.product-modal-form');
    const formElements = this.getFormElements(form);

    if (product) this.populateForm(formElements, product);

    await this.populateSelects(formElements, product);

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    document.body.style.overflow = 'hidden';

    const modalClose = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 300);
    };

    modal.querySelector('.product-modal-close').onclick = modalClose;
    modal.onclick = (e) => { if (e.target === modal) modalClose(); };

    const dialog = modal.querySelector('.product-modal-dialog');
    dialog.focus();
    dialog.onkeydown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); modalClose(); }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      await this.saveProduct(formElements, product, isNewProduct, modalClose);
    };
  },

  getFormElements(form) {
    return {
      reference_name: form.querySelector('#product-modal-reference_name'),
      type: form.querySelector('#product-modal-type'),
      material: form.querySelector('#product-modal-material'),
      material_secondary: form.querySelector('#product-modal-material_secondary'),
      finishing: form.querySelector('#product-modal-finishing'),
      specifications: form.querySelector('#product-modal-specifications'),
      production_volumes: form.querySelector('#product-modal-production_volumes'),
      made_in: form.querySelector('#product-modal-made_in'),
      recycled_organic: form.querySelector('#product-modal-recycled_organic'),
      raw_material_certifications: form.querySelector('#product-modal-raw_material_certifications'),
      other_raw_material_certifications: form.querySelector('#product-modal-other_raw_material_certifications'),
      handmade: form.querySelector('#product-modal-handmade'),
      private_label_white_label: form.querySelector('#product-modal-private_label_white_label'),
      limited_edition: form.querySelector('#product-modal-limited_edition'),
      deadstock: form.querySelector('#product-modal-deadstock')
    };
  },

  populateForm(formElements, product) {
    Object.keys(formElements).forEach(key => {
      const element = formElements[key];
      const value = product[key];

      if (element) {
        if (element.type === 'checkbox') {
          element.checked = !!value;
        } else if (element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
          element.value = value || '';
        } else {
          element.value = value || '';
        }
      }
    });
  },

  async populateSelects(formElements, product) {
    try {
      const [volumes, countries, recycled, rawCerts] = await Promise.all([
        Lookups.listProductVolumes(),
        Lookups.listCountries(),
        Lookups.listRecycledOrganic(),
        Lookups.listRawMaterialCertifications(),
      ]);

      populateSelect(formElements.production_volumes, volumes, {
        valueKey: 'id', labelKey: 'quantity', selectedValue: product?.production_volumes
      });

      populateSelect(formElements.made_in, countries, {
        valueKey: 'id', labelKey: 'name', selectedValue: product?.made_in
      });

      // Sort recycled organic to put "none" (id: 3) first
      const sortedRecycled = [...recycled].sort((a, b) => {
        const aId = Number(a.id);
        const bId = Number(b.id);
        if (aId === 3) return -1; // "none" first
        if (bId === 3) return 1;
        return aId - bId; // Sort by id numerically
      });

      // For recycled organic, default to "none" (id: 3) for new products
      const recycledDefaultValue = product?.recycled_organic || (product ? null : 3);
      populateSelect(formElements.recycled_organic, sortedRecycled, {
        valueKey: 'id', labelKey: 'name', selectedValue: recycledDefaultValue
      });

      // Sort raw material certifications to put "none" (id: 13) first
      const sortedRawCerts = [...rawCerts].sort((a, b) => {
        const aId = Number(a.id);
        const bId = Number(b.id);
        if (aId === 13) return -1; // "none" first
        if (bId === 13) return 1;
        return aId - bId; // Sort by id numerically
      });

      // For raw material certifications, default to "none" (id: 13) for new products
      const rawMaterialDefaultValue = product?.raw_material_certifications || (product ? null : 13);
      populateSelect(formElements.raw_material_certifications, sortedRawCerts, {
        valueKey: 'id', labelKey: 'name', selectedValue: rawMaterialDefaultValue
      });

    } catch (error) {
      console.error('Error loading select options:', error);
    }
  },

  async saveProduct(formElements, product, isNewProduct, modalClose) {
    const messageEl = document.querySelector('#message');

    const payload = {
      reference_name: formElements.reference_name?.value?.trim() || null,
      type: formElements.type?.value?.trim() || null,
      material: formElements.material?.value?.trim() || null,
      material_secondary: formElements.material_secondary?.value?.trim() || null,
      finishing: formElements.finishing?.value?.trim() || null,
      specifications: formElements.specifications?.value?.trim() || null,
      production_volumes: formElements.production_volumes?.value || null,
      made_in: formElements.made_in?.value || null,
      recycled_organic: formElements.recycled_organic?.value || null,
      raw_material_certifications: formElements.raw_material_certifications?.value || null,
      other_raw_material_certifications: formElements.other_raw_material_certifications?.value?.trim() || null,
      handmade: formElements.handmade?.checked || false,
      private_label_white_label: formElements.private_label_white_label?.checked || false,
      limited_edition: formElements.limited_edition?.checked || false,
      deadstock: formElements.deadstock?.checked || false,
    };

    const changed = !product || Object.keys(payload).some(k =>
      (payload[k] ?? null) !== (product[k] ?? null)
    );

    if (!changed && !isNewProduct) return modalClose();

    const saveBtn = formElements.reference_name?.closest('form')?.querySelector('.btn-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      if (isNewProduct) {
        await Products.create(payload);
      } else {
        await Products.update(product.id, payload);
      }

      modalClose();
      await this.loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      showMessage(messageEl, 'Save failed.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save informations';
      }
    }
  },

  async openDeleteModal(product) {
    const { DOM } = window.ui || { DOM: { qs: (s) => document.querySelector(s) } };
    const template = DOM.qs('#deleteModalTemplate');
    if (!template) return;

    const modal = template.cloneNode(true);
    modal.id = '';
    modal.style.display = '';

    const productNameEl = modal.querySelector('.product-name');
    if (productNameEl) {
      productNameEl.textContent = product.reference_name || 'this product';
    }

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    document.body.style.overflow = 'hidden';

    const modalClose = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 300);
    };

    modal.querySelector('.delete-modal-close').onclick = modalClose;
    modal.onclick = (e) => { if (e.target === modal) modalClose(); };

    const dialog = modal.querySelector('.delete-modal-dialog');
    dialog.focus();
    dialog.onkeydown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); modalClose(); }
    };

    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');

    cancelBtn.onclick = modalClose;

    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';

      try {
        await Products.delete(product.id);
        modalClose();
        await this.loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        showMessage(document.querySelector('#message'), 'Delete failed.', 'error');
        modalClose();
      }
    };
  }
};

// Initialize app
App.init();


