const { A } = require('../dsl.cjs');
const J = (x) => JSON.stringify(x);
const TREE_NOTE = '// TreeNode { val, left, right } is predefined. Tests build trees with fromTree([..]).';

function randTree(r, maxNodes) {
  const n = r.int(0, maxNodes);
  if (n === 0) return [];
  const nodes = [{ v: r.int(0, 9), l: null, r: null }];
  for (let i = 1; i < n; i++) {
    const node = { v: r.int(0, 9), l: null, r: null };
    for (let t = 0; t < 20; t++) { const p = nodes[r.int(0, nodes.length - 1)]; const side = r.next() < 0.5 ? 'l' : 'r'; if (!p[side]) { p[side] = node; break; } }
    nodes.push(node);
  }
  const out = []; const q = [nodes[0]];
  while (q.length) { const x = q.shift(); if (x) { out.push(x.v); q.push(x.l, x.r); } else out.push(null); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
const grid = (r, rows, cols, choices) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => r.pick(choices)));

module.exports = [
  {
    id: 'level-order', title: 'Binary Tree Level Order Traversal', d: 'M', topic: 'Trees', roles: ['SDE', 'Backend Developer'],
    desc: "Return the level order traversal of a binary tree: the node values level by level, from left to right, as an array of arrays.\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]",
    fn: 'levelOrder', params: 'root', constraints: '0 ≤ n ≤ 2000',
    starter: `function levelOrder(root) {\n  ${TREE_NOTE}\n  // Your code here\n}`,
    expr: (a) => `levelOrder(fromTree(${J(a)}))`,
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1]], [[]], [[1, 2, 3, 4, 5, 6, 7]], [[1, null, 2, null, 3]], [[1, 2, null, 3, null, 4]]],
    gen: (r) => [randTree(r, 10)],
    approaches: [
      A('Recursion with a depth argument', 'Visit nodes depth-first and append each value to the array for its depth.', 'O(n)', 'O(h)', `function levelOrder(root) {
  const out = [];
  const go = (n, d) => { if (!n) return; (out[d] = out[d] || []).push(n.val); go(n.left, d + 1); go(n.right, d + 1); };
  go(root, 0);
  return out;
}`, { note: 'Space is O(h) for the recursion plus the output.' }),
      A('Breadth-first search by level', 'Process one whole level at a time with a queue: take as many nodes as the queue holds now, then their children form the next level.', 'O(n)', 'O(n)', `function levelOrder(root) {
  const out = [];
  let q = root ? [root] : [];
  while (q.length) {
    out.push(q.map((n) => n.val));
    q = q.flatMap((n) => [n.left, n.right].filter(Boolean));
  }
  return out;
}`)
    ]
  },
  {
    id: 'number-of-islands', title: 'Number of Islands', d: 'M', topic: 'Graphs', roles: ['SDE', 'Backend Developer'],
    desc: "Given a grid of '1' (land) and '0' (water), return the number of islands. An island is land connected horizontally or vertically.\n\nExample:\nInput: grid = [['1','1','0'],['1','0','0'],['0','0','1']]\nOutput: 2",
    fn: 'numIslands', params: 'grid', constraints: '1 ≤ m, n ≤ 300',
    tests: [[[['1', '1', '0'], ['1', '0', '0'], ['0', '0', '1']]], [[['1', '1', '1'], ['1', '1', '1']]], [[['0']]], [[['1']]], [[['1', '0', '1', '0', '1']]], [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]]],
    gen: (r) => [grid(r, r.int(1, 5), r.int(1, 5), ['0', '1'])],
    approaches: [
      A('Flood fill with DFS', 'Scan the grid; at each unvisited land cell count one island and sink every connected land cell using recursion.', 'O(m·n)', 'O(m·n)', `function numIslands(grid) {
  const g = grid.map((r) => [...r]);
  const dfs = (i, j) => {
    if (i < 0 || j < 0 || i >= g.length || j >= g[0].length || g[i][j] !== '1') return;
    g[i][j] = '0';
    dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1);
  };
  let c = 0;
  for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) if (g[i][j] === '1') { c++; dfs(i, j); }
  return c;
}`, { note: 'Recursion depth can reach m·n on a grid that is all land; use BFS for very large grids.' }),
      A('Flood fill with BFS', 'Same idea with a queue, so no deep recursion.', 'O(m·n)', 'O(min(m, n))', `function numIslands(grid) {
  const g = grid.map((r) => [...r]);
  let c = 0;
  for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) {
    if (g[i][j] !== '1') continue;
    c++; g[i][j] = '0';
    const q = [[i, j]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = y + dy;
        if (a >= 0 && b >= 0 && a < g.length && b < g[0].length && g[a][b] === '1') { g[a][b] = '0'; q.push([a, b]); }
      }
    }
  }
  return c;
}`),
      A('Union-Find', 'Start with every land cell as its own island and merge neighbours. The number of sets left is the answer. Useful when land cells arrive over time.', 'O(m·n·α)', 'O(m·n)', `function numIslands(grid) {
  const m = grid.length, n = grid[0].length, p = Array.from({ length: m * n }, (_, i) => i);
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  let c = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (grid[i][j] === '1') c++;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    if (grid[i][j] !== '1') continue;
    for (const [a, b] of [[i + 1, j], [i, j + 1]]) {
      if (a < m && b < n && grid[a][b] === '1') { const x = find(i * n + j), y = find(a * n + b); if (x !== y) { p[x] = y; c--; } }
    }
  }
  return c;
}`, { note: 'α is the inverse Ackermann function: effectively a constant.' })
    ]
  },
  {
    id: 'clone-graph', title: 'Clone Graph', d: 'M', topic: 'Graphs', roles: ['SDE', 'Backend Developer'],
    desc: 'Return a deep copy of a connected undirected graph given a reference to one node. Each node has val and neighbors. The tests build graphs with fromGraph(adjacencyList) (nodes numbered from 1) and check that the copy has the same shape and shares no node with the original.\n\nExample:\nadjacency [[2,4],[1,3],[2,4],[1,3]] is a square of four nodes.',
    fn: 'cloneGraph', params: 'node', constraints: '0 ≤ n ≤ 100', uniform: true,
    starter: 'function cloneGraph(node) {\n  // GraphNode { val, neighbors } is predefined. Return the copy of node.\n  // Your code here\n}',
    expr: (adj) => `(() => { const g = fromGraph(${J(adj)}); return isDeepClone(g, cloneGraph(g)); })()`,
    tests: [[[[2, 4], [1, 3], [2, 4], [1, 3]]], [[[]]], [[]], [[[2], [1]]], [[[2, 3], [1, 3], [1, 2]]], [[[2], [1, 3], [2]]]],
    gen: (r) => { const n = r.int(0, 6); if (!n) return [[]]; const adj = Array.from({ length: n }, () => new Set()); for (let i = 1; i < n; i++) { const j = r.int(0, i - 1); adj[i].add(j + 1); adj[j].add(i + 1); } for (let k = 0; k < r.int(0, n); k++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) { adj[a].add(b + 1); adj[b].add(a + 1); } } return [adj.map((s) => [...s].sort((x, y) => x - y))]; },
    approaches: [
      A('DFS with a map of copies', 'Copy a node, remember it in a map from original to copy, and recurse into neighbours. The map prevents infinite loops on cycles.', 'O(V + E)', 'O(V)', `function cloneGraph(node) {
  if (!node) return null;
  const copy = new Map();
  const go = (n) => {
    if (copy.has(n)) return copy.get(n);
    const c = new GraphNode(n.val);
    copy.set(n, c);
    c.neighbors = n.neighbors.map(go);
    return c;
  };
  return go(node);
}`),
      A('BFS with a map of copies', 'Create the copy of each node when it is first discovered, then connect copies while walking the original with a queue.', 'O(V + E)', 'O(V)', `function cloneGraph(node) {
  if (!node) return null;
  const copy = new Map([[node, new GraphNode(node.val)]]);
  const q = [node];
  while (q.length) {
    const n = q.shift();
    for (const nb of n.neighbors) {
      if (!copy.has(nb)) { copy.set(nb, new GraphNode(nb.val)); q.push(nb); }
      copy.get(n).neighbors.push(copy.get(nb));
    }
  }
  return copy.get(node);
}`)
    ]
  },
  {
    id: 'valid-tree-prerequisites', title: 'Course Schedule', d: 'M', topic: 'Graphs', roles: ['SDE', 'Backend Developer'],
    desc: 'There are numCourses courses labelled 0..numCourses-1. A pair [a, b] means you must take course b before course a. Return true if it is possible to finish every course (the prerequisites contain no cycle).\n\nExample:\nInput: numCourses = 2, prerequisites = [[1,0]]\nOutput: true',
    fn: 'canFinish', params: 'numCourses, prerequisites', constraints: '1 ≤ numCourses ≤ 2000',
    tests: [[2, [[1, 0]]], [2, [[1, 0], [0, 1]]], [1, []], [4, [[1, 0], [2, 1], [3, 2]]], [3, [[0, 1], [1, 2], [2, 0]]], [5, [[1, 4], [2, 4], [3, 1], [3, 2]]], [3, [[1, 0], [1, 2], [0, 1]]]],
    gen: (r) => { const n = r.int(1, 6); const e = []; for (let i = 0; i < r.int(0, 8); i++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) e.push([a, b]); } return [n, e]; },
    approaches: [
      A('DFS cycle detection', 'Colour nodes white/grey/black while exploring prerequisites. Reaching a grey node (one still on the current path) means a cycle.', 'O(V + E)', 'O(V + E)', `function canFinish(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  for (const [a, b] of prerequisites) adj[b].push(a);
  const state = new Array(numCourses).fill(0);
  const dfs = (u) => {
    if (state[u] === 1) return false;
    if (state[u] === 2) return true;
    state[u] = 1;
    for (const v of adj[u]) if (!dfs(v)) return false;
    state[u] = 2;
    return true;
  };
  for (let i = 0; i < numCourses; i++) if (!dfs(i)) return false;
  return true;
}`),
      A("Kahn's algorithm (topological sort)", 'Repeatedly take courses with no remaining prerequisites. If every course gets taken there is no cycle.', 'O(V + E)', 'O(V + E)', `function canFinish(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []), indeg = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) { adj[b].push(a); indeg[a]++; }
  const q = [];
  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) q.push(i);
  let done = 0;
  while (q.length) { const u = q.shift(); done++; for (const v of adj[u]) if (--indeg[v] === 0) q.push(v); }
  return done === numCourses;
}`)
    ]
  },
  {
    id: 'rotting-oranges', title: 'Rotting Oranges', d: 'M', topic: 'Graphs', roles: ['SDE'],
    desc: 'In a grid, 0 is empty, 1 is a fresh orange and 2 is a rotten orange. Every minute each fresh orange next to a rotten one (up, down, left, right) rots. Return the minutes until no fresh orange is left, or -1 if that never happens.\n\nExample:\nInput: grid = [[2,1,1],[1,1,0],[0,1,1]]\nOutput: 4',
    fn: 'orangesRotting', params: 'grid', constraints: '1 ≤ m, n ≤ 10',
    tests: [[[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], [[[0, 2]]], [[[0]]], [[[1]]], [[[2, 2], [1, 1], [0, 0], [2, 2]]], [[[1, 2, 1, 1, 2, 1, 1]]]],
    gen: (r) => [grid(r, r.int(1, 4), r.int(1, 4), [0, 1, 1, 2])],
    approaches: [
      A('Simulate minute by minute', 'Each minute scan the whole grid and rot every fresh orange touching a rotten one. Stop when nothing changes.', 'O((m·n)²)', 'O(m·n)', `function orangesRotting(grid) {
  let g = grid.map((r) => [...r]), t = 0;
  for (;;) {
    const next = g.map((r) => [...r]);
    let changed = false;
    for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) {
      if (g[i][j] !== 1) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[i + a] && g[i + a][j + b] === 2)) { next[i][j] = 2; changed = true; }
    }
    if (!changed) break;
    g = next; t++;
  }
  return g.some((r) => r.includes(1)) ? -1 : t;
}`),
      A('Multi-source BFS', 'Put every rotten orange in the queue and spread level by level. The number of levels is the number of minutes; each cell is processed once.', 'O(m·n)', 'O(m·n)', `function orangesRotting(grid) {
  const g = grid.map((r) => [...r]);
  let q = [], fresh = 0, t = 0;
  for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) { if (g[i][j] === 2) q.push([i, j]); else if (g[i][j] === 1) fresh++; }
  while (q.length && fresh) {
    const next = [];
    for (const [i, j] of q) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + a, y = j + b;
      if (g[x] && g[x][y] === 1) { g[x][y] = 2; fresh--; next.push([x, y]); }
    }
    q = next; t++;
  }
  return fresh ? -1 : t;
}`)
    ]
  },
  {
    id: 'surrounded-regions', title: 'Surrounded Regions', d: 'M', topic: 'Graphs', roles: ['SDE'],
    desc: "Given a board of 'X' and 'O', capture every region of 'O' that is completely surrounded by 'X' by flipping it to 'X'. An 'O' on the border, or connected to one, is not captured. Return the board.\n\nExample:\nInput: [['X','X','X','X'],['X','O','O','X'],['X','X','O','X'],['X','O','X','X']]\nOutput: [['X','X','X','X'],['X','X','X','X'],['X','X','X','X'],['X','O','X','X']]",
    fn: 'solve', params: 'board', constraints: '1 ≤ m, n ≤ 200',
    tests: [[[['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']]], [[['O', 'O'], ['O', 'O']]], [[['X']]], [[['O']]], [[['X', 'O', 'X'], ['O', 'X', 'O'], ['X', 'O', 'X']]], [[['X', 'X', 'X'], ['X', 'O', 'X'], ['X', 'X', 'X']]]],
    gen: (r) => [grid(r, r.int(1, 5), r.int(1, 5), ['X', 'O'])],
    approaches: [
      A('Check each region for a border cell', 'For every O region flood-fill it and see whether it touches the border. Flip it only if it does not. Regions are rediscovered rarely but each check is a full flood fill.', 'O(m·n)', 'O(m·n)', `function solve(board) {
  const b = board.map((r) => [...r]), m = b.length, n = b[0].length, seen = Array.from({ length: m }, () => new Array(n).fill(false));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    if (b[i][j] !== 'O' || seen[i][j]) continue;
    const cells = [[i, j]]; seen[i][j] = true; let border = false;
    for (let k = 0; k < cells.length; k++) {
      const [x, y] = cells[k];
      if (x === 0 || y === 0 || x === m - 1 || y === n - 1) border = true;
      for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = x + a, q = y + c;
        if (p >= 0 && q >= 0 && p < m && q < n && b[p][q] === 'O' && !seen[p][q]) { seen[p][q] = true; cells.push([p, q]); }
      }
    }
    if (!border) for (const [x, y] of cells) b[x][y] = 'X';
  }
  return b;
}`),
      A('Mark safe cells from the border (DFS)', 'Any O connected to the border is safe. Mark those from every border O, then flip every unmarked O to X and restore the marks.', 'O(m·n)', 'O(m·n)', `function solve(board) {
  const b = board.map((r) => [...r]), m = b.length, n = b[0].length;
  const dfs = (i, j) => {
    if (i < 0 || j < 0 || i >= m || j >= n || b[i][j] !== 'O') return;
    b[i][j] = '#';
    dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1);
  };
  for (let i = 0; i < m; i++) { dfs(i, 0); dfs(i, n - 1); }
  for (let j = 0; j < n; j++) { dfs(0, j); dfs(m - 1, j); }
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) b[i][j] = b[i][j] === '#' ? 'O' : 'X';
  return b;
}`),
      A('Union-Find with a border node', 'Union each O with its O neighbours and union every border O with a special "outside" node. Cells not joined to outside are captured.', 'O(m·n·α)', 'O(m·n)', `function solve(board) {
  const m = board.length, n = board[0].length, out = m * n, p = Array.from({ length: m * n + 1 }, (_, i) => i);
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  const union = (a, c) => { p[find(a)] = find(c); };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    if (board[i][j] !== 'O') continue;
    if (i === 0 || j === 0 || i === m - 1 || j === n - 1) union(i * n + j, out);
    if (i + 1 < m && board[i + 1][j] === 'O') union(i * n + j, (i + 1) * n + j);
    if (j + 1 < n && board[i][j + 1] === 'O') union(i * n + j, i * n + j + 1);
  }
  return board.map((r, i) => r.map((c, j) => (c === 'O' && find(i * n + j) === find(out) ? 'O' : 'X')));
}`)
    ]
  },
  {
    id: 'word-search', title: 'Word Search', d: 'M', topic: 'Backtracking', roles: ['SDE'],
    desc: 'Given a grid of letters and a word, return true if the word can be formed by a path of adjacent cells (up, down, left, right) where no cell is used twice.\n\nExample:\nInput: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"\nOutput: true',
    fn: 'exist', params: 'board, word', constraints: '1 ≤ m, n ≤ 6, 1 ≤ length ≤ 15', sizes: [4, 6, 8, 10, 12, 15],
    tests: [[[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCCED'], [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'SEE'], [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCB'], [[['A']], 'A'], [[['A', 'A']], 'AAA'], [[['a', 'b'], ['c', 'd']], 'acdb'], [[['C', 'A', 'A'], ['A', 'A', 'A'], ['B', 'C', 'D']], 'AAB']],
    gen: (r) => [grid(r, r.int(1, 4), r.int(1, 4), ['A', 'B', 'C']), r.str(r.int(1, 6), 'ABC')],
    approaches: [
      A('Backtracking from every cell', 'Start a depth-first search at each cell. Mark a cell as used while exploring and unmark it when backtracking.', 'O(m·n·4^L)', 'O(L)', `function exist(board, word) {
  const m = board.length, n = board[0].length, seen = board.map((r) => r.map(() => false));
  const dfs = (i, j, k) => {
    if (k === word.length) return true;
    if (i < 0 || j < 0 || i >= m || j >= n || seen[i][j] || board[i][j] !== word[k]) return false;
    seen[i][j] = true;
    const ok = dfs(i + 1, j, k + 1) || dfs(i - 1, j, k + 1) || dfs(i, j + 1, k + 1) || dfs(i, j - 1, k + 1);
    seen[i][j] = false;
    return ok;
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (dfs(i, j, 0)) return true;
  return false;
}`, { note: 'L is the length of the word; each step branches into at most 3 new directions in practice (not 4), but 4^L is the usual bound.' }),
      A('Backtracking with pruning', 'Before searching, fail fast if the grid lacks enough of some letter. Also search from whichever end of the word has the rarer first letter, which cuts the number of starting points.', 'O(m·n·4^L)', 'O(L)', `function exist(board, word) {
  const m = board.length, n = board[0].length, cnt = {};
  for (const r of board) for (const c of r) cnt[c] = (cnt[c] || 0) + 1;
  const need = {};
  for (const c of word) need[c] = (need[c] || 0) + 1;
  for (const c of Object.keys(need)) if ((cnt[c] || 0) < need[c]) return false;
  if ((cnt[word[word.length - 1]] || 0) < (cnt[word[0]] || 0)) word = word.split('').reverse().join('');
  const dfs = (i, j, k) => {
    if (k === word.length) return true;
    if (i < 0 || j < 0 || i >= m || j >= n || board[i][j] !== word[k]) return false;
    const keep = board[i][j];
    board[i][j] = '#';
    const ok = dfs(i + 1, j, k + 1) || dfs(i - 1, j, k + 1) || dfs(i, j + 1, k + 1) || dfs(i, j - 1, k + 1);
    board[i][j] = keep;
    return ok;
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (dfs(i, j, 0)) return true;
  return false;
}`, { note: 'Modifying the board in place avoids the extra visited array.' })
    ]
  },
  {
    id: 'coin-change', title: 'Coin Change', d: 'M', topic: 'Dynamic Programming', roles: ['SDE', 'Backend Developer'], sizes: [5, 10, 15, 20, 25, 30],
    desc: 'Given coin denominations and an amount, return the fewest coins needed to make that amount, or -1 if it cannot be made. You have unlimited coins of each type.\n\nExample:\nInput: coins = [1,2,5], amount = 11\nOutput: 3 (5 + 5 + 1)',
    fn: 'coinChange', params: 'coins, amount', constraints: '1 ≤ coins ≤ 12, 0 ≤ amount ≤ 10^4',
    tests: [[[1, 2, 5], 11], [[2], 3], [[1], 0], [[1, 3, 4], 6], [[5, 10], 7], [[2, 5, 10], 17], [[3, 7], 11]],
    gen: (r) => [r.uniq(r.int(1, 3), 1, 7), r.int(0, 14)],
    approaches: [
      A('Plain recursion', 'Try every coin for the last step and take the best. The same amounts are solved again and again.', 'O(Sⁿ)', 'O(S)', `function coinChange(coins, amount) {
  const go = (a) => {
    if (a === 0) return 0;
    if (a < 0) return Infinity;
    let best = Infinity;
    for (const c of coins) best = Math.min(best, 1 + go(a - c));
    return best;
  };
  const r = go(amount);
  return r === Infinity ? -1 : r;
}`, { note: 'S is the amount, n the number of coin types.' }),
      A('Top-down with memoisation', 'Cache the answer for each remaining amount so each amount is solved once.', 'O(S·n)', 'O(S)', `function coinChange(coins, amount) {
  const memo = new Map();
  const go = (a) => {
    if (a === 0) return 0;
    if (a < 0) return Infinity;
    if (memo.has(a)) return memo.get(a);
    let best = Infinity;
    for (const c of coins) best = Math.min(best, 1 + go(a - c));
    memo.set(a, best);
    return best;
  };
  const r = go(amount);
  return r === Infinity ? -1 : r;
}`),
      A('Bottom-up dynamic programming', 'dp[a] is the fewest coins for amount a: dp[a] = 1 + min over coins of dp[a - coin]. Fill from 0 up to the amount.', 'O(S·n)', 'O(S)', `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  return dp[amount] === Infinity ? -1 : dp[amount];
}`),
      A('Breadth-first search', 'Treat each amount as a node; subtracting a coin is an edge. The shortest path from the amount to 0 is the answer.', 'O(S·n)', 'O(S)', `function coinChange(coins, amount) {
  if (amount === 0) return 0;
  const seen = new Set([amount]);
  let q = [amount], steps = 0;
  while (q.length) {
    steps++;
    const next = [];
    for (const a of q) for (const c of coins) {
      const r = a - c;
      if (r === 0) return steps;
      if (r > 0 && !seen.has(r)) { seen.add(r); next.push(r); }
    }
    q = next;
  }
  return -1;
}`)
    ]
  },
  {
    id: 'longest-common-subseq', title: 'Longest Common Subsequence', d: 'M', topic: 'Dynamic Programming', roles: ['SDE'], sizes: [5, 8, 10, 15, 20, 25],
    desc: 'Return the length of the longest subsequence common to two strings. A subsequence keeps the original order but may skip characters.\n\nExample:\nInput: text1 = "abcde", text2 = "ace"\nOutput: 3',
    fn: 'longestCommonSubsequence', params: 'text1, text2', constraints: '1 ≤ length ≤ 1000',
    tests: [['abcde', 'ace'], ['abc', 'abc'], ['abc', 'def'], ['', 'abc'], ['bsbininm', 'jmjkbkjkv'], ['oxcpqrsvwf', 'shmtulqrypy'], ['aggtab', 'gxtxayb']],
    gen: (r) => [r.str(r.int(0, 7), 'abc'), r.str(r.int(0, 7), 'abc')],
    approaches: [
      A('Plain recursion', 'If the last characters match take them and recurse on both prefixes, otherwise try dropping one of them. Exponential because sub-problems repeat.', 'O(2ⁿ)', 'O(n)', `function longestCommonSubsequence(a, b) {
  const go = (i, j) => (i === 0 || j === 0 ? 0 : a[i - 1] === b[j - 1] ? 1 + go(i - 1, j - 1) : Math.max(go(i - 1, j), go(i, j - 1)));
  return go(a.length, b.length);
}`),
      A('Memoised recursion', 'The same recursion with a cache keyed by (i, j).', 'O(n·m)', 'O(n·m)', `function longestCommonSubsequence(a, b) {
  const memo = new Map();
  const go = (i, j) => {
    if (i === 0 || j === 0) return 0;
    const k = i * 1001 + j;
    if (memo.has(k)) return memo.get(k);
    const v = a[i - 1] === b[j - 1] ? 1 + go(i - 1, j - 1) : Math.max(go(i - 1, j), go(i, j - 1));
    memo.set(k, v);
    return v;
  };
  return go(a.length, b.length);
}`),
      A('DP table', 'dp[i][j] is the LCS of the first i and first j characters. Fill it row by row.', 'O(n·m)', 'O(n·m)', `function longestCommonSubsequence(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}`),
      A('DP with two rows', 'Row i only needs row i - 1, so keep two rows instead of the whole table.', 'O(n·m)', 'O(min(n, m))', `function longestCommonSubsequence(a, b) {
  if (b.length > a.length) [a, b] = [b, a];
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}`)
    ]
  },
  {
    id: 'permutations', title: 'Permutations', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortAll', sizes: [3, 5, 7, 8, 9, 10],
    desc: 'Return all permutations of an array of distinct integers, in any order (the tests compare them sorted).\n\nExample:\nInput: nums = [1,2,3]\nOutput: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]',
    fn: 'permute', params: 'nums', constraints: '1 ≤ n ≤ 6, distinct values',
    tests: [[[1, 2, 3]], [[0, 1]], [[1]], [[1, 2, 3, 4]], [[5, 6]], [[-1, 0, 1]]],
    gen: (r) => [r.uniq(r.int(1, 5), -3, 6)],
    approaches: [
      A('Backtracking with a used array', 'Build a permutation one position at a time, trying every value that has not been used yet, then undo the choice.', 'O(n·n!)', 'O(n)', `function permute(nums) {
  const out = [], cur = [], used = new Array(nums.length).fill(false);
  const go = () => {
    if (cur.length === nums.length) { out.push([...cur]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(nums[i]);
      go();
      cur.pop(); used[i] = false;
    }
  };
  go();
  return out;
}`),
      A('Backtracking by swapping', 'Fix position k by swapping each remaining element into it, recurse on the rest, then swap back. No used array and no copying until a permutation is complete.', 'O(n·n!)', 'O(n)', `function permute(nums) {
  const a = [...nums], out = [];
  const go = (k) => {
    if (k === a.length) { out.push([...a]); return; }
    for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; go(k + 1); [a[k], a[i]] = [a[i], a[k]]; }
  };
  go(0);
  return out;
}`),
      A('Insert each number into every position', 'Take the permutations of the first i numbers and insert the next number into every possible slot of each one. An iterative way to build the same set.', 'O(n·n!)', 'O(n·n!)', `function permute(nums) {
  let out = [[]];
  for (const x of nums) {
    const next = [];
    for (const p of out) for (let i = 0; i <= p.length; i++) next.push([...p.slice(0, i), x, ...p.slice(i)]);
    out = next;
  }
  return out;
}`)
    ]
  },
  {
    id: 'subsets', title: 'Subsets', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortAll', sizes: [3, 6, 10, 15, 20, 25],
    desc: 'Return all subsets (the power set) of an array of unique integers, in any order (the tests compare them sorted).\n\nExample:\nInput: nums = [1,2,3]\nOutput: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]',
    fn: 'subsets', params: 'nums', constraints: '1 ≤ n ≤ 10, unique values',
    tests: [[[1, 2, 3]], [[0]], [[1, 2]], [[1, 2, 3, 4]], [[5, 6, 7]], [[-1, 1]]],
    gen: (r) => [r.uniq(r.int(1, 6), -3, 6)],
    approaches: [
      A('Bitmask enumeration', 'Each subset corresponds to a number from 0 to 2ⁿ - 1: bit i says whether element i is in.', 'O(n·2ⁿ)', 'O(1)', `function subsets(nums) {
  const out = [];
  for (let mask = 0; mask < 1 << nums.length; mask++) out.push(nums.filter((_, i) => mask & (1 << i)));
  return out;
}`, { note: 'Space is O(1) beyond the output.' }),
      A('Backtracking', 'At each element decide to skip it or include it. Record the current choice list at every node of the recursion.', 'O(n·2ⁿ)', 'O(n)', `function subsets(nums) {
  const out = [], cur = [];
  const go = (i) => {
    if (i === nums.length) { out.push([...cur]); return; }
    go(i + 1);
    cur.push(nums[i]); go(i + 1); cur.pop();
  };
  go(0);
  return out;
}`),
      A('Iterative doubling', 'Start with the empty subset. For each number, add a copy of every existing subset with that number appended; the count doubles each time.', 'O(n·2ⁿ)', 'O(1)', `function subsets(nums) {
  let out = [[]];
  for (const x of nums) out = out.concat(out.map((s) => [...s, x]));
  return out;
}`)
    ]
  },
  {
    id: 'lru-cache', title: 'LRU Cache', d: 'M', topic: 'System Design Lite', roles: ['SDE', 'Backend Developer'],
    desc: 'Design a least recently used cache. LRUCache(capacity) supports get(key), which returns the value or -1, and put(key, value), which inserts or updates and evicts the least recently used key when the capacity is exceeded. Both should run in O(1) on average. Using a key (get or put) makes it the most recently used.\n\nExample:\nc = LRUCache(2); put(1,1); put(2,2); get(1) → 1; put(3,3) evicts 2; get(2) → -1',
    fn: 'LRUCache', params: '', constraints: '1 ≤ capacity ≤ 3000',
    starter: 'class LRUCache {\n  constructor(capacity) {\n    // Your code here\n  }\n  get(key) {}\n  put(key, value) {}\n}',
    tests: [
      { expr: '(() => { const c = new LRUCache(2); c.put(1, 1); c.put(2, 2); const a = c.get(1); c.put(3, 3); return [a, c.get(2), c.get(3)]; })()' },
      { expr: '(() => { const c = new LRUCache(1); c.put(1, 1); c.put(2, 2); return [c.get(1), c.get(2)]; })()' },
      { expr: '(() => { const c = new LRUCache(2); c.put(2, 1); c.put(2, 2); const a = c.get(2); c.put(1, 1); c.put(4, 1); return [a, c.get(2), c.get(1), c.get(4)]; })()' },
      { expr: '(() => { const c = new LRUCache(3); c.put(1, 1); c.put(2, 2); c.put(3, 3); c.get(1); c.put(4, 4); return [c.get(1), c.get(2), c.get(3), c.get(4)]; })()' },
      { expr: '(() => { const c = new LRUCache(2); return [c.get(5)]; })()' },
      { expr: '(() => { const c = new LRUCache(2); c.put(1, 10); c.put(2, 20); c.put(1, 11); c.put(3, 30); return [c.get(1), c.get(2), c.get(3)]; })()' }
    ],
    approaches: [
      A('Array of keys (simple, slow)', 'Keep an array ordered from least to most recent and search it on every operation. Easy to get right but linear time per call.', 'O(n)', 'O(n)', `class LRUCache {
  constructor(capacity) { this.cap = capacity; this.keys = []; this.map = {}; }
  _touch(k) { const i = this.keys.indexOf(k); if (i >= 0) this.keys.splice(i, 1); this.keys.push(k); }
  get(key) { if (!(key in this.map)) return -1; this._touch(key); return this.map[key]; }
  put(key, value) {
    if (key in this.map) { this.map[key] = value; this._touch(key); return; }
    if (this.keys.length === this.cap) { delete this.map[this.keys.shift()]; }
    this.map[key] = value; this.keys.push(key);
  }
}`),
      A('Map insertion order', 'A JavaScript Map remembers insertion order. Delete and re-insert a key to mark it recent; the first key in the Map is the least recent.', 'O(1)', 'O(n)', `class LRUCache {
  constructor(capacity) { this.cap = capacity; this.m = new Map(); }
  get(key) {
    if (!this.m.has(key)) return -1;
    const v = this.m.get(key); this.m.delete(key); this.m.set(key, v);
    return v;
  }
  put(key, value) {
    if (this.m.has(key)) this.m.delete(key);
    else if (this.m.size === this.cap) this.m.delete(this.m.keys().next().value);
    this.m.set(key, value);
  }
}`, { note: 'This relies on Map preserving insertion order, which the language guarantees.' }),
      A('Hash map + doubly linked list', 'The classic design: a hash map from key to list node gives O(1) lookup, and a doubly linked list keeps usage order so moving or removing a node is O(1) too.', 'O(1)', 'O(n)', `class LRUCache {
  constructor(capacity) {
    this.cap = capacity; this.m = new Map();
    this.head = { k: null, v: null }; this.tail = { k: null, v: null };
    this.head.next = this.tail; this.tail.prev = this.head;
  }
  _remove(n) { n.prev.next = n.next; n.next.prev = n.prev; }
  _addFront(n) { n.next = this.head.next; n.prev = this.head; this.head.next.prev = n; this.head.next = n; }
  get(key) {
    const n = this.m.get(key);
    if (!n) return -1;
    this._remove(n); this._addFront(n);
    return n.v;
  }
  put(key, value) {
    let n = this.m.get(key);
    if (n) { n.v = value; this._remove(n); this._addFront(n); return; }
    if (this.m.size === this.cap) { const last = this.tail.prev; this._remove(last); this.m.delete(last.k); }
    n = { k: key, v: value }; this.m.set(key, n); this._addFront(n);
  }
}`)
    ]
  },
  {
    id: 'rate-limiter', title: 'Sliding Window Rate Limiter', d: 'M', topic: 'System Design Lite', roles: ['SDE', 'Backend Developer'],
    desc: 'Implement a sliding-window rate limiter. RateLimiter(maxRequests, windowMs) has allow(id, timestamp), which returns true if the request from id at the given time (in milliseconds, never decreasing) is within the limit: at most maxRequests allowed requests in any window of windowMs milliseconds. Rejected requests do not count.\n\nExample:\nlimiter = RateLimiter(2, 1000); allow("a", 0) → true; allow("a", 100) → true; allow("a", 200) → false; allow("a", 1000) → true',
    fn: 'RateLimiter', params: '', constraints: 'timestamps are non-decreasing',
    starter: 'class RateLimiter {\n  constructor(maxRequests, windowMs) {\n    // Your code here\n  }\n  allow(id, timestamp) {}\n}',
    tests: [
      { expr: '(() => { const r = new RateLimiter(2, 1000); return [r.allow("a", 0), r.allow("a", 100), r.allow("a", 200), r.allow("a", 1000)]; })()' },
      { expr: '(() => { const r = new RateLimiter(1, 1000); return [r.allow("x", 0), r.allow("x", 500), r.allow("x", 1000)]; })()' },
      { expr: '(() => { const r = new RateLimiter(2, 100); return [r.allow("a", 0), r.allow("b", 1), r.allow("a", 2), r.allow("a", 3), r.allow("b", 4)]; })()' },
      { expr: '(() => { const r = new RateLimiter(3, 10); const out = []; for (let t = 0; t < 12; t++) out.push(r.allow("k", t)); return out; })()' },
      { expr: '(() => { const r = new RateLimiter(1, 5); return [r.allow("u", 10), r.allow("u", 14), r.allow("u", 15), r.allow("u", 16)]; })()' },
      { expr: '(() => { const r = new RateLimiter(2, 1000); return [r.allow("a", 0), r.allow("a", 0), r.allow("a", 999), r.allow("a", 1000), r.allow("a", 1000), r.allow("a", 1001)]; })()' }
    ],
    approaches: [
      A('Keep every timestamp and filter', 'Store all allowed timestamps per id. On each request drop the ones that fell out of the window and count what is left.', 'O(n)', 'O(n)', `class RateLimiter {
  constructor(maxRequests, windowMs) { this.max = maxRequests; this.win = windowMs; this.log = {}; }
  allow(id, timestamp) {
    const l = (this.log[id] = (this.log[id] || []).filter((t) => t > timestamp - this.win));
    if (l.length >= this.max) return false;
    l.push(timestamp);
    return true;
  }
}`, { note: 'n is the number of requests kept in a window.' }),
      A('Queue with expiry from the front', 'Timestamps arrive in order, so expired ones are always at the front of a queue. Pop from the front until the window is clean; each timestamp is added and removed once, which makes each call amortised O(1).', 'O(1)', 'O(n)', `class RateLimiter {
  constructor(maxRequests, windowMs) { this.max = maxRequests; this.win = windowMs; this.q = {}; }
  allow(id, timestamp) {
    const s = (this.q[id] = this.q[id] || { a: [], h: 0 });
    while (s.h < s.a.length && s.a[s.h] <= timestamp - this.win) s.h++;
    if (s.a.length - s.h >= this.max) return false;
    s.a.push(timestamp);
    return true;
  }
}`, { note: 'Real systems often use a fixed-window counter or a token bucket for less memory, at the cost of burstiness at window edges.' })
    ]
  },
  {
    id: 'min-stack', title: 'Min Stack', d: 'M', topic: 'Stacks', roles: ['SDE'],
    desc: 'Design a stack that supports push(val), pop(), top() and getMin() (the smallest value currently in the stack), all in constant time.\n\nExample:\npush(-2); push(0); push(-3); getMin() → -3; pop(); top() → 0; getMin() → -2',
    fn: 'MinStack', params: '', constraints: 'pop, top and getMin are called on a non-empty stack',
    starter: 'class MinStack {\n  constructor() {\n    // Your code here\n  }\n  push(val) {}\n  pop() {}\n  top() {}\n  getMin() {}\n}',
    tests: [
      { expr: '(() => { const s = new MinStack(); s.push(-2); s.push(0); s.push(-3); const a = s.getMin(); s.pop(); return [a, s.top(), s.getMin()]; })()' },
      { expr: '(() => { const s = new MinStack(); s.push(5); const a = s.getMin(); s.push(3); const b = s.getMin(); s.pop(); return [a, b, s.getMin(), s.top()]; })()' },
      { expr: '(() => { const s = new MinStack(); s.push(2); s.push(2); s.push(1); s.pop(); return [s.getMin(), s.top()]; })()' },
      { expr: '(() => { const s = new MinStack(); s.push(1); s.push(2); s.push(3); return [s.getMin(), s.top()]; })()' },
      { expr: '(() => { const s = new MinStack(); s.push(3); s.push(2); s.push(1); s.pop(); s.pop(); return [s.getMin(), s.top()]; })()' },
      { expr: '(() => { const s = new MinStack(); s.push(0); s.push(1); s.push(0); s.pop(); return [s.getMin()]; })()' }
    ],
    approaches: [
      A('Scan for the minimum', 'A plain array stack where getMin scans every element. Simple, but getMin is linear.', 'O(n)', 'O(n)', `class MinStack {
  constructor() { this.a = []; }
  push(v) { this.a.push(v); }
  pop() { this.a.pop(); }
  top() { return this.a[this.a.length - 1]; }
  getMin() { return Math.min(...this.a); }
}`, { note: 'Time shown is for getMin; the other operations are O(1).' }),
      A('Store (value, min so far) pairs', 'Each entry remembers the minimum of everything beneath it, so getMin is just the top entry.', 'O(1)', 'O(n)', `class MinStack {
  constructor() { this.a = []; }
  push(v) { this.a.push([v, this.a.length ? Math.min(v, this.a[this.a.length - 1][1]) : v]); }
  pop() { this.a.pop(); }
  top() { return this.a[this.a.length - 1][0]; }
  getMin() { return this.a[this.a.length - 1][1]; }
}`),
      A('Second stack of minimums', 'Keep a helper stack that only receives a value when it is less than or equal to the current minimum. Popping removes from the helper only when the same value leaves the main stack.', 'O(1)', 'O(n)', `class MinStack {
  constructor() { this.a = []; this.m = []; }
  push(v) { this.a.push(v); if (!this.m.length || v <= this.m[this.m.length - 1]) this.m.push(v); }
  pop() { const v = this.a.pop(); if (v === this.m[this.m.length - 1]) this.m.pop(); }
  top() { return this.a[this.a.length - 1]; }
  getMin() { return this.m[this.m.length - 1]; }
}`, { note: 'Use <= when pushing so duplicates of the minimum are tracked correctly.' })
    ]
  }
];
