import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

/** Fake speech synthesis that records every utterance and ends it immediately. */
const FAKE_TTS = `
  window.__spoken = [];
  const voices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US', voiceURI: 'david' },
    { name: 'Google UK English Female', lang: 'en-GB', voiceURI: 'google-uk' },
    { name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN', voiceURI: 'neerja' },
    { name: 'Microsoft Hindi Voice', lang: 'hi-IN', voiceURI: 'hindi' }
  ];
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  window.speechSynthesis = {
    getVoices: () => voices,
    cancel() {},
    speak(u) { window.__spoken.push({ text: u.text, rate: u.rate, voice: u.voice && u.voice.voiceURI }); if (u.onend) setTimeout(u.onend, 0); }
  };
`;

test('voice: pace targets are human speech rates', async () => {
  const app = await bootApp();
  assert.deepEqual({ ...app.run('MockInterview.WPM') }, { slow: 125, normal: 155, fast: 185 });
  assert.equal(app.run('MockInterview._rateKey()'), 'normal', 'default is a natural pace');
  app.window.localStorage.setItem('pp_iv_rate', 'fast');
  assert.equal(app.run('MockInterview._rateKey()'), 'fast');
  app.window.localStorage.setItem('pp_iv_rate', 'nonsense');
  assert.equal(app.run('MockInterview._rateKey()'), 'normal', 'bad saved value falls back to natural');
});

test('voice: plain desktop voices start much faster than online ones, and speeds are ordered', async () => {
  const app = await bootApp();
  app.run(FAKE_TTS);
  const r = app.run(`(() => {
    const M = MockInterview, v = M._englishVoices();
    const david = v.find(x => x.voiceURI === 'david'), neerja = v.find(x => x.voiceURI === 'neerja');
    return { davidNormal: M._rateFor(david, 'normal'), neerjaNormal: M._rateFor(neerja, 'normal'),
             slow: M._rateFor(david, 'slow'), fast: M._rateFor(david, 'fast') };
  })()`);
  assert.ok(r.davidNormal >= 1.4, 'built-in Windows voices need a high rate to reach human pace');
  assert.ok(r.neerjaNormal < 1.3, 'natural online voices are already near human pace');
  assert.ok(r.slow < r.davidNormal && r.davidNormal < r.fast);
});

test('voice: the rate is corrected from measured speech and remembered', async () => {
  const app = await bootApp();
  app.run(FAKE_TTS);
  const out = app.run(`(() => {
    const M = MockInterview;
    const david = M._englishVoices().find(x => x.voiceURI === 'david');
    const start = M._rateFor(david, 'normal');
    // 26 words took 12 s at the start rate: 130 words per minute, too slow for the 155 target.
    const faster = M._learn(david, start, 26, 12, 'normal');
    // 26 words took 8 s: 195 wpm, too fast.
    const slower = M._learn(david, faster, 26, 8, 'normal');
    return { start, faster, slower, tooShort: M._learn(david, start, 4, 1, 'normal'), stored: M._rateFor(david, 'normal') };
  })()`);
  assert.ok(out.faster > out.start, 'speeds up when Aria was slower than a person');
  assert.ok(out.slower < out.faster, 'slows down when Aria was faster than a person');
  assert.equal(out.tooShort, null, 'tiny samples are ignored');
  assert.equal(out.stored, Number(out.slower.toFixed(2)), 'the latest value is remembered');
});

test('voice: the best English voice is chosen, non-English voices are ignored', async () => {
  const app = await bootApp();
  app.run(FAKE_TTS);
  assert.equal(app.run('MockInterview._pickVoice().voiceURI'), 'neerja', 'a natural Indian English voice wins');
  assert.deepEqual([...app.run('MockInterview._englishVoices().map(v => v.voiceURI)')], ['neerja', 'google-uk', 'david']);
  app.window.localStorage.setItem('pp_iv_voice', 'google-uk');
  assert.equal(app.run('MockInterview._pickVoice().voiceURI'), 'google-uk', 'a saved choice is respected');
});

test('voice: setup page lists voices and speed, and Aria speaks with the matching rate in the room', async () => {
  const app = await bootApp();
  app.run(FAKE_TTS);
  await goTo(app, 'mockinterview');
  assert.equal(app.document.getElementById('ivSpeed').value, 'normal');
  assert.equal(app.document.querySelectorAll('#ivVoice option').length, 3);
  app.document.getElementById('ivSpeed').value = 'fast';
  app.document.getElementById('ivSpeed').dispatchEvent(new app.window.Event('change'));
  assert.equal(app.window.localStorage.getItem('pp_iv_rate'), 'fast');

  const fastRate = app.run(`MockInterview._rateFor(MockInterview._pickVoice(), 'fast')`);
  app.document.getElementById('ivVoiceTest').click();
  assert.equal(app.run('window.__spoken[0].rate'), fastRate, 'the sample uses the selected speed');

  app.document.getElementById('ivTotal').value = '5';
  app.document.getElementById('ivTypedOnly').click();
  await tick(150);
  const first = app.run('window.__spoken[window.__spoken.length - 1]');
  assert.equal(first.voice, 'neerja');
  assert.ok(first.rate > 1, 'faster than the voice default');

  // Changing speed in the room applies to the next thing Aria says.
  const slowRate = app.run(`MockInterview._rateFor(MockInterview._pickVoice(), 'slow')`);
  app.document.getElementById('ivSpeedRoom').value = 'slow';
  app.document.getElementById('ivSpeedRoom').dispatchEvent(new app.window.Event('change'));
  app.document.getElementById('ivRepeat').click();
  await tick(50);
  assert.equal(app.run('window.__spoken[window.__spoken.length - 1].rate'), slowRate);
  assert.ok(slowRate < fastRate);
  app.run('MockInterview.cleanup()');
});
