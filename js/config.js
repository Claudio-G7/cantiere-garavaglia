/* Configurazione condivisa sito + pannello.
   Rileva da sola l'ambiente: in locale usa PocketBase locale, online quello di produzione. */
(function () {
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || host === '::1';
  window.BOSMAL = {
    // Backend PocketBase
    API_URL: isLocal ? 'http://127.0.0.1:8090' : 'https://api.cantieregaravaglia.it',
    COLLECTION: 'barche',
    // Fallback statici usati se l'API non risponde (resilienza)
    FALLBACK_JSON: 'data/barche.json',
    SITE_JSON: 'data/site.json'
  };
})();
