import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';

const require = createRequire(import.meta.url);
const { loadScript } = require('../tools/coding-bank/load.cjs');
const SquadScore = loadScript('js/squad-score.js', 'SquadScore');
const SquadRoom = loadScript('js/squad-room.js', 'SquadRoom', { crypto: webcrypto, BroadcastChannel });

const solved = (atSec) => [{ passed: 5, total: 5, atSec }];

/* ------------------------------------------------------------------ scoring */

test('squad score: a solve earns base plus a time bonus that shrinks to nothing at the time limit', () => {
  const q = (attempts, difficulty = 'Medium') => SquadScore.questionPoints({ difficulty, attempts });
  assert.equal(q(solved(0)).points, 30, 'instant: 20 base + 10 bonus');
  assert.equal(q(solved(600)).points, 25, 'halfway through 20 minutes: half the bonus');
  assert.equal(q(solved(1200)).points, 20, 'at the limit: base only');
  assert.equal(q(solved(5000)).points, 20, 'after the limit it never goes below base');
  assert.equal(q(solved(0), 'Easy').points, 15);
  assert.equal(q(solved(0), 'Hard').points, 60);
  assert.deepEqual({ ...q(solved(0)).parts }, { base: 20, bonus: 10, penalty: 0 });
});

test('squad score: wrong submissions cost a little, partial work counts a little, nothing counts for no tests', () => {
  const q = (attempts, difficulty = 'Medium') => SquadScore.questionPoints({ difficulty, attempts });
  const wrongThenSolve = [{ passed: 1, total: 5, atSec: 30 }, { passed: 3, total: 5, atSec: 60 }, { passed: 5, total: 5, atSec: 1200 }];
  assert.equal(q(wrongThenSolve).points, 20 - 4, 'two wrong attempts: -2 each');
  const many = Array.from({ length: 30 }, () => ({ passed: 0, total: 5, atSec: 10 })).concat(solved(1200));
  assert.equal(q(many).points, 20 - 8, 'the penalty is capped at 40% of base');
  assert.equal(q([{ passed: 2, total: 5, atSec: 10 }, { passed: 4, total: 5, atSec: 20 }]).points, Math.round(20 * 0.3 * 0.8), 'best partial attempt');
  assert.equal(q([]).points, 0);
  assert.equal(q([{ passed: 0, total: 5, atSec: 5 }]).points, 0);
  assert.equal(q([{ passed: 4, total: 5, atSec: 5 }]).solved, false);
  assert.ok(q([{ passed: 4, total: 5, atSec: 5 }]).points < q(solved(5000)).points, 'partial is always worth less than a solve');
});

test('squad score: a scoreboard ranks players, ties share a rank, and the squad bonus needs everyone to solve', () => {
  const questions = [{ id: 'a', difficulty: 'Easy' }, { id: 'b', difficulty: 'Medium' }];
  const board = SquadScore.scoreboard({
    questions, players: ['p1', 'p2', 'p3'],
    attemptsBy: { p1: { a: solved(600), b: solved(1200) }, p2: { a: solved(600), b: solved(1200) }, p3: { a: solved(0) } }
  });
  // Easy: all three solved, so everyone gets +5; Medium: p3 did not, so no bonus there
  assert.deepEqual([...board.rows.map((r) => [r.player, r.points, r.rank])], [['p1', 35, 1], ['p2', 35, 1], ['p3', 20, 3]]);
  // nobody gets a squad bonus on b (p3 did not solve it)
  assert.equal(board.rows.find((r) => r.player === 'p1').perQuestion.b.squadBonus, 0);
  const all = SquadScore.scoreboard({ questions: [questions[0]], players: ['x', 'y'], attemptsBy: { x: { a: solved(0) }, y: { a: solved(600) } } });
  assert.deepEqual(all.rows.map((r) => r.perQuestion.a.squadBonus), [5, 5], 'everyone solved: +5 each');
  assert.deepEqual([...all.rows.map((r) => r.points)], [20, 15]);
  assert.equal(all.squadTotal, 35);
});

/* ------------------------------------------------------------------ room rules */

const lobby = () => SquadRoom.create({ code: 'ABC234', leaderId: 'L', name: 'Leader', lang: 'Python' });
const sample = [{ id: 'two-sum', title: 'Two Sum', difficulty: 'Easy' }, { id: 'fizzbuzz', title: 'FizzBuzz', difficulty: 'Easy' }];
const R = (s, ev) => SquadRoom.reduce(s, ev);

