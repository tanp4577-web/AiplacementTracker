/* ============ Code editor ============
   CodeMirror 6 (syntax highlighting per language, auto indent, auto-closing brackets and quotes, bracket
   matching). It is a single self-hosted bundle (js/vendor/codemirror.js, built by tools/editor-bundle) that is
   loaded on demand the first time a question opens. Because it is same-origin there is NO Content-Security-Policy
   change: script-src 'self' already covers it, and no third-party CDN is involved.

   The page keeps a plain <textarea> as the source of truth: it holds the code, it is what the rest of the
   app reads, and it IS the editor if CodeMirror cannot load (offline, old browser, tests). When CodeMirror
   loads it is shown instead, and every change is mirrored into the textarea. */
const CodeEditor = {
  MAX_CHARS: 30000, // same cap the compile proxy enforces
  BUNDLE: 'js/vendor/codemirror.js',
  _libs: null,
  _loading: null,

  /** True when the browser can load CodeMirror at all. Tests (jsdom) cannot, and use the textarea. */
  supported() {
    return typeof window !== 'undefined' && typeof document !== 'undefined' && !/jsdom/i.test(navigator.userAgent || '');
  },

  _load() {
    if (this._libs) return Promise.resolve(this._libs);
    if (!this._loading) {
      const url = new URL(this.BUNDLE, document.baseURI).href;
      this._loading = import(/* @vite-ignore */ url).then((m) => (this._libs = m)).catch((e) => { this._loading = null; throw e; });
    }
    return this._loading;
  },

  /** Highlighting for a Wandbox language name; null when there is no mode (the editor still works). */
  _languageSupport(name) {
    const make = this._libs && this._libs.langs[String(name || '').toLowerCase()];
    try { return make ? make() : null; } catch { return null; }
  },

  /** Emerald / teal theme. Colours come from CSS variables on .code-wrap (css/editorial.css). */
  _theme(libs) {
    const { EditorView } = libs.view;
    const { HighlightStyle, syntaxHighlighting } = libs.language;
    const t = libs.highlight.tags;
    const style = HighlightStyle.define([
      { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: 'var(--cm-keyword)', fontWeight: '600' },
      { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--cm-string)' },
      { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--cm-number)' },
      { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)], color: 'var(--cm-function)' },
      { tag: [t.typeName, t.className, t.namespace], color: 'var(--cm-type)' },
      { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--cm-comment)', fontStyle: 'italic' },
      { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--cm-punct)' },
      { tag: t.invalid, color: '#fca5a5' }
    ]);
    const theme = EditorView.theme({
      '&': { color: 'var(--cm-text)', backgroundColor: 'transparent', fontSize: '13.5px', height: '100%' },
      '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace", lineHeight: '1.6', overflow: 'auto' },
      '.cm-content': { caretColor: 'var(--cm-caret)', padding: '10px 0' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cm-caret)' },
      '&.cm-focused': { outline: '2px solid var(--cm-caret)', outlineOffset: '-2px' },
      '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--cm-gutter)', border: 'none' },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--cm-active-line)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--cm-selection)' },
      '.cm-matchingBracket': { backgroundColor: 'var(--cm-selection)', outline: '1px solid var(--cm-caret)', color: 'inherit' },
      '.cm-nonmatchingBracket': { color: '#fca5a5' }
    });
    return [theme, syntaxHighlighting(style)];
  },

  /** Upgrades `textarea` into CodeMirror when possible. Always resolves to a handle with the same shape. */
  async mount(textarea, { language = 'javascript', onChange = () => {} } = {}) {
    textarea.maxLength = this.MAX_CHARS;
    const plain = {
      kind: 'textarea',
      getValue: () => textarea.value,
      setValue: (v) => { textarea.value = String(v).slice(0, this.MAX_CHARS); onChange(textarea.value); },
      setLanguage: async () => {},
      focus: () => textarea.focus(),
      destroy: () => {}
    };
    if (!this.supported()) return plain;
    let libs;
    try { libs = await this._load(); } catch { return plain; }
    if (!textarea.isConnected) return plain; // the user left the page while the library loaded

    const { EditorState, Compartment } = libs.state;
    const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } = libs.view;
    const { defaultKeymap, history, historyKeymap, indentWithTab } = libs.commands;
    const { indentOnInput, bracketMatching, indentUnit } = libs.language;
    const { closeBrackets, closeBracketsKeymap } = libs.autocomplete;

    const lang = new Compartment();
    const max = this.MAX_CHARS;
    const host = document.createElement('div');
    host.className = 'cm-host';
    host.setAttribute('aria-label', 'Code editor. Press Escape then Tab to leave the editor.');
    textarea.insertAdjacentElement('afterend', host);

    let ignore = false;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: textarea.value,
        extensions: [
          lineNumbers(), history(), drawSelection(), highlightActiveLine(), highlightActiveLineGutter(),
          indentOnInput(), bracketMatching(), indentUnit.of('  '),
          closeBrackets(),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorState.changeFilter.of((tr) => tr.newDoc.length <= max), // keep the code-length limit
          lang.of([]),
          this._theme(libs),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged || ignore) return;
            textarea.value = u.state.doc.toString();
            onChange(textarea.value);
          })
        ]
      })
    });
    textarea.hidden = true;

    const handle = {
      kind: 'codemirror',
      getValue: () => view.state.doc.toString(),
      setValue: (v) => {
        ignore = true;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: String(v).slice(0, max) } });
        ignore = false;
        textarea.value = view.state.doc.toString();
        onChange(textarea.value);
      },
      setLanguage: async (name) => {
        const support = this._languageSupport(name);
        view.dispatch({ effects: lang.reconfigure(support || []) });
      },
      focus: () => view.focus(),
      destroy: () => { view.destroy(); host.remove(); textarea.hidden = false; }
    };
    await handle.setLanguage(language);
    return handle;
  }
};
