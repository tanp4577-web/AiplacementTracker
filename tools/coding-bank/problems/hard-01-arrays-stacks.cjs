const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'trapping-rain-water', title: 'Trapping Rain Water', d: 'H', topic: 'Two Pointers', roles: ['SDE', 'Backend Developer'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Given n non-negative integers representing an elevation map where each bar has width 1, compute how much water it can trap after raining.\n\nExample:\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6',
    fn: 'trap', params: 'height', constraints: '0 ≤ n ≤ 2·10^4',
    tests: [[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], [[4, 2, 0, 3, 2, 5]], [[]], [[3]], [[1, 2, 3]], [[3, 0, 3]], [[5, 4, 1, 2]]],
    gen: (r) => [r.arr(r.int(0, 10), 0, 6)],
    approaches: [
      A('Water above every bar', 'The water above bar i is min(tallest bar to the left, tallest bar to the right) - height[i]. Find both maxima by scanning for each bar.', 'O(n²)', 'O(1)', `function trap(height) {
  let w = 0;
  for (let i = 0; i < height.length; i++) {
    const l = Math.max(...height.slice(0, i + 1)), r = Math.max(...height.slice(i));
    w += Math.min(l, r) - height[i];
  }
  return w;
}`),
      A('Precomputed left and right maxima', 'Compute the running maximum from the left and from the right once, so each bar costs O(1).', 'O(n)', 'O(n)', `function trap(height) {
  const n = height.length, L = [], R = [];
  for (let i = 0; i < n; i++) L[i] = Math.max(i ? L[i - 1] : 0, height[i]);
  for (let i = n - 1; i >= 0; i--) R[i] = Math.max(i < n - 1 ? R[i + 1] : 0, height[i]);
  let w = 0;
  for (let i = 0; i < n; i++) w += Math.min(L[i], R[i]) - height[i];
  return w;
}`),
      A('Monotonic stack', 'Keep a stack of bars with decreasing height. A taller bar closes a basin: pop the bottom, and add water for the layer between the stack top and the new bar.', 'O(n)', 'O(n)', `function trap(height) {
  const st = [];
  let w = 0;
  for (let i = 0; i < height.length; i++) {
    while (st.length && height[i] > height[st[st.length - 1]]) {
      const bottom = st.pop();
      if (!st.length) break;
      const left = st[st.length - 1];
      w += (Math.min(height[left], height[i]) - height[bottom]) * (i - left - 1);
    }
    st.push(i);
  }
  return w;
}`),
      A('Two pointers', 'Move the pointer on the lower side inward, tracking the best left and right heights seen. The lower side bounds the water there, so no arrays are needed.', 'O(n)', 'O(1)', `function trap(height) {
  let l = 0, r = height.length - 1, lm = 0, rm = 0, w = 0;
  while (l < r) {
    if (height[l] < height[r]) { lm = Math.max(lm, height[l]); w += lm - height[l]; l++; }
    else { rm = Math.max(rm, height[r]); w += rm - height[r]; r--; }
  }
  return w;
}`)
    ]
  },
  {
    id: 'median-two-sorted-arrays', title: 'Median of Two Sorted Arrays', d: 'H', topic: 'Searching', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Given two sorted arrays, return the median of the combined sorted values. The ideal solution runs in O(log(m + n)).\n\nExample:\nInput: nums1 = [1,3], nums2 = [2]\nOutput: 2',
    fn: 'findMedianSortedArrays', params: 'nums1, nums2', constraints: '0 ≤ m, n ≤ 1000, m + n ≥ 1',
    tests: [[[1, 3], [2]], [[1, 2], [3, 4]], [[0, 0], [0, 0]], [[], [1]], [[2], []], [[1, 3, 5, 7], [2, 4, 6, 8, 10]], [[1], [2, 3, 4, 5, 6]]],
    gen: (r) => { const a = r.sorted(r.int(0, 6), -5, 9), b = r.sorted(r.int(0, 6), -5, 9); if (!a.length && !b.length) return [[1], []]; return [a, b]; },
    approaches: [
      A('Merge then pick the middle', 'Merge the arrays and read the middle element(s).', 'O(m + n)', 'O(m + n)', `function findMedianSortedArrays(a, b) {
  const m = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) m.push(j >= b.length || (i < a.length && a[i] <= b[j]) ? a[i++] : b[j++]);
  const n = m.length;
  return n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2;
}`),
      A('Walk with two pointers (no merged array)', 'Advance through both arrays just far enough to reach the middle, remembering the last two values.', 'O(m + n)', 'O(1)', `function findMedianSortedArrays(a, b) {
  const n = a.length + b.length, mid = Math.floor(n / 2);
  let i = 0, j = 0, prev = 0, cur = 0;
  for (let k = 0; k <= mid; k++) {
    prev = cur;
    if (i < a.length && (j >= b.length || a[i] <= b[j])) cur = a[i++]; else cur = b[j++];
  }
  return n % 2 ? cur : (prev + cur) / 2;
}`),
      A('Binary search on the partition', 'Binary search how many elements of the shorter array go on the left half. A partition is right when every left element is at most every right element. Each step halves the search range.', 'O(log(min(m, n)))', 'O(1)', `function findMedianSortedArrays(a, b) {
  if (a.length > b.length) [a, b] = [b, a];
  const m = a.length, n = b.length, half = (m + n + 1) >> 1;
  let lo = 0, hi = m;
  while (lo <= hi) {
    const i = (lo + hi) >> 1, j = half - i;
    const aL = i ? a[i - 1] : -Infinity, aR = i < m ? a[i] : Infinity, bL = j ? b[j - 1] : -Infinity, bR = j < n ? b[j] : Infinity;
    if (aL <= bR && bL <= aR) return (m + n) % 2 ? Math.max(aL, bL) : (Math.max(aL, bL) + Math.min(aR, bR)) / 2;
    if (aL > bR) hi = i - 1; else lo = i + 1;
  }
}`)
    ]
  },
  {
    id: 'first-missing-positive', title: 'First Missing Positive', d: 'H', topic: 'Arrays', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Given an unsorted integer array, return the smallest positive integer that is not in it. For full credit use O(n) time and O(1) extra space.\n\nExample:\nInput: nums = [3,4,-1,1]\nOutput: 2',
    fn: 'firstMissingPositive', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[1, 2, 0]], [[3, 4, -1, 1]], [[7, 8, 9, 11, 12]], [[1]], [[2]], [[1, 2, 3]], [[2, 1, 4, 3, 6]], [[-5, 0, 1, 1]]],
    gen: (r) => [r.arr(r.int(1, 8), -2, 8)],
    approaches: [
      A('Test 1, 2, 3, ... in the array', 'For each candidate positive integer check whether it is present.', 'O(n²)', 'O(1)', `function firstMissingPositive(nums) {
  for (let v = 1; ; v++) if (!nums.includes(v)) return v;
}`),
      A('Hash set', 'Put everything in a set and count up from 1 until a number is missing.', 'O(n)', 'O(n)', `function firstMissingPositive(nums) {
  const s = new Set(nums);
  let v = 1;
  while (s.has(v)) v++;
  return v;
}`),
      A('Cyclic sort in place', 'The answer lies in 1..n+1. Swap every value x in 1..n into position x - 1. Afterwards the first index i where nums[i] !== i + 1 gives the answer i + 1.', 'O(n)', 'O(1)', `function firstMissingPositive(nums) {
  const a = [...nums], n = a.length;
  for (let i = 0; i < n; i++) while (a[i] > 0 && a[i] <= n && a[a[i] - 1] !== a[i]) { const j = a[i] - 1; [a[i], a[j]] = [a[j], a[i]]; }
  for (let i = 0; i < n; i++) if (a[i] !== i + 1) return i + 1;
  return n + 1;
}`, { note: 'Extra space is O(1) when the input array may be rearranged.' })
    ]
  },
  {
    id: 'largest-rectangle-histogram', title: 'Largest Rectangle in Histogram', d: 'H', topic: 'Stacks', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Given bar heights of a histogram (each bar has width 1), return the area of the largest rectangle that fits inside it.\n\nExample:\nInput: heights = [2,1,5,6,2,3]\nOutput: 10',
    fn: 'largestRectangleArea', params: 'heights', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[2, 1, 5, 6, 2, 3]], [[2, 4]], [[1]], [[2, 2, 2, 2]], [[6, 5, 4, 3, 2, 1]], [[1, 2, 3, 4, 5]], [[0, 9]], [[3, 6, 5, 7, 4, 8, 1, 0]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 7)],
    approaches: [
      A('Every pair of bars', 'For each pair (i, j) the rectangle height is the minimum between them. Track the minimum while extending j.', 'O(n²)', 'O(1)', `function largestRectangleArea(h) {
  let best = 0;
  for (let i = 0; i < h.length; i++) { let min = Infinity; for (let j = i; j < h.length; j++) { min = Math.min(min, h[j]); best = Math.max(best, min * (j - i + 1)); } }
  return best;
}`),
      A('Expand around each bar', 'For each bar find how far left and right it can extend while staying at least as tall, then the area is height × width.', 'O(n²)', 'O(1)', `function largestRectangleArea(h) {
  let best = 0;
  for (let i = 0; i < h.length; i++) { let l = i, r = i; while (l > 0 && h[l - 1] >= h[i]) l--; while (r < h.length - 1 && h[r + 1] >= h[i]) r++; best = Math.max(best, h[i] * (r - l + 1)); }
  return best;
}`),
      A('Monotonic stack', 'Keep bars with increasing height on a stack. When a shorter bar arrives, pop taller bars and compute the rectangle each one could form: its width runs from the previous stack entry to the current index.', 'O(n)', 'O(n)', `function largestRectangleArea(h) {
  const st = [], a = [...h, 0];
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[i] < a[st[st.length - 1]]) {
      const height = a[st.pop()], left = st.length ? st[st.length - 1] : -1;
      best = Math.max(best, height * (i - left - 1));
    }
    st.push(i);
  }
  return best;
}`),
      A('Divide and conquer on the minimum', 'The best rectangle either spans the whole range at the height of the shortest bar, or lies entirely left or right of that bar. Recurse on both sides.', 'O(n log n)', 'O(n)', `function largestRectangleArea(h) {
  const go = (lo, hi) => {
    if (lo > hi) return 0;
    let m = lo;
    for (let i = lo; i <= hi; i++) if (h[i] < h[m]) m = i;
    return Math.max(h[m] * (hi - lo + 1), go(lo, m - 1), go(m + 1, hi));
  };
  return go(0, h.length - 1);
}`, { note: 'Average O(n log n); a sorted histogram is the worst case at O(n²).' })
    ]
  },
  {
    id: 'maximal-rectangle', title: 'Maximal Rectangle', d: 'H', topic: 'Dynamic Programming', roles: ['SDE'],
    desc: "Given a binary matrix of '0' and '1', return the area of the largest rectangle containing only '1's.\n\nExample:\nInput: matrix = [['1','0','1','0','0'],['1','0','1','1','1'],['1','1','1','1','1'],['1','0','0','1','0']]\nOutput: 6",
    fn: 'maximalRectangle', params: 'matrix', constraints: '1 ≤ rows, cols ≤ 200',
    tests: [[[['1', '0', '1', '0', '0'], ['1', '0', '1', '1', '1'], ['1', '1', '1', '1', '1'], ['1', '0', '0', '1', '0']]], [[['0']]], [[['1']]], [[['1', '1'], ['1', '1']]], [[['0', '1'], ['1', '0']]], [[['1', '1', '1', '1']]], [[['1', '0', '1'], ['1', '1', '1'], ['1', '1', '1']]]],
    gen: (r) => [Array.from({ length: r.int(1, 4) }, () => Array.from({ length: r.int(1, 1) + 2 }, () => r.pick(['0', '1', '1'])))],
    approaches: [
      A('Try every rectangle', 'For every top-left and bottom-right corner check whether all cells inside are ones.', 'O((m·n)³)', 'O(1)', `function maximalRectangle(matrix) {
  const R = matrix.length, C = matrix[0].length;
  let best = 0;
  for (let r1 = 0; r1 < R; r1++) for (let c1 = 0; c1 < C; c1++) for (let r2 = r1; r2 < R; r2++) for (let c2 = c1; c2 < C; c2++) {
    let ok = true;
    for (let i = r1; i <= r2 && ok; i++) for (let j = c1; j <= c2; j++) if (matrix[i][j] !== '1') { ok = false; break; }
    if (ok) best = Math.max(best, (r2 - r1 + 1) * (c2 - c1 + 1));
  }
  return best;
}`),
      A('Histogram per row with a stack', 'Treat each row as the base of a histogram whose bar heights are the number of consecutive ones above. Solve "largest rectangle in a histogram" for every row with a monotonic stack.', 'O(m·n)', 'O(n)', `function maximalRectangle(matrix) {
  const C = matrix[0].length, h = new Array(C).fill(0);
  let best = 0;
  for (const row of matrix) {
    for (let j = 0; j < C; j++) h[j] = row[j] === '1' ? h[j] + 1 : 0;
    const st = [], a = [...h, 0];
    for (let i = 0; i < a.length; i++) {
      while (st.length && a[i] < a[st[st.length - 1]]) { const ht = a[st.pop()], left = st.length ? st[st.length - 1] : -1; best = Math.max(best, ht * (i - left - 1)); }
      st.push(i);
    }
  }
  return best;
}`),
      A('Dynamic programming with heights and bounds', 'For each cell keep the height of ones above it and the left and right bounds of the widest rectangle of that height, updated row by row.', 'O(m·n)', 'O(n)', `function maximalRectangle(matrix) {
  const C = matrix[0].length, h = new Array(C).fill(0), L = new Array(C).fill(0), R = new Array(C).fill(C);
  let best = 0;
  for (const row of matrix) {
    let cl = 0, cr = C;
    for (let j = 0; j < C; j++) { if (row[j] === '1') { h[j]++; L[j] = Math.max(L[j], cl); } else { h[j] = 0; L[j] = 0; cl = j + 1; } }
    for (let j = C - 1; j >= 0; j--) { if (row[j] === '1') R[j] = Math.min(R[j], cr); else { R[j] = C; cr = j; } }
    for (let j = 0; j < C; j++) best = Math.max(best, (R[j] - L[j]) * h[j]);
  }
  return best;
}`)
    ]
  },
  {
    id: 'sliding-window-maximum', title: 'Sliding Window Maximum', d: 'H', topic: 'Sliding Window', roles: ['SDE', 'Backend Developer'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'A window of size k slides from the left of the array to the right, one position at a time. Return the maximum of each window.\n\nExample:\nInput: nums = [1,3,-1,-3,5,3,6,7], k = 3\nOutput: [3,3,5,5,6,7]',
    fn: 'maxSlidingWindow', params: 'nums, k', constraints: '1 ≤ k ≤ n ≤ 10^5',
    tests: [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [[1], 1], [[1, -1], 1], [[9, 11], 2], [[4, 3, 2, 1], 2], [[1, 2, 3, 4, 5], 5], [[7, 2, 4], 2]],
    gen: (r) => { const n = r.int(1, 9); return [r.arr(n, -5, 9), r.int(1, n)]; },
    approaches: [
      A('Max of every window', 'Compute Math.max over each window directly.', 'O(n·k)', 'O(1)', `function maxSlidingWindow(nums, k) {
  const out = [];
  for (let i = 0; i + k <= nums.length; i++) out.push(Math.max(...nums.slice(i, i + k)));
  return out;
}`),
      A('Max-heap with lazy deletion', 'Keep (value, index) pairs in a heap. The top may be outside the window; pop it only when it is the maximum and its index is too old.', 'O(n log n)', 'O(n)', `function maxSlidingWindow(nums, k) {
  const h = [];
  const push = (e) => { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] >= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const t = h[0], l = h.pop(); if (h.length) { h[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < h.length && h[a][0] > h[m][0]) m = a; if (b < h.length && h[b][0] > h[m][0]) m = b; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return t; };
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    push([nums[i], i]);
    if (i >= k - 1) { while (h[0][1] <= i - k) pop(); out.push(h[0][0]); }
  }
  return out;
}`),
      A('Monotonic deque', 'Keep indices of a decreasing sequence of values in a deque. The front is always the window maximum; drop it when it leaves the window and drop smaller values from the back as new ones arrive.', 'O(n)', 'O(k)', `function maxSlidingWindow(nums, k) {
  const dq = [], out = [];
  let head = 0;
  for (let i = 0; i < nums.length; i++) {
    while (dq.length > head && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);
    if (dq[head] <= i - k) head++;
    if (i >= k - 1) out.push(nums[dq[head]]);
  }
  return out;
}`)
    ]
  },
  {
    id: 'candy', title: 'Candy', d: 'H', topic: 'Greedy', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Children stand in a line with ratings. Every child gets at least one candy, and a child with a higher rating than a neighbour must get more candy than that neighbour. Return the minimum total candies.\n\nExample:\nInput: ratings = [1,0,2]\nOutput: 5',
    fn: 'candy', params: 'ratings', constraints: '1 ≤ n ≤ 2·10^4',
    tests: [[[1, 0, 2]], [[1, 2, 2]], [[1]], [[1, 2, 3, 4, 5]], [[5, 4, 3, 2, 1]], [[1, 3, 2, 2, 1]], [[1, 2, 87, 87, 87, 2, 1]]],
    gen: (r) => [r.arr(r.int(1, 8), 0, 5)],
    approaches: [
      A('Repeat until stable', 'Start everyone at 1 and keep fixing any child who has a higher rating than a neighbour but not more candy, until no change.', 'O(n²)', 'O(n)', `function candy(ratings) {
  const c = new Array(ratings.length).fill(1);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < ratings.length; i++) {
      if (i > 0 && ratings[i] > ratings[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
      if (i + 1 < ratings.length && ratings[i] > ratings[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
    }
  }
  return c.reduce((a, b) => a + b, 0);
}`),
      A('Two passes', 'Left to right give more candy than the left neighbour when the rating rises; right to left do the same for the right neighbour, keeping the larger of the two requirements.', 'O(n)', 'O(n)', `function candy(ratings) {
  const n = ratings.length, c = new Array(n).fill(1);
  for (let i = 1; i < n; i++) if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
  for (let i = n - 2; i >= 0; i--) if (ratings[i] > ratings[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);
  return c.reduce((a, b) => a + b, 0);
}`),
      A('One pass with slopes', 'Track the length of the current rising and falling slopes and add the triangular number of candies for each, handling the peak once.', 'O(n)', 'O(1)', `function candy(ratings) {
  let total = 1, up = 0, down = 0, peak = 0;
  for (let i = 1; i < ratings.length; i++) {
    if (ratings[i] > ratings[i - 1]) { up++; peak = up; down = 0; total += 1 + up; }
    else if (ratings[i] === ratings[i - 1]) { up = down = peak = 0; total += 1; }
    else { down++; up = 0; total += 1 + down - (peak >= down ? 1 : 0); }
  }
  return total;
}`)
    ]
  },
  {
    id: 'count-smaller-after-self', title: 'Count of Smaller Numbers After Self', d: 'H', topic: 'Sorting', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'For each element, count how many elements to its right are strictly smaller. Return the counts as an array.\n\nExample:\nInput: nums = [5,2,6,1]\nOutput: [2,1,1,0]',
    fn: 'countSmaller', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[5, 2, 6, 1]], [[-1]], [[-1, -1]], [[1, 2, 3]], [[3, 2, 1]], [[2, 0, 1]], [[26, 78, 27, 100, 33, 67, 90, 23, 66, 5, 38, 7, 35, 23, 52, 22, 83, 51, 98, 69, 81, 32, 78, 28, 94, 13, 2, 97, 3, 76, 99, 51, 9, 21, 84, 66, 65, 36, 100, 41]]],
    gen: (r) => [r.arr(r.int(1, 9), -4, 6)],
    approaches: [
      A('Compare with everything to the right', 'For each index count smaller values on its right.', 'O(n²)', 'O(1)', `function countSmaller(nums) {
  return nums.map((x, i) => { let c = 0; for (let j = i + 1; j < nums.length; j++) if (nums[j] < x) c++; return c; });
}`),
      A('Binary indexed tree over ranks', 'Compress values to ranks, process from right to left, and use a Fenwick tree to count how many smaller ranks have already been inserted.', 'O(n log n)', 'O(n)', `function countSmaller(nums) {
  const sorted = [...new Set(nums)].sort((a, b) => a - b), rank = new Map(sorted.map((v, i) => [v, i + 1])), n = sorted.length, bit = new Array(n + 2).fill(0);
  const add = (i) => { for (; i <= n; i += i & -i) bit[i]++; };
  const sum = (i) => { let s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
  const out = new Array(nums.length);
  for (let i = nums.length - 1; i >= 0; i--) { const r = rank.get(nums[i]); out[i] = sum(r - 1); add(r); }
  return out;
}`),
      A('Merge sort counting', 'During a merge sort of (value, index) pairs, every time a left element is placed after some right elements have already moved ahead of it, those right elements are the smaller values to its right.', 'O(n log n)', 'O(n)', `function countSmaller(nums) {
  const out = new Array(nums.length).fill(0);
  const sort = (a) => {
    if (a.length < 2) return a;
    const m = a.length >> 1, L = sort(a.slice(0, m)), R = sort(a.slice(m)), res = [];
    let i = 0, j = 0;
    while (i < L.length || j < R.length) {
      if (j >= R.length || (i < L.length && L[i][0] <= R[j][0])) { out[L[i][1]] += j; res.push(L[i++]); } else res.push(R[j++]);
    }
    return res;
  };
  sort(nums.map((v, i) => [v, i]));
  return out;
}`)
    ]
  },
  {
    id: 'reverse-pairs', title: 'Reverse Pairs', d: 'H', topic: 'Sorting', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Count the reverse pairs: pairs (i, j) with i < j and nums[i] > 2 × nums[j].\n\nExample:\nInput: nums = [1,3,2,3,1]\nOutput: 2',
    fn: 'reversePairs', params: 'nums', constraints: '1 ≤ n ≤ 5·10^4',
    tests: [[[1, 3, 2, 3, 1]], [[2, 4, 3, 5, 1]], [[1]], [[5, 4, 3, 2, 1]], [[1, 2, 3]], [[2147483647, 2147483647, 2147483647]], [[-5, -5]]],
    gen: (r) => [r.arr(r.int(1, 9), -4, 9)],
    approaches: [
      A('Check every pair', 'Test the condition for all i < j.', 'O(n²)', 'O(1)', `function reversePairs(nums) {
  let c = 0;
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] > 2 * nums[j]) c++;
  return c;
}`),
      A('Merge sort with a counting pass', 'Before each merge, both halves are sorted, so for every element on the left a pointer can sweep the right half to count the values less than half of it. Then merge as usual.', 'O(n log n)', 'O(n)', `function reversePairs(nums) {
  let c = 0;
  const sort = (a) => {
    if (a.length < 2) return a;
    const m = a.length >> 1, L = sort(a.slice(0, m)), R = sort(a.slice(m));
    let j = 0;
    for (const x of L) { while (j < R.length && x > 2 * R[j]) j++; c += j; }
    const res = [];
    let p = 0, q = 0;
    while (p < L.length || q < R.length) res.push(q >= R.length || (p < L.length && L[p] <= R[q]) ? L[p++] : R[q++]);
    return res;
  };
  sort(nums);
  return c;
}`),
      A('Binary indexed tree over compressed values', 'Process from left to right. For each j, query how many earlier values are greater than 2·nums[j] using a Fenwick tree built on coordinate-compressed values.', 'O(n log n)', 'O(n)', `function reversePairs(nums) {
  const vals = [...new Set(nums.flatMap((x) => [x, 2 * x]))].sort((a, b) => a - b), idx = new Map(vals.map((v, i) => [v, i + 1])), bit = new Array(vals.length + 2).fill(0);
  const add = (i) => { for (; i <= vals.length; i += i & -i) bit[i]++; };
  const sum = (i) => { let s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
  let c = 0;
  const seen = [];
  for (let j = 0; j < nums.length; j++) {
    const greater = seen.length - sum(idx.get(2 * nums[j]));
    c += greater;
    add(idx.get(nums[j])); seen.push(nums[j]);
  }
  return c;
}`, { note: 'Compression keeps the tree small even when the values are huge.' })
    ]
  },
  {
    id: 'longest-valid-parentheses', title: 'Longest Valid Parentheses', d: 'H', topic: 'Stacks', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Given a string of "(" and ")", return the length of the longest well-formed (valid) parentheses substring.\n\nExample:\nInput: s = ")()())"\nOutput: 4',
    fn: 'longestValidParentheses', params: 's', constraints: '0 ≤ length ≤ 3·10^4',
    tests: [['(()'], [')()())'], [''], ['()(())'], ['()(()'], ['))))'], ['(()())'], ['()()']],
    gen: (r) => [r.str(r.int(0, 10), '()')],
    approaches: [
      A('Check every substring', 'Test each even-length substring for being balanced.', 'O(n³)', 'O(1)', `function longestValidParentheses(s) {
  const ok = (a, b) => { let d = 0; for (let i = a; i < b; i++) { d += s[i] === '(' ? 1 : -1; if (d < 0) return false; } return d === 0; };
  let best = 0;
  for (let i = 0; i < s.length; i++) for (let j = i + 2; j <= s.length; j += 2) if (j - i > best && ok(i, j)) best = j - i;
  return best;
}`),
      A('Dynamic programming', 'dp[i] is the length of the longest valid substring ending at i. A ")" after "(" extends dp[i - 2]; a ")" after ")" matches the "(" just before the previous valid block.', 'O(n)', 'O(n)', `function longestValidParentheses(s) {
  const dp = new Array(s.length).fill(0);
  let best = 0;
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== ')') continue;
    if (s[i - 1] === '(') dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
    else if (i - dp[i - 1] > 0 && s[i - dp[i - 1] - 1] === '(') dp[i] = dp[i - 1] + 2 + (i - dp[i - 1] >= 2 ? dp[i - dp[i - 1] - 2] : 0);
    best = Math.max(best, dp[i]);
  }
  return best;
}`),
      A('Stack of indices', 'Push indices with a sentinel -1. On ")" pop; if the stack is empty push this index as the new base, otherwise the valid length is i minus the new top.', 'O(n)', 'O(n)', `function longestValidParentheses(s) {
  const st = [-1];
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') st.push(i);
    else { st.pop(); if (!st.length) st.push(i); else best = Math.max(best, i - st[st.length - 1]); }
  }
  return best;
}`),
      A('Two counters (no extra space)', 'Scan left to right counting opens and closes, resetting when closes exceed opens; scan right to left with the roles swapped. The longest balanced run found in either scan is the answer.', 'O(n)', 'O(1)', `function longestValidParentheses(s) {
  let best = 0, o = 0, c = 0;
  for (let i = 0; i < s.length; i++) { s[i] === '(' ? o++ : c++; if (o === c) best = Math.max(best, 2 * c); else if (c > o) o = c = 0; }
  o = c = 0;
  for (let i = s.length - 1; i >= 0; i--) { s[i] === '(' ? o++ : c++; if (o === c) best = Math.max(best, 2 * o); else if (o > c) o = c = 0; }
  return best;
}`)
    ]
  },
  {
    id: 'shortest-subarray-sum-at-least-k', title: 'Shortest Subarray with Sum at Least K', d: 'H', topic: 'Sliding Window', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Given an integer array (values can be negative) and k, return the length of the shortest non-empty subarray whose sum is at least k, or -1 if none exists.\n\nExample:\nInput: nums = [2,-1,2], k = 3\nOutput: 3',
    fn: 'shortestSubarray', params: 'nums, k', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[1], 1], [[1, 2], 4], [[2, -1, 2], 3], [[84, -37, 32, 40, 95], 167], [[-28, 81, -20, 28, -29], 89], [[1, 2, 3], 6], [[5, -3, 4], 6]],
    gen: (r) => [r.arr(r.int(1, 8), -4, 6), r.int(1, 10)],
    approaches: [
      A('Every subarray', 'Try every start and extend until the sum reaches k.', 'O(n²)', 'O(1)', `function shortestSubarray(nums, k) {
  let best = Infinity;
  for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s >= k) { best = Math.min(best, j - i + 1); break; } } }
  return best === Infinity ? -1 : best;
}`, { note: 'For a fixed start, the first end that reaches k is the shortest one, so the inner loop can stop there.' }),
      A('Prefix sums with a monotonic deque', 'Prefix sums turn the question into: find i < j with P[j] - P[i] ≥ k and j - i minimal. Keep a deque of indices with increasing prefix sums; pop from the front while the condition holds and from the back when a smaller prefix arrives.', 'O(n)', 'O(n)', `function shortestSubarray(nums, k) {
  const P = [0];
  for (const x of nums) P.push(P[P.length - 1] + x);
  const dq = [];
  let head = 0, best = Infinity;
  for (let j = 0; j < P.length; j++) {
    while (dq.length > head && P[j] - P[dq[head]] >= k) { best = Math.min(best, j - dq[head]); head++; }
    while (dq.length > head && P[dq[dq.length - 1]] >= P[j]) dq.pop();
    dq.push(j);
  }
  return best === Infinity ? -1 : best;
}`)
    ]
  },
  {
    id: 'subarrays-k-different-integers', title: 'Subarrays with K Different Integers', d: 'H', topic: 'Sliding Window', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Return the number of subarrays that contain exactly k distinct integers.\n\nExample:\nInput: nums = [1,2,1,2,3], k = 2\nOutput: 7',
    fn: 'subarraysWithKDistinct', params: 'nums, k', constraints: '1 ≤ n ≤ 2·10^4',
    tests: [[[1, 2, 1, 2, 3], 2], [[1, 2, 1, 3, 4], 3], [[1], 1], [[1, 1, 1], 1], [[1, 2, 3], 1], [[1, 2, 3], 4], [[2, 1, 1, 1, 2], 1]],
    gen: (r) => [r.arr(r.int(1, 9), 1, 4), r.int(1, 4)],
    approaches: [
      A('Every subarray', 'Count distinct values in each subarray.', 'O(n²)', 'O(n)', `function subarraysWithKDistinct(nums, k) {
  let c = 0;
  for (let i = 0; i < nums.length; i++) { const s = new Set(); for (let j = i; j < nums.length; j++) { s.add(nums[j]); if (s.size === k) c++; else if (s.size > k) break; } }
  return c;
}`),
      A('At most K minus at most K - 1', 'Counting subarrays with at most k distinct values is a standard sliding window. Exactly k is at most k minus at most k - 1.', 'O(n)', 'O(n)', `function subarraysWithKDistinct(nums, k) {
  const atMost = (K) => {
    const c = new Map();
    let l = 0, res = 0;
    for (let r = 0; r < nums.length; r++) {
      c.set(nums[r], (c.get(nums[r]) || 0) + 1);
      while (c.size > K) { c.set(nums[l], c.get(nums[l]) - 1); if (c.get(nums[l]) === 0) c.delete(nums[l]); l++; }
      res += r - l + 1;
    }
    return res;
  };
  return atMost(k) - atMost(k - 1);
}`)
    ]
  }
];
