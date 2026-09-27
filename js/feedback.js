/* ============================================================================
   Feedback / Contact Us
   No backend or API key is used: the form opens the visitor's own email app,
   addressed to the site owner, with the subject and message already filled in.
   Nothing is sent, saved, or shown as "sent" until they actually press Send in
   their email app, which this page cannot see or confirm.
   ========================================================================== */
const Feedback = {
  TO_EMAIL: 'tanmaypondhe7777@gmail.com',
  MAX_MESSAGE: 4000,

  render(container) {
    this.container = container;
    const user = Auth.getCurrentUser && Auth.getCurrentUser();
    const esc = (v) => Sanitize.html(v);

    container.innerHTML = `
      <div class="card" style="max-width:560px;margin:0 auto">
        <div class="card-title"><i class="bi bi-envelope text-accent" style="margin-right:4px"></i>Feedback &amp; Contact Us</div>
        <div class="card-sub">Found a bug, or have an idea to improve PlacementPrep? Send it straight to the developer.</div>

        <form id="feedbackForm" class="mt-2" novalidate>
          <label class="field-label" for="feedbackName">Your name (optional)</label>
          <input id="feedbackName" maxlength="80" autocomplete="name" value="${user && !user.guest ? esc(user.name || '') : ''}" />

          <label class="field-label mt-2" for="feedbackEmail">Your email (optional, so we can reply)</label>
          <input id="feedbackEmail" type="email" maxlength="200" autocomplete="email" value="${user && !user.guest ? esc(user.email || '') : ''}" />

          <label class="field-label mt-2" for="feedbackType">Type</label>
          <select id="feedbackType">
            <option value="Feedback">General feedback</option>
            <option value="Bug report">Bug report</option>
            <option value="Feature idea">Feature idea</option>
            <option value="Something else">Something else</option>
          </select>

          <label class="field-label mt-2" for="feedbackMessage">Message</label>
          <textarea id="feedbackMessage" rows="6" maxlength="${this.MAX_MESSAGE}" placeholder="What's on your mind?" required></textarea>

          <div id="feedbackError" class="text-danger hidden" role="alert" style="margin-top:6px;font-size:13px"></div>
          <div id="feedbackNote" class="text-dim hidden" style="margin-top:10px;font-size:13px"></div>

          <div class="flex gap-2 mt-3 flex-wrap">
            <button type="submit" class="btn btn-primary" id="feedbackSendBtn"><i class="bi bi-send" style="margin-right:6px"></i>Open in your email app</button>
            <button type="button" class="btn btn-ghost" id="feedbackCopyBtn">Copy message instead</button>
          </div>
          <p class="text-dim mt-2" style="font-size:12px">This opens your own email app addressed to <b>${esc(this.TO_EMAIL)}</b>. Nothing is sent from this page, and nothing you type here is stored.</p>
        </form>
      </div>
    `;

    document.getElementById('feedbackForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._send();
    });
    document.getElementById('feedbackCopyBtn').addEventListener('click', () => this._copy());
  },

  _fields() {
    const $ = (id) => document.getElementById(id);
    return {
      name: $('feedbackName').value.trim(),
      email: $('feedbackEmail').value.trim(),
      type: $('feedbackType').value,
      message: $('feedbackMessage').value.trim()
    };
  },

  _compose({ name, email, type, message }) {
    const subject = `PlacementPrep ${type}${name ? ` from ${name}` : ''}`;
    const bodyLines = [message, '', '---', name ? `Name: ${name}` : null, email ? `Reply-to: ${email}` : null].filter(Boolean);
    return { subject, body: bodyLines.join('\n') };
  },

  _validate(fields) {
    if (!fields.message) return 'Please write a message first.';
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return 'That email address looks incomplete.';
    return '';
  },

  _send() {
    const fields = this._fields();
    const errorEl = document.getElementById('feedbackError');
    const noteEl = document.getElementById('feedbackNote');
    const error = this._validate(fields);
    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('hidden');
      noteEl.classList.add('hidden');
      return;
    }
    errorEl.classList.add('hidden');
    const { subject, body } = this._compose(fields);
    const mailto = `mailto:${this.TO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    this._navigate(mailto);
    noteEl.textContent = 'Your email app should have opened with this message ready. If nothing happened, use "Copy message instead" and paste it into an email.';
    noteEl.classList.remove('hidden');
  },

  /** A same-tab navigation (not window.open) is what reliably triggers the OS's
   *  "choose an email app" / mail-client handoff on both desktop and mobile browsers. */
  _navigate(url) {
    window.location.href = url;
  },

  async _copy() {
    const fields = this._fields();
    const error = this._validate(fields);
    const errorEl = document.getElementById('feedbackError');
    const noteEl = document.getElementById('feedbackNote');
    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('hidden');
      noteEl.classList.add('hidden');
      return;
    }
    errorEl.classList.add('hidden');
    const { subject, body } = this._compose(fields);
    const text = `To: ${this.TO_EMAIL}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      noteEl.textContent = `Copied. Paste it into an email to ${this.TO_EMAIL}.`;
    } catch {
      noteEl.textContent = `Couldn't access the clipboard. Please copy this manually and email it to ${this.TO_EMAIL}:\n\n${text}`;
    }
    noteEl.classList.remove('hidden');
  }
};
