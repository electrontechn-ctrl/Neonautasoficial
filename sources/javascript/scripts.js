// Año footer
document.getElementById('year').textContent = new Date().getFullYear();

// Filtro catálogo
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sizeSelect = document.getElementById('sizeSelect');
const products = Array.from(document.querySelectorAll('.product'));

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function filterProducts() {
    const q = norm(searchInput.value.trim());
    const cat = norm(categorySelect.value);
    const size = sizeSelect.value; // S, M, L o ""

    let visible = 0;
    products.forEach(card => {
        const title = norm(card.querySelector('.card-title')?.textContent || '');
        const tags = norm(card.dataset.tags || '');
        const category = norm(card.dataset.category || '');
        const sizeAttr = (card.dataset.size || '');

        const matchQ = !q || title.includes(q) || tags.includes(q);
        const matchC = !cat || category === cat;
        const matchS = !size || sizeAttr === size;

        const show = matchQ && matchC && matchS;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    if (!document.getElementById('noResults')) {
        const p = document.createElement('p');
        p.id = 'noResults';
        p.className = 'text-center text-secondary mt-3';
        p.textContent = 'No se encontraron productos con esos filtros.';
        document.querySelector('#catalogo .container').appendChild(p);
    }
    document.getElementById('noResults').style.display = visible ? 'none' : '';
}
searchInput.addEventListener('input', filterProducts);
[categorySelect, sizeSelect].forEach(el => {
    el.addEventListener('change', filterProducts);
    el.addEventListener('input', filterProducts);
});

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

const waNumber = '524428124789';

function sendWhatsApp(e) {
    e.preventDefault();
    const nombre = document.getElementById('wNombre').value.trim();
    const ciudad = document.getElementById('wCiudad').value.trim();
    const msg = document.getElementById('wMsg').value.trim();

    // Incluye selección del carrito si existe en la página
    let items = '';
    if (window.quote && Array.isArray(quote) && quote.length) {
        items = '\n\nSeleccionados:\n' + quote.map((i, k) => `  ${k + 1}. ${i.title} - $${(i.price || 0).toLocaleString()} MXN`).join('\n');
        items += '\nTotal estimado: $' + quote.reduce((a, b) => a + (b.price || 0), 0).toLocaleString() + ' MXN';
    }

    const texto = `Hola, soy ${nombre}${ciudad ? ' de ' + ciudad : ''}.\n` +
        `Quiero cotizar un letrero de neón.\n` +
        (msg ? `Detalles: ${msg}\n` : '') +
        items + `\n\nDesde: ${location.href}`;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener');

    // link auxiliar "Abrir chat"
    const wDirect = document.getElementById('wDirect');
    if (wDirect) wDirect.href = url;
}

// Inicial
filterProducts();
renderQuote();