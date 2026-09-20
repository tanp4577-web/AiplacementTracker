/* ============ Scroll & interaction animations ============
   Uses GSAP + ScrollTrigger (loaded via CDN in index.html). Cards fade/
   slide in as they appear, and list-style cards (job listings, quiz
   cards, lecture cards, etc. — anything inside a .grid) get a subtle
   mouse-follow 3D tilt.

   Several views render asynchronously (Hiring Hub fetches jobs, quizzes
   load questions, YouTube search re-renders results) — their cards don't
   exist yet at the moment the view first mounts. A MutationObserver
   watches each view's container and animates any new .card the moment
   it actually appears, however it got there.

   Respects prefers-reduced-motion: if the user has that OS setting on,
   this module does nothing at all — no fade, no tilt, content just
   appears normally.
   ========================================================================= */
const Animations = {
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  isTouch: window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768,
  ready: false,
  _observer: null,

  init() {
    if (this.reduced) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return; // CDN failed — fail silently
    gsap.registerPlugin(ScrollTrigger);
    this.ready = true;
    if (!this.isTouch) this._initParallax(); // scroll-linked parallax is desktop-only; skip the extra scroll listener on phones
  },

  /** Ambient background blobs drift slower/faster than the page scroll,
   *  a classic depth-of-field trick that makes the whole page feel 3D
   *  rather than flat, without interfering with any real content. */
  _initParallax() {
    const blobs = document.querySelectorAll('.ambient-blob');
    if (!blobs.length) return;
    blobs.forEach((blob, i) => {
      gsap.to(blob, {
        y: i % 2 === 0 ? -140 : 140,
        x: i % 2 === 0 ? 30 : -30,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.4
        }
      });
    });
  },

  /** Call this once, right after a view finishes (or starts) rendering into `container`. */
  applyTo(container) {
    if (this.reduced || !this.ready || !container) return;

    // Clear the previous view's ScrollTrigger instances and observer so
    // nothing leaks or double-fires as the user switches tabs.
    ScrollTrigger.getAll().forEach((t) => t.kill());
    if (this._observer) this._observer.disconnect();

    this._animateNewCards(container);

    this._observer = new MutationObserver(() => this._animateNewCards(container));
    this._observer.observe(container, { childList: true, subtree: true });
  },

  _animateNewCards(container) {
    const cards = Array.from(container.querySelectorAll('.card')).filter((c) => !c.dataset.animBound);
    if (!cards.length) return;
    cards.forEach((c) => { c.dataset.animBound = '1'; });

    gsap.set(cards, { opacity: 0, y: 34, scale: 0.97 });
    // ScrollTrigger.batch is safe to call repeatedly with different card
    // sets — each call creates its own triggers for just those elements,
    // and the dataset.animBound filter above stops any card being bound twice.
    ScrollTrigger.batch(cards, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: 'power3.out', stagger: 0.09 })
    });

    this._tiltGridCards(cards);
  },

  /** A smooth mouse-follow 3D tilt with a real "pop off the page" feel —
   *  desktop only (mousemove never fires on touch, so this would be dead
   *  weight on phones) — only on browsable item cards (job listings, quiz
   *  questions, lecture cards) that are direct children of a .grid. */
  _tiltGridCards(cards) {
    if (this.isTouch) return;
    cards.filter((c) => c.parentElement?.classList.contains('grid')).forEach((card) => {
      card.style.transformStyle = 'preserve-3d';
      card.style.willChange = 'transform';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: px * 10,
          rotateX: -py * 10,
          scale: 1.025,
          transformPerspective: 700,
          duration: 0.5,
          ease: 'power3.out'
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Animations.init());
