(() => {
  'use strict';
  // =====================================================
  // Neon Builder — versión optimizada y refactorizada
  // - Menos lecturas del DOM (cache de nodos)
  // - Menos reflows: usa DocumentFragment y rAF
  // - Utilidades reusables y helpers
  // - Manejo robusto de listeners y guards
  // - Misma API/IDs, comportamiento equivalente
  // =====================================================

  // -------------------------- Utils --------------------------





  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const toPx = v => `${Math.round(v)}px`;
  const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const primaryFont = (s) => (s || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  const getFS = (el) => parseFloat(getComputedStyle(el).fontSize) || 0;

  // --------------------- Configuración -----------------------
  const ACRYLIC_RATE_CM2 = 0.06;   // $/cm²
  const LED_RATE_M = 26;           // $/m
  const POWER_SUPPLY_USD = 60;     // costo fijo
  const MISC_FIXED_USD = 40;       // consumibles
  const PROFIT_FACTOR = 1 + (2 / 3);

  const ACRYLIC_MARGIN_CM = 3;     // margen acrílico por lado

  const LED_LENGTH_FACTORS = {     // reservado para ajustes por fuente
    'Neon1': 1.25,
    'Neon2': 1.15,
    'Neon3': 1.10,
  };

  const DIMENSION_MULTIPLIERS = {  // multiplicadores por fuente
    'Neon1': { w: 1, h: 1 },
    'Neon2': { w: 1, h: 1.8 },
    'Neon3': { w: 1, h: 1 }
  };

  const CLEARANCE_FACTORS = {      // gap bajo la última línea
    'Neon1': { base: 0.0, desc: 0.24 },
    'Neon2': { base: 0.0, desc: 0.08 },
    'Neon3': { base: 0.0, desc: 0.06 },
    'Pacifico': { base: 0.34, desc: 0.46 },
    'Poppins': { base: 0.22, desc: 0.30 },
    'Playfair Display': { base: 0.28, desc: 0.38 },
  };
  const DEFAULT_CLEARANCE_FACTOR = { base: 0.32, desc: 0.44 };

  const PALETTE = [
    { label: 'Blanco frío', color: '#ffffff' },
    { label: 'Blanco cálido', color: '#ffe7b2' },
    { label: 'Amarillo limón', color: '#f6ff00' },
    { label: 'Amarillo dorado', color: '#ffd200' },
    { label: 'Verde', color: '#39ff14' },
    { label: 'Rojo', color: '#ff3333' },
    { label: 'Morado', color: '#a970ff' },
    { label: 'Azul rey', color: '#1e3aff' },
    { label: 'Azul hielo', color: '#7bdfff' },
    { label: 'Naranja', color: '#ff7a00' },
  ];

  const FONT_SIZES = { 'Neon1': 90, 'Neon2': 100, 'Neon3': 100 };
  const DEFAULT_FONT_PX = 64;

  const SIZE_LIMITS = {
    50: { maxCharsPerLine: 8, maxLines: 2, basePrice: 1890 },
    70: { maxCharsPerLine: 11, maxLines: 2, basePrice: 2290 },
    90: { maxCharsPerLine: 13, maxLines: 2, basePrice: 2790 },
    100: { maxCharsPerLine: 16, maxLines: 2, basePrice: 3290 },
    120: { maxCharsPerLine: 18, maxLines: 2, basePrice: 3990 },
    150: { maxCharsPerLine: 22, maxLines: 2, basePrice: 4890 },
  };

  const BACKGROUNDS = [
    { id: 'living', label: 'Sala', src: 'sources/img/bg/fondooscuro.jpg', thumb: 'sources/img/bg/fondooscuro.jpg' },
    { id: 'restaurant', label: 'Blanco', src: 'sources/img/bg/fondoluminoso.jpg', thumb: 'sources/img/bg/fondoluminoso.jpg' },
    { id: 'party', label: 'Césped', src: 'sources/img/bg/fondofiesta.jpg', thumb: 'sources/img/bg/fondofiesta.jpg' },
  ];

  const SCALE_BASE = { w: 1200, h: 540, min: 0.60, max: 1.40 };

  // WhatsApp fijo
  const WHATSAPP_NUMBER = '524428124789';

  // Cloudinary (unsigned)
  const CLOUDINARY_CLOUD = 'dangyk0wz';       // <- tu cloud name
  const CLOUDINARY_PRESET = 'storagehml';      // <- tu upload preset (Unsigned)
  const CLOUDINARY_FOLDER = 'Designs';         // <- carpeta (opcional)
  const WA_API_ENDPOINT = 'https://neonautas-what.noesecrangel.workers.dev'; // ← pon aquí tu URL



  (async () => {
    const fd = new FormData();
    fd.append('file', new Blob(['ok'], { type: 'text/plain' }));
    fd.append('upload_preset', CLOUDINARY_PRESET);
    if (CLOUDINARY_FOLDER) fd.append('folder', CLOUDINARY_FOLDER);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, { method: 'POST', body: fd });
    console.log(await r.json());
  })();

  // ------------------------- Estado --------------------------
  const state = {
    lines: [],
    size: 50,
    color: '#ff4d6d',
    font: 'Neon1, system-ui, sans-serif',
    wordStyles: {}, // { [lineIndex]: { [wordIndex]: { color, font } } }
    scale: 1,
    dimensions: { widthCm: 0, heightCm: 0 },
    costBreakdown: null,
  };

  // ---------------------- Cache de nodos ---------------------
  const root = qs('#neon-builder');
  const preview = qs('#nbPreview');
  const canvasEl = qs('.nb-canvas');
  const textInput = qs('#nbText');
  const textHelp = qs('#nbTextHelp');
  const sizes = qsa('.nb-size');
  const priceEl = qs('#nbPrice');
  const validateEl = qs('#nbValidation');
  const finalizeBtn = qs('#nbFinalize');
  const fontSelect = qs('#nbFont');
  const bgLayer = qs('#nbBg');
  const bgPickerWrap = qs('#nbBgPicker');
  const globalColorsWrap = qs('#nbGlobalColors');

  const dimH = qs('#nbDimH');
  const dimV = qs('#nbDimV');
  const hLabel = qs('#nbDimHLabel');
  const vLabel = qs('#nbDimVLabel');

  // Popover por palabra
  const wordPopover = qs('#nbWordPopover');
  const wordFontSel = qs('#nbWordFont');
  const wordColorBtn = qs('#nbWordColorBtn');
  const wordColorsMenu = qs('#nbWordColorsMenu');
  let selectedWord = null;
  let globalColorBtns = [];

  // ----------------- Observers / Resize control ---------------
  const ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    const sW = width / SCALE_BASE.w;
    const sH = height / SCALE_BASE.h;
    const newScale = clamp(Math.min(sW, sH), SCALE_BASE.min, SCALE_BASE.max);
    if (Math.abs(newScale - state.scale) > 0.02) {
      state.scale = newScale;
      renderAll();
    }
  });
  if (canvasEl) ro.observe(canvasEl);

  let _resizeRaf = 0;
  const rerenderOnResize = () => { cancelAnimationFrame(_resizeRaf); _resizeRaf = requestAnimationFrame(renderAll); };
  on(window, 'resize', rerenderOnResize, { passive: true });
  on(window, 'orientationchange', rerenderOnResize, { passive: true });

  // ------------------- Lógica de medidas ----------------------
  function getDimensionMultiplier(box) {
    // Fuente dominante = mayor font-size en bloque
    let fam = primaryFont(state.font);
    let maxFs = 0;
    box?.querySelectorAll('.nb-word')?.forEach(w => {
      const fs = getFS(w);
      if (fs > maxFs) { maxFs = fs; fam = primaryFont(getComputedStyle(w).fontFamily); }
    });
    return DIMENSION_MULTIPLIERS[fam] || { w: 1, h: 1 };
  }

  function computeDynamicClearancePx(box) {
    const lastLine = box?.querySelector('.nb-line:last-child');
    if (!lastLine) return 24;

    // Detecta descendentes en texto real de la última línea
    const hasDesc = /[gjpqy]/.test(lastLine.textContent || '');

    // Elemento con mayor font-size en la última línea
    let target = lastLine;
    let maxSize = getFS(lastLine);
    lastLine.querySelectorAll('.nb-word').forEach(w => {
      const fs = getFS(w);
      if (fs > maxSize) { maxSize = fs; target = w; }
    });

    const fam = primaryFont(getComputedStyle(target).fontFamily);
    const factors = CLEARANCE_FACTORS[fam] || DEFAULT_CLEARANCE_FACTOR;
    const factor = hasDesc ? factors.desc : factors.base;
    return Math.round(maxSize * factor);
  }

  // ---------------------- Construcción UI ---------------------
  function buildBgPicker() {
    if (!bgPickerWrap) return;
    const frag = document.createDocumentFragment();
    BACKGROUNDS.forEach((bg, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `nb-bg-thumb${i === 0 ? ' is-active' : ''}`;
      b.title = bg.label || '';
      b.dataset.src = bg.src;
      b.style.backgroundImage = `url('${bg.thumb || bg.src}')`;
      frag.appendChild(b);
    });
    bgPickerWrap.innerHTML = '';
    bgPickerWrap.appendChild(frag);

    // Delegación
    on(bgPickerWrap, 'click', (e) => {
      const btn = e.target.closest('.nb-bg-thumb');
      if (!btn) return;
      qsa('.nb-bg-thumb', bgPickerWrap).forEach(n => n.classList.remove('is-active'));
      btn.classList.add('is-active');
      setBackground(btn.dataset.src);
    });
  }

  function setBackground(src) {
    if (!bgLayer) return;
    bgLayer.style.backgroundImage = `url('${src}')`;
    bgLayer.style.backgroundPosition = 'center';
    bgLayer.style.backgroundSize = 'cover';
  }

  function buildGlobalColors() {
    if (!globalColorsWrap) return;
    const frag = document.createDocumentFragment();
    PALETTE.forEach(p => {
      const b = document.createElement('button');
      b.className = 'nb-color';
      b.dataset.color = p.color;
      b.title = p.label.toUpperCase();
      b.style.setProperty('--c', p.color);
      frag.appendChild(b);
    });
    globalColorsWrap.innerHTML = '';
    globalColorsWrap.appendChild(frag);
    globalColorBtns = qsa('.nb-color', globalColorsWrap);

    on(globalColorsWrap, 'click', (e) => {
      const btn = e.target.closest('.nb-color');
      if (!btn) return;
      const c = btn.dataset.color;
      state.color = c;
      clearWordOverrides('color');
      globalColorBtns.forEach(n => n.classList.toggle('is-active', n === btn));
      renderAll();
    });
  }

  function buildWordMenu() {
    if (!wordColorsMenu) return;
    const frag = document.createDocumentFragment();
    PALETTE.forEach(p => {
      const b = document.createElement('button');
      b.className = 'nb-swatch';
      b.dataset.color = p.color;
      b.title = p.label.toUpperCase();
      b.style.setProperty('--c', p.color);
      frag.appendChild(b);
    });
    wordColorsMenu.innerHTML = '';
    wordColorsMenu.appendChild(frag);
  }

  // --------------------- Render de preview --------------------
  function splitLines(raw) {
    const lim = (SIZE_LIMITS[state.size] || {}).maxLines || 3;
    return (raw || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, lim);
  }

  function updatePreview() {
    if (!preview) return;
    preview.style.setProperty('--nb-color', state.color);
    const box = document.createElement('div');
    box.className = 'nb-textbox';
    box.id = 'nbTextBox';

    const frag = document.createDocumentFragment();

    state.lines.forEach((line, li) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'nb-line';
      lineEl.style.fontFamily = state.font;

      const lineKey = primaryFont(state.font);
      const linePx = ((FONT_SIZES[lineKey] || DEFAULT_FONT_PX) * state.scale);
      lineEl.style.fontSize = toPx(linePx);

      const tokens = line.split(/(\s+)/);
      let wi = 0;
      tokens.forEach(tok => {
        if (/^\s+$/.test(tok)) {
          lineEl.appendChild(document.createTextNode(tok));
        } else {
          const wordEl = document.createElement('span');
          wordEl.className = 'nb-word';
          wordEl.textContent = tok;
          wordEl.dataset.lineIndex = li;
          wordEl.dataset.wordIndex = wi;

          const st = (state.wordStyles[li] && state.wordStyles[li][wi]) || {};
          if (st.color) wordEl.style.setProperty('--word-color', st.color);
          if (st.font) {
            wordEl.style.fontFamily = st.font;
            const wk = primaryFont(st.font);
            wordEl.style.fontSize = toPx(((FONT_SIZES[wk] || (linePx / state.scale)) * state.scale));
          } else {
            wordEl.style.removeProperty('font-size');
          }
          lineEl.appendChild(wordEl);
          wi++;
        }
      });
      frag.appendChild(lineEl);
    });

    box.appendChild(frag);
    preview.innerHTML = '';
    preview.appendChild(box);
  }

  function updateCotas() {
    const box = qs('#nbTextBox');
    if (!canvasEl || !box || !dimH || !dimV) return;

    if (!state.lines.length) { dimH.hidden = true; dimV.hidden = true; return; }

    const cR = canvasEl.getBoundingClientRect();
    const bR = box.getBoundingClientRect();

    let left = bR.left - cR.left;
    let top = bR.top - cR.top;
    let width = bR.width;
    let height = bR.height;

    left = clamp(left, 0, Math.max(0, cR.width - 1));
    top = clamp(top, 0, Math.max(0, cR.height - 1));
    width = clamp(width, 0, Math.max(0, cR.width - left));
    height = clamp(height, 0, Math.max(0, cR.height - top));

    const clearance = computeDynamicClearancePx(box);

    // Horizontal
    const baselineY = clamp(top + height + clearance, 0, cR.height - 28);
    dimH.style.left = toPx(left);
    dimH.style.top = toPx(baselineY);
    dimH.style.width = toPx(width);
    dimH.hidden = false;

    // Vertical
    const vHeightPx = clamp(height + clearance, 0, cR.height - top);
    const x = clamp(left - 28, 0, cR.width - 28);
    dimV.style.left = toPx(x);
    dimV.style.top = toPx(top);
    dimV.style.height = toPx(vHeightPx);
    dimV.hidden = false;

    // px → cm según ancho seleccionado
    const ratioCmPerPx = width > 0 ? (state.size / width) : 0;
    const widthCmRaw = Math.round(width * ratioCmPerPx);
    const heightCmRaw = Math.max(1, Math.round(vHeightPx * ratioCmPerPx));

    const { w: mulW, h: mulH } = getDimensionMultiplier(box);
    const widthCmAdj = Math.round(widthCmRaw * mulW);
    const heightCmAdj = Math.round(heightCmRaw * mulH);

    hLabel && (hLabel.textContent = `${widthCmAdj} cm`);
    vLabel && (vLabel.textContent = `${heightCmAdj} cm`);

    state.dimensions = { widthCm: widthCmAdj, heightCm: heightCmAdj };
  }

  // --------------------- Popover selección --------------------
  function positionPopover(target) {
    if (!root || !wordPopover) return;
    const rootRect = root.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const top = r.bottom - rootRect.top + 8;
    const left = Math.max(8, r.left - rootRect.left);
    wordPopover.style.top = toPx(top);
    wordPopover.style.left = toPx(left);
  }

  function selectWord(el) {
    selectedWord?.classList.remove('is-selected');
    selectedWord = el;
    selectedWord.classList.add('is-selected');

    const li = +el.dataset.lineIndex, wi = +el.dataset.wordIndex;
    const st = (state.wordStyles[li] && state.wordStyles[li][wi]) || {};

    if (wordFontSel) wordFontSel.value = st.font || 'Neon1, system-ui, sans-serif';
    const currentColor = st.color || state.color;
    wordColorBtn?.style.setProperty('--c', currentColor);

    if (wordColorsMenu) { wordColorsMenu.hidden = true; wordColorBtn?.setAttribute('aria-expanded', 'false'); }

    positionPopover(selectedWord);
    wordPopover && (wordPopover.hidden = false);
  }

  function clearSelection() {
    selectedWord?.classList.remove('is-selected');
    selectedWord = null;
    if (wordPopover) wordPopover.hidden = true;
    if (wordColorsMenu) { wordColorsMenu.hidden = true; wordColorBtn?.setAttribute('aria-expanded', 'false'); }
  }

  // -------------------- Pricing & Validación ------------------
  function calcPrice() {
    if (!state.lines.length) return 0;
    const { widthCm, heightCm } = state.dimensions || {};
    if (!widthCm || !heightCm) return 0;

    // ACRÍLICO
    const acrylicW = widthCm + (ACRYLIC_MARGIN_CM * 2);
    const acrylicH = heightCm + (ACRYLIC_MARGIN_CM * 2);
    const acrylicAreaCm2 = Math.max(0, Math.round(acrylicW * acrylicH));
    const acrylicCost = acrylicAreaCm2 * ACRYLIC_RATE_CM2;

    // LED (criterio proporcional al área)
    const ledLengthCm = acrylicAreaCm2 / 3.2; // ajustable
    const ledLengthM = ledLengthCm / 100;
    const ledCost = ledLengthM * LED_RATE_M;

    // FIJOS
    const fixedCost = POWER_SUPPLY_USD + MISC_FIXED_USD;

    // FINAL
    const subtotal = acrylicCost + ledCost + fixedCost;
    const finalPrice = Math.round(subtotal * PROFIT_FACTOR);

    state.costBreakdown = { acrylicAreaCm2, acrylicCost, ledLengthCm, ledLengthM, ledCost, fixedCost, subtotal, finalPrice };
    return finalPrice;
  }

  function validate() {
    const lim = SIZE_LIMITS[state.size] || { maxCharsPerLine: 12, maxLines: 2 };
    let err = '';
    if (!state.lines.length) err = 'Escribe tu frase para comenzar.';
    else if (state.lines.length > lim.maxLines) err = `Para ${state.size}cm el máximo es de ${lim.maxLines} renglones.`;
    else {
      const over = state.lines.find(l => l.replace(/\s+/g, '').length > lim.maxCharsPerLine);
      if (over) {
        const extra = over.replace(/\s+/g, '').length - lim.maxCharsPerLine;
        err = `Para ${state.size}cm el máximo es de ${lim.maxCharsPerLine} letras por renglón. Te sobran ${extra}.`;
      }
    }
    if (validateEl) {
      validateEl.textContent = err;
      validateEl.hidden = !err;
    }
    if (finalizeBtn) finalizeBtn.disabled = !!err;
    if (textHelp) textHelp.textContent = `Máximo ${lim.maxCharsPerLine} letras por renglón • Máx. ${lim.maxLines} renglones`;
  }



