/* ============================================
   STATISTICHE ANONIME - registra visite ed eventi su PocketBase (collezione `visite`)
   - niente cookie, niente IP, niente identificativi: solo pagina, provenienza, tipo di dispositivo
   - sessionStorage tiene un semplice segnale "visita gia' contata" (nessun codice univoco)
   - escludere il proprio browser (ufficio, test): aprire una pagina con ?nostat=1  (riattivare: ?nostat=0)
   - eventi dalle altre pagine: window.bosmalStat('galleria', 'Nome barca')
   ============================================ */
(function () {
  'use strict';

  var API = ((window.BOSMAL && window.BOSMAL.API_URL) || '').replace(/\/$/, '');
  var TIPI = ['pagina', 'galleria', 'richiesta_info', 'contatto_inviato', 'questionario_inviato', 'telefono', 'whatsapp', 'email'];
  var params = new URLSearchParams(location.search);

  function storage(kind) { try { return window[kind]; } catch (e) { return null; } }
  var local = storage('localStorage');
  var session = storage('sessionStorage');

  // esclusione volontaria del browser
  try {
    if (params.get('nostat') === '1') local.setItem('bosmal_nostat', '1');
    if (params.get('nostat') === '0') local.removeItem('bosmal_nostat');
  } catch (e) { /* ignora */ }

  var disattivato = !API ||
    /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor/i.test(navigator.userAgent) ||
    navigator.webdriver ||
    (function () { try { return local && local.getItem('bosmal_nostat') === '1'; } catch (e) { return false; } })();

  function dispositivo() {
    var ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Telefono';
    return 'Computer';
  }

  function pagina() {
    var p = location.pathname.replace(/\/index\.html$/, '/');
    return p.slice(0, 120) || '/';
  }

  // provenienza della visita: parametro utm_source (es. link nelle email), altrimenti il sito di provenienza
  function sorgente() {
    var utm = (params.get('utm_source') || '').trim();
    if (utm) return utm.slice(0, 60);
    if (!document.referrer) return 'Diretto';
    var host;
    try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { return 'Altro'; }
    if (host === location.hostname.replace(/^www\./, '')) return 'Interno';
    var noti = [
      [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/duckduckgo\.com$/, 'DuckDuckGo'],
      [/(^|\.)yahoo\./, 'Yahoo'], [/facebook\.com$|fb\.me$|fb\.com$/, 'Facebook'], [/instagram\.com$/, 'Instagram'],
      [/whatsapp\.(com|net)$|wa\.me$/, 'WhatsApp'], [/linkedin\.com$|lnkd\.in$/, 'LinkedIn'],
      [/t\.co$|twitter\.com$|x\.com$/, 'X / Twitter'], [/mail\.|outlook\.|webmail/, 'Email']
    ];
    for (var i = 0; i < noti.length; i++) if (noti[i][0].test(host)) return noti[i][1];
    return host.slice(0, 60);
  }

  function invia(tipo, dettaglio, extra) {
    if (disattivato || TIPI.indexOf(tipo) === -1) return;
    var body = { tipo: tipo, pagina: pagina(), dettaglio: String(dettaglio || '').slice(0, 150), dispositivo: dispositivo() };
    if (extra) for (var k in extra) body[k] = extra[k];
    try {
      fetch(API + '/api/collections/visite/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true            // arriva anche se l'utente sta lasciando la pagina
      }).catch(function () { /* statistiche: mai disturbare il visitatore */ });
    } catch (e) { /* ignora */ }
  }

  window.bosmalStat = invia;

  // --- pagina vista ---
  var nuova = true;
  try {
    nuova = !(session && session.getItem('bosmal_visita'));
    if (session) session.setItem('bosmal_visita', '1');
  } catch (e) { /* senza storage ogni pagina conta come nuova visita */ }
  var s = sorgente();
  if (s === 'Interno') nuova = false;
  invia('pagina', params.get('barca') || '', { nuova_sessione: nuova, sorgente: nuova ? s : '' });

  // --- clic su telefono, WhatsApp, email, "Richiedi info" ---
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/^tel:/i.test(href)) invia('telefono');
    else if (/wa\.me|whatsapp\.com/i.test(href)) invia('whatsapp');
    else if (/^mailto:/i.test(href)) invia('email');
    else if (/contatti\.html\?barca=/i.test(href)) {
      var barca = '';
      try { barca = new URL(a.href).searchParams.get('barca') || ''; } catch (err) { /* ignora */ }
      invia('richiesta_info', barca);
    }
  }, true);
})();
