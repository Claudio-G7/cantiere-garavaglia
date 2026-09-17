/* ============================================
   QUESTIONARIO CLIENTI - salva le risposte su PocketBase (collezione `questionari`)
   - bozza automatica sul dispositivo (localStorage) per riprendere in seguito
   - sezioni rimessaggio/lavori nascoste se il cliente risponde "No"
   - codice cliente opzionale dal link: questionario.html?rif=ABC123
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('survey-form');
  if (!form) return;

  var DRAFT_KEY = 'questionario-2026-bozza';
  var alertBox = document.getElementById('form-alert');
  var thanks = document.getElementById('survey-thanks');
  var submitBtn = document.getElementById('submit-btn');

  // Codice cliente dal link (solo lettere, numeri, - e _; nessun dato personale nell'URL)
  var rif = (new URLSearchParams(location.search).get('rif') || '').trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(rif)) rif = '';

  // --- Stampa ---
  var printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  // --- Sezioni condizionali ---
  var bloccoMotivo = document.getElementById('blocco-motivo');
  var bloccoRimessaggio = document.getElementById('blocco-rimessaggio');
  var bloccoLavori = document.getElementById('blocco-lavori');

  function aggiornaSezioni() {
    var sel = form.querySelector('input[name="intenzione"]:checked');
    var no = !!sel && sel.value === 'No';
    bloccoMotivo.hidden = !no;
    bloccoRimessaggio.hidden = no;
    bloccoLavori.hidden = no;
  }

  // --- Lettura valori ---
  function radio(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function text(name) {
    var el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  }

  function raccogli() {
    var no = radio('intenzione') === 'No';
    var valutazioni = {};
    form.querySelectorAll('.rating').forEach(function (fs) {
      var el = fs.querySelector('input:checked');
      if (el) valutazioni[fs.getAttribute('data-aspetto')] = el.value;
    });
    var lavori = [];
    if (!no) {
      form.querySelectorAll('input[name="lavori"]:checked').forEach(function (el) { lavori.push(el.value); });
    }
    return {
      nome: text('nome'),
      telefono: text('telefono'),
      email: text('email'),
      contatto_preferito: radio('contatto_preferito'),
      rif: rif,
      valutazione_generale: radio('valutazione_generale'),
      valutazioni: valutazioni,
      suggerimenti: text('suggerimenti'),
      intenzione: radio('intenzione'),
      motivo_no: no ? text('motivo_no') : '',
      // se il cliente non rientra, i dati di rimessaggio/lavori non si inviano
      barca_modello: no ? '' : text('barca_modello'),
      lunghezza: no ? '' : text('lunghezza'),
      larghezza: no ? '' : text('larghezza'),
      rimessaggio: no ? '' : radio('rimessaggio'),
      periodo_ingresso: no ? '' : radio('periodo_ingresso'),
      periodo_varo: no ? '' : radio('periodo_varo'),
      lavori: lavori,
      lavori_altro: no ? '' : text('lavori_altro'),
      sopralluogo: !no && form.elements['sopralluogo'].checked,
      note: no ? '' : text('note')
    };
  }

  // --- Bozza sul dispositivo ---
  function salvaBozza() {
    try {
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name === '_gotcha' || el.type === 'submit' || el.type === 'button') return;
        if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else if (el.type === 'checkbox') {
          if (el.name === 'lavori') { data.lavori = data.lavori || []; if (el.checked) data.lavori.push(el.value); }
          else data[el.name] = el.checked;
        }
        else data[el.name] = el.value;
      });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (e) { /* storage non disponibile: nessun problema */ }
  }

  function caricaBozza() {
    var data;
    try { data = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { data = null; }
    if (!data) return;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in data)) return;
      var v = data[el.name];
      if (el.type === 'radio') el.checked = el.value === v;
      else if (el.type === 'checkbox') el.checked = el.name === 'lavori' ? (v || []).indexOf(el.value) !== -1 : !!v;
      else if (el.name !== '_gotcha') el.value = v;
    });
  }

  function cancellaBozza() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignora */ }
  }

  // --- Messaggi ---
  function mostraErrore(html, focusEl) {
    alertBox.innerHTML = html;
    alertBox.hidden = false;
    if (focusEl) {
      focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 400);
    } else {
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function segnaErrore(el, on) {
    var box = el.closest('.field') || el.closest('.choice');
    if (box) box.classList.toggle('field-error', on);
  }

  function valida() {
    var nome = form.elements['nome'];
    var tel = form.elements['telefono'];
    var email = form.elements['email'];
    var privacy = form.elements['privacy'];
    [nome, tel, email, privacy].forEach(function (el) { segnaErrore(el, false); });

    if (!nome.value.trim()) {
      segnaErrore(nome, true);
      mostraErrore('Per favore indichi <strong>nome e cognome</strong> nella sezione 4.', nome);
      return false;
    }
    if (!tel.value.trim() && !email.value.trim()) {
      segnaErrore(tel, true); segnaErrore(email, true);
      mostraErrore('Per favore indichi almeno un recapito: <strong>telefono oppure email</strong>.', tel);
      return false;
    }
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      segnaErrore(email, true);
      mostraErrore('L&rsquo;indirizzo email non sembra corretto: pu&ograve; controllarlo?', email);
      return false;
    }
    if (!privacy.checked) {
      segnaErrore(privacy, true);
      mostraErrore('Per inviare &egrave; necessario spuntare la casella dell&rsquo;<strong>informativa privacy</strong>.', privacy);
      return false;
    }
    return true;
  }

  // --- Eventi ---
  caricaBozza();
  aggiornaSezioni();

  form.addEventListener('change', function (e) {
    if (e.target.name === 'intenzione') aggiornaSezioni();
    if (e.target.closest && e.target.closest('.field-error')) segnaErrore(e.target, false);
    salvaBozza();
  });
  form.addEventListener('input', salvaBozza);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alertBox.hidden = true;

    // Honeypot: se compilato e' un bot -> finge successo senza salvare
    var gotcha = form.elements['_gotcha'];
    if (gotcha && gotcha.value) { mostraGrazie(); return; }

    if (!valida()) return;

    var label = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Invio in corso&hellip;';

    var API = ((window.BOSMAL && window.BOSMAL.API_URL) || '').replace(/\/$/, '');
    fetch(API + '/api/collections/questionari/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(raccogli())
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        cancellaBozza();
        if (window.bosmalStat) window.bosmalStat('questionario_inviato');
        mostraGrazie();
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = label;
        mostraErrore('Non &egrave; stato possibile inviare il questionario, probabilmente per un problema di connessione. ' +
          'Le Sue risposte <strong>non sono andate perse</strong>: riprovi tra qualche minuto, ' +
          'oppure ci chiami al <a href="tel:+393288168884">328 8168884</a>.');
      });
  });

  function mostraGrazie() {
    form.hidden = true;
    document.querySelector('.survey-intro').hidden = true;
    thanks.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    thanks.focus({ preventScroll: true });
  }
});
