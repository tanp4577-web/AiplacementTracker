const { A } = require('../dsl.cjs');
const J = (x) => JSON.stringify(x);
const TREE_NOTE = '// TreeNode { val, left, right } is predefined. Tests build trees with fromTree([..]).';
const starter = (fn, params, note = TREE_NOTE) => `function ${fn}(${params}) {\n  ${note}\n  // Your code here\n}`;

function serialize(root) {
  const out = []; const q = [root];
  while (q.length) { const n = q.shift(); if (n) { out.push(n.v); q.push(n.l, n.r); } else out.push(null); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
function randTree(r, maxNodes, lo = 0, hi = 9) {
  const n = r.int(1, maxNodes);
  const nodes = [{ v: r.int(lo, hi), l: null, r: null }];
  for (let i = 1; i < n; i++) {
    const node = { v: r.int(lo, hi), l: null, r: null };
    for (let t = 0; t < 20; t++) { const p = nodes[r.int(0, nodes.length - 1)]; const side = r.next() < 0.5 ? 'l' : 'r'; if (!p[side]) { p[side] = node; break; } }
    nodes.push(node);
  }
  return serialize(nodes[0]);
}
function randBst(r, maxNodes) {
  const vals = r.uniq(r.int(1, maxNodes), 0, 30);
  let root = null;
  for (const v of vals) { const node = { v, l: null, r: null }; if (!root) { root = node; continue; } let p = root; for (;;) { if (v < p.v) { if (p.l) p = p.l; else { p.l = node; break; } } else if (p.r) p = p.r; else { p.r = node; break; } } }
  return serialize(root);
}

module.exports = [
  {
    id: 'validate-bst', title: 'Validate Binary Search Tree', d: 'M', topic: 'Trees', roles: ['SDE', 'Backend Developer'],
    desc: 'Return true if a binary tree is a valid binary search tree: for every node all values in its left subtree are smaller and all values in its right subtree are larger (strictly).\n\nExample:\nInput: root = [5,1,4,null,null,3,6]\nOutput: false',
    fn: 'isValidBST', params: 'root', constraints: '1 ≤ n ≤ 10^4', starter: starter('isValidBST', 'root'),
    expr: (a) => `isValidBST(fromTree(${J(a)}))`,
    tests: [[[2, 1, 3]], [[5, 1, 4, null, null, 3, 6]], [[1]], [[2, 2, 2]], [[5, 4, 6, null, null, 3, 7]], [[10, 5, 15, null, null, 6, 20]], [[3, 1, 5, 0, 2, 4, 6]]],
    gen: (r) => [r.next() < 0.5 ? randBst(r, 8) : randTree(r, 7)],
    approaches: [
      A('Inorder traversal into an array', 'Comparing only a node with its two children misses violations deeper in a subtree. Instead read the whole tree in order: a valid BST gives a strictly increasing list.', 'O(n)', 'O(n)', `function isValidBST(root) {
  const vals = [];
  const go = (n) => { if (!n) return; go(n.left); vals.push(n.val); go(n.right); };
  go(root);
  for (let i = 1; i < vals.length; i++) if (vals[i] <= vals[i - 1]) return false;
  return true;
}`, { note: 'A BST read in order is strictly increasing. The array makes space O(n).' }),
      A('Recursion with value bounds', 'Pass the allowed (lower, upper) range down: going left tightens the upper bound, going right tightens the lower bound.', 'O(n)', 'O(h)', `function isValidBST(root) {
  const go = (n, lo, hi) => !n || (n.val > lo && n.val < hi && go(n.left, lo, n.val) && go(n.right, n.val, hi));
  return go(root, -Infinity, Infinity);
}`),
      A('Iterative inorder with the previous value', 'Walk the tree in order with a stack and compare each value with the one before it. Stops at the first violation.', 'O(n)', 'O(h)', `function isValidBST(root) {
  const st = [];
  let cur = root, prev = -Infinity;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.left; }
    cur = st.pop();
    if (cur.val <= prev) return false;
    prev = cur.val;
    cur = cur.right;
  }
  return true;
}`)
    ]
  },
  {
    id: 'kth-smallest-bst', title: 'Kth Smallest Element in a BST', d: 'M', topic: 'Trees', roles: ['SDE'],
    desc: 'Given a binary search tree and k, return the k-th smallest value (1-indexed).\n\nExample:\nInput: root = [3,1,4,null,2], k = 1\nOutput: 1',
    fn: 'kthSmallest', params: 'root, k', constraints: '1 ≤ k ≤ n ≤ 10^4', starter: starter('kthSmallest', 'root, k'),
    expr: (a, k) => `kthSmallest(fromTree(${J(a)}), ${k})`,
    tests: [[[3, 1, 4, null, 2], 1], [[5, 3, 6, 2, 4, null, null, 1], 3], [[1], 1], [[2, 1, 3], 3], [[5, 3, 6, 2, 4, null, null, 1], 6], [[4, 2, 6, 1, 3, 5, 7], 4]],
    gen: (r) => { const t = randBst(r, 9); const n = t.filter((x) => x !== null).length; return [t, r.int(1, n)]; },
    approaches: [
      A('Collect, sort, index', 'Gather every value, sort, and take position k. Does not use the BST property.', 'O(n log n)', 'O(n)', `function kthSmallest(root, k) {
  const v = [];
  const go = (n) => { if (!n) return; v.push(n.val); go(n.left); go(n.right); };
  go(root);
  return v.sort((a, b) => a - b)[k - 1];
}`),
      A('Inorder traversal with early stop', 'An inorder walk of a BST visits values in increasing order, so stop at the k-th visited node.', 'O(h + k)', 'O(h)', `function kthSmallest(root, k) {
  const st = [];
  let cur = root;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.left; }
    cur = st.pop();
    if (--k === 0) return cur.val;
    cur = cur.right;
  }
}`)
    ]
  },
  {
    id: 'lowest-common-ancestor', title: 'Lowest Common Ancestor of a Binary Tree', d: 'M', topic: 'Trees', roles: ['SDE'],
    desc: 'Given a binary tree of distinct values and two values p and q that both exist in it, return the value of their lowest common ancestor: the deepest node that has both as descendants (a node counts as its own descendant). The function receives the root and the two node references; the tests find the nodes by value.\n\nExample:\nInput: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1\nOutput: 3',
    fn: 'lowestCommonAncestor', params: 'root, p, q', constraints: '2 ≤ n ≤ 10^5',
    starter: 'function lowestCommonAncestor(root, p, q) {\n  // TreeNode { val, left, right } is predefined. p and q are nodes of the tree; return the LCA node.\n  // Your code here\n}',
    expr: (a, p, q) => `(() => { const root = fromTree(${J(a)}); const find = (n, v) => (!n ? null : n.val === v ? n : find(n.left, v) || find(n.right, v)); const r = lowestCommonAncestor(root, find(root, ${p}), find(root, ${q})); return r ? r.val : null; })()`,
    tests: [[[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 4], [[1, 2], 1, 2], [[1, 2, 3], 2, 3], [[6, 2, 8, 0, 4, 7, 9], 2, 8], [[6, 2, 8, 0, 4, 7, 9], 0, 4], [[1, 2, 3, 4, 5], 4, 5]],
    gen: (r) => { const vals = r.uniq(r.int(2, 8), 0, 20); const nodes = [{ v: vals[0], l: null, r: null }]; for (let i = 1; i < vals.length; i++) { const node = { v: vals[i], l: null, r: null }; for (let t = 0; t < 30; t++) { const p = nodes[r.int(0, nodes.length - 1)]; const side = r.next() < 0.5 ? 'l' : 'r'; if (!p[side]) { p[side] = node; break; } } nodes.push(node); } const placed = []; const walk = (n) => { if (!n) return; placed.push(n.v); walk(n.l); walk(n.r); }; walk(nodes[0]); return [serialize(nodes[0]), r.pick(placed), r.pick(placed)]; },
    approaches: [
      A('Compare root-to-node paths', 'Find the path from the root to p and to q, then the last node they share is the LCA.', 'O(n)', 'O(n)', `function lowestCommonAncestor(root, p, q) {
  const path = (n, t, cur) => { if (!n) return null; cur.push(n); if (n === t) return [...cur]; const r = path(n.left, t, cur) || path(n.right, t, cur); cur.pop(); return r; };
  const a = path(root, p, []), b = path(root, q, []);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a[i - 1];
}`),
      A('Single recursion', 'If the current node is p or q, return it. Otherwise ask both subtrees. If each side reports one target, this node is the LCA; if only one does, pass it up.', 'O(n)', 'O(h)', `function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  const l = lowestCommonAncestor(root.left, p, q), r = lowestCommonAncestor(root.right, p, q);
  return l && r ? root : l || r;
}`),
      A('Parent pointers', 'Record each node\'s parent with a traversal, collect all ancestors of p, then climb from q until an ancestor of p is met.', 'O(n)', 'O(n)', `function lowestCommonAncestor(root, p, q) {
  const parent = new Map([[root, null]]), st = [root];
  while (st.length) { const n = st.pop(); for (const c of [n.left, n.right]) if (c) { parent.set(c, n); st.push(c); } }
  const anc = new Set();
  for (let n = p; n; n = parent.get(n)) anc.add(n);
  for (let n = q; n; n = parent.get(n)) if (anc.has(n)) return n;
}`)
    ]
  },
  {
    id: 'right-side-view', title: 'Binary Tree Right Side View', d: 'M', topic: 'Trees', roles: ['SDE'],
    desc: 'Imagine standing on the right side of a binary tree. Return the values of the nodes you can see, from top to bottom.\n\nExample:\nInput: root = [1,2,3,null,5,null,4]\nOutput: [1,3,4]',
    fn: 'rightSideView', params: 'root', constraints: '0 ≤ n ≤ 100', starter: starter('rightSideView', 'root'),
    expr: (a) => `rightSideView(fromTree(${J(a)}))`,
    tests: [[[1, 2, 3, null, 5, null, 4]], [[1, null, 3]], [[]], [[1]], [[1, 2]], [[1, 2, 3, 4]], [[1, 2, 3, 4, 5, 6, 7]]],
    gen: (r) => [r.next() < 0.1 ? [] : randTree(r, 9)],
    approaches: [
      A('Breadth-first: last node of each level', 'Process level by level and keep the last node of every level.', 'O(n)', 'O(n)', `function rightSideView(root) {
  const out = [];
  let q = root ? [root] : [];
  while (q.length) { out.push(q[q.length - 1].val); q = q.flatMap((n) => [n.left, n.right].filter(Boolean)); }
  return out;
}`),
      A('Depth-first, right child first', 'Visit the right subtree before the left. The first node reached at each depth is the visible one.', 'O(n)', 'O(h)', `function rightSideView(root) {
  const out = [];
  const go = (n, d) => { if (!n) return; if (d === out.length) out.push(n.val); go(n.right, d + 1); go(n.left, d + 1); };
  go(root, 0);
  return out;
}`)
    ]
  },
  {
    id: 'zigzag-level-order', title: 'Binary Tree Zigzag Level Order Traversal', d: 'M', topic: 'Trees', roles: ['SDE'],
    desc: 'Return the zigzag level order traversal: the first level left to right, the next right to left, and so on alternately.\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[20,9],[15,7]]',
    fn: 'zigzagLevelOrder', params: 'root', constraints: '0 ≤ n ≤ 2000', starter: starter('zigzagLevelOrder', 'root'),
    expr: (a) => `zigzagLevelOrder(fromTree(${J(a)}))`,
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1]], [[]], [[1, 2, 3, 4, 5, 6, 7]], [[1, 2, null, 3, null, 4]], [[1, 2, 3, 4, null, null, 5]]],
    gen: (r) => [r.next() < 0.1 ? [] : randTree(r, 9)],
    approaches: [
      A('Level order then reverse odd levels', 'Do an ordinary level order traversal and reverse every second level afterwards.', 'O(n)', 'O(n)', `function zigzagLevelOrder(root) {
  const out = [];
  let q = root ? [root] : [];
  while (q.length) { out.push(q.map((n) => n.val)); q = q.flatMap((n) => [n.left, n.right].filter(Boolean)); }
  return out.map((lvl, i) => (i % 2 ? lvl.reverse() : lvl));
}`),
      A('Insert at the front or back while traversing', 'Add each value to the end of the level array on even levels and to the front on odd ones, so no reversal pass is needed.', 'O(n)', 'O(n)', `function zigzagLevelOrder(root) {
  const out = [];
  let q = root ? [root] : [], d = 0;
  while (q.length) {
    const lvl = [];
    const next = [];
    for (const n of q) { if (d % 2) lvl.unshift(n.val); else lvl.push(n.val); if (n.left) next.push(n.left); if (n.right) next.push(n.right); }
    out.push(lvl); q = next; d++;
  }
  return out;
}`)
    ]
  },
  {
    id: 'path-sum-ii', title: 'Path Sum II', d: 'M', topic: 'Trees', roles: ['SDE'], out: 'sortAll',
    desc: 'Return every root-to-leaf path whose node values add up to targetSum, as arrays of values (in any order; the tests sort them).\n\nExample:\nInput: root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22\nOutput: [[5,4,11,2],[5,8,4,5]]',
    fn: 'pathSum', params: 'root, targetSum', constraints: '0 ≤ n ≤ 5000', starter: starter('pathSum', 'root, targetSum'),
    expr: (a, t) => `pathSum(fromTree(${J(a)}), ${t})`,
    tests: [[[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1], 22], [[1, 2, 3], 5], [[1, 2], 0], [[], 0], [[1], 1], [[1, 2, 3, 4, 5, 6, 7], 10], [[-2, null, -3], -5]],
    gen: (r) => [randTree(r, 8), r.int(0, 20)],
    approaches: [
      A('Collect all paths then filter', 'List every root-to-leaf path and keep those whose sum equals the target.', 'O(n²)', 'O(n²)', `function pathSum(root, targetSum) {
  const paths = [];
  const go = (n, cur) => { if (!n) return; const p = [...cur, n.val]; if (!n.left && !n.right) paths.push(p); go(n.left, p); go(n.right, p); };
  go(root, []);
  return paths.filter((p) => p.reduce((a, b) => a + b, 0) === targetSum);
}`),
      A('Backtracking with a remaining sum', 'Track the path with push/pop and the remaining target; at a leaf record the path when the remainder hits zero.', 'O(n²)', 'O(h)', `function pathSum(root, targetSum) {
  const out = [], path = [];
  const go = (n, rem) => {
    if (!n) return;
    path.push(n.val);
    if (!n.left && !n.right && rem === n.val) out.push([...path]);
    go(n.left, rem - n.val); go(n.right, rem - n.val);
    path.pop();
  };
  go(root, targetSum);
  return out;
}`, { note: 'The O(n²) comes from copying each matching path; the traversal itself is O(n).' })
    ]
  },
  {
    id: 'course-schedule-ii', title: 'Course Schedule II', d: 'M', topic: 'Graphs', roles: ['SDE'],
    desc: 'Return an order in which you can take all courses given prerequisite pairs [a, b] (b before a), or an empty array if that is impossible. Several orders can be valid, so the tests check the order is a valid topological ordering.\n\nExample:\nInput: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]\nOutput: [0,1,2,3] (or [0,2,1,3])',
    fn: 'findOrder', params: 'numCourses, prerequisites', constraints: '1 ≤ numCourses ≤ 2000',
    expr: (n, pre) => `(() => { const o = findOrder(${n}, ${J(pre)}); if (!Array.isArray(o)) return o; const pos = new Map(o.map((c, i) => [c, i])); const valid = o.length === 0 ? 'empty' : o.length === ${n} && new Set(o).size === ${n} && ${J(pre)}.every(([a, b]) => pos.get(b) < pos.get(a)); return valid; })()`,
    tests: [[2, [[1, 0]]], [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], [1, []], [2, [[1, 0], [0, 1]]], [3, [[0, 1], [1, 2], [2, 0]]], [3, []], [5, [[1, 4], [2, 4], [3, 1], [3, 2]]]],
    gen: (r) => { const n = r.int(1, 6); const e = []; for (let i = 0; i < r.int(0, 7); i++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) e.push([a, b]); } return [n, e]; },
    approaches: [
      A('DFS post-order', 'Run a depth-first search over prerequisites and append a course after all its prerequisites. Detect a cycle with three colours; reverse the finishing order.', 'O(V + E)', 'O(V + E)', `function findOrder(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  for (const [a, b] of prerequisites) adj[b].push(a);
  const state = new Array(numCourses).fill(0), out = [];
  const dfs = (u) => {
    if (state[u] === 1) return false;
    if (state[u] === 2) return true;
    state[u] = 1;
    for (const v of adj[u]) if (!dfs(v)) return false;
    state[u] = 2; out.push(u);
    return true;
  };
  for (let i = 0; i < numCourses; i++) if (!dfs(i)) return [];
  return out.reverse();
}`),
      A("Kahn's algorithm", 'Repeatedly take courses with no remaining prerequisites. If fewer than all courses are taken, there is a cycle.', 'O(V + E)', 'O(V + E)', `function findOrder(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []), indeg = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) { adj[b].push(a); indeg[a]++; }
  const q = [], out = [];
  for (let i = 0; i < numCourses; i++) if (!indeg[i]) q.push(i);
  while (q.length) { const u = q.shift(); out.push(u); for (const v of adj[u]) if (--indeg[v] === 0) q.push(v); }
  return out.length === numCourses ? out : [];
}`)
    ]
  },
  {
    id: 'pacific-atlantic', title: 'Pacific Atlantic Water Flow', d: 'M', topic: 'Graphs', roles: ['SDE'], out: 'sortAll',
    desc: 'heights[r][c] is the height of a cell. Water flows to neighbouring cells of equal or lower height. The Pacific touches the top and left edges and the Atlantic the bottom and right edges. Return the cells [r, c] from which water can reach both oceans (in any order; the tests sort them).\n\nExample:\nInput: heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]\nOutput: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]',
    fn: 'pacificAtlantic', params: 'heights', constraints: '1 ≤ m, n ≤ 200',
    tests: [[[[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]], [[[1]]], [[[1, 1], [1, 1]]], [[[3, 3, 3], [3, 1, 3], [0, 2, 4]]], [[[1, 2, 3]]], [[[1], [2], [3]]]],
    gen: (r) => [r.grid(r.int(1, 4), r.int(1, 4), 0, 5)],
    approaches: [
      A('Flood from every cell', 'For each cell run a search to see whether water from it reaches both oceans.', 'O((m·n)²)', 'O(m·n)', `function pacificAtlantic(heights) {
  const m = heights.length, n = heights[0].length, out = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let pac = false, atl = false;
    const seen = new Set([i * n + j]), st = [[i, j]];
    while (st.length) {
      const [x, y] = st.pop();
      if (x === 0 || y === 0) pac = true;
      if (x === m - 1 || y === n - 1) atl = true;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = x + a, q = y + b;
        if (p >= 0 && q >= 0 && p < m && q < n && heights[p][q] <= heights[x][y] && !seen.has(p * n + q)) { seen.add(p * n + q); st.push([p, q]); }
      }
    }
    if (pac && atl) out.push([i, j]);
  }
  return out;
}`),
      A('Search uphill from each ocean', 'Water flows downhill, so run a search from the ocean edges moving to equal or higher cells. A cell reached from both oceans is an answer.', 'O(m·n)', 'O(m·n)', `function pacificAtlantic(heights) {
  const m = heights.length, n = heights[0].length;
  const reach = (starts) => {
    const seen = Array.from({ length: m }, () => new Array(n).fill(false)), st = [];
    for (const [i, j] of starts) { seen[i][j] = true; st.push([i, j]); }
    while (st.length) {
      const [x, y] = st.pop();
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = x + a, q = y + b;
        if (p >= 0 && q >= 0 && p < m && q < n && !seen[p][q] && heights[p][q] >= heights[x][y]) { seen[p][q] = true; st.push([p, q]); }
      }
    }
    return seen;
  };
  const pac = [], atl = [];
  for (let i = 0; i < m; i++) { pac.push([i, 0]); atl.push([i, n - 1]); }
  for (let j = 0; j < n; j++) { pac.push([0, j]); atl.push([m - 1, j]); }
  const P = reach(pac), Aa = reach(atl), out = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (P[i][j] && Aa[i][j]) out.push([i, j]);
  return out;
}`)
    ]
  },
  {
    id: 'number-of-provinces', title: 'Number of Provinces', d: 'M', topic: 'Graphs', roles: ['SDE'],
    desc: 'isConnected[i][j] = 1 means city i and city j are directly connected. A province is a group of cities connected directly or indirectly. Return the number of provinces.\n\nExample:\nInput: isConnected = [[1,1,0],[1,1,0],[0,0,1]]\nOutput: 2',
    fn: 'findCircleNum', params: 'isConnected', constraints: '1 ≤ n ≤ 200',
    tests: [[[[1, 1, 0], [1, 1, 0], [0, 0, 1]]], [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], [[[1]]], [[[1, 1], [1, 1]]], [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]], [[[1, 1, 0, 0], [1, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 1]]]],
    gen: (r) => { const n = r.int(1, 6); const g = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); for (let k = 0; k < r.int(0, n); k++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); g[a][b] = g[b][a] = 1; } return [g]; },
    approaches: [
      A('Depth-first search', 'Start a DFS from every unvisited city; each start is a new province.', 'O(n²)', 'O(n)', `function findCircleNum(isConnected) {
  const n = isConnected.length, seen = new Array(n).fill(false);
  const dfs = (u) => { seen[u] = true; for (let v = 0; v < n; v++) if (isConnected[u][v] && !seen[v]) dfs(v); };
  let c = 0;
  for (let i = 0; i < n; i++) if (!seen[i]) { c++; dfs(i); }
  return c;
}`),
      A('Breadth-first search', 'Same idea with a queue instead of recursion.', 'O(n²)', 'O(n)', `function findCircleNum(isConnected) {
  const n = isConnected.length, seen = new Array(n).fill(false);
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    c++; seen[i] = true;
    const q = [i];
    while (q.length) { const u = q.shift(); for (let v = 0; v < n; v++) if (isConnected[u][v] && !seen[v]) { seen[v] = true; q.push(v); } }
  }
  return c;
}`),
      A('Union-Find', 'Start with n separate sets and union directly connected cities. The remaining number of sets is the answer.', 'O(n²·α)', 'O(n)', `function findCircleNum(isConnected) {
  const n = isConnected.length, p = Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  let c = n;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (isConnected[i][j]) { const a = find(i), b = find(j); if (a !== b) { p[a] = b; c--; } }
  return c;
}`)
    ]
  },
  {
    id: 'is-graph-bipartite', title: 'Is Graph Bipartite?', d: 'M', topic: 'Graphs', roles: ['SDE'],
    desc: 'graph[i] lists the neighbours of node i in an undirected graph. Return true if the nodes can be split into two groups so every edge joins nodes from different groups.\n\nExample:\nInput: graph = [[1,3],[0,2],[1,3],[0,2]]\nOutput: true',
    fn: 'isBipartite', params: 'graph', constraints: '1 ≤ n ≤ 100',
    tests: [[[[1, 3], [0, 2], [1, 3], [0, 2]]], [[[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]]], [[[]]], [[[1], [0]]], [[[1, 2], [0, 2], [0, 1]]], [[[1], [0], [3], [2]]]],
    gen: (r) => { const n = r.int(1, 6); const adj = Array.from({ length: n }, () => new Set()); for (let k = 0; k < r.int(0, 8); k++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) { adj[a].add(b); adj[b].add(a); } } return [adj.map((s) => [...s].sort((x, y) => x - y))]; },
    approaches: [
      A('Breadth-first two-colouring', 'Colour a start node, give its neighbours the opposite colour, and so on. Meeting a neighbour with the same colour means an odd cycle.', 'O(V + E)', 'O(V)', `function isBipartite(graph) {
  const color = new Array(graph.length).fill(-1);
  for (let s = 0; s < graph.length; s++) {
    if (color[s] !== -1) continue;
    color[s] = 0;
    const q = [s];
    while (q.length) {
      const u = q.shift();
      for (const v of graph[u]) {
        if (color[v] === -1) { color[v] = 1 - color[u]; q.push(v); }
        else if (color[v] === color[u]) return false;
      }
    }
  }
  return true;
}`),
      A('Depth-first two-colouring', 'Same colouring done recursively.', 'O(V + E)', 'O(V)', `function isBipartite(graph) {
  const color = new Array(graph.length).fill(-1);
  const dfs = (u, c) => {
    color[u] = c;
    for (const v of graph[u]) { if (color[v] === -1) { if (!dfs(v, 1 - c)) return false; } else if (color[v] === c) return false; }
    return true;
  };
  for (let i = 0; i < graph.length; i++) if (color[i] === -1 && !dfs(i, 0)) return false;
  return true;
}`),
      A('Union-Find', 'For each node, all its neighbours must end up in one set and that set must not contain the node itself.', 'O(V + E)', 'O(V)', `function isBipartite(graph) {
  const p = Array.from({ length: graph.length }, (_, i) => i);
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  for (let u = 0; u < graph.length; u++) {
    for (const v of graph[u]) {
      if (find(u) === find(v)) return false;
      p[find(graph[u][0])] = find(v);
    }
  }
  return true;
}`)
    ]
  },
  {
    id: 'network-delay-time', title: 'Network Delay Time', d: 'M', topic: 'Graphs', roles: ['SDE', 'Backend Developer'],
    desc: 'times[i] = [u, v, w] is a directed edge from node u to node v taking w time units. A signal is sent from node k. Return the time until all n nodes (numbered 1 to n) have received it, or -1 if some node never does.\n\nExample:\nInput: times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2\nOutput: 2',
    fn: 'networkDelayTime', params: 'times, n, k', constraints: '1 ≤ k ≤ n ≤ 100',
    tests: [[[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2], [[[1, 2, 1]], 2, 1], [[[1, 2, 1]], 2, 2], [[[1, 2, 1], [2, 3, 2], [1, 3, 4]], 3, 1], [[], 1, 1], [[[1, 2, 5], [1, 3, 1], [3, 2, 1]], 3, 1]],
    gen: (r) => { const n = r.int(1, 5); const e = []; for (let i = 0; i < r.int(0, 8); i++) { const a = r.int(1, n), b = r.int(1, n); if (a !== b) e.push([a, b, r.int(1, 6)]); } return [e, n, r.int(1, n)]; },
    approaches: [
      A('Bellman-Ford', 'Relax every edge n - 1 times. Simple and handles any edge order, but does a lot of repeated work.', 'O(V·E)', 'O(V)', `function networkDelayTime(times, n, k) {
  const d = new Array(n + 1).fill(Infinity);
  d[k] = 0;
  for (let i = 0; i < n - 1; i++) for (const [u, v, w] of times) if (d[u] + w < d[v]) d[v] = d[u] + w;
  const m = Math.max(...d.slice(1));
  return m === Infinity ? -1 : m;
}`),
      A('Dijkstra with a plain array scan', 'Repeatedly settle the unvisited node with the smallest known distance and relax its outgoing edges.', 'O(V²)', 'O(V + E)', `function networkDelayTime(times, n, k) {
  const adj = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) adj[u].push([v, w]);
  const d = new Array(n + 1).fill(Infinity), done = new Array(n + 1).fill(false);
  d[k] = 0;
  for (let i = 0; i < n; i++) {
    let u = -1;
    for (let v = 1; v <= n; v++) if (!done[v] && (u === -1 || d[v] < d[u])) u = v;
    if (d[u] === Infinity) break;
    done[u] = true;
    for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
  }
  const m = Math.max(...d.slice(1));
  return m === Infinity ? -1 : m;
}`),
      A('Dijkstra with a heap', 'Keep the frontier in a min-heap so picking the closest node costs O(log V) instead of O(V).', 'O(E log V)', 'O(V + E)', `function networkDelayTime(times, n, k) {
  const adj = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) adj[u].push([v, w]);
  const d = new Array(n + 1).fill(Infinity), h = [];
  const push = (e) => { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const t = h[0], l = h.pop(); if (h.length) { h[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < h.length && h[a][0] < h[m][0]) m = a; if (b < h.length && h[b][0] < h[m][0]) m = b; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return t; };
  d[k] = 0; push([0, k]);
  while (h.length) {
    const [dist, u] = pop();
    if (dist > d[u]) continue;
    for (const [v, w] of adj[u]) if (dist + w < d[v]) { d[v] = dist + w; push([d[v], v]); }
  }
  const m = Math.max(...d.slice(1));
  return m === Infinity ? -1 : m;
}`)
    ]
  },
  {
    id: 'cheapest-flights', title: 'Cheapest Flights Within K Stops', d: 'M', topic: 'Graphs', roles: ['SDE'],
    desc: 'flights[i] = [from, to, price]. Return the cheapest price from src to dst using at most k stops (k + 1 flights), or -1 if impossible.\n\nExample:\nInput: n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1\nOutput: 700',
    fn: 'findCheapestPrice', params: 'n, flights, src, dst, k', constraints: '1 ≤ n ≤ 100',
    tests: [[4, [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], 0, 3, 1], [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1], [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 0], [2, [], 0, 1, 1], [3, [[0, 1, 5], [1, 2, 5]], 0, 2, 0], [5, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 4, 10]], 0, 4, 2]],
    gen: (r) => { const n = r.int(2, 5); const f = []; for (let i = 0; i < r.int(0, 8); i++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) f.push([a, b, r.int(1, 9)]); } return [n, f, 0, r.int(1, n - 1), r.int(0, 3)]; },
    approaches: [
      A('Depth-first search over all paths', 'Explore every path with at most k + 1 flights, tracking the cost. Exponential, but a good first version.', 'O(Vᵏ)', 'O(k)', `function findCheapestPrice(n, flights, src, dst, k) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b, w] of flights) adj[a].push([b, w]);
  let best = Infinity;
  const go = (u, stops, cost) => {
    if (u === dst) { best = Math.min(best, cost); return; }
    if (stops > k) return;
    for (const [v, w] of adj[u]) go(v, stops + 1, cost + w);
  };
  go(src, 0, 0);
  return best === Infinity ? -1 : best;
}`),
      A('Bellman-Ford limited to k + 1 rounds', 'Relax all flights k + 1 times, using a copy of the previous round so each round adds exactly one flight.', 'O(k·E)', 'O(V)', `function findCheapestPrice(n, flights, src, dst, k) {
  let d = new Array(n).fill(Infinity);
  d[src] = 0;
  for (let i = 0; i <= k; i++) {
    const next = [...d];
    for (const [a, b, w] of flights) if (d[a] + w < next[b]) next[b] = d[a] + w;
    d = next;
  }
  return d[dst] === Infinity ? -1 : d[dst];
}`)
    ]
  },
  {
    id: 'combination-sum', title: 'Combination Sum', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortRows', sizes: [5, 10, 15, 20, 25, 30],
    desc: 'Given distinct positive integers (candidates) and a target, return all unique combinations that sum to the target. A number may be used any number of times. Any order; the tests normalise it.\n\nExample:\nInput: candidates = [2,3,6,7], target = 7\nOutput: [[2,2,3],[7]]',
    fn: 'combinationSum', params: 'candidates, target', constraints: '1 ≤ candidates ≤ 30, 1 ≤ target ≤ 40',
    tests: [[[2, 3, 6, 7], 7], [[2, 3, 5], 8], [[2], 1], [[1], 3], [[3, 5], 11], [[4, 2, 8], 8]],
    gen: (r) => [r.uniq(r.int(1, 3), 1, 6), r.int(1, 10)],
    approaches: [
      A('Generate every multiset then filter', 'Count how many times each candidate could appear and test every combination of counts.', 'O(Tⁿ)', 'O(T)', `function combinationSum(candidates, target) {
  const out = [];
  const go = (i, cur, sum) => {
    if (i === candidates.length) { if (sum === target) out.push([...cur]); return; }
    for (let k = 0; sum + k * candidates[i] <= target; k++) go(i + 1, [...cur, ...Array(k).fill(candidates[i])], sum + k * candidates[i]);
  };
  go(0, [], 0);
  return out;
}`),
      A('Backtracking with a start index', 'Add candidates in non-decreasing index order so each combination is built once. Stop when the sum exceeds the target.', 'O(2^T)', 'O(T)', `function combinationSum(candidates, target) {
  const out = [], cur = [];
  const go = (start, rem) => {
    if (rem === 0) { out.push([...cur]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > rem) continue;
      cur.push(candidates[i]); go(i, rem - candidates[i]); cur.pop();
    }
  };
  go(0, target);
  return out;
}`),
      A('Dynamic programming over amounts', 'combos[a] lists all combinations summing to a; extend them with each candidate in a fixed order.', 'O(T·n·r)', 'O(T·r)', `function combinationSum(candidates, target) {
  const dp = Array.from({ length: target + 1 }, () => []);
  dp[0] = [[]];
  for (const c of candidates) for (let a = c; a <= target; a++) for (const comb of dp[a - c]) dp[a].push([...comb, c]);
  return dp[target];
}`, { note: 'r is the number of combinations stored per amount.' })
    ]
  },
  {
    id: 'combination-sum-ii', title: 'Combination Sum II', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortRows',
    desc: 'Given candidates (which may contain duplicates) and a target, return all unique combinations that sum to the target, using each element at most once. Any order; the tests normalise it.\n\nExample:\nInput: candidates = [10,1,2,7,6,1,5], target = 8\nOutput: [[1,1,6],[1,2,5],[1,7],[2,6]]',
    fn: 'combinationSum2', params: 'candidates, target', constraints: '1 ≤ candidates ≤ 100',
    tests: [[[10, 1, 2, 7, 6, 1, 5], 8], [[2, 5, 2, 1, 2], 5], [[1], 1], [[1, 1], 3], [[2, 2, 2], 4], [[3, 1, 3, 5, 1, 1], 8]],
    gen: (r) => [r.arr(r.int(1, 7), 1, 5), r.int(1, 10)],
    approaches: [
      A('All subsets, then de-duplicate', 'Try every subset with a bitmask, keep those with the right sum, and drop duplicates by sorted key.', 'O(n·2ⁿ)', 'O(2ⁿ)', `function combinationSum2(candidates, target) {
  const a = [...candidates].sort((x, y) => x - y), seen = new Set(), out = [];
  for (let mask = 0; mask < 1 << a.length; mask++) {
    const sub = a.filter((_, i) => mask & (1 << i));
    if (sub.reduce((x, y) => x + y, 0) === target && !seen.has(sub.join(','))) { seen.add(sub.join(',')); out.push(sub); }
  }
  return out;
}`),
      A('Backtracking skipping equal siblings', 'Sort first. At each level skip a value equal to the one just tried, so identical branches are never explored twice.', 'O(2ⁿ)', 'O(n)', `function combinationSum2(candidates, target) {
  const a = [...candidates].sort((x, y) => x - y), out = [], cur = [];
  const go = (start, rem) => {
    if (rem === 0) { out.push([...cur]); return; }
    for (let i = start; i < a.length; i++) {
      if (i > start && a[i] === a[i - 1]) continue;
      if (a[i] > rem) break;
      cur.push(a[i]); go(i + 1, rem - a[i]); cur.pop();
    }
  };
  go(0, target);
  return out;
}`)
    ]
  },
  {
    id: 'subsets-ii', title: 'Subsets II', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortAll',
    desc: 'Given an integer array that may contain duplicates, return all possible unique subsets (the power set without repeated subsets). Any order; the tests sort them.\n\nExample:\nInput: nums = [1,2,2]\nOutput: [[],[1],[1,2],[1,2,2],[2],[2,2]]',
    fn: 'subsetsWithDup', params: 'nums', constraints: '1 ≤ n ≤ 10',
    tests: [[[1, 2, 2]], [[0]], [[1, 1, 1]], [[4, 4, 4, 1, 4]], [[1, 2, 3]], [[2, 1, 2, 1]]],
    gen: (r) => [r.arr(r.int(1, 6), 0, 3)],
    approaches: [
      A('Bitmask with a set for duplicates', 'Generate every subset, sort each one, and keep only unseen ones.', 'O(n·2ⁿ)', 'O(n·2ⁿ)', `function subsetsWithDup(nums) {
  const a = [...nums].sort((x, y) => x - y), seen = new Set(), out = [];
  for (let m = 0; m < 1 << a.length; m++) { const s = a.filter((_, i) => m & (1 << i)); const k = s.join(','); if (!seen.has(k)) { seen.add(k); out.push(s); } }
  return out;
}`),
      A('Backtracking skipping equal siblings', 'Sort, then at each depth skip a number that equals the previous one at the same depth.', 'O(n·2ⁿ)', 'O(n)', `function subsetsWithDup(nums) {
  const a = [...nums].sort((x, y) => x - y), out = [], cur = [];
  const go = (start) => {
    out.push([...cur]);
    for (let i = start; i < a.length; i++) { if (i > start && a[i] === a[i - 1]) continue; cur.push(a[i]); go(i + 1); cur.pop(); }
  };
  go(0);
  return out;
}`),
      A('Iterative doubling that only extends new subsets', 'Like the doubling method for distinct values, but when a number repeats extend only the subsets created in the previous step.', 'O(n·2ⁿ)', 'O(1)', `function subsetsWithDup(nums) {
  const a = [...nums].sort((x, y) => x - y);
  let out = [[]], prevStart = 0;
  for (let i = 0; i < a.length; i++) {
    const start = i > 0 && a[i] === a[i - 1] ? prevStart : 0;
    prevStart = out.length;
    const add = [];
    for (let j = start; j < out.length; j++) add.push([...out[j], a[i]]);
    out = out.concat(add);
  }
  return out;
}`)
    ]
  },
  {
    id: 'permutations-ii', title: 'Permutations II', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortAll',
    desc: 'Given an array that may contain duplicates, return all unique permutations (any order; the tests sort them).\n\nExample:\nInput: nums = [1,1,2]\nOutput: [[1,1,2],[1,2,1],[2,1,1]]',
    fn: 'permuteUnique', params: 'nums', constraints: '1 ≤ n ≤ 8',
    tests: [[[1, 1, 2]], [[1, 2, 3]], [[1]], [[2, 2]], [[1, 1, 2, 2]], [[3, 3, 0, 3]]],
    gen: (r) => [r.arr(r.int(1, 5), 0, 2)],
    approaches: [
      A('Generate all, then de-duplicate', 'Produce every permutation (with repeats) and keep unique ones with a set of keys.', 'O(n·n!)', 'O(n·n!)', `function permuteUnique(nums) {
  const seen = new Set(), out = [];
  const go = (cur, rest) => {
    if (!rest.length) { const k = cur.join(','); if (!seen.has(k)) { seen.add(k); out.push(cur); } return; }
    for (let i = 0; i < rest.length; i++) go([...cur, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
  };
  go([], nums);
  return out;
}`),
      A('Backtracking with a sorted array and used flags', 'Sort so equal values are adjacent; skip a value if the same value just before it is unused at this level, which forces equal values to be placed in order.', 'O(n·n!)', 'O(n)', `function permuteUnique(nums) {
  const a = [...nums].sort((x, y) => x - y), used = new Array(a.length).fill(false), out = [], cur = [];
  const go = () => {
    if (cur.length === a.length) { out.push([...cur]); return; }
    for (let i = 0; i < a.length; i++) {
      if (used[i] || (i > 0 && a[i] === a[i - 1] && !used[i - 1])) continue;
      used[i] = true; cur.push(a[i]); go(); cur.pop(); used[i] = false;
    }
  };
  go();
  return out;
}`),
      A('Counter-based backtracking', 'Keep a count of each distinct value and choose among distinct values at each position, so duplicates never arise.', 'O(n·n!)', 'O(n)', `function permuteUnique(nums) {
  const c = new Map();
  for (const x of nums) c.set(x, (c.get(x) || 0) + 1);
  const out = [], cur = [];
  const go = () => {
    if (cur.length === nums.length) { out.push([...cur]); return; }
    for (const [v, n] of c) { if (!n) continue; c.set(v, n - 1); cur.push(v); go(); cur.pop(); c.set(v, n); }
  };
  go();
  return out;
}`)
    ]
  },
  {
    id: 'palindrome-partitioning', title: 'Palindrome Partitioning', d: 'M', topic: 'Backtracking', roles: ['SDE'], out: 'sortAll',
    desc: 'Return every way to split a string into substrings that are all palindromes (any order; the tests sort them).\n\nExample:\nInput: s = "aab"\nOutput: [["a","a","b"],["aa","b"]]',
    fn: 'partition', params: 's', constraints: '1 ≤ length ≤ 16',
    tests: [['aab'], ['a'], ['aaa'], ['abc'], ['abba'], ['racecar']],
    gen: (r) => [r.str(r.int(1, 7), 'ab')],
    approaches: [
      A('Backtracking with a palindrome check', 'Try every prefix; if it is a palindrome, recurse on the rest.', 'O(n·2ⁿ)', 'O(n)', `function partition(s) {
  const out = [], cur = [];
  const pal = (i, j) => { while (i < j) if (s[i++] !== s[j--]) return false; return true; };
  const go = (i) => {
    if (i === s.length) { out.push([...cur]); return; }
    for (let j = i; j < s.length; j++) if (pal(i, j)) { cur.push(s.slice(i, j + 1)); go(j + 1); cur.pop(); }
  };
  go(0);
  return out;
}`),
      A('Backtracking with a precomputed palindrome table', 'Fill a table saying whether s[i..j] is a palindrome once, so the search never re-checks substrings.', 'O(n·2ⁿ)', 'O(n²)', `function partition(s) {
  const n = s.length, p = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--) for (let j = i; j < n; j++) p[i][j] = s[i] === s[j] && (j - i < 2 || p[i + 1][j - 1]);
  const out = [], cur = [];
  const go = (i) => {
    if (i === n) { out.push([...cur]); return; }
    for (let j = i; j < n; j++) if (p[i][j]) { cur.push(s.slice(i, j + 1)); go(j + 1); cur.pop(); }
  };
  go(0);
  return out;
}`)
    ]
  }
];
