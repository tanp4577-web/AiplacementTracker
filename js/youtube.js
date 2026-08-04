/* ============ YouTube Playlists (Lectures) Module ============ */
const Youtube = {
  state: {
    category: 'all',
    search: ''
  },

  render(container) {
    this.container = container;
    this.state = { category: 'all', search: '' };
    this._renderHome();
  },

  _renderHome() {
    const cats = YOUTUBE_DATA.categories;
    const active = this.state.category;

    // Filter playlists
    const filtered = YOUTUBE_DATA.playlists.filter(p => {
      const matchCat = active === 'all' || p.category === active;
      const matchSearch = !this.state.search
        || p.title.toLowerCase().includes(this.state.search.toLowerCase())
        || p.channel.toLowerCase().includes(this.state.search.toLowerCase())
        || p.desc.toLowerCase().includes(this.state.search.toLowerCase());
      return matchCat && matchSearch;
    });

    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between" style="flex-wrap:wrap;gap:12px">
          <div>
            <div class="card-title">
              <span style="color:var(--accent)">${ICONS.pattern('svg-window')}</span>
              YouTube Lecture Playlists
            </div>
            <div class="card-sub">Curated top-rated English tutorials for Coding, DevOps, AI/ML, SDE & Data</div>
          </div>
          <div class="yt-search">
            <input type="search" id="ytSearch" placeholder="Search lectures, channels..." value="${this.state.search}" />
          </div>
        </div>
      </div>

      <div class="yt-cats mb-2">
        ${cats.map(c => `
          <button class="yt-cat ${active === c.id ? 'active' : ''}" data-cat="${c.id}">
            ${c.label}
            <span class="yt-cat-count">${c.id === 'all' ? YOUTUBE_DATA.playlists.length : YOUTUBE_DATA.playlists.filter(p => p.category === c.id).length}</span>
          </button>
        `).join('')}
      </div>

      <div class="yt-grid" id="ytGrid">
        ${filtered.map(p => this._card(p)).join('') || '<div class="empty-state"><h3>No lectures found</h3><p>Try a different category or search term</p></div>'}
      </div>
    `;

    // Category tabs
    document.querySelectorAll('.yt-cat').forEach(el => {
      el.addEventListener('click', () => {
        this.state.category = el.dataset.cat;
        this._renderHome();
      });
    });

    // Search
    document.getElementById('ytSearch').addEventListener('input', (e) => {
      this.state.search = e.target.value;
      this._renderHome();
    });

    // Open player
    document.querySelectorAll('[data-play]').forEach(el => {
      el.addEventListener('click', () => this._openPlayer(el.dataset.play));
    });
  },

  _card(p) {
    return `
      <div class="yt-card" data-play="${p.id}">
        <div class="yt-thumb">
          <img src="${p.thumbnail}" alt="${p.title}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'" />
          <span class="yt-duration">${p.duration}</span>
          <span class="yt-playbtn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </span>
        </div>
        <div class="yt-body">
          <div class="yt-title">${p.title}</div>
          <div class="yt-channel">
            <span class="yt-avatar">${p.channel.charAt(0)}</span>
            ${p.channel}
          </div>
          <div class="yt-meta">
            <span>${p.views} views</span>
            <span class="yt-dot">•</span>
            <span>${p.rating} ★</span>
          </div>
          <div class="yt-desc">${p.desc}</div>
        </div>
      </div>
    `;
  },

  _openPlayer(id) {
    const p = YOUTUBE_DATA.playlists.find(x => x.id === id);
    if (!p) return;

    // Player modal
    const overlay = document.createElement('div');
    overlay.className = 'yt-player-overlay';
    overlay.innerHTML = `
      <div class="yt-player-modal">
        <div class="yt-player-head">
          <div>
            <div class="yt-player-title">${p.title}</div>
            <div class="yt-player-channel">${p.channel} • ${p.rating} ★ rating</div>
          </div>
          <button class="yt-player-close" aria-label="Close">&times;</button>
        </div>
        <div class="yt-player-frame">
          <iframe src="${p.url}?autoplay=1&rel=0" title="${p.title}" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
        <div class="yt-player-info">
          <div class="yt-desc">${p.desc}</div>
          <div class="flex gap-1 mt-1" style="flex-wrap:wrap">
            <span class="chip red">${p.duration}</span>
            <span class="chip blue">${p.views} views</span>
            <span class="chip green">${p.rating} ★ rating</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('.yt-player-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }
};
