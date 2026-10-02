import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

/** Fake media layer. `plan` says what each request does: 'ok', or an error name such as 'NotReadableError'. */
const media = (plan) => `
  window.isSecureContext = true;
  window.__calls = [];
  const plan = ${JSON.stringify(plan)};
  const fail = (name) => { const e = new Error(name); e.name = name; return e; };
  const track = (id) => ({ getSettings: () => ({ deviceId: id }), stop() {} });
  const streamOf = (cam, mic) => {
    const v = cam ? [track(cam)] : [], a = mic ? [track(mic)] : [];
    return { getVideoTracks: () => v, getAudioTracks: () => a, getTracks: () => [...v, ...a] };
  };
  navigator.mediaDevices = {
    getUserMedia: async (c) => {
      const both = Boolean(c.video && c.audio);
      window.__calls.push(both ? 'both' : c.video ? 'video' : 'audio');
      if (both) { if (plan.both !== 'ok') throw fail(plan.both); return streamOf('cam1', 'mic1'); }
      if (c.video) { if (plan.video !== 'ok') throw fail(plan.video); return streamOf('cam1', null); }
      if (plan.audio !== 'ok') throw fail(plan.audio);
      return streamOf(null, 'mic1');
    },
    enumerateDevices: async () => [
      { kind: 'videoinput', deviceId: 'cam1', label: 'Integrated Webcam', groupId: 'g-cam' },
      { kind: 'audioinput', deviceId: 'default', label: 'Default - Bluetooth Headset', groupId: 'g-bt' },
      { kind: 'audioinput', deviceId: 'mic1', label: 'Laptop array microphone', groupId: 'g-laptop' },
      { kind: 'audioinput', deviceId: 'mic-bt', label: 'Bluetooth Headset', groupId: 'g-bt' }
    ]
  };
`;
const BOTH_OK = { both: 'ok', video: 'ok', audio: 'ok' };

test('devices: camera busy but microphone fine: says so, keeps voice answers on, lets you start', async () => {
  const app = await bootApp();
  app.run(media({ both: 'NotReadableError', video: 'NotReadableError', audio: 'ok' }));
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);
  const msg = app.document.getElementById('ivDeviceMsg').textContent;
  assert.match(msg, /Camera: another app .* is using the camera/i);
  assert.match(msg, /microphone works/i);
  assert.doesNotMatch(msg, /Microphone:/);
  assert.deepEqual([...app.run('window.__calls')], ['both', 'video', 'audio']);
  assert.equal(app.document.getElementById('ivStart').disabled, false);
  assert.equal(app.run('MockInterview.state.typedMode'), false, 'voice answers still on');
  app.run('MockInterview.cleanup()');
});

test('devices: microphone blocked but camera fine: switches to typed answers and says why', async () => {
  const app = await bootApp();
  app.run(media({ both: 'NotAllowedError', video: 'ok', audio: 'NotAllowedError' }));
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);
  const msg = app.document.getElementById('ivDeviceMsg').textContent;
  assert.match(msg, /Microphone: microphone permission is blocked/i);
  assert.match(msg, /type your answers/i);
  assert.equal(app.run('MockInterview.state.typedMode'), true);
  assert.equal(app.document.getElementById('ivStart').disabled, false);
  app.run('MockInterview.cleanup()');
});

test('devices: nothing works: start stays locked and both reasons are shown', async () => {
  const app = await bootApp();
  app.run(media({ both: 'NotFoundError', video: 'NotFoundError', audio: 'NotAllowedError' }));
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);
  const msg = app.document.getElementById('ivDeviceMsg').textContent;
  assert.match(msg, /Camera: no camera was found/i);
  assert.match(msg, /Microphone: microphone permission is blocked/i);
  assert.equal(app.document.getElementById('ivStart').disabled, true);
});

test('devices: warns when the chosen microphone is not the system default that voice recognition uses', async () => {
  const app = await bootApp();
  app.run(media(BOTH_OK));
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);
  const mic = app.document.getElementById('ivMic');
  mic.value = 'mic1';
  mic.dispatchEvent(new app.window.Event('change'));
  await tick(150);
  const hint = app.document.getElementById('ivMicHint');
  assert.equal(hint.hidden, false);
  assert.match(hint.textContent, /system default microphone \(Default - Bluetooth Headset\)/);
  mic.value = 'mic-bt';
  mic.dispatchEvent(new app.window.Event('change'));
  await tick(150);
  assert.equal(app.document.getElementById('ivMicHint').hidden, true, 'no warning when it matches the default');
  app.run('MockInterview.cleanup()');
});

/** Fake speech recogniser that fails with the given error as soon as it starts. */
const recognizer = (error) => `
  window.SpeechRecognition = function () { this.start = () => { setTimeout(() => this.onerror && this.onerror({ error: ${JSON.stringify(error)} }), 5); }; this.abort = () => {}; };
  MockInterview._say = function (t) { document.getElementById('ivQuestion').textContent = t; this._listen(); };
`;

async function startVoiceSession(app, error) {
  app.run(media(BOTH_OK));
  await goTo(app, 'mockinterview');
  app.run(recognizer(error));
  app.document.getElementById('ivEnable').click();
  await tick(150);
  app.document.getElementById('ivTotal').value = '5';
  app.document.getElementById('ivStart').click();
  await tick(250);
}

test('speech: an offline / blocked speech service switches to typing and explains why', async () => {
  const app = await bootApp();
  await startVoiceSession(app, 'network');
  const alert = app.document.getElementById('ivAlert');
  assert.equal(alert.hidden, false);
  assert.match(alert.textContent, /online service/i);
  assert.equal(app.document.getElementById('ivTyped').hidden, false, 'typing box is open');
  assert.equal(app.run('MockInterview.state.typedMode'), true);
  assert.equal(app.document.getElementById('ivTypedToggle').textContent, 'Use voice instead');
  app.run('MockInterview.cleanup()');
});

test('speech: an unusable microphone for the speech engine explains what to close and switches to typing', async () => {
  const app = await bootApp();
  await startVoiceSession(app, 'audio-capture');
  assert.match(app.document.getElementById('ivAlert').textContent, /Zoom, Teams, Phone Link/);
  assert.equal(app.document.getElementById('ivTyped').hidden, false);
  app.run('MockInterview.cleanup()');
});

test('speech: repeated silence tells the candidate nobody can be heard, without leaving voice mode', async () => {
  const app = await bootApp();
  app.run(media(BOTH_OK));
  await goTo(app, 'mockinterview');
  app.run(`
    window.SpeechRecognition = function () { this.start = () => {}; this.abort = () => {}; window.__rec = this; };
    MockInterview._say = function (t) { document.getElementById('ivQuestion').textContent = t; this._listen(); };
  `);
  app.document.getElementById('ivEnable').click();
  await tick(150);
  app.document.getElementById('ivTotal').value = '5';
  app.document.getElementById('ivStart').click();
  await tick(250);
  for (let i = 0; i < 3; i++) app.run('window.__rec.onerror({ error: "no-speech" })');
  assert.match(app.document.getElementById('ivAlert').textContent, /cannot hear you/i);
  assert.equal(app.run('MockInterview.state.typedMode'), false, 'stays in voice mode');
  assert.equal(app.document.getElementById('ivTyped').hidden, true);
  app.run('MockInterview.cleanup()');
});
