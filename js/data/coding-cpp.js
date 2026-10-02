/* ============================================================================
   C++ QUESTION BANK (subset)
   Mirrors a representative subset of the JavaScript coding bank with C++
   starter code and stdin/stdout test harnesses.

   Structured fields per question (consumed by js/coding.js in C++ mode):
     id, title, source, difficulty, targetRoles, topic, description,
     starterCpp   -> C++ function to implement
     cppTestCases -> array of { input, expected } where `input` is the stdin
                     fed to the compiled program and `expected` the stdout.

   The harness (main) that reads stdin, calls the function, and prints the
   result is assembled at runtime in js/coding.js and compiled via Wandbox.
   ========================================================================== */

const EXTRA_CODING_CPP = [
  /* ================= EASY — ARRAYS / HASHING ================= */
  {
    id: "two-sum-cpp",
    title: "Two Sum (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Arrays",
    description: "Given an array of integers nums and an integer target, return the 1-based indices of the two numbers that add up to target. Assume exactly one solution exists.\n\nExample:\nInput: nums = 2 7 11 15, target = 9\nOutput: 0 1",
    starterCpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "4 9\n2 7 11 15\n", expected: "0 1" },
      { input: "3 6\n3 2 4\n", expected: "1 2" },
      { input: "2 6\n3 3\n", expected: "0 1" }
    ]
  },
  {
    id: "valid-anagram-cpp",
    title: "Valid Anagram (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Hashing",
    description: "Given two strings s and t, return true if t is an anagram of s, otherwise false.\n\nExample:\ns = anagram, t = nagaram\nOutput: true",
    starterCpp: `bool isAnagram(string s, string t) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "anagram\nnagaram\n", expected: "true" },
      { input: "rat\ncar\n", expected: "false" },
      { input: "\n\n", expected: "true" }
    ]
  },
  {
    id: "missing-number-cpp",
    title: "Missing Number (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Arrays",
    description: "Given an array nums of n distinct numbers in the range [0, n], return the only number in the range that is missing.\n\nExample:\nnums = 3 0 1\nOutput: 2",
    starterCpp: `int missingNumber(vector<int>& nums) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "3\n3 0 1\n", expected: "2" },
      { input: "2\n0 1\n", expected: "2" },
      { input: "9\n9 6 4 2 3 5 7 0 1\n", expected: "8" }
    ]
  },
  {
    id: "single-number-cpp",
    title: "Single Number (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Bit Manipulation",
    description: "Given a non-empty array of integers, every element appears twice except one. Find that single one.\n\nExample:\nnums = 2 2 1\nOutput: 1",
    starterCpp: `int singleNumber(vector<int>& nums) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "3\n2 2 1\n", expected: "1" },
      { input: "5\n4 1 2 1 2\n", expected: "4" },
      { input: "1\n1\n", expected: "1" }
    ]
  },

  /* ================= EASY — STRINGS ================= */
  {
    id: "valid-palindrome-cpp",
    title: "Valid Palindrome (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Strings",
    description: "Given a string s, return true if it is a palindrome considering only alphanumeric characters and ignoring cases.\n\nExample:\ns = A man, a plan, a canal: Panama\nOutput: true",
    starterCpp: `bool isPalindrome(string s) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "A man, a plan, a canal: Panama\n", expected: "true" },
      { input: "race a car\n", expected: "false" },
      { input: " \n", expected: "true" }
    ]
  },
  {
    id: "first-unique-char-cpp",
    title: "First Unique Character (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Strings",
    description: "Given a string s, return the index of the first non-repeating character, or -1 if none exists.\n\nExample:\ns = leetcode\nOutput: 0",
    starterCpp: `int firstUniqChar(string s) {
    // Your code here
    return -1;
}`,
    cppTestCases: [
      { input: "leetcode\n", expected: "0" },
      { input: "loveleetcode\n", expected: "2" },
      { input: "aabb\n", expected: "-1" }
    ]
  },
  {
    id: "fizzbuzz-cpp",
    title: "FizzBuzz (C++)",
    source: "HackerRank",
    difficulty: "Easy",
    targetRoles: ["SDE", "Frontend Developer"],
    topic: "Strings",
    description: "Given an integer n, return an array of strings: 'FizzBuzz' if divisible by 3 and 5, 'Fizz' if by 3, 'Buzz' if by 5, else the number as a string.\n\nExample:\nn = 15\nOutput: 1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz",
    starterCpp: `vector<string> fizzBuzz(int n) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "3\n", expected: "1 2 Fizz" },
      { input: "5\n", expected: "1 2 Fizz 4 Buzz" }
    ]
  },

  /* ================= EASY — TWO POINTERS ================= */
  {
    id: "move-zeroes-cpp",
    title: "Move Zeroes (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Two Pointers",
    description: "Move all 0's to the end while maintaining the relative order of non-zero elements, in-place.\n\nExample:\nnums = 0 1 0 3 12\nOutput: 1 3 12 0 0",
    starterCpp: `void moveZeroes(vector<int>& nums) {
    // Your code here
}`,
    cppTestCases: [
      { input: "5\n0 1 0 3 12\n", expected: "1 3 12 0 0" },
      { input: "3\n0 0 1\n", expected: "1 0 0" },
      { input: "3\n1 2 3\n", expected: "1 2 3" }
    ]
  },
  {
    id: "container-most-water-cpp",
    title: "Container With Most Water (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Two Pointers",
    description: "Find the maximum area of water that can be contained by two vertical lines.\n\nExample:\nheight = 1 8 6 2 5 4 8 3 7\nOutput: 49",
    starterCpp: `int maxArea(vector<int>& height) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "9\n1 8 6 2 5 4 8 3 7\n", expected: "49" },
      { input: "2\n1 1\n", expected: "1" },
      { input: "5\n4 3 2 1 4\n", expected: "16" }
    ]
  },

  /* ================= EASY — SEARCHING ================= */
  {
    id: "binary-search-cpp",
    title: "Binary Search (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Backend Developer", "Data Analyst"],
    topic: "Searching",
    description: "Given a sorted array nums and a target, return its index, or -1 if not present.\n\nExample:\nnums = -1 0 3 5 9 12, target = 9\nOutput: 4",
    starterCpp: `int search(vector<int>& nums, int target) {
    // Your code here
    return -1;
}`,
    cppTestCases: [
      { input: "6 9\n-1 0 3 5 9 12\n", expected: "4" },
      { input: "6 2\n-1 0 3 5 9 12\n", expected: "-1" },
      { input: "1 5\n5\n", expected: "0" }
    ]
  },
  {
    id: "kth-largest-cpp",
    title: "Kth Largest Element (C++)",
    source: "HackerRank",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Sorting",
    description: "Return the kth largest element in an unsorted array.\n\nExample:\nnums = 3 2 1 5 6 4, k = 2\nOutput: 5",
    starterCpp: `int findKthLargest(vector<int>& nums, int k) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "6 2\n3 2 1 5 6 4\n", expected: "5" },
      { input: "9 4\n3 2 3 1 2 4 5 5 6\n", expected: "4" },
      { input: "1 1\n1\n", expected: "1" }
    ]
  },

  /* ================= MEDIUM — SLIDING WINDOW / DP ================= */
  {
    id: "max-subarray-cpp",
    title: "Maximum Subarray (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "Find the contiguous subarray with the largest sum and return its sum.\n\nExample:\nnums = -2 1 -3 4 -1 2 1 -5 4\nOutput: 6",
    starterCpp: `int maxSubArray(vector<int>& nums) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4\n", expected: "6" },
      { input: "1\n1\n", expected: "1" },
      { input: "5\n5 4 -1 7 8\n", expected: "23" }
    ]
  },
  {
    id: "climbing-stairs-cpp",
    title: "Climbing Stairs (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "You can climb 1 or 2 steps at a time. Return the number of distinct ways to reach the top of n steps.\n\nExample:\nn = 3\nOutput: 3",
    starterCpp: `int climbStairs(int n) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "2\n", expected: "2" },
      { input: "3\n", expected: "3" },
      { input: "5\n", expected: "8" }
    ]
  },
  {
    id: "coin-change-cpp",
    title: "Coin Change (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Dynamic Programming",
    description: "Return the fewest number of coins needed to make up an amount, or -1 if impossible.\n\nExample:\ncoins = 1 2 5, amount = 11\nOutput: 3",
    starterCpp: `int coinChange(vector<int>& coins, int amount) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "3 11\n1 2 5\n", expected: "3" },
      { input: "1 3\n2\n", expected: "-1" },
      { input: "1 0\n1\n", expected: "0" }
    ]
  },

  /* ================= MEDIUM — STACKS ================= */
  {
    id: "valid-parentheses-cpp",
    title: "Valid Parentheses (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE", "Frontend Developer"],
    topic: "Stacks",
    description: "Given a string containing '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nExample:\ns = ()[]{}\nOutput: true",
    starterCpp: `bool isValid(string s) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "()[]{}\n", expected: "true" },
      { input: "(]\n", expected: "false" },
      { input: "([)]\n", expected: "false" }
    ]
  },
  {
    id: "daily-temperatures-cpp",
    title: "Daily Temperatures (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Stacks",
    description: "Return an array where answer[i] is the number of days to wait for a warmer temperature after day i.\n\nExample:\ntemps = 73 74 75 71 69 72 76 73\nOutput: 1 1 4 2 1 1 0 0",
    starterCpp: `vector<int> dailyTemperatures(vector<int>& temps) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "8\n73 74 75 71 69 72 76 73\n", expected: "1 1 4 2 1 1 0 0" },
      { input: "4\n30 40 50 60\n", expected: "1 1 1 0" },
      { input: "3\n30 60 90\n", expected: "1 1 0" }
    ]
  },

  /* ================= MEDIUM — INTERVALS / GREEDY ================= */
  {
    id: "merge-intervals-cpp",
    title: "Merge Intervals (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Intervals",
    description: "Merge all overlapping intervals and return the merged array. Input: n intervals, then n lines of 'start end'.\n\nExample:\n3\n1 3\n2 6\n8 10\nOutput: 1 6 8 10",
    starterCpp: `vector<vector<int>> merge(vector<vector<int>>& intervals) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "3\n1 3\n2 6\n8 10\n", expected: "1 6 8 10" },
      { input: "2\n1 4\n4 5\n", expected: "1 5" },
      { input: "2\n1 4\n2 3\n", expected: "1 4" }
    ]
  },
  {
    id: "jump-game-cpp",
    title: "Jump Game (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Greedy",
    description: "Return true if you can reach the last index starting from index 0, where nums[i] is the max jump length.\n\nExample:\nnums = 2 3 1 1 4\nOutput: true",
    starterCpp: `bool canJump(vector<int>& nums) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "5\n2 3 1 1 4\n", expected: "true" },
      { input: "5\n3 2 1 0 4\n", expected: "false" },
      { input: "1\n0\n", expected: "true" }
    ]
  },

  /* ================= MEDIUM — HASHING ================= */
  {
    id: "group-anagrams-cpp",
    title: "Group Anagrams (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Backend Developer"],
    topic: "Hashing",
    description: "Group the anagrams together. Input: n, then n words. Output: number of groups.\n\nExample:\n6\neat tea tan ate nat bat\nOutput: 3",
    starterCpp: `vector<vector<string>> groupAnagrams(vector<string>& strs) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "6\neat\ntea\ntan\nate\nnat\nbat\n", expected: "3" },
      { input: "1\n\n", expected: "1" }
    ]
  },
  {
    id: "top-k-frequent-cpp",
    title: "Top K Frequent Elements (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE", "Data Analyst"],
    topic: "Hashing",
    description: "Return the k most frequent elements. Input: n k, then n numbers.\n\nExample:\n6 2\n1 1 1 2 2 3\nOutput: 1 2",
    starterCpp: `vector<int> topKFrequent(vector<int>& nums, int k) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "6 2\n1 1 1 2 2 3\n", expected: "1 2" },
      { input: "1 1\n1\n", expected: "1" }
    ]
  },

  /* ================= MEDIUM — TREES ================= */
  {
    id: "max-depth-tree-cpp",
    title: "Maximum Depth of Binary Tree (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Trees",
    description: "Return the maximum depth of a binary tree. Input format: number of nodes, then parent-child edges (or -1 null).\n\nExample:\n7\n3 9 20 null null 15 7\nOutput: 3",
    starterCpp: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

int maxDepth(TreeNode* root) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "7\n3 9 20 -1 -1 15 7\n", expected: "3" },
      { input: "0\n", expected: "0" }
    ]
  },
  {
    id: "inorder-traversal-cpp",
    title: "Binary Tree Inorder Traversal (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE"],
    topic: "Trees",
    description: "Return the inorder traversal of a binary tree's node values. Input: number of nodes, then level-order values (-1 for null).\n\nExample:\n3\n1 -1 2 3\nOutput: 1 3 2",
    starterCpp: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

