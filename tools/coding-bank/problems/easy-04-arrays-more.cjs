const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'remove-element', title: 'Remove Element', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Remove every occurrence of the value val from nums and return the remaining elements in their original order.\n\nExample:\nInput: nums = [3,2,2,3], val = 3\nOutput: [2,2]',
    fn: 'removeElement', params: 'nums, val', constraints: '0 ≤ n ≤ 100',
    tests: [[[3, 2, 2, 3], 3], [[0, 1, 2, 2, 3, 0, 4, 2], 2], [[], 1], [[1], 1], [[1, 2, 3], 4], [[4, 4, 4], 4]],
    gen: (r) => [r.arr(r.int(0, 8), 0, 3), r.int(0, 3)],
    approaches: [
      A('Filter into a new array', 'Keep every element that is not val.', 'O(n)', 'O(n)', `function removeElement(nums, val) {
  return nums.filter((x) => x !== val);
}`),
      A('Overwrite in place', 'Keep a write index; copy each element that is not val to it. The first k cells hold the answer.', 'O(n)', 'O(1)', `function removeElement(nums, val) {
  const a = [...nums];
  let k = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== val) a[k++] = a[i];
  return a.slice(0, k);
}`),
      A('Splice repeatedly', 'Find each occurrence and remove it with splice, which shifts all later elements.', 'O(n²)', 'O(1)', `function removeElement(nums, val) {
  const a = [...nums];
  for (let i = a.length - 1; i >= 0; i--) if (a[i] === val) a.splice(i, 1);
  return a;
}`, { note: 'Each splice moves the tail of the array, so many removals add up to quadratic work.' })
    ]
  },
  {
    id: 'squares-sorted-array', title: 'Squares of a Sorted Array', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Given an integer array sorted in non-decreasing order, return an array of the squares of each number, also sorted in non-decreasing order.\n\nExample:\nInput: nums = [-4,-1,0,3,10]\nOutput: [0,1,9,16,100]',
    fn: 'sortedSquares', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[-4, -1, 0, 3, 10]], [[-7, -3, 2, 3, 11]], [[1, 2, 3]], [[-3, -2, -1]], [[0]], [[-1, 1]]],
    gen: (r) => [r.sorted(r.int(1, 8), -9, 9)],
    approaches: [
      A('Square then sort', 'Square every value and sort the result.', 'O(n log n)', 'O(n)', `function sortedSquares(nums) {
  return nums.map((x) => x * x).sort((a, b) => a - b);
}`),
      A('Two pointers from the ends', 'The largest square is at one of the two ends. Compare the ends, write the larger square at the back of the result, and move inward.', 'O(n)', 'O(n)', `function sortedSquares(nums) {
  const out = new Array(nums.length);
  let l = 0, r = nums.length - 1;
  for (let k = nums.length - 1; k >= 0; k--) {
    if (Math.abs(nums[l]) > Math.abs(nums[r])) out[k] = nums[l] * nums[l++];
    else out[k] = nums[r] * nums[r--];
  }
  return out;
}`)
    ]
  },
  {
    id: 'third-maximum-number', title: 'Third Maximum Number', d: 'E', topic: 'Arrays', roles: ['SDE'],
    desc: 'Return the third largest distinct number in the array. If there are fewer than three distinct numbers, return the maximum.\n\nExample:\nInput: nums = [2,2,3,1]\nOutput: 1',
    fn: 'thirdMax', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[3, 2, 1]], [[1, 2]], [[2, 2, 3, 1]], [[1, 1, 2]], [[5, 5, 5]], [[1, 2, -2147483648]], [[4, 9, 7, 1, 8]]],
    gen: (r) => [r.arr(r.int(1, 8), -4, 6)],
    approaches: [
      A('Sort the distinct values', 'Take the distinct values, sort them descending, and read the third one if it exists.', 'O(n log n)', 'O(n)', `function thirdMax(nums) {
  const u = [...new Set(nums)].sort((a, b) => b - a);
  return u.length >= 3 ? u[2] : u[0];
}`),
      A('Track the top three', 'Keep the three largest distinct values seen so far while scanning once.', 'O(n)', 'O(1)', `function thirdMax(nums) {
  let a = -Infinity, b = -Infinity, c = -Infinity;
  for (const x of nums) {
    if (x === a || x === b || x === c) continue;
    if (x > a) { c = b; b = a; a = x; }
    else if (x > b) { c = b; b = x; }
    else if (x > c) c = x;
  }
  return c === -Infinity ? a : c;
}`)
    ]
  },
  {
    id: 'find-disappeared-numbers', title: 'Find All Numbers Disappeared in an Array', d: 'E', topic: 'Arrays', roles: ['SDE'],
    desc: 'Given an array of n integers where each is between 1 and n, return all the integers in [1, n] that do not appear in the array, in increasing order.\n\nExample:\nInput: nums = [4,3,2,7,8,2,3,1]\nOutput: [5,6]',
    fn: 'findDisappearedNumbers', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[4, 3, 2, 7, 8, 2, 3, 1]], [[1, 1]], [[1]], [[2, 2]], [[1, 2, 3]], [[3, 3, 3]]],
    gen: (r) => { const n = r.int(1, 8); return [r.arr(n, 1, n)]; },
    approaches: [
      A('Check each number', 'For each value 1..n search the array for it.', 'O(n²)', 'O(1)', `function findDisappearedNumbers(nums) {
  const out = [];
  for (let v = 1; v <= nums.length; v++) if (!nums.includes(v)) out.push(v);
  return out;
}`),
      A('Hash set', 'Put the values in a set and list the numbers 1..n that are not in it.', 'O(n)', 'O(n)', `function findDisappearedNumbers(nums) {
  const s = new Set(nums), out = [];
  for (let v = 1; v <= nums.length; v++) if (!s.has(v)) out.push(v);
  return out;
}`),
      A('Mark by negating (in place)', 'Use the array itself as the set: for each value, negate the entry at that index. Indices that stay positive are missing.', 'O(n)', 'O(1)', `function findDisappearedNumbers(nums) {
  const a = [...nums];
  for (const x of nums) { const i = Math.abs(x) - 1; if (a[i] > 0) a[i] = -a[i]; }
  const out = [];
  for (let i = 0; i < a.length; i++) if (a[i] > 0) out.push(i + 1);
  return out;
}`, { note: 'Extra space is O(1) apart from the output when the input array may be modified.' })
    ]
  },
  {
    id: 'pascals-triangle', title: "Pascal's Triangle", d: 'E', topic: 'Dynamic Programming', roles: ['SDE'],
    desc: 'Return the first numRows rows of Pascal\'s triangle. Each number is the sum of the two numbers above it.\n\nExample:\nInput: numRows = 5\nOutput: [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]',
    fn: 'generate', params: 'numRows', constraints: '1 ≤ numRows ≤ 30',
    tests: [[1], [2], [3], [5], [6], [10]],
    gen: (r) => [r.int(1, 9)],
    approaches: [
      A('Binomial coefficients', 'The k-th entry of row n is C(n, k). Compute each with a multiplicative formula.', 'O(n²)', 'O(1)', `function generate(numRows) {
  const out = [];
  for (let n = 0; n < numRows; n++) {
    const row = [1];
    for (let k = 1; k <= n; k++) row.push(Math.round(row[k - 1] * (n - k + 1) / k));
    out.push(row);
  }
  return out;
}`, { note: 'Extra space is O(1) beyond the output itself.' }),
      A('Build from the previous row', 'Each interior value is the sum of the two values above it.', 'O(n²)', 'O(1)', `function generate(numRows) {
  const out = [[1]];
  for (let i = 1; i < numRows; i++) {
    const prev = out[i - 1], row = [1];
    for (let j = 1; j < i; j++) row.push(prev[j - 1] + prev[j]);
    row.push(1);
    out.push(row);
  }
  return out;
}`)
    ]
  },
  {
    id: 'can-place-flowers', title: 'Can Place Flowers', d: 'E', topic: 'Greedy', roles: ['SDE'],
    desc: 'A flowerbed is an array of 0 (empty) and 1 (planted). Flowers cannot be planted in adjacent plots. Return true if n new flowers can be planted without breaking that rule.\n\nExample:\nInput: flowerbed = [1,0,0,0,1], n = 1\nOutput: true',
    fn: 'canPlaceFlowers', params: 'flowerbed, n', constraints: '1 ≤ length ≤ 2·10^4',
    tests: [[[1, 0, 0, 0, 1], 1], [[1, 0, 0, 0, 1], 2], [[0], 1], [[0, 0, 0, 0, 0], 3], [[1], 0], [[0, 1, 0], 1], [[0, 0, 1, 0, 0], 2]],
    gen: (r) => { const len = r.int(1, 8); const a = []; for (let i = 0; i < len; i++) a.push(i > 0 && a[i - 1] === 1 ? 0 : r.int(0, 1)); return [a, r.int(0, 4)]; },
    approaches: [
      A('Count with neighbours checked', 'For each empty plot whose neighbours are both empty (or out of range), plant a flower and count it.', 'O(n)', 'O(n)', `function canPlaceFlowers(flowerbed, n) {
  const a = [...flowerbed];
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0 && (i === 0 || a[i - 1] === 0) && (i === a.length - 1 || a[i + 1] === 0)) { a[i] = 1; c++; }
  }
  return c >= n;
}`),
      A('Count gaps of zeros', 'A run of z zeros between two flowers fits floor((z - 1) / 2) new ones; pad both ends with a virtual 0 so edges follow the same rule.', 'O(n)', 'O(1)', `function canPlaceFlowers(flowerbed, n) {
  let c = 0, zeros = 1;
  for (const x of flowerbed) {
    if (x === 0) zeros++;
    else { c += Math.max(0, Math.floor((zeros - 1) / 2)); zeros = 0; }
  }
  zeros++;
  c += Math.max(0, Math.floor((zeros - 1) / 2));
  return c >= n;
}`)
    ]
  },
  {
    id: 'running-sum', title: 'Running Sum of 1d Array', d: 'E', topic: 'Arrays', roles: ['SDE', 'Data Analyst'],
    desc: 'Return the running sum of an array: result[i] = nums[0] + nums[1] + ... + nums[i].\n\nExample:\nInput: nums = [1,2,3,4]\nOutput: [1,3,6,10]',
    fn: 'runningSum', params: 'nums', constraints: '1 ≤ n ≤ 1000',
    tests: [[[1, 2, 3, 4]], [[1, 1, 1, 1, 1]], [[3, 1, 2, 10, 1]], [[5]], [[-1, 1, -1]], [[0, 0]]],
    gen: (r) => [r.arr(r.int(1, 8), -5, 9)],
    approaches: [
      A('Re-add from the start each time', 'For every index add all earlier values again.', 'O(n²)', 'O(n)', `function runningSum(nums) {
  return nums.map((_, i) => nums.slice(0, i + 1).reduce((a, b) => a + b, 0));
}`),
      A('Prefix sums', 'Each result is the previous result plus the current number, so one pass is enough.', 'O(n)', 'O(n)', `function runningSum(nums) {
  const out = [];
  let s = 0;
  for (const x of nums) out.push((s += x));
  return out;
}`)
    ]
  },
  {
    id: 'number-of-good-pairs', title: 'Number of Good Pairs', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'A pair (i, j) is good if nums[i] == nums[j] and i < j. Return the number of good pairs.\n\nExample:\nInput: nums = [1,2,3,1,1,3]\nOutput: 4',
    fn: 'numIdenticalPairs', params: 'nums', constraints: '1 ≤ n ≤ 100',
    tests: [[[1, 2, 3, 1, 1, 3]], [[1, 1, 1, 1]], [[1, 2, 3]], [[5]], [[2, 2]], [[1, 2, 1, 2, 1]]],
    gen: (r) => [r.arr(r.int(1, 10), 1, 4)],
    approaches: [
      A('Check every pair', 'Compare each element with every later element.', 'O(n²)', 'O(1)', `function numIdenticalPairs(nums) {
  let c = 0;
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] === nums[j]) c++;
  return c;
}`),
      A('Count as you go', 'When a value is seen again, it forms one new pair with each earlier copy, so add the running count of that value.', 'O(n)', 'O(n)', `function numIdenticalPairs(nums) {
  const seen = new Map();
  let c = 0;
  for (const x of nums) { c += seen.get(x) || 0; seen.set(x, (seen.get(x) || 0) + 1); }
  return c;
}`),
      A('Combinations per value', 'A value that appears f times contributes f(f-1)/2 pairs.', 'O(n)', 'O(n)', `function numIdenticalPairs(nums) {
  const f = new Map();
  for (const x of nums) f.set(x, (f.get(x) || 0) + 1);
  let c = 0;
  for (const v of f.values()) c += (v * (v - 1)) / 2;
  return c;
}`)
    ]
  },
  {
    id: 'sort-array-by-parity', title: 'Sort Array By Parity', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Move all even integers to the front of the array and all odd integers to the back, keeping the relative order inside each group.\n\nExample:\nInput: nums = [3,1,2,4]\nOutput: [2,4,3,1]',
    fn: 'sortArrayByParity', params: 'nums', constraints: '1 ≤ n ≤ 5000',
    tests: [[[3, 1, 2, 4]], [[0]], [[1, 3, 5]], [[2, 4]], [[1, 2, 3, 4, 5, 6]], [[5, 4, 3, 2, 1]]],
    gen: (r) => [r.arr(r.int(1, 8), 0, 9)],
    approaches: [
      A('Two filters', 'Take the evens, then the odds, and concatenate. Stable by construction.', 'O(n)', 'O(n)', `function sortArrayByParity(nums) {
  return [...nums.filter((x) => x % 2 === 0), ...nums.filter((x) => x % 2 !== 0)];
}`),
      A('Stable sort by parity', 'Sort with a comparator that puts even numbers first. JavaScript\'s sort is stable, so each group keeps its order.', 'O(n log n)', 'O(n)', `function sortArrayByParity(nums) {
  return [...nums].sort((a, b) => (a % 2) - (b % 2));
}`),
      A('Single pass with two buckets', 'Push each value into the even or the odd bucket as you scan.', 'O(n)', 'O(n)', `function sortArrayByParity(nums) {
  const e = [], o = [];
  for (const x of nums) (x % 2 === 0 ? e : o).push(x);
  return e.concat(o);
}`)
    ]
  },
  {
    id: 'monotonic-array', title: 'Monotonic Array', d: 'E', topic: 'Arrays', roles: ['SDE'],
    desc: 'An array is monotonic if it is entirely non-increasing or entirely non-decreasing. Return true if nums is monotonic.\n\nExample:\nInput: nums = [1,2,2,3]\nOutput: true',
    fn: 'isMonotonic', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[1, 2, 2, 3]], [[6, 5, 4, 4]], [[1, 3, 2]], [[1]], [[2, 2, 2]], [[1, 2, 3, 2]], [[3, 2, 1, 2]]],
    gen: (r) => [r.arr(r.int(1, 7), 0, 4)],
    approaches: [
      A('Compare with sorted copies', 'The array is monotonic if it equals its ascending or descending sorted version.', 'O(n log n)', 'O(n)', `function isMonotonic(nums) {
  const up = [...nums].sort((a, b) => a - b), down = [...nums].sort((a, b) => b - a);
  return nums.every((x, i) => x === up[i]) || nums.every((x, i) => x === down[i]);
}`),
      A('Two flags in one pass', 'Track whether we have seen an increase and whether we have seen a decrease. Seeing both breaks monotonicity.', 'O(n)', 'O(1)', `function isMonotonic(nums) {
  let inc = false, dec = false;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i - 1]) inc = true;
    if (nums[i] < nums[i - 1]) dec = true;
  }
  return !(inc && dec);
}`)
    ]
  },
  {
    id: 'contains-duplicate-ii', title: 'Contains Duplicate II', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Return true if there are two distinct indices i and j with nums[i] == nums[j] and |i - j| ≤ k.\n\nExample:\nInput: nums = [1,2,3,1], k = 3\nOutput: true',
    fn: 'containsNearbyDuplicate', params: 'nums, k', constraints: '1 ≤ n ≤ 10^5, 0 ≤ k ≤ 10^5',
    tests: [[[1, 2, 3, 1], 3], [[1, 0, 1, 1], 1], [[1, 2, 3, 1, 2, 3], 2], [[1], 1], [[1, 1], 0], [[99, 99], 2]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 4), r.int(0, 4)],
    approaches: [
      A('Look ahead up to k positions', 'For each index compare with the next k elements.', 'O(n·k)', 'O(1)', `function containsNearbyDuplicate(nums, k) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j <= Math.min(i + k, nums.length - 1); j++)
      if (nums[i] === nums[j]) return true;
  return false;
}`),
      A('Last-seen index map', 'Store the last index of each value; a repeat within distance k is an answer.', 'O(n)', 'O(n)', `function containsNearbyDuplicate(nums, k) {
  const last = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (last.has(nums[i]) && i - last.get(nums[i]) <= k) return true;
    last.set(nums[i], i);
  }
  return false;
}`),
      A('Sliding window set', 'Keep a set of the last k values. The set never holds more than k elements.', 'O(n)', 'O(k)', `function containsNearbyDuplicate(nums, k) {
  const w = new Set();
  for (let i = 0; i < nums.length; i++) {
    if (w.has(nums[i])) return true;
    w.add(nums[i]);
    if (w.size > k) w.delete(nums[i - k]);
  }
  return false;
}`)
    ]
  },
  {
    id: 'find-pivot-index', title: 'Find Pivot Index', d: 'E', topic: 'Arrays', roles: ['SDE'],
    desc: 'The pivot index is the index where the sum of all numbers strictly to the left equals the sum of all numbers strictly to the right. Return the leftmost pivot index, or -1 if none exists.\n\nExample:\nInput: nums = [1,7,3,6,5,6]\nOutput: 3',
    fn: 'pivotIndex', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[1, 7, 3, 6, 5, 6]], [[1, 2, 3]], [[2, 1, -1]], [[0]], [[1, -1, 0]], [[-1, -1, 0, 1, 1, 0]]],
    gen: (r) => [r.arr(r.int(1, 8), -3, 3)],
    approaches: [
      A('Sum both sides at every index', 'For each index add up the elements on each side.', 'O(n²)', 'O(1)', `function pivotIndex(nums) {
  for (let i = 0; i < nums.length; i++) {
    let l = 0, r = 0;
    for (let j = 0; j < i; j++) l += nums[j];
    for (let j = i + 1; j < nums.length; j++) r += nums[j];
    if (l === r) return i;
  }
  return -1;
}`),
      A('Prefix sums with the total', 'Know the total sum. At index i the right sum is total - left - nums[i], so one pass is enough.', 'O(n)', 'O(1)', `function pivotIndex(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  let left = 0;
  for (let i = 0; i < nums.length; i++) {
    if (left === total - left - nums[i]) return i;
    left += nums[i];
  }
  return -1;
}`)
    ]
  },
  {
    id: 'unique-occurrences', title: 'Unique Number of Occurrences', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Return true if the number of occurrences of each value in the array is unique (no two values occur the same number of times).\n\nExample:\nInput: arr = [1,2,2,1,1,3]\nOutput: true (1 appears 3 times, 2 twice, 3 once)',
    fn: 'uniqueOccurrences', params: 'arr', constraints: '1 ≤ n ≤ 1000',
    tests: [[[1, 2, 2, 1, 1, 3]], [[1, 2]], [[-3, 0, 1, -3, 1, 1, 1, -3, 10, 0]], [[5]], [[1, 1, 2, 2]], [[4, 4, 4, 5, 5, 6]]],
    gen: (r) => [r.arr(r.int(1, 10), 0, 3)],
    approaches: [
      A('Count then check duplicates in a list', 'Count each value, then look for two counts that are equal by comparing every pair.', 'O(n²)', 'O(n)', `function uniqueOccurrences(arr) {
  const c = {};
  for (const x of arr) c[x] = (c[x] || 0) + 1;
  const v = Object.values(c);
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] === v[j]) return false;
  return true;
}`),
      A('Count then compare with a set', 'The counts are unique exactly when putting them in a set loses none.', 'O(n)', 'O(n)', `function uniqueOccurrences(arr) {
  const c = new Map();
  for (const x of arr) c.set(x, (c.get(x) || 0) + 1);
  return new Set(c.values()).size === c.size;
}`)
    ]
  },
  {
    id: 'jewels-and-stones', title: 'Jewels and Stones', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'The string jewels lists the types of stones that are jewels, and stones lists the stones you have. Return how many of your stones are jewels. Letters are case sensitive.\n\nExample:\nInput: jewels = "aA", stones = "aAAbbbb"\nOutput: 3',
    fn: 'numJewelsInStones', params: 'jewels, stones', constraints: '1 ≤ length ≤ 50',
    tests: [['aA', 'aAAbbbb'], ['z', 'ZZ'], ['abc', 'aabbccd'], ['a', 'a'], ['xyz', ''], ['Ab', 'bBAAab']],
    gen: (r) => [r.str(r.int(1, 3), 'aAbB'), r.str(r.int(0, 8), 'aAbBc')],
    approaches: [
      A('Nested loops', 'For each stone scan the jewel string.', 'O(n·m)', 'O(1)', `function numJewelsInStones(jewels, stones) {
  let c = 0;
  for (const s of stones) if (jewels.includes(s)) c++;
  return c;
}`),
      A('Set of jewels', 'Put the jewel types in a set, then count stones that are members. Each lookup is constant time.', 'O(n + m)', 'O(n)', `function numJewelsInStones(jewels, stones) {
  const j = new Set(jewels);
  let c = 0;
  for (const s of stones) if (j.has(s)) c++;
  return c;
}`)
    ]
  },
  {
    id: 'find-the-difference', title: 'Find the Difference', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'String t is string s shuffled with exactly one extra letter added somewhere. Return the extra letter.\n\nExample:\nInput: s = "abcd", t = "abcde"\nOutput: "e"',
    fn: 'findTheDifference', params: 's, t', constraints: '0 ≤ |s| ≤ 1000',
    tests: [['abcd', 'abcde'], ['', 'y'], ['a', 'aa'], ['ae', 'aea'], ['xyz', 'zyxw'], ['aab', 'baac']],
    gen: (r) => { const s = r.str(r.int(0, 6), 'abc'); const extra = r.pick(['a', 'b', 'c', 'd']); const arr = (s + extra).split('').sort(() => r.next() - 0.5); return [s, arr.join('')]; },
    approaches: [
      A('Count letters', 'Count the letters of s, then the first letter of t that has no count left is the extra one.', 'O(n)', 'O(1)', `function findTheDifference(s, t) {
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  for (const ch of t) { if (!c[ch]) return ch; c[ch]--; }
}`),
      A('Sum of character codes', 'The extra letter\'s code equals the sum of codes in t minus the sum in s.', 'O(n)', 'O(1)', `function findTheDifference(s, t) {
  let d = 0;
  for (const ch of t) d += ch.charCodeAt(0);
  for (const ch of s) d -= ch.charCodeAt(0);
  return String.fromCharCode(d);
}`),
      A('XOR of all characters', 'XOR every character of both strings. Matching letters cancel and the extra letter is left.', 'O(n)', 'O(1)', `function findTheDifference(s, t) {
  let x = 0;
  for (const ch of s + t) x ^= ch.charCodeAt(0);
  return String.fromCharCode(x);
}`)
    ]
  },
  {
    id: 'search-insert-position', title: 'Search Insert Position', d: 'E', topic: 'Searching', roles: ['SDE'],
    desc: 'Given a sorted array of distinct integers and a target, return the index of the target if present, otherwise the index where it would be inserted to keep the array sorted.\n\nExample:\nInput: nums = [1,3,5,6], target = 2\nOutput: 1',
    fn: 'searchInsert', params: 'nums, target', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[1, 3, 5, 6], 5], [[1, 3, 5, 6], 2], [[1, 3, 5, 6], 7], [[1, 3, 5, 6], 0], [[1], 1], [[1], 2], [[2, 4, 6, 8, 10], 9]],
    gen: (r) => [r.uniq(r.int(1, 8), -5, 15).sort((a, b) => a - b), r.int(-6, 16)],
    approaches: [
      A('Linear scan', 'Return the first index whose value is at least the target.', 'O(n)', 'O(1)', `function searchInsert(nums, target) {
  for (let i = 0; i < nums.length; i++) if (nums[i] >= target) return i;
  return nums.length;
}`),
      A('Binary search for the lower bound', 'Find the first position whose value is not less than the target by halving the range.', 'O(log n)', 'O(1)', `function searchInsert(nums, target) {
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1; else hi = mid;
  }
  return lo;
}`)
    ]
  },
  {
    id: 'house-robber', title: 'House Robber', d: 'E', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 20, 25, 30, 35],
    desc: 'Houses along a street hold nums[i] money each. You cannot rob two adjacent houses. Return the maximum amount you can rob.\n\nExample:\nInput: nums = [2,7,9,3,1]\nOutput: 12 (houses 1, 3 and 5)',
    fn: 'rob', params: 'nums', constraints: '1 ≤ n ≤ 100',
    tests: [[[1, 2, 3, 1]], [[2, 7, 9, 3, 1]], [[5]], [[2, 1]], [[2, 1, 1, 2]], [[0, 0, 0]], [[6, 7, 1, 30, 8, 2, 4]]],
    gen: (r) => [r.arr(r.int(1, 11), 0, 9)],
    approaches: [
      A('Recursion (rob or skip)', 'At house i either rob it and jump to i+2, or skip it and go to i+1. Takes the better of the two. Recomputes the same states many times.', 'O(2ⁿ)', 'O(n)', `function rob(nums) {
  const go = (i) => (i >= nums.length ? 0 : Math.max(nums[i] + go(i + 2), go(i + 1)));
  return go(0);
}`),
      A('Dynamic programming table', 'best[i] = max(best[i-1], best[i-2] + nums[i]).', 'O(n)', 'O(n)', `function rob(nums) {
  const best = [0, nums[0]];
  for (let i = 1; i < nums.length; i++) best[i + 1] = Math.max(best[i], best[i - 1] + nums[i]);
  return best[nums.length];
}`),
      A('Two rolling variables', 'Only the previous two values of the table are needed.', 'O(n)', 'O(1)', `function rob(nums) {
  let prev = 0, cur = 0;
  for (const x of nums) [prev, cur] = [cur, Math.max(cur, prev + x)];
  return cur;
}`)
    ]
  }
];
