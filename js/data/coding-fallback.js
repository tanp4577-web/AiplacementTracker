/* ============================================================================
   LeetCode + HackerRank Style Question Bank
   Structured fields per question:
     id, title, source ("LeetCode" | "HackerRank"), difficulty,
     targetRoles (array), topic, description, starterCode, testCases,
     solution (with explanation)
   Plugged into the Coding Sandbox editor + test runner (js/coding.js).
   ========================================================================== */

const FALLBACK_CODING = [
  /* ================= EASY — ARRAYS / STRINGS ================= */
  {
    id: "two-sum",
    title: "Two Sum",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Frontend Developer", "Data Analyst"],
    topic: "Arrays",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
    starterCode: `function twoSum(nums, target) {\n  // Your code here\n}`,
    testCases: [
      { input: "twoSum([2,7,11,15], 9)", expected: "[0,1]" },
      { input: "twoSum([3,2,4], 6)", expected: "[1,2]" },
      { input: "twoSum([3,3], 6)", expected: "[0,1]" }
    ],
    solution: "Use a hash map to store each number's index. For each num, check if target-num already exists in the map. O(n) time, O(n) space.",
    explanation: "HashMap two-pass/first-pass: store value->index, then lookup complement."
  },
  {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Strings",
    description: "Given a string s, return true if it is a palindrome, considering only alphanumeric characters and ignoring cases.\n\nExample:\nInput: s = 'A man, a plan, a canal: Panama'\nOutput: true",
    starterCode: `function isPalindrome(s) {\n  // Your code here\n}`,
    testCases: [
      { input: "isPalindrome('A man, a plan, a canal: Panama')", expected: "true" },
      { input: "isPalindrome('race a car')", expected: "false" },
      { input: "isPalindrome(' ')", expected: "true" }
    ],
    solution: "Two pointers scanning from both ends, skipping non-alphanumerics, comparing lowercased chars. O(n) time, O(1) space.",
    explanation: "Use regex to filter, or two-pointer with char checks."
  },
  {
    id: "reverse-string",
    title: "Reverse String",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Frontend Developer"],
    topic: "Strings",
    description: "Write a function that reverses a string in-place. The input string is given as an array of characters s.\n\nExample:\nInput: s = ['h','e','l','l','o']\nOutput: ['o','l','l','e','h']",
    starterCode: `function reverseString(s) {\n  // Your code here\n  return s;\n}`,
    testCases: [
      { input: "JSON.stringify(reverseString(['h','e','l','l','o']))", expected: '["o","l","l","e","h"]' },
      { input: "JSON.stringify(reverseString(['a','b','c']))", expected: '["c","b","a"]' }
    ],
    solution: "Two pointers at both ends, swap characters, move inward. O(n) time, O(1) space.",
    explanation: "In-place swap using two pointers."
  },
  {
    id: "best-time-stock",
    title: "Best Time to Buy and Sell Stock",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst", "Backend Developer"],
    topic: "Arrays",
    description: "Given an array prices where prices[i] is the price of a stock on day i, return the maximum profit you can achieve from one transaction. If no profit, return 0.\n\nExample:\nInput: prices = [7,1,5,3,6,4]\nOutput: 5",
    starterCode: `function maxProfit(prices) {\n  // Your code here\n}`,
    testCases: [
      { input: "maxProfit([7,1,5,3,6,4])", expected: "5" },
      { input: "maxProfit([7,6,4,3,1])", expected: "0" },
      { input: "maxProfit([2,4,1])", expected: "2" }
    ],
    solution: "Track min price so far and max profit. O(n) time, O(1) space.",
    explanation: "Greedy single pass."
  },
  {
    id: "contains-duplicate",
    title: "Contains Duplicate",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Arrays",
    description: "Given an integer array nums, return true if any value appears at least twice in the array, and false if every element is distinct.\n\nExample:\nInput: nums = [1,2,3,1]\nOutput: true",
    starterCode: `function containsDuplicate(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "containsDuplicate([1,2,3,1])", expected: "true" },
      { input: "containsDuplicate([1,2,3,4])", expected: "false" },
      { input: "containsDuplicate([1,1,1,3,3,4,3,2,4,2])", expected: "true" }
    ],
    solution: "Use a Set; if size differs from array length, there are duplicates. O(n) time, O(n) space.",
    explanation: "Set-based duplicate detection."
  },
  {
    id: "merge-sorted-arrays",
    title: "Merge Two Sorted Arrays",
    source: "HackerRank",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Sorting",
    description: "Given two sorted arrays, merge them into a single sorted array.\n\nExample:\nInput: a=[1,3,5], b=[2,4,6]\nOutput: [1,2,3,4,5,6]",
    starterCode: `function mergeSorted(a, b) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(mergeSorted([1,3,5],[2,4,6]))", expected: "[1,2,3,4,5,6]" },
      { input: "JSON.stringify(mergeSorted([],[1,2]))", expected: "[1,2]" },
      { input: "JSON.stringify(mergeSorted([1,2,3],[]))", expected: "[1,2,3]" }
    ],
    solution: "Two pointers comparing elements from each array. O(n+m) time, O(n+m) space.",
    explanation: "Classic two-pointer merge."
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    source: "HackerRank",
    difficulty: "Easy",
    targetRoles: ["SDE", "Frontend Developer"],
    topic: "Strings",
    description: "Given an integer n, return an array of strings where:\n- 'FizzBuzz' if divisible by 3 and 5\n- 'Fizz' if divisible by 3\n- 'Buzz' if divisible by 5\n- the number as a string otherwise\n\nExample:\nInput: n = 15\nOutput: ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']",
    starterCode: `function fizzBuzz(n) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(fizzBuzz(3))", expected: '["1","2","Fizz"]' },
      { input: "JSON.stringify(fizzBuzz(5))", expected: '["1","2","Fizz","4","Buzz"]' },
      { input: "fizzBuzz(15)[14]", expected: '"FizzBuzz"' }
    ],
    solution: "Loop 1..n, check divisibility by 15, 3, 5 in order. O(n) time.",
    explanation: "Modulo arithmetic basics."
  },

  /* ================= EASY/MEDIUM — TWO POINTERS ================= */
  {
    id: "valid-palindrome-2",
    title: "Valid Palindrome II",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Two Pointers",
    description: "Given a string s, return true if the s can be palindrome after deleting at most one character from it.\n\nExample:\nInput: s = 'abca'\nOutput: true (delete 'c')",
    starterCode: `function validPalindrome(s) {\n  // Your code here\n}`,
    testCases: [
      { input: "validPalindrome('abca')", expected: "true" },
      { input: "validPalindrome('abc')", expected: "false" },
      { input: "validPalindrome('aba')", expected: "true" }
    ],
    solution: "Two pointers; when chars differ, try skipping either side. O(n) time.",
    explanation: "Two-pointer with a skip-once helper."
  },
  {
    id: "two-sum-2-sorted",
    title: "Two Sum II - Sorted Input",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Two Pointers",
    description: "Given a 1-indexed sorted array, return indices (1-based) of the two numbers that sum to target.\n\nExample:\nInput: numbers = [2,7,11,15], target = 9\nOutput: [1,2]",
    starterCode: `function twoSumSorted(numbers, target) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(twoSumSorted([2,7,11,15],9))", expected: "[1,2]" },
      { input: "JSON.stringify(twoSumSorted([2,3,4],6))", expected: "[1,3]" },
      { input: "JSON.stringify(twoSumSorted([-1,0],-1))", expected: "[1,2]" }
    ],
    solution: "Left and right pointers; adjust based on sum vs target. O(n) time, O(1) space.",
    explanation: "Since sorted, move pointers inward."
  },
  {
    id: "move-zeroes",
    title: "Move Zeroes",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Two Pointers",
    description: "Given an array nums, move all 0's to the end while maintaining the relative order of the non-zero elements (in-place).\n\nExample:\nInput: [0,1,0,3,12]\nOutput: [1,3,12,0,0]",
    starterCode: `function moveZeroes(nums) {\n  // Your code here\n  return nums;\n}`,
    testCases: [
      { input: "JSON.stringify(moveZeroes([0,1,0,3,12]))", expected: "[1,3,12,0,0]" },
      { input: "JSON.stringify(moveZeroes([0,0,1]))", expected: "[1,0,0]" },
      { input: "JSON.stringify(moveZeroes([1,2,3]))", expected: "[1,2,3]" }
    ],
    solution: "Use a slow pointer to place non-zero elements, then fill the rest with zeros. O(n) time, O(1) space.",
    explanation: "Slow/fast pointer partition."
  },

  /* ================= EASY/MEDIUM — SORTING & SEARCHING ================= */
  {
    id: "binary-search",
    title: "Binary Search",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Searching",
    description: "Given a sorted array nums and a target, return its index, or -1 if not present.\n\nExample:\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4",
    starterCode: `function binarySearch(nums, target) {\n  // Your code here\n}`,
    testCases: [
      { input: "binarySearch([-1,0,3,5,9,12],9)", expected: "4" },
      { input: "binarySearch([-1,0,3,5,9,12],2)", expected: "-1" },
      { input: "binarySearch([5],5)", expected: "0" }
    ],
    solution: "Standard binary search halving the search space. O(log n) time, O(1) space.",
    explanation: "Midpoint comparison loop."
  },
  {
    id: "first-bad-version",
    title: "First Bad Version",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Searching",
    description: "You have n versions [1..n] and a function isBadVersion(version). Find the first bad version.\n\nMinimize calls to isBadVersion.\n\nExample: n=5, first bad = 4 → output 4.",
    starterCode: `function firstBadVersion(n) {\n  // Assume isBadVersion is globally available\n  // Your code here\n}`,
    testCases: [
      { input: "(function(){isBadVersion=function(v){return v>=4;};return firstBadVersion(5);})()", expected: "4" },
      { input: "(function(){isBadVersion=function(v){return v>=1;};return firstBadVersion(1);})()", expected: "1" }
    ],
    solution: "Binary search on the version range. O(log n) calls.",
    explanation: "Left-biased binary search."
  },
  {
    id: "kth-largest",
    title: "Kth Largest Element",
    source: "HackerRank",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Sorting",
    description: "Given an array and an integer k, return the kth largest element in the array.\n\nExample:\nInput: nums=[3,2,1,5,6,4], k=2\nOutput: 5",
    starterCode: `function kthLargest(nums, k) {\n  // Your code here\n}`,
    testCases: [
      { input: "kthLargest([3,2,1,5,6,4],2)", expected: "5" },
      { input: "kthLargest([3,2,3,1,2,4,5,5,6],4)", expected: "4" },
      { input: "kthLargest([1],1)", expected: "1" }
    ],
    solution: "Sort descending and return index k-1, or use a min-heap. O(n log n) sort, O(n log k) heap.",
    explanation: "Sorting or heap-based selection."
  },

  /* ================= MEDIUM — SLIDING WINDOW ================= */
  {
    id: "max-subarray-sum",
    title: "Maximum Subarray (Kadane's)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "Given an integer array nums, find the contiguous subarray (containing at least one number) with the largest sum and return its sum.\n\nExample:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6",
    starterCode: `function maxSubArray(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "maxSubArray([-2,1,-3,4,-1,2,1,-5,4])", expected: "6" },
      { input: "maxSubArray([1])", expected: "1" },
      { input: "maxSubArray([5,4,-1,7,8])", expected: "23" }
    ],
    solution: "Kadane's algorithm: current = max(num, current+num); best = max(best, current). O(n) time, O(1) space.",
    explanation: "Dynamic programming on running sum."
  },
  {
    id: "longest-substr-no-repeat",
    title: "Longest Substring Without Repeating Characters",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer", "Frontend Developer"],
    topic: "Sliding Window",
    description: "Given a string s, find the length of the longest substring without repeating characters.\n\nExample:\nInput: s = 'abcabcbb'\nOutput: 3",
    starterCode: `function lengthOfLongestSubstring(s) {\n  // Your code here\n}`,
    testCases: [
      { input: "lengthOfLongestSubstring('abcabcbb')", expected: "3" },
      { input: "lengthOfLongestSubstring('bbbbb')", expected: "1" },
      { input: "lengthOfLongestSubstring('pwwkew')", expected: "3" }
    ],
    solution: "Sliding window with a Set/Map tracking last seen index. O(n) time.",
    explanation: "Expand right, shrink left on repeat."
  },
  {
    id: "min-window-substring",
    title: "Minimum Window Substring",
    source: "LeetCode",
    difficulty: "Hard",
    targetRoles: ["SDE"],
    topic: "Sliding Window",
    description: "Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window.\n\nExample:\nInput: s='ADOBECODEBANC', t='ABC'\nOutput: 'BANC'",
    starterCode: `function minWindow(s, t) {\n  // Your code here\n}`,
    testCases: [
      { input: "minWindow('ADOBECODEBANC','ABC')", expected: '"BANC"' },
      { input: "minWindow('a','a')", expected: '"a"' },
      { input: "minWindow('a','aa')", expected: '""' }
    ],
    solution: "Sliding window with two frequency maps; shrink when all chars satisfied. O(n+m) time.",
    explanation: "Advanced sliding window with counts."
  },

  /* ================= MEDIUM — TREES & GRAPHS ================= */
  {
    id: "inorder-traversal",
    title: "Binary Tree Inorder Traversal",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Trees",
    description: "Given the root of a binary tree, return the inorder traversal of its nodes' values.\n\nDefine helper: nodes as {val, left, right} or null.\n\nExample:\nInput: [1,null,2,3]\nOutput: [1,3,2]",
    starterCode: `function inorderTraversal(root) {\n  // root: {val, left, right} | null\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(inorderTraversal({val:1,left:null,right:{val:2,left:{val:3,left:null,right:null},right:null}}))", expected: "[1,3,2]" },
      { input: "JSON.stringify(inorderTraversal(null))", expected: "[]" }
    ],
    solution: "Recursive left-root-right, or iterative stack. O(n) time, O(h) space.",
    explanation: "DFS left, node, right."
  },
  {
    id: "max-depth-tree",
    title: "Maximum Depth of Binary Tree",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Trees",
    description: "Given the root of a binary tree, return its maximum depth (number of nodes along the longest path).\n\nExample: root [3,9,20,null,null,15,7] → depth 3.",
    starterCode: `function maxDepth(root) {\n  // root: {val, left, right} | null\n  // Your code here\n}`,
    testCases: [
      { input: "maxDepth({val:3,left:{val:9,left:null,right:null},right:{val:20,left:{val:15,left:null,right:null},right:{val:7,left:null,right:null}}})", expected: "3" },
      { input: "maxDepth(null)", expected: "0" }
    ],
    solution: "Recursion: 1 + max(depth(left), depth(right)). O(n) time.",
    explanation: "DFS post-order."
  },
  {
    id: "level-order",
    title: "Binary Tree Level Order Traversal",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Trees",
    description: "Return the level order traversal of a binary tree's nodes' values (left to right, level by level).\n\nExample: root [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]",
    starterCode: `function levelOrder(root) {\n  // root: {val, left, right} | null\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(levelOrder({val:3,left:{val:9,left:null,right:null},right:{val:20,left:{val:15,left:null,right:null},right:{val:7,left:null,right:null}}}))", expected: "[[3],[9,20],[15,7]]" },
      { input: "JSON.stringify(levelOrder(null))", expected: "[]" }
    ],
    solution: "BFS with a queue, track level sizes. O(n) time.",
    explanation: "Breadth-first queue traversal."
  },
  {
    id: "number-of-islands",
    title: "Number of Islands",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Graphs",
    description: "Given an m x n 2D grid of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\nExample:\n[['1','1','0'],['1','0','0'],['0','0','1']] → 2",
    starterCode: `function numIslands(grid) {\n  // grid: array of arrays of '1'/'0'\n  // Your code here\n}`,
    testCases: [
      { input: "numIslands([['1','1','0'],['1','0','0'],['0','0','1']])", expected: "2" },
      { input: "numIslands([['1','1','1'],['1','1','1']])", expected: "1" },
      { input: "numIslands([])", expected: "0" }
    ],
    solution: "DFS/BFS flood-fill each unvisited '1'. O(m*n) time.",
    explanation: "Grid DFS with visited marking."
  },
  {
    id: "clone-graph",
    title: "Clone Graph",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Graphs",
    description: "Return a deep copy (clone) of the graph. Each node is {val, neighbors:[node...]}.\n\nExample: adjacency list [[2,4],[1,3],[2,4],[1,3]] → cloned graph.",
    starterCode: `function cloneGraph(node) {\n  // node: {val, neighbors:[]} | null\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(cloneGraph(null))", expected: "null" },
      { input: "cloneGraph({val:1,neighbors:[]}).val", expected: "1" }
    ],
    solution: "DFS/BFS with a visited map from old node to clone. O(V+E) time.",
    explanation: "Hash-map memoized DFS."
  },
  {
    id: "valid-tree-prerequisites",
    title: "Course Schedule (Cycle Detection)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Graphs",
    description: "There are numCourses courses labeled 0 to numCourses-1. Given prerequisites pairs [a,b] meaning b must be taken before a, return true if you can finish all courses.\n\nExample: numCourses=2, [[1,0]] → true",
    starterCode: `function canFinish(numCourses, prerequisites) {\n  // Your code here\n}`,
    testCases: [
      { input: "canFinish(2, [[1,0]])", expected: "true" },
      { input: "canFinish(2, [[1,0],[0,1]])", expected: "false" },
      { input: "canFinish(1, [])", expected: "true" }
    ],
    solution: "Kahn's topological sort (BFS indegree) or DFS cycle detection. O(V+E) time.",
    explanation: "Detect cycle in directed graph."
  },

  /* ================= MEDIUM/HARD — DYNAMIC PROGRAMMING ================= */
  {
    id: "climbing-stairs",
    title: "Climbing Stairs",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can climb 1 or 2 steps. Return the number of distinct ways to reach the top.\n\nExample: n=3 → 3",
    starterCode: `function climbStairs(n) {\n  // Your code here\n}`,
    testCases: [
      { input: "climbStairs(2)", expected: "2" },
      { input: "climbStairs(3)", expected: "3" },
      { input: "climbStairs(5)", expected: "8" }
    ],
    solution: "Fibonacci with DP: dp[i]=dp[i-1]+dp[i-2]. O(n) time, O(1) space.",
    explanation: "Classic DP recurrence."
  },
  {
    id: "coin-change",
    title: "Coin Change",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "Given an array coins and an amount, return the fewest number of coins needed to make up that amount. Return -1 if impossible.\n\nExample: coins=[1,2,5], amount=11 → 3 (5+5+1)",
    starterCode: `function coinChange(coins, amount) {\n  // Your code here\n}`,
    testCases: [
      { input: "coinChange([1,2,5],11)", expected: "3" },
      { input: "coinChange([2],3)", expected: "-1" },
      { input: "coinChange([1],0)", expected: "0" }
    ],
    solution: "DP array of min coins up to amount. O(amount*coins) time.",
    explanation: "Bottom-up DP for min coins."
  },
  {
    id: "longest-common-subseq",
    title: "Longest Common Subsequence",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "Given two strings text1 and text2, return the length of their longest common subsequence.\n\nExample: text1='abcde', text2='ace' → 3",
    starterCode: `function longestCommonSubsequence(text1, text2) {\n  // Your code here\n}`,
    testCases: [
      { input: "longestCommonSubsequence('abcde','ace')", expected: "3" },
      { input: "longestCommonSubsequence('abc','abc')", expected: "3" },
      { input: "longestCommonSubsequence('abc','def')", expected: "0" }
    ],
    solution: "2D DP table; if chars match dp[i][j]=dp[i-1][j-1]+1 else max of up/left. O(n*m) time.",
    explanation: "2D DP with match/carry logic."
  },
  {
    id: "edit-distance",
    title: "Edit Distance",
    source: "LeetCode",
    difficulty: "Hard",
    targetRoles: ["SDE"],
    topic: "Dynamic Programming",
    description: "Given two strings word1 and word2, return the minimum number of operations (insert, delete, replace) required to convert word1 to word2.\n\nExample: word1='horse', word2='ros' → 3",
    starterCode: `function minDistance(word1, word2) {\n  // Your code here\n}`,
    testCases: [
      { input: "minDistance('horse','ros')", expected: "3" },
      { input: "minDistance('intention','execution')", expected: "5" },
      { input: "minDistance('','a')", expected: "1" }
    ],
    solution: "2D DP where dp[i][j] = min cost. O(n*m) time.",
    explanation: "Levenshtein distance DP."
  },

  /* ================= MEDIUM — HASHING / MAPS ================= */
  {
    id: "group-anagrams",
    title: "Group Anagrams",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Hashing",
    description: "Given an array of strings strs, group the anagrams together.\n\nExample: ['eat','tea','tan','ate','nat','bat']\nOutput: [['eat','tea','ate'],['tan','nat'],['bat']]",
    starterCode: `function groupAnagrams(strs) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(groupAnagrams(['eat','tea','tan','ate','nat','bat']).map(g=>g.slice().sort()))", expected: '[["bat"],["eat","tea","ate"],["nat","tan"]]' },
      { input: "JSON.stringify(groupAnagrams(['']))", expected: '[[""]]' }
    ],
    solution: "Sort each word as key in a hash map. O(n*k log k) time.",
    explanation: "Sorted-string key grouping."
  },
  {
    id: "top-k-frequent",
    title: "Top K Frequent Elements",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Hashing",
    description: "Given an integer array nums and an integer k, return the k most frequent elements.\n\nExample: nums=[1,1,1,2,2,3], k=2 → [1,2]",
    starterCode: `function topKFrequent(nums, k) {\n  // Your code here\n}`,
    testCases: [
      { input: "JSON.stringify(topKFrequent([1,1,1,2,2,3],2).sort())", expected: "[1,2]" },
      { input: "JSON.stringify(topKFrequent([1],1))", expected: "[1]" },
      { input: "JSON.stringify(topKFrequent([1,1,1,2,2,3,3],2).sort())", expected: "[1,2]" }
    ],
    solution: "Frequency map, then bucket sort or sort by count. O(n log n) or O(n).",
    explanation: "Frequency map + sort/bucket."
  },

  /* ================= MEDIUM — BACKTRACKING ================= */
  {
    id: "permutations",
    title: "Permutations",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Backtracking",
    description: "Given an array nums of distinct integers, return all possible permutations.\n\nExample: nums=[1,2,3] → 6 permutations.",
    starterCode: `function permute(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "permute([1,2,3]).length", expected: "6" },
      { input: "JSON.stringify(permute([0,1]).length)", expected: "2" }
    ],
    solution: "Backtracking: swap or used-set. O(n * n!) time.",
    explanation: "Classic permutation backtracking."
  },
  {
    id: "subsets",
    title: "Subsets",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Backtracking",
    description: "Given an integer array nums of unique elements, return all possible subsets (the power set).\n\nExample: nums=[1,2,3] → 8 subsets.",
    starterCode: `function subsets(nums) {\n  // Your code here\n}`,
    testCases: [
      { input: "subsets([1,2,3]).length", expected: "8" },
      { input: "subsets([1]).length", expected: "2" }
    ],
    solution: "Backtracking include/exclude, or bitmask. O(2^n) time.",
    explanation: "Subset enumeration."
  },

  /* ================= MEDIUM — SYSTEM DESIGN LITE ================= */
  {
    id: "lru-cache",
    title: "LRU Cache",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "System Design Lite",
    description: "Design a data structure for Least Recently Used cache with get(key) and put(key, value) in O(1) average time.\n\nReturn the class. This is a design-lite problem.\n\nExample: LRUCache(2); put(1,1); put(2,2); get(1)→1; put(3,3) evicts 2; get(2)→-1.",
    starterCode: `class LRUCache {\n  constructor(capacity) {\n    // Your code here\n  }\n  get(key) {\n    // Your code here\n  }\n  put(key, value) {\n    // Your code here\n  }\n}`,
    testCases: [
      { input: "(function(){const c=new LRUCache(2);c.put(1,1);c.put(2,2);const a=c.get(1);c.put(3,3);const b=c.get(2);return a+','+b;})()", expected: '"1,-1"' },
      { input: "(function(){const c=new LRUCache(1);c.put(1,1);c.put(2,2);return c.get(1)+','+c.get(2);})()", expected: '"-1,2"' }
    ],
    solution: "Use a Map (insertion order) or doubly-linked list + hash map for O(1).",
    explanation: "Map preserves insertion order in JS; delete + re-set to mark recently used."
  },
  {
    id: "rate-limiter",
    title: "Rate Limiter (Sliding Window)",
    source: "HackerRank",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "System Design Lite",
    description: "Implement a sliding-window rate limiter. The class RateLimiter(maxRequests, windowMs) has method allow(id) that returns true if the request for id is within the limit.\n\nExample: RateLimiter(2, 1000) allows 2 requests per second per id.",
    starterCode: `class RateLimiter {\n  constructor(maxRequests, windowMs) {\n    // Your code here\n  }\n  allow(id) {\n    // Your code here\n  }\n}`,
    testCases: [
      { input: "(function(){const r=new RateLimiter(2,1000);return r.allow('a')+','+r.allow('a')+','+r.allow('a');})()", expected: '"true,true,false"' },
      { input: "(function(){const r=new RateLimiter(1,1000);return r.allow('x')+','+r.allow('x');})()", expected: '"true,false"' }
    ],
    solution: "Store timestamps per id; drop entries outside the window, count remaining.",
    explanation: "Sliding window timestamp array."
  }
];

