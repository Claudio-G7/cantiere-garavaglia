/* Rendering della vetrina a partire dai dati (PocketBase con fallback su barche.json).
   Include la gallery/lightbox a tutto schermo delle foto di ogni barca. */
(function () {
  'use strict';

  var cfg = window.BOSMAL || {};
  var API = (cfg.API_URL || '').replace(/\/$/, '');
  var COLLECTION = cfg.COLLECTION || 'barche';
  var FALLBACK = cfg.FALLBACK_JSON || 'data/barche.json';

  var grid = document.querySelector('.vetrina-grid');
  if (!grid) return;

  var BOATS = [];

  // --- Caricamento dati: prima l'API PocketBase, poi il JSON statico di scorta.
  loadFromApi()
    .then(render)
    .catch(function () {
      loadFallback().then(render).catch(function () {
        grid.innerHTML = '<p class="vetrina-loading">Al momento non è possibile caricare le imbarcazioni. ' +
          '<a href="contatti.html" style="color:var(--gold)">Contattaci</a>.</p>';
      });
    });

  function loadFromApi() {
    if (!API) return Promise.reject();
    var url = API + '/api/collections/' + encodeURIComponent(COLLECTION) +
      '/records?perPage=200&filter=' + encodeURIComponent('pubblicata=true') +
      '&sort=ordine,-created';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('api');
      return r.json();
    }).then(function (data) { return (data.items || []).map(normalizeApi); });
  }

  function loadFallback() {
    return fetch(FALLBACK).then(function (r) {
      if (!r.ok) throw new Error('fallback');
      return r.json();
    }).then(function (items) {
      return items.filter(function (b) { return b.pubblicata !== false; }).map(normalizeJson);
    });
  }

  // --- Normalizzazione: record PocketBase -> oggetto barca uniforme (+ gallery).
  function normalizeApi(rec) {
    var foto = Array.isArray(rec.foto) ? rec.foto : (rec.foto ? [rec.foto] : []);
    var base = API + '/api/files/' + rec.collectionId + '/' + rec.id + '/';
    return build(rec, {
      coverUrl: foto.length ? base + foto[0] + '?thumb=600x450' : placeholder(),
      gallery: foto.map(function (fn) { return base + fn + '?thumb=1600x1600f'; })
    });
  }

  // --- Normalizzazione: voce JSON statica -> stesso oggetto uniforme (+ gallery).
  function normalizeJson(b) {
    var foto = Array.isArray(b.foto) ? b.foto : [];
    return build(b, {
      coverUrl: b.cover || foto[0] || placeholder(),
      gallery: foto.length ? foto.slice() : (b.cover ? [b.cover] : [])
    });
  }

  function build(src, extra) {
    return {
      nome: src.nome, marca: src.marca || 'altro', tag: src.tag || '',
      in_evidenza: !!src.in_evidenza, anno: src.anno || null,
      lunghezza: src.lunghezza || '', larghezza: src.larghezza || '', motori: src.motori || '',
      cabine: src.cabine || '', bagni: src.bagni || '', posti_letto: src.posti_letto || '',
      carburante: src.carburante || '', categoria: src.categoria || '',
      extra: Array.isArray(src.extra) ? src.extra : [],
      descrizione: src.descrizione || '',
      coverUrl: extra.coverUrl, gallery: extra.gallery
    };
  }

  // --- Rendering schede + filtri + click gallery.
  function render(boats) {
    BOATS = boats;
    if (!boats.length) {
      grid.innerHTML = '<p class="vetrina-loading">Nessuna imbarcazione disponibile al momento.</p>';
      return;
    }
    grid.innerHTML = boats.map(card).join('');
    wireFilters();
    wireGallery();
  }

  function card(b, i) {
    var count = b.gallery.length;
    return '' +
      '<div class="boat-card" data-brand="' + esc(b.marca) + '">' +
        '<div class="boat-image" data-idx="' + i + '"' + (count ? ' role="button" tabindex="0" aria-label="Apri le foto di ' + esc(b.nome) + '"' : '') + '>' +
          '<img src="' + esc(b.coverUrl) + '" alt="' + esc(b.nome) + '" loading="lazy">' +
          (b.tag ? '<span class="boat-tag">' + esc(b.tag) + '</span>' : '') +
          (count > 1 ? '<span class="boat-gallery-badge">&#128247; ' + count + ' foto</span>' : '') +
        '</div>' +
        '<div class="boat-info">' +
          '<h3>' + esc(b.nome) + '</h3>' +
          '<div class="boat-specs-full">' + specs(b) + '</div>' +
          '<p style="font-size:0.82rem; color:var(--text-light); margin-bottom:16px;">' + esc(b.descrizione) + '</p>' +
          '<a href="contatti.html?barca=' + encodeURIComponent(b.nome) + '" class="btn btn-dark btn-sm">Richiedi Info &rarr;</a>' +
        '</div>' +
      '</div>';
  }

  function specs(b) {
    var rows = [];
    if (b.anno) rows.push(['Anno', b.anno]);
    if (b.lunghezza) rows.push(['Lungh.', b.lunghezza]);
    if (b.larghezza) rows.push(['Largh.', b.larghezza]);
    if (b.motori) rows.push(['Motori', b.motori]);
    if (b.cabine) rows.push(['Cabine', b.cabine]);
    if (b.bagni) rows.push(['Bagni', b.bagni]);
    if (b.posti_letto) rows.push(['Posti letto', b.posti_letto]);
    if (b.carburante) rows.push(['Carb.', b.carburante]);
    if (b.categoria) rows.push(['Cat.', b.categoria]);
    (b.extra || []).forEach(function (e) { if (e && e.label && e.value) rows.push([e.label, e.value]); });
    return rows.map(function (r) {
      return '<div class="boat-spec"><strong>' + esc(r[0]) + ':</strong> ' + esc(r[1]) + '</div>';
    }).join('');
  }

  function wireFilters() {
    var filterBtns = document.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('.boat-card[data-brand]');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.dataset.filter;
        cards.forEach(function (c) {
          c.style.display = (filter === 'all' || c.dataset.brand === filter) ? '' : 'none';
        });
      });
    });
  }

  function wireGallery() {
    grid.querySelectorAll('.boat-image[data-idx]').forEach(function (el) {
      var open = function () {
        var b = BOATS[+el.dataset.idx];
        if (b && b.gallery.length) Lightbox.open(b.gallery, 0, b.nome);
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  // ============ LIGHTBOX ============
  var Lightbox = (function () {
    var root, imgEl, capEl, counterEl, images = [], idx = 0;

    function ensure() {
      if (root) return;
      root = document.createElement('div');
      root.className = 'lb';
      root.innerHTML =
        '<button class="lb-close" aria-label="Chiudi">&times;</button>' +
        '<button class="lb-nav lb-prev" aria-label="Precedente">&#10094;</button>' +
        '<figure class="lb-stage"><img alt=""><figcaption></figcaption></figure>' +
        '<button class="lb-nav lb-next" aria-label="Successiva">&#10095;</button>' +
        '<span class="lb-counter"></span>';
      document.body.appendChild(root);
      imgEl = root.querySelector('img');
      capEl = root.querySelector('figcaption');
      counterEl = root.querySelector('.lb-counter');
      root.querySelector('.lb-close').addEventListener('click', close);
      root.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
      root.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
      root.addEventListener('click', function (e) { if (e.target === root) close(); });
      document.addEventListener('keydown', function (e) {
        if (!root.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
      });
    }

    function show() {
      imgEl.src = images[idx];
      counterEl.textContent = (idx + 1) + ' / ' + images.length;
      var multi = images.length > 1;
      root.querySelector('.lb-prev').style.display = multi ? '' : 'none';
      root.querySelector('.lb-next').style.display = multi ? '' : 'none';
      counterEl.style.display = multi ? '' : 'none';
    }
    function step(d) { idx = (idx + d + images.length) % images.length; show(); }
    function open(imgs, start, caption) {
      ensure(); images = imgs; idx = start || 0;
      capEl.textContent = caption || '';
      show(); root.classList.add('open'); document.body.style.overflow = 'hidden';
    }
    function close() { root.classList.remove('open'); imgEl.src = ''; document.body.style.overflow = ''; }
    return { open: open };
  })();

  function placeholder() { return 'images/boats/placeholder.jpg'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
