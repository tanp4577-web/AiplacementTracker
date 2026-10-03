const { A } = require('../dsl.cjs');

module.exports = [
  {
    id: 'valid-palindrome', title: 'Valid Palindrome', d: 'E', topic: 'Strings', roles: ['SDE', 'Backend Developer'],
    desc: 'A phrase is a palindrome if, after lowercasing it and removing every character that is not a letter or digit, it reads the same forwards and backwards. Return true or false.\n\nExample:\nInput: s = "A man, a plan, a canal: Panama"\nOutput: true',
    fn: 'isPalindrome', params: 's', constraints: '1 ≤ length ≤ 2·10^5',
    tests: [['A man, a plan, a canal: Panama'], ['race a car'], [' '], ['0P'], ['ab_a'], ['Was it a car or a cat I saw?']],
    gen: (r) => [r.str(r.int(0, 8), 'aAb, 1')],
    approaches: [
      A('Clean then reverse', 'Build a cleaned lowercase string and compare it with its reverse.', 'O(n)', 'O(n)', `function isPalindrome(s) {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return t === t.split('').reverse().join('');
}`),
      A('Two pointers', 'Move a left and right pointer inward, skipping non-alphanumeric characters, and compare in place. No extra string is built.', 'O(n)', 'O(1)', `function isPalindrome(s) {
  const ok = (c) => /[a-z0-9]/i.test(c);
  let i = 0, j = s.length - 1;
  while (i < j) {
    while (i < j && !ok(s[i])) i++;
    while (i < j && !ok(s[j])) j--;
    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    i++; j--;
  }
  return true;
}`)
    ]
  },
  {
    id: 'reverse-string', title: 'Reverse String', d: 'E', topic: 'Strings', roles: ['SDE', 'Frontend Developer'],
    desc: 'Reverse an array of characters. Return the reversed array.\n\nExample:\nInput: s = ["h","e","l","l","o"]\nOutput: ["o","l","l","e","h"]',
    fn: 'reverseString', params: 's', constraints: '1 ≤ n ≤ 10^5',
    tests: [[['h', 'e', 'l', 'l', 'o']], [['a', 'b', 'c']], [['x']], [['a', 'b']], [['H', 'a', 'n', 'n', 'a', 'h']], [['1', '2', '3', '4']]],
    gen: (r) => [r.str(r.int(1, 8), 'abcd').split('')],
    approaches: [
      A('Build a new array', 'Read the characters from the end into a new array.', 'O(n)', 'O(n)', `function reverseString(s) {
  const out = [];
  for (let i = s.length - 1; i >= 0; i--) out.push(s[i]);
  return out;
}`),
      A('Built-in reverse', 'Copy and call the built-in reverse. Short, but it hides the idea.', 'O(n)', 'O(n)', `function reverseString(s) {
  return [...s].reverse();
}`),
      A('Swap from both ends', 'Swap the first and last elements, then move both pointers towards the middle. In place, so no extra memory.', 'O(n)', 'O(1)', `function reverseString(s) {
  const a = [...s];
  let i = 0, j = a.length - 1;
  while (i < j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; }
  return a;
}`)
    ]
  },
  {
    id: 'fizzbuzz', title: 'FizzBuzz', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'For each i from 1 to n return "FizzBuzz" if i is divisible by 3 and 5, "Fizz" if by 3, "Buzz" if by 5, otherwise the number as a string.\n\nExample:\nInput: n = 5\nOutput: ["1","2","Fizz","4","Buzz"]',
    fn: 'fizzBuzz', params: 'n', constraints: '1 ≤ n ≤ 10^4',
    tests: [[1], [3], [5], [15], [10], [20]],
    gen: (r) => [r.int(1, 30)],
    approaches: [
      A('Chain of ifs', 'Check the combined case first, then 3, then 5.', 'O(n)', 'O(1)', `function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) out.push('FizzBuzz');
    else if (i % 3 === 0) out.push('Fizz');
    else if (i % 5 === 0) out.push('Buzz');
    else out.push(String(i));
  }
  return out;
}`, { note: 'Space is O(1) beyond the output list itself.' }),
      A('String building', 'Append "Fizz" and "Buzz" independently, and fall back to the number when the string is empty. Adding another rule (say 7 for "Bazz") is one more line.', 'O(n)', 'O(1)', `function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    let s = '';
    if (i % 3 === 0) s += 'Fizz';
    if (i % 5 === 0) s += 'Buzz';
    out.push(s || String(i));
  }
  return out;
}`)
    ]
  },
  {
    id: 'valid-palindrome-2', title: 'Valid Palindrome II', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Given a string s, return true if it can become a palindrome after deleting at most one character.\n\nExample:\nInput: s = "abca"\nOutput: true (delete "c")',
    fn: 'validPalindrome', params: 's', constraints: '1 ≤ length ≤ 10^5',
    tests: [['aba'], ['abca'], ['abc'], ['a'], ['deeee'], ['cupuufxoohdfpgjdmysgvhmvffcnqxjjxqncffvmhvgsymdjgpfdhooxfuupucu'], ['ab']],
    gen: (r) => [r.str(r.int(1, 9), 'abc')],
    approaches: [
      A('Try every deletion', 'Delete each character in turn and test whether the rest is a palindrome.', 'O(n²)', 'O(n)', `function validPalindrome(s) {
  const pal = (t) => t === t.split('').reverse().join('');
  if (pal(s)) return true;
  for (let i = 0; i < s.length; i++) if (pal(s.slice(0, i) + s.slice(i + 1))) return true;
  return false;
}`),
      A('Two pointers with one skip', 'Walk inward from both ends. At the first mismatch, try skipping the left or the right character and check the remainder with a plain palindrome test.', 'O(n)', 'O(1)', `function validPalindrome(s) {
  const pal = (i, j) => { while (i < j) { if (s[i++] !== s[j--]) return false; } return true; };
  let i = 0, j = s.length - 1;
  while (i < j) {
    if (s[i] !== s[j]) return pal(i + 1, j) || pal(i, j - 1);
    i++; j--;
  }
  return true;
}`)
    ]
  },
  {
    id: 'valid-anagram', title: 'Valid Anagram', d: 'E', topic: 'Hashing', roles: ['SDE', 'Backend Developer', 'Data Analyst'],
    desc: 'Return true if string t is an anagram of s (the same letters with the same counts in any order).\n\nExample:\nInput: s = "anagram", t = "nagaram"\nOutput: true',
    fn: 'isAnagram', params: 's, t', constraints: '1 ≤ length ≤ 5·10^4',
    tests: [['anagram', 'nagaram'], ['rat', 'car'], ['', ''], ['a', 'ab'], ['listen', 'silent'], ['aacc', 'ccac']],
    gen: (r) => [r.str(r.int(0, 6), 'abc'), r.str(r.int(0, 6), 'abc')],
    approaches: [
      A('Sort both', 'Anagrams become identical after sorting their letters.', 'O(n log n)', 'O(n)', `function isAnagram(s, t) {
  return s.split('').sort().join('') === t.split('').sort().join('');
}`),
      A('Frequency map', 'Count letters of s up and letters of t down; an anagram leaves every count at zero.', 'O(n)', 'O(k)', `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const c = new Map();
  for (const ch of s) c.set(ch, (c.get(ch) || 0) + 1);
  for (const ch of t) {
    if (!c.get(ch)) return false;
    c.set(ch, c.get(ch) - 1);
  }
  return true;
}`, { note: 'k is the alphabet size, so for lowercase letters the space is a constant 26.' })
    ]
  },
  {
    id: 'first-unique-char', title: 'First Unique Character in a String', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Return the index of the first character in s that does not repeat anywhere in the string, or -1 if there is none.\n\nExample:\nInput: s = "leetcode"\nOutput: 0',
    fn: 'firstUniqChar', params: 's', constraints: '1 ≤ length ≤ 10^5',
    tests: [['leetcode'], ['loveleetcode'], ['aabb'], ['z'], ['abcabcd'], ['aadadaad']],
    gen: (r) => [r.str(r.int(1, 9), 'abcd')],
    approaches: [
      A('Check each character', 'For each position, scan the whole string to see whether the character occurs again.', 'O(n²)', 'O(1)', `function firstUniqChar(s) {
  for (let i = 0; i < s.length; i++) if (s.indexOf(s[i]) === i && s.lastIndexOf(s[i]) === i) return i;
  return -1;
}`),
      A('Count then scan', 'First pass counts every character. Second pass returns the first character whose count is 1.', 'O(n)', 'O(1)', `function firstUniqChar(s) {
  const c = {};
  for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  for (let i = 0; i < s.length; i++) if (c[s[i]] === 1) return i;
  return -1;
}`, { note: 'The alphabet is fixed, so the counts take constant space.' })
    ]
  },
  {
    id: 'isomorphic-strings', title: 'Isomorphic Strings', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Two strings are isomorphic if the characters of s can be replaced one-to-one to get t. No two characters may map to the same character, and order is preserved. Return true or false.\n\nExample:\nInput: s = "egg", t = "add"\nOutput: true',
    fn: 'isIsomorphic', params: 's, t', constraints: '1 ≤ length ≤ 5·10^4, equal lengths',
    tests: [['egg', 'add'], ['foo', 'bar'], ['paper', 'title'], ['badc', 'baba'], ['a', 'a'], ['ab', 'aa']],
    gen: (r) => { const n = r.int(1, 7); return [r.str(n, 'abc'), r.str(n, 'xyz')]; },
    approaches: [
      A('Two maps', 'Keep a map s→t and a map t→s; any conflict means the strings are not isomorphic.', 'O(n)', 'O(k)', `function isIsomorphic(s, t) {
  if (s.length !== t.length) return false;
  const a = new Map(), b = new Map();
  for (let i = 0; i < s.length; i++) {
    if (a.has(s[i]) && a.get(s[i]) !== t[i]) return false;
    if (b.has(t[i]) && b.get(t[i]) !== s[i]) return false;
    a.set(s[i], t[i]); b.set(t[i], s[i]);
  }
  return true;
}`),
      A('Pattern signature', 'Replace each character by the index of its first occurrence. Two strings are isomorphic exactly when their signatures are equal.', 'O(n)', 'O(n)', `function isIsomorphic(s, t) {
  const sig = (x) => [...x].map((c) => x.indexOf(c)).join(',');
  return s.length === t.length && sig(s) === sig(t);
}`, { note: 'indexOf makes this O(n·k) in the worst case; use a map of first positions for strict O(n).' })
    ]
  },
  {
    id: 'length-of-last-word', title: 'Length of Last Word', d: 'E', topic: 'Strings', roles: ['SDE'],
    desc: 'Given a string of words separated by spaces, return the length of the last word. The string may have trailing spaces.\n\nExample:\nInput: s = "   fly me   to   the moon  "\nOutput: 4',
    fn: 'lengthOfLastWord', params: 's', constraints: '1 ≤ length ≤ 10^4, at least one word',
    tests: [['Hello World'], ['   fly me   to   the moon  '], ['luffy is still joyboy'], ['a'], ['a '], ['  ab  c']],
    gen: (r) => [r.str(r.int(1, 10), 'ab  ').replace(/^ +$/, 'x') || 'x'],
    approaches: [
      A('Split into words', 'Split on spaces, drop empty pieces, and take the last one.', 'O(n)', 'O(n)', `function lengthOfLastWord(s) {
  const w = s.split(' ').filter(Boolean);
  return w[w.length - 1].length;
}`),
      A('Scan from the end', 'Skip trailing spaces, then count characters until the next space. Nothing is allocated.', 'O(n)', 'O(1)', `function lengthOfLastWord(s) {
  let i = s.length - 1, n = 0;
  while (i >= 0 && s[i] === ' ') i--;
  while (i >= 0 && s[i] !== ' ') { n++; i--; }
  return n;
}`)
    ]
  },
  {
    id: 'longest-common-prefix', title: 'Longest Common Prefix', d: 'E', topic: 'Strings', roles: ['SDE'],
    desc: 'Return the longest prefix shared by every string in the array, or an empty string if there is none.\n\nExample:\nInput: strs = ["flower","flow","flight"]\nOutput: "fl"',
    fn: 'longestCommonPrefix', params: 'strs', constraints: '1 ≤ n ≤ 200, 0 ≤ length ≤ 200',
    tests: [[['flower', 'flow', 'flight']], [['dog', 'racecar', 'car']], [['a']], [['', 'b']], [['ab', 'ab', 'ab']], [['interview', 'internet', 'internal', 'interval']]],
    gen: (r) => [Array.from({ length: r.int(1, 4) }, () => r.str(r.int(0, 5), 'ab'))],
    approaches: [
      A('Vertical scanning', 'Compare the characters at index 0, then 1, and so on across all strings, stopping at the first mismatch.', 'O(S)', 'O(1)', `function longestCommonPrefix(strs) {
  for (let i = 0; i < strs[0].length; i++)
    for (const s of strs)
      if (s[i] !== strs[0][i]) return strs[0].slice(0, i);
  return strs[0];
}`, { note: 'S is the total number of characters across all strings.' }),
      A('Shrink the prefix', 'Start with the first string as the prefix and trim it until every other string starts with it.', 'O(S)', 'O(1)', `function longestCommonPrefix(strs) {
  let p = strs[0];
  for (const s of strs) while (!s.startsWith(p)) p = p.slice(0, -1);
  return p;
}`),
      A('Sort and compare the extremes', 'After sorting, the first and last strings are the most different, so their common prefix is the answer for all.', 'O(n log n · m)', 'O(1)', `function longestCommonPrefix(strs) {
  const a = [...strs].sort();
  const x = a[0], y = a[a.length - 1];
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return x.slice(0, i);
}`)
    ]
  },
  {
    id: 'roman-to-integer', title: 'Roman to Integer', d: 'E', topic: 'Strings', roles: ['SDE'],
    desc: 'Convert a Roman numeral to an integer. Symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. A smaller symbol before a larger one is subtracted (IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900).\n\nExample:\nInput: s = "MCMXCIV"\nOutput: 1994',
    fn: 'romanToInt', params: 's', constraints: '1 ≤ length ≤ 15, valid numeral up to 3999',
    tests: [['III'], ['LVIII'], ['MCMXCIV'], ['IV'], ['IX'], ['XL'], ['MMMCMXCIX']],
    gen: (r) => { const syms = ['I', 'V', 'X', 'L', 'C', 'D', 'M']; const n = r.int(1, 3999); const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let x = n; let s = ''; for (const [v, c] of map) while (x >= v) { s += c; x -= v; } return [syms.length ? s : s]; },
    approaches: [
      A('Look at pairs', 'Check whether the next two characters form a subtractive pair (IV, IX, ...); if so add its value and skip two, else add one symbol.', 'O(n)', 'O(1)', `function romanToInt(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const pairs = { IV: 4, IX: 9, XL: 40, XC: 90, CD: 400, CM: 900 };
  let total = 0, i = 0;
  while (i < s.length) {
    if (pairs[s.slice(i, i + 2)]) { total += pairs[s.slice(i, i + 2)]; i += 2; }
    else { total += v[s[i]]; i++; }
  }
  return total;
}`),
      A('Subtract when smaller precedes larger', 'Add each symbol, but subtract it instead when the next symbol is larger.', 'O(n)', 'O(1)', `function romanToInt(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) total += v[s[i]] < (v[s[i + 1]] || 0) ? -v[s[i]] : v[s[i]];
  return total;
}`)
    ]
  },
  {
    id: 'add-binary', title: 'Add Binary', d: 'E', topic: 'Math', roles: ['SDE'],
    desc: 'Given two binary strings a and b, return their sum as a binary string.\n\nExample:\nInput: a = "1010", b = "1011"\nOutput: "10101"',
    fn: 'addBinary', params: 'a, b', constraints: '1 ≤ length ≤ 10^4',
    tests: [['11', '1'], ['1010', '1011'], ['0', '0'], ['1', '1'], ['111', '111'], ['100', '1']],
    gen: (r) => { const f = () => (1 + r.int(0, 30)).toString(2); return [f(), f()]; },
    approaches: [
      A('BigInt conversion', 'Parse both strings as BigInt, add, and print in base 2.', 'O(n)', 'O(n)', `function addBinary(a, b) {
  return (BigInt('0b' + a) + BigInt('0b' + b)).toString(2);
}`, { note: 'Handy, but interviews expect the manual carry loop.' }),
      A('Digit by digit with carry', 'Add from the least significant end, tracking a carry, exactly like school addition.', 'O(n)', 'O(n)', `function addBinary(a, b) {
  let i = a.length - 1, j = b.length - 1, carry = 0, out = '';
  while (i >= 0 || j >= 0 || carry) {
    const sum = (i >= 0 ? +a[i--] : 0) + (j >= 0 ? +b[j--] : 0) + carry;
    out = (sum % 2) + out;
    carry = sum > 1 ? 1 : 0;
  }
  return out;
}`)
    ]
  },
  {
    id: 'reverse-vowels', title: 'Reverse Vowels of a String', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Reverse only the vowels (a, e, i, o, u, in either case) of a string and leave every other character where it is.\n\nExample:\nInput: s = "hello"\nOutput: "holle"',
    fn: 'reverseVowels', params: 's', constraints: '1 ≤ length ≤ 3·10^5',
    tests: [['hello'], ['leetcode'], ['aA'], ['xyz'], ['Euston saw I was not Suse'], ['a.b,A']],
    gen: (r) => [r.str(r.int(1, 9), 'aeibcDA')],
    approaches: [
      A('Collect, reverse, refill', 'Collect the vowels, reverse that list, and put them back into the vowel positions.', 'O(n)', 'O(n)', `function reverseVowels(s) {
  const v = new Set('aeiouAEIOU');
  const vs = [...s].filter((c) => v.has(c)).reverse();
  let k = 0;
  return [...s].map((c) => (v.has(c) ? vs[k++] : c)).join('');
}`),
      A('Two pointers', 'Move inward from both ends, stop each pointer at a vowel and swap.', 'O(n)', 'O(n)', `function reverseVowels(s) {
  const v = new Set('aeiouAEIOU');
  const a = [...s];
  let i = 0, j = a.length - 1;
  while (i < j) {
    while (i < j && !v.has(a[i])) i++;
    while (i < j && !v.has(a[j])) j--;
    [a[i], a[j]] = [a[j], a[i]];
    i++; j--;
  }
  return a.join('');
}`, { note: 'The character array is a copy because JavaScript strings are immutable.' })
    ]
  },
  {
    id: 'reverse-words-iii', title: 'Reverse Words in a String III', d: 'E', topic: 'Strings', roles: ['SDE'],
    desc: 'Reverse the characters of every word in a sentence while keeping the word order and spaces.\n\nExample:\nInput: s = "Let\'s take LeetCode contest"\nOutput: "s\'teL ekat edoCteeL tsetnoc"',
    fn: 'reverseWords', params: 's', constraints: '1 ≤ length ≤ 5·10^4, single spaces between words',
    tests: [["Let's take LeetCode contest"], ['God Ding'], ['a'], ['ab cd ef'], ['racecar is a palindrome'], ['x y z']],
    gen: (r) => [Array.from({ length: r.int(1, 4) }, () => r.str(r.int(1, 5), 'abc')).join(' ')],
    approaches: [
      A('Split, reverse, join', 'Split into words, reverse each, and join with spaces.', 'O(n)', 'O(n)', `function reverseWords(s) {
  return s.split(' ').map((w) => w.split('').reverse().join('')).join(' ');
}`),
      A('Two pointers per word', 'Find each word boundary and swap characters from both ends of the word.', 'O(n)', 'O(n)', `function reverseWords(s) {
  const a = s.split('');
  let start = 0;
  for (let end = 0; end <= a.length; end++) {
    if (end === a.length || a[end] === ' ') {
      let i = start, j = end - 1;
      while (i < j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; }
      start = end + 1;
    }
  }
  return a.join('');
}`)
    ]
  },
  {
    id: 'detect-capital', title: 'Detect Capital', d: 'E', topic: 'Strings', roles: ['SDE'],
    desc: 'Return true if the capital usage in a word is correct: all letters capitals ("USA"), all lowercase ("leetcode"), or only the first letter capital ("Google").\n\nExample:\nInput: word = "FlaG"\nOutput: false',
    fn: 'detectCapitalUse', params: 'word', constraints: '1 ≤ length ≤ 100',
    tests: [['USA'], ['FlaG'], ['leetcode'], ['Google'], ['g'], ['G'], ['gOogle']],
    gen: (r) => [r.str(r.int(1, 6), 'aAbB')],
    approaches: [
      A('Count capitals', 'Count uppercase letters. Valid when the count is 0, equals the length, or is 1 and the first letter is the capital.', 'O(n)', 'O(1)', `function detectCapitalUse(word) {
  let up = 0;
  for (const c of word) if (c >= 'A' && c <= 'Z') up++;
  return up === 0 || up === word.length || (up === 1 && word[0] >= 'A' && word[0] <= 'Z');
}`),
      A('Compare with three forms', 'The word is valid if it equals its all-upper, all-lower or capitalised version.', 'O(n)', 'O(n)', `function detectCapitalUse(word) {
  return word === word.toUpperCase() || word === word.toLowerCase() || word === word[0].toUpperCase() + word.slice(1).toLowerCase();
}`)
    ]
  },
  {
    id: 'is-subsequence', title: 'Is Subsequence', d: 'E', topic: 'Two Pointers', roles: ['SDE'],
    desc: 'Return true if s is a subsequence of t: s can be formed by deleting some characters from t without changing the order of the rest.\n\nExample:\nInput: s = "abc", t = "ahbgdc"\nOutput: true',
    fn: 'isSubsequence', params: 's, t', constraints: '0 ≤ |s| ≤ 100, 0 ≤ |t| ≤ 10^4',
    tests: [['abc', 'ahbgdc'], ['axc', 'ahbgdc'], ['', 'abc'], ['a', ''], ['abc', 'abc'], ['aaa', 'aa']],
    gen: (r) => [r.str(r.int(0, 4), 'ab'), r.str(r.int(0, 8), 'ab')],
    approaches: [
      A('Recursion on prefixes', 'Compare the last characters: if they match, drop both, otherwise drop the last character of t.', 'O(n)', 'O(n)', `function isSubsequence(s, t) {
  const go = (i, j) => (i < 0 ? true : j < 0 ? false : s[i] === t[j] ? go(i - 1, j - 1) : go(i, j - 1));
  return go(s.length - 1, t.length - 1);
}`, { note: 'The recursion depth can reach |t|, which is why the iterative form is preferred.' }),
      A('Two pointers', 'Walk through t once and advance a pointer in s whenever the characters match.', 'O(n)', 'O(1)', `function isSubsequence(s, t) {
  let i = 0;
  for (let j = 0; j < t.length && i < s.length; j++) if (s[i] === t[j]) i++;
  return i === s.length;
}`)
    ]
  },
  {
    id: 'ransom-note', title: 'Ransom Note', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Return true if the ransom note can be built from the letters of the magazine, using each magazine letter at most once.\n\nExample:\nInput: ransomNote = "aa", magazine = "aab"\nOutput: true',
    fn: 'canConstruct', params: 'ransomNote, magazine', constraints: '1 ≤ length ≤ 10^5',
    tests: [['a', 'b'], ['aa', 'ab'], ['aa', 'aab'], ['', 'abc'], ['abc', 'cbaa'], ['aabb', 'abab']],
    gen: (r) => [r.str(r.int(0, 5), 'abc'), r.str(r.int(0, 8), 'abc')],
    approaches: [
      A('Remove letters one at a time', 'For each note letter find and delete one matching letter from the magazine.', 'O(n·m)', 'O(m)', `function canConstruct(ransomNote, magazine) {
  let m = magazine;
  for (const c of ransomNote) {
    const i = m.indexOf(c);
    if (i < 0) return false;
    m = m.slice(0, i) + m.slice(i + 1);
  }
  return true;
}`),
      A('Letter counts', 'Count the magazine letters, then spend one count per note letter; running out means false.', 'O(n + m)', 'O(1)', `function canConstruct(ransomNote, magazine) {
  const c = {};
  for (const ch of magazine) c[ch] = (c[ch] || 0) + 1;
  for (const ch of ransomNote) { if (!c[ch]) return false; c[ch]--; }
  return true;
}`)
    ]
  },
  {
    id: 'word-pattern', title: 'Word Pattern', d: 'E', topic: 'Hashing', roles: ['SDE'],
    desc: 'Given a pattern of letters and a string of words separated by spaces, return true if the words follow the pattern: each letter maps to exactly one word and each word to exactly one letter.\n\nExample:\nInput: pattern = "abba", s = "dog cat cat dog"\nOutput: true',
    fn: 'wordPattern', params: 'pattern, s', constraints: '1 ≤ pattern length ≤ 300',
    tests: [['abba', 'dog cat cat dog'], ['abba', 'dog cat cat fish'], ['aaaa', 'dog cat cat dog'], ['abba', 'dog dog dog dog'], ['a', 'x'], ['ab', 'x']],
    gen: (r) => { const n = r.int(1, 5); return [r.str(n, 'abc'), Array.from({ length: r.int(n === 1 ? 1 : n - 1, n + 1) }, () => r.pick(['x', 'y', 'z'])).join(' ')]; },
    approaches: [
      A('Two maps', 'Map each letter to a word and each word to a letter and reject any conflict.', 'O(n)', 'O(n)', `function wordPattern(pattern, s) {
  const w = s.split(' ');
  if (w.length !== pattern.length) return false;
  const a = new Map(), b = new Map();
  for (let i = 0; i < w.length; i++) {
    if (a.has(pattern[i]) && a.get(pattern[i]) !== w[i]) return false;
    if (b.has(w[i]) && b.get(w[i]) !== pattern[i]) return false;
    a.set(pattern[i], w[i]); b.set(w[i], pattern[i]);
  }
  return true;
}`),
      A('First-occurrence signature', 'Turn both sequences into lists of first-occurrence indices and compare them.', 'O(n²)', 'O(n)', `function wordPattern(pattern, s) {
  const w = s.split(' ');
  if (w.length !== pattern.length) return false;
  const p = [...pattern];
  return p.every((c, i) => p.indexOf(c) === w.indexOf(w[i]));
}`, { note: 'indexOf makes this quadratic; the two-map version is linear.' })
    ]
  }
];
