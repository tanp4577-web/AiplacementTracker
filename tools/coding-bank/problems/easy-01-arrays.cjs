const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'two-sum', title: 'Two Sum', d: 'E', topic: 'Arrays', roles: ['SDE', 'Backend Developer', 'Data Analyst'],
    desc: 'Given an array of integers nums and an integer target, return the indices [i, j] (i < j) of the two numbers that add up to target. Exactly one such pair exists.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]',
    fn: 'twoSum', params: 'nums, target', constraints: '2 ≤ n ≤ 10^4; exactly one valid pair',
    tests: [[[2, 7, 11, 15], 9], [[3, 2, 4], 6], [[3, 3], 6], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0], [[1, 5, 9, 14, 20], 34]],
    gen: (r) => { for (;;) { const n = r.int(2, 9); const a = r.arr(n, -9, 9); const i = r.int(0, n - 2); const j = r.int(i + 1, n - 1); const t = a[i] + a[j]; let c = 0; for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) if (a[x] + a[y] === t) c++; if (c === 1) return [a, t]; } },
    approaches: [
      A('Brute force', 'Check every pair of numbers and return the first pair that sums to the target.', 'O(n²)', 'O(1)', `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return [i, j];
}`, { note: 'Fine for tiny inputs, but doubling n quadruples the work.' }),
      A('Sort + two pointers', 'Sort a copy of (value, index) pairs, then move a left and a right pointer inward until the sum matches. Sorting costs O(n log n) but the scan is linear.', 'O(n log n)', 'O(n)', `function twoSum(nums, target) {
  const a = nums.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  let l = 0, r = a.length - 1;
  while (l < r) {
    const s = a[l][0] + a[r][0];
    if (s === target) return [a[l][1], a[r][1]].sort((x, y) => x - y);
    if (s < target) l++; else r--;
  }
}`),
      A('Hash map (one pass)', 'For each number look up target - number in a map of values seen so far. Trades O(n) memory for a single pass.', 'O(n)', 'O(n)', `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}`)
    ]
  },
  {
    id: 'contains-duplicate', title: 'Contains Duplicate', d: 'E', topic: 'Hashing', roles: ['SDE', 'Backend Developer'],
    desc: 'Given an integer array nums, return true if any value appears at least twice, and false if every element is distinct.\n\nExample:\nInput: nums = [1,2,3,1]\nOutput: true',
    fn: 'containsDuplicate', params: 'nums', constraints: '0 ≤ n ≤ 10^5',
    tests: [[[1, 2, 3, 1]], [[1, 2, 3, 4]], [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], [[]], [[7]], [[0, -1, 0]]],
    gen: (r) => [r.arr(r.int(0, 8), -5, 5)],
    approaches: [
      A('Brute force', 'Compare every element with every later element.', 'O(n²)', 'O(1)', `function containsDuplicate(nums) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] === nums[j]) return true;
  return false;
}`),
      A('Sort first', 'After sorting, equal values sit next to each other, so one scan of neighbours is enough.', 'O(n log n)', 'O(1)', `function containsDuplicate(nums) {
  const a = [...nums].sort((x, y) => x - y);
  for (let i = 1; i < a.length; i++) if (a[i] === a[i - 1]) return true;
  return false;
}`, { note: 'Sorting in place gives O(1) extra space but changes the caller\'s array.' }),
      A('Hash set', 'Remember every value seen so far; a repeat means a duplicate.', 'O(n)', 'O(n)', `function containsDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}`)
    ]
  },
  {
    id: 'best-time-stock', title: 'Best Time to Buy and Sell Stock', d: 'E', topic: 'Arrays', roles: ['SDE', 'Data Analyst'],
    desc: 'prices[i] is the price of a stock on day i. Choose one day to buy and a later day to sell. Return the maximum profit, or 0 if no profit is possible.\n\nExample:\nInput: prices = [7,1,5,3,6,4]\nOutput: 5 (buy at 1, sell at 6)',
    fn: 'maxProfit', params: 'prices', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[7, 1, 5, 3, 6, 4]], [[7, 6, 4, 3, 1]], [[2, 4, 1]], [[1]], [[1, 2]], [[3, 3, 3, 3]], [[2, 1, 2, 0, 1]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 12)],
    approaches: [
      A('Brute force', 'Try every buy day and every later sell day.', 'O(n²)', 'O(1)', `function maxProfit(prices) {
  let best = 0;
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++)
      best = Math.max(best, prices[j] - prices[i]);
  return best;
}`),
      A('Track the minimum so far', 'The best sale on day j uses the cheapest price before it. Keep that minimum while scanning once.', 'O(n)', 'O(1)', `function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) {
    min = Math.min(min, p);
    best = Math.max(best, p - min);
  }
  return best;
}`)
    ]
  },
  {
    id: 'move-zeroes', title: 'Move Zeroes', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Move all 0s to the end of the array while keeping the order of the non-zero elements. Return the resulting array.\n\nExample:\nInput: nums = [0,1,0,3,12]\nOutput: [1,3,12,0,0]',
    fn: 'moveZeroes', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[0, 1, 0, 3, 12]], [[0]], [[1, 2, 3]], [[0, 0, 1]], [[4, 0, 5, 0, 0, 6]], [[2, 1]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 3)],
    approaches: [
      A('Extra array', 'Copy the non-zero values first, then pad with zeros.', 'O(n)', 'O(n)', `function moveZeroes(nums) {
  const nz = nums.filter((x) => x !== 0);
  return nz.concat(Array(nums.length - nz.length).fill(0));
}`),
      A('Bubble zeros to the end', 'Repeatedly swap a zero with the non-zero value after it. Works in place but many swaps.', 'O(n²)', 'O(1)', `function moveZeroes(nums) {
  const a = [...nums];
  for (let end = a.length - 1; end > 0; end--)
    for (let i = 0; i < end; i++)
      if (a[i] === 0 && a[i + 1] !== 0) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  return a;
}`),
      A('Two pointers (in place)', 'Keep a write index for the next non-zero value; fill the rest with zeros.', 'O(n)', 'O(1)', `function moveZeroes(nums) {
  const a = [...nums];
  let w = 0;
  for (let r = 0; r < a.length; r++) if (a[r] !== 0) a[w++] = a[r];
  while (w < a.length) a[w++] = 0;
  return a;
}`)
    ]
  },
  {
    id: 'missing-number', title: 'Missing Number', d: 'E', topic: 'Math', roles: ['SDE', 'Data Analyst'],
    desc: 'An array nums contains n distinct numbers taken from the range 0..n. Return the one number in that range that is missing.\n\nExample:\nInput: nums = [3,0,1]\nOutput: 2',
    fn: 'missingNumber', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[3, 0, 1]], [[0, 1]], [[9, 6, 4, 2, 3, 5, 7, 0, 1]], [[0]], [[1]], [[1, 2, 0, 4]]],
    gen: (r) => { const n = r.int(1, 9); const miss = r.int(0, n); const arr = [...Array(n + 1).keys()].filter((x) => x !== miss); return [arr.sort(() => r.next() - 0.5)]; },
    approaches: [
      A('Check each number', 'For every value 0..n scan the array to see whether it is present.', 'O(n²)', 'O(1)', `function missingNumber(nums) {
  for (let v = 0; v <= nums.length; v++) if (!nums.includes(v)) return v;
}`),
      A('Hash set', 'Put all numbers in a set, then find the first value in 0..n that is not in it.', 'O(n)', 'O(n)', `function missingNumber(nums) {
  const s = new Set(nums);
  for (let v = 0; v <= nums.length; v++) if (!s.has(v)) return v;
}`),
      A('Sum formula', 'The numbers 0..n add up to n(n+1)/2. Subtract the actual sum to get the missing value.', 'O(n)', 'O(1)', `function missingNumber(nums) {
  const n = nums.length;
  return (n * (n + 1)) / 2 - nums.reduce((a, b) => a + b, 0);
}`),
      A('XOR', 'XOR all indices 0..n with all values. Pairs cancel and only the missing number remains, with no overflow risk.', 'O(n)', 'O(1)', `function missingNumber(nums) {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
}`)
    ]
  },
  {
    id: 'single-number', title: 'Single Number', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'Every element of nums appears exactly twice except one, which appears once. Return that single element.\n\nExample:\nInput: nums = [4,1,2,1,2]\nOutput: 4',
    fn: 'singleNumber', params: 'nums', constraints: '1 ≤ n ≤ 3·10^4, n is odd',
    tests: [[[2, 2, 1]], [[4, 1, 2, 1, 2]], [[1]], [[-1, 5, 5]], [[7, 3, 7, 3, 9, 8, 8]], [[0, 1, 0]]],
    gen: (r) => { const k = r.int(0, 4); const base = r.uniq(k + 1, -9, 9); const one = base[0]; const arr = [one]; for (let i = 1; i < base.length; i++) arr.push(base[i], base[i]); return [arr.sort(() => r.next() - 0.5)]; },
    approaches: [
      A('Count with a map', 'Count how often each value occurs and return the one with count 1.', 'O(n)', 'O(n)', `function singleNumber(nums) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  for (const [k, v] of c) if (v === 1) return k;
}`),
      A('Sort and compare neighbours', 'After sorting, equal values are adjacent; the loner is the first value not equal to its neighbour.', 'O(n log n)', 'O(1)', `function singleNumber(nums) {
  const a = [...nums].sort((x, y) => x - y);
  for (let i = 0; i < a.length; i += 2) if (a[i] !== a[i + 1]) return a[i];
}`),
      A('XOR', 'x ^ x = 0 and x ^ 0 = x, so XOR-ing everything cancels every pair and leaves the single number.', 'O(n)', 'O(1)', `function singleNumber(nums) {
  return nums.reduce((a, b) => a ^ b, 0);
}`)
    ]
  },
  {
    id: 'intersection-two-arrays', title: 'Intersection of Two Arrays', d: 'E', topic: 'Hashing', roles: ['SDE', 'Data Analyst'], out: 'sort',
    desc: 'Return the unique values that appear in both nums1 and nums2. The result may be in any order (tests compare it sorted).\n\nExample:\nInput: nums1 = [1,2,2,1], nums2 = [2,2]\nOutput: [2]',
    fn: 'intersection', params: 'nums1, nums2', constraints: '1 ≤ n, m ≤ 1000',
    tests: [[[1, 2, 2, 1], [2, 2]], [[4, 9, 5], [9, 4, 9, 8, 4]], [[1, 2], [3, 4]], [[], [1]], [[5, 5, 5], [5]], [[1, 2, 3], [3, 2, 1]]],
    gen: (r) => [r.arr(r.int(0, 8), 0, 6), r.arr(r.int(0, 8), 0, 6)],
    approaches: [
      A('Nested loops', 'For each value in the first array scan the second array, skipping values already added.', 'O(n·m)', 'O(min(n, m))', `function intersection(nums1, nums2) {
  const out = [];
  for (const a of nums1)
    if (nums2.includes(a) && !out.includes(a)) out.push(a);
  return out;
}`),
      A('Sort + two pointers', 'Sort both arrays and walk through them together, collecting matches once.', 'O(n log n + m log m)', 'O(1)', `function intersection(nums1, nums2) {
  const a = [...nums1].sort((x, y) => x - y), b = [...nums2].sort((x, y) => x - y);
  const out = []; let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { if (!out.length || out[out.length - 1] !== a[i]) out.push(a[i]); i++; j++; }
    else if (a[i] < b[j]) i++; else j++;
  }
  return out;
}`),
      A('Hash set', 'Store the first array in a set and keep values of the second array that are in it.', 'O(n + m)', 'O(n)', `function intersection(nums1, nums2) {
  const s = new Set(nums1);
  return [...new Set(nums2.filter((x) => s.has(x)))];
}`)
    ]
  },
  {
    id: 'merge-sorted-arrays', title: 'Merge Two Sorted Arrays', d: 'E', topic: 'Sorting', roles: ['SDE'],
    desc: 'Merge two sorted arrays a and b into a single sorted array.\n\nExample:\nInput: a = [1,3,5], b = [2,4,6]\nOutput: [1,2,3,4,5,6]',
    fn: 'mergeSorted', params: 'a, b', constraints: '0 ≤ n, m ≤ 10^5',
    tests: [[[1, 3, 5], [2, 4, 6]], [[], [1, 2]], [[1, 2, 3], []], [[1, 1, 2], [1, 3]], [[-5, 0], [-6, -1, 7]], [[], []]],
    gen: (r) => [r.sorted(r.int(0, 7), -5, 9), r.sorted(r.int(0, 7), -5, 9)],
    approaches: [
      A('Concatenate and sort', 'Join the arrays and sort the result. Simple but ignores that both are already sorted.', 'O((n+m) log(n+m))', 'O(n+m)', `function mergeSorted(a, b) {
  return [...a, ...b].sort((x, y) => x - y);
}`),
      A('Two pointers', 'Repeatedly take the smaller front element of the two arrays. This is the merge step of merge sort.', 'O(n + m)', 'O(n + m)', `function mergeSorted(a, b) {
  const out = []; let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}`)
    ]
  },
  {
    id: 'binary-search', title: 'Binary Search', d: 'E', topic: 'Searching', roles: ['SDE', 'Backend Developer'],
    desc: 'Given an array nums sorted in ascending order and a target, return the index of target or -1 if it is not present.\n\nExample:\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4',
    fn: 'search', params: 'nums, target', constraints: '1 ≤ n ≤ 10^4; values are unique',
    tests: [[[-1, 0, 3, 5, 9, 12], 9], [[-1, 0, 3, 5, 9, 12], 2], [[5], 5], [[5], 4], [[1, 3, 5, 7, 9, 11, 13], 1], [[1, 3, 5, 7, 9, 11, 13], 13], [[2, 4], 4]],
    gen: (r) => { const a = r.uniq(r.int(1, 9), -10, 20).sort((x, y) => x - y); return [a, r.int(-10, 20)]; },
    approaches: [
      A('Linear scan', 'Check every element from the left. Ignores the sorted order.', 'O(n)', 'O(1)', `function search(nums, target) {
  for (let i = 0; i < nums.length; i++) if (nums[i] === target) return i;
  return -1;
}`),
      A('Binary search (iterative)', 'Look at the middle element and discard the half that cannot contain the target. Each step halves the range.', 'O(log n)', 'O(1)', `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}`),
      A('Binary search (recursive)', 'Same idea written recursively; each call works on half of the range.', 'O(log n)', 'O(log n)', `function search(nums, target) {
  const go = (lo, hi) => {
    if (lo > hi) return -1;
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    return nums[mid] < target ? go(mid + 1, hi) : go(lo, mid - 1);
  };
  return go(0, nums.length - 1);
}`, { note: 'The recursion stack makes space O(log n) instead of O(1).' })
    ]
  },
  {
    id: 'max-consecutive-ones', title: 'Max Consecutive Ones', d: 'E', topic: 'Arrays', roles: ['SDE'],
    desc: 'Given a binary array nums, return the maximum number of consecutive 1s.\n\nExample:\nInput: nums = [1,1,0,1,1,1]\nOutput: 3',
    fn: 'findMaxConsecutiveOnes', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[1, 1, 0, 1, 1, 1]], [[1, 0, 1, 1, 0, 1]], [[0, 0, 0]], [[1]], [[1, 1, 1, 1]], [[0, 1, 1, 0, 1, 1, 1, 1, 0]]],
    gen: (r) => [r.arr(r.int(1, 12), 0, 1)],
    approaches: [
      A('Check every start', 'From each position count how long the run of ones continues.', 'O(n²)', 'O(1)', `function findMaxConsecutiveOnes(nums) {
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j < nums.length && nums[j] === 1) j++;
    best = Math.max(best, j - i);
  }
  return best;
}`),
      A('Single pass counter', 'Count the current run, reset to zero on a 0, and remember the longest.', 'O(n)', 'O(1)', `function findMaxConsecutiveOnes(nums) {
  let best = 0, run = 0;
  for (const x of nums) { run = x === 1 ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}`)
    ]
  },
  {
    id: 'remove-duplicates-sorted', title: 'Remove Duplicates from Sorted Array', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Given a sorted array nums, return a new array with the duplicates removed so that each value appears once, keeping the order.\n\nExample:\nInput: nums = [0,0,1,1,1,2,2,3,3,4]\nOutput: [0,1,2,3,4]',
    fn: 'removeDuplicates', params: 'nums', constraints: '0 ≤ n ≤ 3·10^4, sorted',
    tests: [[[1, 1, 2]], [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]], [[]], [[5]], [[2, 2, 2]], [[1, 2, 3]]],
    gen: (r) => [r.sorted(r.int(0, 10), 0, 5)],
    approaches: [
      A('Set then sort', 'Put the values in a set and sort the set again.', 'O(n log n)', 'O(n)', `function removeDuplicates(nums) {
  return [...new Set(nums)].sort((a, b) => a - b);
}`, { note: 'Ignores that the input is already sorted.' }),
      A('Compare with the last kept value', 'Because the array is sorted, a value is new exactly when it differs from the previous value.', 'O(n)', 'O(n)', `function removeDuplicates(nums) {
  const out = [];
  for (const x of nums) if (!out.length || out[out.length - 1] !== x) out.push(x);
  return out;
}`),
      A('Two pointers (in place idea)', 'Keep a write index k. When nums[i] differs from nums[k-1], copy it to position k. The first k cells hold the answer.', 'O(n)', 'O(1)', `function removeDuplicates(nums) {
  const a = [...nums];
  if (!a.length) return [];
  let k = 1;
  for (let i = 1; i < a.length; i++) if (a[i] !== a[k - 1]) a[k++] = a[i];
  return a.slice(0, k);
}`)
    ]
  },
  {
    id: 'plus-one', title: 'Plus One', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'A non-negative integer is stored as an array of its digits, most significant first. Add one to it and return the digits.\n\nExample:\nInput: digits = [1,2,9]\nOutput: [1,3,0]',
    fn: 'plusOne', params: 'digits', constraints: '1 ≤ n ≤ 100; no leading zeros',
    tests: [[[1, 2, 3]], [[1, 2, 9]], [[9]], [[9, 9, 9]], [[4, 3, 2, 1]], [[1, 0, 0, 9]]],
    gen: (r) => { const n = r.int(1, 6); const d = r.arr(n, 0, 9); d[0] = r.int(1, 9); if (r.next() < 0.3) for (let i = 1; i < n; i++) d[i] = 9; return [d]; },
    approaches: [
      A('BigInt conversion', 'Join the digits into a BigInt, add one, and split back into digits.', 'O(n)', 'O(n)', `function plusOne(digits) {
  return (BigInt(digits.join('')) + 1n).toString().split('').map(Number);
}`, { note: 'Short, but relies on big-number support; interviewers usually want the manual carry.' }),
      A('Carry from the right', 'Add one at the last digit and carry leftwards while a digit overflows to 10; prepend a 1 if the carry survives.', 'O(n)', 'O(1)', `function plusOne(digits) {
  const d = [...digits];
  for (let i = d.length - 1; i >= 0; i--) {
    if (d[i] < 9) { d[i]++; return d; }
    d[i] = 0;
  }
  return [1, ...d];
}`)
    ]
  },
  {
    id: 'majority-element', title: 'Majority Element', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Return the majority element: the value that appears more than n/2 times. It always exists.\n\nExample:\nInput: nums = [2,2,1,1,1,2,2]\nOutput: 2',
    fn: 'majorityElement', params: 'nums', constraints: '1 ≤ n ≤ 5·10^4; a majority element always exists',
    tests: [[[3, 2, 3]], [[2, 2, 1, 1, 1, 2, 2]], [[1]], [[5, 5, 5, 1, 2]], [[6, 5, 5]], [[1, 1, 2, 2, 2]]],
    gen: (r) => { const n = r.int(1, 6) * 2 - 1; const m = (n >> 1) + 1; const maj = r.int(0, 4); const arr = Array(m).fill(maj).concat(r.arr(n - m, 0, 4)); return [arr.sort(() => r.next() - 0.5)]; },
    approaches: [
      A('Count each value', 'For each element count its occurrences by scanning the array.', 'O(n²)', 'O(1)', `function majorityElement(nums) {
  for (const x of nums) {
    let c = 0;
    for (const y of nums) if (y === x) c++;
    if (c > nums.length / 2) return x;
  }
}`),
      A('Sort and take the middle', 'If a value fills more than half of the array it must occupy the middle position after sorting.', 'O(n log n)', 'O(1)', `function majorityElement(nums) {
  return [...nums].sort((a, b) => a - b)[nums.length >> 1];
}`),
      A('Hash map counts', 'Count with a map and return the first value whose count exceeds n/2.', 'O(n)', 'O(n)', `function majorityElement(nums) {
  const c = new Map();
  for (const x of nums) {
    c.set(x, (c.get(x) || 0) + 1);
    if (c.get(x) > nums.length / 2) return x;
  }
}`),
      A('Boyer-Moore voting', 'Keep a candidate and a counter: matching values add one, others subtract one. The majority survives all the cancelling.', 'O(n)', 'O(1)', `function majorityElement(nums) {
  let cand = null, count = 0;
  for (const x of nums) {
    if (count === 0) cand = x;
    count += x === cand ? 1 : -1;
  }
  return cand;
}`)
    ]
  }
];
