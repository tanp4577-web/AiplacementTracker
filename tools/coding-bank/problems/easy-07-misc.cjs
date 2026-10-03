const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'counting-bits', title: 'Counting Bits', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'For every number i from 0 to n return the number of 1 bits in the binary representation of i, as an array of length n + 1.\n\nExample:\nInput: n = 5\nOutput: [0,1,1,2,1,2]',
    fn: 'countBits', params: 'n', constraints: '0 ≤ n ≤ 10^5',
    tests: [[2], [5], [0], [1], [8], [16], [20]],
    gen: (r) => [r.int(0, 40)],
    approaches: [
      A('Count each number separately', 'For every i count its set bits by looping over its bits.', 'O(n log n)', 'O(1)', `function countBits(n) {
  const out = [];
  for (let i = 0; i <= n; i++) { let c = 0, x = i; while (x) { c += x & 1; x >>= 1; } out.push(c); }
  return out;
}`, { note: 'Extra space is O(1) beyond the output array.' }),
      A('Brian Kernighan per number', 'x & (x - 1) removes the lowest set bit, so each number costs one step per set bit.', 'O(n log n)', 'O(1)', `function countBits(n) {
  const out = [];
  for (let i = 0; i <= n; i++) { let c = 0, x = i; while (x) { x &= x - 1; c++; } out.push(c); }
  return out;
}`),
      A('Dynamic programming on the last bit', 'bits(i) = bits(i >> 1) + (i & 1): reuse the answer for i / 2 that is already computed.', 'O(n)', 'O(1)', `function countBits(n) {
  const out = [0];
  for (let i = 1; i <= n; i++) out[i] = out[i >> 1] + (i & 1);
  return out;
}`)
    ]
  },
  {
    id: 'reverse-bits', title: 'Reverse Bits', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'Reverse the bits of a 32-bit unsigned integer and return the result as an unsigned integer.\n\nExample:\nInput: n = 43261596 (00000010100101000001111010011100)\nOutput: 964176192 (00111001011110000010100101000000)',
    fn: 'reverseBits', params: 'n', constraints: '0 ≤ n < 2^32',
    tests: [[43261596], [4294967293], [0], [1], [4294967295], [2147483648], [255]],
    gen: (r) => [r.int(0, 100000)],
    approaches: [
      A('Through a binary string', 'Pad to 32 bits, reverse the string, and parse it back.', 'O(1)', 'O(1)', `function reverseBits(n) {
  return parseInt(n.toString(2).padStart(32, '0').split('').reverse().join(''), 2);
}`, { note: 'Always 32 characters, so this is constant-sized work.' }),
      A('Shift bits one at a time', 'Take the lowest bit of n, push it onto the result from the other side, and repeat 32 times.', 'O(1)', 'O(1)', `function reverseBits(n) {
  let r = 0;
  for (let i = 0; i < 32; i++) { r = r * 2 + (n % 2); n = Math.floor(n / 2); }
  return r;
}`)
    ]
  },
  {
    id: 'number-complement', title: 'Number Complement', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'The complement of a number flips every bit of its binary representation (without leading zeros). Return the complement of num.\n\nExample:\nInput: num = 5 (101)\nOutput: 2 (010)',
    fn: 'findComplement', params: 'num', constraints: '1 ≤ num < 2^31',
    tests: [[5], [1], [10], [7], [8], [2147483647], [100]],
    gen: (r) => [r.int(1, 5000)],
    approaches: [
      A('Flip the binary string', 'Write the number in binary, swap every 0 and 1, and parse it back.', 'O(log n)', 'O(log n)', `function findComplement(num) {
  return parseInt(num.toString(2).split('').map((b) => (b === '0' ? '1' : '0')).join(''), 2);
}`),
      A('XOR with a mask', 'Build a mask of ones as long as the number, then XOR flips exactly those bits.', 'O(log n)', 'O(1)', `function findComplement(num) {
  let mask = 1;
  while (mask <= num) mask *= 2;
  return mask - 1 - num;
}`)
    ]
  },
  {
    id: 'min-cost-climbing-stairs', title: 'Min Cost Climbing Stairs', d: 'E', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 20, 25, 30, 35],
    desc: 'cost[i] is the price of stepping on stair i. After paying you may climb one or two stairs. You can start on stair 0 or 1. Return the minimum cost to reach the top (one step past the last stair).\n\nExample:\nInput: cost = [10,15,20]\nOutput: 15',
    fn: 'minCostClimbingStairs', params: 'cost', constraints: '2 ≤ n ≤ 1000',
    tests: [[[10, 15, 20]], [[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]], [[0, 0]], [[5, 5]], [[1, 2, 3, 4]], [[0, 2, 2, 1]]],
    gen: (r) => [r.arr(r.int(2, 10), 0, 9)],
    approaches: [
      A('Recursion', 'The cost of reaching stair i is the cheaper of arriving from i-1 or i-2. Without caching it repeats work.', 'O(2ⁿ)', 'O(n)', `function minCostClimbingStairs(cost) {
  const n = cost.length;
  const go = (i) => (i < 2 ? 0 : Math.min(go(i - 1) + cost[i - 1], go(i - 2) + cost[i - 2]));
  return go(n);
}`),
      A('Dynamic programming table', 'dp[i] = min(dp[i-1] + cost[i-1], dp[i-2] + cost[i-2]).', 'O(n)', 'O(n)', `function minCostClimbingStairs(cost) {
  const dp = [0, 0];
  for (let i = 2; i <= cost.length; i++) dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
  return dp[cost.length];
}`),
      A('Two rolling variables', 'Only the last two dp values matter.', 'O(n)', 'O(1)', `function minCostClimbingStairs(cost) {
  let a = 0, b = 0;
  for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])];
  return b;
}`)
    ]
  },
  {
    id: 'tribonacci', title: 'N-th Tribonacci Number', d: 'E', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 15, 20, 25, 30],
    desc: 'T(0) = 0, T(1) = 1, T(2) = 1 and T(n) = T(n-1) + T(n-2) + T(n-3). Return T(n).\n\nExample:\nInput: n = 4\nOutput: 4',
    fn: 'tribonacci', params: 'n', constraints: '0 ≤ n ≤ 37',
    tests: [[0], [1], [2], [4], [10], [20], [22]],
    gen: (r) => [r.int(0, 15)],
    approaches: [
      A('Plain recursion', 'Follow the definition. Each call makes three more, so the work grows like 3ⁿ.', 'O(3ⁿ)', 'O(n)', `function tribonacci(n) {
  return n === 0 ? 0 : n < 3 ? 1 : tribonacci(n - 1) + tribonacci(n - 2) + tribonacci(n - 3);
}`),
      A('Memoised recursion', 'Cache each T(k) once.', 'O(n)', 'O(n)', `function tribonacci(n) {
  const m = [0, 1, 1];
  const go = (k) => (m[k] !== undefined ? m[k] : (m[k] = go(k - 1) + go(k - 2) + go(k - 3)));
  return go(n);
}`),
      A('Three rolling variables', 'Keep only the last three values and roll them forward.', 'O(n)', 'O(1)', `function tribonacci(n) {
  if (n === 0) return 0;
  let a = 0, b = 1, c = 1;
  for (let i = 3; i <= n; i++) [a, b, c] = [b, c, a + b + c];
  return c;
}`)
    ]
  },
  {
    id: 'last-stone-weight', title: 'Last Stone Weight', d: 'E', topic: 'Heap', roles: ['SDE'],
    desc: 'You have stones with given weights. Each turn smash the two heaviest: if they are equal both vanish, otherwise the heavier one keeps the difference. Return the weight of the last remaining stone, or 0 if none remains.\n\nExample:\nInput: stones = [2,7,4,1,8,1]\nOutput: 1',
    fn: 'lastStoneWeight', params: 'stones', constraints: '1 ≤ n ≤ 30',
    tests: [[[2, 7, 4, 1, 8, 1]], [[1]], [[2, 2]], [[3, 7, 2]], [[10, 4, 2, 10]], [[9, 3, 2, 10]]],
    gen: (r) => [r.arr(r.int(1, 8), 1, 9)],
    approaches: [
      A('Sort every round', 'Sort the stones, take the two largest, and push back the difference. Re-sorting each round is wasteful.', 'O(n² log n)', 'O(n)', `function lastStoneWeight(stones) {
  const s = [...stones];
  while (s.length > 1) {
    s.sort((a, b) => a - b);
    const y = s.pop(), x = s.pop();
    if (y !== x) s.push(y - x);
  }
  return s.length ? s[0] : 0;
}`),
      A('Max-heap', 'A heap gives the largest stone in O(log n) and accepts the new stone in O(log n), so each round is cheap.', 'O(n log n)', 'O(n)', `function lastStoneWeight(stones) {
  const h = [];
  const push = (v) => { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p] >= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => {
    const top = h[0], last = h.pop();
    if (h.length) { h[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < h.length && h[l] > h[m]) m = l; if (r < h.length && h[r] > h[m]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
    return top;
  };
  for (const s of stones) push(s);
  while (h.length > 1) { const y = pop(), x = pop(); if (y !== x) push(y - x); }
  return h.length ? h[0] : 0;
}`)
    ]
  },
  {
    id: 'valid-perfect-square', title: 'Valid Perfect Square', d: 'E', topic: 'Searching', roles: ['SDE'], sizes: [100, 10000, 1000000, 100000000, 1000000000, 2000000000],
    desc: 'Return true if num is a perfect square (the square of an integer), without using a built-in square-root function.\n\nExample:\nInput: num = 16\nOutput: true',
    fn: 'isPerfectSquare', params: 'num', constraints: '1 ≤ num ≤ 2^31 - 1',
    tests: [[16], [14], [1], [2], [808201], [2147483647], [25], [26]],
    gen: (r) => [r.int(1, 2500)],
    approaches: [
      A('Try every integer', 'Increase i while i × i is below num and check for equality.', 'O(√n)', 'O(1)', `function isPerfectSquare(num) {
  let i = 1;
  while (i * i < num) i++;
  return i * i === num;
}`),
      A('Binary search', 'Search 1..num for a value whose square equals num.', 'O(log n)', 'O(1)', `function isPerfectSquare(num) {
  let lo = 1, hi = num;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2), sq = mid * mid;
    if (sq === num) return true;
    if (sq < num) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}`),
      A('Sum of odd numbers', 'The n-th perfect square is the sum of the first n odd numbers (1 + 3 + 5 + ...). Subtract odd numbers until zero or below.', 'O(√n)', 'O(1)', `function isPerfectSquare(num) {
  let odd = 1;
  while (num > 0) { num -= odd; odd += 2; }
  return num === 0;
}`)
    ]
  },
  {
    id: 'arranging-coins', title: 'Arranging Coins', d: 'E', topic: 'Math', roles: ['SDE'], sizes: [100, 10000, 1000000, 100000000, 1000000000, 2000000000],
    desc: 'You build a staircase where row k has exactly k coins. Given n coins, return the number of complete rows you can build.\n\nExample:\nInput: n = 8\nOutput: 3 (rows of 1, 2 and 3 coins use 6 coins, the 4th row would need 4 but only 2 remain)',
    fn: 'arrangeCoins', params: 'n', constraints: '1 ≤ n ≤ 2^31 - 1',
    tests: [[5], [8], [1], [2], [3], [6], [10], [1804289383]],
    gen: (r) => [r.int(1, 3000)],
    approaches: [
      A('Subtract row by row', 'Keep taking k coins for row k until there are not enough left.', 'O(√n)', 'O(1)', `function arrangeCoins(n) {
  let k = 0;
  while (n > k) { k++; n -= k; }
  return k;
}`),
      A('Binary search on the rows', 'k complete rows need k(k+1)/2 coins, which grows steadily, so binary search the largest k that fits.', 'O(log n)', 'O(1)', `function arrangeCoins(n) {
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if ((mid * (mid + 1)) / 2 <= n) lo = mid; else hi = mid - 1;
  }
  return lo;
}`),
      A('Quadratic formula', 'Solve k(k+1)/2 ≤ n for k: k = floor((√(8n + 1) - 1) / 2).', 'O(1)', 'O(1)', `function arrangeCoins(n) {
  let k = Math.floor((Math.sqrt(8 * n + 1) - 1) / 2);
  while ((k + 1) * (k + 2) / 2 <= n) k++;
  while (k * (k + 1) / 2 > n) k--;
  return k;
}`, { note: 'The two small loops correct any floating-point rounding for large n.' })
    ]
  },
  {
    id: 'check-if-pangram', title: 'Check if the Sentence Is Pangram', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'A pangram contains every letter of the English alphabet at least once. Return true if the lowercase sentence is a pangram.\n\nExample:\nInput: sentence = "thequickbrownfoxjumpsoverthelazydog"\nOutput: true',
    fn: 'checkIfPangram', params: 'sentence', constraints: '1 ≤ length ≤ 1000, lowercase letters only',
    tests: [['thequickbrownfoxjumpsoverthelazydog'], ['leetcode'], ['abcdefghijklmnopqrstuvwxyz'], ['a'], ['abcdefghijklmnopqrstuvwxy'], ['zyxwvutsrqponmlkjihgfedcba']],
    gen: (r) => [r.str(r.int(1, 60), 'abcdefghijklmnopqrstuvwxyz')],
    approaches: [
      A('Check each letter', 'For every letter a..z test whether the sentence includes it. That is 26 scans of the sentence, which is still linear because 26 is a constant.', 'O(n)', 'O(1)', `function checkIfPangram(sentence) {
  for (let c = 97; c <= 122; c++) if (!sentence.includes(String.fromCharCode(c))) return false;
  return true;
}`),
      A('Set of letters', 'Put the letters in a set; a pangram has 26 distinct letters.', 'O(n)', 'O(1)', `function checkIfPangram(sentence) {
  return new Set(sentence).size === 26;
}`),
      A('Bitmask', 'Set one bit per letter seen. When all 26 bits are set the sentence is a pangram.', 'O(n)', 'O(1)', `function checkIfPangram(sentence) {
  let mask = 0;
  for (const ch of sentence) mask |= 1 << (ch.charCodeAt(0) - 97);
  return mask === (1 << 26) - 1;
}`)
    ]
  },
  {
    id: 'max-number-of-balloons', title: 'Maximum Number of Balloons', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Using the letters of text at most once each, return the maximum number of copies of the word "balloon" you can form.\n\nExample:\nInput: text = "loonbalxballpoon"\nOutput: 2',
    fn: 'maxNumberOfBalloons', params: 'text', constraints: '1 ≤ length ≤ 10^4',
    tests: [['nlaebolko'], ['loonbalxballpoon'], ['leetcode'], ['balloon'], ['balllllllllllloooooooooon'], ['bbaalloonn']],
    gen: (r) => [r.str(r.int(1, 20), 'balonxy')],
    approaches: [
      A('Build balloons one at a time', 'Remove the letters of one "balloon" from the text repeatedly until it is no longer possible.', 'O(n·k)', 'O(n)', `function maxNumberOfBalloons(text) {
  let t = text.split(''), count = 0;
  for (;;) {
    for (const c of 'balloon') {
      const i = t.indexOf(c);
      if (i < 0) return count;
      t.splice(i, 1);
    }
    count++;
  }
}`),
      A('Count letters and divide', '"balloon" needs 1 b, 1 a, 2 l, 2 o, 1 n. Count those letters and take the smallest ratio.', 'O(n)', 'O(1)', `function maxNumberOfBalloons(text) {
  const c = {};
  for (const ch of text) c[ch] = (c[ch] || 0) + 1;
  return Math.min(c.b || 0, c.a || 0, Math.floor((c.l || 0) / 2), Math.floor((c.o || 0) / 2), c.n || 0);
}`)
    ]
  },
  {
    id: 'repeated-substring-pattern', title: 'Repeated Substring Pattern', d: 'E', topic: 'Strings', roles: ['SDE'],
    desc: 'Return true if the string can be built by repeating one of its substrings two or more times.\n\nExample:\nInput: s = "abab"\nOutput: true',
    fn: 'repeatedSubstringPattern', params: 's', constraints: '1 ≤ length ≤ 10^4',
    tests: [['abab'], ['aba'], ['abcabcabcabc'], ['a'], ['aa'], ['abac'], ['ababab']],
    gen: (r) => { const u = r.str(r.int(1, 3), 'ab'); return [r.next() < 0.5 ? u.repeat(r.int(1, 4)) : r.str(r.int(1, 6), 'ab')]; },
    approaches: [
      A('Try every divisor length', 'For each length that divides n, repeat the prefix and compare with the string.', 'O(n²)', 'O(n)', `function repeatedSubstringPattern(s) {
  const n = s.length;
  for (let len = 1; len <= n / 2; len++)
    if (n % len === 0 && s.slice(0, len).repeat(n / len) === s) return true;
  return false;
}`),
      A('Search inside the doubled string', 'If s is a repetition, it appears inside s + s at a position other than 0 and n. This one-liner uses the built-in string search.', 'O(n)', 'O(n)', `function repeatedSubstringPattern(s) {
  return (s + s).indexOf(s, 1) < s.length;
}`, { note: 'Linear only if the search algorithm is linear (KMP style); naive search is O(n²) in the worst case.' })
    ]
  }
];
