export const CONFIG = {
  itemsPerPage: 12
};

export const SUPABASE_CONFIG = {
  url: 'https://ngylxcrcwqfrtefkrilt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5neWx4Y3Jjd3FmcnRlZmtyaWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTYyOTIsImV4cCI6MjA3NDc5MjI5Mn0.zUj8ACrn1Uqo44at4F6memM_8mnTi7dMpQxkEJWlstc'
};

export const DOM = {
  exhibitorsList: document.getElementById('exhibitors-list'),
  searchInput: document.getElementById('searchInput'),
  applyFiltersButton: document.getElementById('apply-filters_button'),
  noResults: document.getElementById('noResults'),
  checkboxes: document.querySelectorAll('.checkbox-container input[type="checkbox"]'),
  checkboxesContainers: document.querySelectorAll('.checkboxes-container'),
  filterDropdownActivator: document.querySelectorAll('.filter-dropdown_activator'),
  paginationButtonsWrapper: document.querySelector('.pagination-buttons_wrapper'),
  exportPDFButton: document.getElementById('export-pdf_button'),
  listContainer: document.getElementById('list-container'),
  microviewContainer: document.getElementById('microview-container'),
  loaders: document.querySelectorAll('.loader'),
  goBackButton: document.getElementById('back-button_micro'),
  microviewContentWrapper: document.getElementById('microview-main-content_wrapper'),
  microviewTitle: document.getElementById('microview-title'),
  microviewStand: document.getElementById('microview-stand'),
  microviewCountry: document.getElementById('microview-country'),
  microviewFocus: document.getElementById('microview-focus'),
  microviewCategory: document.getElementById('microview-category'),
  microviewSpan: document.getElementById('microview-span'),
  microviewContactButton: document.getElementById('microview-contact_button'),
  certificationsList: document.getElementById('certifications-list'),
  madeInContainer: document.querySelector('#made-in-fieldset'),
};

export const FILTER_CONFIG = {
  category: {
    legend: 'Category',
    fieldName: 'Main Product Category',
    type: 'direct',
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
    type: 'computed',
    filters: [
      {
        id: 'recycled',
        label: 'Recycled Products',
        check: (products) =>
          products.some(p => (p['Recycled/Organic (if applicable)'] || '').toLowerCase().includes('recycled'))
      },
      {
        id: 'handmade',
        label: 'Handmade Products',
        check: (products) =>
          products.some(p => (p['Handmade'] || '').toLowerCase() === 'yes')
      },
      {
        id: 'organic',
        label: 'Organic Products',
        check: (products) =>
          products.some(p => (p['Recycled/Organic (if applicable)'] || '').toLowerCase().includes('organic'))
      },
      {
        id: 'limited-edition',
        label: 'Limited Edition',
        check: (products) =>
          products.some(p => (p['Is this product a limited edition?'] || '').toLowerCase() === 'yes')
      },
      {
        id: 'white-label',
        label: 'White Label',
        check: (products) =>
          products.some(p => (p['Is this product available as Private Label/White Label service?'] || '').toLowerCase() === 'yes')
      }
    ]
  },
  madeIn: {
    legend: 'Made In',
    fieldName: 'Made in',
    type: 'madeIn'
  }
};
