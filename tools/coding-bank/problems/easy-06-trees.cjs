const { A } = require('../dsl.cjs');
const J = (x) => JSON.stringify(x);
const TREE_NOTE = '// TreeNode { val, left, right } is predefined. Tests build trees with fromTree([..]) (level order, null = empty).';

/** Random binary tree as a level-order array with nulls. */
function randTree(r, maxNodes) {
  const n = r.int(0, maxNodes);
  if (n === 0) return [];
  const nodes = [{ v: r.int(0, 9), l: null, r: null }];
  for (let i = 1; i < n; i++) {
    const node = { v: r.int(0, 9), l: null, r: null };
    for (let tries = 0; tries < 20; tries++) {
      const p = nodes[r.int(0, nodes.length - 1)];
      const side = r.next() < 0.5 ? 'l' : 'r';
      if (!p[side]) { p[side] = node; break; }
    }
    nodes.push(node);
  }
  return serialize(nodes[0]);
}
function serialize(root) {
  const out = []; const q = [root];
  while (q.length) { const n = q.shift(); if (n) { out.push(n.v); q.push(n.l, n.r); } else out.push(null); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
/** Random binary search tree (distinct values). */
function randBst(r, maxNodes) {
  const vals = r.uniq(r.int(0, maxNodes), 0, 30);
  let root = null;
  for (const v of vals) { const node = { v, l: null, r: null }; if (!root) { root = node; continue; } let p = root; for (;;) { if (v < p.v) { if (p.l) p = p.l; else { p.l = node; break; } } else if (p.r) p = p.r; else { p.r = node; break; } } }
  return root ? serialize(root) : [];
}

const T = (note = TREE_NOTE) => (fn, params) => `function ${fn}(${params}) {\n  ${note}\n  // Your code here\n}`;
const starter = T();

module.exports = [
  {
    id: 'inorder-traversal', title: 'Binary Tree Inorder Traversal', d: 'E', topic: 'Trees', roles: ['SDE', 'Backend Developer'],
    desc: 'Return the inorder traversal (left, node, right) of a binary tree as an array of values.\n\nExample:\nInput: root = [1,null,2,3]\nOutput: [1,3,2]',
    fn: 'inorderTraversal', params: 'root', constraints: '0 ≤ n ≤ 100', starter: starter('inorderTraversal', 'root'),
    expr: (a) => `inorderTraversal(fromTree(${J(a)}))`,
    tests: [[[1, null, 2, 3]], [[]], [[1]], [[2, 1, 3]], [[4, 2, 6, 1, 3, 5, 7]], [[1, 2, null, 3]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Recursion', 'Visit the left subtree, record the node, then visit the right subtree.', 'O(n)', 'O(h)', `function inorderTraversal(root) {
  const out = [];
  const go = (n) => { if (!n) return; go(n.left); out.push(n.val); go(n.right); };
  go(root);
  return out;
}`, { note: 'h is the height of the tree: O(log n) for a balanced tree, O(n) for a chain.' }),
      A('Iterative with a stack', 'Walk left as far as possible pushing nodes, then pop, record, and move to the right child. Same order without recursion.', 'O(n)', 'O(h)', `function inorderTraversal(root) {
  const out = [], st = [];
  let cur = root;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.left; }
    cur = st.pop();
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}`),
      A('Morris traversal', 'Temporarily link each node\'s inorder predecessor back to it, so the tree can be walked with no stack. The links are removed again.', 'O(n)', 'O(1)', `function inorderTraversal(root) {
  const out = [];
  let cur = root;
  while (cur) {
    if (!cur.left) { out.push(cur.val); cur = cur.right; }
    else {
      let p = cur.left;
      while (p.right && p.right !== cur) p = p.right;
      if (!p.right) { p.right = cur; cur = cur.left; }
      else { p.right = null; out.push(cur.val); cur = cur.right; }
    }
  }
  return out;
}`)
    ]
  },
  {
    id: 'max-depth-tree', title: 'Maximum Depth of Binary Tree', d: 'E', topic: 'Trees', roles: ['SDE', 'Backend Developer'],
    desc: 'Return the maximum depth of a binary tree: the number of nodes along the longest path from the root down to a leaf.\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: 3',
    fn: 'maxDepth', params: 'root', constraints: '0 ≤ n ≤ 10^4', starter: starter('maxDepth', 'root'),
    expr: (a) => `maxDepth(fromTree(${J(a)}))`,
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1, null, 2]], [[]], [[1]], [[1, 2, 3, 4, null, null, 5]], [[1, 2, null, 3, null, 4]]],
    gen: (r) => [randTree(r, 10)],
    approaches: [
      A('Recursion', 'The depth is 1 plus the larger depth of the two subtrees.', 'O(n)', 'O(h)', `function maxDepth(root) {
  return root ? 1 + Math.max(maxDepth(root.left), maxDepth(root.right)) : 0;
}`),
      A('Breadth-first by level', 'Process the tree one level at a time with a queue and count the levels.', 'O(n)', 'O(n)', `function maxDepth(root) {
  if (!root) return 0;
  let q = [root], d = 0;
  while (q.length) { const next = []; for (const n of q) { if (n.left) next.push(n.left); if (n.right) next.push(n.right); } q = next; d++; }
  return d;
}`),
      A('Depth-first with an explicit stack', 'Push (node, depth) pairs onto a stack and keep the largest depth seen.', 'O(n)', 'O(h)', `function maxDepth(root) {
  if (!root) return 0;
  const st = [[root, 1]];
  let best = 0;
  while (st.length) {
    const [n, d] = st.pop();
    best = Math.max(best, d);
    if (n.left) st.push([n.left, d + 1]);
    if (n.right) st.push([n.right, d + 1]);
  }
  return best;
}`)
    ]
  },
  {
    id: 'same-tree', title: 'Same Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Return true if two binary trees have the same structure and the same node values.\n\nExample:\nInput: p = [1,2,3], q = [1,2,3]\nOutput: true',
    fn: 'isSameTree', params: 'p, q', constraints: '0 ≤ n ≤ 100', starter: starter('isSameTree', 'p, q'),
    expr: (a, b) => `isSameTree(fromTree(${J(a)}), fromTree(${J(b)}))`,
    tests: [[[1, 2, 3], [1, 2, 3]], [[1, 2], [1, null, 2]], [[1, 2, 1], [1, 1, 2]], [[], []], [[1], []], [[1, 2, 3, 4], [1, 2, 3, 4]]],
    gen: (r) => { const a = randTree(r, 6); return [a, r.next() < 0.5 ? a : randTree(r, 6)]; },
    approaches: [
      A('Compare serialisations', 'Turn each tree into a level-order array with nulls and compare the arrays.', 'O(n)', 'O(n)', `function isSameTree(p, q) {
  const ser = (t) => { const out = [], qu = [t]; while (qu.length) { const n = qu.shift(); if (n) { out.push(n.val); qu.push(n.left, n.right); } else out.push(null); } return JSON.stringify(out); };
  return ser(p) === ser(q);
}`),
      A('Recursion', 'Two trees are the same if their roots match and both pairs of subtrees are the same.', 'O(n)', 'O(h)', `function isSameTree(p, q) {
  if (!p || !q) return p === q;
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`),
      A('Iterative with a stack', 'Compare pairs of nodes popped from a stack, pushing the matching child pairs.', 'O(n)', 'O(h)', `function isSameTree(p, q) {
  const st = [[p, q]];
  while (st.length) {
    const [a, b] = st.pop();
    if (!a && !b) continue;
    if (!a || !b || a.val !== b.val) return false;
    st.push([a.left, b.left], [a.right, b.right]);
  }
  return true;
}`)
    ]
  },
  {
    id: 'symmetric-tree', title: 'Symmetric Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Return true if a binary tree is a mirror image of itself (symmetric around its centre).\n\nExample:\nInput: root = [1,2,2,3,4,4,3]\nOutput: true',
    fn: 'isSymmetric', params: 'root', constraints: '1 ≤ n ≤ 1000', starter: starter('isSymmetric', 'root'),
    expr: (a) => `isSymmetric(fromTree(${J(a)}))`,
    tests: [[[1, 2, 2, 3, 4, 4, 3]], [[1, 2, 2, null, 3, null, 3]], [[1]], [[1, 2, 3]], [[1, 2, 2, 2, null, 2]], [[2, 3, 3, 4, 5, 5, 4, null, null, 8, 9, null, null, 9, 8]]],
    gen: (r) => [randTree(r, 7)],
    approaches: [
      A('Invert then compare', 'Mirror a copy of the tree and check it equals the original.', 'O(n)', 'O(n)', `function isSymmetric(root) {
  const mirror = (n) => (n ? new TreeNode(n.val, mirror(n.right), mirror(n.left)) : null);
  const same = (a, b) => (!a || !b ? a === b : a.val === b.val && same(a.left, b.left) && same(a.right, b.right));
  return same(root, mirror(root));
}`),
      A('Recursive mirror check', 'Two subtrees are mirrors if their roots match, the left of one mirrors the right of the other, and vice versa.', 'O(n)', 'O(h)', `function isSymmetric(root) {
  const m = (a, b) => (!a || !b ? a === b : a.val === b.val && m(a.left, b.right) && m(a.right, b.left));
  return !root || m(root.left, root.right);
}`),
      A('Iterative with a queue', 'Enqueue mirror pairs of nodes and compare them two at a time.', 'O(n)', 'O(n)', `function isSymmetric(root) {
  if (!root) return true;
  const q = [root.left, root.right];
  while (q.length) {
    const a = q.shift(), b = q.shift();
    if (!a && !b) continue;
    if (!a || !b || a.val !== b.val) return false;
    q.push(a.left, b.right, a.right, b.left);
  }
  return true;
}`)
    ]
  },
  {
    id: 'invert-binary-tree', title: 'Invert Binary Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Invert a binary tree: swap the left and right child of every node. Return the root.\n\nExample:\nInput: root = [4,2,7,1,3,6,9]\nOutput: [4,7,2,9,6,3,1]',
    fn: 'invertTree', params: 'root', constraints: '0 ≤ n ≤ 100', starter: starter('invertTree', 'root'),
    expr: (a) => `toTree(invertTree(fromTree(${J(a)})))`,
    tests: [[[4, 2, 7, 1, 3, 6, 9]], [[2, 1, 3]], [[]], [[1]], [[1, 2]], [[1, null, 2]], [[1, 2, 3, 4, 5]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Recursion', 'Swap the children of the current node, then invert both subtrees.', 'O(n)', 'O(h)', `function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}`),
      A('Breadth-first with a queue', 'Process nodes level by level and swap each node\'s children.', 'O(n)', 'O(n)', `function invertTree(root) {
  const q = root ? [root] : [];
  while (q.length) {
    const n = q.shift();
    [n.left, n.right] = [n.right, n.left];
    if (n.left) q.push(n.left);
    if (n.right) q.push(n.right);
  }
  return root;
}`),
      A('Depth-first with a stack', 'Same swapping, but with an explicit stack in place of the call stack.', 'O(n)', 'O(h)', `function invertTree(root) {
  const st = root ? [root] : [];
  while (st.length) {
    const n = st.pop();
    [n.left, n.right] = [n.right, n.left];
    if (n.left) st.push(n.left);
    if (n.right) st.push(n.right);
  }
  return root;
}`)
    ]
  },
  {
    id: 'path-sum', title: 'Path Sum', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Return true if the tree has a root-to-leaf path whose node values add up to targetSum.\n\nExample:\nInput: root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22\nOutput: true',
    fn: 'hasPathSum', params: 'root, targetSum', constraints: '0 ≤ n ≤ 5000', starter: starter('hasPathSum', 'root, targetSum'),
    expr: (a, t) => `hasPathSum(fromTree(${J(a)}), ${t})`,
    tests: [[[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], 22], [[1, 2, 3], 5], [[], 0], [[1, 2], 1], [[1], 1], [[1, 2, 3], 4], [[-2, null, -3], -5]],
    gen: (r) => [randTree(r, 8), r.int(0, 20)],
    approaches: [
      A('List every path sum', 'Collect the sum of every root-to-leaf path, then check whether the target is among them.', 'O(n)', 'O(n)', `function hasPathSum(root, targetSum) {
  const sums = [];
  const go = (n, s) => { if (!n) return; s += n.val; if (!n.left && !n.right) sums.push(s); go(n.left, s); go(n.right, s); };
  go(root, 0);
  return sums.includes(targetSum);
}`),
      A('Recursion with a shrinking target', 'Subtract the node value from the target while going down. At a leaf the remaining target must be zero.', 'O(n)', 'O(h)', `function hasPathSum(root, targetSum) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === targetSum;
  return hasPathSum(root.left, targetSum - root.val) || hasPathSum(root.right, targetSum - root.val);
}`),
      A('Iterative DFS', 'Keep (node, remaining) pairs on a stack and stop when a leaf has remaining equal to its value.', 'O(n)', 'O(h)', `function hasPathSum(root, targetSum) {
  if (!root) return false;
  const st = [[root, targetSum]];
  while (st.length) {
    const [n, t] = st.pop();
    if (!n.left && !n.right && n.val === t) return true;
    if (n.left) st.push([n.left, t - n.val]);
    if (n.right) st.push([n.right, t - n.val]);
  }
  return false;
}`)
    ]
  },
  {
    id: 'min-depth-tree', title: 'Minimum Depth of Binary Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Return the minimum depth of a binary tree: the number of nodes on the shortest path from the root down to a leaf (a node with no children).\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: 2',
    fn: 'minDepth', params: 'root', constraints: '0 ≤ n ≤ 10^5', starter: starter('minDepth', 'root'),
    expr: (a) => `minDepth(fromTree(${J(a)}))`,
    tests: [[[3, 9, 20, null, null, 15, 7]], [[2, null, 3, null, 4, null, 5, null, 6]], [[]], [[1]], [[1, 2]], [[1, 2, 3, 4, 5]], [[1, null, 2]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Recursion (full traversal)', 'If a node has only one child, the depth must follow that child. Otherwise take the smaller subtree depth plus one.', 'O(n)', 'O(h)', `function minDepth(root) {
  if (!root) return 0;
  if (!root.left) return 1 + minDepth(root.right);
  if (!root.right) return 1 + minDepth(root.left);
  return 1 + Math.min(minDepth(root.left), minDepth(root.right));
}`),
      A('Breadth-first search', 'Go level by level and stop at the first leaf. On unbalanced trees this can finish long before visiting every node.', 'O(n)', 'O(n)', `function minDepth(root) {
  if (!root) return 0;
  let q = [root], d = 1;
  while (q.length) {
    const next = [];
    for (const n of q) {
      if (!n.left && !n.right) return d;
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    q = next; d++;
  }
}`, { note: 'Worst case still O(n), but the early exit usually helps.' })
    ]
  },
  {
    id: 'balanced-binary-tree', title: 'Balanced Binary Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'A tree is height-balanced if, for every node, the heights of its two subtrees differ by at most one. Return true if the tree is height-balanced.\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: true',
    fn: 'isBalanced', params: 'root', constraints: '0 ≤ n ≤ 5000', starter: starter('isBalanced', 'root'),
    expr: (a) => `isBalanced(fromTree(${J(a)}))`,
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1, 2, 2, 3, 3, null, null, 4, 4]], [[]], [[1]], [[1, 2, null, 3]], [[1, 2, 3, 4, 5, 6, 7]], [[1, null, 2, null, 3]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Top-down height checks', 'At each node compute both subtree heights from scratch and compare them. Heights are recomputed many times.', 'O(n²)', 'O(h)', `function isBalanced(root) {
  const h = (n) => (n ? 1 + Math.max(h(n.left), h(n.right)) : 0);
  if (!root) return true;
  return Math.abs(h(root.left) - h(root.right)) <= 1 && isBalanced(root.left) && isBalanced(root.right);
}`, { note: 'On a chain-shaped tree each node recomputes the height of everything below it.' }),
      A('Bottom-up with early exit', 'Return the height, or -1 as soon as any subtree is unbalanced. Each node is visited once.', 'O(n)', 'O(h)', `function isBalanced(root) {
  const go = (n) => {
    if (!n) return 0;
    const l = go(n.left); if (l < 0) return -1;
    const r = go(n.right); if (r < 0) return -1;
    return Math.abs(l - r) > 1 ? -1 : 1 + Math.max(l, r);
  };
  return go(root) >= 0;
}`)
    ]
  },
  {
    id: 'sorted-array-to-bst', title: 'Convert Sorted Array to Binary Search Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Convert a sorted array into a height-balanced binary search tree. Several trees are valid, so the tests check that the inorder traversal equals the input and that the tree is balanced.\n\nExample:\nInput: nums = [-10,-3,0,5,9]\nOutput: a balanced BST holding those values',
    fn: 'sortedArrayToBST', params: 'nums', constraints: '1 ≤ n ≤ 10^4, strictly increasing',
    starter: `function sortedArrayToBST(nums) {\n  // TreeNode { val, left, right } is predefined. Return the root.\n  // Your code here\n}`,
    expr: (a) => `(() => { const t = sortedArrayToBST(${J(a)}); const ino = (n) => (n ? [...ino(n.left), n.val, ...ino(n.right)] : []); const h = (n) => (n ? 1 + Math.max(h(n.left), h(n.right)) : 0); const bal = (n) => !n || (Math.abs(h(n.left) - h(n.right)) <= 1 && bal(n.left) && bal(n.right)); return [ino(t), bal(t)]; })()`,
    tests: [[[-10, -3, 0, 5, 9]], [[1, 3]], [[1]], [[1, 2, 3, 4, 5, 6, 7]], [[0, 1, 2, 3]], [[5, 10, 15, 20, 25, 30]]],
    gen: (r) => [r.uniq(r.int(1, 10), -10, 20).sort((a, b) => a - b)],
    approaches: [
      A('Recursion with array slicing', 'Use the middle element as the root and recurse on slices of the array for the left and right subtrees. Correct, but slicing copies the array at every level.', 'O(n log n)', 'O(n)', `function sortedArrayToBST(nums) {
  if (!nums.length) return null;
  const m = nums.length >> 1;
  return new TreeNode(nums[m], sortedArrayToBST(nums.slice(0, m)), sortedArrayToBST(nums.slice(m + 1)));
}`, { note: 'Copying the halves at every level costs O(n log n) in total; passing index ranges avoids it.' }),
      A('Recursion on index ranges', 'Use the middle element as the root and recurse on the left and right ranges using indices instead of slicing.', 'O(n)', 'O(log n)', `function sortedArrayToBST(nums) {
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const m = (lo + hi) >> 1;
    return new TreeNode(nums[m], build(lo, m - 1), build(m + 1, hi));
  };
  return build(0, nums.length - 1);
}`)
    ]
  },
  {
    id: 'diameter-of-binary-tree', title: 'Diameter of Binary Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'The diameter of a binary tree is the number of edges on the longest path between any two nodes. The path may or may not pass through the root. Return the diameter.\n\nExample:\nInput: root = [1,2,3,4,5]\nOutput: 3',
    fn: 'diameterOfBinaryTree', params: 'root', constraints: '1 ≤ n ≤ 10^4', starter: starter('diameterOfBinaryTree', 'root'),
    expr: (a) => `diameterOfBinaryTree(fromTree(${J(a)}))`,
    tests: [[[1, 2, 3, 4, 5]], [[1, 2]], [[1]], [[1, 2, 3, 4, null, null, 5, 6, null, null, 7]], [[1, null, 2, null, 3]], [[]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Height at every node', 'For every node the longest path through it is the left height plus the right height. Recompute heights at each node.', 'O(n²)', 'O(h)', `function diameterOfBinaryTree(root) {
  const h = (n) => (n ? 1 + Math.max(h(n.left), h(n.right)) : 0);
  const go = (n) => (n ? Math.max(h(n.left) + h(n.right), go(n.left), go(n.right)) : 0);
  return go(root);
}`),
      A('Single pass returning heights', 'Compute each height once on the way up and update a running best diameter on the same pass.', 'O(n)', 'O(h)', `function diameterOfBinaryTree(root) {
  let best = 0;
  const h = (n) => {
    if (!n) return 0;
    const l = h(n.left), r = h(n.right);
    best = Math.max(best, l + r);
    return 1 + Math.max(l, r);
  };
  h(root);
  return best;
}`)
    ]
  },
  {
    id: 'preorder-traversal', title: 'Binary Tree Preorder Traversal', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Return the preorder traversal (node, left, right) of a binary tree.\n\nExample:\nInput: root = [1,null,2,3]\nOutput: [1,2,3]',
    fn: 'preorderTraversal', params: 'root', constraints: '0 ≤ n ≤ 100', starter: starter('preorderTraversal', 'root'),
    expr: (a) => `preorderTraversal(fromTree(${J(a)}))`,
    tests: [[[1, null, 2, 3]], [[]], [[1]], [[1, 2, 3]], [[4, 2, 6, 1, 3, 5, 7]], [[1, 2, null, 3]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Recursion', 'Record the node first, then traverse the left and right subtrees.', 'O(n)', 'O(h)', `function preorderTraversal(root) {
  const out = [];
  const go = (n) => { if (!n) return; out.push(n.val); go(n.left); go(n.right); };
  go(root);
  return out;
}`),
      A('Iterative with a stack', 'Pop a node, record it, then push the right child before the left so the left is processed first.', 'O(n)', 'O(h)', `function preorderTraversal(root) {
  const out = [], st = root ? [root] : [];
  while (st.length) {
    const n = st.pop();
    out.push(n.val);
    if (n.right) st.push(n.right);
    if (n.left) st.push(n.left);
  }
  return out;
}`)
    ]
  },
  {
    id: 'postorder-traversal', title: 'Binary Tree Postorder Traversal', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Return the postorder traversal (left, right, node) of a binary tree.\n\nExample:\nInput: root = [1,null,2,3]\nOutput: [3,2,1]',
    fn: 'postorderTraversal', params: 'root', constraints: '0 ≤ n ≤ 100', starter: starter('postorderTraversal', 'root'),
    expr: (a) => `postorderTraversal(fromTree(${J(a)}))`,
    tests: [[[1, null, 2, 3]], [[]], [[1]], [[1, 2, 3]], [[4, 2, 6, 1, 3, 5, 7]], [[1, 2, null, 3]]],
    gen: (r) => [randTree(r, 9)],
    approaches: [
      A('Recursion', 'Traverse the left subtree, the right subtree, then record the node.', 'O(n)', 'O(h)', `function postorderTraversal(root) {
  const out = [];
  const go = (n) => { if (!n) return; go(n.left); go(n.right); out.push(n.val); };
  go(root);
  return out;
}`),
      A('Reverse a modified preorder', 'Do node, right, left with a stack, then reverse the result. That produces left, right, node.', 'O(n)', 'O(n)', `function postorderTraversal(root) {
  const out = [], st = root ? [root] : [];
  while (st.length) {
    const n = st.pop();
    out.push(n.val);
    if (n.left) st.push(n.left);
    if (n.right) st.push(n.right);
  }
  return out.reverse();
}`)
    ]
  },
  {
    id: 'search-in-bst', title: 'Search in a Binary Search Tree', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Given a binary search tree and a value, return the subtree rooted at the node with that value (as a level-order array), or an empty array if no node has it.\n\nExample:\nInput: root = [4,2,7,1,3], val = 2\nOutput: [2,1,3]',
    fn: 'searchBST', params: 'root, val', constraints: '1 ≤ n ≤ 5000', starter: starter('searchBST', 'root, val'),
    expr: (a, v) => `toTree(searchBST(fromTree(${J(a)}), ${v}))`,
    tests: [[[4, 2, 7, 1, 3], 2], [[4, 2, 7, 1, 3], 5], [[4], 4], [[4, 2, 7, 1, 3], 7], [[], 1], [[5, 3, 8, 2, 4, 7, 9], 8]],
    gen: (r) => [randBst(r, 8), r.int(0, 30)],
    approaches: [
      A('Search the whole tree', 'Ignore the BST rule and traverse every node looking for the value.', 'O(n)', 'O(h)', `function searchBST(root, val) {
  if (!root) return null;
  if (root.val === val) return root;
  return searchBST(root.left, val) || searchBST(root.right, val);
}`),
      A('Recursive BST search', 'Go left if val is smaller than the node, right if it is larger. Half the tree is discarded each step on a balanced tree.', 'O(h)', 'O(h)', `function searchBST(root, val) {
  if (!root || root.val === val) return root;
  return val < root.val ? searchBST(root.left, val) : searchBST(root.right, val);
}`),
      A('Iterative BST search', 'Same walk as a loop, using constant extra space.', 'O(h)', 'O(1)', `function searchBST(root, val) {
  while (root && root.val !== val) root = val < root.val ? root.left : root.right;
  return root;
}`)
    ]
  },
  {
    id: 'range-sum-bst', title: 'Range Sum of BST', d: 'E', topic: 'Trees', roles: ['SDE'],
    desc: 'Given a binary search tree and two values low and high, return the sum of the values of all nodes with low ≤ value ≤ high.\n\nExample:\nInput: root = [10,5,15,3,7,null,18], low = 7, high = 15\nOutput: 32',
    fn: 'rangeSumBST', params: 'root, low, high', constraints: '1 ≤ n ≤ 2·10^4', starter: starter('rangeSumBST', 'root, low, high'),
    expr: (a, l, h) => `rangeSumBST(fromTree(${J(a)}), ${l}, ${h})`,
    tests: [[[10, 5, 15, 3, 7, null, 18], 7, 15], [[10, 5, 15, 3, 7, 13, 18, 1, null, 6], 6, 10], [[10], 1, 5], [[10], 10, 10], [[], 0, 5], [[5, 3, 8, 2, 4, 7, 9], 3, 8]],
    gen: (r) => { const lo = r.int(0, 20); return [randBst(r, 8), lo, lo + r.int(0, 12)]; },
    approaches: [
      A('Visit every node', 'Traverse the whole tree and add values that fall inside the range.', 'O(n)', 'O(h)', `function rangeSumBST(root, low, high) {
  if (!root) return 0;
  return (root.val >= low && root.val <= high ? root.val : 0) + rangeSumBST(root.left, low, high) + rangeSumBST(root.right, low, high);
}`),
      A('Prune using the BST property', 'If a node is smaller than low, nothing in its left subtree can count; if larger than high, nothing in its right subtree can. Skip those subtrees.', 'O(n)', 'O(h)', `function rangeSumBST(root, low, high) {
  if (!root) return 0;
  if (root.val < low) return rangeSumBST(root.right, low, high);
  if (root.val > high) return rangeSumBST(root.left, low, high);
  return root.val + rangeSumBST(root.left, low, high) + rangeSumBST(root.right, low, high);
}`, { note: 'Worst case is still O(n) when the range covers the whole tree, but narrow ranges visit far fewer nodes.' })
    ]
  },
  {
    id: 'binary-tree-paths', title: 'Binary Tree Paths', d: 'E', topic: 'Trees', roles: ['SDE'], out: 'sort',
    desc: 'Return all root-to-leaf paths of a binary tree as strings like "1->2->5". The order of the paths does not matter (tests compare them sorted).\n\nExample:\nInput: root = [1,2,3,null,5]\nOutput: ["1->2->5","1->3"]',
    fn: 'binaryTreePaths', params: 'root', constraints: '1 ≤ n ≤ 100', starter: starter('binaryTreePaths', 'root'),
    expr: (a) => `binaryTreePaths(fromTree(${J(a)}))`,
    tests: [[[1, 2, 3, null, 5]], [[1]], [[1, 2]], [[1, 2, 3, 4, 5, 6, 7]], [[1, null, 2, null, 3]], [[5, 4, 8, 11, null, 13, 4]]],
    gen: (r) => [randTree(r, 8).length ? randTree(r, 8) : [1]],
    approaches: [
      A('Recursion with a path string', 'Pass the path so far down the tree; at each leaf record it.', 'O(n)', 'O(h)', `function binaryTreePaths(root) {
  const out = [];
  const go = (n, path) => {
    if (!n) return;
    path += (path ? '->' : '') + n.val;
    if (!n.left && !n.right) out.push(path);
    go(n.left, path); go(n.right, path);
  };
  go(root, '');
  return out;
}`),
      A('Backtracking with an array', 'Keep one shared array for the current path: push on entry, pop on exit. Join it only at leaves.', 'O(n)', 'O(h)', `function binaryTreePaths(root) {
  const out = [], path = [];
  const go = (n) => {
    if (!n) return;
    path.push(n.val);
    if (!n.left && !n.right) out.push(path.join('->'));
    go(n.left); go(n.right);
    path.pop();
  };
  go(root);
  return out;
}`),
      A('Iterative DFS', 'Push (node, path string) pairs on a stack.', 'O(n)', 'O(h)', `function binaryTreePaths(root) {
  if (!root) return [];
  const out = [], st = [[root, String(root.val)]];
  while (st.length) {
    const [n, p] = st.pop();
    if (!n.left && !n.right) out.push(p);
    if (n.right) st.push([n.right, p + '->' + n.right.val]);
    if (n.left) st.push([n.left, p + '->' + n.left.val]);
  }
  return out;
}`)
    ]
  }
];
