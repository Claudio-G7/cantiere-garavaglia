/* ============================================
   SLIDER.JS - Hero Image Carousel
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero-slide');
  const indicators = document.querySelectorAll('.hero-indicators button');
  if (slides.length === 0) return;

  let current = 0;
  let interval;

  function goTo(index) {
    slides[current].classList.remove('active');
    if (indicators[current]) indicators[current].classList.remove('active');

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('active');
    if (indicators[current]) indicators[current].classList.add('active');
  }

  function next() {
    goTo(current + 1);
  }

  function startAutoplay() {
    interval = setInterval(next, 5000);
  }

  function stopAutoplay() {
    clearInterval(interval);
  }

  // Indicator clicks
  indicators.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      stopAutoplay();
      goTo(i);
      startAutoplay();
    });
  });

  // Pause on hover
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', stopAutoplay);
    hero.addEventListener('mouseleave', startAutoplay);
  }

  startAutoplay();

  // --- Video di sfondo: se parte, sostituisce lo slider ---
  const video = document.querySelector('.hero-video');
  if (!hero || !video) return;

  const riduciMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const risparmioDati = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  if (riduciMovimento || risparmioDati) return;     // resta lo slider di foto

  // schermo verticale (telefono) -> video verticale, altrimenti orizzontale
  const verticale = window.matchMedia('(max-aspect-ratio: 4/5)').matches;
  const tipo = verticale ? 'verticale' : 'orizzontale';
  video.poster = video.dataset[tipo + 'Poster'];
  video.src = video.dataset[tipo];
  video.preload = 'auto';

  video.addEventListener('playing', () => {
    hero.classList.add('hero--video');
    stopAutoplay();
    hero.removeEventListener('mouseleave', startAutoplay);
  }, { once: true });

  const avvia = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
  avvia();

  // pausa quando la parte alta non si vede o la scheda è in background (batteria e dati)
  let visibile = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((voci) => {
      visibile = voci[0].isIntersecting;
      if (visibile && !document.hidden) avvia(); else video.pause();
    }, { threshold: 0.05 }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else if (visibile) avvia();
  });
});
