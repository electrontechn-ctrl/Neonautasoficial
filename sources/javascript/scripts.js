// Año footer
document.getElementById('year').textContent = new Date().getFullYear();

// Filtro catálogo
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sizeSelect = document.getElementById('sizeSelect');

let products = [];
function setProductsFromDOM(){
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

function getQuoteItems(){
  if (typeof quote !== 'undefined' && Array.isArray(quote)) return quote;
  if (typeof window !== 'undefined' && Array.isArray(window.quote)) return window.quote;
  
  const lis = document.querySelectorAll('#quoteList li');
  if (lis.length) {
    return Array.from(lis).map(li => {
      const spans = li.querySelectorAll('span');
      const title = spans[0]?.textContent.trim() || '';
      const priceNum = Number((spans[1]?.textContent || '').replace(/[^\d]/g,''));
      return { title, price: Number.isFinite(priceNum) ? priceNum : 0 };
    });
  }
  return [];
}

function buildWhatsMessage({ includeContact = true } = {}) {
  const nombre = (document.getElementById('wNombre')?.value || '').trim();
  const ciudad = (document.getElementById('wCiudad')?.value || '').trim();
  const msg    = (document.getElementById('wMsg')?.value || '').trim();

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
  const url  = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(text)}`;
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

function formatMXN(num){
  return Number(num).toLocaleString('es-MX', {maximumFractionDigits:0});
}

function productCardHTML(p){
    
  return `
    <div class="col product" data-tags="${p.tags || ''}" data-category="${p.category || ''}" data-size="${p.size || ''}">
      <div class="card h-100">
        <div class="neon-thumb ratio ratio-1x1">
          <img src="${p.image_url}" alt="${p.title}" loading="lazy" decoding="async">
        </div>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${p.title}</h5>
          <p class="card-text text-secondary">${p.description || ''}</p>
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
                    data-sizes="${p.sizes_label || ''}"
              Detalles
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

async function loadProducts(){
    
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
  document.querySelectorAll('.add-to-quote').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const title = btn.dataset.title;
      const price = parseFloat(btn.dataset.price || '0');
      addToQuote(title, price);
    });
  });

  
  isExpanded = false;
  filterProducts();
}


