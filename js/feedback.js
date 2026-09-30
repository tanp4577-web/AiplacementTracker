/* ============================================================================
   Feedback / Contact Us
   Submits directly from the page via Web3Forms (web3forms.com) — no backend of
   our own, no signup for the visitor. The access key below is meant to be public
   (Web3Forms documents it as safe for client-side code, like a reCAPTCHA site key):
   it only lets people email the one address it was issued for, tanmaypondhe7777@gmail.com.
   "Sent" is shown only after Web3Forms actually confirms success.
   ========================================================================== */
const Feedback = {
  ACCESS_KEY: '115b2283-132c-401a-9810-c0f520054f43',
  TO_EMAIL: 'tanmaypondhe7777@gmail.com',
  ENDPOINT: 'https://api.web3forms.com/submit',
  MAX_MESSAGE: 4000,

  render(container) {
    this.container = container;
    const esc = (v) => Sanitize.html(v);

    container.innerHTML = `
      <div class="card" style="max-width:560px;margin:0 auto">
        <div class="card-title"><i class="bi bi-envelope text-accent" style="margin-right:4px"></i>Feedback &amp; Contact Us</div>
        <div class="card-sub">Found a bug, or have an idea to improve PlacementPrep? Send it straight to the developer.</div>

        <form id="feedbackForm" class="mt-2" novalidate>
          <label class="field-label" for="feedbackName">Your name</label>
          <input id="feedbackName" maxlength="80" autocomplete="name" required />

          <label class="field-label mt-2" for="feedbackEmail">Your email (so we can reply)</label>
          <input id="feedbackEmail" type="email" maxlength="200" autocomplete="email" required />

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
          <div id="feedbackNote" class="hidden" style="margin-top:10px;font-size:13px"></div>

          <div class="flex gap-2 mt-3 flex-wrap">
            <button type="submit" class="btn btn-primary" id="feedbackSendBtn"><i class="bi bi-send" style="margin-right:6px"></i>Send message</button>
          </div>
          <p class="text-dim mt-2" style="font-size:12px">This is sent straight to <b>${esc(this.TO_EMAIL)}</b>. Nothing you type here is stored on this site.</p>
        </form>
      </div>
    `;

    document.getElementById('feedbackForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._send();
    });
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

  _validate(fields) {
    if (!fields.name) return 'Please enter your name.';
    if (!fields.email) return 'Please enter your email, so a reply is possible.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return 'That email address looks incomplete.';
    if (!fields.message) return 'Please write a message first.';
    return '';
  },

  _setNote(text, kind) {
    const el = document.getElementById('feedbackNote');
    el.textContent = text;
    el.classList.remove('hidden', 'text-success', 'text-danger', 'text-dim');
    el.classList.add(kind === 'error' ? 'text-danger' : kind === 'success' ? 'text-success' : 'text-dim');
  },

  async _send() {
    const fields = this._fields();
    const errorEl = document.getElementById('feedbackError');
    const error = this._validate(fields);
    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('hidden');
      document.getElementById('feedbackNote').classList.add('hidden');
      return;
    }
    errorEl.classList.add('hidden');

    const button = document.getElementById('feedbackSendBtn');
    button.disabled = true;
    const originalLabel = button.innerHTML;
    button.innerHTML = 'Sending…';
    this._setNote('Sending your message…', 'info');

    try {
      const response = await this._submit(fields);
      if (response.ok) {
        this._setNote(`Sent! Thanks — your message is on its way to ${this.TO_EMAIL}.`, 'success');
        document.getElementById('feedbackForm').reset();
      } else {
        this._setNote(response.error || "Couldn't send that. Please try again in a moment.", 'error');
      }
    } catch {
      this._setNote("Couldn't reach the server. Check your connection and try again.", 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  },

  /** Kept separate so tests can stub the network without touching fetch globally. */
  async _submit({ name, email, type, message }) {
    const response = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: this.ACCESS_KEY,
        subject: `PlacementPrep ${type} from ${name}`,
        from_name: name,
        name,
        email,
        type,
        message
      })
    });
    let data = {};
    try { data = await response.json(); } catch { /* non-JSON error page */ }
    return response.ok && data.success ? { ok: true } : { ok: false, error: data.message };
  }
};
