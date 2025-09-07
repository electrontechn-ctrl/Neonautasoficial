// Año footer
document.getElementById('year').textContent = new Date().getFullYear();

// Filtro catálogo (con "Mostrar más")
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sizeSelect = document.getElementById('sizeSelect');
const products = Array.from(document.querySelectorAll('.product'));

const MAX_VISIBLE = 4; // cambia este número si quieres mostrar menos/más al inicio
let isExpanded = false;

const showMoreContainer = document.getElementById('showMoreContainer');
const showMoreBtn = document.getElementById('showMoreBtn');

// Normaliza texto: minúsculas y sin acentos para búsquedas más robustas
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function filterProducts() {
    const q = norm(searchInput.value.trim());
    const cat = norm(categorySelect.value);
    const size = sizeSelect.value; // S, M, L o ""

    let matches = 0; // cuántos cumplen filtros
    let shown = 0;   // cuántos se muestran (colapsado o expandido)

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

    // Botón "Más" visible solo si hay más de MAX_VISIBLE coincidencias y aún está colapsado
    if (showMoreContainer) {
        showMoreContainer.style.display = (matches > MAX_VISIBLE) ? '' : 'none';
    }
    if (showMoreBtn) {
        showMoreBtn.textContent = isExpanded ? 'Mostrar menos' : 'Mostrar más';
    }
}

// Click en "Más" -> expandir y ocultar el botón
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

// Al cambiar filtros o buscar, colapsa de nuevo
function resetAndFilter() { isExpanded = false; filterProducts(); }
searchInput.addEventListener('input', resetAndFilter);
;[categorySelect, sizeSelect].forEach(el => { el.addEventListener('change', resetAndFilter); el.addEventListener('input', resetAndFilter); });

// Inicial
filterProducts();

// Cotización simple (Offcanvas)
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

// Modal Detalles (carga dinámica)
const detailsModal = document.getElementById('detailsModal');
detailsModal.addEventListener('show.bs.modal', (ev) => {
    const btn = ev.relatedTarget;
    if (!btn) return;
    document.getElementById('detailsTitle').textContent = btn.dataset.title || 'Detalles';
    document.getElementById('detailsDesc').textContent = btn.dataset.description || '';
    document.getElementById('detailsSize').textContent = btn.dataset.sizes || '';
    document.getElementById('detailsEta').textContent = btn.dataset.eta || '';
    document.getElementById('detailsPrice').textContent = btn.dataset.price ? `$${Number(btn.dataset.price).toLocaleString()}` : '';
});

// Form contacto -> abre mailto con mensaje + items seleccionados
function prepMail(e) {
    e.preventDefault();
    const nombre = document.getElementById('cNombre').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const msg = document.getElementById('cMsg').value.trim();
    const subject = encodeURIComponent(`Cotización | ${nombre}`);
    const items = quote.map((i, k) => `  ${k + 1}. ${i.title} - $${i.price.toLocaleString()} MXN`).join('\n');
    const body = encodeURIComponent(`Hola,\n\nSoy ${nombre} (${email}).\n\nEstoy interesado en: \n${items || '— (aún sin selección)'}\n\nMensaje adicional:\n${msg}\n\nGracias.`);
    window.location.href = `mailto:ventas@neonstudio.mx?subject=${subject}&body=${body}`;
}
window.prepMail = prepMail;

// Inicial
filterProducts();
renderQuote();