(() => {
  /* ---------- Configuración ---------- */
  const FIXED_FONT_PX = 120; // tamaño constante del preview
  const SIZES = [
    {id:'50',  label:'50cm',  maxPerLine:8,  base: 60},
    {id:'70',  label:'70cm',  maxPerLine:11, base: 60},
    {id:'90',  label:'90cm',  maxPerLine:13, base: 60},
    {id:'100', label:'100cm', maxPerLine:16, base: 60},
    {id:'120', label:'120cm', maxPerLine:18, base: 60},
    {id:'150', label:'150cm', maxPerLine:22, base: 60},
    {id:'200', label:'200cm', maxPerLine:30, base: 60},
  ];
  const EXTRAS = { kit:249, dimmer:210, water:390, nfc:499 };
  const COLORS = ['#ff2b2b','#ff7a00','#ffcc00','#39ff14','#00e5ff','#3c7dff','#ff3cd2','#fff6a9','#ff7722','#a05bff','#4cffd5','#ffffff'];
  const FONTS = [
    {key:'electric-1', label:'Electric 1'}, {key:'electric-2', label:'Electric 2'},
    {key:'electric-3', label:'Electric 3'}, {key:'electric-4', label:'Electric 4'},
    {key:'electric-5', label:'Electric 5'}, {key:'electric-6', label:'Electric 6'},
    {key:'electric-7', label:'Electric 7'}, {key:'electric-8', label:'Electric 8'}
  ];

  /* ---------- Elementos ---------- */
  const $text = document.querySelector('#nd-text');
  const $sizes = document.querySelector('#nd-sizes');
  const $sizeHelp = document.querySelector('#nd-size-help');
  const $fonts = document.querySelector('#nd-fonts');
  const $colors = document.querySelector('#nd-colors');
  const $preview = document.querySelector('#nd-preview');
  const $bg = document.querySelector('#nd-bg');
  const $bgThumbs = document.querySelectorAll('.nd-bg-thumb');
  const $price = document.querySelector('#nd-price');
  const $widthLabel = document.querySelector('#nd-width-label');
  const $heightLabel = document.querySelector('#nd-height-label');
  const $target = document.querySelector('#nd-target');
  const $panel = document.querySelector('.nd-panel');

  const $kit = document.querySelector('#nd-kit');
  const $dimmer = document.querySelector('#nd-dimmer');
  const $water = document.querySelector('#nd-water');
  const $nfc = document.querySelector('#nd-nfc');
  const $finish = document.querySelector('#nd-finish');

  /* ---------- Estado ---------- */
  let currentSize = SIZES[5];          // 150 cm por defecto
  let currentFont = FONTS[0].key;      // cursiva por defecto
  let activeWordIndex = null;          // null = toda la frase
  let wordColors = {};                 // { "l-w": "#hex" }
  let bgName = 'Gradiente';

  /* ---------- Construcción UI ---------- */
  // Tamaños
  SIZES.forEach((s,i)=>{
    const col = document.createElement('div'); col.className = 'col-6 col-md-4';
    col.innerHTML = `
      <input class="btn-check" name="nd-size" id="sz-${s.id}" type="radio" ${i===5?'checked':''}>
      <label class="btn btn-outline-primary w-100" for="sz-${s.id}">${s.label}<br>
        <small class="text-muted">Máx. ${s.maxPerLine} letras/ren.</small>
      </label>`;
    $sizes.appendChild(col);
    col.querySelector('input').addEventListener('change', ()=>{
      currentSize = s; $widthLabel.textContent = `${s.label} · ${getFontLabel()}`;
      validateChars(); updatePrice(); layout();
      $dimmer.disabled = parseInt(s.id) > 70; if ($dimmer.disabled) {$dimmer.checked=false; updatePrice();}
    });
  });
  $sizeHelp.textContent = 'Las medidas pueden variar ±2–4 cm según tipografía.';

  // Fuentes
  FONTS.forEach((f,i)=>{
    const wrap = document.createElement('div'); wrap.className='col';
    const btn = document.createElement('button');
    btn.type='button'; btn.className = `btn btn-outline-secondary w-100 ${i===0?'active':''} font-${f.key}`;
    btn.dataset.font = f.label; btn.textContent = f.label;
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#nd-fonts .btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFont = f.key; renderText(); updatePrice(); // renderText -> layout
    });
    wrap.appendChild(btn); $fonts.appendChild(wrap);
  });

  // Colores
  COLORS.forEach((c,i)=>{
    const sw = document.createElement('button');
    sw.type='button'; sw.className='sw'; sw.style.background=c;
    if(i===0) sw.classList.add('active');
    sw.addEventListener('click', ()=>{
      document.querySelectorAll('#nd-colors .sw').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active'); applyColor(c);
    });
    $colors.appendChild(sw);
  });

  // Fondos
  $bgThumbs.forEach((b,i)=>{
    if (i===0) b.classList.add('active');
    if (b.dataset.bg.startsWith('url')) b.style.backgroundImage = b.dataset.bg;
    b.addEventListener('click', ()=>{
      $bgThumbs.forEach(x=>x.classList.remove('active')); b.classList.add('active');
      $bg.style.background = b.dataset.bg;
      bgName = b.dataset.bg.startsWith('url') ? (b.dataset.bg.match(/\/([^\/]+)\.\w+\)/)?.[1] || 'Fondo') : 'Gradiente';
    });
  });

  // Texto y extras
  $text.value = 'Noel Servando';
  $text.addEventListener('input', ()=>{ activeWordIndex=null; wordColors={}; targetLabel(); renderText(); updatePrice(); validateChars(); });

  [$kit,$dimmer,$water,$nfc].forEach(chk=>chk.addEventListener('change', updatePrice));
  $finish.addEventListener('click', showSummary);

  /* ---------- Render ---------- */
  renderText(); updatePrice(); validateChars(); syncPanelHeight();
  window.addEventListener('resize', layout);

  /* ---------- Funciones ---------- */
  function renderText(){
    const lines = $text.value.split('\n').map(s=>s.trim());
    $preview.className = `nd-preview font-${currentFont}`;
    const html = lines.map((line,l)=>{
      const words = line.split(/\s+/).filter(Boolean);
      return `<div class="nd-line">${words.map((w,wi)=>{
        const idx = `${l}-${wi}`;
        const color = wordColors[idx] || getCSS('--neon-color') || '#ff2b2b';
        return `<span class="word" style="--neon-color:${color}" data-idx="${idx}">${escapeHTML(w)}${wi<words.length-1?'&nbsp;':''}</span>`;
      }).join('')}</div>`;
    }).join('\n');

    $preview.innerHTML = `<div class="nd-textwrap" id="nd-tw">${html}</div>`;
    $preview.style.fontSize = FIXED_FONT_PX + 'px';
    $preview.style.setProperty('--tube', Math.max(4, FIXED_FONT_PX*0.09) + 'px');

    $preview.querySelectorAll('.word').forEach(el=>{
      el.addEventListener('click', (e)=>{
        e.stopPropagation();
        $preview.querySelectorAll('.word').forEach(w=>w.classList.remove('active'));
        el.classList.add('active');
        activeWordIndex = el.dataset.idx; targetLabel(); layout();
      });
    });
    $preview.addEventListener('click', ()=>{
      $preview.querySelectorAll('.word').forEach(w=>w.classList.remove('active'));
      activeWordIndex = null; targetLabel(); layout();
    });

    layout(); // coloca cotas
  }

  function applyColor(hex){
    if (activeWordIndex==null){
      document.documentElement.style.setProperty('--neon-color', hex);
      wordColors = {};
    } else {
      wordColors[activeWordIndex] = hex;
    }
    renderText();
  }

  function targetLabel(){
    document.querySelector('#nd-target b').textContent = activeWordIndex==null ? 'Toda la frase' : `Palabra ${activeWordIndex}`;
  }

  function validateChars(){
    const lines = $text.value.split('\n');
    const max = currentSize.maxPerLine;
    const over = lines.some(l=> l.replace(/\s+/g,'').length > max);
    $sizeHelp.classList.toggle('text-danger', over);
    $sizeHelp.innerHTML = over
      ? `Has excedido el máximo de ${max} letras por renglón para ${currentSize.label}.`
      : `Máximo recomendado: ${max} letras por renglón.`;
  }

  function layout(){
    positionRulers();
    syncPanelHeight();
  }

  function positionRulers(){
    const stage = document.querySelector('.nd-stage');
    const textEl = document.querySelector('#nd-tw');
    if(!stage || !textEl) return;

    const sRect = stage.getBoundingClientRect();
    const tRect = textEl.getBoundingClientRect();

    // Regla horizontal: justo bajo el texto
    const rh = document.querySelector('.nd-ruler-h');
    rh.style.left   = (tRect.left - sRect.left) + 'px';
    rh.style.right  = (sRect.right - tRect.right) + 'px';
    rh.style.bottom = '72px';

    // Regla vertical: junto al borde izquierdo del texto
    const rv = document.querySelector('.nd-ruler-v');
    const leftPos = Math.max(8, tRect.left - sRect.left - 14);
    rv.style.left   = leftPos + 'px';
    rv.style.top    = (tRect.top - sRect.top) + 'px';
    rv.style.bottom = (sRect.bottom - tRect.bottom - 110) + 'px';

    // Etiquetas
    const widthCm = parseInt(currentSize.id,10);
    const heightCm = Math.max(1, Math.round((tRect.height / Math.max(1,tRect.width)) * widthCm));
    $widthLabel.textContent  = `${widthCm}cm · ${getFontLabel()}`;
    $heightLabel.textContent = `${heightCm}cm`;
  }

  function updatePrice(){
    const w = parseInt(currentSize.id,10);
    const base = w * currentSize.base;
    const extras = (+$kit.checked)*EXTRAS.kit + (+$dimmer.checked)*EXTRAS.dimmer + (+$water.checked)*EXTRAS.water + (+$nfc.checked)*EXTRAS.nfc;
    const total = base + extras;
    $price.textContent = total.toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  }

  function showSummary(){
    const lines = $text.value.split('\n').map(s=>s.trim()).filter(Boolean);
    const colorGlobal = getCSS('--neon-color') || '#ff2b2b';
    const colorChips = Object.entries(wordColors).map(([idx,col])=>{
      const [l,w] = idx.split('-').map(Number);
      const word = (lines[l]||'').split(/\s+/)[w] || '—';
      return `<span class="badge me-2 mb-2" style="background:${col}; color:#000; border:1px solid #0003">${escapeHTML(word)}</span>`;
    }).join('') || '<span class="text-muted">Sin colores por palabra (usa color global)</span>';

    const extras = [
      $kit.checked && 'Kit de instalación',
      $dimmer.checked && 'Dimmer',
      $water.checked && 'Waterproof IP65',
      $nfc.checked && 'Tecnología NFC'
    ].filter(Boolean).join(', ') || 'Ninguno';

    const html = `
      <div class="row g-3">
        <div class="col-md-7">
          <div class="border rounded p-3">
            <div class="small text-muted mb-2">Vista previa</div>
            <div class="text-center" style="background:#111; border-radius:.5rem; padding:16px">
              <span class="${$preview.className.replace('nd-preview','').trim()}"
                    style="font-size:42px; color:${colorGlobal}; -webkit-text-stroke:6px rgba(255,255,255,.9);
                    text-shadow:0 0 2px ${colorGlobal},0 0 8px ${colorGlobal},0 0 16px ${colorGlobal},0 0 36px ${colorGlobal};">
                ${escapeHTML(lines.join(' '))}
              </span>
            </div>
          </div>
        </div>
        <div class="col-md-5">
          <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between"><span>Tamaño</span><strong>${currentSize.label}</strong></li>
            <li class="list-group-item d-flex justify-content-between"><span>Tipografía</span><strong>${getFontLabel()}</strong></li>
            <li class="list-group-item">
              <div class="mb-1">Color global</div>
              <div class="d-flex align-items-center gap-2">
                <span style="width:22px;height:22px;border-radius:6px;background:${colorGlobal};display:inline-block;border:1px solid #0003"></span>
                <code class="small">${colorGlobal}</code>
              </div>
            </li>
            <li class="list-group-item">
              <div class="mb-1">Colores por palabra</div>
              <div>${colorChips}</div>
            </li>
            <li class="list-group-item d-flex justify-content-between"><span>Fondo</span><strong>${bgName}</strong></li>
            <li class="list-group-item"><span class="me-2">Extras:</span><strong>${extras}</strong></li>
            <li class="list-group-item d-flex justify-content-between"><span>Total estimado</span><strong>${$price.textContent}</strong></li>
          </ul>
        </div>
      </div>`;
    document.querySelector('#nd-summary-body').innerHTML = html;

    // Mostrar modal (requiere Bootstrap 5 JS)
    const m = new bootstrap.Modal(document.getElementById('ndSummary'));
    m.show();
  }

  function syncPanelHeight(){
    const stage = document.querySelector('.nd-stage');
    const h = Math.max(520, stage.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--ndPanelH', h + 'px');
  }

  function getFontLabel(){
    return [...document.querySelectorAll('#nd-fonts .btn')]
      .find(b=>b.classList.contains('active'))?.dataset.font || 'Electric 1';
  }

  function escapeHTML(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) }
  function getCSS(varName){ return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }
})();










// Inicial
updateWhatsLink();
loadProducts();
renderQuote();

