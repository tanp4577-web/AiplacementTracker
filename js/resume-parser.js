/* ============ Resume File Parser (PDF / DOCX / TXT) ============ */
/* Zero-dependency client-side extraction using the browser's
   Compression Streams API (Chrome 80+, Firefox 113+, Safari 16.4+). */
const ResumeParser = {
  async parseFile(file) {
    const name = (file.name || '').toLowerCase();
    const buffer = await file.arrayBuffer();
    if (name.endsWith('.pdf')) return this.parsePDF(buffer);
    if (name.endsWith('.docx')) return this.parseDOCX(buffer);
    if (name.endsWith('.rtf')) return this._stripRTF(new TextDecoder('utf-8').decode(buffer));
    // .txt and everything else
    return new TextDecoder('utf-8').decode(buffer);
  },

  /* ================= PDF ================= */
  async parsePDF(buffer) {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8');
    let allText = '';
    const len = bytes.length;
    const streamSig = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // 'stream'
    const endSig = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // 'endstream'

    const findSeq = (hay, from, seq) => {
      outer:
      for (let i = from; i <= hay.length - seq.length; i++) {
        for (let j = 0; j < seq.length; j++) {
          if (hay[i + j] !== seq[j]) continue outer;
        }
        return i;
      }
      return -1;
    };

    for (let i = 0; i < len; i++) {
      if (bytes[i] === 0x73 && findSeq(bytes, i, streamSig) === i) {
        // skip past 'stream' keyword + EOL
        let j = i + 6;
        while (j < len && (bytes[j] === 0x0d || bytes[j] === 0x0a)) j++;
        const endPos = findSeq(bytes, j, endSig);
        if (endPos === -1) break;

        // Inspect context before the stream for /FlateDecode filter
        const ctxStart = Math.max(0, i - 220);
        const ctx = decoder.decode(bytes.subarray(ctxStart, i));
        const streamData = bytes.subarray(j, endPos);
        let data;

        if (/FlateDecode|Fl\b/.test(ctx)) {
          try { data = await this._inflate(streamData); }
          catch (e) { data = streamData; }
        } else if (/LZWDecode/.test(ctx)) {
          // LZW rarely used; skip decode, keep raw (best effort)
          data = streamData;
        } else {
          data = streamData;
        }

        const contentText = this._extractContentText(decoder.decode(data));
        if (contentText && contentText.trim()) allText += contentText.trim() + '\n';
        i = endPos;
      }
    }

    // If nothing extracted (object-stream PDFs, scanned docs), fall back to raw scan
    if (!allText.trim()) {
      allText = this._scanRawText(decoder.decode(bytes));
    }
    return allText.trim();
  },

  /* Inflate via Compression Streams API. PDF FlateDecode = zlib (RFC 1950). */
  async _inflate(data) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not supported in this browser');
    }
    // Try zlib ('deflate' maps to RFC 1950 zlib in the spec)
    try {
      const ds = new DecompressionStream('deflate');
      const stream = new Blob([data]).stream().pipeThrough(ds);
      const buf = await new Response(stream).arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) {
      // Some encoders produce raw deflate; strip 2-byte zlib header + 4-byte Adler-32
      if (data.length > 6 && (data[0] === 0x78)) {
        const raw = data.subarray(2, data.length - 4);
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Blob([raw]).stream().pipeThrough(ds);
        const buf = await new Response(stream).arrayBuffer();
        return new Uint8Array(buf);
      }
      throw e;
    }
  },

  /* Parse PDF content-stream operators: Tj, TJ, ', " */
  _extractContentText(s) {
    if (!s) return '';
    let out = '';
    let i = 0;
    const n = s.length;

    const readStr = (start) => {
      let depth = 1, res = '', j = start + 1;
      while (j < n && depth > 0) {
        const c = s[j];
        if (c === '\\') {
          const nx = s[j + 1];
          if (nx === 'n' || nx === 'r' || nx === 't') res += ' ';
          else if (nx === '(') res += '(';
          else if (nx === ')') res += ')';
          else if (nx === '\\') res += '\\';
          else if (nx >= '0' && nx <= '7') {
            res += String.fromCharCode(parseInt(s.substr(j + 1, 3), 8));
            j += 2;
          } else if (nx !== undefined) res += nx;
          j += 2;
          continue;
        }
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) { j++; break; } }
        else res += c;
        j++;
      }
      return { text: res, next: j };
    };

    while (i < n) {
      const c = s[i];
      if (c === '(') {
        const { text, next } = readStr(i);
        let k = next;
        while (k < n && /\s/.test(s[k])) k++;
        if (s.substr(k, 2) === 'Tj' || s[k] === "'" || s[k] === '"') {
          out += text;
        }
        i = next;
      } else if (c === '[') {
        let j = i + 1, parts = [];
        while (j < n && s[j] !== ']') {
          if (s[j] === '(') {
            const r = readStr(j);
            parts.push(r.text);
            j = r.next;
          } else j++;
        }
        let k = j + 1;
        while (k < n && /\s/.test(s[k])) k++;
        if (s.substr(k, 2) === 'TJ') out += parts.join(' ');
        i = Math.min(j + 1, n);
      } else i++;
    }
    return out;
  },

  /* Fallback: keep printable characters only */
  _scanRawText(s) {
    return s.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/[ \t]+/g, ' ').slice(0, 30000);
  },

  /* ================= DOCX ================= */
  async parseDOCX(buffer) {
    const bytes = new Uint8Array(buffer);

    // Locate End of Central Directory (EOCD) signature: PK\x05\x06
    let eocd = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) throw new Error('Invalid DOCX (ZIP) file');

    const cdOffset = this._u32(bytes, eocd + 16);
    const cdCount = this._u16(bytes, eocd + 10);
    let xmlData = null;
    let pos = cdOffset;

    for (let i = 0; i < cdCount; i++) {
      if (this._u32(bytes, pos) !== 0x02014b50) break; // central directory header sig
      const method = this._u16(bytes, pos + 10);
      const compSize = this._u32(bytes, pos + 20);
      const nameLen = this._u16(bytes, pos + 28);
      const extraLen = this._u16(bytes, pos + 30);
      const commentLen = this._u16(bytes, pos + 32);
      const localOffset = this._u32(bytes, pos + 42);
      const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

      if (name === 'word/document.xml') {
        const lNameLen = this._u16(bytes, localOffset + 26);
        const lExtraLen = this._u16(bytes, localOffset + 28);
        const dataStart = localOffset + 30 + lNameLen + lExtraLen;
        const comp = bytes.subarray(dataStart, dataStart + compSize);
        if (method === 0) {
          xmlData = comp;
        } else if (method === 8) {
          try { xmlData = await this._inflate(comp); }
          catch (e) { xmlData = null; }
        }
        break;
      }
      pos += 46 + nameLen + extraLen + commentLen;
    }

    if (!xmlData) throw new Error('Could not extract document.xml from DOCX');
    const xml = new TextDecoder('utf-8').decode(xmlData);

    // Extract text from <w:t> (and <w:tab/>) elements
    const texts = [];
    const re = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/?>/g;
    let m;
    while ((m = re.exec(xml))) {
      if (m[0].startsWith('<w:tab')) texts.push('  ');
      else texts.push(m[1].replace(/\s+/g, ' ').trim());
    }
    return texts.join('\n').trim();
  },

  /* ================= RTF ================= */
  _stripRTF(text) {
    // Remove RTF control words, keep plain text
    return text
      .replace(/\\par[d]?/gi, '\n')
      .replace(/\\tab/gi, '  ')
      .replace(/\\'([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  _u16(b, o) { return (b[o] | (b[o + 1] << 8)); },
  _u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
};

/* ============================================================================
   Resume Text Quality Analyzer
   Detects placeholder / fake / gibberish resume content and produces a
   real sentence-structure & grammar profile. Used by LiveResumeAI.analyze().
   ========================================================================== */
const ResumeTextQuality = {
  _stopwords: new Set(('a,able,about,after,all,also,am,and,any,are,as,at,be,because,been,being,by,can,could,did,do,does,doing,for,from,had,has,have,having,he,her,here,hers,him,his,how,i,if,in,into,is,it,its,just,me,more,most,my,no,nor,not,of,on,once,only,or,other,our,ours,out,over,own,she,should,so,some,such,than,that,the,their,theirs,them,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,you,your,yours').split(',')),

  _loremPatterns: /\b(lorem|ipsum|dolor|sit amet|consectetur|adipiscing|elit|sed do|eiusmod|tempor|incididunt)\b/i,

  _placeholderPatterns: /\b(placeholder|dummy text|lorem ipsum|add your|your text|xxx|to be added|TBD|coming soon|sample text|replace this|this is a template|filler)\b/i,

  _repeatedNonsense: /(.)\1{4,}|([a-z]{2,})\2{3,}/i,

  _genericFluff: /\b(passionate|hardworking|sincere|dedicated|quick learner|team player|self-motivated|highly motivated|good communication skills|positive attitude)\b/i,

  analyze(text) {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    const tl = t.toLowerCase();
    const words = t ? t.split(' ') : [];
    const sentences = (t.match(/[^.!?]+[.!?]+/g) || []).map(s => s.trim()).filter(Boolean);
    const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean);

    const reasons = [];

    // ---- 1. Placeholder / lorem-ipsum markers ----
    if (this._loremPatterns.test(tl)) {
      reasons.push('Contains Lorem-ipsum placeholder text');
    }
    if (this._placeholderPatterns.test(tl)) {
      reasons.push('Contains placeholder/dummy phrases');
    }

    // ---- 2. Repeated nonsense strings ----
    if (this._repeatedNonsense.test(t)) {
      reasons.push('Contains repeated gibberish character runs');
    }
    const repeatedWords = this._countRepeatedWords(words);
    if (repeatedWords > 0.25) {
      reasons.push('Very low word variety — text looks auto-generated');
    }

    // ---- 3. Real sentence structure ----
    let sentenceScore = 100;
    const grammarIssues = [];
    let stopwordRatio = 0;
    if (words.length > 4) {
      const stopCount = words.filter(w => this._stopwords.has(w.toLowerCase().replace(/[^a-z]/g, ''))).length;
      stopwordRatio = stopCount / words.length;
      if (stopwordRatio < 0.08) {
        reasons.push('Almost no function words — reads like a keyword dump, not real sentences');
      }
    }

    // Average word length heuristic: real English prose averages ~4.5-5.5 chars/word
    if (words.length >= 10) {
      const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
      if (avgLen > 9) {
        reasons.push('Abnormally long average word length — likely concatenated/garbled text');
      }
    }

    if (!sentences.length && lines.length < 2 && words.length > 15) {
      reasons.push('No sentence structure detected (no periods/question marks) — may be a keyword list');
    }

    // Grammar / spelling heuristics
    if (words.length >= 8) {
      // Missing capitalization at sentence starts
      const capsMissing = sentences.filter(s => s && /^[a-z]/.test(s)).length;
      if (capsMissing > Math.max(1, sentences.length * 0.4)) {
        grammarIssues.push('Many sentences do not start with a capital letter');
      }
      // Common misspellings / typos
      const typos = t.match(/\b(teh|recieve|seperate|occured|definately|untill|writting|begining|freind|adress|succesful|developement)\b/gi) || [];
      if (typos.length) {
        grammarIssues.push(`Possible spelling errors found: ${[...new Set(typos.map(x => x.toLowerCase()))].slice(0, 4).join(', ')}`);
      }
      // Double spaces / stray punctuation
      if (/\s{2,}/.test(t)) grammarIssues.push('Multiple consecutive spaces detected');
      if (/,\s*,|\s,/.test(t)) grammarIssues.push('Stray comma placement detected');
      // Repeated words (e.g. "the the")
      const dupWords = (t.match(/\b(\w+)\s+\1\b/gi) || []).filter(w => !/^(i|a|is|was|the|to|of|in)$/i.test(w));
      if (dupWords.length) grammarIssues.push(`Repeated words detected: ${dupWords.slice(0, 3).join('", "')}`);
    }

    // ---- Sentence-level scoring ----
    if (words.length > 0 && words.length < 15) {
      sentenceScore = 45;
      reasons.push('Too short to be a real resume (fewer than 15 words)');
    } else if (words.length >= 15) {
      // Base score from stopword ratio & sentence presence
      let score = 100;
      if (stopwordRatio < 0.12) score -= 35;
      if (sentences.length === 0) score -= 25;
      // Penalize huge blocks with no punctuation
      const wordsPerSentence = sentences.length ? words.length / sentences.length : 0;
      if (wordsPerSentence > 60) score -= 15;
      sentenceScore = Math.max(0, Math.min(100, score));
    }

    const flagged = reasons.length > 0;
    const nonsenseRatio = flagged ? Math.min(1, 0.2 + reasons.length * 0.2) : 0;

    return {
      flagged,
      reasons: reasons.slice(0, 8),
      sentenceScore,
      grammarIssues: grammarIssues.slice(0, 8),
      nonsenseRatio,
      stopwordRatio,
      sentenceCount: sentences.length,
      wordVariety: this._wordVariety(words)
    };
  },

  _countRepeatedWords(words) {
    if (!words.length) return 0;
    const freq = {};
    words.forEach(w => {
      const k = w.toLowerCase();
      freq[k] = (freq[k] || 0) + 1;
    });
    const unique = Object.keys(freq).length;
    // 1 - (unique/total) is the "repetition ratio"
    return 1 - (unique / words.length);
  },

  _wordVariety(words) {
    if (!words.length) return 0;
    const unique = new Set(words.map(w => w.toLowerCase()));
    return Math.round((unique.size / words.length) * 100);
  }
};

