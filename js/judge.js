/* ============ Judge ============
   Language-agnostic input/output for coding questions.

   Every question is "read stdin, write stdout", so a solution can be written in ANY language. This file defines
   the one text layout that every type uses, in both directions (stdin and stdout use the SAME layout):

     int / float / bool   one value on a line                      42
     str                  one raw line (spaces kept, may be empty) hello world
     T[]                  a line with the count, then the elements
                            numbers, bools, null  -> one line, space separated (an empty line when the count is 0)
                            str                   -> one line per string
     T[][]                a line with the row count, then one line per row: the row length, then its elements
                            (rows of str: the strings must not contain spaces)
     int?[]               like int[] but a value can be the word  null  (trees in level order)

   A question's `io` says which type each input has and what type the answer is. The browser decodes the program's
   stdout with the answer type and compares VALUES (so extra spaces or blank lines do not matter; a float within
   1e-6 matches). Some questions accept any valid answer: those name a checker from `Judge.checkers`.

   The same file is loaded by the page and by tools/coding-bank (module.exports at the bottom). */
const Judge = (() => {
  const SCALARS = ['int', 'float', 'bool', 'str', 'int?', 'tok'];

  function parseType(type) {
    const m = /^(int\?|int|float|bool|str|tok)((?:\[\])*)$/.exec(String(type || ''));
    if (!m) throw new Error('Unknown type: ' + type);
    return { base: m[1], dims: m[2].length / 2 };
  }

  const isNumeric = (base) => base === 'int' || base === 'float' || base === 'bool' || base === 'int?';

  function scalarText(base, v) {
    if (base === 'int?') return v === null ? 'null' : String(v);
    if (base === 'bool') return v ? 'true' : 'false';
    if (base === 'str' || base === 'tok') {
      const s = String(v);
      if (/[\r\n]/.test(s)) throw new Error('A string contains a line break');
      return s;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('Not a number: ' + v);
    return String(v);
  }

  /** The lines that represent `value` of `type` (see the layout above). */
  function encodeLines(type, value) {
    const { base, dims } = parseType(type);
    if (dims === 0) return [scalarText(base, value)];
    if (dims === 1) {
      const out = [String(value.length)];
      if (isNumeric(base)) out.push(value.map((v) => scalarText(base, v)).join(' '));
      else value.forEach((v) => out.push(scalarText(base, v)));
      return out;
    }
    if (dims === 2) {
      const out = [String(value.length)];
      for (const row of value) {
        const cells = row.map((v) => scalarText(base, v));
        if (!isNumeric(base) && cells.some((c) => c === '' || /\s/.test(c))) throw new Error('A grid string is empty or has a space');
        out.push([String(row.length), ...cells].join(' '));
      }
      return out;
    }
    throw new Error('At most two dimensions are supported');
  }

  /** stdin (or stdout) text for a list of typed values. */
  function encode(types, values) {
    const list = Array.isArray(types) ? types : [types];
    const vals = Array.isArray(types) ? values : [values];
    return list.flatMap((t, i) => encodeLines(t, vals[i])).join('\n') + '\n';
  }

  /** Cursor over text: numbers are read as whitespace separated tokens, strings as whole lines. */
  function reader(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    let li = 0;
    let ti = 0;
    let toks = null;
    const tokens = () => (toks || (toks = (lines[li] || '').split(/\s+/).filter(Boolean)));
    return {
      token() {
        while (li < lines.length) {
          const t = tokens();
          if (ti < t.length) return t[ti++];
          li++; ti = 0; toks = null;
        }
        throw new Error('the output ended too early');
      },
      /** After an empty numeric array: step over its (blank) values line when there is one. */
      skipBlank() {
        if (ti > 0) { li++; ti = 0; toks = null; }
        if (li < lines.length && lines[li].trim() === '') { li++; toks = null; }
      },
      line() {
        if (ti > 0) { li++; ti = 0; toks = null; }
        if (li >= lines.length) throw new Error('the output ended too early');
        const s = lines[li];
        li++; toks = null;
        return s;
      }
    };
  }

  function readScalar(r, base) {
    if (base === 'str') return r.line();
    const t = r.token();
    if (base === 'tok') return t;
    if (base === 'bool') {
      const l = t.toLowerCase();
      if (l === 'true' || l === '1') return true;
      if (l === 'false' || l === '0') return false;
      throw new Error(`expected true or false but found "${t}"`);
    }
    if (base === 'int?' && t === 'null') return null;
    const n = Number(t);
    if (!Number.isFinite(n) || (base !== 'float' && !Number.isInteger(n))) throw new Error(`expected ${base === 'float' ? 'a number' : 'an integer'} but found "${t}"`);
    return n;
  }

  function readCount(r) {
    const n = Number(r.token());
    if (!Number.isInteger(n) || n < 0 || n > 1e6) throw new Error('expected a count but found something else');
    return n;
  }

  function readValue(r, type) {
    const { base, dims } = parseType(type);
    if (dims === 0) return readScalar(r, base);
    const n = readCount(r);
    if (dims === 1) {
      const out = [];
      if (n === 0 && isNumeric(base)) r.skipBlank();
      for (let i = 0; i < n; i++) out.push(readScalar(r, base));
      return out;
    }
    const rows = [];
    for (let i = 0; i < n; i++) {
      const c = readCount(r);
      const row = [];
      for (let j = 0; j < c; j++) row.push(base === 'str' ? r.token() : readScalar(r, base));
      rows.push(row);
    }
    return rows;
  }

  /** Reads the typed inputs back out of stdin text (used by the build tools to verify a question). */
  function decodeInput(types, text) {
    const r = reader(text);
    return types.map((t) => readValue(r, t));
  }

  /** Reads one answer of `type` from a program's stdout. Throws a readable Error when it does not fit. */
  function decodeOutput(type, text) {
    const { base, dims } = parseType(type);
    if (base === 'str' && dims === 0) {
      const s = String(text).replace(/\r\n?/g, '\n').replace(/\n$/, '');
      return s;
    }
    return readValue(reader(text), type);
  }

  /* ------------------------------------------------------------------ comparing */

  const lex = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
  const asc = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function trimTreeNulls(v) {
    const a = v.slice();
    while (a.length && a[a.length - 1] === null) a.pop();
    return a;
  }

  /** Puts a value in canonical form so equal answers compare equal (set-like answers are sorted, trees trimmed). */
  function canon(type, v, mode) {
    const { base, dims } = parseType(type);
    if (base === 'int?' && dims === 1) return trimTreeNulls(v);
    if (base === 'tok' && dims === 1) return v.map((s) => String(s).trim().toLowerCase());
    if (mode === 'sort' && dims === 1) return v.slice().sort(asc);
    if (mode === 'sortRows' && dims === 2) return v.map((r) => r.slice().sort(asc)).sort(lex);
    if (mode === 'sortAll' && dims === 2) return v.slice().sort(lex);
    if (mode === 'sortInner' && dims === 2) return v.map((r) => r.slice().sort(asc));
    return v;
  }

  function same(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
    return a === b;
  }

  /** Compares a program's stdout with the expected answer. -> { pass, actual?, message? } */
  function compare(io, expected, stdout, inputs) {
    const out = String(stdout == null ? '' : stdout);
    if (out.trim() === '' && !(io.out === 'str' && expected === '') && !(parseType(io.out).dims > 0 && Array.isArray(expected) && expected.length === 0)) {
      return { pass: false, message: 'Your program printed nothing.' };
    }
    let actual;
    try { actual = decodeOutput(io.out, out); } catch (e) {
      return { pass: false, message: `Could not read your output as ${describeType(io.out)}: ${e.message}.` };
    }
    if (io.check) {
      const fn = checkers[io.check];
      if (!fn) return { pass: false, message: `Unknown checker "${io.check}".` };
      let verdict;
      try { verdict = fn(inputs, actual, expected); } catch (e) { verdict = 'the checker could not read your answer (' + e.message + ')'; }
      return verdict === true ? { pass: true, actual } : { pass: false, actual, message: String(verdict) };
    }
    const mode = io.cmp || 'exact';
    const e = canon(io.out, expected, mode);
    const a = canon(io.out, actual, mode);
    if (same(a, e)) return { pass: true, actual };
    // plain strings: trailing spaces at the end of the line are not part of the answer unless the answer has them
    if (typeof a === 'string' && typeof e === 'string' && e === e.trim() && a.trim() === e) return { pass: true, actual };
    return { pass: false, actual };
  }

  /* ------------------------------------------------------------------ checkers (any valid answer) */

  const multiset = (arr) => JSON.stringify(arr.slice().sort(asc));

  function buildTree(level) {
    if (!level.length || level[0] === null) return null;
    const mk = (v) => ({ val: v, left: null, right: null });
    const root = mk(level[0]);
    const q = [root];
    let i = 1;
    while (q.length && i < level.length) {
      const n = q.shift();
      if (i < level.length) { const v = level[i++]; if (v !== null) { n.left = mk(v); q.push(n.left); } }
      if (i < level.length) { const v = level[i++]; if (v !== null) { n.right = mk(v); q.push(n.right); } }
    }
    return root;
  }

  const checkers = {
    wiggle([nums], a) {
      if (multiset(a) !== multiset(nums)) return 'Your answer must use exactly the same numbers as the input.';
      for (let i = 0; i + 1 < a.length; i++) {
        if (i % 2 === 0 ? !(a[i] <= a[i + 1]) : !(a[i] >= a[i + 1])) return `Not wiggle sorted at positions ${i} and ${i + 1}.`;
      }
      return true;
    },
    peak([nums], i) {
      if (!Number.isInteger(i) || i < 0 || i >= nums.length) return 'The index is outside the array.';
      if ((i > 0 && !(nums[i] > nums[i - 1])) || (i < nums.length - 1 && !(nums[i] > nums[i + 1]))) return `Index ${i} is not a peak.`;
      return true;
    },
    reorganize([s], r, expected) {
      if (expected === '') return r === '' ? true : 'No valid rearrangement exists, so the answer is an empty line.';
      if (r.split('').sort().join('') !== s.split('').sort().join('')) return 'Your answer must use exactly the same characters.';
      for (let i = 1; i < r.length; i++) if (r[i] === r[i - 1]) return `Two equal characters are next to each other at position ${i}.`;
      return true;
    },
    courseOrder([n, pre], order, expected) {
      if (expected.length === 0) return order.length === 0 ? true : 'The courses cannot all be finished, so the answer is empty.';
      if (order.length !== n || new Set(order).size !== n || order.some((c) => c < 0 || c >= n)) return 'The order must contain every course exactly once.';
      const pos = new Map(order.map((c, i) => [c, i]));
      for (const [a, b] of pre) if (!(pos.get(b) < pos.get(a))) return `Course ${b} must come before course ${a}.`;
      return true;
    },
    alien([words], order, expected) {
      if (expected === '') return order === '' ? true : 'The words are inconsistent, so the answer is an empty line.';
      const letters = new Set(words.join(''));
      if (order.length !== letters.size || new Set(order).size !== order.length || [...order].some((c) => !letters.has(c))) return 'The order must contain every letter exactly once.';
      const pos = {};
      [...order].forEach((c, i) => { pos[c] = i; });
      for (let i = 0; i + 1 < words.length; i++) {
        const a = words[i]; const b = words[i + 1];
        let k = 0;
        while (k < a.length && k < b.length && a[k] === b[k]) k++;
        if (k === Math.min(a.length, b.length)) { if (a.length > b.length) return `"${a}" cannot come before "${b}".`; } else if (pos[a[k]] > pos[b[k]]) return `Your order puts ${b[k]} before ${a[k]}, but "${a}" comes before "${b}".`;
      }
      return true;
    },
    balancedBst([nums], level) {
      const root = buildTree(level);
      const ino = (n) => (n ? [...ino(n.left), n.val, ...ino(n.right)] : []);
      if (JSON.stringify(ino(root)) !== JSON.stringify(nums)) return 'The in-order traversal of your tree is not the sorted input.';
      const bal = (n) => { if (!n) return 0; const l = bal(n.left); const r = bal(n.right); return l < 0 || r < 0 || Math.abs(l - r) > 1 ? -1 : 1 + Math.max(l, r); };
      return bal(root) >= 0 ? true : 'The tree is not height balanced.';
    }
  };

  /* ------------------------------------------------------------------ describing the layout in words */

  function describeType(type) {
    const { base, dims } = parseType(type);
    const one = { int: 'an integer', float: 'a number', bool: 'true or false', str: 'a string', 'int?': 'an integer or null', tok: 'a token' }[base];
    const many = { int: 'integers', float: 'numbers', bool: 'true/false values', str: 'strings', 'int?': 'integers or null', tok: 'tokens' }[base];
    return dims === 0 ? one : dims === 1 ? `a list of ${many}` : `a 2D list of ${many}`;
  }

  /** One sentence per value, in the order they appear. `kind` can be 'tree' | 'list' | 'graph' for a friendlier wording. */
  function describeLayout(type, name, kind) {
    const { base, dims } = parseType(type);
    const n = '`' + name + '`';
    if (kind === 'tree') return `${n}: a binary tree in level order. A line with the number of entries, then one line with the entries (the word null marks a missing child).`;
    if (kind === 'list') return `${n}: a linked list. A line with its length, then one line with the node values.`;
    if (kind === 'graph') return `${n}: a graph as adjacency lists. A line with the number of nodes, then one line per node: the number of neighbours followed by the neighbours.`;
    if (dims === 0) {
      if (base === 'str') return `${n}: a string on one line (it may contain spaces, or be empty).`;
      if (base === 'bool') return `${n}: the word true or false on one line.`;
      return `${n}: ${base === 'float' ? 'a number' : 'an integer'} on one line.`;
    }
    if (dims === 1) {
      if (base === 'str') return `${n}: a line with the count, then that many lines, one string per line.`;
      if (base === 'tok') return `${n}: a line with the count, then that many lines, one value per line.`;
      return `${n}: a line with the count, then one line with the values separated by spaces (an empty line when the count is 0).`;
    }
    return `${n}: a line with the number of rows, then one line per row: the row length followed by its values separated by spaces.`;
  }

  return { parseType, encode, encodeLines, decodeInput, decodeOutput, compare, checkers, describeType, describeLayout, buildTree, SCALARS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Judge;
