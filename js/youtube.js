/* ============================================================================
   YouTube Lectures Module v2  —  PlacementPrep
   Full URL parser (watch / youtu.be / embed), completion tracker,
   topic filter, search, progress indicators, fallback "Watch on YouTube" button.
   ============================================================================ */
const Youtube = {
  state: {
    category: 'all',
    search: '',
    completedSet: null   // Set of completed playlist IDs (loaded from storage)
  },

  /* ─── Persistent completion tracking ─── */
  _loadCompleted() {
    try {
      const raw = localStorage.getItem('prepportal_yt_completed');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  },

  _saveCompleted() {
    try {
      localStorage.setItem('prepportal_yt_completed', JSON.stringify([...this.state.completedSet]));
    } catch {}
  },

  _toggleComplete(id) {
    if (this.state.completedSet.has(id)) {
      this.state.completedSet.delete(id);
    } else {
      this.state.completedSet.add(id);
    }
    this._saveCompleted();
    this._refreshProgress();
  },

  /* ─── URL Parser / Sanitizer ─── */
  _parseVideoId(url) {
    if (!url) return null;
    try {
      // Already an embed URL  ->  extract video id
      const embedMatch = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
      // Standard watch  -> https://www.youtube.com/watch?v=VIDEO_ID
      const watchMatch = url.match(/youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/);
      if (watchMatch) return watchMatch[1];
      // Shortened  ->  https://youtu.be/VIDEO_ID
      const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
      if (shortMatch) return shortMatch[1];
      // Playlist/feature variants
      const genericMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      if (genericMatch) return genericMatch[1];
    } catch {}
    return null;
  },

  _buildEmbedUrl(url, autoplay = false) {
    const id = this._parseVideoId(url);
    if (!id) return null;
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    params.set('rel', '0');
    params.set('modestbranding', '1');
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  },

  _buildWatchUrl(url) {
    const id = this._parseVideoId(url);
    return id ? `https://www.youtube.com/watch?v=${id}` : (url || '#');
  },

  /* ─── Entry point ─── */
  render(container) {
    this.container = container;
    this.state.category = 'all';
    this.state.search = '';
    this.state.completedSet = this._loadCompleted();
    this._renderHome();
  },

  /* ─── Home / Grid View ─── */
  _renderHome() {
    const cats = YOUTUBE_DATA.categories;
    const active = this.state.category;
    const completed = this.state.completedSet;

    const filtered = YOUTUBE_DATA.playlists.filter(p => {
      const matchCat = active === 'all' || p.category === active;
      const matchSearch = !this.state.search
        || p.title.toLowerCase().includes(this.state.search.toLowerCase())
        || p.channel.toLowerCase().includes(this.state.search.toLowerCase())
        || (p.desc || '').toLowerCase().includes(this.state.search.toLowerCase());
      return matchCat && matchSearch;
    });

    const totalCount = YOUTUBE_DATA.playlists.length;
    const completedCount = YOUTUBE_DATA.playlists.filter(p => completed.has(p.id)).length;
    const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    this.container.innerHTML = `
      <!-- Header card -->
      <div class="card mb-2">
        <div class="yt-header-row">
          <div>
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
              </svg>
              YouTube Lecture Playlists
            </div>
            <div class="card-sub">Curated top-rated tutorials for Coding, DevOps, AI/ML, SDE &amp; Data — track your progress below</div>
          </div>
          <div class="yt-header-right">
            <div class="yt-progress-wrap">
              <div class="yt-progress-label">
                <span>Your Progress</span>
                <span id="ytProgressVal"><b>${completedCount}</b> / ${totalCount} watched</span>
              </div>
              <div class="progress" style="height:12px">
                <div class="progress-fill green" id="ytProgressFill" style="width:${completedPct}%"></div>
              </div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:4px;text-align:right">${completedPct}% complete</div>
            </div>
            <div class="yt-search">
              <input type="search" id="ytSearch" placeholder="🔍 Search topics, channels..." value="${this.state.search || ''}" />
            </div>
          </div>
        </div>
      </div>

      <!-- Category tabs -->
      <div class="yt-cats mb-2">
        ${cats.map(c => `
          <button class="yt-cat ${active === c.id ? 'active' : ''}" data-cat="${c.id}" id="ytCat_${c.id}">
            ${c.label}
            <span class="yt-cat-count">${c.id === 'all'
              ? `${totalCount} <span style="opacity:.6">/ ${completedCount}✓</span>`
              : `${YOUTUBE_DATA.playlists.filter(p => p.category === c.id).length} <span style="opacity:.6">/ ${YOUTUBE_DATA.playlists.filter(p => p.category === c.id && completed.has(p.id)).length}✓</span>`
            }</span>
          </button>
        `).join('')}
      </div>

      <!-- Grid -->
      <div class="yt-grid" id="ytGrid">
        ${filtered.length > 0
          ? filtered.map(p => this._card(p)).join('')
          : '<div class="empty-state"><div class="es-icon">🎬</div><h3>No lectures found</h3><p>Try a different category or search term</p></div>'}
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
    const searchEl = document.getElementById('ytSearch');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        this.state.search = e.target.value;
        this._renderHome();
      });
    }

    // Open player on card click
    document.querySelectorAll('[data-play]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.yt-check-btn')) return; // don't open player on checkbox click
        this._openPlayer(el.dataset.play);
      });
    });

    // Completion toggle buttons
    document.querySelectorAll('.yt-check-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this._toggleComplete(id);
        // Locally update card state without full re-render
        const isDone = this.state.completedSet.has(id);
        btn.classList.toggle('done', isDone);
        btn.title = isDone ? 'Mark as not watched' : 'Mark as watched';
        btn.innerHTML = isDone
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>';
        const card = btn.closest('.yt-card');
        if (card) card.classList.toggle('yt-completed', isDone);
      });
    });
  },

  _refreshProgress() {
    const totalCount = YOUTUBE_DATA.playlists.length;
    const completedCount = YOUTUBE_DATA.playlists.filter(p => this.state.completedSet.has(p.id)).length;
    const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const fillEl = document.getElementById('ytProgressFill');
    const valEl = document.getElementById('ytProgressVal');
    if (fillEl) fillEl.style.width = completedPct + '%';
    if (valEl) valEl.innerHTML = `<b>${completedCount}</b> / ${totalCount} watched`;
  },

  /* ─── Card Template ─── */
  _card(p) {
    const done = this.state.completedSet.has(p.id);
    const embedUrl = this._buildEmbedUrl(p.url);
    const videoId = this._parseVideoId(p.url);
    const thumbSrc = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : (p.thumbnail || '');
    return `
      <div class="yt-card${done ? ' yt-completed' : ''}" data-play="${p.id}">
        <div class="yt-thumb">
          <img src="${thumbSrc}" alt="${p.title}" loading="lazy"
               onerror="this.src='https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'" />
          <span class="yt-duration">${p.duration}</span>
          <span class="yt-playbtn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </span>
          ${done ? '<span class="yt-done-badge">✓ Watched</span>' : ''}
          ${!embedUrl ? '<span class="yt-restricted-badge">⚠ Restricted</span>' : ''}
        </div>
        <div class="yt-body">
          <div class="yt-title">${p.title}</div>
          <div class="yt-channel">
            <span class="yt-avatar">${(p.channel || '?').charAt(0).toUpperCase()}</span>
            ${p.channel}
          </div>
          <div class="yt-meta">
            <span>${p.views || ''} views</span>
            <span class="yt-dot">•</span>
            <span>${p.rating} ★</span>
            <span class="yt-dot">•</span>
            <span class="chip ${p.category === 'coding' ? 'blue' : p.category === 'ai' ? 'purple' : p.category === 'devops' ? 'orange' : p.category === 'data' ? 'cyan' : 'green'}" style="font-size:10px;padding:2px 7px;margin-left:4px">${p.category.toUpperCase()}</span>
          </div>
          <div class="yt-desc">${p.desc}</div>
          <div class="yt-card-actions">
            <button class="yt-check-btn${done ? ' done' : ''}" data-id="${p.id}" title="${done ? 'Mark as not watched' : 'Mark as watched'}" aria-label="Toggle watched status">
              ${done
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /* ─── Player Modal ─── */
  _openPlayer(id) {
    const p = YOUTUBE_DATA.playlists.find(x => x.id === id);
    if (!p) return;

    const embedUrl = this._buildEmbedUrl(p.url, true);
    const watchUrl = this._buildWatchUrl(p.url);
    const videoId = this._parseVideoId(p.url);
    const thumbSrc = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : (p.thumbnail || '');
    const done = this.state.completedSet.has(p.id);

    const overlay = document.createElement('div');
    overlay.className = 'yt-player-overlay';
    overlay.innerHTML = `
      <div class="yt-player-modal" role="dialog" aria-modal="true" aria-label="${p.title}">
        <div class="yt-player-head">
          <div>
            <div class="yt-player-title">${p.title}</div>
            <div class="yt-player-channel">${p.channel} &bull; ${p.rating} ★ rating &bull; ${p.views || ''} views</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm yt-watch-link" title="Watch directly on YouTube">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Watch on YouTube
            </a>
            <button class="yt-player-close" aria-label="Close player">&times;</button>
          </div>
        </div>
        <div class="yt-player-frame" id="ytPlayerFrame">
          ${embedUrl
            ? `<iframe
                src="${embedUrl}"
                title="${p.title}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                loading="lazy">
               </iframe>
               <div class="yt-embed-error hidden" id="ytEmbedError">
                 <div class="yt-embed-error-inner">
                   <div style="font-size:32px;margin-bottom:10px">⚠️</div>
                   <p style="margin-bottom:12px">This video cannot be embedded (the uploader has restricted embedding).</p>
                   <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                     Watch on YouTube
                   </a>
                 </div>
               </div>`
            : `<div class="yt-embed-error">
                 <div class="yt-embed-error-inner">
                   <div style="font-size:32px;margin-bottom:10px">⚠️</div>
                   <p style="margin-bottom:4px;font-weight:700">Video cannot be embedded</p>
                   <p style="font-size:13px;color:var(--text-dim);margin-bottom:14px">The uploader has disabled embedding for this video.</p>
                   <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                     ▶ Watch on YouTube
                   </a>
                 </div>
               </div>`
          }
        </div>
        <div class="yt-player-info">
          <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div class="yt-desc" style="font-size:13.5px;line-height:1.65">${p.desc}</div>
              <div class="flex gap-1 mt-1" style="flex-wrap:wrap">
                <span class="chip red">${p.duration}</span>
                <span class="chip blue">${p.views || ''} views</span>
                <span class="chip green">${p.rating} ★ rating</span>
                <span class="chip orange">${(p.category || '').toUpperCase()}</span>
              </div>
            </div>
            <div class="yt-completion-toggle">
              <button class="yt-mark-btn${done ? ' done' : ''}" id="ytMarkDoneBtn" data-id="${p.id}">
                ${done
                  ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Watched!`
                  : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Mark as Watched`}
              </button>
              <p class="text-dim" style="font-size:11px;margin-top:6px;text-align:center">Tracks your lecture progress</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    // Detect embed blocked via iframe error
    if (embedUrl) {
      const iframe = overlay.querySelector('iframe');
      const errDiv = overlay.querySelector('#ytEmbedError');
      if (iframe && errDiv) {
        iframe.addEventListener('error', () => {
          iframe.style.display = 'none';
          errDiv.classList.remove('hidden');
        });
      }
    }

    // Mark/unmark done
    const markBtn = overlay.querySelector('#ytMarkDoneBtn');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        const pid = markBtn.dataset.id;
        this._toggleComplete(pid);
        const isDone = this.state.completedSet.has(pid);
        markBtn.classList.toggle('done', isDone);
        markBtn.innerHTML = isDone
          ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Watched!`
          : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Mark as Watched`;
        // Update card in background
        const card = document.querySelector(`.yt-card[data-play="${pid}"]`);
        if (card) {
          card.classList.toggle('yt-completed', isDone);
          const checkBtn = card.querySelector('.yt-check-btn');
          if (checkBtn) {
            checkBtn.classList.toggle('done', isDone);
            checkBtn.innerHTML = isDone
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>';
          }
          const badgeEl = card.querySelector('.yt-done-badge');
          if (badgeEl) badgeEl.remove();
          if (isDone) {
            const thumb = card.querySelector('.yt-thumb');
            if (thumb) {
              const b = document.createElement('span');
              b.className = 'yt-done-badge';
              b.textContent = '✓ Watched';
              thumb.appendChild(b);
            }
          }
        }
        this._refreshProgress();
      });
    }

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('.yt-player-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const escHandler = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }
};
