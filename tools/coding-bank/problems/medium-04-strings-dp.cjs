const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'longest-palindromic-substring', title: 'Longest Palindromic Substring', d: 'M', topic: 'Strings', roles: ['SDE', 'Backend Developer'],
    desc: 'Return the length of the longest palindromic substring of s. (The tests compare lengths so that any longest palindrome is accepted.)\n\nExample:\nInput: s = "babad"\nOutput: 3 ("bab" or "aba")',
    fn: 'longestPalindromeLength', params: 's', constraints: '1 ≤ length ≤ 1000',
    tests: [['babad'], ['cbbd'], ['a'], ['ac'], ['racecar'], ['forgeeksskeegfor'], ['abacdfgdcaba']],
    gen: (r) => [r.str(r.int(1, 10), 'ab')],
    approaches: [
      A('Check every substring', 'Test each substring for being a palindrome.', 'O(n³)', 'O(1)', `function longestPalindromeLength(s) {
  const pal = (i, j) => { while (i < j) if (s[i++] !== s[j--]) return false; return true; };
  let best = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (j - i + 1 > best && pal(i, j)) best = j - i + 1;
  return best;
}`),
      A('Dynamic programming table', 'dp[i][j] is true when s[i..j] is a palindrome: the ends match and the inside is a palindrome.', 'O(n²)', 'O(n²)', `function longestPalindromeLength(s) {
  const n = s.length, dp = Array.from({ length: n }, () => new Array(n).fill(false));
  let best = 0;
  for (let len = 1; len <= n; len++) for (let i = 0; i + len <= n; i++) {
    const j = i + len - 1;
    dp[i][j] = s[i] === s[j] && (len <= 2 || dp[i + 1][j - 1]);
    if (dp[i][j]) best = len;
  }
  return best;
}`),
      A('Expand around every centre', 'Every palindrome has a centre (a character or a gap). Expand outward from each of the 2n - 1 centres while the ends match.', 'O(n²)', 'O(1)', `function longestPalindromeLength(s) {
  let best = 0;
  const grow = (l, r) => { while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; } return r - l - 1; };
  for (let i = 0; i < s.length; i++) best = Math.max(best, grow(i, i), grow(i, i + 1));
  return best;
}`),
      A("Manacher's algorithm", 'Reuse the palindrome radii already known inside a bigger palindrome so the total expansion work is linear.', 'O(n)', 'O(n)', `function longestPalindromeLength(s) {
  const t = '^#' + s.split('').join('#') + '#$', p = new Array(t.length).fill(0);
  let c = 0, r = 0, best = 0;
  for (let i = 1; i < t.length - 1; i++) {
    if (i < r) p[i] = Math.min(r - i, p[2 * c - i]);
    while (t[i + 1 + p[i]] === t[i - 1 - p[i]]) p[i]++;
    if (i + p[i] > r) { c = i; r = i + p[i]; }
    best = Math.max(best, p[i]);
  }
  return best;
}`)
    ]
  },
  {
    id: 'palindromic-substrings', title: 'Palindromic Substrings', d: 'M', topic: 'Strings', roles: ['SDE'],
    desc: 'Count how many substrings of s are palindromes. Substrings at different positions count separately even if they look the same.\n\nExample:\nInput: s = "aaa"\nOutput: 6',
    fn: 'countSubstrings', params: 's', constraints: '1 ≤ length ≤ 1000',
    tests: [['abc'], ['aaa'], ['a'], ['abba'], ['racecar'], ['abab']],
    gen: (r) => [r.str(r.int(1, 9), 'ab')],
    approaches: [
      A('Test every substring', 'Check each of the n(n+1)/2 substrings.', 'O(n³)', 'O(1)', `function countSubstrings(s) {
  let c = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) {
    let a = i, b = j, ok = true;
    while (a < b) if (s[a++] !== s[b--]) { ok = false; break; }
    if (ok) c++;
  }
  return c;
}`),
      A('Expand around centres', 'Each palindrome is found once by expanding from its centre, so count every successful expansion step.', 'O(n²)', 'O(1)', `function countSubstrings(s) {
  let c = 0;
  const grow = (l, r) => { while (l >= 0 && r < s.length && s[l] === s[r]) { c++; l--; r++; } };
  for (let i = 0; i < s.length; i++) { grow(i, i); grow(i, i + 1); }
  return c;
}`)
    ]
  },
  {
    id: 'generate-parentheses', title: 'Generate Parentheses', d: 'M', topic: 'Backtracking', roles: ['SDE', 'Backend Developer'], out: 'sort', sizes: [2, 4, 6, 8, 10, 12],
    desc: 'Given n pairs of parentheses, return every well-formed combination as strings (in any order; the tests sort them).\n\nExample:\nInput: n = 3\nOutput: ["((()))","(()())","(())()","()(())","()()()"]',
    fn: 'generateParenthesis', params: 'n', constraints: '1 ≤ n ≤ 8',
    tests: [[1], [2], [3], [4], [5]],
    gen: (r) => [r.int(1, 6)],
    approaches: [
      A('Generate all strings then filter', 'Build every string of n "(" and n ")" and keep the balanced ones.', 'O(n·4ⁿ)', 'O(n)', `function generateParenthesis(n) {
  const out = [];
  const valid = (s) => { let b = 0; for (const c of s) { b += c === '(' ? 1 : -1; if (b < 0) return false; } return b === 0; };
  const go = (s) => { if (s.length === 2 * n) { if (valid(s)) out.push(s); return; } go(s + '('); go(s + ')'); };
  go('');
  return out;
}`),
      A('Backtracking with counts', 'Add "(" while fewer than n are used, and add ")" only while it would not close more than were opened. Only valid prefixes are explored.', 'O(4ⁿ/√n)', 'O(n)', `function generateParenthesis(n) {
  const out = [];
  const go = (s, open, close) => {
    if (s.length === 2 * n) { out.push(s); return; }
    if (open < n) go(s + '(', open + 1, close);
    if (close < open) go(s + ')', open, close + 1);
  };
  go('', 0, 0);
  return out;
}`, { note: 'The number of results is the n-th Catalan number, about 4ⁿ / (n√n).' }),
      A('Build from smaller answers', 'Every answer is "(" + A + ")" + B where A and B are valid with total pairs n - 1. Combine the lists for each split.', 'O(4ⁿ/√n)', 'O(4ⁿ/√n)', `function generateParenthesis(n) {
  const dp = [['']];
  for (let k = 1; k <= n; k++) {
    const cur = [];
    for (let i = 0; i < k; i++) for (const a of dp[i]) for (const b of dp[k - 1 - i]) cur.push('(' + a + ')' + b);
    dp.push(cur);
  }
  return dp[n];
}`)
    ]
  },
  {
    id: 'letter-combinations', title: 'Letter Combinations of a Phone Number', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sort',
    desc: 'Given a string of digits from 2 to 9, return all letter combinations the number could represent on a phone keypad (2=abc, 3=def, 4=ghi, 5=jkl, 6=mno, 7=pqrs, 8=tuv, 9=wxyz). Any order; the tests sort them. An empty string gives an empty list.\n\nExample:\nInput: digits = "23"\nOutput: ["ad","ae","af","bd","be","bf","cd","ce","cf"]',
    fn: 'letterCombinations', params: 'digits', constraints: '0 ≤ length ≤ 4',
    tests: [['23'], [''], ['2'], ['79'], ['234'], ['99']],
    gen: (r) => [r.str(r.int(0, 3), '23456789')],
    approaches: [
      A('Backtracking', 'Pick one letter for each digit in turn, recursing to the next digit.', 'O(4ⁿ·n)', 'O(n)', `function letterCombinations(digits) {
  if (!digits) return [];
  const m = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' }, out = [];
  const go = (i, cur) => { if (i === digits.length) { out.push(cur); return; } for (const c of m[digits[i]]) go(i + 1, cur + c); };
  go(0, '');
  return out;
}`),
      A('Iterative product', 'Start with [""] and, for each digit, extend every existing combination with each of that digit\'s letters.', 'O(4ⁿ·n)', 'O(4ⁿ·n)', `function letterCombinations(digits) {
  if (!digits) return [];
  const m = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
  let out = [''];
  for (const d of digits) out = out.flatMap((p) => [...m[d]].map((c) => p + c));
  return out;
}`)
    ]
  },
  {
    id: 'longest-repeating-replacement', title: 'Longest Repeating Character Replacement', d: 'M', topic: 'Sliding Window', roles: ['SDE'],
    desc: 'You may change at most k characters of an uppercase string to any other letter. Return the length of the longest substring that can be made of a single repeated letter.\n\nExample:\nInput: s = "AABABBA", k = 1\nOutput: 4',
    fn: 'characterReplacement', params: 's, k', constraints: '1 ≤ length ≤ 10^5, 0 ≤ k ≤ length',
    tests: [['ABAB', 2], ['AABABBA', 1], ['A', 0], ['ABC', 0], ['AAAA', 2], ['ABBB', 2], ['AABBCC', 2]],
    gen: (r) => { const s = r.str(r.int(1, 10), 'ABC'); return [s, r.int(0, s.length)]; },
    approaches: [
      A('Every substring', 'For each substring count the most common letter; it is valid if length - maxCount ≤ k.', 'O(n²)', 'O(1)', `function characterReplacement(s, k) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const c = {};
    let mx = 0;
    for (let j = i; j < s.length; j++) { c[s[j]] = (c[s[j]] || 0) + 1; mx = Math.max(mx, c[s[j]]); if (j - i + 1 - mx <= k) best = Math.max(best, j - i + 1); }
  }
  return best;
}`),
      A('Sliding window', 'Grow the window; if more than k characters differ from the most frequent letter in it, move the left edge. The window length never shrinks, so it ends equal to the best length.', 'O(n)', 'O(1)', `function characterReplacement(s, k) {
  const c = {};
  let l = 0, mx = 0;
  for (let r = 0; r < s.length; r++) {
    c[s[r]] = (c[s[r]] || 0) + 1;
    mx = Math.max(mx, c[s[r]]);
    if (r - l + 1 - mx > k) { c[s[l]]--; l++; }
  }
  return s.length - l;
}`)
    ]
  },
  {
    id: 'permutation-in-string', title: 'Permutation in String', d: 'M', topic: 'Sliding Window', roles: ['SDE'],
    desc: 'Return true if s2 contains a permutation of s1 as a substring.\n\nExample:\nInput: s1 = "ab", s2 = "eidbaooo"\nOutput: true',
    fn: 'checkInclusion', params: 's1, s2', constraints: '1 ≤ length ≤ 10^4',
    tests: [['ab', 'eidbaooo'], ['ab', 'eidboaoo'], ['a', 'a'], ['abc', 'ab'], ['adc', 'dcda'], ['hello', 'ooolleoooleh']],
    gen: (r) => [r.str(r.int(1, 3), 'abc'), r.str(r.int(0, 8), 'abc')],
    approaches: [
      A('Sort every window', 'Sort s1, then sort every window of s2 of the same length and compare.', 'O(n·m log m)', 'O(m)', `function checkInclusion(s1, s2) {
  const t = s1.split('').sort().join('');
  for (let i = 0; i + s1.length <= s2.length; i++) if (s2.slice(i, i + s1.length).split('').sort().join('') === t) return true;
  return false;
}`),
      A('Sliding window of letter counts', 'Keep the 26 letter counts of the current window and update them as it slides one step, comparing with the counts of s1.', 'O(n)', 'O(1)', `function checkInclusion(s1, s2) {
  if (s1.length > s2.length) return false;
  const need = new Array(26).fill(0), have = new Array(26).fill(0), a = 97;
  for (const c of s1) need[c.charCodeAt(0) - a]++;
  for (let i = 0; i < s2.length; i++) {
    have[s2.charCodeAt(i) - a]++;
    if (i >= s1.length) have[s2.charCodeAt(i - s1.length) - a]--;
    if (i >= s1.length - 1 && need.every((v, k) => v === have[k])) return true;
  }
  return false;
}`)
    ]
  },
  {
    id: 'find-all-anagrams', title: 'Find All Anagrams in a String', d: 'M', topic: 'Sliding Window', roles: ['SDE'],
    desc: 'Return the start indexes of every substring of s that is an anagram of p, in increasing order.\n\nExample:\nInput: s = "cbaebabacd", p = "abc"\nOutput: [0,6]',
    fn: 'findAnagrams', params: 's, p', constraints: '1 ≤ length ≤ 3·10^4',
    tests: [['cbaebabacd', 'abc'], ['abab', 'ab'], ['a', 'ab'], ['aaaa', 'aa'], ['abc', 'abc'], ['baa', 'aa']],
    gen: (r) => [r.str(r.int(0, 9), 'abc'), r.str(r.int(1, 3), 'abc')],
    approaches: [
      A('Sort every window', 'Compare the sorted window with the sorted pattern at every start.', 'O(n·m log m)', 'O(m)', `function findAnagrams(s, p) {
  const t = p.split('').sort().join(''), out = [];
  for (let i = 0; i + p.length <= s.length; i++) if (s.slice(i, i + p.length).split('').sort().join('') === t) out.push(i);
  return out;
}`),
      A('Sliding window of counts', 'Maintain letter counts for the window and update them in constant time as it slides.', 'O(n)', 'O(1)', `function findAnagrams(s, p) {
  const out = [], need = new Array(26).fill(0), have = new Array(26).fill(0);
  for (const c of p) need[c.charCodeAt(0) - 97]++;
  for (let i = 0; i < s.length; i++) {
    have[s.charCodeAt(i) - 97]++;
    if (i >= p.length) have[s.charCodeAt(i - p.length) - 97]--;
    if (i >= p.length - 1 && need.every((v, k) => v === have[k])) out.push(i - p.length + 1);
  }
  return out;
}`)
    ]
  },
  {
    id: 'house-robber-ii', title: 'House Robber II', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 20, 25, 30, 35],
    desc: 'The houses are arranged in a circle, so the first and last houses are adjacent. You cannot rob two adjacent houses. Return the maximum you can rob.\n\nExample:\nInput: nums = [2,3,2]\nOutput: 3',
    fn: 'robCircle', params: 'nums', constraints: '1 ≤ n ≤ 100',
    tests: [[[2, 3, 2]], [[1, 2, 3, 1]], [[1]], [[1, 2]], [[5, 5, 5, 5]], [[4, 1, 2, 7, 5, 3, 1]], [[2, 7, 9, 3, 1]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 9)],
    approaches: [
      A('Recursion with a first-house flag', 'Choose to rob or skip each house, remembering whether the first one was robbed. Exponential without caching.', 'O(2ⁿ)', 'O(n)', `function robCircle(nums) {
  const n = nums.length;
  if (n === 1) return nums[0];
  const go = (i, first) => {
    if (i >= n) return 0;
    if (i === n - 1 && first) return 0;
    return Math.max(go(i + 1, first), nums[i] + go(i + 2, first || i === 0));
  };
  return go(0, false);
}`),
      A('Two linear problems', 'Because the first and last cannot both be robbed, answer the plain street problem twice: once without the last house, once without the first, and take the better.', 'O(n)', 'O(1)', `function robCircle(nums) {
  if (nums.length === 1) return nums[0];
  const line = (a) => { let p = 0, c = 0; for (const x of a) [p, c] = [c, Math.max(c, p + x)]; return c; };
  return Math.max(line(nums.slice(0, -1)), line(nums.slice(1)));
}`)
    ]
  },
  {
    id: 'longest-increasing-subsequence', title: 'Longest Increasing Subsequence', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Return the length of the longest strictly increasing subsequence of the array.\n\nExample:\nInput: nums = [10,9,2,5,3,7,101,18]\nOutput: 4 ([2,3,7,101])',
    fn: 'lengthOfLIS', params: 'nums', constraints: '1 ≤ n ≤ 2500',
    tests: [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7, 7]], [[1]], [[1, 2, 3, 4]], [[4, 3, 2, 1]], [[1, 3, 6, 7, 9, 4, 10, 5, 6]]],
    gen: (r) => [r.arr(r.int(1, 10), 0, 6)],
    approaches: [
      A('Try every subsequence', 'Decide for each element whether to include it. Exponential.', 'O(2ⁿ)', 'O(n)', `function lengthOfLIS(nums) {
  const go = (i, prev) => (i === nums.length ? 0 : Math.max(go(i + 1, prev), nums[i] > prev ? 1 + go(i + 1, nums[i]) : 0));
  return go(0, -Infinity);
}`),
      A('Dynamic programming', 'dp[i] is the length of the longest increasing subsequence ending at i: one more than the best dp[j] for an earlier smaller value.', 'O(n²)', 'O(n)', `function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1);
  let best = 0;
  for (let i = 0; i < nums.length; i++) { for (let j = 0; j < i; j++) if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1); best = Math.max(best, dp[i]); }
  return best;
}`),
      A('Patience sorting with binary search', 'Keep tails[k], the smallest possible last value of an increasing subsequence of length k + 1. For each number binary search where it belongs and overwrite that tail. The size of tails is the answer.', 'O(n log n)', 'O(n)', `function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < x) lo = m + 1; else hi = m; }
    tails[lo] = x;
  }
  return tails.length;
}`)
    ]
  },
  {
    id: 'unique-paths', title: 'Unique Paths', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 8, 10, 12, 14, 16],
    desc: 'A robot starts at the top-left of an m × n grid and can only move right or down. How many different paths lead to the bottom-right corner?\n\nExample:\nInput: m = 3, n = 7\nOutput: 28',
    fn: 'uniquePaths', params: 'm, n', constraints: '1 ≤ m, n ≤ 100',
    tests: [[3, 7], [3, 2], [1, 1], [1, 5], [5, 1], [4, 4], [10, 10]],
    gen: (r) => [r.int(1, 7), r.int(1, 7)],
    approaches: [
      A('Plain recursion', 'paths(m, n) = paths(m-1, n) + paths(m, n-1). Recomputes the same cells over and over.', 'O(2^(m+n))', 'O(m + n)', `function uniquePaths(m, n) {
  const go = (i, j) => (i === 1 || j === 1 ? 1 : go(i - 1, j) + go(i, j - 1));
  return go(m, n);
}`),
      A('Dynamic programming grid', 'Every cell is the sum of the cell above and the cell to the left.', 'O(m·n)', 'O(m·n)', `function uniquePaths(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1));
  for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
  return dp[m - 1][n - 1];
}`),
      A('One rolling row', 'Each row only needs the previous one, so keep a single array and update it left to right.', 'O(m·n)', 'O(n)', `function uniquePaths(m, n) {
  const row = new Array(n).fill(1);
  for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) row[j] += row[j - 1];
  return row[n - 1];
}`),
      A('Combinatorics', 'Any path makes m - 1 down moves and n - 1 right moves in some order, so the answer is C(m + n - 2, m - 1).', 'O(min(m, n))', 'O(1)', `function uniquePaths(m, n) {
  let r = 1;
  const k = Math.min(m, n) - 1, total = m + n - 2;
  for (let i = 1; i <= k; i++) r = (r * (total - k + i)) / i;
  return Math.round(r);
}`)
    ]
  },
  {
    id: 'min-path-sum', title: 'Minimum Path Sum', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 8, 10, 12, 14, 16],
    desc: 'Given a grid of non-negative numbers, find the path from the top-left to the bottom-right (moving only right or down) with the smallest sum of the numbers along it, and return that sum.\n\nExample:\nInput: grid = [[1,3,1],[1,5,1],[4,2,1]]\nOutput: 7',
    fn: 'minPathSum', params: 'grid', constraints: '1 ≤ m, n ≤ 200',
    tests: [[[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], [[[1, 2, 3], [4, 5, 6]]], [[[5]]], [[[1, 2, 3]]], [[[1], [2], [3]]], [[[1, 9, 1], [1, 9, 1], [1, 1, 1]]]],
    gen: (r) => [r.grid(r.int(1, 4), r.int(1, 4), 0, 9)],
    approaches: [
      A('Plain recursion', 'The cheapest path to a cell comes from the cell above or to its left. Without caching it is exponential.', 'O(2^(m+n))', 'O(m + n)', `function minPathSum(grid) {
  const go = (i, j) => {
    if (i === 0 && j === 0) return grid[0][0];
    if (i < 0 || j < 0) return Infinity;
    return grid[i][j] + Math.min(go(i - 1, j), go(i, j - 1));
  };
  return go(grid.length - 1, grid[0].length - 1);
}`),
      A('Dynamic programming grid', 'dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]).', 'O(m·n)', 'O(m·n)', `function minPathSum(grid) {
  const m = grid.length, n = grid[0].length, dp = grid.map((r) => [...r]);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    if (i === 0 && j === 0) continue;
    dp[i][j] += Math.min(i > 0 ? dp[i - 1][j] : Infinity, j > 0 ? dp[i][j - 1] : Infinity);
  }
  return dp[m - 1][n - 1];
}`),
      A('One rolling row', 'Only the previous row matters, so a single array is enough.', 'O(m·n)', 'O(n)', `function minPathSum(grid) {
  const n = grid[0].length, row = new Array(n).fill(Infinity);
  row[0] = 0;
  for (const r of grid) for (let j = 0; j < n; j++) row[j] = r[j] + Math.min(row[j], j > 0 ? row[j - 1] : Infinity);
  return row[n - 1];
}`)
    ]
  },
  {
    id: 'word-break', title: 'Word Break', d: 'M', topic: 'Dynamic Programming', roles: ['SDE', 'Backend Developer'], sizes: [5, 10, 15, 20, 25, 30],
    desc: 'Return true if the string s can be split into a sequence of words from the dictionary (words may be reused).\n\nExample:\nInput: s = "leetcode", wordDict = ["leet","code"]\nOutput: true',
    fn: 'wordBreak', params: 's, wordDict', constraints: '1 ≤ length ≤ 300',
    tests: [['leetcode', ['leet', 'code']], ['applepenapple', ['apple', 'pen']], ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], ['a', ['a']], ['aaaaaaa', ['aaaa', 'aaa']], ['abcd', ['a', 'abc', 'b', 'cd']], ['x', ['y']]],
    gen: (r) => [r.str(r.int(1, 9), 'ab'), Array.from({ length: r.int(1, 3) }, () => r.str(r.int(1, 3), 'ab'))],
    approaches: [
      A('Plain recursion', 'Try every dictionary word as the prefix and recurse on the rest. Repeats the same suffixes many times.', 'O(2ⁿ)', 'O(n)', `function wordBreak(s, wordDict) {
  const go = (i) => (i === s.length ? true : wordDict.some((w) => s.startsWith(w, i) && go(i + w.length)));
  return go(0);
}`),
      A('Memoised recursion', 'Cache whether each suffix can be segmented.', 'O(n²)', 'O(n)', `function wordBreak(s, wordDict) {
  const memo = new Map();
  const go = (i) => {
    if (i === s.length) return true;
    if (memo.has(i)) return memo.get(i);
    const ok = wordDict.some((w) => s.startsWith(w, i) && go(i + w.length));
    memo.set(i, ok);
    return ok;
  };
  return go(0);
}`),
      A('Bottom-up dynamic programming', 'dp[i] is true if the first i characters can be segmented: some earlier dp[j] is true and s[j..i) is a word.', 'O(n²)', 'O(n)', `function wordBreak(s, wordDict) {
  const set = new Set(wordDict), dp = new Array(s.length + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= s.length; i++) for (let j = 0; j < i; j++) if (dp[j] && set.has(s.slice(j, i))) { dp[i] = true; break; }
  return dp[s.length];
}`)
    ]
  },
  {
    id: 'partition-equal-subset-sum', title: 'Partition Equal Subset Sum', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 15, 20, 25, 30],
    desc: 'Return true if the array can be split into two subsets with equal sums.\n\nExample:\nInput: nums = [1,5,11,5]\nOutput: true ([1,5,5] and [11])',
    fn: 'canPartition', params: 'nums', constraints: '1 ≤ n ≤ 200, 1 ≤ nums[i] ≤ 100',
    tests: [[[1, 5, 11, 5]], [[1, 2, 3, 5]], [[2, 2]], [[1]], [[3, 3, 3, 3]], [[1, 1, 1, 1, 1, 1, 1, 1]], [[100, 99, 1]]],
    gen: (r) => [r.arr(r.int(1, 10), 1, 8)],
    approaches: [
      A('Try every subset', 'Search for a subset summing to half of the total.', 'O(2ⁿ)', 'O(n)', `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const half = total / 2;
  const go = (i, s) => (s === half ? true : i === nums.length || s > half ? false : go(i + 1, s + nums[i]) || go(i + 1, s));
  return go(0, 0);
}`),
      A('Subset-sum table (2D)', 'dp[i][s] says whether some subset of the first i numbers sums to s.', 'O(n·S)', 'O(n·S)', `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const half = total / 2, dp = Array.from({ length: nums.length + 1 }, () => new Array(half + 1).fill(false));
  for (let i = 0; i <= nums.length; i++) dp[i][0] = true;
  for (let i = 1; i <= nums.length; i++) for (let s = 1; s <= half; s++) dp[i][s] = dp[i - 1][s] || (s >= nums[i - 1] && dp[i - 1][s - nums[i - 1]]);
  return dp[nums.length][half];
}`, { note: 'S is half of the total sum.' }),
      A('One boolean array', 'Iterate sums downwards so each number is used once: dp[s] |= dp[s - x].', 'O(n·S)', 'O(S)', `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const half = total / 2, dp = new Array(half + 1).fill(false);
  dp[0] = true;
  for (const x of nums) for (let s = half; s >= x; s--) if (dp[s - x]) dp[s] = true;
  return dp[half];
}`),
      A('Bitset with BigInt', 'Represent all reachable sums as the bits of one big integer and OR-in a shifted copy per number.', 'O(n·S/64)', 'O(S)', `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const half = BigInt(total / 2);
  let bits = 1n;
  for (const x of nums) bits |= bits << BigInt(x);
  return ((bits >> half) & 1n) === 1n;
}`)
    ]
  },
  {
    id: 'coin-change-ii', title: 'Coin Change II', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 15, 20, 25, 30],
    desc: 'Return the number of different combinations of coins that make up the amount (order does not matter, coins can be reused). Return 0 if it cannot be made.\n\nExample:\nInput: amount = 5, coins = [1,2,5]\nOutput: 4',
    fn: 'change', params: 'amount, coins', constraints: '1 ≤ coins ≤ 300, 0 ≤ amount ≤ 5000',
    tests: [[5, [1, 2, 5]], [3, [2]], [10, [10]], [0, [7]], [8, [2, 3, 5]], [4, [1, 2, 3]], [12, [1, 5, 10]]],
    gen: (r) => [r.int(0, 12), r.uniq(r.int(1, 3), 1, 6)],
    approaches: [
      A('Recursion over coin index', 'For each coin either use it again or move on to the next coin.', 'O(2^(S+n))', 'O(S + n)', `function change(amount, coins) {
  const go = (i, a) => (a === 0 ? 1 : a < 0 || i === coins.length ? 0 : go(i, a - coins[i]) + go(i + 1, a));
  return go(0, amount);
}`),
      A('2D dynamic programming', 'dp[i][a] counts combinations of the first i coins that make amount a.', 'O(S·n)', 'O(S·n)', `function change(amount, coins) {
  const dp = Array.from({ length: coins.length + 1 }, () => new Array(amount + 1).fill(0));
  for (let i = 0; i <= coins.length; i++) dp[i][0] = 1;
  for (let i = 1; i <= coins.length; i++) for (let a = 1; a <= amount; a++) dp[i][a] = dp[i - 1][a] + (a >= coins[i - 1] ? dp[i][a - coins[i - 1]] : 0);
  return dp[coins.length][amount];
}`),
      A('1D dynamic programming', 'Loop coins on the outside and amounts on the inside so each combination is counted once regardless of order: dp[a] += dp[a - coin].', 'O(S·n)', 'O(S)', `function change(amount, coins) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;
  for (const c of coins) for (let a = c; a <= amount; a++) dp[a] += dp[a - c];
  return dp[amount];
}`)
    ]
  },
  {
    id: 'decode-ways', title: 'Decode Ways', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 15, 20, 25, 30],
    desc: 'A message of digits encodes letters as A=1, B=2, ..., Z=26. Return the number of ways to decode the digit string (a leading zero cannot be decoded).\n\nExample:\nInput: s = "226"\nOutput: 3 (BZ, VF, BBF)',
    fn: 'numDecodings', params: 's', constraints: '1 ≤ length ≤ 100',
    tests: [['12'], ['226'], ['06'], ['0'], ['10'], ['27'], ['11106'], ['2101']],
    gen: (r) => [r.str(r.int(1, 8), '0112')],
    approaches: [
      A('Plain recursion', 'Decode one digit or two digits at a time. Recomputes the same suffixes.', 'O(2ⁿ)', 'O(n)', `function numDecodings(s) {
  const go = (i) => {
    if (i === s.length) return 1;
    if (s[i] === '0') return 0;
    let c = go(i + 1);
    if (i + 1 < s.length && Number(s.slice(i, i + 2)) <= 26) c += go(i + 2);
    return c;
  };
  return go(0);
}`),
      A('Dynamic programming array', 'dp[i] is the ways to decode the first i digits: add dp[i-1] if the last digit is valid and dp[i-2] if the last two form 10..26.', 'O(n)', 'O(n)', `function numDecodings(s) {
  const dp = new Array(s.length + 1).fill(0);
  dp[0] = 1;
  for (let i = 1; i <= s.length; i++) {
    if (s[i - 1] !== '0') dp[i] += dp[i - 1];
    if (i > 1 && s[i - 2] !== '0' && Number(s.slice(i - 2, i)) <= 26) dp[i] += dp[i - 2];
  }
  return dp[s.length];
}`),
      A('Two rolling variables', 'Only the last two dp values are needed.', 'O(n)', 'O(1)', `function numDecodings(s) {
  let a = 1, b = 0;
  for (let i = 1; i <= s.length; i++) {
    let c = 0;
    if (s[i - 1] !== '0') c += a;
    if (i > 1 && s[i - 2] !== '0' && Number(s.slice(i - 2, i)) <= 26) c += b;
    [b, a] = [a, c];
  }
  return a;
}`)
    ]
  },
  {
    id: 'maximal-square', title: 'Maximal Square', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'],
    desc: "Given a grid of '0' and '1', return the area of the largest square containing only '1's.\n\nExample:\nInput: matrix = [['1','0','1','0','0'],['1','0','1','1','1'],['1','1','1','1','1'],['1','0','0','1','0']]\nOutput: 4",
    fn: 'maximalSquare', params: 'matrix', constraints: '1 ≤ m, n ≤ 300',
    tests: [[[['1', '0', '1', '0', '0'], ['1', '0', '1', '1', '1'], ['1', '1', '1', '1', '1'], ['1', '0', '0', '1', '0']]], [[['0', '1'], ['1', '0']]], [[['0']]], [[['1']]], [[['1', '1'], ['1', '1']]], [[['1', '1', '1'], ['1', '1', '1'], ['0', '1', '1']]]],
    gen: (r) => [Array.from({ length: r.int(1, 4) }, () => Array.from({ length: r.int(1, 1) + 2 }, () => r.pick(['0', '1', '1'])))],
    approaches: [
      A('Check every square', 'For each top-left cell grow the square while every cell inside is a 1.', 'O((m·n)²)', 'O(1)', `function maximalSquare(matrix) {
  const m = matrix.length, n = matrix[0].length;
  let best = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let k = 0;
    for (;;) {
      if (i + k >= m || j + k >= n) break;
      let ok = true;
      for (let a = 0; a <= k && ok; a++) if (matrix[i + k][j + a] !== '1' || matrix[i + a][j + k] !== '1') ok = false;
      if (!ok) break;
      k++;
    }
    best = Math.max(best, k);
  }
  return best * best;
}`),
      A('Dynamic programming', 'dp[i][j] is the side of the largest all-ones square ending at (i, j): one plus the minimum of the three neighbours above, left and diagonal.', 'O(m·n)', 'O(m·n)', `function maximalSquare(matrix) {
  const m = matrix.length, n = matrix[0].length, dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let best = 0;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) if (matrix[i - 1][j - 1] === '1') { dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]); best = Math.max(best, dp[i][j]); }
  return best * best;
}`),
      A('Dynamic programming with one row', 'The recurrence only looks one row up, so keep a single row and the previous diagonal value.', 'O(m·n)', 'O(n)', `function maximalSquare(matrix) {
  const n = matrix[0].length, row = new Array(n + 1).fill(0);
  let best = 0;
  for (const r of matrix) {
    let diag = 0;
    for (let j = 1; j <= n; j++) {
      const up = row[j];
      row[j] = r[j - 1] === '1' ? 1 + Math.min(row[j], row[j - 1], diag) : 0;
      diag = up;
      best = Math.max(best, row[j]);
    }
  }
  return best * best;
}`)
    ]
  },
  {
    id: 'perfect-squares', title: 'Perfect Squares', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 5000, 10000, 20000],
    desc: 'Return the fewest perfect squares (1, 4, 9, 16, ...) that sum to n.\n\nExample:\nInput: n = 12\nOutput: 3 (4 + 4 + 4)',
    fn: 'numSquares', params: 'n', constraints: '1 ≤ n ≤ 10^4',
    tests: [[12], [13], [1], [2], [7], [25], [28]],
    gen: (r) => [r.int(1, 24)],
    approaches: [
      A('Plain recursion', 'Subtract each possible square and recurse. Exponential without caching.', 'O(√n^n)', 'O(n)', `function numSquares(n) {
  const go = (x) => { if (x === 0) return 0; let b = Infinity; for (let s = 1; s * s <= x; s++) b = Math.min(b, 1 + go(x - s * s)); return b; };
  return go(n);
}`),
      A('Dynamic programming', 'dp[x] is the fewest squares for x: 1 + the best dp[x - s²] over all squares s².', 'O(n√n)', 'O(n)', `function numSquares(n) {
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  for (let x = 1; x <= n; x++) for (let s = 1; s * s <= x; s++) dp[x] = Math.min(dp[x], dp[x - s * s] + 1);
  return dp[n];
}`),
      A('Breadth-first search', 'Treat each remainder as a node and subtracting a square as an edge. The shortest path to 0 is the answer.', 'O(n√n)', 'O(n)', `function numSquares(n) {
  let q = [n], seen = new Set([n]), steps = 0;
  while (q.length) {
    steps++;
    const next = [];
    for (const x of q) for (let s = 1; s * s <= x; s++) {
      const r = x - s * s;
      if (r === 0) return steps;
      if (!seen.has(r)) { seen.add(r); next.push(r); }
    }
    q = next;
  }
}`),
      A("Lagrange's four-square theorem", 'Every number is a sum of at most four squares. Check for 1 square, 2 squares, then use the fact that numbers of the form 4^a(8b+7) need exactly 4; otherwise the answer is 3.', 'O(√n)', 'O(1)', `function numSquares(n) {
  const isSq = (x) => { const r = Math.round(Math.sqrt(x)); return r * r === x; };
  if (isSq(n)) return 1;
  let m = n;
  while (m % 4 === 0) m /= 4;
  if (m % 8 === 7) return 4;
  for (let i = 1; i * i <= n; i++) if (isSq(n - i * i)) return 2;
  return 3;
}`)
    ]
  }
];
