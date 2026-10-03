const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'burst-balloons', title: 'Burst Balloons', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'You have balloons with values nums[i]. Bursting balloon i earns nums[i-1] × nums[i] × nums[i+1] coins, where a neighbour outside the array counts as 1. After a burst the neighbours become adjacent. Return the maximum coins you can collect by bursting all balloons wisely.\n\nExample:\nInput: nums = [3,1,5,8]\nOutput: 167',
    fn: 'maxCoins', params: 'nums', constraints: '1 ≤ n ≤ 300',
    tests: [[[3, 1, 5, 8]], [[1, 5]], [[7]], [[]], [[2, 4, 3]], [[9, 76, 64, 21]], [[1, 1, 1, 1]]],
    gen: (r) => [r.arr(r.int(0, 6), 0, 6)],
    approaches: [
      A('Try every order of bursting', 'Choose which balloon to burst first, recurse on the remaining balloons, and take the best total. Factorial many orders.', 'O(n!)', 'O(n)', `function maxCoins(nums) {
  const go = (a) => {
    if (!a.length) return 0;
    let best = 0;
    for (let i = 0; i < a.length; i++) {
      const gain = (i ? a[i - 1] : 1) * a[i] * (i + 1 < a.length ? a[i + 1] : 1);
      best = Math.max(best, gain + go([...a.slice(0, i), ...a.slice(i + 1)]));
    }
    return best;
  };
  return go(nums);
}`),
      A('Interval dynamic programming (last balloon)', 'Think of the LAST balloon to burst in a range (i, j). Its neighbours are then fixed at i and j, so dp[i][j] = max over k of dp[i][k] + dp[k][j] + nums[i]·nums[k]·nums[j].', 'O(n³)', 'O(n²)', `function maxCoins(nums) {
  const a = [1, ...nums, 1], n = a.length, dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let len = 2; len < n; len++) for (let i = 0; i + len < n; i++) {
    const j = i + len;
    for (let k = i + 1; k < j; k++) dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]);
  }
  return dp[0][n - 1];
}`),
      A('Top-down memoisation on the same idea', 'The same last-balloon recurrence written recursively with a cache.', 'O(n³)', 'O(n²)', `function maxCoins(nums) {
  const a = [1, ...nums, 1], memo = new Map();
  const go = (i, j) => {
    if (j - i < 2) return 0;
    const key = i * 1000 + j;
    if (memo.has(key)) return memo.get(key);
    let best = 0;
    for (let k = i + 1; k < j; k++) best = Math.max(best, go(i, k) + go(k, j) + a[i] * a[k] * a[j]);
    memo.set(key, best);
    return best;
  };
  return go(0, a.length - 1);
}`)
    ]
  },
  {
    id: 'russian-doll-envelopes', title: 'Russian Doll Envelopes', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'envelopes[i] = [width, height]. One envelope fits inside another only if both its width and its height are strictly smaller. Return the maximum number of envelopes you can nest.\n\nExample:\nInput: envelopes = [[5,4],[6,4],[6,7],[2,3]]\nOutput: 3',
    fn: 'maxEnvelopes', params: 'envelopes', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[[5, 4], [6, 4], [6, 7], [2, 3]]], [[[1, 1], [1, 1], [1, 1]]], [[[1, 1]]], [[[4, 5], [4, 6], [6, 7], [2, 3], [1, 1]]], [[[1, 3], [3, 5], [6, 7], [6, 8], [8, 4], [9, 5]]], [[[2, 3], [2, 4], [2, 5]]]],
    gen: (r) => [Array.from({ length: r.int(1, 7) }, () => [r.int(1, 6), r.int(1, 6)])],
    approaches: [
      A('Recursion over choices', 'Try placing each envelope as the outermost one and recurse on those that fit inside.', 'O(2ⁿ)', 'O(n)', `function maxEnvelopes(e) {
  const go = (w, h, i) => { if (i === e.length) return 0; let best = go(w, h, i + 1); if (e[i][0] > w && e[i][1] > h) best = Math.max(best, 1 + go(e[i][0], e[i][1], i + 1)); return best; };
  const s = [...e].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  e = s;
  return go(-Infinity, -Infinity, 0);
}`),
      A('Sort + longest chain dynamic programming', 'Sort by width, then dp[i] is the longest nesting chain ending with envelope i (comparing heights and strict widths with earlier ones).', 'O(n²)', 'O(n)', `function maxEnvelopes(e) {
  const a = [...e].sort((x, y) => x[0] - y[0] || x[1] - y[1]), dp = new Array(a.length).fill(1);
  let best = 0;
  for (let i = 0; i < a.length; i++) { for (let j = 0; j < i; j++) if (a[j][0] < a[i][0] && a[j][1] < a[i][1]) dp[i] = Math.max(dp[i], dp[j] + 1); best = Math.max(best, dp[i]); }
  return best;
}`),
      A('Sort + longest increasing subsequence of heights', 'Sort by width ascending but by height DESCENDING for equal widths, so envelopes with the same width cannot chain. The answer is the length of the longest strictly increasing subsequence of heights, found with binary search.', 'O(n log n)', 'O(n)', `function maxEnvelopes(e) {
  const a = [...e].sort((x, y) => x[0] - y[0] || y[1] - x[1]), tails = [];
  for (const [, h] of a) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < h) lo = m + 1; else hi = m; }
    tails[lo] = h;
  }
  return tails.length;
}`)
    ]
  },
  {
    id: 'stock-iii', title: 'Best Time to Buy and Sell Stock III', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'You may complete at most two transactions (buy then sell) and must sell before buying again. Return the maximum profit.\n\nExample:\nInput: prices = [3,3,5,0,0,3,1,4]\nOutput: 6',
    fn: 'maxProfitTwo', params: 'prices', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[3, 3, 5, 0, 0, 3, 1, 4]], [[1, 2, 3, 4, 5]], [[7, 6, 4, 3, 1]], [[1]], [[2, 1, 4, 5, 2, 9, 7]], [[1, 4, 2, 7]], [[6, 1, 3, 2, 4, 7]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 9)],
    approaches: [
      A('Split point with two single-transaction passes', 'For every split index compute the best single transaction before it and after it, and take the best sum. Recomputing each side is quadratic.', 'O(n²)', 'O(1)', `function maxProfitTwo(prices) {
  const one = (a) => { let min = Infinity, b = 0; for (const p of a) { min = Math.min(min, p); b = Math.max(b, p - min); } return b; };
  let best = 0;
  for (let i = 0; i <= prices.length; i++) best = Math.max(best, one(prices.slice(0, i)) + one(prices.slice(i)));
  return best;
}`),
      A('Prefix and suffix arrays', 'Precompute the best single transaction ending by day i (left to right) and starting from day i (right to left), then combine at every split.', 'O(n)', 'O(n)', `function maxProfitTwo(prices) {
  const n = prices.length, L = new Array(n).fill(0), R = new Array(n + 1).fill(0);
  let min = prices[0];
  for (let i = 1; i < n; i++) { min = Math.min(min, prices[i]); L[i] = Math.max(L[i - 1], prices[i] - min); }
  let max = prices[n - 1];
  for (let i = n - 2; i >= 0; i--) { max = Math.max(max, prices[i]); R[i] = Math.max(R[i + 1], max - prices[i]); }
  let best = 0;
  for (let i = 0; i < n; i++) best = Math.max(best, L[i] + R[i]);
  return best;
}`),
      A('Four-state dynamic programming', 'Track the best profit after the first buy, first sell, second buy and second sell, updating all four each day.', 'O(n)', 'O(1)', `function maxProfitTwo(prices) {
  let b1 = -Infinity, s1 = 0, b2 = -Infinity, s2 = 0;
  for (const p of prices) { b1 = Math.max(b1, -p); s1 = Math.max(s1, b1 + p); b2 = Math.max(b2, s1 - p); s2 = Math.max(s2, b2 + p); }
  return s2;
}`)
    ]
  },
  {
    id: 'stock-iv', title: 'Best Time to Buy and Sell Stock IV', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'You may complete at most k transactions. Return the maximum profit.\n\nExample:\nInput: k = 2, prices = [3,2,6,5,0,3]\nOutput: 7',
    fn: 'maxProfitK', params: 'k, prices', constraints: '0 ≤ k ≤ 100, 0 ≤ n ≤ 1000',
    tests: [[2, [2, 4, 1]], [2, [3, 2, 6, 5, 0, 3]], [1, [1, 2]], [0, [1, 2, 3]], [3, [1, 2, 3, 4, 5, 6]], [2, []], [2, [6, 1, 3, 2, 4, 7]], [5, [3, 3, 5, 0, 0, 3, 1, 4]]],
    gen: (r) => [r.int(0, 3), r.arr(r.int(0, 8), 0, 9)],
    approaches: [
      A('Recursion over days and transactions', 'On each day skip, or buy (if free) or sell (if holding). A transaction is counted when buying. Exponential.', 'O(2ⁿ)', 'O(n)', `function maxProfitK(k, prices) {
  const go = (i, left, holding) => {
    if (i === prices.length || left === 0 && !holding) return 0;
    let best = go(i + 1, left, holding);
    if (holding) best = Math.max(best, prices[i] + go(i + 1, left, false));
    else if (left > 0) best = Math.max(best, -prices[i] + go(i + 1, left - 1, true));
    return best;
  };
  return go(0, k, false);
}`),
      A('Dynamic programming over (transactions, day)', 'dp[t][i] is the best profit using at most t transactions through day i. Track the best "buy" value so each cell is O(1).', 'O(k·n)', 'O(k·n)', `function maxProfitK(k, prices) {
  const n = prices.length;
  if (!n || !k) return 0;
  const dp = Array.from({ length: k + 1 }, () => new Array(n).fill(0));
  for (let t = 1; t <= k; t++) {
    let bestBuy = -prices[0];
    for (let i = 1; i < n; i++) { dp[t][i] = Math.max(dp[t][i - 1], prices[i] + bestBuy); bestBuy = Math.max(bestBuy, dp[t - 1][i] - prices[i]); }
  }
  return dp[k][n - 1];
}`),
      A('Rolling buy/sell arrays', 'Keep one buy and one sell value per transaction count and update them day by day. When k is at least n/2 the limit is irrelevant, so use the unlimited-transactions greedy.', 'O(k·n)', 'O(k)', `function maxProfitK(k, prices) {
  const n = prices.length;
  if (!n || !k) return 0;
  if (k >= n / 2) { let p = 0; for (let i = 1; i < n; i++) if (prices[i] > prices[i - 1]) p += prices[i] - prices[i - 1]; return p; }
  const buy = new Array(k + 1).fill(-Infinity), sell = new Array(k + 1).fill(0);
  for (const p of prices) for (let t = 1; t <= k; t++) { buy[t] = Math.max(buy[t], sell[t - 1] - p); sell[t] = Math.max(sell[t], buy[t] + p); }
  return sell[k];
}`)
    ]
  },
  {
    id: 'super-egg-drop', title: 'Super Egg Drop', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 5000, 10000, 100000],
    desc: 'You have k identical eggs and a building with n floors. There is a critical floor f such that an egg survives a drop from floors up to f and breaks above it. Return the minimum number of drops needed, in the worst case, to find f for sure.\n\nExample:\nInput: k = 2, n = 6\nOutput: 3',
    fn: 'superEggDrop', params: 'k, n', constraints: '1 ≤ k ≤ 100, 1 ≤ n ≤ 10^4',
    tests: [[1, 2], [2, 6], [3, 14], [1, 5], [2, 1], [4, 10], [3, 12]],
    gen: (r) => [r.int(1, 4), r.int(1, 12)],
    approaches: [
      A('Recursion over the drop floor', 'Drop from floor x: if the egg breaks, search below with one fewer egg; otherwise search above. The worst case of the two plus one drop, minimised over x.', 'O(n^k)', 'O(n)', `function superEggDrop(k, n) {
  const go = (e, f) => { if (f === 0 || f === 1) return f; if (e === 1) return f; let best = Infinity; for (let x = 1; x <= f; x++) best = Math.min(best, 1 + Math.max(go(e - 1, x - 1), go(e, f - x))); return best; };
  return go(k, n);
}`),
      A('Dynamic programming over (eggs, floors)', 'dp[e][f] is the answer for e eggs and f floors, computed from smaller sub-problems for every drop floor.', 'O(k·n²)', 'O(k·n)', `function superEggDrop(k, n) {
  const dp = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(0));
  for (let f = 1; f <= n; f++) dp[1][f] = f;
  for (let e = 2; e <= k; e++) for (let f = 1; f <= n; f++) {
    dp[e][f] = f;
    for (let x = 1; x <= f; x++) dp[e][f] = Math.min(dp[e][f], 1 + Math.max(dp[e - 1][x - 1], dp[e][f - x]));
  }
  return dp[k][n];
}`),
      A('Invert the question: floors covered by m moves', 'Let f(m, e) be how many floors can be tested with m drops and e eggs. f(m, e) = f(m-1, e-1) + f(m-1, e) + 1. Increase m until f reaches n.', 'O(k·m)', 'O(k)', `function superEggDrop(k, n) {
  const f = new Array(k + 1).fill(0);
  let m = 0;
  while (f[k] < n) { m++; for (let e = k; e >= 1; e--) f[e] = f[e] + f[e - 1] + 1; }
  return m;
}`, { note: 'm is the answer, at most about √(2n) for two eggs and far smaller for more eggs.' })
    ]
  },
  {
    id: 'dungeon-game', title: 'Dungeon Game', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 8, 10, 12, 14, 16],
    desc: 'A knight starts at the top-left of a grid and must reach the bottom-right, moving only right or down. Each cell changes his health by its value (negative = damage, positive = healing). His health must stay at least 1 at all times. Return the minimum initial health needed.\n\nExample:\nInput: dungeon = [[-2,-3,3],[-5,-10,1],[10,30,-5]]\nOutput: 7',
    fn: 'calculateMinimumHP', params: 'dungeon', constraints: '1 ≤ m, n ≤ 200',
    tests: [[[[-2, -3, 3], [-5, -10, 1], [10, 30, -5]]], [[[0]]], [[[-5]]], [[[1, -3, 3], [0, -2, 0], [-3, -3, -3]]], [[[3, -20, 30]]], [[[100]]], [[[-3, 5]]]],
    gen: (r) => [r.grid(r.int(1, 4), r.int(1, 4), -6, 6)],
    approaches: [
      A('Recursion from the start with a health requirement', 'At each cell need = max(1, min(need from right, need from below) - cell). Without caching this explores all paths.', 'O(2^(m+n))', 'O(m + n)', `function calculateMinimumHP(d) {
  const m = d.length, n = d[0].length;
  const go = (i, j) => {
    if (i >= m || j >= n) return Infinity;
    if (i === m - 1 && j === n - 1) return Math.max(1, 1 - d[i][j]);
    return Math.max(1, Math.min(go(i + 1, j), go(i, j + 1)) - d[i][j]);
  };
  return go(0, 0);
}`),
      A('Dynamic programming from the end', 'Work backwards: dp[i][j] is the health needed when entering cell (i, j). A forward DP fails because a good start can hide a later danger.', 'O(m·n)', 'O(m·n)', `function calculateMinimumHP(d) {
  const m = d.length, n = d[0].length, dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(Infinity));
  dp[m][n - 1] = dp[m - 1][n] = 1;
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = Math.max(1, Math.min(dp[i + 1][j], dp[i][j + 1]) - d[i][j]);
  return dp[0][0];
}`),
      A('Dynamic programming with one row', 'Only the row below and the cell to the right are needed.', 'O(m·n)', 'O(n)', `function calculateMinimumHP(d) {
  const m = d.length, n = d[0].length, dp = new Array(n + 1).fill(Infinity);
  dp[n - 1] = 1;
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[j] = Math.max(1, Math.min(dp[j], dp[j + 1]) - d[i][j]);
  return dp[0];
}`)
    ]
  },
  {
    id: 'longest-increasing-path-matrix', title: 'Longest Increasing Path in a Matrix', d: 'H', topic: 'Graphs', roles: ['SDE'], sizes: [4, 8, 10, 12, 14, 16],
    desc: 'From any cell you may move up, down, left or right to a neighbour with a strictly larger value. Return the length of the longest increasing path in the matrix.\n\nExample:\nInput: matrix = [[9,9,4],[6,6,8],[2,1,1]]\nOutput: 4',
    fn: 'longestIncreasingPath', params: 'matrix', constraints: '1 ≤ m, n ≤ 200',
    tests: [[[[9, 9, 4], [6, 6, 8], [2, 1, 1]]], [[[3, 4, 5], [3, 2, 6], [2, 2, 1]]], [[[1]]], [[[1, 2]]], [[[1], [1]]], [[[1, 2, 3], [6, 5, 4], [7, 8, 9]]]],
    gen: (r) => [r.grid(r.int(1, 4), r.int(1, 4), 0, 6)],
    approaches: [
      A('Depth-first search from every cell', 'Explore all increasing paths from each cell without remembering anything.', 'O(2^(m+n))', 'O(m·n)', `function longestIncreasingPath(g) {
  const m = g.length, n = g[0].length;
  const go = (i, j) => { let b = 1; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + c; if (x >= 0 && y >= 0 && x < m && y < n && g[x][y] > g[i][j]) b = Math.max(b, 1 + go(x, y)); } return b; };
  let best = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) best = Math.max(best, go(i, j));
  return best;
}`),
      A('Memoised depth-first search', 'The longest path starting at a cell never changes, so cache it. Each cell is computed once; there are no cycles because values strictly increase.', 'O(m·n)', 'O(m·n)', `function longestIncreasingPath(g) {
  const m = g.length, n = g[0].length, memo = g.map((r) => r.map(() => 0));
  const go = (i, j) => {
    if (memo[i][j]) return memo[i][j];
    let b = 1;
    for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + c; if (x >= 0 && y >= 0 && x < m && y < n && g[x][y] > g[i][j]) b = Math.max(b, 1 + go(x, y)); }
    return (memo[i][j] = b);
  };
  let best = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) best = Math.max(best, go(i, j));
  return best;
}`),
      A('Topological sort by layers', 'Treat each move to a larger neighbour as a directed edge in an acyclic graph. Peel off cells with no outgoing edges layer by layer; the number of layers is the answer.', 'O(m·n)', 'O(m·n)', `function longestIncreasingPath(g) {
  const m = g.length, n = g[0].length, out = g.map((r) => r.map(() => 0)), dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) for (const [a, c] of dirs) { const x = i + a, y = j + c; if (x >= 0 && y >= 0 && x < m && y < n && g[x][y] > g[i][j]) out[i][j]++; }
  let q = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (!out[i][j]) q.push([i, j]);
  let layers = 0;
  while (q.length) {
    layers++;
    const next = [];
    for (const [i, j] of q) for (const [a, c] of dirs) { const x = i + a, y = j + c; if (x >= 0 && y >= 0 && x < m && y < n && g[x][y] < g[i][j] && --out[x][y] === 0) next.push([x, y]); }
    q = next;
  }
  return layers;
}`)
    ]
  },
  {
    id: 'strange-printer', title: 'Strange Printer', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'A printer prints a run of the same character in one turn, and each turn may overwrite earlier characters. Return the minimum number of turns needed to print the given string.\n\nExample:\nInput: s = "aba"\nOutput: 2',
    fn: 'strangePrinter', params: 's', constraints: '1 ≤ length ≤ 100',
    tests: [['aaabbb'], ['aba'], ['a'], ['abcabc'], ['abab'], ['tbgtgb'], ['baacdddaaddaaaaccbddbcabdaabdbbcdcbbbacbddcabcaaa']],
    gen: (r) => [r.str(r.int(1, 8), 'abc')],
    approaches: [
      A('Recursion on intervals', 'For a substring, print its first character, then either it stands alone or it extends to cover a later equal character, splitting the interval. Exponential without caching.', 'O(2ⁿ)', 'O(n)', `function strangePrinter(s) {
  const t = s.replace(/(.)\\1+/g, '$1');
  const go = (i, j) => { if (i > j) return 0; let best = 1 + go(i + 1, j); for (let k = i + 1; k <= j; k++) if (t[k] === t[i]) best = Math.min(best, go(i + 1, k - 1) + go(k, j)); return best; };
  return go(0, t.length - 1);
}`),
      A('Interval dynamic programming', 'dp[i][j] is the fewest turns for t[i..j]. Either print t[i] on its own, or share a turn with a later equal character t[k], so the work between them overlaps for free.', 'O(n³)', 'O(n²)', `function strangePrinter(s) {
  const t = s.replace(/(.)\\1+/g, '$1'), n = t.length;
  if (!n) return 0;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    dp[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      dp[i][j] = 1 + dp[i + 1][j];
      for (let k = i + 1; k <= j; k++) if (t[k] === t[i]) dp[i][j] = Math.min(dp[i][j], dp[i + 1][k - 1] + dp[k][j]);
    }
  }
  return dp[0][n - 1];
}`)
    ]
  },
  {
    id: 'split-array-largest-sum', title: 'Split Array Largest Sum', d: 'H', topic: 'Searching', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Split the array into k non-empty contiguous subarrays so that the largest subarray sum is as small as possible. Return that smallest possible largest sum.\n\nExample:\nInput: nums = [7,2,5,10,8], k = 2\nOutput: 18',
    fn: 'splitArray', params: 'nums, k', constraints: '1 ≤ k ≤ n ≤ 1000',
    tests: [[[7, 2, 5, 10, 8], 2], [[1, 2, 3, 4, 5], 2], [[1, 4, 4], 3], [[5], 1], [[1, 1, 1, 1], 4], [[10, 5, 13, 4, 8, 4, 5, 11, 14, 9, 16, 10, 20, 8], 8], [[2, 3, 1, 2, 4, 3], 5]],
    gen: (r) => { const n = r.int(1, 8); return [r.arr(n, 1, 9), r.int(1, n)]; },
    approaches: [
      A('Recursion over the first part', 'Choose where the first subarray ends and recurse on the rest with one fewer part, minimising the maximum.', 'O(nᵏ)', 'O(n)', `function splitArray(nums, k) {
  const go = (i, parts) => {
    if (parts === 1) return nums.slice(i).reduce((a, b) => a + b, 0);
    let best = Infinity, sum = 0;
    for (let j = i; j <= nums.length - parts; j++) { sum += nums[j]; best = Math.min(best, Math.max(sum, go(j + 1, parts - 1))); }
    return best;
  };
  return go(0, k);
}`),
      A('Dynamic programming', 'dp[p][i] is the best answer for the first i numbers split into p parts: try every position for the last cut and use prefix sums for part sums.', 'O(k·n²)', 'O(k·n)', `function splitArray(nums, k) {
  const n = nums.length, P = [0];
  for (const x of nums) P.push(P[P.length - 1] + x);
  const dp = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let p = 1; p <= k; p++) for (let i = p; i <= n; i++) for (let j = p - 1; j < i; j++) dp[p][i] = Math.min(dp[p][i], Math.max(dp[p - 1][j], P[i] - P[j]));
  return dp[k][n];
}`),
      A('Binary search on the answer', 'Guess a maximum sum S and greedily count how many parts are needed. Fewer parts are needed as S grows, so binary search S between the largest element and the total sum.', 'O(n·log(sum))', 'O(1)', `function splitArray(nums, k) {
  const need = (S) => { let parts = 1, cur = 0; for (const x of nums) { if (cur + x > S) { parts++; cur = 0; } cur += x; } return parts; };
  let lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0);
  while (lo < hi) { const m = (lo + hi) >> 1; if (need(m) <= k) hi = m; else lo = m + 1; }
  return lo;
}`)
    ]
  },
  {
    id: 'number-of-digit-one', title: 'Number of Digit One', d: 'H', topic: 'Math', roles: ['SDE'], sizes: [10, 1000, 100000, 10000000, 1000000000, 2000000000],
    desc: 'Return the total number of times the digit 1 appears in all non-negative integers from 0 to n.\n\nExample:\nInput: n = 13\nOutput: 6 (1, 10, 11 twice, 12, 13)',
    fn: 'countDigitOne', params: 'n', constraints: '0 ≤ n ≤ 10^9',
    tests: [[13], [0], [1], [10], [99], [100], [1234], [999]],
    gen: (r) => [r.int(0, 2500)],
    approaches: [
      A('Count in every number', 'Write out each number and count its ones.', 'O(n·log n)', 'O(1)', `function countDigitOne(n) {
  let c = 0;
  for (let i = 1; i <= n; i++) for (const ch of String(i)) if (ch === '1') c++;
  return c;
}`),
      A('Count by digit position', 'For each place (ones, tens, hundreds, ...) the number of ones that place contributes depends only on the digits above, at, and below it.', 'O(log n)', 'O(1)', `function countDigitOne(n) {
  let c = 0;
  for (let p = 1; p <= n; p *= 10) {
    const high = Math.floor(n / (p * 10)), cur = Math.floor(n / p) % 10, low = n % p;
    c += high * p + (cur > 1 ? p : cur === 1 ? low + 1 : 0);
  }
  return c;
}`)
    ]
  },
  {
    id: 'scramble-string', title: 'Scramble String', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [4, 6, 8, 10, 12, 14],
    desc: 'A string can be scrambled by splitting it into two non-empty parts, optionally swapping them, and scrambling each part the same way. Return true if s2 is a scrambled version of s1.\n\nExample:\nInput: s1 = "great", s2 = "rgeat"\nOutput: true',
    fn: 'isScramble', params: 's1, s2', constraints: '1 ≤ length ≤ 30, equal lengths',
    tests: [['great', 'rgeat'], ['abcde', 'caebd'], ['a', 'a'], ['ab', 'ba'], ['abc', 'cab'], ['abcd', 'badc'], ['aabb', 'abab']],
    gen: (r) => { const n = r.int(1, 6); return [r.str(n, 'abc'), r.str(n, 'abc')]; },
    approaches: [
      A('Plain recursion', 'Try every split point, with and without swapping, and recurse on both halves. Exponential.', 'O(4ⁿ)', 'O(n)', `function isScramble(s1, s2) {
  if (s1 === s2) return true;
  if (s1.length !== s2.length) return false;
  const n = s1.length;
  for (let i = 1; i < n; i++) {
    if (isScramble(s1.slice(0, i), s2.slice(0, i)) && isScramble(s1.slice(i), s2.slice(i))) return true;
    if (isScramble(s1.slice(0, i), s2.slice(n - i)) && isScramble(s1.slice(i), s2.slice(0, n - i))) return true;
  }
  return false;
}`),
      A('Memoised recursion with a letter-count prune', 'Cache results per (s1, s2) pair and skip any pair whose letters differ in count, which can never be a scramble.', 'O(n⁴)', 'O(n³)', `function isScramble(s1, s2) {
  const memo = new Map();
  const go = (a, b) => {
    if (a === b) return true;
    const key = a + '|' + b;
    if (memo.has(key)) return memo.get(key);
    if (a.split('').sort().join('') !== b.split('').sort().join('')) { memo.set(key, false); return false; }
    const n = a.length;
    let r = false;
    for (let i = 1; i < n && !r; i++) r = (go(a.slice(0, i), b.slice(0, i)) && go(a.slice(i), b.slice(i))) || (go(a.slice(0, i), b.slice(n - i)) && go(a.slice(i), b.slice(0, n - i)));
    memo.set(key, r);
    return r;
  };
  return s1.length === s2.length && go(s1, s2);
}`),
      A('Bottom-up dynamic programming', 'dp[len][i][j] says whether the substring of length len at i in s1 is a scramble of the one at j in s2, built from shorter lengths.', 'O(n⁴)', 'O(n³)', `function isScramble(s1, s2) {
  const n = s1.length;
  if (n !== s2.length) return false;
  const dp = Array.from({ length: n + 1 }, () => Array.from({ length: n }, () => new Array(n).fill(false)));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) dp[1][i][j] = s1[i] === s2[j];
  for (let len = 2; len <= n; len++) for (let i = 0; i + len <= n; i++) for (let j = 0; j + len <= n; j++) {
    for (let k = 1; k < len && !dp[len][i][j]; k++) {
      if (dp[k][i][j] && dp[len - k][i + k][j + k]) dp[len][i][j] = true;
      else if (dp[k][i][j + len - k] && dp[len - k][i + k][j]) dp[len][i][j] = true;
    }
  }
  return dp[n][0][0];
}`)
    ]
  },
  {
    id: 'job-scheduling-profit', title: 'Maximum Profit in Job Scheduling', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Jobs have start times, end times and profits. You cannot take two jobs that overlap in time (a job ending at time t and another starting at t are compatible). Return the maximum total profit.\n\nExample:\nInput: startTime = [1,2,3,3], endTime = [3,4,5,6], profit = [50,10,40,70]\nOutput: 120',
    fn: 'jobScheduling', params: 'startTime, endTime, profit', constraints: '1 ≤ n ≤ 5·10^4',
    tests: [[[1, 2, 3, 3], [3, 4, 5, 6], [50, 10, 40, 70]], [[1, 2, 3, 4, 6], [3, 5, 10, 6, 9], [20, 20, 100, 70, 60]], [[1, 1, 1], [2, 3, 4], [5, 6, 4]], [[1], [2], [7]], [[1, 2], [3, 3], [5, 6]], [[4, 2, 4, 8, 2], [5, 5, 5, 10, 8], [1, 2, 8, 10, 4]]],
    gen: (r) => { const n = r.int(1, 6); const s = [], e = [], p = []; for (let i = 0; i < n; i++) { const a = r.int(1, 8); s.push(a); e.push(a + r.int(1, 4)); p.push(r.int(1, 9)); } return [s, e, p]; },
    approaches: [
      A('Try every subset', 'Check every subset of jobs for overlaps and keep the best total profit.', 'O(n²·2ⁿ)', 'O(n)', `function jobScheduling(s, e, p) {
  const n = s.length;
  let best = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const ids = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) ids.push(i);
    let ok = true;
    for (let a = 0; a < ids.length && ok; a++) for (let b = a + 1; b < ids.length; b++) if (s[ids[a]] < e[ids[b]] && s[ids[b]] < e[ids[a]]) { ok = false; break; }
    if (ok) best = Math.max(best, ids.reduce((x, i) => x + p[i], 0));
  }
  return best;
}`),
      A('Sort by end time, dynamic programming with a scan', 'Sort jobs by end time. dp[i] is the best profit using the first i jobs: either skip job i or take it plus the best profit among jobs ending by its start.', 'O(n²)', 'O(n)', `function jobScheduling(s, e, p) {
  const jobs = s.map((x, i) => [x, e[i], p[i]]).sort((a, b) => a[1] - b[1]), dp = [0];
  for (let i = 0; i < jobs.length; i++) {
    let prev = 0;
    for (let j = i - 1; j >= 0; j--) if (jobs[j][1] <= jobs[i][0]) { prev = dp[j + 1]; break; }
    dp.push(Math.max(dp[i], prev + jobs[i][2]));
  }
  return dp[jobs.length];
}`),
      A('Sort by end time, dynamic programming with binary search', 'Same DP, but find the last compatible job by binary searching the sorted end times instead of scanning.', 'O(n log n)', 'O(n)', `function jobScheduling(s, e, p) {
  const jobs = s.map((x, i) => [x, e[i], p[i]]).sort((a, b) => a[1] - b[1]), ends = jobs.map((j) => j[1]), dp = [0];
  for (let i = 0; i < jobs.length; i++) {
    let lo = 0, hi = i;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ends[m] <= jobs[i][0]) lo = m + 1; else hi = m; }
    dp.push(Math.max(dp[i], dp[lo] + jobs[i][2]));
  }
  return dp[jobs.length];
}`)
    ]
  },
  {
    id: 'min-refuel-stops', title: 'Minimum Number of Refueling Stops', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'A car starts with startFuel units of fuel and must travel target miles (1 unit per mile). stations[i] = [position, fuel] is a station that gives all its fuel when you stop. Return the fewest stops needed to reach the target, or -1 if impossible.\n\nExample:\nInput: target = 100, startFuel = 10, stations = [[10,60],[20,30],[30,30],[60,40]]\nOutput: 2',
    fn: 'minRefuelStops', params: 'target, startFuel, stations', constraints: '0 ≤ stations ≤ 500',
    tests: [[1, 1, []], [100, 1, []], [100, 10, [[10, 60], [20, 30], [30, 30], [60, 40]]], [100, 25, [[25, 25], [50, 25], [75, 25]]], [100, 50, [[25, 50]]], [100, 10, [[10, 100]]], [50, 10, [[10, 5], [20, 5], [30, 5]]]],
    gen: (r) => { const n = r.int(0, 5); const pos = r.uniq(n, 1, 20).sort((a, b) => a - b); return [r.int(5, 25), r.int(1, 8), pos.map((p) => [p, r.int(1, 10)])]; },
    approaches: [
      A('Try every subset of stations', 'Test every subset of stations in position order for being reachable.', 'O(2ⁿ·n)', 'O(n)', `function minRefuelStops(target, startFuel, stations) {
  const n = stations.length;
  let best = Infinity;
  for (let mask = 0; mask < 1 << n; mask++) {
    let fuel = startFuel, pos = 0, ok = true, stops = 0;
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      fuel -= stations[i][0] - pos; pos = stations[i][0];
      if (fuel < 0) { ok = false; break; }
      fuel += stations[i][1]; stops++;
    }
    if (ok && fuel >= target - pos) best = Math.min(best, stops);
  }
  return best === Infinity ? -1 : best;
}`),
      A('Dynamic programming by number of stops', 'dp[k] is the furthest distance reachable with k stops. Considering each station in order, a station can raise dp[k+1] if it is reachable with k stops.', 'O(n²)', 'O(n)', `function minRefuelStops(target, startFuel, stations) {
  const dp = new Array(stations.length + 1).fill(0);
  dp[0] = startFuel;
  for (let i = 0; i < stations.length; i++) for (let k = i; k >= 0; k--) if (dp[k] >= stations[i][0]) dp[k + 1] = Math.max(dp[k + 1], dp[k] + stations[i][1]);
  for (let k = 0; k <= stations.length; k++) if (dp[k] >= target) return k;
  return -1;
}`),
      A('Greedy with a max-heap of passed stations', 'Drive as far as possible. When you cannot reach the next station, retroactively refuel at the passed station with the most fuel. A heap gives that station in O(log n).', 'O(n log n)', 'O(n)', `function minRefuelStops(target, startFuel, stations) {
  const h = [];
  const push = (v) => { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p] >= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const t = h[0], l = h.pop(); if (h.length) { h[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < h.length && h[a] > h[m]) m = a; if (b < h.length && h[b] > h[m]) m = b; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return t; };
  let fuel = startFuel, stops = 0, i = 0;
  while (fuel < target) {
    while (i < stations.length && stations[i][0] <= fuel) push(stations[i++][1]);
    if (!h.length) return -1;
    fuel += pop(); stops++;
  }
  return stops;
}`)
    ]
  }
];