/* ========= WhatsApp Cloud API (vía Cloudflare Worker) ========= */
const WA_API_ENDPOINT = 'https://TU-WORKER.workers.dev';   // <-- tu URL pública

// Envío por tu Worker (Cloud API)
async function sendViaWhatsAppAPI(blob, message, to = '524428124789') {
  const fd = new FormData();
  fd.append('file', new File([blob], 'neon-preview.png', { type: 'image/png' }));
  fd.append('message', message);
  fd.append('to', to);
  const res = await fetch(WA_API_ENDPOINT, { method: 'POST', body: fd });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(`WA API error: ${JSON.stringify(data)}`);
  return data;
}

/* ========= Captura del preview ========= */
// Si ya tienes capturePreviewBlob() no dupliques; usa esta versión.
async function capturePreviewBlob() {
  const node = document.querySelector('.nb-canvas');
  if (!node || !window.html2canvas) throw new Error('html2canvas no disponible');

  // Si usas selección por palabra, ciérrala para que no salga en la captura
  try { clearSelection?.(); } catch {}

  await (document.fonts?.ready ?? Promise.resolve());
  await new Promise(r => requestAnimationFrame(r));

  const canvas = await html2canvas(node, {
    useCORS: true,
    backgroundColor: null,
    scale: window.devicePixelRatio,
    logging: false
  });

  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png', 1));
}

