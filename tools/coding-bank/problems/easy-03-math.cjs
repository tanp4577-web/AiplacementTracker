const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'climbing-stairs', title: 'Climbing Stairs', d: 'E', topic: 'Dynamic Programming', roles: ['SDE', 'Backend Developer'], sizes: [5, 10, 20, 30, 40, 45],
    desc: 'You climb a staircase of n steps, taking 1 or 2 steps at a time. In how many distinct ways can you reach the top?\n\nExample:\nInput: n = 3\nOutput: 3 (1+1+1, 1+2, 2+1)',
    fn: 'climbStairs', params: 'n', constraints: '1 ≤ n ≤ 45',
    tests: [[1], [2], [3], [5], [10], [20], [30]],
    gen: (r) => [r.int(1, 18)],
    approaches: [
      A('Plain recursion', 'ways(n) = ways(n-1) + ways(n-2). Correct, but the same sub-problems are solved again and again.', 'O(2ⁿ)', 'O(n)', `function climbStairs(n) {
  if (n <= 2) return n;
  return climbStairs(n - 1) + climbStairs(n - 2);
}`, { note: 'Try n = 40 with this version and watch the browser struggle: the work doubles with every extra step.' }),
      A('Memoised recursion', 'Remember the answer for each n so every sub-problem is computed once.', 'O(n)', 'O(n)', `function climbStairs(n) {
  const memo = {};
  const go = (k) => (k <= 2 ? k : memo[k] || (memo[k] = go(k - 1) + go(k - 2)));
  return go(n);
}`),
      A('Bottom-up with two variables', 'Only the last two answers are ever needed, so keep two numbers instead of a table.', 'O(n)', 'O(1)', `function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}`)
    ]
  },
  {
    id: 'palindrome-number', title: 'Palindrome Number', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'Return true if an integer reads the same forwards and backwards. Negative numbers are never palindromes.\n\nExample:\nInput: x = 121\nOutput: true',
    fn: 'isPalindromeNumber', params: 'x', constraints: '-2^31 ≤ x ≤ 2^31 - 1',
    tests: [[121], [-121], [10], [0], [7], [1221], [123454321]],
    gen: (r) => [r.int(-20, 2000)],
    approaches: [
      A('Convert to a string', 'Compare the digits as text with their reverse.', 'O(log n)', 'O(log n)', `function isPalindromeNumber(x) {
  const s = String(x);
  return s === s.split('').reverse().join('');
}`, { note: 'The number of digits is log10 of the value, so the cost is O(log n) in terms of the value itself.' }),
      A('Reverse half of the number', 'Build the reversed second half with arithmetic and compare it with the first half. No string needed.', 'O(log n)', 'O(1)', `function isPalindromeNumber(x) {
  if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
  let rev = 0;
  while (x > rev) { rev = rev * 10 + (x % 10); x = Math.floor(x / 10); }
  return x === rev || x === Math.floor(rev / 10);
}`)
    ]
  },
  {
    id: 'power-of-two', title: 'Power of Two', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'Return true if n is a power of two (1, 2, 4, 8, ...).\n\nExample:\nInput: n = 16\nOutput: true',
    fn: 'isPowerOfTwo', params: 'n', constraints: '-2^31 ≤ n ≤ 2^31 - 1',
    tests: [[1], [16], [3], [0], [-8], [1024], [6], [2147483647]],
    gen: (r) => [r.int(-4, 70)],
    approaches: [
      A('Keep dividing by 2', 'Divide by two while the number is even. A power of two ends at exactly 1.', 'O(log n)', 'O(1)', `function isPowerOfTwo(n) {
  if (n < 1) return false;
  while (n % 2 === 0) n /= 2;
  return n === 1;
}`),
      A('Bit trick', 'A power of two has exactly one bit set, so n & (n - 1) clears it and leaves zero.', 'O(1)', 'O(1)', `function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}`, { note: 'For 32-bit inputs the loop version runs at most 31 times; the bit trick is a single operation.' })
    ]
  },
  {
    id: 'power-of-three', title: 'Power of Three', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'Return true if n is a power of three (1, 3, 9, 27, ...).\n\nExample:\nInput: n = 27\nOutput: true',
    fn: 'isPowerOfThree', params: 'n', constraints: '-2^31 ≤ n ≤ 2^31 - 1',
    tests: [[27], [0], [9], [45], [1], [-3], [81], [243]],
    gen: (r) => [r.int(-3, 250)],
    approaches: [
      A('Keep dividing by 3', 'Divide by three while the number is divisible. A power of three ends at 1.', 'O(log n)', 'O(1)', `function isPowerOfThree(n) {
  if (n < 1) return false;
  while (n % 3 === 0) n /= 3;
  return n === 1;
}`),
      A('Divisor of the largest power', 'The largest power of three that fits in 32 bits is 3^19 = 1162261467. Any smaller power of three divides it, and nothing else does (3 is prime).', 'O(1)', 'O(1)', `function isPowerOfThree(n) {
  return n > 0 && 1162261467 % n === 0;
}`)
    ]
  },
  {
    id: 'number-of-1-bits', title: 'Number of 1 Bits', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'Return how many 1 bits there are in the binary representation of an unsigned 32-bit integer n.\n\nExample:\nInput: n = 11 (binary 1011)\nOutput: 3',
    fn: 'hammingWeight', params: 'n', constraints: '0 ≤ n < 2^32',
    tests: [[11], [128], [0], [4294967295], [1], [255], [1023]],
    gen: (r) => [r.int(0, 100000)],
    approaches: [
      A('Check every bit', 'Shift right 32 times and count the low bit each time.', 'O(1)', 'O(1)', `function hammingWeight(n) {
  let c = 0;
  for (let i = 0; i < 32; i++) { c += n % 2; n = Math.floor(n / 2); }
  return c;
}`, { note: 'Always 32 steps, however few bits are set.' }),
      A('Clear the lowest set bit', 'n & (n - 1) removes the lowest 1 bit, so loop until n is zero. It runs once per set bit.', 'O(k)', 'O(1)', `function hammingWeight(n) {
  let c = 0;
  while (n > 0) { n = Number(BigInt(n) & (BigInt(n) - 1n)); c++; }
  return c;
}`, { note: 'k is the number of set bits, at most 32.' })
    ]
  },
  {
    id: 'hamming-distance', title: 'Hamming Distance', d: 'E', topic: 'Bit Manipulation', roles: ['SDE'],
    desc: 'The Hamming distance of two integers is the number of bit positions at which they differ. Return it for x and y.\n\nExample:\nInput: x = 1, y = 4\nOutput: 2',
    fn: 'hammingDistance', params: 'x, y', constraints: '0 ≤ x, y ≤ 2^31 - 1',
    tests: [[1, 4], [3, 1], [0, 0], [255, 0], [7, 8], [1024, 1023]],
    gen: (r) => [r.int(0, 5000), r.int(0, 5000)],
    approaches: [
      A('Compare bit by bit', 'Look at each of the 31 bit positions in both numbers and count the differences.', 'O(1)', 'O(1)', `function hammingDistance(x, y) {
  let d = 0;
  for (let i = 0; i < 31; i++) if (((x >> i) & 1) !== ((y >> i) & 1)) d++;
  return d;
}`),
      A('XOR and count ones', 'x ^ y has a 1 exactly where the numbers differ; count those ones.', 'O(1)', 'O(1)', `function hammingDistance(x, y) {
  let v = x ^ y, c = 0;
  while (v) { v &= v - 1; c++; }
  return c;
}`)
    ]
  },
  {
    id: 'add-digits', title: 'Add Digits', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'Repeatedly add the digits of a non-negative integer until a single digit remains. Return that digit.\n\nExample:\nInput: num = 38\nOutput: 2 (3 + 8 = 11, 1 + 1 = 2)',
    fn: 'addDigits', params: 'num', constraints: '0 ≤ num ≤ 2^31 - 1',
    tests: [[38], [0], [9], [10], [99], [12345], [2147483647]],
    gen: (r) => [r.int(0, 100000)],
    approaches: [
      A('Simulate the process', 'Sum the digits repeatedly until the result is below 10.', 'O(log n)', 'O(1)', `function addDigits(num) {
  while (num >= 10) {
    let s = 0;
    while (num) { s += num % 10; num = Math.floor(num / 10); }
    num = s;
  }
  return num;
}`),
      A('Digital root formula', 'The digital root cycles with period 9, so the answer is 1 + (num - 1) % 9 for positive numbers.', 'O(1)', 'O(1)', `function addDigits(num) {
  return num === 0 ? 0 : 1 + ((num - 1) % 9);
}`)
    ]
  },
  {
    id: 'happy-number', title: 'Happy Number', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'Replace a number by the sum of the squares of its digits, repeatedly. It is happy if the process reaches 1, and unhappy if it loops forever without reaching 1. Return true if n is happy.\n\nExample:\nInput: n = 19\nOutput: true (1 + 81 = 82, 64 + 4 = 68, 36 + 64 = 100, 1)',
    fn: 'isHappy', params: 'n', constraints: '1 ≤ n ≤ 2^31 - 1',
    tests: [[19], [2], [1], [7], [4], [100], [116]],
    gen: (r) => [r.int(1, 400)],
    approaches: [
      A('Remember seen numbers', 'Keep a set of numbers already visited; reaching one again means an endless loop.', 'O(log n)', 'O(log n)', `function isHappy(n) {
  const seen = new Set();
  const next = (x) => { let s = 0; while (x) { s += (x % 10) ** 2; x = Math.floor(x / 10); } return s; };
  while (n !== 1 && !seen.has(n)) { seen.add(n); n = next(n); }
  return n === 1;
}`),
      A('Fast and slow pointers', 'Treat the sequence like a linked list: if there is a cycle, a fast pointer will meet a slow one. No set needed.', 'O(log n)', 'O(1)', `function isHappy(n) {
  const next = (x) => { let s = 0; while (x) { s += (x % 10) ** 2; x = Math.floor(x / 10); } return s; };
  let slow = n, fast = next(n);
  while (fast !== 1 && slow !== fast) { slow = next(slow); fast = next(next(fast)); }
  return fast === 1;
}`)
    ]
  },
  {
    id: 'ugly-number', title: 'Ugly Number', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'An ugly number is a positive integer whose only prime factors are 2, 3 and 5. Return true if n is ugly.\n\nExample:\nInput: n = 30\nOutput: true (2 × 3 × 5)',
    fn: 'isUgly', params: 'n', constraints: '-2^31 ≤ n ≤ 2^31 - 1',
    tests: [[6], [1], [14], [0], [-6], [30], [49], [1024]],
    gen: (r) => [r.int(-3, 200)],
    approaches: [
      A('Try every divisor', 'Factorise n by trial division and fail if any prime factor other than 2, 3 or 5 shows up.', 'O(√n)', 'O(1)', `function isUgly(n) {
  if (n < 1) return false;
  for (let p = 2; p * p <= n; p++) {
    while (n % p === 0) { if (p > 5) return false; n /= p; }
  }
  return n <= 5;
}`),
      A('Divide out 2, 3 and 5', 'Strip every factor of 2, 3 and 5. If 1 remains, nothing else divided n.', 'O(log n)', 'O(1)', `function isUgly(n) {
  if (n < 1) return false;
  for (const p of [2, 3, 5]) while (n % p === 0) n /= p;
  return n === 1;
}`)
    ]
  },
  {
    id: 'fibonacci-number', title: 'Fibonacci Number', d: 'E', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 10, 20, 30, 40, 45],
    desc: 'The Fibonacci numbers are F(0) = 0, F(1) = 1 and F(n) = F(n-1) + F(n-2). Return F(n).\n\nExample:\nInput: n = 6\nOutput: 8',
    fn: 'fib', params: 'n', constraints: '0 ≤ n ≤ 30',
    tests: [[0], [1], [2], [6], [10], [20], [30]],
    gen: (r) => [r.int(0, 16)],
    approaches: [
      A('Naive recursion', 'Follow the definition directly. Each call spawns two more, so work doubles with n.', 'O(2ⁿ)', 'O(n)', `function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}`),
      A('Memoisation', 'Store results already computed so every F(k) is calculated once.', 'O(n)', 'O(n)', `function fib(n) {
  const m = [0, 1];
  const go = (k) => (m[k] !== undefined ? m[k] : (m[k] = go(k - 1) + go(k - 2)));
  return go(n);
}`),
      A('Iteration', 'Roll two variables forward n times.', 'O(n)', 'O(1)', `function fib(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}`),
      A('Matrix / fast doubling', 'The doubling identities F(2k) = F(k)(2F(k+1) - F(k)) and F(2k+1) = F(k)² + F(k+1)² let you jump to F(n) in logarithmic steps.', 'O(log n)', 'O(log n)', `function fib(n) {
  const go = (k) => {
    if (k === 0) return [0, 1];
    const [a, b] = go(k >> 1);
    const c = a * (2 * b - a), d = a * a + b * b;
    return k & 1 ? [d, c + d] : [c, d];
  };
  return go(n)[0];
}`, { note: 'Worth knowing when n is huge and you work modulo a number.' })
    ]
  },
  {
    id: 'excel-column-number', title: 'Excel Sheet Column Number', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'Excel names columns A, B, ..., Z, AA, AB, ... Given a column title, return its column number (A = 1, Z = 26, AA = 27).\n\nExample:\nInput: columnTitle = "ZY"\nOutput: 701',
    fn: 'titleToNumber', params: 'columnTitle', constraints: '1 ≤ length ≤ 7',
    tests: [['A'], ['AB'], ['ZY'], ['Z'], ['AA'], ['FXSHRXW']],
    gen: (r) => [r.str(r.int(1, 4), 'ABCXYZ')],
    approaches: [
      A('Base-26 with a loop', 'Treat the title as a base-26 number where A=1 .. Z=26: result = result × 26 + digit.', 'O(n)', 'O(1)', `function titleToNumber(columnTitle) {
  let r = 0;
  for (const c of columnTitle) r = r * 26 + (c.charCodeAt(0) - 64);
  return r;
}`),
      A('Sum of place values', 'Compute each letter\'s value times 26 raised to its position, from the right.', 'O(n)', 'O(1)', `function titleToNumber(columnTitle) {
  let r = 0, p = 1;
  for (let i = columnTitle.length - 1; i >= 0; i--) { r += (columnTitle.charCodeAt(i) - 64) * p; p *= 26; }
  return r;
}`)
    ]
  },
  {
    id: 'sqrt-x', title: 'Sqrt(x)', d: 'E', topic: 'Searching', roles: ['SDE'], sizes: [100, 10000, 1000000, 100000000, 1000000000, 2000000000],
    desc: 'Return the integer part of the square root of a non-negative integer x, without using a built-in power or square-root function.\n\nExample:\nInput: x = 8\nOutput: 2',
    fn: 'mySqrt', params: 'x', constraints: '0 ≤ x ≤ 2^31 - 1',
    tests: [[4], [8], [0], [1], [2], [2147395599], [99], [100]],
    gen: (r) => [r.int(0, 3000)],
    approaches: [
      A('Try every candidate', 'Increase a counter while its square is at most x.', 'O(√x)', 'O(1)', `function mySqrt(x) {
  let r = 0;
  while ((r + 1) * (r + 1) <= x) r++;
  return r;
}`),
      A('Binary search on the answer', 'The answer lies between 0 and x. Halve the range using the test mid × mid ≤ x.', 'O(log x)', 'O(1)', `function mySqrt(x) {
  let lo = 0, hi = x;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (mid * mid <= x) lo = mid; else hi = mid - 1;
  }
  return lo;
}`),
      A('Newton\'s method', 'Repeatedly improve a guess with r = (r + x / r) / 2. It converges very quickly.', 'O(log x)', 'O(1)', `function mySqrt(x) {
  if (x < 2) return x;
  let r = x;
  while (r * r > x) r = Math.floor((r + Math.floor(x / r)) / 2);
  return r;
}`)
    ]
  },
  {
    id: 'count-primes', title: 'Count Primes', d: 'E', topic: 'Math', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Return how many prime numbers are strictly less than n.\n\nExample:\nInput: n = 10\nOutput: 4 (2, 3, 5, 7)',
    fn: 'countPrimes', params: 'n', constraints: '0 ≤ n ≤ 5·10^6',
    tests: [[10], [0], [1], [2], [3], [100], [1000]],
    gen: (r) => [r.int(0, 300)],
    approaches: [
      A('Test every number', 'For each number below n try dividing by every smaller number.', 'O(n²)', 'O(1)', `function countPrimes(n) {
  let c = 0;
  for (let i = 2; i < n; i++) {
    let p = true;
    for (let d = 2; d < i; d++) if (i % d === 0) { p = false; break; }
    if (p) c++;
  }
  return c;
}`),
      A('Trial division up to the square root', 'A number is composite if it has a divisor up to its square root, so stop testing there.', 'O(n√n)', 'O(1)', `function countPrimes(n) {
  let c = 0;
  for (let i = 2; i < n; i++) {
    let p = true;
    for (let d = 2; d * d <= i; d++) if (i % d === 0) { p = false; break; }
    if (p) c++;
  }
  return c;
}`),
      A('Sieve of Eratosthenes', 'Cross out the multiples of each prime starting at p². Every composite is crossed out once by its smallest prime factor.', 'O(n log log n)', 'O(n)', `function countPrimes(n) {
  if (n < 3) return 0;
  const comp = new Uint8Array(n);
  let c = 0;
  for (let i = 2; i < n; i++) {
    if (!comp[i]) { c++; for (let j = i * i; j < n; j += i) comp[j] = 1; }
  }
  return c;
}`, { note: 'n log log n grows so slowly it behaves like O(n) for any n you can store in memory.' })
    ]
  }
];