vector<int> inorderTraversal(TreeNode* root) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "4\n1 -1 2 3\n", expected: "1 3 2" },
      { input: "0\n", expected: "" }
    ]
  },

  /* ================= MEDIUM — GRAPHS ================= */
  {
    id: "number-of-islands-cpp",
    title: "Number of Islands (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Graphs",
    description: "Return the number of islands in a grid of '1' (land) and '0' (water). Input: rows cols, then grid lines.\n\nExample:\n2 3\n1 1 0\n1 0 0\nOutput: 1",
    starterCpp: `int numIslands(vector<vector<char>>& grid) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "2 3\n1 1 0\n1 0 0\n", expected: "1" },
      { input: "2 3\n1 1 1\n1 1 1\n", expected: "1" },
      { input: "0 0\n", expected: "0" }
    ]
  },

  /* ================= MORE ARRAYS / STRINGS / DP / HASHING ================= */
  {
    id: "reverse-string-cpp",
    title: "Reverse String (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Frontend Developer"],
    topic: "Strings",
    description: "Reverse the characters of the string in-place. The input is a single word.\n\nExample:\nInput: hello\nOutput: olleh",
    starterCpp: `void reverseString(vector<char>& s) {
    // Your code here
}`,
    cppTestCases: [
      { input: "hello\n", expected: "olleh" },
      { input: "abc\n", expected: "cba" },
      { input: "a\n", expected: "a" }
    ]
  },
  {
    id: "best-time-stock-cpp",
    title: "Best Time to Buy and Sell Stock (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Data Analyst","Backend Developer"],
    topic: "Arrays",
    description: "Given prices where prices[i] is the price on day i, return the maximum profit from one buy and one sell. If no profit is possible, return 0.\n\nExample:\nInput: 7 1 5 3 6 4\nOutput: 5",
    starterCpp: `int maxProfit(vector<int>& prices) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "6\n7 1 5 3 6 4\n", expected: "5" },
      { input: "5\n7 6 4 3 1\n", expected: "0" },
      { input: "3\n2 4 1\n", expected: "2" }
    ]
  },
  {
    id: "contains-duplicate-cpp",
    title: "Contains Duplicate (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Arrays",
    description: "Return true if any value appears at least twice in the array, false if every element is distinct.\n\nExample:\nInput: 1 2 3 1\nOutput: true",
    starterCpp: `bool containsDuplicate(vector<int>& nums) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "4\n1 2 3 1\n", expected: "true" },
      { input: "4\n1 2 3 4\n", expected: "false" },
      { input: "10\n1 1 1 3 3 4 3 2 4 2\n", expected: "true" }
    ]
  },
  {
    id: "merge-sorted-arrays-cpp",
    title: "Merge Two Sorted Arrays (C++)",
    source: "HackerRank",
    difficulty: "Easy",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Sorting",
    description: "Merge two sorted arrays into a single sorted array.\n\nExample:\nInput: a = 1 3 5, b = 2 4 6\nOutput: 1 2 3 4 5 6",
    starterCpp: `vector<int> mergeSorted(vector<int>& a, vector<int>& b) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "3 3\n1 3 5\n2 4 6\n", expected: "1 2 3 4 5 6" },
      { input: "0 2\n\n1 2\n", expected: "1 2" },
      { input: "3 0\n1 2 3\n\n", expected: "1 2 3" }
    ]
  },
  {
    id: "valid-palindrome-2-cpp",
    title: "Valid Palindrome II (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Backend Developer"],
    topic: "Two Pointers",
    description: "Return true if the string can become a palindrome after deleting at most one character.\n\nExample:\nInput: abca\nOutput: true (delete c)",
    starterCpp: `bool validPalindrome(string s) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "abca\n", expected: "true" },
      { input: "abc\n", expected: "false" },
      { input: "aba\n", expected: "true" }
    ]
  },
  {
    id: "two-sum-2-sorted-cpp",
    title: "Two Sum II - Sorted Input (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE","Backend Developer"],
    topic: "Two Pointers",
    description: "Given a 1-indexed sorted array, return the 1-based indices of the two numbers that add up to target.\n\nExample:\nInput: numbers = 2 7 11 15, target = 9\nOutput: 1 2",
    starterCpp: `vector<int> twoSumSorted(vector<int>& numbers, int target) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "4 9\n2 7 11 15\n", expected: "1 2" },
      { input: "3 6\n2 3 4\n", expected: "1 3" },
      { input: "2 -1\n-1 0\n", expected: "1 2" }
    ]
  },
  {
    id: "longest-substr-no-repeat-cpp",
    title: "Longest Substring Without Repeating Characters (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE","Backend Developer","Frontend Developer"],
    topic: "Sliding Window",
    description: "Find the length of the longest substring without repeating characters.\n\nExample:\nInput: abcabcbb\nOutput: 3",
    starterCpp: `int lengthOfLongestSubstring(string s) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "abcabcbb\n", expected: "3" },
      { input: "bbbbb\n", expected: "1" },
      { input: "pwwkew\n", expected: "3" }
    ]
  },
  {
    id: "min-window-substring-cpp",
    title: "Minimum Window Substring (C++)",
    source: "LeetCode",
    difficulty: "Hard",
    targetRoles: ["SDE"],
    topic: "Sliding Window",
    description: "Return the minimum window of s that contains every character of t (including duplicates), or an empty string if none exists.\n\nExample:\nInput: s = ADOBECODEBANC, t = ABC\nOutput: BANC",
    starterCpp: `string minWindow(string s, string t) {
    // Your code here
    return "";
}`,
    cppTestCases: [
      { input: "ADOBECODEBANC ABC\n", expected: "BANC" },
      { input: "a a\n", expected: "a" },
      { input: "a aa\n", expected: "" }
    ]
  },
  {
    id: "longest-common-subseq-cpp",
    title: "Longest Common Subsequence (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Dynamic Programming",
    description: "Return the length of the longest common subsequence of two strings.\n\nExample:\nInput: abcde ace\nOutput: 3",
    starterCpp: `int longestCommonSubsequence(string text1, string text2) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "abcde ace\n", expected: "3" },
      { input: "abc abc\n", expected: "3" },
      { input: "abc def\n", expected: "0" }
    ]
  },
  {
    id: "edit-distance-cpp",
    title: "Edit Distance (C++)",
    source: "LeetCode",
    difficulty: "Hard",
    targetRoles: ["SDE"],
    topic: "Dynamic Programming",
    description: "Return the minimum number of insert, delete or replace operations to convert word1 into word2. Each word is on its own line and may be empty.\n\nExample:\nInput:\nhorse\nros\nOutput: 3",
    starterCpp: `int minDistance(string word1, string word2) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "horse\nros\n", expected: "3" },
      { input: "intention\nexecution\n", expected: "5" },
      { input: "\na\n", expected: "1" }
    ]
  },
  {
    id: "intersection-two-arrays-cpp",
    title: "Intersection of Two Arrays (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Hashing",
    description: "Return the unique elements common to both arrays, in ascending order.\n\nExample:\nInput: nums1 = 1 2 2 1, nums2 = 2 2\nOutput: 2",
    starterCpp: `vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {
    // Your code here (the result is printed in ascending order)
    return {};
}`,
    cppTestCases: [
      { input: "4 2\n1 2 2 1\n2 2\n", expected: "2" },
      { input: "3 5\n4 9 5\n9 4 9 8 4\n", expected: "4 9" },
      { input: "2 2\n1 2\n3 4\n", expected: "" }
    ]
  },
  {
    id: "isomorphic-strings-cpp",
    title: "Isomorphic Strings (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Backend Developer"],
    topic: "Hashing",
    description: "Return true if two strings are isomorphic (characters can be replaced one-to-one to get the other).\n\nExample:\nInput: egg add\nOutput: true",
    starterCpp: `bool isIsomorphic(string s, string t) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "egg add\n", expected: "true" },
      { input: "foo bar\n", expected: "false" },
      { input: "paper title\n", expected: "true" }
    ]
  },
  {
    id: "sort-colors-cpp",
    title: "Sort Colors (Dutch Flag) (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Sorting",
    description: "Sort an array containing only 0, 1 and 2 in-place, without the library sort.\n\nExample:\nInput: 2 0 2 1 1 0\nOutput: 0 0 1 1 2 2",
    starterCpp: `void sortColors(vector<int>& nums) {
    // Your code here
}`,
    cppTestCases: [
      { input: "6\n2 0 2 1 1 0\n", expected: "0 0 1 1 2 2" },
      { input: "3\n2 0 1\n", expected: "0 1 2" },
      { input: "1\n0\n", expected: "0" }
    ]
  },
  {
    id: "meeting-rooms-cpp",
    title: "Meeting Rooms (C++)",
    source: "LeetCode",
    difficulty: "Easy",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Intervals",
    description: "Given meeting intervals [start, end], return true if one person can attend all meetings. Input: n, then n lines of \"start end\".\n\nExample:\nInput:\n3\n0 30\n5 10\n15 20\nOutput: false",
    starterCpp: `bool canAttendMeetings(vector<vector<int>>& intervals) {
    // Your code here
    return false;
}`,
    cppTestCases: [
      { input: "3\n0 30\n5 10\n15 20\n", expected: "false" },
      { input: "2\n7 10\n2 4\n", expected: "true" },
      { input: "0\n", expected: "true" }
    ]
  },
  {
    id: "product-array-except-self-cpp",
    title: "Product of Array Except Self (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Arrays",
    description: "Return an array where answer[i] is the product of all elements except nums[i], without using division.\n\nExample:\nInput: 1 2 3 4\nOutput: 24 12 8 6",
    starterCpp: `vector<int> productExceptSelf(vector<int>& nums) {
    // Your code here
    return {};
}`,
    cppTestCases: [
      { input: "4\n1 2 3 4\n", expected: "24 12 8 6" },
      { input: "5\n-1 1 0 -3 3\n", expected: "0 0 9 0 0" },
      { input: "2\n0 0\n", expected: "0 0" }
    ]
  },
  {
    id: "subarray-sum-equals-k-cpp",
    title: "Subarray Sum Equals K (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Hashing",
    description: "Return the number of contiguous subarrays whose sum equals k. Input: n and k, then the array.\n\nExample:\nInput: n=3 k=2, nums = 1 1 1\nOutput: 2",
    starterCpp: `int subarraySum(vector<int>& nums, int k) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "3 2\n1 1 1\n", expected: "2" },
      { input: "3 3\n1 2 3\n", expected: "2" },
      { input: "1 0\n1\n", expected: "0" }
    ]
  },
  {
    id: "longest-consecutive-sequence-cpp",
    title: "Longest Consecutive Sequence (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE","Data Analyst"],
    topic: "Hashing",
    description: "Return the length of the longest run of consecutive integers in the unsorted array, in O(n) time.\n\nExample:\nInput: 100 4 200 1 3 2\nOutput: 4",
    starterCpp: `int longestConsecutive(vector<int>& nums) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "6\n100 4 200 1 3 2\n", expected: "4" },
      { input: "10\n0 3 7 2 5 8 4 6 0 1\n", expected: "9" },
      { input: "0\n\n", expected: "0" }
    ]
  },
  {
    id: "task-scheduler-cpp",
    title: "Task Scheduler (C++)",
    source: "LeetCode",
    difficulty: "Medium",
    targetRoles: ["SDE"],
    topic: "Greedy",
    description: "Given tasks (a string of letters) and a cooldown n between identical tasks, return the least number of time units to finish all tasks.\n\nExample:\nInput: AAABBB 2\nOutput: 8",
    starterCpp: `int leastInterval(vector<char>& tasks, int n) {
    // Your code here
    return 0;
}`,
    cppTestCases: [
      { input: "AAABBB 2\n", expected: "8" },
      { input: "AAABBB 0\n", expected: "6" },
      { input: "AAAAAABCDEFG 2\n", expected: "16" }
    ]
  }
];
