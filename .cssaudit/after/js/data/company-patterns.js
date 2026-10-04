// Company-Specific Interview Patterns & DSA Pattern Master List
const COMPANY_PATTERNS = {
  companies: [
    { name: "Amazon", logo: "logo-amazon", tagline: "Leadership principles + DSA heavy", difficulty: "Hard" },
    { name: "Google", logo: "logo-google", tagline: "Algorithmic excellence & problem solving", difficulty: "Hard" },
    { name: "Microsoft", logo: "logo-microsoft", tagline: "DSA + system design + behavioral", difficulty: "Hard" },
    { name: "TCS", logo: "logo-tcs", tagline: "Aptitude + core CS + HR", difficulty: "Medium" },
    { name: "Infosys", logo: "logo-infosys", tagline: "Puzzle + logical + HR", difficulty: "Medium" },
    { name: "Wipro", logo: "logo-wipro", tagline: "Aptitude + programming + communication", difficulty: "Medium" },
    { name: "Meta", logo: "logo-meta", tagline: "DSA + behavioral (SDE)", difficulty: "Hard" },
    { name: "Cognizant", logo: "logo-cognizant", tagline: "Aptitude + coding + communication", difficulty: "Easy" },
    { name: "Accenture", logo: "logo-accenture", tagline: "Aptitude + pseudo-code + HR", difficulty: "Medium" }
  ],
  patterns: [
    {
      id: "sliding-window",
      name: "Sliding Window",
      icon: "svg-window",
      difficulty: "Easy",
      companies: ["Amazon", "Google", "Microsoft", "Meta"],
      desc: "Efficiently process contiguous subarrays/substrings with a moving window.",
      strategy: "Maintain left & right pointers. Expand right, shrink left when a constraint is violated. Track answer at each valid window.",
      time: "O(n)",
      space: "O(1)",
      sample: "function maxSumSubarray(arr, k) {\n  let max = 0, sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    sum += arr[i];\n    if (i >= k) sum -= arr[i - k];\n    if (i >= k - 1) max = Math.max(max, sum);\n  }\n  return max;\n}",
      problems: ["Longest Substring Without Repeating Characters", "Max Sum Subarray of Size K", "Minimum Window Substring"]
    },
    {
      id: "two-pointers",
      name: "Two Pointers",
      icon: "svg-pointers",
      difficulty: "Easy",
      companies: ["Amazon", "Microsoft", "TCS"],
      desc: "Use two indices to scan an array from opposite ends or same direction.",
      strategy: "Sort array first if needed. Move pointers based on comparison with target to avoid O(n²) nested loops.",
      time: "O(n)",
      space: "O(1)",
      sample: "function twoSumSorted(arr, target) {\n  let l = 0, r = arr.length - 1;\n  while (l < r) {\n    const sum = arr[l] + arr[r];\n    if (sum === target) return [l, r];\n    sum < target ? l++ : r--;\n  }\n  return [-1, -1];\n}",
      problems: ["Pair with Given Sum", "3Sum", "Container With Most Water"]
    },
    {
      id: "monotonic-stack",
      name: "Monotonic Stack",
      icon: "svg-stack",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Meta"],
      desc: "Stack that maintains increasing/decreasing order for next-greater problems.",
      strategy: "Pop while stack top violates monotonic property. The stack stores indices for range computations.",
      time: "O(n)",
      space: "O(n)",
      sample: "function nextGreater(arr) {\n  const res = new Array(arr.length).fill(-1), st = [];\n  for (let i = 0; i < arr.length; i++) {\n    while (st.length && arr[st[st.length-1]] < arr[i]) {\n      res[st.pop()] = arr[i];\n    }\n    st.push(i);\n  }\n  return res;\n}",
      problems: ["Next Greater Element", "Daily Temperatures", "Largest Rectangle in Histogram"]
    },
    {
      id: "bfs-dfs",
      name: "BFS / DFS (Graphs)",
      icon: "svg-graph",
      difficulty: "Medium",
      companies: ["Amazon", "Google", "Microsoft", "Meta"],
      desc: "Traverse trees and graphs — BFS for shortest path, DFS for connectivity.",
      strategy: "BFS uses a queue (level order), DFS uses recursion/stack. Track visited set to avoid cycles.",
      time: "O(V + E)",
      space: "O(V)",
      sample: "function bfs(graph, start) {\n  const q = [start], visited = new Set([start]);\n  while (q.length) {\n    const node = q.shift();\n    for (const n of graph[node]) {\n      if (!visited.has(n)) { visited.add(n); q.push(n); }\n    }\n  }\n  return [...visited];\n}",
      problems: ["Number of Islands", "Clone Graph", "Rotting Oranges"]
    },
    {
      id: "binary-search",
      name: "Binary Search",
      icon: "svg-search",
      difficulty: "Easy",
      companies: ["Google", "Amazon", "TCS"],
      desc: "Search sorted data in O(log n) by halving the search space.",
      strategy: "Works on sorted arrays & on the answer space (monotonic predicates). Beware off-by-one errors.",
      time: "O(log n)",
      space: "O(1)",
      sample: "function binarySearch(arr, target) {\n  let l = 0, r = arr.length - 1;\n  while (l <= r) {\n    const m = Math.floor((l + r) / 2);\n    if (arr[m] === target) return m;\n    arr[m] < target ? l = m + 1 : r = m - 1;\n  }\n  return -1;\n}",
      problems: ["Search in Rotated Sorted Array", "First & Last Position", "Koko Eating Bananas"]
    },
    {
      id: "top-k-heap",
      name: "Top-K Heap",
      icon: "svg-heap",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft"],
      desc: "Find K largest/smallest/frequent elements using a min/max heap.",
      strategy: "Use a min-heap of size K for K largest. For K frequent, count frequencies then heap on count.",
      time: "O(n log k)",
      space: "O(n)",
      sample: "class MinHeap {\n  constructor(cap) { this.cap = cap; this.data = []; }\n  push(v) {\n    this.data.push(v); this.data.sort((a,b)=>a-b);\n    if (this.data.length > this.cap) this.data.shift();\n  }\n}\nfunction topK(arr, k) {\n  const h = new MinHeap(k);\n  arr.forEach(x => h.push(x));\n  return h.data;\n}",
      problems: ["Kth Largest Element", "Top K Frequent Elements", "Find Median from Data Stream"]
    },
    {
      id: "dynamic-programming",
      name: "Dynamic Programming",
      icon: "svg-dp",
      difficulty: "Hard",
      companies: ["Google", "Amazon", "Meta"],
      desc: "Solve problems by combining solutions to overlapping subproblems.",
      strategy: "Define dp state, find recurrence, handle base cases. Start with recursion+memoization, convert to tabulation.",
      time: "Varies",
      space: "Varies",
      sample: "function fib(n) {\n  const dp = [0, 1];\n  for (let i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];\n  return dp[n];\n}",
      problems: ["House Robber", "Longest Common Subsequence", "Coin Change"]
    },
    {
      id: "backtracking",
      name: "Backtracking",
      icon: "svg-backtrack",
      difficulty: "Medium",
      companies: ["Amazon", "Microsoft"],
      desc: "Explore all candidates and backtrack when a path is invalid.",
      strategy: "Recursively build solution, add current choice, recurse, then undo (remove) the choice.",
      time: "O(2ⁿ) worst",
      space: "O(n)",
      sample: "function subsets(nums) {\n  const res = [];\n  function backtrack(start, path) {\n    res.push([...path]);\n    for (let i = start; i < nums.length; i++) {\n      path.push(nums[i]);\n      backtrack(i + 1, path);\n      path.pop();\n    }\n  }\n  backtrack(0, []);\n  return res;\n}",
      problems: ["Permutations", "Subsets", "N-Queens"]
    },
    {
      id: "greedy",
      name: "Greedy",
      icon: "svg-greedy",
      difficulty: "Medium",
      companies: ["Google", "TCS"],
      desc: "Make the locally optimal choice at each step hoping to reach global optimum.",
      strategy: "Sort + iterate with a greedy rule. Prove correctness with exchange argument if possible.",
      time: "O(n log n)",
      space: "O(1)",
      sample: "function coinChangeGreedy(coins, amt) {\n  coins.sort((a,b)=>b-a);\n  let count = 0;\n  for (const c of coins) {\n    count += Math.floor(amt / c);\n    amt %= c;\n  }\n  return amt === 0 ? count : -1;\n}",
      problems: ["Activity Selection", "Jump Game", "Task Scheduler"]
    },
    {
      id: "trie",
      name: "Trie (Prefix Tree)",
      icon: "svg-trie",
      difficulty: "Hard",
      companies: ["Google", "Microsoft", "Amazon"],
      desc: "Tree structure for efficient prefix-based string operations.",
      strategy: "Each node has children map + isEnd flag. Insert and search char by char.",
      time: "O(L) per op",
      space: "O(L·N)",
      sample: "class Trie {\n  constructor() { this.root = {}; }\n  insert(w) {\n    let n = this.root;\n    for (const c of w) n = n[c] = n[c] || {};\n    n.isEnd = true;\n  }\n  search(w) {\n    let n = this.root;\n    for (const c of w) { if (!n[c]) return false; n = n[c]; }\n    return !!n.isEnd;\n  }\n}",
      problems: ["Implement Trie", "Word Search II", "Autocomplete System"]
    }
  ]
};

