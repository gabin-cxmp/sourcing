// Legacy exports for backward compatibility
export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
export function showMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = type ? `message ${type}` : 'message';
}
export function setLoading(btn, isLoading, label, loadingHtml = 'Loading...') {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading ? loadingHtml : label;
}
export function populateSelect(selectEl, items, { valueKey = 'id', labelKey = 'name', placeholder, selectedValue } = {}) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item[valueKey];
    opt.textContent = item[labelKey] || item.quantity;
    // Only select if selectedValue is not null, undefined, or empty string
    if (selectedValue != null && selectedValue !== '' && String(item[valueKey]) === String(selectedValue)) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });
}

// New organized DOM utilities
export const DOM = {
  qs: (sel, root = document) => root.querySelector(sel),
  qsa: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
  showMessage,
  setLoading,
  populateSelect,

  createBadge(text) {
    return text ? `<span class="badge">${text}</span>` : '';
  },

  createMeta(label, value) {
    return value ? `<div><span class="label">${label}</span><br>${value}</div>` : '';
  },

  capitalizeWords(val) {
    if (!val || typeof val !== 'string') return val;
    return val.toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
};
