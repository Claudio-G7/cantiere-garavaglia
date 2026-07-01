/* Inietta i dati di contatto (telefono, email, indirizzo, ecc.) gestiti dal pannello.
   Strategia: confronta i valori salvati con i default statici (data/site.json) e,
   dove differiscono, li sostituisce in tutta la pagina (link e testi).
   Se il backend non risponde o nulla e' cambiato, la pagina resta com'e'. */
(function () {
  'use strict';
  var cfg = window.BOSMAL || {};
  var API = (cfg.API_URL || '').replace(/\/$/, '');
  var DEFAULTS_URL = (cfg.SITE_JSON || 'data/site.json');

  // i default servono come "valori da cercare" nel markup statico
  fetch(relTo(DEFAULTS_URL)).then(function (r) { return r.json(); }).then(function (def) {
    loadSettings(def).then(function (cur) { apply(def, cur); });
  }).catch(function () { /* nessun default: non faccio nulla */ });

  function loadSettings(def) {
    if (!API) return Promise.resolve(def);
    var url = API + '/api/collections/impostazioni/records?perPage=1';
    return fetch(url).then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (d) {
      var rec = (d.items || [])[0];
      return rec ? merge(def, rec) : def;
    }).catch(function () { return def; });
  }

  function merge(def, rec) {
    var out = {};
    Object.keys(def).forEach(function (k) { out[k] = (rec[k] != null && rec[k] !== '') ? rec[k] : def[k]; });
    return out;
  }

  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function tel(s) { return '+39' + digits(s); }

  function apply(def, cur) {
    // coppie testo da sostituire ovunque (vecchio -> nuovo), solo se diversi
    var textPairs = [];
    ['indirizzo', 'ragione_sociale', 'piva', 'orari', 'email', 'telefono_fisso', 'cellulare'].forEach(function (k) {
      if (def[k] && cur[k] && def[k] !== cur[k]) textPairs.push([def[k], cur[k]]);
    });

    // coppie negli attributi href (tel/mailto/wa.me)
    var hrefPairs = [];
    if (digits(def.telefono_fisso) !== digits(cur.telefono_fisso)) hrefPairs.push([tel(def.telefono_fisso), tel(cur.telefono_fisso)]);
    if (digits(def.cellulare) !== digits(cur.cellulare)) hrefPairs.push([tel(def.cellulare), tel(cur.cellulare)]);
    if (def.email !== cur.email) hrefPairs.push(['mailto:' + def.email, 'mailto:' + cur.email]);
    if (digits(def.whatsapp) !== digits(cur.whatsapp)) hrefPairs.push(['wa.me/' + digits(def.whatsapp), 'wa.me/' + digits(cur.whatsapp)]);

    if (!textPairs.length && !hrefPairs.length) return;

    // aggiorna gli href dei link
    if (hrefPairs.length) {
      [].forEach.call(document.querySelectorAll('a[href]'), function (a) {
        var h = a.getAttribute('href');
        hrefPairs.forEach(function (p) { if (h.indexOf(p[0]) !== -1) h = h.split(p[0]).join(p[1]); });
        a.setAttribute('href', h);
      });
    }

    // aggiorna i nodi di testo
    if (textPairs.length) {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var t = n.nodeValue;
        textPairs.forEach(function (p) { if (t.indexOf(p[0]) !== -1) t = t.split(p[0]).join(p[1]); });
        if (t !== n.nodeValue) n.nodeValue = t;
      });
    }
  }

  // risolve il path del JSON sia da pagine root sia da sottocartelle (es. /admin/)
  function relTo(p) {
    if (/^https?:|^\//.test(p)) return p;
    return location.pathname.indexOf('/admin/') !== -1 ? '../' + p : p;
  }
})();
