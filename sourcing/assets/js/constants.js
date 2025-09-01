// Configurations et éléments DOM
export const CONFIG = {
  itemsPerPage: 12,
  csvUrls: [
    //  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTda139g0YsEDh0AW3PQ2hGvZpFlSQlS4QlOqjUKN5tJWCzgXmRDl-S8k3V3drnHyD3ax-_zqnyAoIp/pub?gid=0&single=true&output=csv', //
    //  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFMnAIVzcRLBXNXvNPcoDe3fmWeRXteipd6O5qvwOADkRcDc4VuF7dWuqP5s7HEFOif0eykCQM4hYm/pub?gid=0&single=true&output=csv',
    //  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIjq-iOQA2VUcdOIWXL1VhZXZ_OWnwSbhApfoN1U8mTMSeIBLiFO8TzEIKLLFjeHrgVqpbQDxJuKrx/pub?gid=0&single=true&output=csv'
   'https://docs.google.com/spreadsheets/d/1ZH8jI8UzT-iGPede9K1fZdbN3FswbRM_izHVRUdjiWk/export?format=csv&usp=sharing',
   'https://docs.google.com/spreadsheets/d/1GuAEh0AF3XsGxP6sgd6hwNx_tdrbsHMygFnzKs-EQRo/export?format=csv&usp=sharing',
   'https://docs.google.com/spreadsheets/d/1jirlux7uMjWhHlVN6pVFxOP6WSYApoU0GTIjqyrL9Jo/export?format=csv&usp=sharing'
  ],
  specialFilters: ['handmade', 'recycled', 'organic', 'ethical-manufacturing', 'limited-edition', 'white-label']
};

export const DOM = {
  exhibitorsList: document.getElementById('exhibitors-list'),
  searchInput: document.getElementById('searchInput'),
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
  madeInContainer : document.querySelector('#made-in-fieldset'),
};

export const MADE_IN_VALUES = [
  'Albania',
  'Algeria', 
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Belgium',
  'Bolivia',
  'Brazil',
  'Bulgaria',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Costa Rica',
  'Croatia',
  'Croatia',
  'Czech',
  'Denmark',
  'Egypt',
  'Estonia',
  'Ecuador',
  'Ethiopia',
  'Finland',
  'France',
  'Germany',
  'Georgia',
  'Greece',
  'Hong Kong',
  'Iceland',
  'India',
  'Indonesia',
  'Irlande',
  'Italy',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Latvia',
  'Lebanon',
  'Macao',
  'Malaysia',
  'Morocco',
  'Mexico',
  'Monaco',
  'Netherlands',
  'Norway',
  'Pakistan',
  'Paraguay',
  'Philippines',
  'Poland',
  'Saudi Arabia',
  'South Africa',
  'South Korea',
  'Spain',
  'Portugal',
  'Qatar',
  'Singapore',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'Tunisia',
  'Turkey',
  'United Arab Emirates',
  'Uruguay',
  'USA',
  'UK',
  'Vietnam'

];

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
