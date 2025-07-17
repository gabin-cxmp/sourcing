// Configurations et éléments DOM
export const CONFIG = {
  itemsPerPage: 20,
  csvUrls: [
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTda139g0YsEDh0AW3PQ2hGvZpFlSQlS4QlOqjUKN5tJWCzgXmRDl-S8k3V3drnHyD3ax-_zqnyAoIp/pub?gid=0&single=true&output=csv',
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFMnAIVzcRLBXNXvNPcoDe3fmWeRXteipd6O5qvwOADkRcDc4VuF7dWuqP5s7HEFOif0eykCQM4hYm/pub?output=csv'
  ],
  specialFilters: ['handmade', 'recycled', 'organic', 'ethical-manufacturing']
};

export const DOM = {
  exhibitorsList: document.getElementById('exhibitors-list'),
  searchInput: document.getElementById('searchInput'),
  noResults: document.getElementById('noResults'),
  checkboxes: document.querySelectorAll('.checkbox-container input[type="checkbox"]'),
  paginationButtonsWrapper: document.querySelector('.pagination-buttons_wrapper'),
  exportPDFButton: document.getElementById('export-pdf_button'),
  listContainer: document.getElementById('list-container'),
  microviewContainer: document.getElementById('microview-container'),
  loaders: document.querySelectorAll('.loader'),
  goBackButton: document.getElementById('back-button_micro'),
  microviewContentWrapper: document.getElementById('microview-main-content_wrapper'),
  microviewTitle: document.getElementById('microview-title'),
  microviewCountry: document.getElementById('microview-country'),
  microviewFocus: document.getElementById('microview-focus'),
  microviewContactButton: document.getElementById('microview-contact_button'),
  certificationsList: document.getElementById('certifications-list')
};