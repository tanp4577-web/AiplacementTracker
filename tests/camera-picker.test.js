import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

/** Fake browser media layer: a phone camera is the browser default, the laptop camera is also present. */
const FAKE_MEDIA = `
  window.isSecureContext = true;
  window.__calls = [];
  window.__stopped = [];
  const devices = [
    { kind: 'videoinput', deviceId: 'phone1', label: 'Pixel 7 (Phone Link Camera)' },
    { kind: 'videoinput', deviceId: 'laptop1', label: 'Integrated Webcam' },
    { kind: 'audioinput', deviceId: 'mic-phone', label: 'Phone microphone' },
    { kind: 'audioinput', deviceId: 'mic-laptop', label: 'Laptop array microphone' }
  ];
  const idOf = (c) => (c && c.deviceId && c.deviceId.exact) || null;
  navigator.mediaDevices = {
    getUserMedia: async (c) => {
      window.__calls.push(JSON.parse(JSON.stringify(c)));
      const cam = idOf(c.video) || 'phone1';
      const mic = idOf(c.audio) || 'mic-phone';
      const track = (id) => ({ getSettings: () => ({ deviceId: id }), stop() { window.__stopped.push(id); } });
      const v = track(cam), a = track(mic);
      return { getVideoTracks: () => [v], getAudioTracks: () => [a], getTracks: () => [v, a] };
    },
    enumerateDevices: async () => devices
  };
`;

test('camera picker: a phone-like default camera is swapped for the laptop camera, and the picker lists both', async () => {
  const app = await bootApp();
  app.run(FAKE_MEDIA);
  await goTo(app, 'mockinterview');
  assert.equal(app.document.getElementById('ivEnable').disabled, false);
  assert.equal(app.document.getElementById('ivPickers').hidden, true, 'pickers stay hidden until permission is granted');

  app.document.getElementById('ivEnable').click();
  await tick(150);

  const calls = app.run('window.__calls');
  assert.equal(calls.length, 2, 'opened once with the default, then again with the laptop camera');
  assert.equal(calls[0].video.deviceId, undefined);
  assert.equal(calls[1].video.deviceId.exact, 'laptop1');
  assert.deepEqual([...app.run('window.__stopped')], ['phone1', 'mic-phone'], 'the phone stream was released');

  assert.equal(app.document.getElementById('ivPickers').hidden, false);
  assert.equal(app.document.getElementById('ivCam').value, 'laptop1');
  assert.deepEqual([...app.document.querySelectorAll('#ivCam option')].map((o) => o.textContent), ['Pixel 7 (Phone Link Camera)', 'Integrated Webcam']);
  assert.equal(app.document.getElementById('ivStart').disabled, false);
  assert.deepEqual(app.errors, []);
});

test('camera picker: choosing another device restarts the stream with it and remembers the choice', async () => {
  const app = await bootApp();
  app.run(FAKE_MEDIA);
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);

  const mic = app.document.getElementById('ivMic');
  mic.value = 'mic-laptop';
  mic.dispatchEvent(new app.window.Event('change'));
  await tick(100);
  const last = app.run('window.__calls[window.__calls.length - 1]');
  assert.equal(last.video.deviceId.exact, 'laptop1');
  assert.equal(last.audio.deviceId.exact, 'mic-laptop');
  assert.equal(app.window.localStorage.getItem('pp_iv_cam'), 'laptop1');
  assert.equal(app.window.localStorage.getItem('pp_iv_mic'), 'mic-laptop');

  // A later visit starts with the remembered devices straight away: no phone camera, no extra restart.
  await goTo(app, 'dashboard');
  app.run('window.__calls.length = 0');
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);
  const again = app.run('window.__calls');
  assert.equal(again.length, 1);
  assert.equal(again[0].video.deviceId.exact, 'laptop1');
  assert.equal(again[0].audio.deviceId.exact, 'mic-laptop');
  app.run('MockInterview.cleanup()');
});

test('camera picker: if a remembered camera has been unplugged it falls back to the browser default', async () => {
  const app = await bootApp();
  app.run(FAKE_MEDIA + `
    const real = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (c) => {
      if (c.video && c.video.deviceId && c.video.deviceId.exact === 'gone') { const e = new Error('x'); e.name = 'OverconstrainedError'; throw e; }
      return real(c);
    };`);
  app.window.localStorage.setItem('pp_iv_cam', 'gone');
  await goTo(app, 'mockinterview');
  app.document.getElementById('ivEnable').click();
  await tick(150);
  assert.equal(app.document.getElementById('ivStart').disabled, false, 'still gets a working camera');
  app.run('MockInterview.cleanup()');
});