// Expanded question patterns per company for HR/technical insights
const COMPANY_QUESTIONS = {
  "Amazon": ["Tell me about a time you disagreed with a teammate.", "Describe a time you took a calculated risk.", "Explain a project where you showed ownership.", "How do you handle ambiguity?", "Why Amazon?", "Walk me through your resume."],
  "Google": ["Describe your most challenging technical problem.", "How would you design a URL shortener?", "Tell me about a conflict you resolved.", "What's your biggest failure and what did you learn?", "Why Google?"],
  "Microsoft": ["Describe a time you had to learn a new technology fast.", "Tell me about a time you led a team.", "How do you prioritize tasks?", "Explain your dream project.", "Why Microsoft?"],
  "TCS": ["Introduce yourself.", "Why do you want to join TCS?", "Where do you see yourself in 5 years?", "Describe a teamwork experience.", "What are your strengths and weaknesses?"],
  "Infosys": ["Tell me about yourself.", "Why Infosys?", "Describe a challenging situation at college.", "What do you know about our company?", "Are you willing to relocate?"],
  "Wipro": ["Tell me about yourself.", "What are your salary expectations?", "Describe a time you failed.", "Why Wipro?", "What are your hobbies?"],
  "Meta": ["Tell me about a time you had a conflict with a coworker.", "Describe a moment you went above and beyond.", "How do you give feedback?", "What motivates you?", "Why Meta?"],
  "Cognizant": ["Introduce yourself.", "Why Cognizant?", "Describe your leadership experience.", "How do you manage stress?", "Where do you see yourself in 5 years?"],
  "Accenture": ["Tell me about yourself.", "Why Accenture?", "Describe a time you worked in a team.", "What are your career goals?", "How do you handle pressure?"]
};
