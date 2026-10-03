const { A } = require('../dsl.cjs');
const J = (x) => JSON.stringify(x);
const LIST_NOTE = '// ListNode { val, next } is predefined. Test inputs are built with fromList([..]).';

module.exports = [
  {
    id: 'reverse-linked-list', title: 'Reverse Linked List', d: 'E', topic: 'Linked Lists', roles: ['SDE', 'Backend Developer'],
    desc: 'Reverse a singly linked list and return the new head. Tests build the input with fromList and read the result with toList.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]',
    fn: 'reverseList', params: 'head', constraints: '0 ≤ n ≤ 5000',
    starter: `function reverseList(head) {\n  ${LIST_NOTE}\n  // Your code here\n}`,
    expr: (a) => `toList(reverseList(fromList(${J(a)})))`,
    tests: [[[1, 2, 3, 4, 5]], [[1, 2]], [[]], [[7]], [[3, 3, 1]], [[9, 8, 7, 6, 5, 4]]],
    gen: (r) => [r.arr(r.int(0, 8), 0, 9)],
    approaches: [
      A('Copy values into an array', 'Read the values into an array, reverse it, and rebuild a list. Simple but allocates a second structure.', 'O(n)', 'O(n)', `function reverseList(head) {
  const vals = [];
  for (let p = head; p; p = p.next) vals.push(p.val);
  let out = null;
  for (const v of vals) out = new ListNode(v, out);
  return out;
}`),
      A('Recursion', 'Reverse the rest of the list, then point the next node back at the current one.', 'O(n)', 'O(n)', `function reverseList(head) {
  if (!head || !head.next) return head;
  const newHead = reverseList(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}`, { note: 'The call stack grows with the list, so very long lists can overflow it.' }),
      A('Iterative pointer flipping', 'Walk the list and point each node at the previous one, keeping prev and next pointers.', 'O(n)', 'O(1)', `function reverseList(head) {
  let prev = null;
  while (head) { const next = head.next; head.next = prev; prev = head; head = next; }
  return prev;
}`)
    ]
  },
  {
    id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', d: 'E', topic: 'Linked Lists', roles: ['SDE', 'Backend Developer'],
    desc: 'Merge two sorted linked lists into one sorted list and return its head.\n\nExample:\nInput: l1 = [1,2,4], l2 = [1,3,4]\nOutput: [1,1,2,3,4,4]',
    fn: 'mergeTwoLists', params: 'l1, l2', constraints: '0 ≤ length ≤ 50',
    starter: `function mergeTwoLists(l1, l2) {\n  ${LIST_NOTE}\n  // Your code here\n}`,
    expr: (a, b) => `toList(mergeTwoLists(fromList(${J(a)}), fromList(${J(b)})))`,
    tests: [[[1, 2, 4], [1, 3, 4]], [[], []], [[], [0]], [[5], [1, 2, 3]], [[1, 1], [1, 1]], [[2, 4, 6], [1, 3, 5, 7]]],
    gen: (r) => [r.sorted(r.int(0, 6), 0, 9), r.sorted(r.int(0, 6), 0, 9)],
    approaches: [
      A('Collect, sort, rebuild', 'Put every value in an array, sort it, and build a new list. Ignores that the lists are already sorted.', 'O((n+m) log(n+m))', 'O(n+m)', `function mergeTwoLists(l1, l2) {
  const v = [];
  for (let p = l1; p; p = p.next) v.push(p.val);
  for (let p = l2; p; p = p.next) v.push(p.val);
  v.sort((a, b) => a - b);
  let out = null;
  for (let i = v.length - 1; i >= 0; i--) out = new ListNode(v[i], out);
  return out;
}`),
      A('Recursive merge', 'Pick the smaller head, then merge the remaining nodes recursively.', 'O(n + m)', 'O(n + m)', `function mergeTwoLists(l1, l2) {
  if (!l1) return l2;
  if (!l2) return l1;
  if (l1.val <= l2.val) { l1.next = mergeTwoLists(l1.next, l2); return l1; }
  l2.next = mergeTwoLists(l1, l2.next);
  return l2;
}`),
      A('Iterative with a dummy head', 'A dummy node avoids special cases for the first node. Relink the smaller node each step.', 'O(n + m)', 'O(1)', `function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let t = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { t.next = l1; l1 = l1.next; } else { t.next = l2; l2 = l2.next; }
    t = t.next;
  }
  t.next = l1 || l2;
  return dummy.next;
}`)
    ]
  },
  {
    id: 'middle-linked-list', title: 'Middle of the Linked List', d: 'E', topic: 'Linked Lists', roles: ['SDE'],
    desc: 'Return the middle node of a linked list (the second middle if there are two). The tests print the values from the returned node to the end.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [3,4,5]',
    fn: 'middleNode', params: 'head', constraints: '1 ≤ n ≤ 100',
    starter: `function middleNode(head) {\n  ${LIST_NOTE}\n  // Your code here\n}`,
    expr: (a) => `toList(middleNode(fromList(${J(a)})))`,
    tests: [[[1, 2, 3, 4, 5]], [[1, 2, 3, 4, 5, 6]], [[1]], [[1, 2]], [[4, 5, 6]], [[9, 8, 7, 6]]],
    gen: (r) => [r.arr(r.int(1, 9), 0, 9)],
    approaches: [
      A('Count then walk', 'Count the nodes, then walk n/2 steps. Two passes.', 'O(n)', 'O(1)', `function middleNode(head) {
  let n = 0;
  for (let p = head; p; p = p.next) n++;
  let p = head;
  for (let i = 0; i < Math.floor(n / 2); i++) p = p.next;
  return p;
}`),
      A('Store nodes in an array', 'Put every node in an array and index into the middle.', 'O(n)', 'O(n)', `function middleNode(head) {
  const a = [];
  for (let p = head; p; p = p.next) a.push(p);
  return a[Math.floor(a.length / 2)];
}`),
      A('Slow and fast pointers', 'Move one pointer one step and another two steps. When the fast one reaches the end, the slow one is in the middle. One pass.', 'O(n)', 'O(1)', `function middleNode(head) {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  return slow;
}`)
    ]
  },
  {
    id: 'linked-list-cycle', title: 'Linked List Cycle', d: 'E', topic: 'Linked Lists', roles: ['SDE', 'Backend Developer'],
    desc: 'Return true if the linked list has a cycle. The tests build the list with fromListCycle(values, pos), where the tail connects back to the node at index pos (pos = -1 means no cycle).\n\nExample:\nInput: values = [3,2,0,-4], pos = 1\nOutput: true',
    fn: 'hasCycle', params: 'head', constraints: '0 ≤ n ≤ 10^4',
    starter: `function hasCycle(head) {\n  // ListNode { val, next } is predefined. Tests use fromListCycle(values, pos).\n  // Your code here\n}`,
    expr: (a, pos) => `hasCycle(fromListCycle(${J(a)}, ${pos}))`,
    tests: [[[3, 2, 0, -4], 1], [[1, 2], 0], [[1], -1], [[], -1], [[1, 2, 3, 4, 5], -1], [[1, 2, 3, 4, 5], 4], [[1], 0]],
    gen: (r) => { const n = r.int(0, 8); return [r.arr(n, 0, 9), n ? r.int(-1, n - 1) : -1]; },
    approaches: [
      A('Remember visited nodes', 'Keep a set of nodes already seen; meeting one again means a cycle.', 'O(n)', 'O(n)', `function hasCycle(head) {
  const seen = new Set();
  for (let p = head; p; p = p.next) {
    if (seen.has(p)) return true;
    seen.add(p);
  }
  return false;
}`),
      A('Floyd tortoise and hare', 'Move a slow pointer by one and a fast pointer by two. If there is a cycle the fast pointer eventually catches the slow one. No extra memory.', 'O(n)', 'O(1)', `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`)
    ]
  },
  {
    id: 'remove-linked-list-elements', title: 'Remove Linked List Elements', d: 'E', topic: 'Linked Lists', roles: ['SDE'],
    desc: 'Remove every node whose value equals val from a linked list and return the new head.\n\nExample:\nInput: head = [1,2,6,3,4,5,6], val = 6\nOutput: [1,2,3,4,5]',
    fn: 'removeElements', params: 'head, val', constraints: '0 ≤ n ≤ 10^4',
    starter: `function removeElements(head, val) {\n  ${LIST_NOTE}\n  // Your code here\n}`,
    expr: (a, v) => `toList(removeElements(fromList(${J(a)}), ${v}))`,
    tests: [[[1, 2, 6, 3, 4, 5, 6], 6], [[], 1], [[7, 7, 7, 7], 7], [[1, 2, 3], 5], [[2, 1], 2], [[5, 1, 5], 5]],
    gen: (r) => [r.arr(r.int(0, 8), 0, 3), r.int(0, 3)],
    approaches: [
      A('Rebuild from values', 'Collect the values that are not val and build a fresh list.', 'O(n)', 'O(n)', `function removeElements(head, val) {
  const v = [];
  for (let p = head; p; p = p.next) if (p.val !== val) v.push(p.val);
  let out = null;
  for (let i = v.length - 1; i >= 0; i--) out = new ListNode(v[i], out);
  return out;
}`),
      A('Recursion', 'Clean the rest of the list, then decide whether to keep the current node.', 'O(n)', 'O(n)', `function removeElements(head, val) {
  if (!head) return null;
  head.next = removeElements(head.next, val);
  return head.val === val ? head.next : head;
}`),
      A('Dummy head and relinking', 'A dummy node in front handles the case where the head itself must go. Skip matching nodes by relinking.', 'O(n)', 'O(1)', `function removeElements(head, val) {
  const dummy = new ListNode(0, head);
  let p = dummy;
  while (p.next) { if (p.next.val === val) p.next = p.next.next; else p = p.next; }
  return dummy.next;
}`)
    ]
  },
  {
    id: 'palindrome-linked-list', title: 'Palindrome Linked List', d: 'E', topic: 'Linked Lists', roles: ['SDE'],
    desc: 'Return true if the values of a linked list read the same forwards and backwards.\n\nExample:\nInput: head = [1,2,2,1]\nOutput: true',
    fn: 'isPalindromeList', params: 'head', constraints: '1 ≤ n ≤ 10^5',
    starter: `function isPalindromeList(head) {\n  ${LIST_NOTE}\n  // Your code here\n}`,
    expr: (a) => `isPalindromeList(fromList(${J(a)}))`,
    tests: [[[1, 2, 2, 1]], [[1, 2]], [[1]], [[1, 2, 3, 2, 1]], [[1, 2, 3]], [[5, 5]], [[1, 0, 0]]],
    gen: (r) => [r.arr(r.int(1, 8), 0, 2)],
    approaches: [
      A('Copy to an array', 'Read the values into an array and compare it with its reverse.', 'O(n)', 'O(n)', `function isPalindromeList(head) {
  const a = [];
  for (let p = head; p; p = p.next) a.push(p.val);
  for (let i = 0, j = a.length - 1; i < j; i++, j--) if (a[i] !== a[j]) return false;
  return true;
}`),
      A('Reverse the second half', 'Find the middle with slow/fast pointers, reverse the second half in place, and compare the two halves.', 'O(n)', 'O(1)', `function isPalindromeList(head) {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  let prev = null;
  while (slow) { const n = slow.next; slow.next = prev; prev = slow; slow = n; }
  for (let a = head, b = prev; b; a = a.next, b = b.next) if (a.val !== b.val) return false;
  return true;
}`, { note: 'This changes the list. Restore it by reversing the second half again if the caller needs it intact.' })
    ]
  },
  {
    id: 'remove-duplicates-sorted-list', title: 'Remove Duplicates from Sorted List', d: 'E', topic: 'Linked Lists', roles: ['SDE'],
    desc: 'Given the head of a sorted linked list, delete duplicates so each value appears once. Return the list.\n\nExample:\nInput: head = [1,1,2,3,3]\nOutput: [1,2,3]',
    fn: 'deleteDuplicates', params: 'head', constraints: '0 ≤ n ≤ 300',
    starter: `function deleteDuplicates(head) {\n  ${LIST_NOTE}\n  // Your code here\n}`,
    expr: (a) => `toList(deleteDuplicates(fromList(${J(a)})))`,
    tests: [[[1, 1, 2]], [[1, 1, 2, 3, 3]], [[]], [[1]], [[2, 2, 2]], [[1, 2, 3]]],
    gen: (r) => [r.sorted(r.int(0, 8), 0, 4)],
    approaches: [
      A('Set of seen values then rebuild', 'Collect distinct values with a set and build a new list.', 'O(n)', 'O(n)', `function deleteDuplicates(head) {
  const v = [...new Set((() => { const a = []; for (let p = head; p; p = p.next) a.push(p.val); return a; })())];
  let out = null;
  for (let i = v.length - 1; i >= 0; i--) out = new ListNode(v[i], out);
  return out;
}`),
      A('Skip equal neighbours', 'Because the list is sorted, duplicates are adjacent. Relink past each node that equals its successor.', 'O(n)', 'O(1)', `function deleteDuplicates(head) {
  for (let p = head; p && p.next; ) {
    if (p.val === p.next.val) p.next = p.next.next; else p = p.next;
  }
  return head;
}`)
    ]
  },
  {
    id: 'valid-parentheses', title: 'Valid Parentheses', d: 'E', topic: 'Stacks', roles: ['SDE', 'Backend Developer'],
    desc: 'Given a string of brackets ()[]{}, return true if every opening bracket is closed by the same type in the correct order.\n\nExample:\nInput: s = "()[]{}"\nOutput: true',
    fn: 'isValid', params: 's', constraints: '1 ≤ length ≤ 10^4',
    tests: [['()'], ['()[]{}'], ['(]'], ['([)]'], ['{[]}'], [''], ['(('], ['))']],
    gen: (r) => [r.str(r.int(0, 8), '()[]{}')],
    approaches: [
      A('Keep deleting matching pairs', 'Repeatedly remove "()", "[]" and "{}" from the string. Valid if it becomes empty.', 'O(n²)', 'O(n)', `function isValid(s) {
  let prev;
  do { prev = s; s = s.replace('()', '').replace('[]', '').replace('{}', ''); } while (s !== prev);
  return s === '';
}`),
      A('Stack', 'Push opening brackets. On a closing bracket the top of the stack must be its partner. Valid if the stack ends empty.', 'O(n)', 'O(n)', `function isValid(s) {
  const pair = { ')': '(', ']': '[', '}': '{' };
  const st = [];
  for (const c of s) {
    if (pair[c]) { if (st.pop() !== pair[c]) return false; }
    else st.push(c);
  }
  return st.length === 0;
}`)
    ]
  },
  {
    id: 'implement-queue-stacks', title: 'Implement Queue using Stacks', d: 'E', topic: 'Stacks', roles: ['SDE'],
    desc: 'Implement a first-in-first-out queue using only two stacks (arrays used with push and pop only). Class MyQueue needs push(x), pop(), peek() and empty().\n\nExample:\nq.push(1); q.push(2); q.peek() → 1; q.pop() → 1; q.empty() → false',
    fn: 'MyQueue', params: '', constraints: '1 ≤ x ≤ 9, at most 100 calls',
    starter: `class MyQueue {\n  constructor() {\n    // Your code here\n  }\n  push(x) {}\n  pop() {}\n  peek() {}\n  empty() {}\n}`,
    tests: [
      { expr: '(() => { const q = new MyQueue(); q.push(1); q.push(2); return [q.peek(), q.pop(), q.empty()]; })()' },
      { expr: '(() => { const q = new MyQueue(); return [q.empty()]; })()' },
      { expr: '(() => { const q = new MyQueue(); q.push(5); return [q.pop(), q.empty()]; })()' },
      { expr: '(() => { const q = new MyQueue(); q.push(1); q.push(2); q.push(3); return [q.pop(), q.pop(), q.peek(), q.empty()]; })()' },
      { expr: '(() => { const q = new MyQueue(); q.push(1); q.pop(); q.push(2); q.push(3); return [q.pop(), q.peek(), q.pop(), q.empty()]; })()' },
      { expr: '(() => { const q = new MyQueue(); q.push(4); q.push(5); const a = q.pop(); q.push(6); return [a, q.pop(), q.pop(), q.empty()]; })()' }
    ],
    approaches: [
      A('Costly push', 'On every push move everything to a helper stack, add the new item at the bottom, and move everything back. pop and peek are then trivial.', 'O(n)', 'O(n)', `class MyQueue {
  constructor() { this.s = []; }
  push(x) { const t = []; while (this.s.length) t.push(this.s.pop()); this.s.push(x); while (t.length) this.s.push(t.pop()); }
  pop() { return this.s.pop(); }
  peek() { return this.s[this.s.length - 1]; }
  empty() { return this.s.length === 0; }
}`, { note: 'Time shown is for push; pop, peek and empty are O(1).' }),
      A('Two stacks, amortised', 'Push onto an input stack. When asked for the front, pour the input stack into an output stack only if it is empty. Each element moves at most twice, so operations are O(1) on average.', 'O(1)', 'O(n)', `class MyQueue {
  constructor() { this.inn = []; this.out = []; }
  push(x) { this.inn.push(x); }
  _move() { if (!this.out.length) while (this.inn.length) this.out.push(this.inn.pop()); }
  pop() { this._move(); return this.out.pop(); }
  peek() { this._move(); return this.out[this.out.length - 1]; }
  empty() { return !this.inn.length && !this.out.length; }
}`, { note: 'Amortised O(1) per operation; a single pop can still cost O(n) when it triggers the move.' })
    ]
  },
  {
    id: 'meeting-rooms', title: 'Meeting Rooms', d: 'E', topic: 'Intervals', roles: ['SDE', 'Backend Developer'],
    desc: 'Given an array of meeting time intervals [start, end], return true if one person could attend every meeting (no two meetings overlap).\n\nExample:\nInput: intervals = [[0,30],[5,10],[15,20]]\nOutput: false',
    fn: 'canAttendMeetings', params: 'intervals', constraints: '0 ≤ n ≤ 10^4',
    tests: [[[[0, 30], [5, 10], [15, 20]]], [[[7, 10], [2, 4]]], [[]], [[[1, 5]]], [[[1, 5], [5, 8]]], [[[1, 5], [4, 8]]], [[[13, 15], [1, 13]]]],
    gen: (r) => [Array.from({ length: r.int(0, 5) }, () => { const s = r.int(0, 20); return [s, s + r.int(1, 6)]; })],
    approaches: [
      A('Compare every pair', 'Two meetings overlap if one starts before the other ends. Check all pairs.', 'O(n²)', 'O(1)', `function canAttendMeetings(intervals) {
  for (let i = 0; i < intervals.length; i++)
    for (let j = i + 1; j < intervals.length; j++)
      if (intervals[i][0] < intervals[j][1] && intervals[j][0] < intervals[i][1]) return false;
  return true;
}`),
      A('Sort by start time', 'After sorting by start, only neighbouring meetings can overlap.', 'O(n log n)', 'O(1)', `function canAttendMeetings(intervals) {
  const a = [...intervals].sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < a.length; i++) if (a[i][0] < a[i - 1][1]) return false;
  return true;
}`)
    ]
  },
  {
    id: 'first-bad-version', title: 'First Bad Version', d: 'E', topic: 'Searching', roles: ['SDE'],
    desc: 'Versions 1..n were released and from some version onwards every version is bad. You are given a function isBadVersion(v). Return the first bad version using as few calls as possible. Write firstBadVersion(isBadVersion) so that it returns a function of n.\n\nExample:\nn = 5, first bad = 4\nOutput: 4',
    fn: 'firstBadVersion', params: 'isBadVersion', constraints: '1 ≤ bad ≤ n ≤ 2^31 - 1', sizes: [10, 1000, 100000, 10000000, 1000000000, 2000000000],
    starter: 'function firstBadVersion(isBadVersion) {\n  return function (n) {\n    // Your code here\n  };\n}',
    expr: (n, bad) => `firstBadVersion((v) => v >= ${bad})(${n})`,
    tests: [[5, 4], [1, 1], [10, 1], [10, 10], [100, 37], [2126753390, 1702766719], [7, 6]],
    gen: (r) => { const n = r.int(1, 40); return [n, r.int(1, n)]; },
    approaches: [
      A('Check every version', 'Call isBadVersion for 1, 2, 3, ... until one is bad.', 'O(n)', 'O(1)', `function firstBadVersion(isBadVersion) {
  return function (n) {
    for (let v = 1; v <= n; v++) if (isBadVersion(v)) return v;
  };
}`, { note: 'With a billion versions this would make a billion calls.' }),
      A('Binary search', 'Versions go good, good, ..., bad, bad. Test the middle: if it is bad the answer is at or before it, otherwise after it.', 'O(log n)', 'O(1)', `function firstBadVersion(isBadVersion) {
  return function (n) {
    let lo = 1, hi = n;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (isBadVersion(mid)) hi = mid; else lo = mid + 1;
    }
    return lo;
  };
}`, { note: 'lo + (hi - lo) / 2 avoids integer overflow in languages with fixed-size integers.' })
    ]
  },
  {
    id: 'backspace-string-compare', title: 'Backspace String Compare', d: 'E', topic: 'Stacks', roles: ['SDE'],
    desc: 'Two strings are typed into empty text editors where # means backspace (a backspace on empty text does nothing). Return true if both editors end up with the same text.\n\nExample:\nInput: s = "ab#c", t = "ad#c"\nOutput: true',
    fn: 'backspaceCompare', params: 's, t', constraints: '1 ≤ length ≤ 200',
    tests: [['ab#c', 'ad#c'], ['ab##', 'c#d#'], ['a#c', 'b'], ['a##c', '#a#c'], ['', '#'], ['xywrrmp', 'xywrrmu#p']],
    gen: (r) => [r.str(r.int(0, 8), 'ab#'), r.str(r.int(0, 8), 'ab#')],
    approaches: [
      A('Build both strings with a stack', 'Push letters and pop on #, then compare the two results.', 'O(n + m)', 'O(n + m)', `function backspaceCompare(s, t) {
  const build = (x) => { const st = []; for (const c of x) { if (c === '#') st.pop(); else st.push(c); } return st.join(''); };
  return build(s) === build(t);
}`),
      A('Two pointers from the end', 'Scan both strings from the right, skipping characters that a # erases, and compare the surviving characters one by one. No extra strings.', 'O(n + m)', 'O(1)', `function backspaceCompare(s, t) {
  const next = (x, i) => { let skip = 0; while (i >= 0) { if (x[i] === '#') { skip++; i--; } else if (skip > 0) { skip--; i--; } else break; } return i; };
  let i = s.length - 1, j = t.length - 1;
  while (i >= 0 || j >= 0) {
    i = next(s, i); j = next(t, j);
    if (i < 0 && j < 0) return true;
    if (i < 0 || j < 0 || s[i] !== t[j]) return false;
    i--; j--;
  }
  return true;
}`)
    ]
  },
  {
    id: 'baseball-game', title: 'Baseball Game', d: 'E', topic: 'Stacks', roles: ['SDE'],
    desc: 'You record the scores of a game. Each operation is either an integer (a new score), "+" (the sum of the previous two scores), "D" (double the previous score) or "C" (cancel and remove the previous score). Return the sum of all scores after applying every operation.\n\nExample:\nInput: ops = ["5","2","C","D","+"]\nOutput: 30',
    fn: 'calPoints', params: 'ops', constraints: '1 ≤ n ≤ 1000',
    tests: [[['5', '2', 'C', 'D', '+']], [['5', '-2', '4', 'C', 'D', '9', '+', '+']], [['1']], [['1', 'C']], [['3', '4', '+', 'D', 'C']], [['10', 'D', 'D', 'C']]],
    gen: (r) => { const ops = [String(r.int(1, 9)), String(r.int(1, 9))]; for (let i = 0; i < r.int(0, 5); i++) ops.push(r.pick(['+', 'D', 'C', String(r.int(-5, 9))])); const st = []; const ok = []; for (const o of ops) { if (o === 'C') { if (!st.length) continue; st.pop(); } else if (o === 'D') { if (!st.length) continue; st.push(st[st.length - 1] * 2); } else if (o === '+') { if (st.length < 2) continue; st.push(st[st.length - 1] + st[st.length - 2]); } else st.push(+o); ok.push(o); } return [ok]; },
    approaches: [
      A('Keep a list of scores', 'Maintain the list of valid scores and apply each operation to its end. Sum the list at the end.', 'O(n)', 'O(n)', `function calPoints(ops) {
  const s = [];
  for (const o of ops) {
    if (o === 'C') s.pop();
    else if (o === 'D') s.push(s[s.length - 1] * 2);
    else if (o === '+') s.push(s[s.length - 1] + s[s.length - 2]);
    else s.push(Number(o));
  }
  return s.reduce((a, b) => a + b, 0);
}`),
      A('Running total with a stack', 'Same stack, but update the total as scores are added and cancelled, so no final pass is needed.', 'O(n)', 'O(n)', `function calPoints(ops) {
  const s = [];
  let total = 0;
  for (const o of ops) {
    if (o === 'C') total -= s.pop();
    else {
      const v = o === 'D' ? s[s.length - 1] * 2 : o === '+' ? s[s.length - 1] + s[s.length - 2] : Number(o);
      s.push(v); total += v;
    }
  }
  return total;
}`)
    ]
  },
  {
    id: 'make-the-string-great', title: 'Make The String Great', d: 'E', topic: 'Stacks', roles: ['SDE'],
    desc: 'A string is good if it has no two adjacent characters that are the same letter in different cases (like "aA" or "Bb"). Repeatedly remove such adjacent pairs until the string is good, and return it.\n\nExample:\nInput: s = "leEeetcode"\nOutput: "leetcode"',
    fn: 'makeGood', params: 's', constraints: '1 ≤ length ≤ 100',
    tests: [['leEeetcode'], ['abBAcC'], ['s'], ['aA'], ['Pp'], ['abc'], ['aaBbAA']],
    gen: (r) => [r.str(r.int(0, 9), 'aAbB')],
    approaches: [
      A('Rescan after each removal', 'Find an adjacent pair that differs only by case, remove it, and start again until none is left.', 'O(n²)', 'O(n)', `function makeGood(s) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i + 1 < s.length; i++) {
      if (s[i] !== s[i + 1] && s[i].toLowerCase() === s[i + 1].toLowerCase()) { s = s.slice(0, i) + s.slice(i + 2); changed = true; break; }
    }
  }
  return s;
}`),
      A('Stack', 'Push characters; if the new one cancels the top (same letter, different case) pop instead. A single pass handles all cascades.', 'O(n)', 'O(n)', `function makeGood(s) {
  const st = [];
  for (const c of s) {
    const t = st[st.length - 1];
    if (t && t !== c && t.toLowerCase() === c.toLowerCase()) st.pop(); else st.push(c);
  }
  return st.join('');
}`)
    ]
  },
  {
    id: 'remove-outer-parentheses', title: 'Remove Outermost Parentheses', d: 'E', topic: 'Stacks', roles: ['SDE'],
    desc: 'A valid parentheses string splits into primitive pieces (the shortest non-empty balanced parts). Remove the outermost pair of parentheses from each primitive piece and return the result.\n\nExample:\nInput: s = "(()())(())"\nOutput: "()()()"',
    fn: 'removeOuterParentheses', params: 's', constraints: '1 ≤ length ≤ 10^5, s is a valid parentheses string',
    tests: [['(()())(())'], ['(()())(())(()(()))'], ['()()'], ['()'], ['((()))'], ['(())()']],
    gen: (r) => { const mk = (d) => { let s = ''; const parts = r.int(1, 3); for (let i = 0; i < parts; i++) s += '(' + (d > 0 && r.next() < 0.6 ? mk(d - 1) : '') + ')'; return s; }; return [mk(3)]; },
    approaches: [
      A('Split into pieces with a stack', 'Track depth; whenever depth returns to zero a primitive piece ended. Strip its first and last characters.', 'O(n)', 'O(n)', `function removeOuterParentheses(s) {
  const pieces = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    depth += s[i] === '(' ? 1 : -1;
    if (depth === 0) { pieces.push(s.slice(start + 1, i)); start = i + 1; }
  }
  return pieces.join('');
}`),
      A('Depth counter', 'Keep a character unless it is the opening bracket that takes depth from 0 to 1 or the closing one that returns it to 0.', 'O(n)', 'O(1)', `function removeOuterParentheses(s) {
  let depth = 0, out = '';
  for (const c of s) {
    if (c === '(') { if (depth++ > 0) out += c; }
    else { if (--depth > 0) out += c; }
  }
  return out;
}`, { note: 'Space is O(1) apart from the output string.' })
    ]
  }
];