test('squad room: only the leader changes settings and starts; settings are validated', () => {
  let s = lobby();
  s = R(s, { type: 'join', from: 'A', name: 'Asha', lang: 'C++' });
  assert.equal(Object.keys(s.members).length, 2);
  assert.equal(R(s, { type: 'settings', from: 'A', settings: { difficulty: 'Hard' } }), s, 'a member cannot change settings');
  const set = R(s, { type: 'settings', from: 'L', settings: { difficulty: 'Hard', count: 5, topic: 'Arrays', limitScale: 2, mode: 'duel' } });
  assert.deepEqual({ ...set.settings }, { difficulty: 'Hard', count: 5, topic: 'Arrays', limitScale: 2, mode: 'duel' });
  const bad = R(s, { type: 'settings', from: 'L', settings: { difficulty: 'Impossible', count: 99, limitScale: 100, mode: 'x' } });
  assert.deepEqual({ ...bad.settings }, { ...SquadRoom.DEFAULTS }, 'bad values are ignored');
  assert.equal(R(s, { type: 'start', from: 'A', questions: sample }), s, 'a member cannot start');
  assert.equal(R(s, { type: 'start', from: 'L', questions: [] }), s, 'cannot start with no questions');
  assert.equal(R(s, { type: 'start', from: 'L', questions: sample }).phase, 'playing');
});

test('squad room: at most four players, no joining mid-round, each player picks their own language', () => {
  let s = lobby();
  for (const id of ['A', 'B', 'C']) s = R(s, { type: 'join', from: id, name: id });
  const full = R(s, { type: 'join', from: 'D', name: 'D' });
  assert.equal(Object.keys(full.members).length, 4, 'the room holds 4');
  assert.equal(full, R(full, { type: 'join', from: 'E', name: 'E' }), 'the fifth is refused');
  s = R(s, { type: 'lang', from: 'B', lang: 'Rust' });
  assert.equal(s.members.B.lang, 'Rust');
  assert.equal(s.members.A.lang, 'JavaScript');
  const playing = R(s, { type: 'start', from: 'L', questions: sample });
  assert.equal(R(playing, { type: 'join', from: 'Z', name: 'Z' }), playing, 'no joining once the round started');
});

test('squad room: submissions are validated, timed from when the player opened the question, and a solve is final', () => {
  let s = R(lobby(), { type: 'join', from: 'A', name: 'A' });
  s = R(s, { type: 'start', from: 'L', questions: sample, at: 1000 });
  const sub = (ev) => R(s, { type: 'submit', from: 'A', qid: 'two-sum', lang: 'C++', ...ev });
  assert.equal(sub({ passed: 6, total: 5 }), s, 'cannot pass more tests than exist');
  assert.equal(sub({ passed: -1, total: 5 }), s);
  assert.equal(sub({ passed: 1.5, total: 5 }), s);
  assert.equal(R(s, { type: 'submit', from: 'stranger', qid: 'two-sum', passed: 5, total: 5 }), s, 'only members');
  assert.equal(sub({ qid: 'not-in-round', passed: 5, total: 5 }), s);
  s = sub({ passed: 2, total: 5, at: 31000 });
  s = sub({ passed: 5, total: 5, at: 61000 });
  assert.deepEqual([...s.attempts.A['two-sum'].map((a) => [a.passed, a.atSec])], [[2, 30], [5, 60]]);
  const again = sub({ passed: 0, total: 5, at: 90000 });
  assert.equal(again, s, 'after a solve, later runs change nothing');
  const opened = R(s, { type: 'open', from: 'A', qid: 'fizzbuzz', at: 100000 });
  const second = R(opened, { type: 'submit', from: 'A', qid: 'fizzbuzz', passed: 5, total: 5, at: 130000 });
  assert.equal(second.attempts.A.fizzbuzz[0].atSec, 30, 'the clock started when this player opened that question');
});

