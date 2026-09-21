/* ============ Calm entrance animation ============
   Cards fade in with a very small upward move (10px, 0.3s) when a view first appears or
   when data finishes loading. There is no zoom, no 3D tilt, no bounce and no scroll
   parallax: nothing ever moves toward the user or keeps moving in the background.

   Cards that are re-created because the user typed, clicked or changed a filter are shown
   as they are (no replay). prefers-reduced-motion turns everything off.
   ================================================ */
const Animations = {
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ready: false,
  _observer: null,
  _seenIds: new Set(),
  _lastInteraction: -Infinity,

  init() {
    ['input', 'change', 'keydown', 'click'].forEach((type) =>
      document.addEventListener(type, () => { this._lastInteraction = performance.now(); }, true));
    if (this.reduced || typeof gsap === 'undefined') return; // CDN failed: content simply appears
    this.ready = true;
  },

  /** Call once after a view has rendered into `container`. */
  applyTo(container) {
    if (this.reduced || !this.ready || !container) return;
    if (this._observer) this._observer.disconnect();
    this._seenIds = new Set();
    this._lastInteraction = -Infinity;

    this._animateNewCards(container);
    // Views that load data later (jobs, quizzes) add cards after the first pass.
    this._observer = new MutationObserver(() => this._animateNewCards(container));
    this._observer.observe(container, { childList: true, subtree: true });
  },

  _animateNewCards(container) {
    const cards = Array.from(container.querySelectorAll('.card')).filter((card) => {
      if (card.dataset.animBound) return false;
      card.dataset.animBound = '1';
      if (card.id) {
        if (this._seenIds.has(card.id)) return false; // same stable card re-created by the view itself
        this._seenIds.add(card.id);
      }
      return true;
    });
    if (!cards.length) return;

    // Re-rendered because of something the user just did: show the cards as they are.
    if (performance.now() - this._lastInteraction < 400) return;

    gsap.set(cards, { opacity: 0, y: 10 });
    gsap.to(cards, { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out', stagger: 0.025, clearProps: 'opacity,transform' });
  }
};

document.addEventListener('DOMContentLoaded', () => Animations.init());
