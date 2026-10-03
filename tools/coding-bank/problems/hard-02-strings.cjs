const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'edit-distance', title: 'Edit Distance', d: 'H', topic: 'Dynamic Programming', roles: ['SDE', 'Backend Developer'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'Return the minimum number of operations (insert a character, delete a character, replace a character) needed to convert word1 into word2.\n\nExample:\nInput: word1 = "horse", word2 = "ros"\nOutput: 3',
    fn: 'minDistance', params: 'word1, word2', constraints: '0 ≤ length ≤ 500',
    tests: [['horse', 'ros'], ['intention', 'execution'], ['', 'a'], ['a', ''], ['abc', 'abc'], ['kitten', 'sitting'], ['', '']],
    gen: (r) => [r.str(r.int(0, 6), 'abc'), r.str(r.int(0, 6), 'abc')],
    approaches: [
      A('Plain recursion', 'If the last characters match, drop both. Otherwise try insert, delete and replace and take the cheapest. The same prefixes repeat enormously.', 'O(3ⁿ)', 'O(n)', `function minDistance(a, b) {
  const go = (i, j) => (i === 0 ? j : j === 0 ? i : a[i - 1] === b[j - 1] ? go(i - 1, j - 1) : 1 + Math.min(go(i - 1, j), go(i, j - 1), go(i - 1, j - 1)));
  return go(a.length, b.length);
}`),
      A('Dynamic programming table', 'dp[i][j] is the edit distance between the first i and first j characters. Fill the table from the empty prefixes outwards.', 'O(n·m)', 'O(n·m)', `function minDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}`),
      A('Dynamic programming with two rows', 'Each row depends only on the previous row, so keep two rows.', 'O(n·m)', 'O(min(n, m))', `function minDistance(a, b) {
  if (b.length > a.length) [a, b] = [b, a];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}`)
    ]
  },
  {
    id: 'min-window-substring', title: 'Minimum Window Substring', d: 'H', topic: 'Sliding Window', roles: ['SDE', 'Backend Developer'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Return the shortest substring of s that contains every character of t (including duplicates), or an empty string if there is none. When several windows tie, return the leftmost.\n\nExample:\nInput: s = "ADOBECODEBANC", t = "ABC"\nOutput: "BANC"',
    fn: 'minWindow', params: 's, t', constraints: '1 ≤ length ≤ 10^5',
    tests: [['ADOBECODEBANC', 'ABC'], ['a', 'a'], ['a', 'aa'], ['ab', 'b'], ['aa', 'aa'], ['cabwefgewcwaefgcf', 'cae'], ['abc', 'cba']],
    gen: (r) => [r.str(r.int(1, 10), 'abc'), r.str(r.int(1, 3), 'abc')],
    approaches: [
      A('Check every substring', 'For every substring test whether it has enough of each required character; keep the shortest (leftmost on ties).', 'O(n³)', 'O(1)', `function minWindow(s, t) {
  const need = {};
  for (const c of t) need[c] = (need[c] || 0) + 1;
  let best = '';
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) {
    const sub = s.slice(i, j + 1);
    if (best && sub.length >= best.length) continue;
    const have = {};
    for (const c of sub) have[c] = (have[c] || 0) + 1;
    if (Object.keys(need).every((c) => (have[c] || 0) >= need[c])) best = sub;
  }
  return best;
}`),
      A('Sliding window with counts', 'Expand the right edge until the window covers t, then shrink from the left while it still does, recording the shortest window. A "missing" counter makes the coverage check O(1).', 'O(n + m)', 'O(k)', `function minWindow(s, t) {
  const need = {};
  for (const c of t) need[c] = (need[c] || 0) + 1;
  let missing = t.length, bi = 0, bl = Infinity, l = 0;
  for (let r = 0; r < s.length; r++) {
    if (need[s[r]]-- > 0) missing--;
    while (missing === 0) {
      if (r - l + 1 < bl) { bl = r - l + 1; bi = l; }
      if (++need[s[l]] > 0) missing++;
      l++;
    }
  }
  return bl === Infinity ? '' : s.slice(bi, bi + bl);
}`)
    ]
  },
  {
    id: 'regex-matching', title: 'Regular Expression Matching', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'Implement matching with "." (any single character) and "*" (zero or more of the preceding element). The match must cover the entire string.\n\nExample:\nInput: s = "aab", p = "c*a*b"\nOutput: true',
    fn: 'isMatch', params: 's, p', constraints: '1 ≤ length ≤ 20, p never starts with "*"',
    tests: [['aa', 'a'], ['aa', 'a*'], ['ab', '.*'], ['aab', 'c*a*b'], ['mississippi', 'mis*is*p*.'], ['', 'a*'], ['abc', 'a.c'], ['ab', '.*c']],
    gen: (r) => { const toks = []; for (let i = 0; i < r.int(1, 4); i++) { const c = r.pick(['a', 'b', '.']); toks.push(r.next() < 0.4 ? c + '*' : c); } return [r.str(r.int(0, 6), 'ab'), toks.join('')]; },
    approaches: [
      A('Recursion', 'Compare the first characters. If the next pattern character is "*", either skip the starred element or consume one matching character and keep the pattern. Exponential in the worst case.', 'O(2^(n+m))', 'O(n + m)', `function isMatch(s, p) {
  const go = (i, j) => {
    if (j === p.length) return i === s.length;
    const first = i < s.length && (p[j] === s[i] || p[j] === '.');
    if (p[j + 1] === '*') return go(i, j + 2) || (first && go(i + 1, j));
    return first && go(i + 1, j + 1);
  };
  return go(0, 0);
}`),
      A('Memoised recursion', 'The same recursion with a cache keyed by (i, j), so each state is solved once.', 'O(n·m)', 'O(n·m)', `function isMatch(s, p) {
  const memo = new Map();
  const go = (i, j) => {
    const key = i * 100 + j;
    if (memo.has(key)) return memo.get(key);
    let r;
    if (j === p.length) r = i === s.length;
    else {
      const first = i < s.length && (p[j] === s[i] || p[j] === '.');
      r = p[j + 1] === '*' ? go(i, j + 2) || (first && go(i + 1, j)) : first && go(i + 1, j + 1);
    }
    memo.set(key, r);
    return r;
  };
  return go(0, 0);
}`),
      A('Bottom-up dynamic programming', 'dp[i][j] says whether the first i characters of s match the first j of p. A "*" lets the pattern match zero copies (dp[i][j-2]) or one more copy of the character before it.', 'O(n·m)', 'O(n·m)', `function isMatch(s, p) {
  const n = s.length, m = p.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(false));
  dp[0][0] = true;
  for (let j = 2; j <= m; j++) if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    if (p[j - 1] === '*') dp[i][j] = dp[i][j - 2] || ((p[j - 2] === '.' || p[j - 2] === s[i - 1]) && dp[i - 1][j]);
    else dp[i][j] = (p[j - 1] === '.' || p[j - 1] === s[i - 1]) && dp[i - 1][j - 1];
  }
  return dp[n][m];
}`)
    ]
  },
  {
    id: 'wildcard-matching', title: 'Wildcard Matching', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'Implement matching with "?" (any single character) and "*" (any sequence, including empty). The match must cover the entire string.\n\nExample:\nInput: s = "adceb", p = "*a*b"\nOutput: true',
    fn: 'isWildcardMatch', params: 's, p', constraints: '0 ≤ length ≤ 2000',
    tests: [['aa', 'a'], ['aa', '*'], ['cb', '?a'], ['adceb', '*a*b'], ['acdcb', 'a*c?b'], ['', '*'], ['abc', 'a?c'], ['mississippi', 'm??*ss*?i*pi']],
    gen: (r) => [r.str(r.int(0, 6), 'ab'), r.str(r.int(0, 5), 'ab?*')],
    approaches: [
      A('Recursion', 'On "*" try matching zero or more characters; otherwise compare directly. Exponential with several stars.', 'O(2^(n+m))', 'O(n + m)', `function isWildcardMatch(s, p) {
  const go = (i, j) => {
    if (j === p.length) return i === s.length;
    if (p[j] === '*') return go(i, j + 1) || (i < s.length && go(i + 1, j));
    return i < s.length && (p[j] === '?' || p[j] === s[i]) && go(i + 1, j + 1);
  };
  return go(0, 0);
}`),
      A('Dynamic programming table', 'dp[i][j] is whether s[0..i) matches p[0..j). A "*" matches empty (dp[i][j-1]) or consumes one more character (dp[i-1][j]).', 'O(n·m)', 'O(n·m)', `function isWildcardMatch(s, p) {
  const n = s.length, m = p.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(false));
  dp[0][0] = true;
  for (let j = 1; j <= m; j++) if (p[j - 1] === '*') dp[0][j] = dp[0][j - 1];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    dp[i][j] = p[j - 1] === '*' ? dp[i][j - 1] || dp[i - 1][j] : (p[j - 1] === '?' || p[j - 1] === s[i - 1]) && dp[i - 1][j - 1];
  return dp[n][m];
}`),
      A('Greedy two pointers with backtracking to the last star', 'Walk both strings. On a star remember its position and the current string index. On a mismatch jump back to the last star and let it absorb one more character.', 'O(n·m)', 'O(1)', `function isWildcardMatch(s, p) {
  let i = 0, j = 0, star = -1, mark = 0;
  while (i < s.length) {
    if (j < p.length && (p[j] === '?' || p[j] === s[i])) { i++; j++; }
    else if (j < p.length && p[j] === '*') { star = j++; mark = i; }
    else if (star >= 0) { j = star + 1; i = ++mark; }
    else return false;
  }
  while (j < p.length && p[j] === '*') j++;
  return j === p.length;
}`, { note: 'Worst case is O(n·m), but typical inputs run in near-linear time.' })
    ]
  },
  {
    id: 'distinct-subsequences', title: 'Distinct Subsequences', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'Return the number of distinct subsequences of s that equal t.\n\nExample:\nInput: s = "rabbbit", t = "rabbit"\nOutput: 3',
    fn: 'numDistinct', params: 's, t', constraints: '1 ≤ length ≤ 1000',
    tests: [['rabbbit', 'rabbit'], ['babgbag', 'bag'], ['a', 'a'], ['a', 'b'], ['aaa', 'aa'], ['abc', ''], ['ddd', 'dd']],
    gen: (r) => [r.str(r.int(0, 8), 'ab'), r.str(r.int(0, 3), 'ab')],
    approaches: [
      A('Recursion', 'At each character of s either match it with the current character of t or skip it. Counts every successful path.', 'O(2ⁿ)', 'O(n)', `function numDistinct(s, t) {
  const go = (i, j) => (j === t.length ? 1 : i === s.length ? 0 : go(i + 1, j) + (s[i] === t[j] ? go(i + 1, j + 1) : 0));
  return go(0, 0);
}`),
      A('Dynamic programming table', 'dp[i][j] counts ways to build t[0..j) from s[0..i): skip s[i-1], or if it equals t[j-1], also use it.', 'O(n·m)', 'O(n·m)', `function numDistinct(s, t) {
  const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i++) dp[i][0] = 1;
  for (let i = 1; i <= s.length; i++) for (let j = 1; j <= t.length; j++) dp[i][j] = dp[i - 1][j] + (s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] : 0);
  return dp[s.length][t.length];
}`),
      A('One-dimensional dynamic programming', 'Keep a single array indexed by j and update it from right to left so the previous row\'s values are still available.', 'O(n·m)', 'O(m)', `function numDistinct(s, t) {
  const dp = new Array(t.length + 1).fill(0);
  dp[0] = 1;
  for (const c of s) for (let j = t.length; j >= 1; j--) if (c === t[j - 1]) dp[j] += dp[j - 1];
  return dp[t.length];
}`)
    ]
  },
  {
    id: 'interleaving-string', title: 'Interleaving String', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'Return true if s3 can be formed by interleaving s1 and s2 (merging them while keeping the order of characters within each).\n\nExample:\nInput: s1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"\nOutput: true',
    fn: 'isInterleave', params: 's1, s2, s3', constraints: '0 ≤ length ≤ 100',
    tests: [['aabcc', 'dbbca', 'aadbbcbcac'], ['aabcc', 'dbbca', 'aadbbbaccc'], ['', '', ''], ['a', '', 'a'], ['a', 'b', 'ab'], ['a', 'b', 'ba'], ['ab', 'ab', 'abab'], ['a', 'b', 'abc']],
    gen: (r) => { const a = r.str(r.int(0, 4), 'ab'), b = r.str(r.int(0, 4), 'ab'); return [a, b, r.next() < 0.5 ? (a + b).split('').sort(() => r.next() - 0.5).join('') : r.str(a.length + b.length, 'ab')]; },
    approaches: [
      A('Recursion', 'Take the next character of s3 from s1 or s2 when it matches. Tries both choices, which repeats work.', 'O(2^(n+m))', 'O(n + m)', `function isInterleave(s1, s2, s3) {
  if (s1.length + s2.length !== s3.length) return false;
  const go = (i, j) => (i + j === s3.length ? true : (i < s1.length && s1[i] === s3[i + j] && go(i + 1, j)) || (j < s2.length && s2[j] === s3[i + j] && go(i, j + 1)));
  return go(0, 0);
}`),
      A('Dynamic programming table', 'dp[i][j] is true if the first i characters of s1 and first j of s2 interleave into the first i + j of s3.', 'O(n·m)', 'O(n·m)', `function isInterleave(s1, s2, s3) {
  const n = s1.length, m = s2.length;
  if (n + m !== s3.length) return false;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(false));
  dp[0][0] = true;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i > 0 && s1[i - 1] === s3[i + j - 1] && dp[i - 1][j]) dp[i][j] = true;
    if (j > 0 && s2[j - 1] === s3[i + j - 1] && dp[i][j - 1]) dp[i][j] = true;
  }
  return dp[n][m];
}`),
      A('Dynamic programming with one row', 'Each row only needs the one above it, so compress the table into a single array.', 'O(n·m)', 'O(m)', `function isInterleave(s1, s2, s3) {
  const n = s1.length, m = s2.length;
  if (n + m !== s3.length) return false;
  const dp = new Array(m + 1).fill(false);
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i === 0 && j === 0) dp[j] = true;
    else dp[j] = (i > 0 && dp[j] && s1[i - 1] === s3[i + j - 1]) || (j > 0 && dp[j - 1] && s2[j - 1] === s3[i + j - 1]);
  }
  return dp[m];
}`)
    ]
  },
  {
    id: 'text-justification', title: 'Text Justification', d: 'H', topic: 'Strings', roles: ['SDE'],
    desc: 'Format words into lines of exactly maxWidth characters, fully justified. Pack as many words per line as fit; distribute extra spaces as evenly as possible between words (extra spaces on the left slots first). The last line and single-word lines are left-justified and padded with spaces on the right.\n\nExample:\nInput: words = ["This","is","an","example","of","text","justification."], maxWidth = 16\nOutput: ["This    is    an","example  of text","justification.  "]',
    fn: 'fullJustify', params: 'words, maxWidth', constraints: '1 ≤ words ≤ 300, word length ≤ maxWidth ≤ 100',
    tests: [[['This', 'is', 'an', 'example', 'of', 'text', 'justification.'], 16], [['What', 'must', 'be', 'acknowledgment', 'shall', 'be'], 16], [['Science', 'is', 'what', 'we', 'understand', 'well', 'enough', 'to', 'explain', 'to', 'a', 'computer.', 'Art', 'is', 'everything', 'else', 'we', 'do'], 20], [['a'], 3], [['a', 'b', 'c'], 5], [['hello', 'world'], 20]],
    gen: (r) => { const w = Array.from({ length: r.int(1, 7) }, () => r.str(r.int(1, 5), 'ab')); return [w, Math.max(...w.map((x) => x.length)) + r.int(0, 6)]; },
    approaches: [
      A('Greedy line packing with a gap list', 'Add words to a line while they fit with single spaces. For each full line compute the gap sizes explicitly and build the string.', 'O(total characters)', 'O(maxWidth)', `function fullJustify(words, maxWidth) {
  const out = [];
  let i = 0;
  while (i < words.length) {
    let j = i, len = 0;
    while (j < words.length && len + words[j].length + (j - i) <= maxWidth) len += words[j++].length;
    const slots = j - i - 1;
    let line = '';
    if (j === words.length || slots === 0) line = words.slice(i, j).join(' ').padEnd(maxWidth, ' ');
    else {
      const spaces = maxWidth - len, base = Math.floor(spaces / slots), extra = spaces % slots;
      for (let k = i; k < j; k++) { line += words[k]; if (k < j - 1) line += ' '.repeat(base + (k - i < extra ? 1 : 0)); }
    }
    out.push(line);
    i = j;
  }
  return out;
}`),
      A('Packing then distributing with divmod', 'Group the words into lines first, then justify each line with one divmod computation per line.', 'O(total characters)', 'O(maxWidth)', `function fullJustify(words, maxWidth) {
  const lines = [];
  let cur = [], len = 0;
  for (const w of words) {
    if (cur.length && len + w.length + cur.length > maxWidth) { lines.push(cur); cur = []; len = 0; }
    cur.push(w); len += w.length;
  }
  lines.push(cur);
  return lines.map((ws, idx) => {
    if (idx === lines.length - 1 || ws.length === 1) return ws.join(' ').padEnd(maxWidth, ' ');
    const total = maxWidth - ws.reduce((a, w) => a + w.length, 0), gaps = ws.length - 1, q = Math.floor(total / gaps), r = total % gaps;
    return ws.map((w, k) => (k < gaps ? w + ' '.repeat(q + (k < r ? 1 : 0)) : w)).join('');
  });
}`)
    ]
  },
  {
    id: 'shortest-palindrome', title: 'Shortest Palindrome', d: 'H', topic: 'Strings', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'You may add characters only at the front of a string. Return the shortest palindrome you can create this way.\n\nExample:\nInput: s = "aacecaaa"\nOutput: "aaacecaaa"',
    fn: 'shortestPalindrome', params: 's', constraints: '0 ≤ length ≤ 5·10^4',
    tests: [['aacecaaa'], ['abcd'], [''], ['a'], ['aa'], ['abb'], ['racecar'], ['abab']],
    gen: (r) => [r.str(r.int(0, 8), 'ab')],
    approaches: [
      A('Find the longest palindromic prefix by checking each', 'Try each prefix from longest to shortest, find the first that is a palindrome, and prepend the reverse of the rest.', 'O(n²)', 'O(n)', `function shortestPalindrome(s) {
  const pal = (t) => { for (let i = 0, j = t.length - 1; i < j; i++, j--) if (t[i] !== t[j]) return false; return true; };
  for (let k = s.length; k >= 0; k--) if (pal(s.slice(0, k))) return s.slice(k).split('').reverse().join('') + s;
}`),
      A('KMP failure function on s + "#" + reverse(s)', 'The longest palindromic prefix of s is the longest prefix of s that is also a suffix of reverse(s). A prefix-function (KMP) computes that in linear time.', 'O(n)', 'O(n)', `function shortestPalindrome(s) {
  const t = s + '#' + s.split('').reverse().join(''), f = new Array(t.length).fill(0);
  for (let i = 1; i < t.length; i++) { let k = f[i - 1]; while (k > 0 && t[i] !== t[k]) k = f[k - 1]; if (t[i] === t[k]) k++; f[i] = k; }
  const keep = f[t.length - 1];
  return s.slice(keep).split('').reverse().join('') + s;
}`)
    ]
  },
  {
    id: 'basic-calculator', title: 'Basic Calculator', d: 'H', topic: 'Stacks', roles: ['SDE'],
    desc: 'Evaluate an expression string with non-negative integers, +, -, parentheses and spaces. A unary minus may appear directly before a parenthesis or number.\n\nExample:\nInput: s = "(1+(4+5+2)-3)+(6+8)"\nOutput: 23',
    fn: 'calculate', params: 's', constraints: '1 ≤ length ≤ 3·10^5',
    tests: [['1 + 1'], [' 2-1 + 2 '], ['(1+(4+5+2)-3)+(6+8)'], ['-(2+3)'], ['2-(5-6)'], ['10'], ['1-(-2)'], ['(7)-(0)+(4)']],
    gen: (r) => { const mk = (d) => { let s = String(r.int(0, 9)); for (let i = 0; i < r.int(0, 2); i++) { s += r.pick(['+', '-']) + (d > 0 && r.next() < 0.5 ? '(' + mk(d - 1) + ')' : String(r.int(0, 9))); } return s; }; return [mk(2)]; },
    approaches: [
      A('Stack of signs', 'Scan left to right keeping the current sign and a result. On "(" push the result and sign onto the stack and start fresh; on ")" pop and combine.', 'O(n)', 'O(n)', `function calculate(s) {
  const st = [];
  let res = 0, sign = 1, num = 0;
  for (const c of s) {
    if (c >= '0' && c <= '9') num = num * 10 + Number(c);
    else if (c === '+' || c === '-') { res += sign * num; num = 0; sign = c === '+' ? 1 : -1; }
    else if (c === '(') { st.push(res, sign); res = 0; sign = 1; }
    else if (c === ')') { res += sign * num; num = 0; res *= st.pop(); res += st.pop(); }
  }
  return res + sign * num;
}`),
      A('Recursive descent', 'Parse an expression as a sequence of terms; a term is a number or a parenthesised sub-expression that is parsed recursively.', 'O(n)', 'O(n)', `function calculate(s) {
  let i = 0;
  const expr = () => {
    let res = 0, sign = 1;
    while (i < s.length && s[i] !== ')') {
      const c = s[i];
      if (c === ' ') i++;
      else if (c === '+') { sign = 1; i++; }
      else if (c === '-') { sign = -1; i++; }
      else if (c === '(') { i++; res += sign * expr(); i++; sign = 1; }
      else { let n = 0; while (i < s.length && s[i] >= '0' && s[i] <= '9') n = n * 10 + Number(s[i++]); res += sign * n; sign = 1; }
    }
    return res;
  };
  return expr();
}`)
    ]
  },
  {
    id: 'palindrome-partitioning-ii', title: 'Palindrome Partitioning II', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'Return the minimum number of cuts needed to partition a string into palindromic substrings.\n\nExample:\nInput: s = "aab"\nOutput: 1',
    fn: 'minCut', params: 's', constraints: '1 ≤ length ≤ 2000',
    tests: [['aab'], ['a'], ['ab'], ['aaaa'], ['abcba'], ['abcd'], ['ababbbabbababa']],
    gen: (r) => [r.str(r.int(1, 9), 'ab')],
    approaches: [
      A('Recursion over cut positions', 'Try every first palindromic piece and recurse on the rest, taking the fewest cuts. Exponential.', 'O(2ⁿ)', 'O(n)', `function minCut(s) {
  const pal = (i, j) => { while (i < j) if (s[i++] !== s[j--]) return false; return true; };
  const go = (i) => { if (pal(i, s.length - 1)) return 0; let b = Infinity; for (let j = i; j < s.length - 1; j++) if (pal(i, j)) b = Math.min(b, 1 + go(j + 1)); return b; };
  return go(0);
}`),
      A('Dynamic programming with a palindrome table', 'cut[i] is the fewest cuts for the first i characters. Precompute which substrings are palindromes, then take the best earlier cut for each ending.', 'O(n²)', 'O(n²)', `function minCut(s) {
  const n = s.length, p = Array.from({ length: n }, () => new Array(n).fill(false)), cut = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    cut[j] = j;
    for (let i = 0; i <= j; i++) if (s[i] === s[j] && (j - i < 2 || p[i + 1][j - 1])) { p[i][j] = true; cut[j] = i === 0 ? 0 : Math.min(cut[j], cut[i - 1] + 1); }
  }
  return cut[n - 1];
}`),
      A('Expand around centres', 'Every palindrome grows from a centre. Update the minimum cut for each palindrome found, using the cuts already computed for the shorter prefix.', 'O(n²)', 'O(n)', `function minCut(s) {
  const n = s.length, cut = Array.from({ length: n + 1 }, (_, i) => i - 1);
  for (let c = 0; c < n; c++) {
    for (let k = 0; c - k >= 0 && c + k < n && s[c - k] === s[c + k]; k++) cut[c + k + 1] = Math.min(cut[c + k + 1], cut[c - k] + 1);
    for (let k = 1; c - k + 1 >= 0 && c + k < n && s[c - k + 1] === s[c + k]; k++) cut[c + k + 1] = Math.min(cut[c + k + 1], cut[c - k + 1] + 1);
  }
  return cut[n];
}`)
    ]
  },
  {
    id: 'longest-substring-k-repeating', title: 'Longest Substring with At Least K Repeating Characters', d: 'H', topic: 'Sliding Window', roles: ['SDE'],
    desc: 'Return the length of the longest substring of s in which every character appears at least k times.\n\nExample:\nInput: s = "ababbc", k = 2\nOutput: 5 ("ababb")',
    fn: 'longestSubstring', params: 's, k', constraints: '1 ≤ length ≤ 10^4, lowercase letters',
    tests: [['aaabb', 3], ['ababbc', 2], ['a', 1], ['a', 2], ['abc', 1], ['abcabc', 2], ['bbaaacbd', 3]],
    gen: (r) => [r.str(r.int(1, 10), 'abc'), r.int(1, 3)],
    approaches: [
      A('Check every substring', 'Count letters in every substring and test the condition.', 'O(n²·26)', 'O(1)', `function longestSubstring(s, k) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const c = {};
    for (let j = i; j < s.length; j++) {
      c[s[j]] = (c[s[j]] || 0) + 1;
      if (Object.values(c).every((v) => v >= k)) best = Math.max(best, j - i + 1);
    }
  }
  return best;
}`),
      A('Divide and conquer on rare letters', 'A letter that appears fewer than k times in the whole string can never be in an answer, so split the string at it and solve the pieces recursively.', 'O(n·26)', 'O(n)', `function longestSubstring(s, k) {
  if (s.length < k) return 0;
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  const bad = Object.keys(c).find((ch) => c[ch] < k);
  if (!bad) return s.length;
  return Math.max(...s.split(bad).map((p) => longestSubstring(p, k)));
}`),
      A('Sliding window per distinct-letter count', 'For each target number of distinct letters t from 1 to 26, slide a window that has exactly t distinct letters and check whether all of them appear at least k times.', 'O(26·n)', 'O(1)', `function longestSubstring(s, k) {
  let best = 0;
  for (let t = 1; t <= 26; t++) {
    const c = new Array(26).fill(0);
    let l = 0, distinct = 0, atLeast = 0;
    for (let r = 0; r < s.length; r++) {
      const a = s.charCodeAt(r) - 97;
      if (c[a]++ === 0) distinct++;
      if (c[a] === k) atLeast++;
      while (distinct > t) { const b = s.charCodeAt(l++) - 97; if (c[b]-- === k) atLeast--; if (c[b] === 0) distinct--; }
      if (distinct === t && atLeast === t) best = Math.max(best, r - l + 1);
    }
  }
  return best;
}`)
    ]
  },
  {
    id: 'substring-concatenation', title: 'Substring with Concatenation of All Words', d: 'H', topic: 'Sliding Window', roles: ['SDE'],
    desc: 'Given a string s and an array of equal-length words, return the starting indices (in increasing order) of substrings of s that are a concatenation of every word exactly once, in any order.\n\nExample:\nInput: s = "barfoothefoobarman", words = ["foo","bar"]\nOutput: [0,9]',
    fn: 'findSubstring', params: 's, words', constraints: '1 ≤ words ≤ 5000, equal lengths',
    tests: [['barfoothefoobarman', ['foo', 'bar']], ['wordgoodgoodgoodbestword', ['word', 'good', 'best', 'word']], ['barfoofoobarthefoobarman', ['bar', 'foo', 'the']], ['aaaa', ['a', 'a']], ['abc', ['d']], ['ababaab', ['ab', 'ba', 'ba']], ['a', ['a']]],
    gen: (r) => { const L = r.int(1, 2); const words = Array.from({ length: r.int(1, 3) }, () => r.str(L, 'ab')); return [r.str(r.int(0, 9), 'ab'), words]; },
    approaches: [
      A('Try every start and permutation check', 'At each index split the next (words × length) characters into pieces and compare their sorted list with the sorted words.', 'O(n·m·L)', 'O(m)', `function findSubstring(s, words) {
  const L = words[0].length, total = L * words.length, key = [...words].sort().join('|'), out = [];
  for (let i = 0; i + total <= s.length; i++) {
    const parts = [];
    for (let j = 0; j < total; j += L) parts.push(s.slice(i + j, i + j + L));
    if (parts.sort().join('|') === key) out.push(i);
  }
  return out;
}`, { note: 'm is the number of words and L their length.' }),
      A('Count words in a window per start', 'At each start walk word by word with a map of remaining counts and stop at the first word that is unknown or used up.', 'O(n·m)', 'O(m)', `function findSubstring(s, words) {
  const L = words[0].length, m = words.length, need = new Map(), out = [];
  for (const w of words) need.set(w, (need.get(w) || 0) + 1);
  for (let i = 0; i + L * m <= s.length; i++) {
    const seen = new Map();
    let k = 0;
    for (; k < m; k++) {
      const w = s.slice(i + k * L, i + (k + 1) * L);
      if (!need.has(w)) break;
      seen.set(w, (seen.get(w) || 0) + 1);
      if (seen.get(w) > need.get(w)) break;
    }
    if (k === m) out.push(i);
  }
  return out;
}`),
      A('Sliding window per offset', 'For each of the L possible alignments slide a window word by word, adding the incoming word and removing the outgoing one, so each word is processed a constant number of times.', 'O(n·L)', 'O(m)', `function findSubstring(s, words) {
  const L = words[0].length, m = words.length, need = new Map(), out = [];
  for (const w of words) need.set(w, (need.get(w) || 0) + 1);
  for (let off = 0; off < L; off++) {
    let l = off, count = 0, seen = new Map();
    for (let r = off; r + L <= s.length; r += L) {
      const w = s.slice(r, r + L);
      if (!need.has(w)) { seen = new Map(); count = 0; l = r + L; continue; }
      seen.set(w, (seen.get(w) || 0) + 1); count++;
      while (seen.get(w) > need.get(w)) { const x = s.slice(l, l + L); seen.set(x, seen.get(x) - 1); count--; l += L; }
      if (count === m) out.push(l);
    }
  }
  return out.sort((a, b) => a - b);
}`)
    ]
  }
];