test('squad room: chat is cleaned and capped, only members chat; finish and rematch are the leader\'s', () => {
  let s = R(lobby(), { type: 'join', from: 'A', name: 'A' });
  assert.equal(R(s, { type: 'chat', from: 'outsider', text: 'hi' }), s);
  assert.equal(R(s, { type: 'chat', from: 'A', text: '   ' }), s);
  s = R(s, { type: 'chat', from: 'A', text: 'hello\u0007 there' });
  assert.equal(s.chat[0].text, 'hello  there');
  for (let i = 0; i < 250; i++) s = R(s, { type: 'chat', from: 'A', text: 'm' + i });
  assert.equal(s.chat.length, 200);
  s = R(s, { type: 'start', from: 'L', questions: sample });
  assert.equal(R(s, { type: 'finish', from: 'A' }), s);
  const done = R(s, { type: 'finish', from: 'L' });
  assert.equal(done.phase, 'done');
  assert.equal(R(done, { type: 'rematch', from: 'A' }), done);
  const again = R(done, { type: 'rematch', from: 'L' });
  assert.deepEqual([again.phase, again.questions.length, Object.keys(again.members).length], ['lobby', 0, 2]);
});

/* ------------------------------------------------------------------ a room over a transport */

/** In-memory stand-in for a network: everyone on a code hears everyone else. */
function hub() {
  const rooms = new Map();
  return {
    connect(code, selfId, onMessage) {
      if (!rooms.has(code)) rooms.set(code, new Set());
      const me = { selfId, onMessage };
      rooms.get(code).add(me);
      return {
        send: (msg) => { for (const p of rooms.get(code)) if (p !== me) setTimeout(() => p.onMessage({ ...msg, from: selfId }), 0); },
        close: () => rooms.get(code).delete(me)
      };
    }
  };
}
const tickMs = (n = 20) => new Promise((r) => setTimeout(r, n));

test('squad room: friends join with a code, see the same room, play a round and the leader closing ends it', async () => {
  const net = hub();
  const mk = (id, extra = {}) => new SquadRoom.Client({ transport: net, selfId: id, ...extra });
  const seen = [];
  const leader = mk('L', { onState: (s) => seen.push(s.phase) });
  const code = leader.host({ name: 'Leader', lang: 'Python' });
  assert.match(code, /^[A-Z2-9]{6}$/);

  let ended = '';
  const a = mk('A', { onEnded: (m) => { ended = m; } });
  const b = mk('B');
  const stateA = await a.join({ code, name: 'Asha', lang: 'C++' });
  await b.join({ code: code.toLowerCase(), name: 'Bo', lang: 'Rust' });
  await tickMs();
  assert.deepEqual(Object.keys(leader.state.members).sort(), ['A', 'B', 'L']);
  assert.deepEqual(Object.keys(stateA.members).includes('A'), true);
  assert.deepEqual(Object.keys(b.state.members).sort(), ['A', 'B', 'L'], 'everyone sees everyone');

  leader.act({ type: 'settings', settings: { difficulty: 'Easy', count: 2 } });
  leader.act({ type: 'start', questions: sample, at: 1000 });
  await tickMs();
  assert.equal(a.state.phase, 'playing');
  a.act({ type: 'submit', qid: 'two-sum', passed: 5, total: 5, lang: 'C++', at: 11000 });
  b.act({ type: 'submit', qid: 'two-sum', passed: 2, total: 5, lang: 'Rust', at: 21000 });
  a.act({ type: 'chat', text: 'solved it!' });
  await tickMs();
  assert.equal(leader.state.attempts.A['two-sum'][0].atSec, 10);
  assert.equal(b.state.chat.at(-1).text, 'solved it!');
  const board = SquadScore.scoreboard({ questions: leader.state.questions, players: Object.keys(leader.state.members), attemptsBy: leader.state.attempts });
  assert.equal(board.rows[0].player, 'A', 'the player who solved leads');

  b.act({ type: 'start', questions: sample }); // a member trying to take over
  b.act({ type: 'finish' });
  await tickMs();
  assert.equal(leader.state.phase, 'playing');

  leader.leave();
  await tickMs();
  assert.match(ended, /leader closed the room/i);
});

test('squad room: a wrong code is a clear error, not a hang', async () => {
  const net = hub();
  const c = new SquadRoom.Client({ transport: net, selfId: 'X' });
  await assert.rejects(c.join({ code: 'NOPE22', name: 'X', waitMs: 50 }), /Nobody answered for this code/);
});

test('squad room: tabs of one browser can form a squad (BroadcastChannel transport)', async () => {
  const leader = new SquadRoom.Client({ selfId: 'L' });
  const code = leader.host({ name: 'Leader' });
  const a = new SquadRoom.Client({ selfId: 'A' });
  const state = await a.join({ code, name: 'Asha', waitMs: 1000 });
  assert.equal(state.leaderId, 'L');
  assert.equal(Object.keys(state.members).length, 2);
  a.leave();
  leader.leave();
});