/* ========= Fallback 100% front-end (móvil: Web Share / escritorio: descarga + wa.me) ========= */
async function sharePreviewToFixedWhatsApp() {
  const blob = await capturePreviewBlob();
  if (!blob) throw new Error('No se pudo generar la imagen');

  const file = new File([blob], 'neon-preview.png', { type: 'image/png' });

  // Ajusta estos campos a tu estado actual:
  const msg =
    `Hola 👋, me gustaría cotizar este diseño de neón.\n` +
    `Medidas aprox: ${(state?.dimensions?.widthCm ?? state?.size) ?? ''}×${state?.dimensions?.heightCm ?? '—'} cm\n` +
    `Tamaño seleccionado: ${state?.size ?? ''} cm de ancho.\n` +
    `Precio estimado: ${typeof calcPrice==='function' ? fmtMXN.format(calcPrice()) : ''}\n` +
    `Fuente: ${typeof primaryFont==='function' ? primaryFont(state?.font) : ''} • Color: ${state?.color ?? ''}`;

  // Móvil con Web Share API: adjunta la imagen directo a WhatsApp
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: msg, title: 'Cotización Letrero Neón' });
      return;
    } catch (e) { console.warn('Share cancelado/falló, uso descarga + wa.me', e); }
  }

  // Fallback: descarga la imagen y abre chat con el texto
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'neon-preview.png'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 15000);

  const WAPP_TO = '524428124789';
  const u = `https://wa.me/${WAPP_TO}?text=${encodeURIComponent(
    msg + '\n\n(La imagen se descargó automáticamente; adjúntala por favor)'
  )}`;
  window.open(u, '_blank', 'noopener,noreferrer');
}

