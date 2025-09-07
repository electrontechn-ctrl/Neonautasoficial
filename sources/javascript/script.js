// Año footer
document.getElementById('year').textContent = new Date().getFullYear();

// Toggle tema (persistente)
const themeToggle = document.getElementById('themeToggle');
const rootHtml = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) { rootHtml.setAttribute('data-bs-theme', savedTheme); }
themeToggle.addEventListener('click', () => {
    const current = rootHtml.getAttribute('data-bs-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    rootHtml.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
});

// Filtro catálogo
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sizeSelect = document.getElementById('sizeSelect');
const products = Array.from(document.querySelectorAll('.product'));

function filterProducts() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categorySelect.value;
    const size = sizeSelect.value;
    let visible = 0;
    products.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const tags = (card.dataset.tags || '').toLowerCase();
        const matchQ = !q || title.includes(q) || tags.includes(q);
        const matchC = !cat || card.dataset.category === cat;
        const matchS = !size || card.dataset.size === size;
        const show = matchQ && matchC && matchS;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    if (!document.getElementById('noResults')) {
        const p = document.createElement('p');
        p.id = 'noResults'; p.className = 'text-center text-secondary mt-3'; p.textContent = 'No se encontraron productos con esos filtros.';
        document.querySelector('#catalogo .container').appendChild(p);
    }
    document.getElementById('noResults').style.display = visible ? 'none' : '';
}
[searchInput, categorySelect, sizeSelect].forEach(el => el.addEventListener('input', filterProducts));

// Cotización simple (Offcanvas)
const quote = [];
const quoteList = document.getElementById('quoteList');
const quoteTotal = document.getElementById('quoteTotal');
const quoteCount = document.getElementById('quoteCount');
const mailtoQuote = document.getElementById('mailtoQuote');

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
    updateMailto();
}

function updateMailto() {
    const subject = encodeURIComponent('Cotización Letreros de Neón');
    const bodyLines = [
        'Hola, me interesa cotizar los siguientes productos:',
        ...quote.map((i, k) => `  ${k + 1}. ${i.title} - $${i.price.toLocaleString()} MXN`),
        '',
        'Total estimado: ' + quote.reduce((a, b) => a + b.price, 0).toLocaleString() + ' MXN',
        '',
        'Mis datos:', 'Nombre:', 'Teléfono:', 'Comentarios:'
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    mailtoQuote.href = `mailto:ventas@neonstudio.mx?subject=${subject}&body=${body}`;
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