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
function randTree(r, maxNodes, lo = -5, hi = 9) {
  const n = r.int(1, maxNodes);
  const nodes = [{ v: r.int(lo, hi), l: null, r: null }];
  for (let i = 1; i < n; i++) {
    const node = { v: r.int(lo, hi), l: null, r: null };
    for (let t = 0; t < 20; t++) { const p = nodes[r.int(0, nodes.length - 1)]; const side = r.next() < 0.5 ? 'l' : 'r'; if (!p[side]) { p[side] = node; break; } }
    nodes.push(node);
  }
  return serialize(nodes[0]);
}

module.exports = [
  {
    id: 'word-ladder', title: 'Word Ladder', d: 'H', topic: 'Graphs', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Transform beginWord into endWord by changing one letter at a time; every intermediate word must be in wordList (endWord must be in the list too). Return the number of words in the shortest transformation sequence (counting both ends), or 0 if none exists.\n\nExample:\nInput: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]\nOutput: 5',
    fn: 'ladderLength', params: 'beginWord, endWord, wordList', constraints: '1 ≤ length ≤ 10, wordList ≤ 5000',
    tests: [['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']], ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']], ['a', 'c', ['a', 'b', 'c']], ['hot', 'dog', ['hot', 'dog']], ['red', 'tax', ['ted', 'tex', 'red', 'tax', 'tad', 'den', 'rex', 'pee']], ['abc', 'abc', ['abc']]],
    gen: (r) => { const w = Array.from({ length: r.int(1, 7) }, () => r.str(3, 'ab')); return [r.str(3, 'ab'), r.str(3, 'ab'), [...new Set(w)]]; },
    approaches: [
      A('Breadth-first search comparing every pair', 'From the current word, scan the entire word list for unvisited words that differ in exactly one letter. Level by level BFS gives the shortest sequence.', 'O(n²·L)', 'O(n)', `function ladderLength(beginWord, endWord, wordList) {
  if (!wordList.includes(endWord)) return 0;
  if (beginWord === endWord) return 1;
  const diff1 = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false; return d === 1; };
  const seen = new Set([beginWord]);
  let q = [beginWord], steps = 1;
  while (q.length) {
    const next = [];
    for (const w of q) for (const x of wordList) if (!seen.has(x) && diff1(w, x)) { if (x === endWord) return steps + 1; seen.add(x); next.push(x); }
    q = next; steps++;
  }
  return 0;
}`, { note: 'n words of length L: every pair is compared.' }),
      A('Breadth-first search with generated neighbours', 'For each word try replacing every position with every letter and look the result up in a set. Cost per word is L × 26 lookups, independent of the list size.', 'O(n·L·26)', 'O(n·L)', `function ladderLength(beginWord, endWord, wordList) {
  const dict = new Set(wordList);
  if (!dict.has(endWord)) return 0;
  if (beginWord === endWord) return 1;
  let q = [beginWord], steps = 1;
  const seen = new Set([beginWord]);
  while (q.length) {
    const next = [];
    for (const w of q) for (let i = 0; i < w.length; i++) for (let c = 97; c <= 122; c++) {
      const x = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
      if (x === endWord) return steps + 1;
      if (dict.has(x) && !seen.has(x)) { seen.add(x); next.push(x); }
    }
    q = next; steps++;
  }
  return 0;
}`),
      A('Bidirectional breadth-first search', 'Search from both ends at once and always expand the smaller frontier. The two searches meet after about half the depth, which explores far fewer words.', 'O(n·L·26)', 'O(n·L)', `function ladderLength(beginWord, endWord, wordList) {
  const dict = new Set(wordList);
  if (!dict.has(endWord)) return 0;
  if (beginWord === endWord) return 1;
  let a = new Set([beginWord]), b = new Set([endWord]), steps = 1;
  const seen = new Set([beginWord, endWord]);
  while (a.size && b.size) {
    if (a.size > b.size) [a, b] = [b, a];
    const next = new Set();
    for (const w of a) for (let i = 0; i < w.length; i++) for (let c = 97; c <= 122; c++) {
      const x = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
      if (b.has(x)) return steps + 1;
      if (dict.has(x) && !seen.has(x)) { seen.add(x); next.add(x); }
    }
    a = next; steps++;
  }
  return 0;
}`)
    ]
  },
  {
    id: 'alien-dictionary', title: 'Alien Dictionary', d: 'H', topic: 'Graphs', roles: ['SDE'],
    desc: 'Words are sorted lexicographically in an alien language. Return a string of the letters of that alphabet in a valid order, or "" if the ordering is contradictory or invalid. Several orders can be valid, so the tests check that the returned alphabet respects every ordering implied by the words.\n\nExample:\nInput: words = ["wrt","wrf","er","ett","rftt"]\nOutput: "wertf"',
    fn: 'alienOrder', params: 'words', constraints: '1 ≤ words ≤ 100, lowercase letters',
    expr: (w) => `(() => { const o = alienOrder(${J(w)}); if (typeof o !== 'string') return o; if (o === '') return ''; const letters = new Set(${J(w)}.join('')); if (o.length !== letters.size || new Set(o).size !== o.length) return false; const pos = {}; [...o].forEach((c, i) => { pos[c] = i; }); const W = ${J(w)}; for (let i = 0; i + 1 < W.length; i++) { const a = W[i], b = W[i + 1]; let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; if (k === Math.min(a.length, b.length)) { if (a.length > b.length) return false; } else if (pos[a[k]] === undefined || pos[b[k]] === undefined || pos[a[k]] > pos[b[k]]) return false; } return true; })()`,
    tests: [[['wrt', 'wrf', 'er', 'ett', 'rftt']], [['z', 'x']], [['z', 'x', 'z']], [['abc', 'ab']], [['a']], [['ab', 'adc']], [['z', 'z']], [['ba', 'bc', 'ac', 'cab']]],
    gen: (r) => { const n = r.int(1, 4); return [Array.from({ length: n }, () => r.str(r.int(1, 3), 'abc'))]; },
    approaches: [
      A('Build constraints then try all orderings', 'Collect the "a before b" rules from adjacent words, then test every permutation of the letters against them. Only workable for a handful of letters.', 'O(L!·E)', 'O(L)', `function alienOrder(words) {
  const letters = [...new Set(words.join(''))], rules = [];
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i], b = words[i + 1];
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    if (k === Math.min(a.length, b.length)) { if (a.length > b.length) return ''; }
    else rules.push([a[k], b[k]]);
  }
  let found = '';
  const go = (cur, rest) => {
    if (found) return;
    if (!rest.length) { const p = {}; [...cur].forEach((c, i) => { p[c] = i; }); if (rules.every(([x, y]) => p[x] < p[y])) found = cur; return; }
    for (let i = 0; i < rest.length; i++) go(cur + rest[i], [...rest.slice(0, i), ...rest.slice(i + 1)]);
  };
  go('', letters);
  return found;
}`),
      A("Topological sort with Kahn's algorithm", 'Turn the rules into a directed graph and repeatedly output letters with no incoming edges. If some letters are never output there is a cycle, so no valid order exists.', 'O(C)', 'O(1)', `function alienOrder(words) {
  const adj = new Map(), indeg = new Map();
  for (const w of words) for (const c of w) { if (!adj.has(c)) { adj.set(c, new Set()); indeg.set(c, 0); } }
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i], b = words[i + 1];
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    if (k === Math.min(a.length, b.length)) { if (a.length > b.length) return ''; continue; }
    if (!adj.get(a[k]).has(b[k])) { adj.get(a[k]).add(b[k]); indeg.set(b[k], indeg.get(b[k]) + 1); }
  }
  const q = [...indeg].filter(([, d]) => d === 0).map(([c]) => c);
  let out = '';
  while (q.length) { const c = q.shift(); out += c; for (const n of adj.get(c)) { indeg.set(n, indeg.get(n) - 1); if (indeg.get(n) === 0) q.push(n); } }
  return out.length === adj.size ? out : '';
}`, { note: 'C is the total number of characters in all words; the alphabet has at most 26 letters.' }),
      A('Depth-first topological sort', 'Run a DFS over the rules and output a letter after all letters that must follow it; reverse the finishing order. Detect a cycle with visiting marks.', 'O(C)', 'O(1)', `function alienOrder(words) {
  const adj = new Map();
  for (const w of words) for (const c of w) if (!adj.has(c)) adj.set(c, new Set());
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i], b = words[i + 1];
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    if (k === Math.min(a.length, b.length)) { if (a.length > b.length) return ''; continue; }
    adj.get(a[k]).add(b[k]);
  }
  const state = new Map(), out = [];
  const dfs = (c) => {
    if (state.get(c) === 1) return false;
    if (state.get(c) === 2) return true;
    state.set(c, 1);
    for (const n of adj.get(c)) if (!dfs(n)) return false;
    state.set(c, 2); out.push(c);
    return true;
  };
  for (const c of adj.keys()) if (!dfs(c)) return '';
  return out.reverse().join('');
}`)
    ]
  },
  {
    id: 'binary-tree-max-path-sum', title: 'Binary Tree Maximum Path Sum', d: 'H', topic: 'Trees', roles: ['SDE'],
    desc: 'A path is any sequence of nodes where consecutive nodes are connected by an edge; it does not need to pass through the root and each node appears at most once. Return the maximum sum of node values over all non-empty paths.\n\nExample:\nInput: root = [-10,9,20,null,null,15,7]\nOutput: 42',
    fn: 'maxPathSum', params: 'root', constraints: '1 ≤ n ≤ 3·10^4', starter: starter('maxPathSum', 'root'),
    expr: (a) => `maxPathSum(fromTree(${J(a)}))`,
    tests: [[[1, 2, 3]], [[-10, 9, 20, null, null, 15, 7]], [[-3]], [[2, -1]], [[-2, 1]], [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]], [[1, -2, 3]]],
    gen: (r) => [randTree(r, 8)],
    approaches: [
      A('Best path through every node, recomputing gains', 'For each node the best path using it as the top is node + best downward gain from the left + best from the right. Recompute those downward gains for every node.', 'O(n²)', 'O(h)', `function maxPathSum(root) {
  const down = (n) => (n ? n.val + Math.max(0, down(n.left), down(n.right)) : 0);
  let best = -Infinity;
  const go = (n) => { if (!n) return; best = Math.max(best, n.val + Math.max(0, down(n.left)) + Math.max(0, down(n.right))); go(n.left); go(n.right); };
  go(root);
  return best;
}`),
      A('Single pass returning the downward gain', 'One post-order traversal returns the best downward path from each node while updating a global best with the "bent" path through it.', 'O(n)', 'O(h)', `function maxPathSum(root) {
  let best = -Infinity;
  const gain = (n) => {
    if (!n) return 0;
    const l = Math.max(0, gain(n.left)), r = Math.max(0, gain(n.right));
    best = Math.max(best, n.val + l + r);
    return n.val + Math.max(l, r);
  };
  gain(root);
  return best;
}`)
    ]
  },
  {
    id: 'serialize-deserialize-tree', title: 'Serialize and Deserialize Binary Tree', d: 'H', topic: 'Trees', roles: ['SDE', 'Backend Developer'],
    desc: 'Design functions to turn a binary tree into a string and back. Implement class Codec with serialize(root) and deserialize(data) so that deserialize(serialize(tree)) rebuilds the same tree. The format is up to you. TreeNode, fromTree and toTree are predefined.\n\nExample:\nTree [1,2,3,null,null,4,5] → string → the same tree',
    fn: 'Codec', params: '', constraints: '0 ≤ n ≤ 10^4',
    starter: 'class Codec {\n  // TreeNode { val, left, right } is predefined.\n  serialize(root) {\n    // Your code here\n  }\n  deserialize(data) {\n    // Your code here\n  }\n}',
    expr: (a) => `(() => { const c = new Codec(); const s = c.serialize(fromTree(${J(a)})); return [typeof s, toTree(c.deserialize(s))]; })()`,
    tests: [[[1, 2, 3, null, null, 4, 5]], [[]], [[1]], [[1, null, 2, null, 3]], [[5, 4, 7, 3, null, 2, null, -1, null, 9]], [[0, -1, 1]]],
    gen: (r) => [r.next() < 0.1 ? [] : randTree(r, 9, -5, 9)],
    approaches: [
      A('Level order with null markers', 'Write values level by level and "null" for missing children, then rebuild by reading children for each queued node in the same order.', 'O(n)', 'O(n)', `class Codec {
  serialize(root) {
    const out = [], q = [root];
    while (q.length) { const n = q.shift(); if (n) { out.push(n.val); q.push(n.left, n.right); } else out.push('#'); }
    return out.join(',');
  }
  deserialize(data) {
    const t = data.split(',');
    if (t[0] === '#' || t[0] === '') return null;
    const root = new TreeNode(Number(t[0])), q = [root];
    let i = 1;
    while (q.length && i < t.length) {
      const n = q.shift();
      if (t[i] !== '#') { n.left = new TreeNode(Number(t[i])); q.push(n.left); } i++;
      if (i < t.length && t[i] !== '#') { n.right = new TreeNode(Number(t[i])); q.push(n.right); } i++;
    }
    return root;
  }
}`),
      A('Preorder with null markers', 'Write the tree in preorder, using "#" for an empty child. A single recursive read of the same sequence rebuilds it uniquely because the markers show where each subtree ends.', 'O(n)', 'O(n)', `class Codec {
  serialize(root) {
    const out = [];
    const go = (n) => { if (!n) { out.push('#'); return; } out.push(n.val); go(n.left); go(n.right); };
    go(root);
    return out.join(',');
  }
  deserialize(data) {
    const t = data.split(','); let i = 0;
    const go = () => { const v = t[i++]; if (v === '#' || v === undefined) return null; const n = new TreeNode(Number(v)); n.left = go(); n.right = go(); return n; };
    return go();
  }
}`)
    ]
  },
  {
    id: 'recover-bst', title: 'Recover Binary Search Tree', d: 'H', topic: 'Trees', roles: ['SDE'],
    desc: 'Exactly two nodes of a binary search tree had their values swapped by mistake. Recover the tree without changing its structure and return the root.\n\nExample:\nInput: root = [1,3,null,null,2]\nOutput: [3,1,null,null,2]',
    fn: 'recoverTree', params: 'root', constraints: '2 ≤ n ≤ 1000', starter: starter('recoverTree', 'root'),
    expr: (a) => `toTree(recoverTree(fromTree(${J(a)})))`,
    tests: [[[1, 3, null, null, 2]], [[3, 1, 4, null, null, 2]], [[2, 3, 1]], [[1, 2]], [[5, 3, 4, 2, 8, 7, 9]], [[5, 3, 8, 9, 4, 7, 2]], [[3, 2, 6, 1, 4, 5, 7]]],
    gen: (r) => { const vals = r.uniq(r.int(2, 8), 0, 30); let root = null; for (const v of vals) { const node = { v, l: null, r: null }; if (!root) { root = node; continue; } let p = root; for (;;) { if (v < p.v) { if (p.l) p = p.l; else { p.l = node; break; } } else if (p.r) p = p.r; else { p.r = node; break; } } } const all = []; const walk = (n) => { if (!n) return; all.push(n); walk(n.l); walk(n.r); }; walk(root); if (all.length >= 2) { const a = r.int(0, all.length - 1); let b = r.int(0, all.length - 1); while (b === a) b = r.int(0, all.length - 1); [all[a].v, all[b].v] = [all[b].v, all[a].v]; } return [serialize(root)]; },
    approaches: [
      A('Inorder values, sort, write back', 'Read all values in order, sort them, and write the sorted values back in inorder. Fixes the tree regardless of which values were swapped.', 'O(n log n)', 'O(n)', `function recoverTree(root) {
  const nodes = [];
  const go = (n) => { if (!n) return; go(n.left); nodes.push(n); go(n.right); };
  go(root);
  const vals = nodes.map((n) => n.val).sort((a, b) => a - b);
  nodes.forEach((n, i) => { n.val = vals[i]; });
  return root;
}`),
      A('Find the two out-of-order nodes in one inorder pass', 'In an inorder walk of a valid BST values increase. A swap creates one or two "descents"; the first node of the first descent and the second node of the last descent are the swapped pair.', 'O(n)', 'O(h)', `function recoverTree(root) {
  let first = null, second = null, prev = null;
  const go = (n) => {
    if (!n) return;
    go(n.left);
    if (prev && prev.val > n.val) { if (!first) first = prev; second = n; }
    prev = n;
    go(n.right);
  };
  go(root);
  [first.val, second.val] = [second.val, first.val];
  return root;
}`),
      A('Morris traversal (O(1) space)', 'The same descent detection, but using threaded links instead of recursion so no stack is used.', 'O(n)', 'O(1)', `function recoverTree(root) {
  let first = null, second = null, prev = null, cur = root;
  const visit = (n) => { if (prev && prev.val > n.val) { if (!first) first = prev; second = n; } prev = n; };
  while (cur) {
    if (!cur.left) { visit(cur); cur = cur.right; }
    else {
      let p = cur.left;
      while (p.right && p.right !== cur) p = p.right;
      if (!p.right) { p.right = cur; cur = cur.left; } else { p.right = null; visit(cur); cur = cur.right; }
    }
  }
  [first.val, second.val] = [second.val, first.val];
  return root;
}`)
    ]
  },
  {
    id: 'critical-connections', title: 'Critical Connections in a Network', d: 'H', topic: 'Graphs', roles: ['SDE', 'Backend Developer'], out: 'sortAll',
    desc: 'There are n servers numbered 0..n-1 joined by undirected connections. A connection is critical if removing it disconnects some servers that were connected. Return all critical connections (any order and either direction; the tests normalise them).\n\nExample:\nInput: n = 4, connections = [[0,1],[1,2],[2,0],[1,3]]\nOutput: [[1,3]]',
    fn: 'criticalConnections', params: 'n, connections', constraints: '2 ≤ n ≤ 10^5',
    expr: (n, c) => `(() => { const r = criticalConnections(${n}, ${J(c)}); return Array.isArray(r) ? r.map((e) => [Math.min(e[0], e[1]), Math.max(e[0], e[1])]).sort((a, b) => a[0] - b[0] || a[1] - b[1]) : r; })()`,
    tests: [[4, [[0, 1], [1, 2], [2, 0], [1, 3]]], [2, [[0, 1]]], [3, [[0, 1], [1, 2], [2, 0]]], [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], [6, [[0, 1], [1, 2], [2, 0], [1, 3], [3, 4], [4, 5], [5, 3]]], [4, [[0, 1], [0, 2], [0, 3]]]],
    gen: (r) => { const n = r.int(2, 6); const e = new Set(); for (let i = 1; i < n; i++) { const j = r.int(0, i - 1); e.add(j + ',' + i); } for (let k = 0; k < r.int(0, 3); k++) { const a = r.int(0, n - 1), b = r.int(0, n - 1); if (a !== b) e.add(Math.min(a, b) + ',' + Math.max(a, b)); } return [n, [...e].map((s) => s.split(',').map(Number))]; },
    approaches: [
      A('Remove each edge and test connectivity', 'For every connection delete it and run a search to see whether the graph is still connected.', 'O(E·(V + E))', 'O(V + E)', `function criticalConnections(n, connections) {
  const out = [];
  for (let skip = 0; skip < connections.length; skip++) {
    const adj = Array.from({ length: n }, () => []);
    connections.forEach(([a, b], i) => { if (i !== skip) { adj[a].push(b); adj[b].push(a); } });
    const seen = new Set([0]), st = [0];
    while (st.length) { const u = st.pop(); for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); st.push(v); } }
    if (seen.size < n) out.push(connections[skip]);
  }
  return out;
}`),
      A("Tarjan's bridge-finding (low-link values)", 'Run one DFS recording each node\'s discovery time and the lowest discovery time reachable from its subtree. An edge to a child whose low value is still above the parent\'s discovery time is a bridge.', 'O(V + E)', 'O(V + E)', `function criticalConnections(n, connections) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of connections) { adj[a].push(b); adj[b].push(a); }
  const disc = new Array(n).fill(-1), low = new Array(n).fill(0), out = [];
  let t = 0;
  const dfs = (u, parent) => {
    disc[u] = low[u] = t++;
    for (const v of adj[u]) {
      if (v === parent) continue;
      if (disc[v] === -1) { dfs(v, u); low[u] = Math.min(low[u], low[v]); if (low[v] > disc[u]) out.push([u, v]); }
      else low[u] = Math.min(low[u], disc[v]);
    }
  };
  dfs(0, -1);
  return out;
}`)
    ]
  },
  {
    id: 'swim-in-rising-water', title: 'Swim in Rising Water', d: 'H', topic: 'Graphs', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'grid[i][j] is the elevation at that cell. At time t the water depth everywhere is t, and you can swim between two adjacent cells only if both have elevation at most t. Return the least time until you can get from the top-left cell to the bottom-right cell.\n\nExample:\nInput: grid = [[0,2],[1,3]]\nOutput: 3',
    fn: 'swimInWater', params: 'grid', constraints: '1 ≤ n ≤ 50, values are a permutation of 0..n²-1',
    tests: [[[[0, 2], [1, 3]]], [[[0, 1, 2, 3, 4], [24, 23, 22, 21, 5], [12, 13, 14, 15, 16], [11, 17, 18, 19, 20], [10, 9, 8, 7, 6]]], [[[0]]], [[[3, 2], [0, 1]]], [[[0, 1, 2], [5, 4, 3], [6, 7, 8]]], [[[8, 5, 2], [7, 4, 1], [6, 3, 0]]]],
    gen: (r) => { const n = r.int(1, 4); const vals = Array.from({ length: n * n }, (_, i) => i).sort(() => r.next() - 0.5); return [Array.from({ length: n }, (_, i) => vals.slice(i * n, i * n + n))]; },
    approaches: [
      A('Binary search on time with a flood fill', 'Reachability only improves as time rises, so binary search the smallest time t for which a search over cells with elevation ≤ t connects the corners.', 'O(n²·log n)', 'O(n²)', `function swimInWater(grid) {
  const n = grid.length;
  const ok = (t) => {
    if (grid[0][0] > t) return false;
    const seen = new Set([0]), st = [[0, 0]];
    while (st.length) {
      const [i, j] = st.pop();
      if (i === n - 1 && j === n - 1) return true;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < n && y < n && grid[x][y] <= t && !seen.has(x * n + y)) { seen.add(x * n + y); st.push([x, y]); } }
    }
    return false;
  };
  let lo = grid[0][0], hi = n * n - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ok(m)) hi = m; else lo = m + 1; }
  return lo;
}`),
      A('Dijkstra variant with a heap (minimise the maximum)', 'Always expand the frontier cell with the lowest elevation. The answer is the highest elevation seen on the best route, since you must wait for it.', 'O(n² log n)', 'O(n²)', `function swimInWater(grid) {
  const n = grid.length, seen = new Set([0]), h = [[grid[0][0], 0, 0]];
  const push = (e) => { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const t = h[0], l = h.pop(); if (h.length) { h[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < h.length && h[a][0] < h[m][0]) m = a; if (b < h.length && h[b][0] < h[m][0]) m = b; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return t; };
  let best = 0;
  while (h.length) {
    const [v, i, j] = pop();
    best = Math.max(best, v);
    if (i === n - 1 && j === n - 1) return best;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < n && y < n && !seen.has(x * n + y)) { seen.add(x * n + y); push([grid[x][y], x, y]); } }
  }
}`),
      A('Union-Find over cells in elevation order', 'Activate cells from the lowest elevation upward, joining each with already-active neighbours. The moment the two corners are in one set, the current elevation is the answer.', 'O(n² log n)', 'O(n²)', `function swimInWater(grid) {
  const n = grid.length, p = Array.from({ length: n * n }, (_, i) => i), at = new Array(n * n);
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) at[grid[i][j]] = [i, j];
  const on = new Array(n * n).fill(false);
  for (let t = 0; t < n * n; t++) {
    const [i, j] = at[t];
    on[i * n + j] = true;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < n && y < n && on[x * n + y]) p[find(i * n + j)] = find(x * n + y); }
    if (on[0] && on[n * n - 1] && find(0) === find(n * n - 1)) return t;
  }
}`)
    ]
  },
  {
    id: 'reconstruct-itinerary', title: 'Reconstruct Itinerary', d: 'H', topic: 'Graphs', roles: ['SDE'],
    desc: 'Given airline tickets [from, to], reconstruct the itinerary starting at "JFK" that uses every ticket exactly once. If several itineraries exist, return the one that is smallest in lexical order.\n\nExample:\nInput: tickets = [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]\nOutput: ["JFK","MUC","LHR","SFO","SJC"]',
    fn: 'findItinerary', params: 'tickets', constraints: '1 ≤ tickets ≤ 300, a valid itinerary exists',
    tests: [[[['MUC', 'LHR'], ['JFK', 'MUC'], ['SFO', 'SJC'], ['LHR', 'SFO']]], [[['JFK', 'SFO'], ['JFK', 'ATL'], ['SFO', 'ATL'], ['ATL', 'JFK'], ['ATL', 'SFO']]], [[['JFK', 'KUL'], ['JFK', 'NRT'], ['NRT', 'JFK']]], [[['JFK', 'A']]], [[['JFK', 'A'], ['A', 'JFK']]], [[['JFK', 'A'], ['JFK', 'B'], ['B', 'JFK']]]],
    gen: (r) => { const airports = ['JFK', 'A', 'B', 'C']; const t = []; let cur = 'JFK'; for (let i = 0; i < r.int(1, 6); i++) { const nxt = r.pick(airports); t.push([cur, nxt]); cur = nxt; } return [t.sort(() => r.next() - 0.5)]; },
    approaches: [
      A('Backtracking over sorted destinations', 'Sort each airport\'s destinations. Try them in order, removing the ticket used, and backtrack when stuck. The first complete itinerary is lexically smallest.', 'O(Eᵈ)', 'O(E)', `function findItinerary(tickets) {
  const adj = new Map();
  for (const [a, b] of tickets) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); }
  for (const l of adj.values()) l.sort();
  const total = tickets.length + 1;
  const path = ['JFK'];
  const go = (u) => {
    if (path.length === total) return true;
    const list = adj.get(u) || [];
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i] === list[i - 1]) continue;
      const v = list.splice(i, 1)[0];
      path.push(v);
      if (go(v)) return true;
      path.pop(); list.splice(i, 0, v);
    }
    return false;
  };
  go('JFK');
  return path;
}`),
      A("Hierholzer's algorithm (Eulerian path)", 'Do a DFS that always takes the smallest unused ticket and appends an airport only when it has no tickets left. Reversing that order gives the itinerary; each ticket is used once.', 'O(E log E)', 'O(E)', `function findItinerary(tickets) {
  const adj = new Map();
  for (const [a, b] of tickets) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); }
  for (const l of adj.values()) l.sort().reverse();
  const out = [];
  const dfs = (u) => { const l = adj.get(u); while (l && l.length) dfs(l.pop()); out.push(u); };
  dfs('JFK');
  return out.reverse();
}`)
    ]
  },
  {
    id: 'word-search-ii', title: 'Word Search II', d: 'H', topic: 'Backtracking', roles: ['SDE'], out: 'sort',
    desc: 'Given a grid of letters and a list of words, return all words that can be built from adjacent cells (up, down, left, right) without reusing a cell in the same word. Any order; the tests sort the result.\n\nExample:\nInput: board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]\nOutput: ["eat","oath"]',
    fn: 'findWords', params: 'board, words', constraints: '1 ≤ m, n ≤ 12, words ≤ 3·10^4',
    tests: [[[['o', 'a', 'a', 'n'], ['e', 't', 'a', 'e'], ['i', 'h', 'k', 'r'], ['i', 'f', 'l', 'v']], ['oath', 'pea', 'eat', 'rain']], [[['a', 'b'], ['c', 'd']], ['abcb']], [[['a']], ['a']], [[['a', 'a']], ['aaa']], [[['a', 'b'], ['c', 'd']], ['ab', 'cb', 'abdc', 'ac']], [[['a', 'b', 'c'], ['a', 'e', 'd'], ['a', 'f', 'g']], ['abcdefg', 'gfedcbaaa', 'eaabcdgfa', 'befa', 'dgc', 'ade']]],
    gen: (r) => [Array.from({ length: r.int(1, 3) }, () => Array.from({ length: r.int(1, 1) + 1 }, () => r.pick(['a', 'b', 'c']))), [...new Set(Array.from({ length: r.int(1, 4) }, () => r.str(r.int(1, 4), 'abc')))]],
    approaches: [
      A('Run Word Search for each word', 'Solve the single-word search separately for every word in the list.', 'O(W·m·n·4^L)', 'O(L)', `function findWords(board, words) {
  const m = board.length, n = board[0].length;
  const has = (w) => {
    const seen = board.map((r) => r.map(() => false));
    const dfs = (i, j, k) => {
      if (k === w.length) return true;
      if (i < 0 || j < 0 || i >= m || j >= n || seen[i][j] || board[i][j] !== w[k]) return false;
      seen[i][j] = true;
      const ok = dfs(i + 1, j, k + 1) || dfs(i - 1, j, k + 1) || dfs(i, j + 1, k + 1) || dfs(i, j - 1, k + 1);
      seen[i][j] = false;
      return ok;
    };
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (dfs(i, j, 0)) return true;
    return false;
  };
  return words.filter(has);
}`, { note: 'W is the number of words and L the longest word length.' }),
      A('Trie of all words with one backtracking search', 'Put all words into a trie, then search the grid once. At each step follow the trie edge for the cell letter; the trie prunes any path that is not a prefix of some word, and every word found is collected on the way.', 'O(m·n·4^L)', 'O(W·L)', `function findWords(board, words) {
  const root = {};
  for (const w of words) { let t = root; for (const c of w) t = t[c] || (t[c] = {}); t.word = w; }
  const m = board.length, n = board[0].length, out = new Set();
  const dfs = (i, j, node) => {
    if (i < 0 || j < 0 || i >= m || j >= n) return;
    const c = board[i][j];
    if (c === '#' || !node[c]) return;
    const next = node[c];
    if (next.word) out.add(next.word);
    board[i][j] = '#';
    dfs(i + 1, j, next); dfs(i - 1, j, next); dfs(i, j + 1, next); dfs(i, j - 1, next);
    board[i][j] = c;
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) dfs(i, j, root);
  return [...out];
}`)
    ]
  },
  {
    id: 'max-points-on-line', title: 'Max Points on a Line', d: 'H', topic: 'Math', roles: ['SDE'],
    desc: 'Given points on a plane, return the maximum number of points that lie on the same straight line.\n\nExample:\nInput: points = [[1,1],[2,2],[3,3]]\nOutput: 3',
    fn: 'maxPoints', params: 'points', constraints: '1 ≤ n ≤ 300, all points distinct',
    tests: [[[[1, 1], [2, 2], [3, 3]]], [[[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]], [[[0, 0]]], [[[0, 0], [1, 1]]], [[[0, 0], [0, 1], [0, 2], [1, 5]]], [[[1, 1], [1, 2], [2, 1], [2, 2]]], [[[0, 0], [1, 0], [2, 0], [3, 1]]]],
    gen: (r) => { const s = new Set(); const pts = []; while (pts.length < r.int(1, 7)) { const p = [r.int(0, 5), r.int(0, 5)]; const k = p.join(','); if (s.has(k)) continue; s.add(k); pts.push(p); } return [pts]; },
    approaches: [
      A('Check every triple', 'For every pair of points count how many other points are collinear with them using the cross product.', 'O(n³)', 'O(1)', `function maxPoints(points) {
  const n = points.length;
  if (n <= 2) return n;
  let best = 2;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let c = 2;
    for (let k = 0; k < n; k++) if (k !== i && k !== j && (points[j][0] - points[i][0]) * (points[k][1] - points[i][1]) === (points[j][1] - points[i][1]) * (points[k][0] - points[i][0])) c++;
    best = Math.max(best, c);
  }
  return best;
}`),
      A('Slope counts from each point', 'Fix one point and count how many other points share each reduced slope (dx, dy) with it. The largest group plus the point itself is the best line through it.', 'O(n²)', 'O(n)', `function maxPoints(points) {
  const n = points.length;
  if (n <= 2) return n;
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  let best = 1;
  for (let i = 0; i < n; i++) {
    const m = new Map();
    for (let j = i + 1; j < n; j++) {
      let dx = points[j][0] - points[i][0], dy = points[j][1] - points[i][1];
      const g = gcd(dx, dy);
      dx /= g; dy /= g;
      if (dx < 0 || (dx === 0 && dy < 0)) { dx = -dx; dy = -dy; }
      const k = dx + '/' + dy;
      m.set(k, (m.get(k) || 0) + 1);
      best = Math.max(best, m.get(k) + 1);
    }
  }
  return best;
}`, { note: 'Reducing the slope with the gcd avoids floating-point errors that dividing would cause.' })
    ]
  },
  {
    id: 'skyline-problem', title: 'The Skyline Problem', d: 'H', topic: 'Heap', roles: ['SDE'], sizes: [10, 100, 1000, 10000, 100000, 1000000],
    desc: 'Buildings are given as [left, right, height]. Return the skyline: the "key points" [x, height] where the height of the outline changes, sorted by x, ending with a point of height 0. Consecutive key points must have different heights.\n\nExample:\nInput: buildings = [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]\nOutput: [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]',
    fn: 'getSkyline', params: 'buildings', constraints: '1 ≤ n ≤ 10^4',
    tests: [[[[2, 9, 10], [3, 7, 15], [5, 12, 12], [15, 20, 10], [19, 24, 8]]], [[[0, 2, 3], [2, 5, 3]]], [[[1, 2, 1]]], [[[1, 5, 3], [2, 4, 5]]], [[[0, 5, 7], [5, 10, 7], [5, 10, 12], [10, 15, 7], [15, 20, 7], [15, 20, 12], [20, 25, 7]]], [[[1, 3, 2], [2, 4, 3], [3, 5, 2]]]],
    gen: (r) => [Array.from({ length: r.int(1, 5) }, () => { const l = r.int(0, 10); return [l, l + r.int(1, 6), r.int(1, 8)]; })],
    approaches: [
      A('Height at every x coordinate', 'For each distinct edge x compute the tallest building covering it, then emit a point whenever the height changes.', 'O(n²)', 'O(n)', `function getSkyline(buildings) {
  const xs = [...new Set(buildings.flatMap(([l, r]) => [l, r]))].sort((a, b) => a - b), out = [];
  let prev = 0;
  for (const x of xs) {
    let h = 0;
    for (const [l, r, ht] of buildings) if (l <= x && x < r) h = Math.max(h, ht);
    if (h !== prev) { out.push([x, h]); prev = h; }
  }
  return out;
}`),
      A('Sweep line with a max-heap', 'Turn each building into a start event and an end event, sorted by x. Keep a max-heap of active heights; whenever the heap maximum changes, record a key point.', 'O(n log n)', 'O(n)', `function getSkyline(buildings) {
  const ev = [];
  for (const [l, r, h] of buildings) { ev.push([l, -h]); ev.push([r, h]); }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const heights = new Map([[0, 1]]), out = [];
  let prev = 0;
  const cur = () => Math.max(...[...heights.keys()].filter((k) => heights.get(k) > 0));
  for (const [x, h] of ev) {
    if (h < 0) heights.set(-h, (heights.get(-h) || 0) + 1); else heights.set(h, heights.get(h) - 1);
    const top = cur();
    if (top !== prev) { out.push([x, top]); prev = top; }
  }
  return out;
}`, { note: 'This uses a counted map for the active heights; a real heap with lazy deletion gives the O(n log n) bound on large inputs.' })
    ]
  },
  {
    id: 'binary-tree-cameras', title: 'Binary Tree Cameras', d: 'H', topic: 'Trees', roles: ['SDE'],
    desc: 'Install cameras on tree nodes. Each camera watches its parent, itself and its direct children. Return the minimum number of cameras needed to watch every node.\n\nExample:\nInput: root = [0,0,null,0,0]\nOutput: 1',
    fn: 'minCameraCover', params: 'root', constraints: '1 ≤ n ≤ 1000', starter: starter('minCameraCover', 'root'),
    expr: (a) => `minCameraCover(fromTree(${J(a)}))`,
    tests: [[[0, 0, null, 0, 0]], [[0, 0, null, 0, null, 0, null, null, 0]], [[0]], [[0, 0]], [[0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0]], [[0, null, 0, null, 0, null, 0]]],
    gen: (r) => [randTree(r, 9, 0, 0)],
    approaches: [
      A('Try every subset of nodes', 'Choose which nodes get a camera and check whether every node is watched. Exponential but obviously correct.', 'O(2ⁿ·n)', 'O(n)', `function minCameraCover(root) {
  const nodes = [], parent = new Map();
  const go = (n, p) => { if (!n) return; nodes.push(n); parent.set(n, p); go(n.left, n); go(n.right, n); };
  go(root, null);
  let best = Infinity;
  for (let mask = 0; mask < 1 << nodes.length; mask++) {
    const cams = new Set(nodes.filter((_, i) => mask & (1 << i)));
    if (cams.size >= best) continue;
    const ok = nodes.every((n) => cams.has(n) || cams.has(parent.get(n)) || cams.has(n.left) || cams.has(n.right));
    if (ok) best = cams.size;
  }
  return best;
}`),
      A('Greedy post-order with three states', 'Each node reports one of: not covered, covered without a camera, or has a camera. A node must get a camera if any child is uncovered; leaves are better left uncovered so their parent gets the camera.', 'O(n)', 'O(h)', `function minCameraCover(root) {
  let cams = 0;
  const go = (n) => {
    if (!n) return 1; // covered
    const l = go(n.left), r = go(n.right);
    if (l === 0 || r === 0) { cams++; return 2; } // place a camera here
    return l === 2 || r === 2 ? 1 : 0; // covered by a child camera, or not covered yet
  };
  if (go(root) === 0) cams++;
  return cams;
}`)
    ]
  }
];
