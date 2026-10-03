import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

const text = (el, n = 4000) => (el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/** Two browser windows that can hear each other (what BroadcastChannel does between tabs). */
function link(...apps) {
  const peers = [];
  for (const app of apps) {
    app.run(`window.__send = null; SquadRoom.LocalTransport.connect = function (code, selfId, onMessage) {
      window.__peer = { code, selfId, onMessage };
      return { send: (msg) => window.__hub(code, selfId, msg), close: () => { window.__peer = null; } };
    };`);
    peers.push(app);
    app.window.__hub = (code, from, msg) => {
      for (const other of peers) {
        if (other === app) continue;
        const p = other.window.__peer;
        if (p && p.code === code) setTimeout(() => p.onMessage({ ...msg, from }), 0);
      }
    };
  }
}

const click = (app, id) => app.document.getElementById(id).click();
const pick = async (app, id, value) => { const el = app.document.getElementById(id); el.value = value; el.dispatchEvent(new app.window.Event('change')); await tick(40); };

test('squad page: the home screen is honest that friends and random matching need an online service', async () => {
  const app = await bootApp();
  await goTo(app, 'squad');
  assert.ok(app.document.getElementById('sqCreateBtn'));
  assert.ok(app.document.getElementById('sqJoinBtn'));
  assert.match(text(app.document.getElementById('sqFriends')), /need accounts that work across computers/);
  assert.match(text(app.document.getElementById('sqRandom')), /not available yet/);
  assert.equal(app.document.querySelector('#sqRandom button').disabled, true, 'no fake "find a squad" button');
  assert.equal(app.document.querySelector('.nav-link[data-view="squad"]').textContent.trim(), 'Squad Practice');
  assert.deepEqual(app.errors, []);
});

test('squad page: a bad code is refused clearly and an unknown code times out with an explanation', async () => {
  const app = await bootApp();
  await goTo(app, 'squad');
  app.document.getElementById('sqCode').value = 'abc';
  click(app, 'sqJoinBtn');
  assert.match(text(app.document.getElementById('sqJoinMsg')), /6-character code/);
  app.run('SquadRoom.Client.prototype.join = function () { return Promise.reject(new Error("Nobody answered for this code. Check the code, and that the leader still has the room open.")); }');
  app.document.getElementById('sqCode').value = 'ABCDEF';
  click(app, 'sqJoinBtn');
  await tick(80);
  assert.match(text(app.document.getElementById('sqJoinMsg')), /Nobody answered/);
});

test('squad page: leader and friend form a squad, play a round, chat, and see the same scoreboard', async () => {
  const leader = await bootApp();
  const friend = await bootApp();
  link(leader, friend);
  for (const a of [leader, friend]) {
    await goTo(a, 'squad');
    // every test run "passes": the judge is covered by the coding tests, here we test the squad flow
    a.run(`Coding._runOne = async () => ({ kind: 'ok', pass: true, stdout: '', stderr: '', message: '', ms: 5 })`);
  }
  leader.document.getElementById('sqName').value = 'Lena';
  click(leader, 'sqCreateBtn');
  await tick(120);
  const code = text(leader.document.getElementById('sqCodeShow'));
  assert.match(code, /^[A-Z2-9]{6}$/);

  friend.document.getElementById('sqCode').value = code.toLowerCase();
  click(friend, 'sqJoinBtn');
  await tick(300);
  assert.match(text(leader.document.getElementById('sqMembers')), /Lena.*Leader/);
  assert.match(text(leader.document.getElementById('sqMembers')), /Guest/, 'the friend appears in the leader\'s lobby');
  assert.ok(friend.document.getElementById('sqMembers'), 'and the friend sees the lobby');
  assert.equal(friend.document.getElementById('sqDiff').disabled, true, 'only the leader can change settings');
  assert.equal(friend.document.getElementById('sqStart'), null, 'only the leader can start');

  await pick(leader, 'sqDiff', 'Easy');
  await pick(leader, 'sqCount', '2');
  await tick(80);
  assert.equal(friend.document.getElementById('sqDiff').value, 'Easy', 'settings reach the friend');

  friend.document.getElementById('sqChatInput').value = 'ready!';
  friend.document.getElementById('sqChatForm').dispatchEvent(new friend.window.Event('submit', { cancelable: true }));
  await tick(80);
  assert.match(text(leader.document.getElementById('sqChatLog')), /ready!/);

  click(leader, 'sqStart');
  await tick(900);
  assert.ok(leader.document.getElementById('sqCode') && friend.document.getElementById('sqCode'), 'both are in the round');
  assert.equal(leader.document.querySelectorAll('[data-sq-q]').length, 2);
  const q1 = leader.run('Squad.client.state.questions[0].id');
  assert.equal(friend.run('Squad.client.state.questions[0].id'), q1, 'the same questions for everyone');

  click(friend, 'sqRun');
  await tick(500);
  assert.match(text(friend.document.getElementById('sqResult')), /All tests passed/);
  await tick(100);
  const board = text(leader.document.querySelector('.sq-board'));
  assert.match(board, /1\/2 solved/, 'the leader sees the friend\'s solve on the scoreboard');
  assert.match(board, /(15|[1-9]\d) pts/);
  assert.match(friend.document.querySelector('[data-sq-q="0"]').className, /solved/);
  assert.equal(friend.document.getElementById('sqRun').disabled, true, 'a solved question cannot be re-run for more points');

  // the friend cannot end the round; the leader can
  assert.equal(friend.document.getElementById('sqFinish'), null);
  click(leader, 'sqFinish');
  await tick(150);
  assert.match(text(leader.document.getElementById('viewContainer')), /Round finished/);
  assert.match(text(friend.document.getElementById('viewContainer')), /Squad total/);
  assert.ok(leader.document.getElementById('sqRematch'));
  assert.equal(friend.document.getElementById('sqRematch'), null);
  click(leader, 'sqRematch');
  await tick(150);
  assert.ok(friend.document.getElementById('sqMembers'), 'a rematch returns everyone to the lobby');

  click(leader, 'sqLeave');
  await tick(150);
  assert.ok(friend.document.getElementById('sqCreateBtn'), 'when the leader closes the room the friend is sent home');
  leader.run('Squad.cleanup()');
  friend.run('Squad.cleanup()');
  assert.deepEqual(leader.errors, []);
  assert.deepEqual(friend.errors, []);
});
