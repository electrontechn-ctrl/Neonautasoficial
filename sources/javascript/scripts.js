// Año footer
document.getElementById('year').textContent = new Date().getFullYear();

// Filtro catálogo
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sizeSelect = document.getElementById('sizeSelect');

let products = [];
function setProductsFromDOM() {
  products = Array.from(document.querySelectorAll('.product'));
}

const MAX_VISIBLE = 4; // número cards
let isExpanded = false;

const showMoreContainer = document.getElementById('showMoreContainer');
const showMoreBtn = document.getElementById('showMoreBtn');

// Normalizar texto
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function filterProducts() {
  const q = norm(searchInput.value.trim());
  const cat = norm(categorySelect.value);
  const size = sizeSelect.value; // S, M, L o ""

  let matches = 0; // cuántos cumplen filtros
  let shown = 0;   // cuántos se muestran

  products.forEach(card => {
    const title = norm(card.querySelector('.card-title')?.textContent || '');
    const tags = norm(card.dataset.tags || '');
    const category = norm(card.dataset.category || '');
    const sizeAttr = (card.dataset.size || '');
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

  // Mensaje "sin resultados"
  let noRes = document.getElementById('noResults');
  if (!noRes) {
    noRes = document.createElement('p');
    noRes.id = 'noResults';
    noRes.className = 'text-center text-secondary mt-3';
    noRes.textContent = 'No se encontraron productos con esos filtros.';
    document.querySelector('#catalogo .container').appendChild(noRes);
  }
  noRes.style.display = matches ? 'none' : '';

  // Botón "Más"
  if (showMoreContainer) {
    showMoreContainer.style.display = (matches > MAX_VISIBLE) ? '' : 'none';
  }
  if (showMoreBtn) {
    showMoreBtn.textContent = isExpanded ? 'Mostrar menos' : 'Mostrar más';
  }
}

// Click en "Más"
if (showMoreBtn) {
  showMoreBtn.addEventListener('click', () => {
    isExpanded = !isExpanded; // alterna
    filterProducts();
    if (!isExpanded) {
      const cat = document.getElementById('catalogo');
      if (cat && 'scrollIntoView' in cat) {
        cat.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

// Cambiar filtros o buscar
function resetAndFilter() { isExpanded = false; filterProducts(); }
searchInput.addEventListener('input', resetAndFilter);
;[categorySelect, sizeSelect].forEach(el => { el.addEventListener('change', resetAndFilter); el.addEventListener('input', resetAndFilter); });


// Offcanvas
const quote = [];
const quoteList = document.getElementById('quoteList');
const quoteTotal = document.getElementById('quoteTotal');
const quoteCount = document.getElementById('quoteCount');


function renderQuote() {
  quoteList.innerHTML = '';
  let total = 0;
  quote.forEach((item, idx) => {
    total += item.price;
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center glass';
    li.innerHTML = `<span>${item.title}</span>
                        <span class="ms-3">$${item.price.toLocaleString()}</span>
                        <button class="btn btn-sm btn-outline-danger" aria-label="Quitar" onclick="removeFromQuote(${idx})"><i class='bi bi-x-lg'></i></button>`;
    quoteList.appendChild(li);
  });
  quoteTotal.textContent = `$${total.toLocaleString()}`;
  quoteCount.textContent = quote.length;
}

function addToQuote(title, price) {
  quote.push({ title, price });
  renderQuote();
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-bg-dark border-0 position-fixed bottom-0 end-0 m-3';
  toast.role = 'status';
  toast.innerHTML = `<div class="d-flex"><div class="toast-body"><i class='bi bi-bag-plus'></i> Añadido: ${title}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
  document.body.appendChild(toast);
  const t = new bootstrap.Toast(toast, { delay: 2000 }); t.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function removeFromQuote(idx) { quote.splice(idx, 1); renderQuote(); }
function clearQuote() { quote.length = 0; renderQuote(); }
window.removeFromQuote = removeFromQuote; // expose for inline onclick
window.clearQuote = clearQuote;

document.querySelectorAll('.add-to-quote').forEach(btn => {
  btn.addEventListener('click', () => {
    const title = btn.dataset.title;
    const price = parseFloat(btn.dataset.price || '0');
    addToQuote(title, price);
  });
});

// carga dinámica
const detailsModal = document.getElementById('detailsModal');
detailsModal.addEventListener('show.bs.modal', (ev) => {
  const btn = ev.relatedTarget;
  if (!btn) return;
  document.getElementById('detailsTitle').textContent = btn.dataset.title || 'Detalles';
  document.getElementById('detailsDesc').textContent = btn.dataset.description || '';
  document.getElementById('detailsSize').textContent = btn.dataset.sizes || '';
  document.getElementById('detailsPrice').textContent = btn.dataset.price ? `$${Number(btn.dataset.price).toLocaleString()}` : '';
});

const WHATS_NUMBER = '524428124789';
const wDirect = document.getElementById('wDirect');

function getQuoteItems() {
  if (typeof quote !== 'undefined' && Array.isArray(quote)) return quote;
  if (typeof window !== 'undefined' && Array.isArray(window.quote)) return window.quote;

  const lis = document.querySelectorAll('#quoteList li');
  if (lis.length) {
    return Array.from(lis).map(li => {
      const spans = li.querySelectorAll('span');
      const title = spans[0]?.textContent.trim() || '';
      const priceNum = Number((spans[1]?.textContent || '').replace(/[^\d]/g, ''));
      return { title, price: Number.isFinite(priceNum) ? priceNum : 0 };
    });
  }
  return [];
}

function buildWhatsMessage({ includeContact = true } = {}) {
  const nombre = (document.getElementById('wNombre')?.value || '').trim();
  const ciudad = (document.getElementById('wCiudad')?.value || '').trim();
  const msg = (document.getElementById('wMsg')?.value || '').trim();

  const items = getQuoteItems();

  const lines = [];
  if (includeContact && (nombre || ciudad)) {
    lines.push(`Hola, soy ${nombre || '—'}${ciudad ? ' de ' + ciudad : ''}.`, '');
  }

  lines.push('Estoy interesado en:');
  if (items.length) {
    lines.push(...items.map((i, k) => `  ${k + 1}. ${i.title} - $${i.price.toLocaleString('es-MX')} MXN`));
    const total = items.reduce((a, b) => a + (b.price || 0), 0);
    lines.push('', `Total estimado: $${total.toLocaleString('es-MX')} MXN`);
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

function updateWhatsLink() {
  wDirect.href = `https://wa.me/${WHATS_NUMBER}`;
}

['wNombre', 'wCiudad', 'wMsg'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateWhatsLink);
});


const grid = document.getElementById('grid');

function formatMXN(num) {
  return Number(num).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

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

  const SQL = await initSqlJs({
    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
  });


  const buf = await fetch('https://raw.githubusercontent.com/electrontechn-ctrl/Neonautasoficial/refs/heads/main/sources/data/data.db').then(r => r.arrayBuffer());
  const db = new SQL.Database(new Uint8Array(buf));


  const stmt = db.prepare(`
    SELECT id, title, description, price, size, category, tags, image_url, sizes_label
    FROM productos
    ORDER BY id ASC
  `);

  const items = [];
  while (stmt.step()) items.push(stmt.getAsObject());
  stmt.free();
  db.close();

  // Renderizar
  grid.innerHTML = items.map(productCardHTML).join('');


  setProductsFromDOM();
  document.querySelectorAll('.add-to-quote').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title;
      const price = parseFloat(btn.dataset.price || '0');
      addToQuote(title, price);
    });
  });


  isExpanded = false;
  filterProducts();
}

const fab = document.getElementById("fab");
const section = document.getElementById("catalogoimg");

// Observa cuándo la sección entra/sale del viewport
const io = new IntersectionObserver(entries => {
  const entry = entries[0];
  fab.classList.toggle('visible', entry.isIntersecting);
}, {
  threshold: 0.01     // con 1% de la sección ya se considera visible
  // rootMargin: "0px 0px -20% 0px"  // opcional para ajustar el punto de aparición
});

io.observe(section);


// Inicial
updateWhatsLink();
loadProducts();
renderQuote();

