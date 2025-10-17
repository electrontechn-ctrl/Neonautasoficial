(() => {
  'use strict';

  // Utils
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, cb, opts) => el.addEventListener(evt, cb, opts);
  const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const debounce = (fn, ms = 150) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

  // Year in footer (lightweight)
  on(document, 'DOMContentLoaded', () => { const y = $('#year'); if (y) y.textContent = new Date().getFullYear(); });

  // Elements
  const searchInput = $('#searchInput');
  const categorySelect = $('#categorySelect');
  const sizeSelect = $('#sizeSelect');
  const showMoreContainer = $('#showMoreContainer');
  const showMoreBtn = $('#showMoreBtn');
  const quoteList = $('#quoteList');
  const quoteTotal = $('#quoteTotal');
  const quoteCount = $('#quoteCount');
  const wDirect = $('#wDirect');
  const detailsModal = $('#detailsModal');
  const grid = $('#grid');
  const fab = $('#fab');
  const section = $('#catalogoimg');

  // State
  const MAX_VISIBLE = 4; // cards visibles en modo colapsado
  let isExpanded = false;
  let products = [];
  const quote = JSON.parse(localStorage.getItem('neonautas_quote') || '[]');

  const persistQuote = () => localStorage.setItem('neonautas_quote', JSON.stringify(quote));

  function setProductsFromDOM() {
    products = $$('.product');
  }

  function renderQuote() {
    quoteList.innerHTML = '';
    let total = 0;
    const frag = document.createDocumentFragment();

    quote.forEach((item, idx) => {
      total += item.price;
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center glass';
      li.innerHTML = `<span>${item.title}</span><span class="ms-3">${fmtMXN.format(item.price)}</span><button class="btn btn-sm btn-outline-danger" aria-label="Quitar" data-action="remove-quote" data-index="${idx}"><i class='bi bi-x-lg'></i></button>`;
      frag.appendChild(li);
    });

    quoteList.appendChild(frag);
    quoteTotal.textContent = fmtMXN.format(total);
    quoteCount.textContent = String(quote.length);
  }

  function addToQuote(title, price) {
    quote.push({ title, price });
    renderQuote();
    persistQuote();

    // Toast feedback (Bootstrap)
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-bg-dark border-0 position-fixed bottom-0 end-0 m-3';
    toast.role = 'status';
    toast.innerHTML = `<div class="d-flex"><div class="toast-body"><i class='bi bi-bag-plus'></i> Añadido: ${title}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
    document.body.appendChild(toast);
    const t = new bootstrap.Toast(toast, { delay: 2000 }); t.show();
    on(toast, 'hidden.bs.toast', () => toast.remove());
  }

  function removeFromQuote(idx) {
    quote.splice(idx, 1);
    renderQuote();
    persistQuote();
  }

  function clearQuote() {
    quote.length = 0;
    renderQuote();
    persistQuote();
  }

  // === Ajuste seguro de MAX_VISIBLE sin tocar filterProducts ===
  const BASE_VISIBLE = 6; // tu mínimo deseado (ajústalo si quieres)

  function getGridEl() {
    return (
      window.grid ||
      document.getElementById('gridProductos') ||
      document.querySelector('#catalogo .row, #catalogo .grid, .products-grid')
    );
  }

  function getAnyCard() {
    // primero intenta una visible (mejor ancho), luego cualquiera
    const grid = getGridEl();
    if (!grid) return null;
    return (
      grid.querySelector('.product-card:not([style*="display: none"])') ||
      grid.querySelector('.product-card, .card')
    );
  }

  function getColsSafe() {
    const grid = getGridEl();
    if (!grid) return 1;

    // Si es CSS Grid, intenta leer las columnas del template
    const cs = window.getComputedStyle(grid);
    if (cs.display.includes('grid')) {
      const cols = (cs.gridTemplateColumns || '')
        .split(' ')
        .filter(Boolean).length;
      if (cols > 0) return cols;
    }

    // Fallback por medida: ancho contenedor / ancho tarjeta
    const gw = grid.getBoundingClientRect().width || grid.clientWidth || 0;
    const card = getAnyCard();
    const cw = card ? (card.getBoundingClientRect().width || card.clientWidth || 0) : 0;

    // Si aún no hay ancho (ej: antes de render), usa un ancho mínimo razonable
    const safeCardWidth = cw > 0 ? cw : 260; // px aprox. de una tarjeta
    const cols = Math.max(1, Math.floor((gw || 1) / safeCardWidth));
    return cols;
  }

  function updateMaxVisible(totalItems) {
    const cols = getColsSafe();
    // Si todavía no tenemos items o grid, no cambies nada
    if (!Number.isFinite(totalItems) || totalItems <= 0) {
      window.MAX_VISIBLE = BASE_VISIBLE;
      return;
    }

    const base = Math.min(BASE_VISIBLE, totalItems);
    // Redondea hacia arriba al múltiplo de columnas sin pasarte del total
    const rounded = Math.min(totalItems, Math.ceil(base / cols) * cols);

    // Guarda siempre un número válido >= 1
    window.MAX_VISIBLE = Math.max(1, rounded || BASE_VISIBLE);

    // (Opcional) debug:
    // console.log('cols=', cols, 'total=', totalItems, 'MAX_VISIBLE=', window.MAX_VISIBLE);
  }


  // Filter logic
  function filterProducts() {
    const q = norm(searchInput?.value?.trim() || '');
    const cat = norm(categorySelect?.value || '');
    const size = sizeSelect?.value || '';

    let matches = 0;
    let shown = 0;

    products.forEach(card => {
      const title = norm($('.card-title', card)?.textContent || '');
      const tags = norm(card.dataset.tags || '');
      const category = norm(card.dataset.category || '');
      const sizeAttr = card.dataset.size || '';

      const matchQ = !q || title.includes(q) || tags.includes(q);
      const matchC = !cat || category === cat;
      const matchS = !size || sizeAttr === size;
      const match = matchQ && matchC && matchS;

      if (match) {
        matches++;
        if (!isExpanded && shown >= MAX_VISIBLE) {
          card.style.display = 'none';
        } else {
          card.style.display = '';
          shown++;
        }
      } else {
        card.style.display = 'none';
      }
    });

    const noRes = $('#noResults');
    if (noRes) noRes.hidden = !!matches;

    if (showMoreContainer) showMoreContainer.hidden = !(matches > MAX_VISIBLE);
    if (showMoreBtn) showMoreBtn.textContent = isExpanded ? 'Mostrar menos' : 'Mostrar más';
  }

  const resetAndFilter = () => { isExpanded = false; filterProducts(); };
  const debouncedResetAndFilter = debounce(resetAndFilter, 120);

  // Modal detalles (carga dinámica)
  if (detailsModal) {
    on(detailsModal, 'show.bs.modal', (ev) => {
      const btn = ev.relatedTarget;
      if (!btn) return;
      $('#detailsTitle').textContent = btn.dataset.title || 'Detalles';
      $('#detailsDesc').textContent = btn.dataset.description || '';
      $('#detailsSize').textContent = btn.dataset.sizes || '';
      $('#detailsPrice').textContent = btn.dataset.price ? fmtMXN.format(Number(btn.dataset.price)) : '';
    });
  }

  // WhatsApp helpers
  const WHATS_NUMBER = '524681146000';
  function buildWhatsMessage({ includeContact = true } = {}) {
    const nombre = ($('#wNombre')?.value || '').trim();
    const ciudad = ($('#wCiudad')?.value || '').trim();
    const msg = ($('#wMsg')?.value || '').trim();

    const lines = [];
    if (includeContact && (nombre || ciudad)) {
      lines.push(`Hola, soy ${nombre || '—'}${ciudad ? ' de ' + ciudad : ''}.`, '');
    }

    lines.push('Estoy interesado en:');
    if (quote.length) {
      lines.push(...quote.map((i, k) => `  ${k + 1}. ${i.title} - ${fmtMXN.format(i.price)} MXN`));
      const total = quote.reduce((a, b) => a + (b.price || 0), 0);
      lines.push('', `Total estimado: ${fmtMXN.format(total)} MXN`);
    } else {
      lines.push('  — (aún sin selección en “Cotización”)');
    }

    if (msg) {
      lines.push('', 'Mensaje adicional:', msg);
    }

    return lines.join('\n');
  }

  function sendWhatsApp(e) {
    e.preventDefault();
    const text = buildWhatsMessage({ includeContact: true });
    const url = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  }

  function updateWhatsLink() { if (wDirect) wDirect.href = `https://wa.me/${WHATS_NUMBER}`; }

  // Product card factory
  const formatMXN = (num) => Number(num).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  function productCardHTML(p) {
    return `
      <div class="col product" data-tags="${p.tags || ''}" data-category="${p.category || ''}" data-size="${p.size || ''}">
        <div class="card h-100">
          <div class="neon-thumb ratio ratio-1x1">
            <img src="${p.image_url}" alt="${p.title}" loading="lazy" decoding="async">
          </div>
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.title}</h5>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <span class="price">$${formatMXN(p.price)}</span>
              <span class="badge text-bg-secondary">${p.size || ''}</span>
            </div>
            <div class="d-grid gap-2 mt-3">
              <button class="btn btn-primary add-to-quote" data-title="${p.title}" data-price="${p.price}">Agregar a cotización</button>
              <button class="btn btn-outline-light" data-bs-toggle="modal" data-bs-target="#detailsModal"
                data-title="${p.title}"
                data-description="${p.description || ''}"
                data-price="${p.price}"
                data-sizes="${p.sizes_label || ''}">
                Detalles
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function loadProducts() {
    try {
      const APP_VERSION = '2025-10-17-03';

      const SQL = await initSqlJs({
        locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
      });

      const DB_BASE = 'https://raw.githubusercontent.com/electrontechn-ctrl/Neonautasoficial/refs/heads/main/sources/data/data.db';
      const DB_URL = `${DB_BASE}?v=${APP_VERSION}`;

      const res = await fetch(DB_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();

      const db = new SQL.Database(new Uint8Array(buf));
      const stmt = db.prepare(`SELECT id, title, description, price, size, category, tags, image_url, sizes_label FROM productos ORDER BY id ASC`);

      const items = [];
      while (stmt.step()) items.push(stmt.getAsObject());
      stmt.free();
      db.close();

      grid.innerHTML = items.map(productCardHTML).join('');
      setProductsFromDOM();
      filterProducts();
    } catch (err) {
      console.error('Error cargando productos', err);
      grid.innerHTML = '<div class="col"><div class="alert alert-danger">No se pudo cargar el catálogo. Intenta de nuevo más tarde.</div></div>';
    }
  }


  // Global UI wiring
  on(document, 'DOMContentLoaded', () => {
    updateWhatsLink();
    loadProducts();
    renderQuote();

    // Filtering events (debounced)
    if (searchInput) on(searchInput, 'input', debouncedResetAndFilter);
    [categorySelect, sizeSelect].forEach(el => el && ['change', 'input'].forEach(evt => on(el, evt, resetAndFilter)));

    // Show more / less
    if (showMoreBtn) on(showMoreBtn, 'click', () => { isExpanded = !isExpanded; filterProducts(); if (!isExpanded) $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    // WhatsApp form
    const waForm = $('#waForm');
    if (waForm) on(waForm, 'submit', sendWhatsApp);
    ['wNombre', 'wCiudad', 'wMsg'].forEach(id => { const el = document.getElementById(id); if (el) on(el, 'input', updateWhatsLink); });

    // Delegated clicks: add/remove/clear/scroll
    on(document, 'click', (e) => {
      const t = e.target.closest('[data-action]') || e.target.closest('.add-to-quote');
      if (!t) return;

      if (t.classList.contains('add-to-quote')) {
        addToQuote(t.dataset.title, parseFloat(t.dataset.price || '0'));
      }

      switch (t.dataset.action) {
        case 'remove-quote':
          removeFromQuote(parseInt(t.dataset.index, 10));
          break;
        case 'clear-quote':
          clearQuote();
          break;
        case 'scroll': {
          const target = t.dataset.target && document.querySelector(t.dataset.target);
          if (target && 'scrollIntoView' in target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    });

    // IntersectionObserver para el FAB
    if (fab && section) {
      const io = new IntersectionObserver((entries) => {
        fab.classList.toggle('visible', entries[0].isIntersecting);
      }, { threshold: 0.01 });
      io.observe(section);
    }
  });
})();

window.addEventListener('resize', debounce(() => {
  if (window.isExpanded) return;     // si está en "mostrar todo", no hace falta
  updateMaxVisible(products.length);
  filterProducts();
}, 150));