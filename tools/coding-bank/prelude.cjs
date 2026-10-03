/* Helpers available to every coding problem, both at build time and in the browser sandbox.
   Linked-list, tree and graph problems build their inputs and read their outputs with these. */
module.exports = `
class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } }
class GraphNode { constructor(val = 0, neighbors = []) { this.val = val; this.neighbors = neighbors; } }
function fromList(a) { let h = null; for (let i = a.length - 1; i >= 0; i--) h = new ListNode(a[i], h); return h; }
function toList(h) { if (h === undefined) return undefined; const o = []; let guard = 0; while (h && guard++ < 10000) { o.push(h.val); h = h.next; } return o; }
function fromListCycle(a, pos) {
  const h = fromList(a); if (pos < 0 || !h) return h;
  let tail = h, target = h, i = 0;
  while (tail.next) tail = tail.next;
  while (i++ < pos) target = target.next;
  tail.next = target; return h;
}
function fromTree(a) {
  if (!a.length || a[0] === null) return null;
  const root = new TreeNode(a[0]); const q = [root]; let i = 1;
  while (q.length && i < a.length) {
    const n = q.shift();
    if (i < a.length && a[i] !== null) { n.left = new TreeNode(a[i]); q.push(n.left); } i++;
    if (i < a.length && a[i] !== null) { n.right = new TreeNode(a[i]); q.push(n.right); } i++;
  }
  return root;
}
function toTree(root) {
  if (root === undefined) return undefined;
  if (!root) return [];
  const out = []; const q = [root];
  while (q.length) { const n = q.shift(); if (n) { out.push(n.val); q.push(n.left, n.right); } else out.push(null); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
function fromGraph(adj) {
  if (!adj.length) return null;
  const nodes = adj.map((_, i) => new GraphNode(i + 1));
  adj.forEach((ns, i) => { nodes[i].neighbors = ns.map((j) => nodes[j - 1]); });
  return nodes[0];
}
function toGraph(node) {
  if (node === undefined) return undefined;
  if (!node) return [];
  const seen = new Map(); const q = [node]; seen.set(node, true);
  const byVal = new Map();
  while (q.length) { const n = q.shift(); byVal.set(n.val, n.neighbors.map((x) => x.val).sort((a, b) => a - b)); for (const x of n.neighbors) if (!seen.has(x)) { seen.set(x, true); q.push(x); } }
  const size = Math.max(...byVal.keys());
  return Array.from({ length: size }, (_, i) => byVal.get(i + 1) || []);
}
function isSameGraph(a, b) { return a !== b && JSON.stringify(toGraph(a)) === JSON.stringify(toGraph(b)); }
`;