/* ========= (Opcional) estado de carga en el botón ========= */
function setLoadingSending(isLoading){
  const btn = document.getElementById('nbFinalize');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Enviando…' : 'Finalizar';
}





  // -------------------- Ciclo de renderizado ------------------
  let _rafId = 0;
  function renderAll() {
    updatePreview();
    cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(() => {
      updateCotas();
      if (priceEl) priceEl.textContent = `${fmtMXN.format(calcPrice())} MXN`;
      validate();
    });
  }

  // ------------------------- Eventos -------------------------
  on(preview, 'click', (e) => {
    const word = e.target.closest('.nb-word');
    if (!word) return;
    e.stopPropagation();
    selectWord(word);
  });

  on(document, 'click', (e) => {
    // cerrar menú de color si está abierto
    if (wordColorsMenu && !wordColorsMenu.hidden &&
      !e.target.closest('#nbWordColorsMenu') &&
      !e.target.closest('#nbWordColorBtn')) {
      wordColorsMenu.hidden = true;
      wordColorBtn?.setAttribute('aria-expanded', 'false');
    }
    // cerrar popover si clic fuera
    if (wordPopover && !wordPopover.hidden &&
      !e.target.closest('.nb-popover') &&
      !e.target.closest('.nb-word')) {
      clearSelection();
    }
  });

  on(wordColorBtn, 'click', (e) => {
    e.stopPropagation();
    const open = wordColorsMenu && wordColorsMenu.hidden === false;
    if (wordColorsMenu) wordColorsMenu.hidden = open;
    wordColorBtn?.setAttribute('aria-expanded', String(!open));
  });

  on(wordColorsMenu, 'click', (e) => {
    const b = e.target.closest('.nb-swatch');
    if (!b || !selectedWord) return;
    const col = b.dataset.color;
    const li = +selectedWord.dataset.lineIndex, wi = +selectedWord.dataset.wordIndex;
    state.wordStyles[li] ||= {}; state.wordStyles[li][wi] ||= {};
    state.wordStyles[li][wi].color = col;
    selectedWord.style.setProperty('--word-color', col);
    wordColorBtn?.style.setProperty('--c', col);
    if (wordColorsMenu) { wordColorsMenu.hidden = true; wordColorBtn?.setAttribute('aria-expanded', 'false'); }
    globalColorBtns.forEach(btn => btn.classList.remove('is-active'));
  });

  on(wordFontSel, 'change', () => {
    if (!selectedWord) return;
    const li = +selectedWord.dataset.lineIndex, wi = +selectedWord.dataset.wordIndex;
    state.wordStyles[li] ||= {}; state.wordStyles[li][wi] ||= {};
    state.wordStyles[li][wi].font = wordFontSel.value;
    selectedWord.style.fontFamily = wordFontSel.value;
    const wk = primaryFont(wordFontSel.value);
    const parentFS = getFS(selectedWord.parentElement) || DEFAULT_FONT_PX;
    // Mantiene consistencia con escalado global
    selectedWord.style.fontSize = toPx(((FONT_SIZES[wk] || (parentFS / state.scale)) * state.scale));
  });

  on(textInput, 'input', () => { state.lines = splitLines(textInput.value); clearSelection(); renderAll(); });
  sizes.forEach(btn => on(btn, 'click', () => { state.size = parseInt(btn.dataset.size, 10); clearSelection(); sizes.forEach(n => n.classList.toggle('is-active', n === btn)); renderAll(); }));
  on(fontSelect, 'change', () => { state.font = fontSelect.value; clearWordOverrides('font'); renderAll(); });
  on(finalizeBtn, 'click', async () => {
    setLoadingSending(true);
    try {
      const blob = await capturePreviewBlob(); // genera imagen del preview

      const msg =
        `Hola 👋, me gustaría cotizar este diseño de neón.\n` +
        `Medidas aprox: ${state.dimensions?.widthCm ?? state.size}×${state.dimensions?.heightCm ?? '—'} cm\n` +
        `Tamaño: ${state.size} cm • Precio: ${fmtMXN.format(calcPrice())}\n` +
        `Fuente: ${primaryFont(state.font)} • Color: ${state.color}`;

      await sendViaWhatsAppAPI(blob, msg, '524428124789'); // ← Envía por Cloud API
      alert('Enviado por WhatsApp API ✅');
    } catch (e) {
      console.warn('WA API falló, usando fallback...', e);
      // Fallback 100% front-end (móvil: comparte; escritorio: descarga + abre chat)
      await sharePreviewToFixedWhatsApp();
    } finally {
      setLoadingSending(false);
    }
  });


  // ------------------------- Helpers -------------------------
  // Nombre: (YYYY-MM-DD-HH-mm-ss)-design.jpg  (zona horaria local)
  function getDesignFilename() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    return `${ts}-design.jpg`;
  }

  async function uploadToCloudinary(blob, filename) {
    // Usa /image/upload (puedes usar /auto/upload también)
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

    const fd = new FormData();
    fd.append('file', blob);
    fd.append('upload_preset', CLOUDINARY_PRESET); // debe existir y ser Unsigned
    if (CLOUDINARY_FOLDER) fd.append('folder', CLOUDINARY_FOLDER);

    // Nombre estable (sin extensión). Si no lo necesitas, puedes omitir public_id.
    fd.append('public_id', filename.replace(/\.[^.]+$/, ''));

    // Si tu preset tiene "Unique filename: true", no afecta cuando envías public_id.
    // (Si ya existe un asset con mismo public_id y overwrite=false, fallará)
    // fd.append('overwrite', 'true'); // <- solo si tu preset permite sobrescritura

    const res = await fetch(url, { method: 'POST', body: fd });
    const text = await res.text();
    if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${text}`);
    return JSON.parse(text); // { secure_url, public_id, ... }
  }


  function openWhatsAppWithLink(link) {
    const text = `Este es el diseño que requiere:\n${link}`;
    const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  }



  function clearWordOverrides(type) {
    Object.keys(state.wordStyles).forEach(li => {
      Object.keys(state.wordStyles[li]).forEach(wi => {
        if (type === 'color') delete state.wordStyles[li][wi].color;
        if (type === 'font') delete state.wordStyles[li][wi].font;
        if (!Object.keys(state.wordStyles[li][wi]).length) delete state.wordStyles[li][wi];
      });
      if (!Object.keys(state.wordStyles[li] || {}).length) delete state.wordStyles[li];
    });
  }

  function setLoadingSending(isLoading) {
    const btn = document.getElementById('nbFinalize');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Enviando…' : 'Finalizar';
  }


  // Captura el preview a JPG (evita “tainted” asegurando que el fondo sea local/DataURL)
  async function capturePreviewBlob(mime = 'image/jpeg', quality = 0.92) {
    const node = document.querySelector('.nb-canvas');
    if (!node || !window.html2canvas) throw new Error('html2canvas no disponible');

    try { clearSelection?.(); } catch { }
    await (document.fonts?.ready ?? Promise.resolve());
    await new Promise(r => requestAnimationFrame(r));

    // (opcional) montar cotas dentro del canvas antes de capturar
    const restore = (() => {
      const canvas = document.querySelector('.nb-canvas');
      const dimH = document.getElementById('nbDimH');
      const dimV = document.getElementById('nbDimV');
      const pH = dimH?.parentNode, nH = dimH?.nextSibling;
      const pV = dimV?.parentNode, nV = dimV?.nextSibling;
      if (canvas && dimH) canvas.appendChild(dimH);
      if (canvas && dimV) canvas.appendChild(dimV);
      return () => {
        if (pH && dimH) pH.insertBefore(dimH, nH);
        if (pV && dimV) pV.insertBefore(dimV, nV);
      };
    })();

    try {
      const canvas = await html2canvas(node, {
        useCORS: true,
        backgroundColor: '#0b0f18',     // o null si quieres transparencia
        scale: window.devicePixelRatio,
        logging: false
      });
      return new Promise(resolve => canvas.toBlob(b => resolve(b), mime, quality));
    } finally {
      restore();
    }
  }

  async function saveDesignLocally(blob, filename) {
    // File System Access API (Chrome/Edge/Opera con HTTPS)
    if ('showDirectoryPicker' in window && window.isSecureContext) {
      try {
        // El usuario elige una carpeta "raíz" (p.ej. Descargas o Documentos)
        const rootDir = await window.showDirectoryPicker({ id: 'neon-designs', mode: 'readwrite' });
        // Creamos/abrimos la subcarpeta Designs
        const designsDir = await rootDir.getDirectoryHandle('Designs', { create: true });
        const fileHandle = await designsDir.getFileHandle(filename, { create: true });
        const stream = await fileHandle.createWritable();
        await stream.write(blob);
        await stream.close();
        return { ok: true, method: 'fs', filename };
      } catch (e) {
        console.warn('FS Access falló, uso descarga como fallback:', e);
        // cae al fallback de descarga
      }
    }

    async function sendViaWhatsAppAPI(blob, message, to = '524428124789') {
      const fd = new FormData();
      fd.append('file', new File([blob], 'neon-preview.png', { type: 'image/png' }));
      fd.append('message', message);
      fd.append('to', to);

      const res = await fetch(WA_API_ENDPOINT, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`WA API error: ${JSON.stringify(data)}`);
      return data;
    }



    // Fallback universal: descarga (el navegador no puede crear carpetas reales desde <a download>)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Designs_${filename}`; // sugerencia en el nombre
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    return { ok: true, method: 'download', filename };
  }


  // ------------------------- Init ----------------------------
  function init() {
    buildBgPicker();
    setBackground(BACKGROUNDS[0].src);
    buildGlobalColors();
    buildWordMenu();
    state.lines = splitLines('Crea tu frase');
    renderAll();
  }

  init();
})();
