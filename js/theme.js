/* Light / dark theme toggle. Preference is saved in localStorage; defaults to the OS setting. */
const Theme = {
  KEY: 'pp_theme',

  stored() {
    try { return localStorage.getItem(this.KEY); } catch { return null; }
  },

  current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e1613' : '#f6f5f1');
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const dark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = btn.getAttribute('aria-label');
      btn.innerHTML = `<i class="bi ${dark ? 'bi-sun' : 'bi-moon-stars'}" aria-hidden="true"></i>`;
    }
  },

  toggle() {
    const next = this.current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(this.KEY, next); } catch { /* private mode: still apply for this visit */ }
    this.apply(next);
  },

  init() {
    const saved = this.stored();
    const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light'));
  },

  bind() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    this.apply(this.current());
    btn.addEventListener('click', () => this.toggle());
  }
};

// Runs in <head> (CSP forbids inline scripts) so the saved theme is set before first paint.
Theme.init();
document.addEventListener('DOMContentLoaded', () => Theme.bind());
