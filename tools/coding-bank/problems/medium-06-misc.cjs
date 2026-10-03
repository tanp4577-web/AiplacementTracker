const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'evaluate-rpn', title: 'Evaluate Reverse Polish Notation', d: 'M', topic: 'Stacks', roles: ['SDE'],
    desc: 'Evaluate an arithmetic expression in Reverse Polish Notation. Valid operators are +, -, * and /. Division truncates toward zero. The expression is always valid.\n\nExample:\nInput: tokens = ["2","1","+","3","*"]\nOutput: 9',
    fn: 'evalRPN', params: 'tokens', constraints: '1 ≤ tokens ≤ 10^4',
    tests: [[['2', '1', '+', '3', '*']], [['4', '13', '5', '/', '+']], [['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']], [['3']], [['7', '2', '/']], [['-7', '2', '/']], [['3', '4', '-']]],
    gen: (r) => { const t = [String(r.int(-5, 9))]; for (let i = 0; i < r.int(0, 4); i++) { t.push(String(r.int(1, 9)), r.pick(['+', '-', '*'])); } return [t]; },
    approaches: [
      A('Rewrite the string repeatedly', 'Find the first operator with two numbers before it, replace the three tokens by the result, and repeat.', 'O(n²)', 'O(n)', `function evalRPN(tokens) {
  const t = [...tokens], ops = new Set(['+', '-', '*', '/']);
  while (t.length > 1) {
    const i = t.findIndex((x) => ops.has(x));
    const a = Number(t[i - 2]), b = Number(t[i - 1]);
    const r = t[i] === '+' ? a + b : t[i] === '-' ? a - b : t[i] === '*' ? a * b : Math.trunc(a / b);
    t.splice(i - 2, 3, String(r));
  }
  return Number(t[0]);
}`),
      A('Stack', 'Push numbers. On an operator pop two operands, apply it, and push the result. The answer is the last value on the stack.', 'O(n)', 'O(n)', `function evalRPN(tokens) {
  const st = [];
  for (const x of tokens) {
    if (['+', '-', '*', '/'].includes(x)) {
      const b = st.pop(), a = st.pop();
      st.push(x === '+' ? a + b : x === '-' ? a - b : x === '*' ? a * b : Math.trunc(a / b));
    } else st.push(Number(x));
  }
  return st[0];
}`)
    ]
  },
  {
    id: 'asteroid-collision', title: 'Asteroid Collision', d: 'M', topic: 'Stacks', roles: ['SDE'],
    desc: 'Asteroids move along a line. The sign gives the direction (positive = right, negative = left) and the absolute value is the size. All move at the same speed. When two collide the smaller one explodes; equal sizes both explode. Asteroids moving the same way never meet. Return the state after all collisions.\n\nExample:\nInput: asteroids = [5,10,-5]\nOutput: [5,10]',
    fn: 'asteroidCollision', params: 'asteroids', constraints: '2 ≤ n ≤ 10^4',
    tests: [[[5, 10, -5]], [[8, -8]], [[10, 2, -5]], [[-2, -1, 1, 2]], [[1, -2, -2, -2]], [[3, 5, -6, 2, -1, 4]], [[1, 1, -1, -1]]],
    gen: (r) => [Array.from({ length: r.int(2, 8) }, () => r.pick([-1, 1]) * r.int(1, 6))],
    approaches: [
      A('Repeat until nothing collides', 'Scan for a right-moving asteroid immediately followed by a left-moving one, resolve that collision, and repeat.', 'O(n²)', 'O(n)', `function asteroidCollision(asteroids) {
  let a = [...asteroids], changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i + 1 < a.length; i++) {
      if (a[i] > 0 && a[i + 1] < 0) {
        const x = a[i], y = -a[i + 1];
        if (x > y) a.splice(i + 1, 1); else if (x < y) a.splice(i, 1); else a.splice(i, 2);
        changed = true; break;
      }
    }
  }
  return a;
}`),
      A('Stack', 'Keep a stack of survivors. A left-moving asteroid collides with right-moving ones on top of the stack until it is destroyed or the top no longer moves right.', 'O(n)', 'O(n)', `function asteroidCollision(asteroids) {
  const st = [];
  for (let a of asteroids) {
    let alive = true;
    while (alive && a < 0 && st.length && st[st.length - 1] > 0) {
      const top = st[st.length - 1];
      if (top < -a) st.pop(); else { if (top === -a) st.pop(); alive = false; }
    }
    if (alive) st.push(a);
  }
  return st;
}`)
    ]
  },
  {
    id: 'koko-eating-bananas', title: 'Koko Eating Bananas', d: 'M', topic: 'Searching', roles: ['SDE'], sizes: [10, 1000, 100000, 10000000, 1000000000, 2000000000],
    desc: 'There are piles of bananas and h hours. Each hour Koko picks one pile and eats up to k bananas from it (finishing early wastes the rest of that hour). Return the smallest integer eating speed k that lets her finish all piles within h hours.\n\nExample:\nInput: piles = [3,6,7,11], h = 8\nOutput: 4',
    fn: 'minEatingSpeed', params: 'piles, h', constraints: '1 ≤ piles ≤ 10^4, piles.length ≤ h',
    tests: [[[3, 6, 7, 11], 8], [[30, 11, 23, 4, 20], 5], [[30, 11, 23, 4, 20], 6], [[1], 1], [[5, 5, 5], 3], [[312884470], 312884469], [[2, 2], 4]],
    gen: (r) => { const p = r.arr(r.int(1, 5), 1, 20); return [p, r.int(p.length, p.length + 10)]; },
    approaches: [
      A('Try every speed', 'Increase k from 1 until the total hours needed is at most h.', 'O(n·max)', 'O(1)', `function minEatingSpeed(piles, h) {
  for (let k = 1; ; k++) if (piles.reduce((s, p) => s + Math.ceil(p / k), 0) <= h) return k;
}`, { note: 'max is the largest pile; with piles up to 10^9 this is far too slow.' }),
      A('Binary search on the speed', 'The hours needed only fall as k grows, so binary search the smallest k between 1 and the largest pile.', 'O(n·log(max))', 'O(1)', `function minEatingSpeed(piles, h) {
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const k = (lo + hi) >> 1;
    if (piles.reduce((s, p) => s + Math.ceil(p / k), 0) <= h) hi = k; else lo = k + 1;
  }
  return lo;
}`)
    ]
  },
  {
    id: 'capacity-ship', title: 'Capacity To Ship Packages Within D Days', d: 'M', topic: 'Searching', roles: ['SDE'], sizes: [10, 1000, 100000, 10000000, 1000000000, 2000000000],
    desc: 'Packages must be shipped in the given order. Each day the ship carries consecutive packages without exceeding its weight capacity. Return the smallest capacity that ships everything within the given number of days.\n\nExample:\nInput: weights = [1,2,3,4,5,6,7,8,9,10], days = 5\nOutput: 15',
    fn: 'shipWithinDays', params: 'weights, days', constraints: '1 ≤ days ≤ weights ≤ 5·10^4',
    tests: [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5], [[3, 2, 2, 4, 1, 4], 3], [[1, 2, 3, 1, 1], 4], [[5], 1], [[1, 1, 1, 1], 2], [[10, 50, 20, 40], 1], [[7, 2, 5, 10, 8], 2]],
    gen: (r) => { const w = r.arr(r.int(1, 7), 1, 9); return [w, r.int(1, w.length)]; },
    approaches: [
      A('Try every capacity', 'Starting at the heaviest package, simulate the shipping for each capacity until the days fit.', 'O(n·sum)', 'O(1)', `function shipWithinDays(weights, days) {
  const need = (c) => { let d = 1, cur = 0; for (const w of weights) { if (cur + w > c) { d++; cur = 0; } cur += w; } return d; };
  for (let c = Math.max(...weights); ; c++) if (need(c) <= days) return c;
}`),
      A('Binary search on the capacity', 'The days needed never rise as capacity grows, so binary search between the heaviest package and the total weight.', 'O(n·log(sum))', 'O(1)', `function shipWithinDays(weights, days) {
  const need = (c) => { let d = 1, cur = 0; for (const w of weights) { if (cur + w > c) { d++; cur = 0; } cur += w; } return d; };
  let lo = Math.max(...weights), hi = weights.reduce((a, b) => a + b, 0);
  while (lo < hi) { const m = (lo + hi) >> 1; if (need(m) <= days) hi = m; else lo = m + 1; }
  return lo;
}`)
    ]
  },
  {
    id: 'sort-chars-by-frequency', title: 'Sort Characters By Frequency', d: 'M', topic: 'Hashing', roles: ['SDE'],
    desc: 'Sort the characters of a string in decreasing order of frequency. Characters with the same frequency are ordered alphabetically (so the answer is unique).\n\nExample:\nInput: s = "tree"\nOutput: "eert"',
    fn: 'frequencySort', params: 's', constraints: '1 ≤ length ≤ 5·10^5',
    tests: [['tree'], ['cccaaa'], ['Aabb'], ['a'], ['loveleetcode'], ['zzyyxx']],
    gen: (r) => [r.str(r.int(1, 10), 'abcAB')],
    approaches: [
      A('Count then sort the characters', 'Count each character, then sort the whole character list by count (descending) and character.', 'O(n log n)', 'O(n)', `function frequencySort(s) {
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  return s.split('').sort((a, b) => c[b] - c[a] || (a < b ? -1 : a > b ? 1 : 0)).join('');
}`),
      A('Sort the distinct characters', 'Sort only the distinct characters by count and repeat each one that many times.', 'O(n + k log k)', 'O(n)', `function frequencySort(s) {
  const c = new Map();
  for (const ch of s) c.set(ch, (c.get(ch) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([ch, n]) => ch.repeat(n)).join('');
}`),
      A('Bucket by frequency', 'Put each character into the bucket for its count and read buckets from the highest count down.', 'O(n)', 'O(n)', `function frequencySort(s) {
  const c = new Map();
  for (const ch of s) c.set(ch, (c.get(ch) || 0) + 1);
  const buckets = Array.from({ length: s.length + 1 }, () => []);
  for (const [ch, n] of c) buckets[n].push(ch);
  let out = '';
  for (let n = s.length; n > 0; n--) for (const ch of buckets[n].sort()) out += ch.repeat(n);
  return out;
}`)
    ]
  },
  {
    id: 'reorganize-string', title: 'Reorganize String', d: 'M', topic: 'Greedy', roles: ['SDE'],
    desc: 'Rearrange the characters so that no two adjacent characters are equal. Return true if that is possible (the tests only ask whether a valid rearrangement exists, and the function returns a valid string or "" when impossible; here you return that string and the test checks it).\n\nExample:\nInput: s = "aab"\nOutput: a valid rearrangement such as "aba"',
    fn: 'reorganizeString', params: 's', constraints: '1 ≤ length ≤ 500',
    expr: (s) => `(() => { const r = reorganizeString(${JSON.stringify(s)}); if (typeof r !== 'string') return r; if (r === '') return ''; const same = r.split('').sort().join('') === ${JSON.stringify(s.split('').sort().join(''))}; let ok = same && r.length === ${s.length}; for (let i = 1; i < r.length; i++) if (r[i] === r[i - 1]) ok = false; return ok; })()`,
    tests: [['aab'], ['aaab'], ['a'], ['ab'], ['aabb'], ['vvvlo'], ['aaabbbc'], ['aa']],
    gen: (r) => [r.str(r.int(1, 8), 'abc')],
    approaches: [
      A('Try every arrangement', 'Search all orderings, building the string character by character and never placing equal characters next to each other.', 'O(n!)', 'O(n)', `function reorganizeString(s) {
  const chars = s.split('').sort(), used = new Array(chars.length).fill(false);
  let found = null;
  const go = (cur) => {
    if (found !== null) return;
    if (cur.length === chars.length) { found = cur; return; }
    for (let i = 0; i < chars.length && found === null; i++) {
      if (used[i] || (i > 0 && chars[i] === chars[i - 1] && !used[i - 1])) continue;
      if (cur.length && cur[cur.length - 1] === chars[i]) continue;
      used[i] = true; go(cur + chars[i]); used[i] = false;
    }
  };
  go('');
  return found === null ? '' : found;
}`),
      A('Greedy with a max-heap', 'Always place the most frequent remaining character that differs from the previous one. A heap (here a sorted scan) provides the most frequent.', 'O(n log k)', 'O(k)', `function reorganizeString(s) {
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  let out = '', prev = '';
  for (let i = 0; i < s.length; i++) {
    const cand = Object.keys(c).filter((k) => c[k] > 0 && k !== prev).sort((a, b) => c[b] - c[a])[0];
    if (!cand) return '';
    out += cand; c[cand]--; prev = cand;
  }
  return out;
}`),
      A('Place the most frequent letters in even slots first', 'If any letter appears more than ceil(n/2) times it is impossible. Otherwise fill the even positions (0, 2, 4, ...) with the most frequent letter, then continue with the rest, wrapping to the odd positions.', 'O(n log k)', 'O(n)', `function reorganizeString(s) {
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  const letters = Object.keys(c).sort((a, b) => c[b] - c[a]);
  if (c[letters[0]] > Math.ceil(s.length / 2)) return '';
  const out = new Array(s.length);
  let i = 0;
  for (const ch of letters) for (let k = 0; k < c[ch]; k++) { if (i >= s.length) i = 1; out[i] = ch; i += 2; }
  return out.join('');
}`)
    ]
  },
  {
    id: 'next-greater-element-ii', title: 'Next Greater Element II', d: 'M', topic: 'Stacks', roles: ['SDE'],
    desc: 'The array is circular: after the last element comes the first again. For every element return the next greater number, searching circularly, or -1 if none exists.\n\nExample:\nInput: nums = [1,2,1]\nOutput: [2,-1,2]',
    fn: 'nextGreaterElements', params: 'nums', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[1, 2, 1]], [[1, 2, 3, 4, 3]], [[5]], [[3, 3, 3]], [[5, 4, 3, 2, 1]], [[2, 7, 3, 5, 4, 6, 8]]],
    gen: (r) => [r.arr(r.int(1, 8), 0, 5)],
    approaches: [
      A('Scan the circle for each element', 'For each index look through the next n - 1 positions (wrapping around).', 'O(n²)', 'O(1)', `function nextGreaterElements(nums) {
  const n = nums.length;
  return nums.map((x, i) => { for (let k = 1; k < n; k++) if (nums[(i + k) % n] > x) return nums[(i + k) % n]; return -1; });
}`),
      A('Monotonic stack over two passes', 'Traverse the array twice (indexes 0 to 2n - 1) with a stack of indices waiting for a greater value. Wrapping around is handled by the second pass.', 'O(n)', 'O(n)', `function nextGreaterElements(nums) {
  const n = nums.length, out = new Array(n).fill(-1), st = [];
  for (let i = 0; i < 2 * n; i++) {
    const x = nums[i % n];
    while (st.length && nums[st[st.length - 1]] < x) out[st.pop()] = x;
    if (i < n) st.push(i);
  }
  return out;
}`)
    ]
  },
  {
    id: 'non-overlapping-intervals', title: 'Non-overlapping Intervals', d: 'M', topic: 'Intervals', roles: ['SDE'],
    desc: 'Return the minimum number of intervals to remove so that the rest do not overlap. Intervals that only touch ([1,2] and [2,3]) do not overlap.\n\nExample:\nInput: intervals = [[1,2],[2,3],[3,4],[1,3]]\nOutput: 1',
    fn: 'eraseOverlapIntervals', params: 'intervals', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[[1, 2], [2, 3], [3, 4], [1, 3]]], [[[1, 2], [1, 2], [1, 2]]], [[[1, 2], [2, 3]]], [[[1, 5]]], [[[1, 100], [11, 22], [1, 11], [2, 12]]], [[[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]]],
    gen: (r) => [Array.from({ length: r.int(1, 6) }, () => { const s = r.int(0, 10); return [s, s + r.int(1, 4)]; })],
    approaches: [
      A('Longest chain by dynamic programming', 'Sort by start. dp[i] is the longest set of non-overlapping intervals ending with interval i. Remove everything else.', 'O(n²)', 'O(n)', `function eraseOverlapIntervals(intervals) {
  const a = [...intervals].sort((x, y) => x[0] - y[0] || x[1] - y[1]), dp = new Array(a.length).fill(1);
  let best = 0;
  for (let i = 0; i < a.length; i++) { for (let j = 0; j < i; j++) if (a[j][1] <= a[i][0]) dp[i] = Math.max(dp[i], dp[j] + 1); best = Math.max(best, dp[i]); }
  return a.length - best;
}`),
      A('Greedy by earliest end time', 'Sort by end time and always keep the interval that ends first; it leaves the most room. Count intervals that overlap the last kept one.', 'O(n log n)', 'O(1)', `function eraseOverlapIntervals(intervals) {
  const a = [...intervals].sort((x, y) => x[1] - y[1]);
  let removed = 0, end = -Infinity;
  for (const [s, e] of a) { if (s >= end) end = e; else removed++; }
  return removed;
}`)
    ]
  },
  {
    id: 'meeting-rooms-ii', title: 'Meeting Rooms II', d: 'M', topic: 'Intervals', roles: ['SDE', 'Backend Developer'],
    desc: 'Return the minimum number of conference rooms needed to hold all the meetings given as [start, end] intervals. A meeting ending at time t and another starting at t can share a room.\n\nExample:\nInput: intervals = [[0,30],[5,10],[15,20]]\nOutput: 2',
    fn: 'minMeetingRooms', params: 'intervals', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[[0, 30], [5, 10], [15, 20]]], [[[7, 10], [2, 4]]], [[[1, 5], [1, 5], [1, 5]]], [[[1, 5], [5, 8]]], [[[1, 10]]], [[[0, 5], [1, 6], [2, 7], [8, 9]]], [[[9, 10], [4, 9], [4, 17]]]],
    gen: (r) => [Array.from({ length: r.int(1, 7) }, () => { const s = r.int(0, 12); return [s, s + r.int(1, 5)]; })],
    approaches: [
      A('Count overlaps at every start time', 'The rooms needed equal the most meetings running at the same moment. Check the overlap count at every meeting start.', 'O(n²)', 'O(1)', `function minMeetingRooms(intervals) {
  let best = 0;
  for (const [s] of intervals) best = Math.max(best, intervals.filter(([a, b]) => a <= s && s < b).length);
  return best;
}`),
      A('Sorted start and end times', 'Sort start times and end times separately. Walk through the starts; if the earliest unfinished end is at or before this start, reuse that room, otherwise open a new one.', 'O(n log n)', 'O(n)', `function minMeetingRooms(intervals) {
  const s = intervals.map((x) => x[0]).sort((a, b) => a - b), e = intervals.map((x) => x[1]).sort((a, b) => a - b);
  let rooms = 0, j = 0;
  for (let i = 0; i < s.length; i++) { if (s[i] >= e[j]) j++; else rooms++; }
  return rooms;
}`),
      A('Sweep line over events', 'Turn each meeting into +1 at its start and -1 at its end, sort the events (ends first on ties) and track the running count.', 'O(n log n)', 'O(n)', `function minMeetingRooms(intervals) {
  const ev = [];
  for (const [s, e] of intervals) { ev.push([s, 1]); ev.push([e, -1]); }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, best = 0;
  for (const [, d] of ev) { cur += d; best = Math.max(best, cur); }
  return best;
}`)
    ]
  },
  {
    id: 'min-arrows', title: 'Minimum Number of Arrows to Burst Balloons', d: 'M', topic: 'Greedy', roles: ['SDE'],
    desc: 'Balloons are horizontal intervals [xstart, xend]. An arrow shot vertically at x bursts every balloon with xstart ≤ x ≤ xend. Return the minimum number of arrows needed to burst all balloons.\n\nExample:\nInput: points = [[10,16],[2,8],[1,6],[7,12]]\nOutput: 2',
    fn: 'findMinArrowShots', params: 'points', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[[10, 16], [2, 8], [1, 6], [7, 12]]], [[[1, 2], [3, 4], [5, 6], [7, 8]]], [[[1, 2], [2, 3], [3, 4], [4, 5]]], [[[1, 5]]], [[[1, 2], [1, 2]]], [[[3, 9], [7, 12], [3, 8], [6, 8], [9, 10], [2, 9], [0, 9], [3, 9], [0, 6], [2, 8]]]],
    gen: (r) => [Array.from({ length: r.int(1, 7) }, () => { const s = r.int(0, 10); return [s, s + r.int(0, 5)]; })],
    approaches: [
      A('Sort by start and track the common overlap', 'Sort by start. Keep the range where all balloons in the current group overlap; a balloon that starts inside it shrinks the range, and one that starts after it needs a new arrow.', 'O(n log n)', 'O(1)', `function findMinArrowShots(points) {
  const a = [...points].sort((x, y) => x[0] - y[0]);
  let arrows = 0, hi = -Infinity;
  for (const [s, e] of a) { if (s > hi) { arrows++; hi = e; } else hi = Math.min(hi, e); }
  return arrows;
}`),
      A('Sort by end and shoot at the end', 'Sort by end coordinate. Shoot at the first balloon\'s end; it bursts every balloon starting at or before that point. When a balloon starts after the arrow, shoot a new one at its end.', 'O(n log n)', 'O(1)', `function findMinArrowShots(points) {
  const a = [...points].sort((x, y) => x[1] - y[1]);
  let arrows = 0, pos = -Infinity;
  for (const [s, e] of a) if (s > pos) { arrows++; pos = e; }
  return arrows;
}`)
    ]
  },
  {
    id: 'gas-station', title: 'Gas Station', d: 'M', topic: 'Greedy', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'There are stations on a circular route. gas[i] is the fuel at station i and cost[i] is the fuel needed to reach the next station. Starting with an empty tank, return the index of the station from which you can complete the circuit once, or -1. If a solution exists it is unique.\n\nExample:\nInput: gas = [1,2,3,4,5], cost = [3,4,5,1,2]\nOutput: 3',
    fn: 'canCompleteCircuit', params: 'gas, cost', constraints: '1 ≤ n ≤ 10^5',
    tests: [[[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], [[2, 3, 4], [3, 4, 3]], [[5], [4]], [[3], [4]], [[5, 1, 2, 3, 4], [4, 4, 1, 5, 1]], [[2, 0, 1], [1, 1, 1]]],
    gen: (r) => { for (;;) { const n = r.int(1, 6); const g = r.arr(n, 0, 6), c = r.arr(n, 0, 6); let ok = 0; for (let s = 0; s < n; s++) { let t = 0, good = true; for (let k = 0; k < n; k++) { const i = (s + k) % n; t += g[i] - c[i]; if (t < 0) { good = false; break; } } if (good) ok++; } if (ok <= 1) return [g, c]; } },
    approaches: [
      A('Simulate from every start', 'Try each station as the start and drive around.', 'O(n²)', 'O(1)', `function canCompleteCircuit(gas, cost) {
  const n = gas.length;
  for (let s = 0; s < n; s++) {
    let t = 0, ok = true;
    for (let k = 0; k < n; k++) { const i = (s + k) % n; t += gas[i] - cost[i]; if (t < 0) { ok = false; break; } }
    if (ok) return s;
  }
  return -1;
}`),
      A('One pass greedy', 'If total gas is less than total cost there is no answer. Otherwise, whenever the tank goes negative at station i, no start before i + 1 can work, so restart from i + 1.', 'O(n)', 'O(1)', `function canCompleteCircuit(gas, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const d = gas[i] - cost[i];
    total += d; tank += d;
    if (tank < 0) { start = i + 1; tank = 0; }
  }
  return total >= 0 ? start : -1;
}`)
    ]
  },
  {
    id: 'best-time-stock-ii', title: 'Best Time to Buy and Sell Stock II', d: 'M', topic: 'Greedy', roles: ['SDE', 'Data Analyst'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'You may buy and sell a stock any number of times but hold at most one share at a time. Return the maximum profit.\n\nExample:\nInput: prices = [7,1,5,3,6,4]\nOutput: 7',
    fn: 'maxProfitMany', params: 'prices', constraints: '1 ≤ n ≤ 3·10^4',
    tests: [[[7, 1, 5, 3, 6, 4]], [[1, 2, 3, 4, 5]], [[7, 6, 4, 3, 1]], [[1]], [[2, 1, 2, 0, 1]], [[3, 3, 5, 0, 0, 3, 1, 4]]],
    gen: (r) => [r.arr(r.int(1, 8), 0, 9)],
    approaches: [
      A('Recursion over buy/sell states', 'At each day either do nothing, or buy/sell depending on whether you hold a share. Exponential.', 'O(2ⁿ)', 'O(n)', `function maxProfitMany(prices) {
  const go = (i, holding) => (i === prices.length ? 0 : Math.max(go(i + 1, holding), holding ? prices[i] + go(i + 1, false) : -prices[i] + go(i + 1, true)));
  return go(0, false);
}`),
      A('Dynamic programming with two states', 'Track the best profit while holding and while not holding a share, updating each day.', 'O(n)', 'O(1)', `function maxProfitMany(prices) {
  let hold = -Infinity, free = 0;
  for (const p of prices) { const h = Math.max(hold, free - p), f = Math.max(free, hold + p); hold = h; free = f; }
  return free;
}`),
      A('Sum every upward step', 'Any rising stretch equals the sum of its daily gains, so add every positive day-to-day difference.', 'O(n)', 'O(1)', `function maxProfitMany(prices) {
  let p = 0;
  for (let i = 1; i < prices.length; i++) if (prices[i] > prices[i - 1]) p += prices[i] - prices[i - 1];
  return p;
}`)
    ]
  },
  {
    id: 'pow-x-n', title: 'Pow(x, n)', d: 'M', topic: 'Math', roles: ['SDE'], sizes: [10, 100, 1000, 100000, 100000000, 2000000000],
    desc: 'Compute x raised to the integer power n. The tests use integer values of x so that results are exact.\n\nExample:\nInput: x = 2, n = 10\nOutput: 1024',
    fn: 'myPow', params: 'x, n', constraints: '|x| ≤ 5, -10 ≤ n ≤ 10 in the tests',
    expr: (x, n) => `Math.round(myPow(${x}, ${n}) * 1e6) / 1e6`,
    tests: [[2, 10], [2, -2], [3, 0], [0, 5], [-2, 3], [-2, 4], [1, 100], [5, 3]],
    gen: (r) => [r.int(-4, 4), r.int(-5, 8)],
    approaches: [
      A('Multiply n times', 'Multiply x by itself n times, taking the reciprocal for negative n.', 'O(n)', 'O(1)', `function myPow(x, n) {
  let r = 1;
  for (let i = 0; i < Math.abs(n); i++) r *= x;
  return n < 0 ? 1 / r : r;
}`),
      A('Recursive squaring', 'x^n = (x^(n/2))² when n is even, and x · x^(n-1) when n is odd. The exponent halves each time.', 'O(log n)', 'O(log n)', `function myPow(x, n) {
  if (n < 0) return 1 / myPow(x, -n);
  if (n === 0) return 1;
  const h = myPow(x, Math.floor(n / 2));
  return n % 2 ? h * h * x : h * h;
}`),
      A('Iterative binary exponentiation', 'Read the exponent in binary: square the base each step and multiply it into the result whenever the current bit is 1.', 'O(log n)', 'O(1)', `function myPow(x, n) {
  let e = Math.abs(n), base = x, r = 1;
  while (e > 0) { if (e & 1) r *= base; base *= base; e = Math.floor(e / 2); }
  return n < 0 ? 1 / r : r;
}`)
    ]
  },
  {
    id: 'multiply-strings', title: 'Multiply Strings', d: 'M', topic: 'Math', roles: ['SDE'],
    desc: 'Multiply two non-negative integers given as decimal strings and return the product as a string, without converting the whole inputs to integers.\n\nExample:\nInput: num1 = "123", num2 = "456"\nOutput: "56088"',
    fn: 'multiply', params: 'num1, num2', constraints: '1 ≤ length ≤ 200',
    tests: [['2', '3'], ['123', '456'], ['0', '9999'], ['999', '999'], ['10', '10'], ['1', '1'], ['123456789', '987654321']],
    gen: (r) => [String(r.int(0, 9999)), String(r.int(0, 9999))],
    approaches: [
      A('BigInt (for comparison)', 'Parse both numbers as BigInt and multiply. Not allowed in the real problem, but a handy reference.', 'O(n·m)', 'O(n + m)', `function multiply(num1, num2) {
  return (BigInt(num1) * BigInt(num2)).toString();
}`),
      A('Repeated addition of partial products', 'Multiply num1 by each digit of num2, shift by place value, and add the strings together.', 'O(n·m)', 'O(n + m)', `function multiply(num1, num2) {
  const add = (a, b) => { let i = a.length - 1, j = b.length - 1, c = 0, out = ''; while (i >= 0 || j >= 0 || c) { const s = (i >= 0 ? +a[i--] : 0) + (j >= 0 ? +b[j--] : 0) + c; out = (s % 10) + out; c = Math.floor(s / 10); } return out; };
  const times = (a, d) => { let c = 0, out = ''; for (let i = a.length - 1; i >= 0; i--) { const p = +a[i] * d + c; out = (p % 10) + out; c = Math.floor(p / 10); } return c ? c + out : out; };
  let total = '0';
  for (let k = 0; k < num2.length; k++) total = add(total, times(num1, +num2[num2.length - 1 - k]) + '0'.repeat(k));
  return total.replace(/^0+(?=\\d)/, '');
}`),
      A('Digit array (grade-school)', 'The product of digits i and j lands in positions i + j and i + j + 1 of a result array. Add into the array and carry once at the end.', 'O(n·m)', 'O(n + m)', `function multiply(num1, num2) {
  const r = new Array(num1.length + num2.length).fill(0);
  for (let i = num1.length - 1; i >= 0; i--) for (let j = num2.length - 1; j >= 0; j--) {
    const p = (num1.charCodeAt(i) - 48) * (num2.charCodeAt(j) - 48) + r[i + j + 1];
    r[i + j + 1] = p % 10; r[i + j] += Math.floor(p / 10);
  }
  const s = r.join('').replace(/^0+/, '');
  return s || '0';
}`)
    ]
  },
  {
    id: 'integer-to-roman', title: 'Integer to Roman', d: 'M', topic: 'Math', roles: ['SDE'],
    desc: 'Convert an integer from 1 to 3999 to a Roman numeral (I, V, X, L, C, D, M with the subtractive forms IV, IX, XL, XC, CD, CM).\n\nExample:\nInput: num = 1994\nOutput: "MCMXCIV"',
    fn: 'intToRoman', params: 'num', constraints: '1 ≤ num ≤ 3999',
    tests: [[3], [58], [1994], [4], [9], [40], [3999], [444]],
    gen: (r) => [r.int(1, 3999)],
    approaches: [
      A('Greedy over value table', 'Walk a table of values from large to small (including 900, 400, 90, 40, 9, 4) and subtract while the number allows.', 'O(1)', 'O(1)', `function intToRoman(num) {
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of t) while (num >= v) { out += s; num -= v; }
  return out;
}`),
      A('Digit by digit lookup', 'Split the number into thousands, hundreds, tens and ones and look each digit up in a table of numerals for that place.', 'O(1)', 'O(1)', `function intToRoman(num) {
  const M = ['', 'M', 'MM', 'MMM'], C = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'], X = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'], I = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  return M[Math.floor(num / 1000)] + C[Math.floor(num / 100) % 10] + X[Math.floor(num / 10) % 10] + I[num % 10];
}`)
    ]
  },
  {
    id: 'decode-string', title: 'Decode String', d: 'M', topic: 'Stacks', roles: ['SDE'],
    desc: 'Decode a string where k[encoded] means the encoded text repeated k times. Brackets can be nested.\n\nExample:\nInput: s = "3[a2[c]]"\nOutput: "accaccacc"',
    fn: 'decodeString', params: 's', constraints: '1 ≤ length ≤ 30, repeat counts 1 to 300',
    tests: [['3[a]2[bc]'], ['3[a2[c]]'], ['2[abc]3[cd]ef'], ['abc'], ['10[a]'], ['2[2[2[a]]]'], ['a2[b]c']],
    gen: (r) => { const mk = (d) => { let s = ''; for (let i = 0; i < r.int(1, 2); i++) { s += r.str(r.int(0, 2), 'ab'); if (d > 0 && r.next() < 0.6) s += r.int(1, 3) + '[' + mk(d - 1) + ']'; } return s; }; return [mk(2) || 'a']; },
    approaches: [
      A('Expand the innermost bracket repeatedly', 'Use a regular expression to find an innermost k[text], replace it with the repeated text, and loop until no brackets remain.', 'O(n·k)', 'O(n)', `function decodeString(s) {
  const re = /(\\d+)\\[([a-z]*)\\]/;
  while (re.test(s)) s = s.replace(re, (_, k, t) => t.repeat(Number(k)));
  return s;
}`),
      A('Two stacks', 'Keep a stack of repeat counts and a stack of partial strings. On "[" push the current state; on "]" pop, repeat the current string and append it to the previous one.', 'O(n·k)', 'O(n)', `function decodeString(s) {
  const counts = [], strs = [];
  let cur = '', num = 0;
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') num = num * 10 + Number(ch);
    else if (ch === '[') { counts.push(num); strs.push(cur); num = 0; cur = ''; }
    else if (ch === ']') { cur = strs.pop() + cur.repeat(counts.pop()); }
    else cur += ch;
  }
  return cur;
}`),
      A('Recursion', 'Parse recursively: read the repeat count, then the bracket contents (a recursive call), and repeat the result.', 'O(n·k)', 'O(n)', `function decodeString(s) {
  let i = 0;
  const parse = () => {
    let out = '';
    while (i < s.length && s[i] !== ']') {
      if (s[i] >= '0' && s[i] <= '9') {
        let k = 0;
        while (s[i] >= '0' && s[i] <= '9') k = k * 10 + Number(s[i++]);
        i++; const inner = parse(); i++;
        out += inner.repeat(k);
      } else out += s[i++];
    }
    return out;
  };
  return parse();
}`)
    ]
  },
  {
    id: 'remove-k-digits', title: 'Remove K Digits', d: 'M', topic: 'Greedy', roles: ['SDE'],
    desc: 'Remove exactly k digits from a non-negative number given as a string so that the remaining number is as small as possible. Return it without leading zeros (or "0").\n\nExample:\nInput: num = "1432219", k = 3\nOutput: "1219"',
    fn: 'removeKdigits', params: 'num, k', constraints: '1 ≤ k ≤ length ≤ 10^5',
    tests: [['1432219', 3], ['10200', 1], ['10', 2], ['112', 1], ['9', 1], ['12345', 2], ['54321', 2], ['100', 1]],
    gen: (r) => { const s = r.str(r.int(1, 7), '0123456789'); return [s, r.int(1, s.length)]; },
    approaches: [
      A('Remove the peak digit k times', 'Each round remove the first digit that is larger than the digit after it (or the last digit). Repeat k times.', 'O(n·k)', 'O(n)', `function removeKdigits(num, k) {
  let s = num;
  for (let t = 0; t < k; t++) {
    let i = 0;
    while (i + 1 < s.length && s[i] <= s[i + 1]) i++;
    s = s.slice(0, i) + s.slice(i + 1);
  }
  s = s.replace(/^0+/, '');
  return s || '0';
}`),
      A('Monotonic stack', 'Keep a stack of digits that is as non-decreasing as possible: pop while the new digit is smaller and removals remain. Trim leftover removals from the end and strip leading zeros.', 'O(n)', 'O(n)', `function removeKdigits(num, k) {
  const st = [];
  for (const d of num) { while (k > 0 && st.length && st[st.length - 1] > d) { st.pop(); k--; } st.push(d); }
  while (k-- > 0) st.pop();
  const s = st.join('').replace(/^0+/, '');
  return s || '0';
}`)
    ]
  },
  {
    id: 'partition-labels', title: 'Partition Labels', d: 'M', topic: 'Greedy', roles: ['SDE'],
    desc: 'Partition a string into as many parts as possible so that each letter appears in at most one part. Return the sizes of the parts.\n\nExample:\nInput: s = "ababcbacadefegdehijhklij"\nOutput: [9,7,8]',
    fn: 'partitionLabels', params: 's', constraints: '1 ≤ length ≤ 500',
    tests: [['ababcbacadefegdehijhklij'], ['eccbbbbdec'], ['a'], ['abc'], ['aaaa'], ['abab'], ['caedbdedda']],
    gen: (r) => [r.str(r.int(1, 10), 'abcd')],
    approaches: [
      A('Merge the letter ranges', 'Find the first and last position of each letter as intervals, then merge overlapping intervals; each merged interval is a part.', 'O(n)', 'O(1)', `function partitionLabels(s) {
  const first = {}, last = {};
  for (let i = 0; i < s.length; i++) { if (first[s[i]] === undefined) first[s[i]] = i; last[s[i]] = i; }
  const iv = Object.keys(first).map((c) => [first[c], last[c]]).sort((a, b) => a[0] - b[0]);
  const out = [];
  let [a, b] = iv[0];
  for (let i = 1; i < iv.length; i++) { if (iv[i][0] <= b) b = Math.max(b, iv[i][1]); else { out.push(b - a + 1); [a, b] = iv[i]; } }
  out.push(b - a + 1);
  return out;
}`, { note: 'There are at most 26 letters, so sorting the intervals is constant work.' }),
      A('Greedy with last occurrences', 'Record the last index of every letter. Sweep the string, extending the current part\'s end to the furthest last occurrence seen; when the sweep reaches that end, close the part.', 'O(n)', 'O(1)', `function partitionLabels(s) {
  const last = {};
  for (let i = 0; i < s.length; i++) last[s[i]] = i;
  const out = [];
  let start = 0, end = 0;
  for (let i = 0; i < s.length; i++) { end = Math.max(end, last[s[i]]); if (i === end) { out.push(end - start + 1); start = i + 1; } }
  return out;
}`)
    ]
  }
];
