/* ============================================================================
   EXTRA CODING QUESTION BANK
   Extends the base FALLBACK_CODING bank (js/data/coding-fallback.js) with
   29 additional LeetCode / HackerRank style questions.
   Combined with the 32 base questions this yields a total bank of 61.
   Structured fields per question (same contract as coding-fallback.js):
     id, title, source ("LeetCode" | "HackerRank"), difficulty,
     targetRoles (array), topic, description, starterCode, testCases,
     solution (with explanation)
   Consumed by js/coding.js which merges [...FALLBACK_CODING, ...EXTRA_CODING].
   ========================================================================== */

const EXTRA_CODING = [
  /* ================= EASY — ARRAYS / STRINGS ================= */
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Hashing",
    description: "Given two strings s and t, return true if t is an anagram of s, otherwise false.\n\nExample:\nInput: s = 'anagram', t = 'nagaram'\nOutput: true",
    starterCode: `function isAnagram(s, t) {\n  // Your code here\n}`,
    testCases: [
      { input: "isAnagram('anagram','nagaram')", expected: "true" },
      { input: "isAnagram('rat','car')", expected: "false" },
      { input: "isAnagram('','')", expected: "true" }
    ],
    solution: "Count character frequencies in a map; verify both strings match. O(n) time, O(1) space (fixed alphabet).",
    explanation: "Frequency map comparison."
  },
  {
    id: "missing-number",
    title: "Missing Number",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Arrays",
    description: "Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.\n\nExample:\nInput: nums = [3,0,1]\nOutput: 2",
    starterCode: `function missingNumber(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "missingNumber([3,0,1])", expected: "2" },
      { input: "missingNumber([0,1])", expected: "2" },
      { input: "missingNumber([9,6,4,2,3,5,7,0,1])", expected: "8" }
    ],
    solution: "Sum of range 0..n minus sum of nums gives the missing number. O(n) time, O(1) space.",
    explanation: "Gauss formula: n*(n+1)/2 - sum(nums)."
  },
  {
    id: "single-number",
    title: "Single Number",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Bit Manipulation",
    description: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.\n\nExample:\nInput: nums = [2,2,1]\nOutput: 1",
    starterCode: `function singleNumber(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "singleNumber([2,2,1])", expected: "1" },
      { input: "singleNumber([4,1,2,1,2])", expected: "4" },
      { input: "singleNumber([1])", expected: "1" }
    ],
    solution: "XOR all elements; duplicates cancel out. O(n) time, O(1) space.",
    explanation: "a XOR a = 0, a XOR 0 = a."
  },
  {
    id: "intersection-two-arrays",
    title: "Intersection of Two Arrays",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Hashing",
    description: "Given two integer arrays nums1 and nums2, return an array of their intersection. Each element in the result must be unique.\n\nExample:\nInput: nums1=[1,2,2,1], nums2=[2,2]\nOutput: [2]",
    starterCode: `function intersection(nums1, nums2) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(intersection([1,2,2,1],[2,2]).sort())", expected: "[2]" },
      { input: "JSON.stringify(intersection([4,9,5],[9,4,9,8,4]).sort())", expected: "[4,9]" },
      { input: "JSON.stringify(intersection([1,2],[3,4]))", expected: "[]" }
    ],
    solution: "Put smaller array in a Set, then filter the other for elements present. O(n+m) time.",
    explanation: "Set-based intersection with uniqueness."
  },
  {
    id: "first-unique-char",
    title: "First Unique Character",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Strings",
    description: "Given a string s, return the index of the first non-repeating character, or -1 if none exists.\n\nExample:\nInput: s = 'leetcode'\nOutput: 0",
    starterCode: `function firstUniqChar(s) {\n  // Your code here\n}`,
    testCases: [
      { input: "firstUniqChar('leetcode')", expected: "0" },
      { input: "firstUniqChar('loveleetcode')", expected: "2" },
      { input: "firstUniqChar('aabb')", expected: "-1" }
    ],
    solution: "Count frequencies, then scan for the first char with count 1. O(n) time.",
    explanation: "Frequency map + single scan."
  },
  {
    id: "isomorphic-strings",
    title: "Isomorphic Strings",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Hashing",
    description: "Given two strings s and t, return true if they are isomorphic (one-to-one mapping of characters).\n\nExample:\nInput: s = 'egg', t = 'add'\nOutput: true",
    starterCode: `function isIsomorphic(s, t) {\n  // Your code here\n}`,
    testCases: [
      { input: "isIsomorphic('egg','add')", expected: "true" },
      { input: "isIsomorphic('foo','bar')", expected: "false" },
      { input: "isIsomorphic('paper','title')", expected: "true" }
    ],
    solution: "Use two maps to enforce bidirectional mapping. O(n) time.",
    explanation: "Bidirectional character mapping."
  },

  /* ================= EASY/MEDIUM — LINKED LISTS ================= */
  {
    id: "reverse-linked-list",
    title: "Reverse Linked List",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Linked Lists",
    description: "Given the head of a singly linked list ({val, next}), reverse it and return the new head.\n\nExample:\nInput: 1->2->3->4->5\nOutput: 5->4->3->2->1",
    starterCode: `function reverseList(head) {\n  // head: {val, next} | null\n  // Your code here\n}`,
    testCases: [
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}function toArr(h){let a=[];while(h){a.push(h.val);h=h.next;}return a;}return JSON.stringify(toArr(reverseList(mk([1,2,3,4,5]))));})()", expected: "[5,4,3,2,1]" },
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}function toArr(h){let a=[];while(h){a.push(h.val);h=h.next;}return a;}return JSON.stringify(toArr(reverseList(mk([1]))));})()", expected: "[1]" },
      { input: "JSON.stringify(reverseList(null))", expected: "null" }
    ],
    solution: "Iterative three-pointer reversal. O(n) time, O(1) space.",
    explanation: "prev/curr/next pointer walk."
  },
  {
    id: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Linked Lists",
    description: "Merge two sorted linked lists into one sorted linked list and return its head.\n\nExample:\nInput: 1->2->4 and 1->3->4\nOutput: 1->1->2->3->4->4",
    starterCode: `function mergeTwoLists(l1, l2) {\n  // l1,l2: {val, next} | null\n  // Your code here\n}`,
    testCases: [
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}function toArr(h){let a=[];while(h){a.push(h.val);h=h.next;}return a;}return JSON.stringify(toArr(mergeTwoLists(mk([1,2,4]),mk([1,3,4]))));})()", expected: "[1,1,2,3,4,4]" },
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}function toArr(h){let a=[];while(h){a.push(h.val);h=h.next;}return a;}return JSON.stringify(toArr(mergeTwoLists(mk([]),mk([]))));})()", expected: "[]" },
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}function toArr(h){let a=[];while(h){a.push(h.val);h=h.next;}return a;}return JSON.stringify(toArr(mergeTwoLists(mk([]),mk([0]))));})()", expected: "[0]" }
    ],
    solution: "Dummy node + two-pointer merge. O(n+m) time.",
    explanation: "Standard list merge with sentinel."
  },
  {
    id: "middle-linked-list",
    title: "Middle of the Linked List",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Linked Lists",
    description: "Given the head of a singly linked list, return the middle node. If there are two middle nodes, return the second one.\n\nExample:\nInput: 1->2->3->4->5\nOutput: node 3",
    starterCode: `function middleNode(head) {\n  // head: {val, next} | null\n  // Your code here\n}`,
    testCases: [
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}let m=middleNode(mk([1,2,3,4,5]));return m?m.val:null;})()", expected: "3" },
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}let m=middleNode(mk([1,2,3,4,5,6]));return m?m.val:null;})()", expected: "4" },
      { input: "(function(){function mk(a){let h=null,p;for(let v of a){let n={val:v,next:null};if(!h)h=n;else p.next=n;p=n;}return h;}let m=middleNode(mk([1]));return m?m.val:null;})()", expected: "1" }
    ],
    solution: "Slow and fast pointers; fast moves twice as fast. O(n) time, O(1) space.",
    explanation: "Tortoise and hare."
  },
  {
    id: "linked-list-cycle",
    title: "Linked List Cycle",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Linked Lists",
    description: "Given the head of a linked list, return true if there is a cycle in the list, otherwise false.\n\nExample: 3->2->0->-4 (cycle back to 2) → true",
    starterCode: `function hasCycle(head) {\n  // head: {val, next} | null (may contain a cycle)\n  // Your code here\n}`,
    testCases: [
      { input: "(function(){let n1={val:3,next:null},n2={val:2,next:null},n3={val:0,next:null},n4={val:-4,next:null};n1.next=n2;n2.next=n3;n3.next=n4;n4.next=n2;return hasCycle(n1);})()", expected: "true" },
      { input: "(function(){let n1={val:1,next:null},n2={val:2,next:null};n1.next=n2;n2.next=n1;return hasCycle(n1);})()", expected: "true" },
      { input: "(function(){let n1={val:1,next:null};return hasCycle(n1);})()", expected: "false" }
    ],
    solution: "Floyd's cycle detection with slow/fast pointers. O(n) time, O(1) space.",
    explanation: "Fast pointer catches slow pointer if cycle exists."
  },

  /* ================= MEDIUM — STACKS & QUEUES ================= */
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Frontend Developer"],
    topic: "Stacks",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nExample:\nInput: s = '()[]{}'\nOutput: true",
    starterCode: `function isValid(s) {\n  // Your code here\n}`,
    testCases: [
      { input: "isValid('()[]{}')", expected: "true" },
      { input: "isValid('(]')", expected: "false" },
      { input: "isValid('([)]')", expected: "false" }
    ],
    solution: "Use a stack; push openers, pop and match on closers. O(n) time, O(n) space.",
    explanation: "Stack-based bracket matching."
  },
  {
    id: "implement-queue-stacks",
    title: "Implement Queue using Stacks",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Stacks",
    description: "Implement a first-in-first-out queue using two stacks. The class MyQueue has push(x), pop(), peek(), and empty() methods.\n\nOperate in amortized O(1) for pop/peek.",
    starterCode: `class MyQueue {\n  constructor() {\n    // Your code here\n  }\n  push(x) {\n    // Your code here\n  }\n  pop() {\n    // Your code here\n  }\n  peek() {\n    // Your code here\n  }\n  empty() {\n    // Your code here\n  }\n}`,
    testCases: [
      { input: "(function(){const q=new MyQueue();q.push(1);q.push(2);const a=q.peek();const b=q.pop();const c=q.empty();return a+','+b+','+c;})()", expected: '"1,1,false"' },
      { input: "(function(){const q=new MyQueue();q.push(1);q.pop();return q.empty();})()", expected: "true" }
    ],
    solution: "Use input stack for push; transfer to output stack for pop/peek. Amortized O(1).",
    explanation: "Two-stack FIFO."
  },
  {
    id: "daily-temperatures",
    title: "Daily Temperatures",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Stacks",
    description: "Given an array of integers temperatures, return an array answer such that answer[i] is the number of days you have to wait after day i to get a warmer temperature.\n\nExample:\nInput: temps=[73,74,75,71,69,72,76,73]\nOutput: [1,1,4,2,1,1,0,0]",
    starterCode: `function dailyTemperatures(temperatures) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(dailyTemperatures([73,74,75,71,69,72,76,73]))", expected: "[1,1,4,2,1,1,0,0]" },
      { input: "JSON.stringify(dailyTemperatures([30,40,50,60]))", expected: "[1,1,1,0]" },
      { input: "JSON.stringify(dailyTemperatures([30,60,90]))", expected: "[1,1,0]" }
    ],
    solution: "Monotonic decreasing stack storing indices. O(n) time.",
    explanation: "Stack of indices; pop when a warmer day found."
  },
  {
    id: "min-stack",
    title: "Min Stack",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Stacks",
    description: "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\nClass MinStack with push(val), pop(), top(), getMin().",
    starterCode: `class MinStack {\n  constructor() {\n    // Your code here\n  }\n  push(val) {\n    // Your code here\n  }\n  pop() {\n    // Your code here\n  }\n  top() {\n    // Your code here\n  }\n  getMin() {\n    // Your code here\n  }\n}`,
    testCases: [
      { input: "(function(){const s=new MinStack();s.push(-2);s.push(0);s.push(-3);const a=s.getMin();s.pop();const b=s.top();const c=s.getMin();return a+','+b+','+c;})()", expected: '"-3,0,-2"' },
      { input: "(function(){const s=new MinStack();s.push(5);const a=s.getMin();s.push(3);const b=s.getMin();return a+','+b;})()", expected: '"5,3"' }
    ],
    solution: "Keep a parallel stack of current minimums. O(1) for all ops.",
    explanation: "Auxiliary min stack."
  },

  /* ================= MEDIUM — HEAPS / SORTING ================= */
  {
    id: "k-closest-points",
    title: "K Closest Points to Origin",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Heap",
    description: "Given an array of points where points[i] = [x, y], return the k closest points to the origin (0,0).\n\nExample:\npoints=[[1,3],[-2,2]], k=1\nOutput: [[-2,2]]",
    starterCode: `function kClosest(points, k) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(kClosest([[1,3],[-2,2]],1))", expected: "[[-2,2]]" },
      { input: "JSON.stringify(kClosest([[3,3],[5,-1],[-2,4]],2).sort())", expected: "[[-2,4],[3,3]]" },
      { input: "JSON.stringify(kClosest([[0,1],[1,0]],2).sort())", expected: "[[0,1],[1,0]]" }
    ],
    solution: "Sort by squared distance or use a max-heap of size k. O(n log k) with heap.",
    explanation: "Distance = x*x + y*y."
  },
  {
    id: "sort-colors",
    title: "Sort Colors (Dutch Flag)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Sorting",
    description: "Given an array nums with values 0, 1, or 2, sort it in-place without using the library's sort function.\n\nExample:\nInput: [2,0,2,1,1,0]\nOutput: [0,0,1,1,2,2]",
    starterCode: `function sortColors(nums) {\n  // In-place; return nums\n  // Your code here\n  return nums;\n}`,
    testCases: [
      { input: "JSON.stringify(sortColors([2,0,2,1,1,0]))", expected: "[0,0,1,1,2,2]" },
      { input: "JSON.stringify(sortColors([2,0,1]))", expected: "[0,1,2]" },
      { input: "JSON.stringify(sortColors([0]))", expected: "[0]" }
    ],
    solution: "Three-pointer Dutch national flag partition. O(n) time, O(1) space.",
    explanation: "low/mid/high partition."
  },
  {
    id: "wiggle-sort",
    title: "Wiggle Sort",
    source: "HackerRank",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Sorting",
    description: "Given an array nums, reorder it in-place such that nums[0] <= nums[1] >= nums[2] <= nums[3]...\n\nExample:\nInput: [3,5,2,1,6,4]\nOutput: [3,5,1,6,2,4] (one valid answer)",
    starterCode: `function wiggleSort(nums) {\n  // In-place; return nums\n  // Your code here\n  return nums;\n}`,
    testCases: [
      { input: "(function(){const a=wiggleSort([3,5,2,1,6,4]);let ok=true;for(let i=0;i<a.length-1;i++){if(i%2===0?!(a[i]<=a[i+1]):!(a[i]>=a[i+1]))ok=false;}return ok;})()", expected: "true" },
      { input: "(function(){const a=wiggleSort([1,2,3,4]);let ok=true;for(let i=0;i<a.length-1;i++){if(i%2===0?!(a[i]<=a[i+1]):!(a[i]>=a[i+1]))ok=false;}return ok;})()", expected: "true" }
    ],
    solution: "Swap adjacent elements when the wiggle condition is violated. O(n) time.",
    explanation: "Greedy adjacent swaps."
  },

  /* ================= MEDIUM — GREEDY / INTERVALS ================= */
  {
    id: "meeting-rooms",
    title: "Meeting Rooms",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Intervals",
    description: "Given an array of meeting time intervals [[start, end]], return true if a person could attend all meetings.\n\nExample:\nInput: [[0,30],[5,10],[15,20]]\nOutput: false",
    starterCode: `function canAttendMeetings(intervals) {\n  // Your code here\n}`,
    testCases: [
      { input: "canAttendMeetings([[0,30],[5,10],[15,20]])", expected: "false" },
      { input: "canAttendMeetings([[7,10],[2,4]])", expected: "true" },
      { input: "canAttendMeetings([])", expected: "true" }
    ],
    solution: "Sort by start; check if any start < previous end. O(n log n) time.",
    explanation: "Greedy interval overlap check."
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Intervals",
    description: "Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals and return the merged array.\n\nExample:\nInput: [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]",
    starterCode: `function merge(intervals) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(merge([[1,3],[2,6],[8,10],[15,18]]))", expected: "[[1,6],[8,10],[15,18]]" },
      { input: "JSON.stringify(merge([[1,4],[4,5]]))", expected: "[[1,5]]" },
      { input: "JSON.stringify(merge([[1,4],[2,3]]))", expected: "[[1,4]]" }
    ],
    solution: "Sort by start; merge overlapping intervals. O(n log n) time.",
    explanation: "Sort then merge."
  },
  {
    id: "insert-interval",
    title: "Insert Interval",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Intervals",
    description: "Given a sorted list of non-overlapping intervals and a new interval, insert it and merge if necessary.\n\nExample:\nInput: intervals=[[1,3],[6,9]], newInterval=[2,5]\nOutput: [[1,5],[6,9]]",
    starterCode: `function insert(intervals, newInterval) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(insert([[1,3],[6,9]],[2,5]))", expected: "[[1,5],[6,9]]" },
      { input: "JSON.stringify(insert([[1,2],[3,5],[6,7],[8,10],[12,16]],[4,8]))", expected: "[[1,2],[3,10],[12,16]]" },
      { input: "JSON.stringify(insert([],[5,7]))", expected: "[[5,7]]" }
    ],
    solution: "Add intervals before the new one, merge overlapping, then append the rest. O(n) time.",
    explanation: "Linear merge with three phases."
  },
  {
    id: "jump-game",
    title: "Jump Game",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Greedy",
    description: "Given an array nums where each element is the max jump length, return true if you can reach the last index starting from index 0.\n\nExample:\nInput: nums=[2,3,1,1,4]\nOutput: true",
    starterCode: `function canJump(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "canJump([2,3,1,1,4])", expected: "true" },
      { input: "canJump([3,2,1,0,4])", expected: "false" },
      { input: "canJump([0])", expected: "true" }
    ],
    solution: "Track the farthest reachable index as you scan. O(n) time, O(1) space.",
    explanation: "Greedy furthest-reach update."
  },

  /* ================= MEDIUM — GRAPHS / BFS ================= */
  {
    id: "rotting-oranges",
    title: "Rotting Oranges",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Graphs",
    description: "Given a 2D grid where 0=empty, 1=fresh orange, 2=rotten orange, return the minimum minutes until all oranges rot, or -1 if impossible.\n\nExample:\n[[2,1,1],[1,1,0],[0,1,1]] → 4",
    starterCode: `function orangesRotting(grid) {\n  // Your code here\n}`,
    testCases: [
      { input: "orangesRotting([[2,1,1],[1,1,0],[0,1,1]])", expected: "4" },
      { input: "orangesRotting([[2,1,1],[0,1,1],[1,0,1]])", expected: "-1" },
      { input: "orangesRotting([[0,2]])", expected: "0" }
    ],
    solution: "Multi-source BFS from all rotten oranges counting levels. O(m*n) time.",
    explanation: "BFS level counting."
  },
  {
    id: "surrounded-regions",
    title: "Surrounded Regions",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Graphs",
    description: "Given an m x n matrix board containing 'X' and 'O', capture all regions surrounded by 'X' by flipping inner 'O's to 'X'. Border 'O's and their connected 'O's are not captured.\n\nModify the board in-place.",
    starterCode: `function solve(board) {\n  // In-place; return board\n  // Your code here\n  return board;\n}`,
    testCases: [
      { input: "JSON.stringify(solve([['X','X','X','X'],['X','O','O','X'],['X','X','O','X'],['X','O','X','X']]))", expected: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]' },
      { input: "JSON.stringify(solve([['O','O'],['O','O']]))", expected: '[["O","O"],["O","O"]]' }
    ],
    solution: "DFS from all border 'O's, mark safe, then flip remaining 'O's. O(m*n) time.",
    explanation: "Border DFS flood-fill."
  },
  {
    id: "word-search",
    title: "Word Search",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Backtracking",
    description: "Given an m x n grid of characters and a string word, return true if the word exists in the grid (adjacent cells horizontally/vertically, cannot reuse a cell).\n\nExample:\nboard=[['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word='ABCCED' → true",
    starterCode: `function exist(board, word) {\n  // Your code here\n}`,
    testCases: [
      { input: "exist([['A','B','C','E'],['S','F','C','S'],['A','D','E','E']],'ABCCED')", expected: "true" },
      { input: "exist([['A','B','C','E'],['S','F','C','S'],['A','D','E','E']],'ABCB')", expected: "false" },
      { input: "exist([['a']],'a')", expected: "true" }
    ],
    solution: "DFS with backtracking marking visited cells. O(m*n*4^L) time.",
    explanation: "Grid DFS with visited set."
  },

  /* ================= MEDIUM — MATRIX / PREFIX ================= */
  {
    id: "container-most-water",
    title: "Container With Most Water",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Two Pointers",
    description: "Given an array height where height[i] is the height of a vertical line, find the maximum area of water two lines can contain.\n\nExample:\nheight=[1,8,6,2,5,4,8,3,7]\nOutput: 49",
    starterCode: `function maxArea(height) {\n  // Your code here\n}`,
    testCases: [
      { input: "maxArea([1,8,6,2,5,4,8,3,7])", expected: "49" },
      { input: "maxArea([1,1])", expected: "1" },
      { input: "maxArea([4,3,2,1,4])", expected: "16" }
    ],
    solution: "Two pointers from both ends, move the shorter line inward. O(n) time.",
    explanation: "Greedy two-pointer water container."
  },
  {
    id: "product-array-except-self",
    title: "Product of Array Except Self",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Arrays",
    description: "Given an integer array nums, return an array answer such that answer[i] is the product of all elements except nums[i], without using division.\n\nExample:\nInput: [1,2,3,4]\nOutput: [24,12,8,6]",
    starterCode: `function productExceptSelf(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(productExceptSelf([1,2,3,4]))", expected: "[24,12,8,6]" },
      { input: "JSON.stringify(productExceptSelf([-1,1,0,-3,3]))", expected: "[0,0,9,0,0]" },
      { input: "JSON.stringify(productExceptSelf([0,0]))", expected: "[0,0]" }
    ],
    solution: "Compute prefix products then suffix products, combine. O(n) time, O(1) extra space.",
    explanation: "Left and right running products."
  },
  {
    id: "subarray-sum-equals-k",
    title: "Subarray Sum Equals K",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Hashing",
    description: "Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals k.\n\nExample:\nInput: nums=[1,1,1], k=2\nOutput: 2",
    starterCode: `function subarraySum(nums, k) {\n  // Your code here\n}`,
    testCases: [
      { input: "subarraySum([1,1,1],2)", expected: "2" },
      { input: "subarraySum([1,2,3],3)", expected: "2" },
      { input: "subarraySum([1],0)", expected: "0" }
    ],
    solution: "Prefix sum + hash map of counts. O(n) time.",
    explanation: "Map of prefix sums and their frequencies."
  },
  {
    id: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Hashing",
    description: "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence in O(n) time.\n\nExample:\nInput: [100,4,200,1,3,2]\nOutput: 4 (1,2,3,4)",
    starterCode: `function longestConsecutive(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "longestConsecutive([100,4,200,1,3,2])", expected: "4" },
      { input: "longestConsecutive([0,3,7,2,5,8,4,6,0,1])", expected: "9" },
      { input: "longestConsecutive([])", expected: "0" }
    ],
    solution: "Put numbers in a Set; only start counting from sequence beginnings. O(n) time.",
    explanation: "Set membership + start-of-sequence detection."
  },

  /* ================= MEDIUM — MISCELLANEOUS ================= */
  {
    id: "task-scheduler",
    title: "Task Scheduler",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Greedy",
    description: "Given a characters array tasks and an integer n (cooldown between same tasks), return the least number of units of time to finish all tasks.\n\nExample:\ntasks=['A','A','A','B','B','B'], n=2\nOutput: 8",
    starterCode: `function leastInterval(tasks, n) {\n  // Your code here\n}`,
    testCases: [
      { input: "leastInterval(['A','A','A','B','B','B'],2)", expected: "8" },
      { input: "leastInterval(['A','A','A','B','B','B'],0)", expected: "6" },
      { input: "leastInterval(['A','A','A','A','A','A','B','C','D','E','F','G'],2)", expected: "16" }
    ],
    solution: "Count max frequency f; the frame is (f-1)*(n+1) + count of tasks with max freq; take max with tasks.length. O(n) time.",
    explanation: "Greedy scheduling formula."
  }
];
