const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'three-sum', title: '3Sum', d: 'M', topic: 'Two Pointers', roles: ['SDE', 'Backend Developer'], out: 'sortRows',
    desc: 'Return all unique triplets [a, b, c] from the array with a + b + c = 0. The triplets may be in any order (the tests normalise them) and the same triplet must not appear twice.\n\nExample:\nInput: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]',
    fn: 'threeSum', params: 'nums', constraints: '3 ≤ n ≤ 3000',
    tests: [[[-1, 0, 1, 2, -1, -4]], [[0, 1, 1]], [[0, 0, 0]], [[0, 0, 0, 0]], [[-2, 0, 1, 1, 2]], [[3, -2, 1, 0, -1, 2, -3]], [[1, 2, 3]]],
    gen: (r) => [r.arr(r.int(3, 9), -4, 4)],
    approaches: [
      A('Three nested loops', 'Try every triple, sort it and keep it if the sum is zero and it has not been seen.', 'O(n³)', 'O(n)', `function threeSum(nums) {
  const seen = new Set(), out = [];
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) for (let k = j + 1; k < nums.length; k++) {
    if (nums[i] + nums[j] + nums[k] === 0) {
      const t = [nums[i], nums[j], nums[k]].sort((a, b) => a - b), key = t.join(',');
      if (!seen.has(key)) { seen.add(key); out.push(t); }
    }
  }
  return out;
}`),
      A('Hash set for the third number', 'For each pair, look up the number that completes the sum in a set. Avoid duplicates by storing sorted triples in a set of keys.', 'O(n²)', 'O(n)', `function threeSum(nums) {
  const seen = new Set(), out = [];
  for (let i = 0; i < nums.length; i++) {
    const s = new Set();
    for (let j = i + 1; j < nums.length; j++) {
      const need = -nums[i] - nums[j];
      if (s.has(need)) {
        const t = [nums[i], nums[j], need].sort((a, b) => a - b), key = t.join(',');
        if (!seen.has(key)) { seen.add(key); out.push(t); }
      }
      s.add(nums[j]);
    }
  }
  return out;
}`),
      A('Sort + two pointers', 'Sort, fix the first number, and use two pointers on the rest to find pairs that sum to its negative. Skip equal values to avoid duplicate triplets.', 'O(n²)', 'O(1)', `function threeSum(nums) {
  const a = [...nums].sort((x, y) => x - y), out = [];
  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    let l = i + 1, r = a.length - 1;
    while (l < r) {
      const s = a[i] + a[l] + a[r];
      if (s === 0) { out.push([a[i], a[l], a[r]]); while (l < r && a[l] === a[l + 1]) l++; while (l < r && a[r] === a[r - 1]) r--; l++; r--; }
      else if (s < 0) l++; else r--;
    }
  }
  return out;
}`)
    ]
  },
  {
    id: 'three-sum-closest', title: '3Sum Closest', d: 'M', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Return the sum of three integers from the array that is closest to the target. Each test has exactly one closest sum.\n\nExample:\nInput: nums = [-1,2,1,-4], target = 1\nOutput: 2',
    fn: 'threeSumClosest', params: 'nums, target', constraints: '3 ≤ n ≤ 500',
    tests: [[[-1, 2, 1, -4], 1], [[0, 0, 0], 1], [[1, 1, 1, 0], -100], [[4, 0, 5, -5, 3, 3, 0, -4, -5], -2], [[1, 2, 5, 10, 11], 12], [[-3, -2, -5, 3, -4], -1]],
    gen: (r) => { for (;;) { const a = r.arr(r.int(3, 7), -6, 8), t = r.int(-10, 12); const d = new Set(); let best = Infinity, ties = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) for (let k = j + 1; k < a.length; k++) { const s = a[i] + a[j] + a[k]; const dist = Math.abs(s - t); if (dist < best) { best = dist; d.clear(); d.add(s); } else if (dist === best) d.add(s); } if (d.size === 1) return [a, t]; } },
    approaches: [
      A('Try every triple', 'Compute every three-element sum and keep the closest.', 'O(n³)', 'O(1)', `function threeSumClosest(nums, target) {
  let best = Infinity;
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) for (let k = j + 1; k < nums.length; k++) {
    const s = nums[i] + nums[j] + nums[k];
    if (Math.abs(s - target) < Math.abs(best - target)) best = s;
  }
  return best;
}`),
      A('Sort + two pointers', 'Fix one number and walk two pointers inward over the sorted rest, moving the pointer that brings the sum toward the target.', 'O(n²)', 'O(1)', `function threeSumClosest(nums, target) {
  const a = [...nums].sort((x, y) => x - y);
  let best = a[0] + a[1] + a[2];
  for (let i = 0; i < a.length - 2; i++) {
    let l = i + 1, r = a.length - 1;
    while (l < r) {
      const s = a[i] + a[l] + a[r];
      if (Math.abs(s - target) < Math.abs(best - target)) best = s;
      if (s < target) l++; else if (s > target) r--; else return s;
    }
  }
  return best;
}`)
    ]
  },
  {
    id: 'rotate-array', title: 'Rotate Array', d: 'M', topic: 'Arrays', roles: ['SDE'],
    desc: 'Rotate an array to the right by k steps and return the result.\n\nExample:\nInput: nums = [1,2,3,4,5,6,7], k = 3\nOutput: [5,6,7,1,2,3,4]',
    fn: 'rotate', params: 'nums, k', constraints: '1 ≤ n ≤ 10^5, 0 ≤ k ≤ 10^5',
    tests: [[[1, 2, 3, 4, 5, 6, 7], 3], [[-1, -100, 3, 99], 2], [[1], 5], [[1, 2], 0], [[1, 2, 3], 3], [[1, 2, 3, 4, 5], 8]],
    gen: (r) => [r.arr(r.int(1, 8), 0, 9), r.int(0, 12)],
    approaches: [
      A('Rotate one step k times', 'Move the last element to the front, repeated k times.', 'O(n·k)', 'O(1)', `function rotate(nums, k) {
  const a = [...nums];
  for (let s = 0; s < k % a.length; s++) a.unshift(a.pop());
  return a;
}`),
      A('Extra array', 'Place each element at its rotated index (i + k) mod n in a new array.', 'O(n)', 'O(n)', `function rotate(nums, k) {
  const n = nums.length, out = new Array(n);
  for (let i = 0; i < n; i++) out[(i + k) % n] = nums[i];
  return out;
}`),
      A('Three reversals', 'Reverse the whole array, then reverse the first k elements and the remaining n - k. In place with no extra memory.', 'O(n)', 'O(1)', `function rotate(nums, k) {
  const a = [...nums], n = a.length;
  k %= n;
  const rev = (i, j) => { while (i < j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; } };
  rev(0, n - 1); rev(0, k - 1); rev(k, n - 1);
  return a;
}`)
    ]
  },
  {
    id: 'find-all-duplicates', title: 'Find All Duplicates in an Array', d: 'M', topic: 'Arrays', roles: ['SDE'], out: 'sort',
    desc: 'An array of n integers has every value in the range [1, n], and each value appears once or twice. Return all values that appear twice (in any order; the tests sort them).\n\nExample:\nInput: nums = [4,3,2,7,8,2,3,1]\nOutput: [2,3]',
    fn: 'findDuplicates', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[4, 3, 2, 7, 8, 2, 3, 1]], [[1, 1, 2]], [[1]], [[2, 2]], [[1, 2, 3]], [[3, 3, 1, 1, 2]]],
    gen: (r) => { const n = r.int(1, 8); const a = Array.from({ length: n }, (_, i) => i + 1); const out = []; const cnt = {}; for (let i = 0; i < n; i++) { let v = r.int(1, n); while ((cnt[v] || 0) >= 2) v = r.int(1, n); cnt[v] = (cnt[v] || 0) + 1; out.push(v); } return [out]; },
    approaches: [
      A('Count with a hash map', 'Count occurrences and return the values counted twice.', 'O(n)', 'O(n)', `function findDuplicates(nums) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  return [...c].filter(([, v]) => v === 2).map(([k]) => k);
}`),
      A('Sort and compare neighbours', 'After sorting, a duplicate equals its neighbour.', 'O(n log n)', 'O(1)', `function findDuplicates(nums) {
  const a = [...nums].sort((x, y) => x - y), out = [];
  for (let i = 1; i < a.length; i++) if (a[i] === a[i - 1]) out.push(a[i]);
  return out;
}`),
      A('Negate to mark (in place)', 'Values are valid indices. For each value flip the sign at its index; meeting an already negative entry means the value is a duplicate.', 'O(n)', 'O(1)', `function findDuplicates(nums) {
  const a = [...nums], out = [];
  for (const x of nums) {
    const i = Math.abs(x) - 1;
    if (a[i] < 0) out.push(Math.abs(x)); else a[i] = -a[i];
  }
  return out;
}`, { note: 'Extra space is O(1) apart from the output when the input may be modified.' })
    ]
  },
  {
    id: 'next-permutation', title: 'Next Permutation', d: 'M', topic: 'Arrays', roles: ['SDE'],
    desc: 'Rearrange the numbers into the next lexicographically greater permutation. If there is none, return the smallest arrangement (sorted ascending).\n\nExample:\nInput: nums = [1,2,3]\nOutput: [1,3,2]',
    fn: 'nextPermutation', params: 'nums', constraints: '1 ≤ n ≤ 100',
    tests: [[[1, 2, 3]], [[3, 2, 1]], [[1, 1, 5]], [[1]], [[1, 3, 2]], [[2, 3, 1]], [[1, 5, 1]], [[4, 3, 2, 5, 3, 1]]],
    gen: (r) => [r.arr(r.int(1, 6), 0, 3)],
    approaches: [
      A('Generate all permutations', 'List every permutation in order, find the current one and take the one after it. Only workable for tiny inputs.', 'O(n·n!)', 'O(n·n!)', `function nextPermutation(nums) {
  const key = (a) => a.join(',');
  const sorted = [...nums].sort((x, y) => x - y);
  const all = new Set();
  const go = (cur, rest) => { if (!rest.length) { all.add(key(cur)); return; } for (let i = 0; i < rest.length; i++) go([...cur, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]); };
  go([], sorted);
  const list = [...all].map((s) => s.split(',').map(Number)).sort((a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
  const i = list.findIndex((p) => key(p) === key(nums));
  return list[(i + 1) % list.length];
}`),
      A('Find the pivot, swap, reverse', 'Scan from the right for the first ascent a[i] < a[i+1]. Swap a[i] with the smallest larger value to its right, then reverse the suffix so it is the smallest arrangement.', 'O(n)', 'O(1)', `function nextPermutation(nums) {
  const a = [...nums];
  let i = a.length - 2;
  while (i >= 0 && a[i] >= a[i + 1]) i--;
  if (i >= 0) {
    let j = a.length - 1;
    while (a[j] <= a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
  }
  let l = i + 1, r = a.length - 1;
  while (l < r) { [a[l], a[r]] = [a[r], a[l]]; l++; r--; }
  return a;
}`)
    ]
  },
  {
    id: 'spiral-matrix', title: 'Spiral Matrix', d: 'M', topic: 'Arrays', roles: ['SDE'],
    desc: 'Return all elements of an m × n matrix in spiral order, starting at the top-left and going clockwise.\n\nExample:\nInput: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [1,2,3,6,9,8,7,4,5]',
    fn: 'spiralOrder', params: 'matrix', constraints: '1 ≤ m, n ≤ 10',
    tests: [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], [[[1]]], [[[1, 2, 3]]], [[[1], [2], [3]]], [[[1, 2], [3, 4]]]],
    gen: (r) => { const m = r.int(1, 4), n = r.int(1, 4); let k = 0; return [Array.from({ length: m }, () => Array.from({ length: n }, () => ++k))]; },
    approaches: [
      A('Direction vector with a visited grid', 'Walk in the current direction and turn right whenever the next cell is out of range or already visited.', 'O(m·n)', 'O(m·n)', `function spiralOrder(matrix) {
  const m = matrix.length, n = matrix[0].length, seen = matrix.map((r) => r.map(() => false)), out = [];
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let i = 0, j = 0, d = 0;
  for (let k = 0; k < m * n; k++) {
    out.push(matrix[i][j]); seen[i][j] = true;
    let a = i + dirs[d][0], b = j + dirs[d][1];
    if (a < 0 || b < 0 || a >= m || b >= n || seen[a][b]) { d = (d + 1) % 4; a = i + dirs[d][0]; b = j + dirs[d][1]; }
    i = a; j = b;
  }
  return out;
}`),
      A('Shrinking boundaries', 'Keep top, bottom, left and right bounds. Walk the top row, right column, bottom row and left column in turn, moving each bound inward after use.', 'O(m·n)', 'O(1)', `function spiralOrder(matrix) {
  let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
  const out = [];
  while (top <= bottom && left <= right) {
    for (let j = left; j <= right; j++) out.push(matrix[top][j]);
    top++;
    for (let i = top; i <= bottom; i++) out.push(matrix[i][right]);
    right--;
    if (top <= bottom) { for (let j = right; j >= left; j--) out.push(matrix[bottom][j]); bottom--; }
    if (left <= right) { for (let i = bottom; i >= top; i--) out.push(matrix[i][left]); left++; }
  }
  return out;
}`)
    ]
  },
  {
    id: 'rotate-image', title: 'Rotate Image', d: 'M', topic: 'Arrays', roles: ['SDE'],
    desc: 'Rotate an n × n matrix 90 degrees clockwise and return it.\n\nExample:\nInput: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [[7,4,1],[8,5,2],[9,6,3]]',
    fn: 'rotateImage', params: 'matrix', constraints: '1 ≤ n ≤ 20',
    tests: [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]], [[[1]]], [[[1, 2], [3, 4]]], [[[0, 1], [2, 3]]]],
    gen: (r) => { const n = r.int(1, 5); let k = 0; return [Array.from({ length: n }, () => Array.from({ length: n }, () => ++k))]; },
    approaches: [
      A('Copy into a new matrix', 'Cell (i, j) moves to (j, n - 1 - i). Write into a fresh matrix.', 'O(n²)', 'O(n²)', `function rotateImage(matrix) {
  const n = matrix.length, out = matrix.map((r) => [...r]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[j][n - 1 - i] = matrix[i][j];
  return out;
}`),
      A('Transpose then reverse each row', 'Swapping across the diagonal and then reversing every row is exactly a clockwise rotation.', 'O(n²)', 'O(1)', `function rotateImage(matrix) {
  const m = matrix.map((r) => [...r]), n = m.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
  for (const r of m) r.reverse();
  return m;
}`),
      A('Rotate four cells at a time', 'Rotate the matrix layer by layer, moving four cells in a cycle for each position. In place and a single pass.', 'O(n²)', 'O(1)', `function rotateImage(matrix) {
  const m = matrix.map((r) => [...r]), n = m.length;
  for (let i = 0; i < Math.floor(n / 2); i++) for (let j = i; j < n - 1 - i; j++) {
    const t = m[i][j];
    m[i][j] = m[n - 1 - j][i];
    m[n - 1 - j][i] = m[n - 1 - i][n - 1 - j];
    m[n - 1 - i][n - 1 - j] = m[j][n - 1 - i];
    m[j][n - 1 - i] = t;
  }
  return m;
}`)
    ]
  },
  {
    id: 'set-matrix-zeroes', title: 'Set Matrix Zeroes', d: 'M', topic: 'Arrays', roles: ['SDE'],
    desc: 'If an element of an m × n matrix is 0, set its entire row and column to 0. Return the matrix.\n\nExample:\nInput: matrix = [[1,1,1],[1,0,1],[1,1,1]]\nOutput: [[1,0,1],[0,0,0],[1,0,1]]',
    fn: 'setZeroes', params: 'matrix', constraints: '1 ≤ m, n ≤ 200',
    tests: [[[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], [[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], [[[1]]], [[[0]]], [[[1, 0]]], [[[1, 2], [3, 4]]]],
    gen: (r) => [Array.from({ length: r.int(1, 4) }, () => Array.from({ length: r.int(1, 1) + 2 }, () => r.pick([0, 1, 1, 2])))],
    approaches: [
      A('Copy of the matrix', 'Read zeros from a copy and write zeros into the result.', 'O(m·n)', 'O(m·n)', `function setZeroes(matrix) {
  const m = matrix.map((r) => [...r]);
  for (let i = 0; i < matrix.length; i++) for (let j = 0; j < matrix[0].length; j++) if (matrix[i][j] === 0) {
    for (let k = 0; k < matrix[0].length; k++) m[i][k] = 0;
    for (let k = 0; k < matrix.length; k++) m[k][j] = 0;
  }
  return m;
}`),
      A('Row and column markers', 'Record which rows and columns contain a zero in two arrays, then clear them in a second pass.', 'O(m·n)', 'O(m + n)', `function setZeroes(matrix) {
  const m = matrix.map((r) => [...r]), rows = new Set(), cols = new Set();
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m[0].length; j++) if (m[i][j] === 0) { rows.add(i); cols.add(j); }
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m[0].length; j++) if (rows.has(i) || cols.has(j)) m[i][j] = 0;
  return m;
}`),
      A('Use the first row and column as markers', 'Store the markers inside the matrix itself: the first cell of each row and column says whether that row or column must be zeroed. Handle the first row and column separately.', 'O(m·n)', 'O(1)', `function setZeroes(matrix) {
  const m = matrix.map((r) => [...r]), R = m.length, C = m[0].length;
  const row0 = m[0].includes(0), col0 = m.some((r) => r[0] === 0);
  for (let i = 1; i < R; i++) for (let j = 1; j < C; j++) if (m[i][j] === 0) { m[i][0] = 0; m[0][j] = 0; }
  for (let i = 1; i < R; i++) for (let j = 1; j < C; j++) if (m[i][0] === 0 || m[0][j] === 0) m[i][j] = 0;
  if (row0) for (let j = 0; j < C; j++) m[0][j] = 0;
  if (col0) for (let i = 0; i < R; i++) m[i][0] = 0;
  return m;
}`)
    ]
  },
  {
    id: 'search-rotated-array', title: 'Search in Rotated Sorted Array', d: 'M', topic: 'Searching', roles: ['SDE', 'Backend Developer'],
    desc: 'A sorted array of distinct values was rotated at an unknown pivot (for example [0,1,2,4,5,6,7] became [4,5,6,7,0,1,2]). Return the index of target, or -1. Aim for O(log n).\n\nExample:\nInput: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4',
    fn: 'searchRotated', params: 'nums, target', constraints: '1 ≤ n ≤ 5000, distinct values',
    tests: [[[4, 5, 6, 7, 0, 1, 2], 0], [[4, 5, 6, 7, 0, 1, 2], 3], [[1], 0], [[1], 1], [[3, 1], 1], [[5, 1, 3], 5], [[6, 7, 1, 2, 3, 4, 5], 6]],
    gen: (r) => { const a = r.uniq(r.int(1, 8), -5, 15).sort((x, y) => x - y); const k = r.int(0, a.length - 1); return [[...a.slice(k), ...a.slice(0, k)], r.int(-5, 15)]; },
    approaches: [
      A('Linear scan', 'Look at every element.', 'O(n)', 'O(1)', `function searchRotated(nums, target) {
  return nums.indexOf(target);
}`),
      A('Find the pivot, then binary search', 'First locate the smallest element (the rotation point) with binary search, then binary search the correct sorted half for the target.', 'O(log n)', 'O(1)', `function searchRotated(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] > nums[hi]) lo = m + 1; else hi = m; }
  const pivot = lo, n = nums.length;
  lo = 0; hi = n - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, v = nums[(m + pivot) % n];
    if (v === target) return (m + pivot) % n;
    if (v < target) lo = m + 1; else hi = m - 1;
  }
  return -1;
}`),
      A('One binary search', 'At each step one half is always sorted. Check whether the target lies in the sorted half and keep that half, otherwise keep the other.', 'O(log n)', 'O(1)', `function searchRotated(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (nums[m] === target) return m;
    if (nums[lo] <= nums[m]) { if (nums[lo] <= target && target < nums[m]) hi = m - 1; else lo = m + 1; }
    else { if (nums[m] < target && target <= nums[hi]) lo = m + 1; else hi = m - 1; }
  }
  return -1;
}`)
    ]
  },
  {
    id: 'find-min-rotated', title: 'Find Minimum in Rotated Sorted Array', d: 'M', topic: 'Searching', roles: ['SDE'],
    desc: 'A sorted array of distinct values was rotated. Return its minimum element in O(log n).\n\nExample:\nInput: nums = [3,4,5,1,2]\nOutput: 1',
    fn: 'findMin', params: 'nums', constraints: '1 ≤ n ≤ 5000, distinct values',
    tests: [[[3, 4, 5, 1, 2]], [[4, 5, 6, 7, 0, 1, 2]], [[11, 13, 15, 17]], [[1]], [[2, 1]], [[5, 1, 2, 3, 4]]],
    gen: (r) => { const a = r.uniq(r.int(1, 8), -5, 15).sort((x, y) => x - y); const k = r.int(0, a.length - 1); return [[...a.slice(k), ...a.slice(0, k)]]; },
    approaches: [
      A('Linear scan', 'Take the minimum of every element.', 'O(n)', 'O(1)', `function findMin(nums) {
  return Math.min(...nums);
}`),
      A('Binary search on the rotation point', 'Compare the middle with the last element: if the middle is larger the minimum is to its right, otherwise it is at or to the left.', 'O(log n)', 'O(1)', `function findMin(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] > nums[hi]) lo = m + 1; else hi = m; }
  return nums[lo];
}`)
    ]
  },
  {
    id: 'search-2d-matrix', title: 'Search a 2D Matrix', d: 'M', topic: 'Searching', roles: ['SDE'],
    desc: 'Each row of the matrix is sorted, and the first number of each row is greater than the last number of the previous row. Return true if target is in the matrix.\n\nExample:\nInput: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3\nOutput: true',
    fn: 'searchMatrix', params: 'matrix, target', constraints: '1 ≤ m, n ≤ 100',
    tests: [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], [[[1]], 1], [[[1]], 2], [[[1, 3]], 3], [[[1], [3]], 3], [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 60]],
    gen: (r) => { const m = r.int(1, 3), n = r.int(1, 4); let v = 0; const g = Array.from({ length: m }, () => Array.from({ length: n }, () => (v += r.int(1, 3)))); return [g, r.int(0, v + 2)]; },
    approaches: [
      A('Scan every cell', 'Check each element of every row until the target is found or the matrix ends.', 'O(m·n)', 'O(1)', `function searchMatrix(matrix, target) {
  return matrix.some((r) => r.includes(target));
}`),
      A('Binary search each candidate row', 'Find the one row whose range could hold the target, then binary search inside it.', 'O(m + log n)', 'O(1)', `function searchMatrix(matrix, target) {
  for (const row of matrix) {
    if (target < row[0] || target > row[row.length - 1]) continue;
    let lo = 0, hi = row.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (row[m] === target) return true; if (row[m] < target) lo = m + 1; else hi = m - 1; }
  }
  return false;
}`),
      A('Binary search the flattened matrix', 'Because rows continue each other in order, treat the matrix as one sorted array of length m·n and map an index k to (k / n, k % n).', 'O(log(m·n))', 'O(1)', `function searchMatrix(matrix, target) {
  const m = matrix.length, n = matrix[0].length;
  let lo = 0, hi = m * n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, v = matrix[Math.floor(mid / n)][mid % n];
    if (v === target) return true;
    if (v < target) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}`)
    ]
  },
  {
    id: 'find-peak-element', title: 'Find Peak Element', d: 'M', topic: 'Searching', roles: ['SDE'],
    desc: 'A peak element is strictly greater than its neighbours (the ends count as having -∞ beyond them). Return the index of any peak; the tests accept any valid peak index (they check the value is a peak). Aim for O(log n).\n\nExample:\nInput: nums = [1,2,1,3,5,6,4]\nOutput: 5 (or 1)',
    fn: 'findPeakElement', params: 'nums', constraints: '1 ≤ n ≤ 1000, adjacent values differ', uniform: true,
    expr: (a) => `(() => { const a = ${JSON.stringify(a)}; const i = findPeakElement(a); return Number.isInteger(i) && i >= 0 && i < a.length && (i === 0 || a[i] > a[i - 1]) && (i === a.length - 1 || a[i] > a[i + 1]); })()`,
    tests: [[[1, 2, 3, 1]], [[1, 2, 1, 3, 5, 6, 4]], [[1]], [[2, 1]], [[1, 2]], [[3, 2, 1]], [[1, 3, 2, 4, 3, 5, 4]]],
    gen: (r) => { const a = []; while (a.length < r.int(1, 8)) { const v = r.int(0, 9); if (a.length && a[a.length - 1] === v) continue; a.push(v); } return [a]; },
    approaches: [
      A('Linear scan', 'Return the first index greater than its right neighbour.', 'O(n)', 'O(1)', `function findPeakElement(nums) {
  for (let i = 0; i < nums.length; i++) if (i === nums.length - 1 || nums[i] > nums[i + 1]) { if (i === 0 || nums[i] > nums[i - 1]) return i; }
  return 0;
}`),
      A('Binary search on the slope', 'If the middle element is smaller than its right neighbour a peak must exist to the right (the values rise, and the end counts as -∞); otherwise one exists at or to the left. Halve the range each step.', 'O(log n)', 'O(1)', `function findPeakElement(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] < nums[m + 1]) lo = m + 1; else hi = m; }
  return lo;
}`)
    ]
  },
  {
    id: 'maximum-product-subarray', title: 'Maximum Product Subarray', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'],
    desc: 'Return the largest product of a contiguous subarray (at least one element).\n\nExample:\nInput: nums = [2,3,-2,4]\nOutput: 6',
    fn: 'maxProduct', params: 'nums', constraints: '1 ≤ n ≤ 2·10^4',
    tests: [[[2, 3, -2, 4]], [[-2, 0, -1]], [[-2]], [[-2, 3, -4]], [[0, 2]], [[2, -5, -2, -4, 3]], [[-1, -1]]],
    gen: (r) => [r.arr(r.int(1, 8), -3, 3)],
    approaches: [
      A('Every subarray', 'Multiply along every start/end pair and keep the maximum.', 'O(n²)', 'O(1)', `function maxProduct(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) { let p = 1; for (let j = i; j < nums.length; j++) { p *= nums[j]; best = Math.max(best, p); } }
  return best;
}`),
      A('Track the max and min ending here', 'A negative number can turn the smallest product into the largest, so keep both the max and the min product of subarrays ending at each index.', 'O(n)', 'O(1)', `function maxProduct(nums) {
  let mx = nums[0], mn = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i], a = mx * x, b = mn * x;
    mx = Math.max(x, a, b); mn = Math.min(x, a, b);
    best = Math.max(best, mx);
  }
  return best;
}`),
      A('Prefix and suffix products', 'The best subarray is a prefix or a suffix of a zero-free segment, so scan from both ends with running products that reset after a zero.', 'O(n)', 'O(1)', `function maxProduct(nums) {
  let best = -Infinity, pre = 1, suf = 1;
  for (let i = 0; i < nums.length; i++) {
    pre = (pre === 0 ? 1 : pre) * nums[i];
    suf = (suf === 0 ? 1 : suf) * nums[nums.length - 1 - i];
    best = Math.max(best, pre, suf);
  }
  return best;
}`)
    ]
  },
  {
    id: 'jump-game-ii', title: 'Jump Game II', d: 'M', topic: 'Greedy', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'nums[i] is the maximum jump length from index i. You can always reach the last index. Return the minimum number of jumps needed to get there.\n\nExample:\nInput: nums = [2,3,1,1,4]\nOutput: 2',
    fn: 'jump', params: 'nums', constraints: '1 ≤ n ≤ 10^4, the end is reachable',
    tests: [[[2, 3, 1, 1, 4]], [[2, 3, 0, 1, 4]], [[0]], [[1, 1, 1, 1]], [[5, 1, 1, 1, 1, 1]], [[1, 2, 3]], [[3, 2, 1, 1, 4]]],
    gen: (r) => { const n = r.int(1, 8); const a = []; for (let i = 0; i < n; i++) a.push(r.int(1, 4)); a[n - 1] = r.int(0, 3); return [a]; },
    approaches: [
      A('Dynamic programming', 'dp[i] is the fewest jumps to reach i. Relax every index that can be reached from i.', 'O(n²)', 'O(n)', `function jump(nums) {
  const n = nums.length, dp = new Array(n).fill(Infinity);
  dp[0] = 0;
  for (let i = 0; i < n; i++) for (let j = 1; j <= nums[i] && i + j < n; j++) dp[i + j] = Math.min(dp[i + j], dp[i] + 1);
  return dp[n - 1];
}`),
      A('Greedy by levels (BFS)', 'Treat the indices reachable with k jumps as one level. Track the furthest index reachable inside the current level and take a jump when the level ends.', 'O(n)', 'O(1)', `function jump(nums) {
  let jumps = 0, end = 0, far = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    far = Math.max(far, i + nums[i]);
    if (i === end) { jumps++; end = far; }
  }
  return jumps;
}`)
    ]
  },
  {
    id: 'find-first-last-position', title: 'Find First and Last Position in Sorted Array', d: 'M', topic: 'Searching', roles: ['SDE'],
    desc: 'In an array sorted in non-decreasing order, return [first, last] indexes of target, or [-1, -1] if it is absent. Aim for O(log n).\n\nExample:\nInput: nums = [5,7,7,8,8,10], target = 8\nOutput: [3,4]',
    fn: 'searchRange', params: 'nums, target', constraints: '0 ≤ n ≤ 10^5',
    tests: [[[5, 7, 7, 8, 8, 10], 8], [[5, 7, 7, 8, 8, 10], 6], [[], 0], [[1], 1], [[2, 2], 2], [[1, 2, 3], 4], [[1, 1, 1, 2], 1]],
    gen: (r) => [r.sorted(r.int(0, 9), 0, 5), r.int(0, 5)],
    approaches: [
      A('Linear scan', 'Walk the array and note the first and last match.', 'O(n)', 'O(1)', `function searchRange(nums, target) {
  return [nums.indexOf(target), nums.lastIndexOf(target)];
}`),
      A('Expand around one binary-search hit', 'Binary search finds some occurrence; then walk outward to the edges. Fast unless the target repeats many times.', 'O(n)', 'O(1)', `function searchRange(nums, target) {
  let lo = 0, hi = nums.length - 1, at = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (nums[m] === target) { at = m; break; } if (nums[m] < target) lo = m + 1; else hi = m - 1; }
  if (at < 0) return [-1, -1];
  let l = at, r = at;
  while (l > 0 && nums[l - 1] === target) l--;
  while (r < nums.length - 1 && nums[r + 1] === target) r++;
  return [l, r];
}`, { note: 'Worst case is linear when every element equals the target.' }),
      A('Two binary searches (lower and upper bound)', 'Binary search once for the first index not less than target and once for the first index greater than target.', 'O(log n)', 'O(1)', `function searchRange(nums, target) {
  const bound = (t) => { let lo = 0, hi = nums.length; while (lo < hi) { const m = (lo + hi) >> 1; if (nums[m] < t) lo = m + 1; else hi = m; } return lo; };
  const l = bound(target), r = bound(target + 1) - 1;
  return l <= r ? [l, r] : [-1, -1];
}`)
    ]
  },
  {
    id: 'min-size-subarray-sum', title: 'Minimum Size Subarray Sum', d: 'M', topic: 'Sliding Window', roles: ['SDE'],
    desc: 'Given an array of positive integers and a target, return the minimal length of a contiguous subarray whose sum is at least target, or 0 if there is none.\n\nExample:\nInput: target = 7, nums = [2,3,1,2,4,3]\nOutput: 2 ([4,3])',
    fn: 'minSubArrayLen', params: 'target, nums', constraints: '1 ≤ n ≤ 10^5, positive values',
    tests: [[7, [2, 3, 1, 2, 4, 3]], [4, [1, 4, 4]], [11, [1, 1, 1, 1, 1, 1, 1, 1]], [5, [5]], [100, [50, 50]], [3, [1, 1, 1]], [15, [1, 2, 3, 4, 5]]],
    gen: (r) => [r.int(1, 12), r.arr(r.int(1, 8), 1, 5)],
    approaches: [
      A('Every subarray', 'Test the sum of every start/end pair.', 'O(n²)', 'O(1)', `function minSubArrayLen(target, nums) {
  let best = Infinity;
  for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s >= target) { best = Math.min(best, j - i + 1); break; } } }
  return best === Infinity ? 0 : best;
}`),
      A('Sliding window', 'Grow the window on the right until its sum reaches the target, then shrink from the left while it still does. All values are positive, so each pointer only moves forward.', 'O(n)', 'O(1)', `function minSubArrayLen(target, nums) {
  let l = 0, s = 0, best = Infinity;
  for (let r = 0; r < nums.length; r++) {
    s += nums[r];
    while (s >= target) { best = Math.min(best, r - l + 1); s -= nums[l++]; }
  }
  return best === Infinity ? 0 : best;
}`),
      A('Prefix sums with binary search', 'With prefix sums (which increase), binary search for the first prefix at least prefix[i] + target for every start i.', 'O(n log n)', 'O(n)', `function minSubArrayLen(target, nums) {
  const p = [0];
  for (const x of nums) p.push(p[p.length - 1] + x);
  let best = Infinity;
  for (let i = 0; i < nums.length; i++) {
    let lo = i + 1, hi = nums.length;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (p[m] - p[i] >= target) hi = m - 1; else lo = m + 1; }
    if (lo <= nums.length) best = Math.min(best, lo - i);
  }
  return best === Infinity ? 0 : best;
}`)
    ]
  }
];
