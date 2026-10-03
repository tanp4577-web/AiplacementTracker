const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'two-sum-2-sorted', title: 'Two Sum II - Input Array Is Sorted', d: 'M', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Given a 1-indexed array sorted in non-decreasing order, return the 1-based indices [i, j] (i < j) of the two numbers that add up to target. Exactly one solution exists. Aim for constant extra space.\n\nExample:\nInput: numbers = [2,7,11,15], target = 9\nOutput: [1,2]',
    fn: 'twoSumSorted', params: 'numbers, target', constraints: '2 ≤ n ≤ 3·10^4, sorted, exactly one solution',
    tests: [[[2, 7, 11, 15], 9], [[2, 3, 4], 6], [[-1, 0], -1], [[1, 2, 3, 4, 4, 9, 56, 90], 8], [[5, 25, 75], 100], [[1, 3, 5, 7, 9], 16]],
    gen: (r) => { for (;;) { const a = r.sorted(r.int(2, 9), -9, 20); const i = r.int(0, a.length - 2), j = r.int(i + 1, a.length - 1); const t = a[i] + a[j]; let c = 0; for (let x = 0; x < a.length; x++) for (let y = x + 1; y < a.length; y++) if (a[x] + a[y] === t) c++; if (c === 1) return [a, t]; } },
    approaches: [
      A('Brute force', 'Try every pair of positions and test whether the two values sum to the target.', 'O(n²)', 'O(1)', `function twoSumSorted(numbers, target) {
  for (let i = 0; i < numbers.length; i++)
    for (let j = i + 1; j < numbers.length; j++)
      if (numbers[i] + numbers[j] === target) return [i + 1, j + 1];
}`),
      A('Binary search for the complement', 'For each number binary-search the rest of the array for target - number.', 'O(n log n)', 'O(1)', `function twoSumSorted(numbers, target) {
  for (let i = 0; i < numbers.length; i++) {
    let lo = i + 1, hi = numbers.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, s = numbers[i] + numbers[mid];
      if (s === target) return [i + 1, mid + 1];
      if (s < target) lo = mid + 1; else hi = mid - 1;
    }
  }
}`),
      A('Two pointers', 'Start at both ends. If the sum is too small move the left pointer right, if too large move the right pointer left. The sorted order guarantees nothing is skipped.', 'O(n)', 'O(1)', `function twoSumSorted(numbers, target) {
  let l = 0, r = numbers.length - 1;
  while (l < r) {
    const s = numbers[l] + numbers[r];
    if (s === target) return [l + 1, r + 1];
    if (s < target) l++; else r--;
  }
}`)
    ]
  },
  {
    id: 'kth-largest', title: 'Kth Largest Element in an Array', d: 'M', topic: 'Heap', roles: ['SDE', 'Backend Developer'],
    desc: 'Return the k-th largest element of an unsorted array (the k-th in sorted order, not the k-th distinct value).\n\nExample:\nInput: nums = [3,2,1,5,6,4], k = 2\nOutput: 5',
    fn: 'findKthLargest', params: 'nums, k', constraints: '1 ≤ k ≤ n ≤ 10^5',
    tests: [[[3, 2, 1, 5, 6, 4], 2], [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], [[1], 1], [[2, 1], 2], [[5, 5, 5], 2], [[7, 6, 5, 4, 3, 2, 1], 5]],
    gen: (r) => { const n = r.int(1, 9); return [r.arr(n, -5, 9), r.int(1, n)]; },
    approaches: [
      A('Sort descending', 'Sort the array and read index k - 1.', 'O(n log n)', 'O(1)', `function findKthLargest(nums, k) {
  return [...nums].sort((a, b) => b - a)[k - 1];
}`),
      A('Min-heap of size k', 'Keep the k largest values in a min-heap. The heap root is the k-th largest. Good when k is small or the data is a stream.', 'O(n log k)', 'O(k)', `function findKthLargest(nums, k) {
  const h = [];
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const down = (i) => { for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < h.length && h[l] < h[m]) m = l; if (r < h.length && h[r] < h[m]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } };
  for (const x of nums) {
    if (h.length < k) { h.push(x); up(h.length - 1); }
    else if (x > h[0]) { h[0] = x; down(0); }
  }
  return h[0];
}`),
      A('Quickselect', 'Partition around a pivot like quicksort but only recurse into the side that contains the k-th element. Average linear time.', 'O(n)', 'O(1)', `function findKthLargest(nums, k) {
  const a = [...nums], target = a.length - k;
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    const pivot = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; }
    }
    if (target <= j) hi = j; else if (target >= i) lo = i; else return a[target];
  }
  return a[target];
}`, { note: 'Average O(n); a bad pivot sequence can degrade it to O(n²), which random pivots make unlikely.' })
    ]
  },
  {
    id: 'max-subarray-sum', title: "Maximum Subarray (Kadane's)", d: 'M', topic: 'Dynamic Programming', roles: ['SDE', 'Data Analyst'],
    desc: 'Find the contiguous subarray (at least one element) with the largest sum and return that sum.\n\nExample:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6 ([4,-1,2,1])',
    fn: 'maxSubArray', params: 'nums', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[1]], [[5, 4, -1, 7, 8]], [[-3, -1, -2]], [[0, 0, 0]], [[2, -5, 3, -1, 2]], [[-1]]],
    gen: (r) => [r.arr(r.int(1, 10), -6, 6)],
    approaches: [
      A('Every subarray', 'Compute the sum of every start/end pair.', 'O(n³)', 'O(1)', `function maxSubArray(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++)
    for (let j = i; j < nums.length; j++) {
      let s = 0;
      for (let k = i; k <= j; k++) s += nums[k];
      best = Math.max(best, s);
    }
  return best;
}`),
      A('Running sum per start', 'Extend each start index and keep a running sum, avoiding the inner re-sum.', 'O(n²)', 'O(1)', `function maxSubArray(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = i; j < nums.length; j++) { s += nums[j]; best = Math.max(best, s); }
  }
  return best;
}`),
      A("Kadane's algorithm", 'The best sum ending here is either the current number alone or the current number plus the best sum ending at the previous index. One pass.', 'O(n)', 'O(1)', `function maxSubArray(nums) {
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }
  return best;
}`),
      A('Divide and conquer', 'The best subarray lies in the left half, the right half, or crosses the middle. Solve the halves recursively and combine.', 'O(n log n)', 'O(log n)', `function maxSubArray(nums) {
  const go = (lo, hi) => {
    if (lo === hi) return nums[lo];
    const mid = (lo + hi) >> 1;
    let l = -Infinity, r = -Infinity, s = 0;
    for (let i = mid; i >= lo; i--) { s += nums[i]; l = Math.max(l, s); }
    s = 0;
    for (let i = mid + 1; i <= hi; i++) { s += nums[i]; r = Math.max(r, s); }
    return Math.max(go(lo, mid), go(mid + 1, hi), l + r);
  };
  return go(0, nums.length - 1);
}`)
    ]
  },
  {
    id: 'longest-substr-no-repeat', title: 'Longest Substring Without Repeating Characters', d: 'M', topic: 'Sliding Window', roles: ['SDE', 'Backend Developer'],
    desc: 'Return the length of the longest substring of s that contains no repeated character.\n\nExample:\nInput: s = "abcabcbb"\nOutput: 3 ("abc")',
    fn: 'lengthOfLongestSubstring', params: 's', constraints: '0 ≤ length ≤ 5·10^4',
    tests: [['abcabcbb'], ['bbbbb'], ['pwwkew'], [''], [' '], ['dvdf'], ['abba'], ['tmmzuxt']],
    gen: (r) => [r.str(r.int(0, 10), 'abcd')],
    approaches: [
      A('Check every substring', 'For each start and end test whether the substring has duplicates.', 'O(n³)', 'O(n)', `function lengthOfLongestSubstring(s) {
  let best = 0;
  for (let i = 0; i < s.length; i++)
    for (let j = i; j < s.length; j++) {
      const sub = s.slice(i, j + 1);
      if (new Set(sub).size === sub.length) best = Math.max(best, sub.length);
    }
  return best;
}`),
      A('Sliding window with a set', 'Grow the window on the right; when a duplicate appears shrink from the left until it is gone.', 'O(n)', 'O(k)', `function lengthOfLongestSubstring(s) {
  const seen = new Set();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    while (seen.has(s[r])) seen.delete(s[l++]);
    seen.add(s[r]);
    best = Math.max(best, r - l + 1);
  }
  return best;
}`, { note: 'k is the alphabet size.' }),
      A('Sliding window with last positions', 'Remember where each character was last seen and jump the left edge straight past a repeated character.', 'O(n)', 'O(k)', `function lengthOfLongestSubstring(s) {
  const last = new Map();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    if (last.has(s[r]) && last.get(s[r]) >= l) l = last.get(s[r]) + 1;
    last.set(s[r], r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}`)
    ]
  },
  {
    id: 'container-most-water', title: 'Container With Most Water', d: 'M', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'height[i] is the height of a vertical line at position i. Choose two lines that, with the x-axis, hold the most water. Return the maximum area.\n\nExample:\nInput: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49',
    fn: 'maxArea', params: 'height', constraints: '2 ≤ n ≤ 10^5',
    tests: [[[1, 8, 6, 2, 5, 4, 8, 3, 7]], [[1, 1]], [[4, 3, 2, 1, 4]], [[1, 2, 1]], [[2, 3, 4, 5, 18, 17, 6]], [[0, 0, 5]]],
    gen: (r) => [r.arr(r.int(2, 9), 0, 12)],
    approaches: [
      A('Every pair of lines', 'Compute the area for each pair.', 'O(n²)', 'O(1)', `function maxArea(height) {
  let best = 0;
  for (let i = 0; i < height.length; i++)
    for (let j = i + 1; j < height.length; j++)
      best = Math.max(best, Math.min(height[i], height[j]) * (j - i));
  return best;
}`),
      A('Two pointers moving the shorter line', 'Start with the widest container. The area is limited by the shorter line, so moving the taller one can never help; always move the shorter one inward.', 'O(n)', 'O(1)', `function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++; else r--;
  }
  return best;
}`)
    ]
  },
  {
    id: 'product-array-except-self', title: 'Product of Array Except Self', d: 'M', topic: 'Arrays', roles: ['SDE'],
    desc: 'Return an array answer where answer[i] is the product of every element except nums[i], without using division.\n\nExample:\nInput: nums = [1,2,3,4]\nOutput: [24,12,8,6]',
    fn: 'productExceptSelf', params: 'nums', constraints: '2 ≤ n ≤ 10^5',
    tests: [[[1, 2, 3, 4]], [[-1, 1, 0, -3, 3]], [[0, 0]], [[2, 3]], [[1, 1, 1]], [[5, 0, 2]], [[-2, 3, -4]]],
    gen: (r) => [r.arr(r.int(2, 7), -3, 3)],
    approaches: [
      A('Multiply the others for every index', 'For each i multiply all the other elements.', 'O(n²)', 'O(1)', `function productExceptSelf(nums) {
  return nums.map((_, i) => nums.reduce((p, x, j) => (j === i ? p : p * x), 1));
}`),
      A('Prefix and suffix arrays', 'answer[i] = (product of everything left of i) × (product of everything right of i). Build both products in two arrays.', 'O(n)', 'O(n)', `function productExceptSelf(nums) {
  const n = nums.length, pre = [1], suf = new Array(n + 1).fill(1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] * nums[i];
  for (let i = n - 1; i >= 0; i--) suf[i] = suf[i + 1] * nums[i];
  return nums.map((_, i) => pre[i] * suf[i + 1]);
}`),
      A('Prefix then suffix in the output array', 'Store prefix products directly in the answer, then multiply by a running suffix product on a second pass.', 'O(n)', 'O(1)', `function productExceptSelf(nums) {
  const n = nums.length, out = new Array(n).fill(1);
  for (let i = 1; i < n; i++) out[i] = out[i - 1] * nums[i - 1];
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { out[i] *= suffix; suffix *= nums[i]; }
  return out;
}`, { note: 'Extra space is O(1) if the output array is not counted.' })
    ]
  },
  {
    id: 'subarray-sum-equals-k', title: 'Subarray Sum Equals K', d: 'M', topic: 'Hashing', roles: ['SDE', 'Data Analyst'],
    desc: 'Return the number of contiguous subarrays whose sum equals k. Values can be negative.\n\nExample:\nInput: nums = [1,1,1], k = 2\nOutput: 2',
    fn: 'subarraySum', params: 'nums, k', constraints: '1 ≤ n ≤ 2·10^4',
    tests: [[[1, 1, 1], 2], [[1, 2, 3], 3], [[1], 0], [[0, 0, 0], 0], [[1, -1, 0], 0], [[3, 4, 7, 2, -3, 1, 4, 2], 7]],
    gen: (r) => [r.arr(r.int(1, 9), -3, 4), r.int(-2, 5)],
    approaches: [
      A('Every subarray', 'For each start extend the end and test the running sum.', 'O(n²)', 'O(1)', `function subarraySum(nums, k) {
  let c = 0;
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === k) c++; }
  }
  return c;
}`),
      A('Prefix sums with a hash map', 'A subarray ending here sums to k when an earlier prefix sum equals current - k. Count how many earlier prefix sums had that value.', 'O(n)', 'O(n)', `function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]);
  let s = 0, c = 0;
  for (const x of nums) { s += x; c += seen.get(s - k) || 0; seen.set(s, (seen.get(s) || 0) + 1); }
  return c;
}`, { note: 'The two-pointer window trick does not work here because negative numbers break monotonic sums.' })
    ]
  },
  {
    id: 'longest-consecutive-sequence', title: 'Longest Consecutive Sequence', d: 'M', topic: 'Hashing', roles: ['SDE'],
    desc: 'Given an unsorted array of integers, return the length of the longest run of consecutive values (like 1,2,3,4) that can be formed. Your solution should run in O(n) time.\n\nExample:\nInput: nums = [100,4,200,1,3,2]\nOutput: 4',
    fn: 'longestConsecutive', params: 'nums', constraints: '0 ≤ n ≤ 10^5',
    tests: [[[100, 4, 200, 1, 3, 2]], [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], [[]], [[5]], [[1, 2, 0, 1]], [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]]],
    gen: (r) => [r.arr(r.int(0, 10), -4, 8)],
    approaches: [
      A('Sort and scan', 'Sort, then count the length of each run of neighbours that differ by one.', 'O(n log n)', 'O(n)', `function longestConsecutive(nums) {
  const a = [...new Set(nums)].sort((x, y) => x - y);
  let best = 0, run = 0;
  for (let i = 0; i < a.length; i++) { run = i > 0 && a[i] === a[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}`),
      A('Hash set, start only at run beginnings', 'Put everything in a set. Only start counting at a number whose predecessor is missing, then walk forward. Each number is visited at most twice.', 'O(n)', 'O(n)', `function longestConsecutive(nums) {
  const s = new Set(nums);
  let best = 0;
  for (const x of s) {
    if (s.has(x - 1)) continue;
    let y = x;
    while (s.has(y + 1)) y++;
    best = Math.max(best, y - x + 1);
  }
  return best;
}`)
    ]
  },
  {
    id: 'sort-colors', title: 'Sort Colors (Dutch Flag)', d: 'M', topic: 'Sorting', roles: ['SDE'],
    desc: 'Sort an array containing only 0, 1 and 2 so equal values are adjacent, in the order 0, 1, 2, without using the library sort. Return the array.\n\nExample:\nInput: nums = [2,0,2,1,1,0]\nOutput: [0,0,1,1,2,2]',
    fn: 'sortColors', params: 'nums', constraints: '1 ≤ n ≤ 300',
    tests: [[[2, 0, 2, 1, 1, 0]], [[2, 0, 1]], [[0]], [[1, 1, 1]], [[2, 2, 0, 0, 1]], [[1, 0]]],
    gen: (r) => [r.arr(r.int(1, 10), 0, 2)],
    approaches: [
      A('Counting sort', 'Count how many 0s, 1s and 2s there are and rewrite the array. Two passes.', 'O(n)', 'O(1)', `function sortColors(nums) {
  const c = [0, 0, 0];
  for (const x of nums) c[x]++;
  return [...Array(c[0]).fill(0), ...Array(c[1]).fill(1), ...Array(c[2]).fill(2)];
}`),
      A('Bubble sort', 'Repeatedly swap neighbours that are out of order.', 'O(n²)', 'O(1)', `function sortColors(nums) {
  const a = [...nums];
  for (let i = 0; i < a.length; i++) for (let j = 0; j + 1 < a.length - i; j++) if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]];
  return a;
}`),
      A('Dutch national flag (one pass)', 'Keep three regions: zeros at the front, twos at the back, ones in the middle. Swap each element into its region with three pointers.', 'O(n)', 'O(1)', `function sortColors(nums) {
  const a = [...nums];
  let lo = 0, mid = 0, hi = a.length - 1;
  while (mid <= hi) {
    if (a[mid] === 0) { [a[lo], a[mid]] = [a[mid], a[lo]]; lo++; mid++; }
    else if (a[mid] === 1) mid++;
    else { [a[mid], a[hi]] = [a[hi], a[mid]]; hi--; }
  }
  return a;
}`)
    ]
  },
  {
    id: 'wiggle-sort', title: 'Wiggle Sort', d: 'M', topic: 'Sorting', roles: ['SDE'],
    desc: 'Reorder an array so that nums[0] <= nums[1] >= nums[2] <= nums[3] ... Return any valid arrangement. The tests check that the result is wiggly and still contains the same numbers.\n\nExample:\nInput: nums = [3,5,2,1,6,4]\nOutput: [3,5,1,6,2,4] (one valid answer)',
    fn: 'wiggleSort', params: 'nums', constraints: '1 ≤ n ≤ 5·10^4',
    expr: (a) => `(() => { const a = wiggleSort(${JSON.stringify(a)}); if (!Array.isArray(a)) return a; let ok = a.length === ${a.length}; for (let i = 0; i + 1 < a.length; i++) if (i % 2 === 0 ? !(a[i] <= a[i + 1]) : !(a[i] >= a[i + 1])) ok = false; return [ok, [...a].sort((x, y) => x - y)]; })()`,
    tests: [[[3, 5, 2, 1, 6, 4]], [[1, 2, 3, 4]], [[1]], [[2, 1]], [[5, 5, 5, 5]], [[9, 1, 8, 2, 7, 3, 6]], [[4, 3, 2, 1]]],
    gen: (r) => [r.arr(r.int(1, 10), 0, 9)],
    approaches: [
      A('Sort then swap pairs', 'Sort the array, then swap elements 1&2, 3&4, ... to create the zig-zag. Easy to reason about.', 'O(n log n)', 'O(n)', `function wiggleSort(nums) {
  const a = [...nums].sort((x, y) => x - y);
  for (let i = 1; i + 1 < a.length; i += 2) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  return a;
}`),
      A('Single pass with local fixes', 'Walk once. At each odd index the element must not be smaller than its neighbours; at each even index it must not be larger. Swap with the previous element when the rule is broken. Fixing one pair never breaks an earlier pair.', 'O(n)', 'O(1)', `function wiggleSort(nums) {
  const a = [...nums];
  for (let i = 1; i < a.length; i++) {
    if ((i % 2 === 1 && a[i] < a[i - 1]) || (i % 2 === 0 && a[i] > a[i - 1])) [a[i], a[i - 1]] = [a[i - 1], a[i]];
  }
  return a;
}`)
    ]
  },
  {
    id: 'jump-game', title: 'Jump Game', d: 'M', topic: 'Greedy', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'nums[i] is the maximum jump length from index i. Starting at index 0, return true if you can reach the last index.\n\nExample:\nInput: nums = [2,3,1,1,4]\nOutput: true',
    fn: 'canJump', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[2, 3, 1, 1, 4]], [[3, 2, 1, 0, 4]], [[0]], [[0, 1]], [[1, 0, 1]], [[2, 0, 0]], [[1, 1, 1, 1]], [[5, 0, 0, 0, 0, 0]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 4)],
    approaches: [
      A('Recursive backtracking', 'Try every possible jump length from each position and see whether any path reaches the end. Repeats a lot of work.', 'O(2ⁿ)', 'O(n)', `function canJump(nums) {
  const go = (i) => {
    if (i >= nums.length - 1) return true;
    for (let j = 1; j <= nums[i]; j++) if (go(i + j)) return true;
    return false;
  };
  return go(0);
}`),
      A('Dynamic programming (reachable table)', 'Mark positions reachable from index 0 by pushing forward from every reachable index.', 'O(n²)', 'O(n)', `function canJump(nums) {
  const ok = new Array(nums.length).fill(false);
  ok[0] = true;
  for (let i = 0; i < nums.length; i++) {
    if (!ok[i]) continue;
    for (let j = 1; j <= nums[i] && i + j < nums.length; j++) ok[i + j] = true;
  }
  return ok[nums.length - 1];
}`),
      A('Greedy: furthest reach', 'Track the furthest index reachable so far. If the scan ever stands on an index beyond that reach, the end is unreachable.', 'O(n)', 'O(1)', `function canJump(nums) {
  let far = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > far) return false;
    far = Math.max(far, i + nums[i]);
  }
  return true;
}`)
    ]
  },
  {
    id: 'k-closest-points', title: 'K Closest Points to Origin', d: 'M', topic: 'Heap', roles: ['SDE'], out: 'sortAll',
    desc: 'Return the k points closest to the origin (0, 0) by Euclidean distance. Any order is accepted (tests compare sorted). Distances in the tests are all different, so the answer is unique.\n\nExample:\nInput: points = [[1,3],[-2,2]], k = 1\nOutput: [[-2,2]]',
    fn: 'kClosest', params: 'points, k', constraints: '1 ≤ k ≤ n ≤ 10^4',
    tests: [[[[1, 3], [-2, 2]], 1], [[[3, 3], [5, -1], [-2, 4]], 2], [[[1, 0]], 1], [[[0, 1], [2, 2], [3, 3]], 3], [[[6, 8], [1, 1], [2, 3], [0, 4]], 2], [[[-5, 1], [4, 4], [2, 0]], 1]],
    gen: (r) => { const used = new Set(); const pts = []; while (pts.length < r.int(1, 7)) { const p = [r.int(-9, 9), r.int(-9, 9)]; const d = p[0] * p[0] + p[1] * p[1]; if (used.has(d)) continue; used.add(d); pts.push(p); if (pts.length >= 7) break; } return [pts, r.int(1, pts.length)]; },
    approaches: [
      A('Sort by distance', 'Sort all points by squared distance and take the first k.', 'O(n log n)', 'O(n)', `function kClosest(points, k) {
  return [...points].sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1])).slice(0, k);
}`),
      A('Max-heap of size k', 'Keep the k closest points seen so far in a max-heap keyed by distance; replace the root when a closer point arrives.', 'O(n log k)', 'O(k)', `function kClosest(points, k) {
  const d = (p) => p[0] * p[0] + p[1] * p[1];
  const h = [];
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (d(h[p]) >= d(h[i])) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const down = (i) => { for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < h.length && d(h[l]) > d(h[m])) m = l; if (r < h.length && d(h[r]) > d(h[m])) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } };
  for (const p of points) {
    if (h.length < k) { h.push(p); up(h.length - 1); }
    else if (d(p) < d(h[0])) { h[0] = p; down(0); }
  }
  return h;
}`),
      A('Quickselect', 'Partition the points around a pivot distance until the k closest are in front. Average linear time.', 'O(n)', 'O(1)', `function kClosest(points, k) {
  const a = [...points], d = (p) => p[0] * p[0] + p[1] * p[1];
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    const pv = d(a[(lo + hi) >> 1]);
    let i = lo, j = hi;
    while (i <= j) {
      while (d(a[i]) < pv) i++;
      while (d(a[j]) > pv) j--;
      if (i <= j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; }
    }
    if (k - 1 <= j) hi = j; else if (k - 1 >= i) lo = i; else break;
  }
  return a.slice(0, k);
}`, { note: 'Average O(n), worst case O(n²).' })
    ]
  },
  {
    id: 'top-k-frequent', title: 'Top K Frequent Elements', d: 'M', topic: 'Hashing', roles: ['SDE', 'Backend Developer'], out: 'sort',
    desc: 'Return the k most frequent elements. The answer is unique in the tests and any order is accepted (compared sorted).\n\nExample:\nInput: nums = [1,1,1,2,2,3], k = 2\nOutput: [1,2]',
    fn: 'topKFrequent', params: 'nums, k', constraints: '1 ≤ n ≤ 10^5, the answer is unique',
    tests: [[[1, 1, 1, 2, 2, 3], 2], [[1], 1], [[4, 4, 4, 5, 5, 6, 6, 6, 6], 2], [[3, 0, 1, 0], 1], [[-1, -1, 2, 2, 2, 3], 2], [[7, 7, 8, 8, 8, 9, 9, 9, 9, 1], 3]],
    gen: (r) => { for (;;) { const a = r.arr(r.int(1, 10), 0, 4); const c = {}; a.forEach((x) => { c[x] = (c[x] || 0) + 1; }); const f = Object.values(c).sort((x, y) => y - x); const k = r.int(1, f.length); if (k === f.length || f[k - 1] !== f[k]) return [a, k]; } },
    approaches: [
      A('Count and sort', 'Count each value, sort the distinct values by count, take the first k.', 'O(n log n)', 'O(n)', `function topKFrequent(nums, k) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map((e) => e[0]);
}`),
      A('Heap of size k', 'Maintain a min-heap of the k most frequent values.', 'O(n log k)', 'O(n)', `function topKFrequent(nums, k) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  const h = [];
  const less = (a, b) => a[1] < b[1];
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (!less(h[i], h[p])) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const down = (i) => { for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < h.length && less(h[l], h[m])) m = l; if (r < h.length && less(h[r], h[m])) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } };
  for (const e of c.entries()) {
    if (h.length < k) { h.push(e); up(h.length - 1); } else if (e[1] > h[0][1]) { h[0] = e; down(0); }
  }
  return h.map((e) => e[0]);
}`),
      A('Bucket sort by frequency', 'A value can occur at most n times, so make n buckets indexed by frequency and read from the highest bucket down.', 'O(n)', 'O(n)', `function topKFrequent(nums, k) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [v, f] of c) buckets[f].push(v);
  const out = [];
  for (let f = buckets.length - 1; f >= 0 && out.length < k; f--) out.push(...buckets[f]);
  return out.slice(0, k);
}`)
    ]
  },
  {
    id: 'group-anagrams', title: 'Group Anagrams', d: 'M', topic: 'Hashing', roles: ['SDE', 'Backend Developer'], out: 'sortRows',
    desc: 'Group the strings that are anagrams of each other. Groups and the strings inside them may be in any order (tests normalise them).\n\nExample:\nInput: strs = ["eat","tea","tan","ate","nat","bat"]\nOutput: [["bat"],["nat","tan"],["ate","eat","tea"]]',
    fn: 'groupAnagrams', params: 'strs', constraints: '1 ≤ n ≤ 10^4, lowercase letters',
    tests: [[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['zz', 'z']], [['a']], [['ab', 'ba', 'abc', 'cab', 'bca', 'x']], [['listen', 'silent', 'enlist', 'google', 'gogole']], [['abc', 'def']]],
    gen: (r) => [Array.from({ length: r.int(1, 6) }, () => r.str(r.int(0, 3), 'abc'))],
    approaches: [
      A('Compare every pair', 'Put each string in the first existing group whose representative is an anagram of it.', 'O(n²·k)', 'O(n·k)', `function groupAnagrams(strs) {
  const groups = [];
  const norm = (s) => s.split('').sort().join('');
  for (const s of strs) {
    const g = groups.find((x) => norm(x[0]) === norm(s));
    if (g) g.push(s); else groups.push([s]);
  }
  return groups;
}`),
      A('Sorted string as the key', 'Anagrams have the same letters when sorted, so use the sorted word as a map key.', 'O(n·k log k)', 'O(n·k)', `function groupAnagrams(strs) {
  const m = new Map();
  for (const s of strs) { const key = s.split('').sort().join(''); if (!m.has(key)) m.set(key, []); m.get(key).push(s); }
  return [...m.values()];
}`),
      A('Letter-count signature as the key', 'Build a 26-number count of the letters and use it as the key. Avoids sorting each word.', 'O(n·k)', 'O(n·k)', `function groupAnagrams(strs) {
  const m = new Map();
  for (const s of strs) {
    const c = new Array(26).fill(0);
    for (const ch of s) c[ch.charCodeAt(0) - 97]++;
    const key = c.join(',');
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(s);
  }
  return [...m.values()];
}`, { note: 'k is the average word length.' })
    ]
  },
  {
    id: 'daily-temperatures', title: 'Daily Temperatures', d: 'M', topic: 'Stacks', roles: ['SDE'],
    desc: 'For each day return how many days you must wait for a warmer temperature, or 0 if there is none.\n\nExample:\nInput: temperatures = [73,74,75,71,69,72,76,73]\nOutput: [1,1,4,2,1,1,0,0]',
    fn: 'dailyTemperatures', params: 'temperatures', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[73, 74, 75, 71, 69, 72, 76, 73]], [[30, 40, 50, 60]], [[30, 60, 90]], [[90, 80, 70]], [[50]], [[55, 55, 56, 54, 57]]],
    gen: (r) => [r.arr(r.int(1, 10), 30, 40)],
    approaches: [
      A('Scan forward for each day', 'For every day look ahead until a warmer day is found.', 'O(n²)', 'O(1)', `function dailyTemperatures(t) {
  return t.map((x, i) => { for (let j = i + 1; j < t.length; j++) if (t[j] > x) return j - i; return 0; });
}`),
      A('Monotonic decreasing stack', 'Keep a stack of days still waiting for a warmer day. When a warmer temperature arrives, pop every colder day and record the gap. Each day is pushed and popped once.', 'O(n)', 'O(n)', `function dailyTemperatures(t) {
  const out = new Array(t.length).fill(0), st = [];
  for (let i = 0; i < t.length; i++) {
    while (st.length && t[i] > t[st[st.length - 1]]) { const j = st.pop(); out[j] = i - j; }
    st.push(i);
  }
  return out;
}`),
      A('Jump ahead using answers already computed', 'Scan from the right; to find a warmer day for i, hop along the already known "next warmer" links instead of one day at a time.', 'O(n)', 'O(1)', `function dailyTemperatures(t) {
  const n = t.length, out = new Array(n).fill(0);
  for (let i = n - 2; i >= 0; i--) {
    let j = i + 1;
    while (j < n && t[j] <= t[i]) { if (out[j] === 0) { j = n; break; } j += out[j]; }
    if (j < n) out[i] = j - i;
  }
  return out;
}`, { note: 'O(1) extra space apart from the output.' })
    ]
  },
  {
    id: 'merge-intervals', title: 'Merge Intervals', d: 'M', topic: 'Intervals', roles: ['SDE', 'Backend Developer'],
    desc: 'Merge all overlapping intervals and return the non-overlapping intervals that cover the same ranges, sorted by start. Intervals that only touch (like [1,4] and [4,5]) are merged.\n\nExample:\nInput: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]',
    fn: 'merge', params: 'intervals', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[[1, 4], [4, 5]]], [[[1, 4], [0, 4]]], [[[1, 4], [2, 3]]], [[[5, 6]]], [[[1, 10], [2, 3], [4, 5], [11, 12]]], [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]]],
    gen: (r) => [Array.from({ length: r.int(1, 6) }, () => { const s = r.int(0, 15); return [s, s + r.int(0, 5)]; })],
    approaches: [
      A('Repeatedly merge any overlapping pair', 'Keep scanning the list for two intervals that overlap, merge them, and start again until none do.', 'O(n²)', 'O(n)', `function merge(intervals) {
  let a = intervals.map((x) => [...x]);
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      if (a[i][0] <= a[j][1] && a[j][0] <= a[i][1]) {
        a[i] = [Math.min(a[i][0], a[j][0]), Math.max(a[i][1], a[j][1])];
        a.splice(j, 1); changed = true; break outer;
      }
    }
  }
  return a.sort((x, y) => x[0] - y[0]);
}`),
      A('Sort by start then sweep', 'After sorting by start, an interval either overlaps the last merged one (extend it) or starts a new group.', 'O(n log n)', 'O(n)', `function merge(intervals) {
  const a = intervals.map((x) => [...x]).sort((x, y) => x[0] - y[0]);
  const out = [a[0]];
  for (let i = 1; i < a.length; i++) {
    const last = out[out.length - 1];
    if (a[i][0] <= last[1]) last[1] = Math.max(last[1], a[i][1]); else out.push(a[i]);
  }
  return out;
}`)
    ]
  },
  {
    id: 'insert-interval', title: 'Insert Interval', d: 'M', topic: 'Intervals', roles: ['SDE'],
    desc: 'Given a sorted list of non-overlapping intervals and a new interval, insert it and merge anything that overlaps. Return the resulting sorted list.\n\nExample:\nInput: intervals = [[1,3],[6,9]], newInterval = [2,5]\nOutput: [[1,5],[6,9]]',
    fn: 'insert', params: 'intervals, newInterval', constraints: '0 ≤ n ≤ 10^4',
    tests: [[[[1, 3], [6, 9]], [2, 5]], [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], [[], [5, 7]], [[[1, 5]], [2, 3]], [[[1, 5]], [6, 8]], [[[3, 5], [12, 15]], [6, 6]], [[[1, 5]], [0, 0]]],
    gen: (r) => { const n = r.int(0, 4); const iv = []; let at = r.int(0, 3); for (let i = 0; i < n; i++) { const s = at + r.int(1, 3); const e = s + r.int(0, 3); iv.push([s, e]); at = e + 1; } const s = r.int(0, 15); return [iv, [s, s + r.int(0, 6)]]; },
    approaches: [
      A('Append, sort and merge', 'Add the new interval, sort, and run the standard merge. Ignores that the input is already sorted.', 'O(n log n)', 'O(n)', `function insert(intervals, newInterval) {
  const a = [...intervals, newInterval].map((x) => [...x]).sort((x, y) => x[0] - y[0]);
  const out = [a[0]];
  for (let i = 1; i < a.length; i++) { const l = out[out.length - 1]; if (a[i][0] <= l[1]) l[1] = Math.max(l[1], a[i][1]); else out.push(a[i]); }
  return out;
}`),
      A('Three-phase linear scan', 'Copy intervals that end before the new one, merge the ones that overlap it, then copy the rest. One pass because the input is sorted.', 'O(n)', 'O(n)', `function insert(intervals, newInterval) {
  const out = [];
  let [s, e] = newInterval, i = 0;
  while (i < intervals.length && intervals[i][1] < s) out.push(intervals[i++]);
  while (i < intervals.length && intervals[i][0] <= e) { s = Math.min(s, intervals[i][0]); e = Math.max(e, intervals[i][1]); i++; }
  out.push([s, e]);
  while (i < intervals.length) out.push(intervals[i++]);
  return out;
}`)
    ]
  },
  {
    id: 'task-scheduler', title: 'Task Scheduler', d: 'M', topic: 'Greedy', roles: ['SDE'],
    desc: 'Tasks are labelled by letters. Each takes one unit of time, and two identical tasks must be at least n units apart (idle time is allowed). Return the least number of time units needed to finish all tasks.\n\nExample:\nInput: tasks = ["A","A","A","B","B","B"], n = 2\nOutput: 8',
    fn: 'leastInterval', params: 'tasks, n', constraints: '1 ≤ tasks ≤ 10^4, 0 ≤ n ≤ 100',
    tests: [[['A', 'A', 'A', 'B', 'B', 'B'], 2], [['A', 'A', 'A', 'B', 'B', 'B'], 0], [['A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], 2], [['A'], 5], [['A', 'B', 'C'], 1], [['A', 'A', 'B', 'B'], 3]],
    gen: (r) => [Array.from({ length: r.int(1, 8) }, () => r.pick(['A', 'B', 'C'])), r.int(0, 3)],
    approaches: [
      A('Simulate every time slot', 'Each time unit pick the available task type with the most remaining copies that is off cooldown, otherwise stay idle.', 'O(T)', 'O(1)', `function leastInterval(tasks, n) {
  const cnt = {};
  for (const t of tasks) cnt[t] = (cnt[t] || 0) + 1;
  const last = {};
  let time = 0, left = tasks.length;
  while (left > 0) {
    let best = null;
    for (const t of Object.keys(cnt)) {
      if (cnt[t] > 0 && (last[t] === undefined || time - last[t] > n) && (best === null || cnt[t] > cnt[best])) best = t;
    }
    if (best !== null) { cnt[best]--; last[best] = time; left--; }
    time++;
  }
  return time;
}`, { note: 'T is the answer (the number of time slots); each slot looks at up to 26 task types, a constant.' }),
      A('Formula from the most frequent task', 'The most frequent task forces (max - 1) full cycles of length n + 1, plus a final row holding every task tied for the maximum. The answer is never below the number of tasks.', 'O(n)', 'O(1)', `function leastInterval(tasks, n) {
  const cnt = {};
  for (const t of tasks) cnt[t] = (cnt[t] || 0) + 1;
  const max = Math.max(...Object.values(cnt));
  const ties = Object.values(cnt).filter((c) => c === max).length;
  return Math.max(tasks.length, (max - 1) * (n + 1) + ties);
}`)
    ]
  }
];
