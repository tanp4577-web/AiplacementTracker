/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   GeminiLive — full-duplex Gemini Live WebSocket voice module
   ----------------------------------------------------------------------------
   The "no server audio" pipeline:
     POST /api/gemini-token   ->  ephemeral token (server mints it)
     WebSocket                 ->  browser connects DIRECTLY to Gemini Live:
       wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage
           .v1beta.GenerativeService.BidiGenerateContentConstrained
           ?access_token=auth_tokens/<id>

   Microphone audio flows straight from the tab to Gemini; the AI's voice flows
   straight back. The server only ever saw the one token-mint POST.

   This module handles:
     - the WebSocket handshake and the locked {setup} message
     - mic capture -> PCM16 @ 16 kHz -> realtimeInput media chunks (AudioWorklet)
     - playback of the model's PCM audio (resampled from 24 kHz to the
       device rate) through a second AudioWorklet node
     - server-side VAD transcriptions: inputAudioTranscription (the candidate)
       and outputAudioTranscription (the interviewer)
     - natural interruption / barge-in: {clientContent:{interrupt:true}} when
       the user speaks while the interviewer is talking
     - a ScriptProcessor fallback for browsers without AudioWorklet
   Exposes the GeminiLive class on window.
   ========================================================================== */

/* ---------------- AudioWorklet processor sources ----------------
   These functions are serialized with .toString() and registered inside the
   AudioWorklet global scope, so everything lives in this one file. They must
   not reference anything outside of the worklet scope at runtime.    */

function _micProcessorSource() {
  class Mic16kProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this._ratio = sampleRate / 16000; // downsample factor
      this._acc = 0;
      this._pcm = [];
      this._active = false;
      this.port.onmessage = (e) => {
        if (e.data === 'start') this._active = true;
        if (e.data === 'stop') this._active = false;
      };
    }
    _b64(bytes) {
      // Int8Array -> base64 (btoa is not guaranteed in the worklet scope)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let out = '';
      for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i] & 0xff;
        const b1 = i + 1 < bytes.length ? bytes[i + 1] & 0xff : 0;
        const b2 = i + 2 < bytes.length ? bytes[i + 2] & 0xff : 0;
        out += chars[b0 >> 2];
        out += chars[((b0 & 3) << 4) | (b1 >> 4)];
        out += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
        out += i + 2 < bytes.length ? chars[b2 & 63] : '=';
      }
      return out;
    }
    process(inputs) {
      if (!this._active) return true;
      const ch = inputs[0] && inputs[0][0];
      if (!ch) return true;
      for (let i = 0; i < ch.length; i++) {
        this._acc += 1;
        if (this._acc >= this._ratio) {
          this._acc -= this._ratio;
          const s = Math.max(-1, Math.min(1, ch[i]));
          this._pcm.push(s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0);
        }
      }
      // Flush ~100 ms chunks (1600 samples @ 16 kHz).
      while (this._pcm.length >= 1600) {
        const chunk = this._pcm.splice(0, 1600);
        const bytes = new Int8Array(chunk.length * 2);
        for (let i = 0; i < chunk.length; i++) {
          const s = chunk[i];
          bytes[i * 2] = s & 0xff;
          bytes[i * 2 + 1] = (s >> 8) & 0xff;
        }
        this.port.postMessage({ type: 'chunk', data: this._b64(bytes) });
      }
      return true;
    }
  }
  return Mic16kProcessor;
}

function _playerProcessorSource() {
  class Pcm16kPlayer extends AudioWorkletProcessor {
    constructor() {
      super();
      this._queue = [];   // { arr: Float32Array, rate: number }
      this._pos = 0;      // read position inside the current chunk
      this.port.onmessage = (e) => {
        const d = e.data;
        if (d && d.type === 'audio') {
          const arr = new Float32Array(d.pcm);
          if (!arr.length) return;
          this._queue.push({ arr, rate: d.rate || 24000 });
        } else if (d && d.type === 'clear') {
          this._queue.length = 0;
          this._pos = 0;
        }
      };
    }
    process(outputs) {
      const out = outputs[0] && outputs[0][0];
      if (!out) return true;
      let write = 0;
      let chunk = this._queue[0];
      while (write < out.length) {
        if (!chunk) {
          while (write < out.length) out[write++] = 0; // pad silence
          break;
        }
        const step = chunk.rate / sampleRate;
        while (write < out.length && this._pos < chunk.arr.length) {
          out[write++] = chunk.arr[Math.floor(this._pos)];
          this._pos += step;
        }
        if (this._pos >= chunk.arr.length) {
          this._queue.shift();
          this._pos = 0;
          chunk = this._queue[0];
        }
      }
      return true;
    }
  }
  return Pcm16kPlayer;
}

/* -------------------------------------------------------------------------- */

class GeminiLive {
  /**
   * opts: {
   *   model, systemInstruction, voiceName, temperature,
   *   onState, onUserTranscript, onUserUtterance,
   *   onModelTurnStart, onModelText, onModelTurn,
   *   onModelInterrupted, onError
   * }
   */
  constructor(opts) {
    opts = opts || {};
    this.model = opts.model || 'gemini-3.8-live';
    this.systemInstruction = opts.systemInstruction || '';
    this.voiceName = opts.voiceName || 'Puck';
    this.temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.7;
    this.onState = opts.onState || function(){};
    this.onUserTranscript = opts.onUserTranscript || function(){};
    this.onUserUtterance = opts.onUserUtterance || function(){};
    this.onModelTurnStart = opts.onModelTurnStart || function(){};
    this.onModelText = opts.onModelText || function(){};
    this.onModelTurn = opts.onModelTurn || function(){};
    this.onModelInterrupted = opts.onModelInterrupted || function(){};
    this.onError = opts.onError || function(){};
    this.ws = null; this.ctx = null; this.gumStream = null;
    this.micNode = null; this.playerPort = null;
    this._fp = null; this._fq = null; this._fpPos = 0;
    this._aiText = ''; this._setupDone = false; this._stateName = 'idle';
  }

  static supported() {
    return typeof window !== 'undefined' && typeof WebSocket === 'function'
      && !!(window.AudioContext || window.webkitAudioContext)
      && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  _emit(s) { this._stateName = s; try { this.onState(s); } catch(e){} }

  /* ----- lifecycle: token -> audio -> WS -> setupComplete ----- */

  async start() {
    this._emit('connecting');
    // 1. Ephemeral token from our server (API key never leaves the server).
    var tokenData = null;
    try {
      var res = await fetch('/api/gemini-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, systemInstruction: this.systemInstruction,
          voiceName: this.voiceName, temperature: this.temperature })
      });
      tokenData = await res.json().catch(function(){ return {}; });
      if (!res.ok || !tokenData || !tokenData.ok || !tokenData.url)
        throw new Error((tokenData && tokenData.error) || 'Live AI token request failed');
      // The token was minted with the server's resolved model — make the setup
      // message always match it (supports GEMINI_LIVE_MODEL env overrides).
      if (tokenData && tokenData.model) this.model = tokenData.model;
    } catch (e) { this.onError((e&&e.message)||'Could not start the live AI connection.', true); throw e; }
    // 2. Audio in/out (getUserMedia + AudioWorklet/ScriptProcessor).
    try { await this._initAudio(); }
    catch (e) { this.onError('Microphone access failed: '+((e&&e.message)||'denied'), true);
      try { this._teardownAudio(); } catch(x){} throw e; }
    // 3. Full-duplex WebSocket straight to Gemini.
    var self = this;
    return new Promise(function(resolve, reject) {
      var settled = false;
      var timer = setTimeout(function(){ if(!settled){ settled=true;
        self.onError('Live AI setup timed out.',true); self._shutdown();
        reject(new Error('timeout')); } }, 30000);
      var ws = new WebSocket(tokenData.url); self.ws = ws;
      ws.onopen = function(){ self._sendSetup(); };
      ws.onmessage = async function(ev) {
        var msg = null;
        try { msg = typeof ev.data==='string'?JSON.parse(ev.data):JSON.parse(await ev.data.text()); }
        catch(x){ return; }
        self._handleMsg(msg);
        if (msg && msg.setupComplete && !settled) {
          settled = true; clearTimeout(timer); self._setupDone = true;
          self._emit('listening'); resolve(self); }
      };
      ws.onerror = function(){ if(!settled){ settled=true; clearTimeout(timer);
        self.onError('Live AI connection error.',true); self._shutdown();
        reject(new Error('ws error')); } else { self.onError('Live AI connection error.',false); } };
      ws.onclose = function(){ clearTimeout(timer);
        if(!settled){ settled=true; self.onError('Live AI closed before setup.',true);
          reject(new Error('ws closed')); return; }
        self._emit('closed'); self._teardownAudio(); };
    });
  }

  _sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ setup: {
      model: this.model,
      generationConfig: { responseModalities: ['AUDIO'], temperature: this.temperature,
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: this.systemInstruction }] }
    }}));
  }

  _beginMic() { if (this.micNode && this.micNode.port)
    try { this.micNode.port.postMessage('start'); } catch(e){} }

  /* ----- server messages ----- */

  _handleMsg(msg) {
    if (!msg) return;
    if (msg.error) { this.onError((msg.error.message)||'Gemini Live error', false); return; }
    if (msg.goAway) { if(this.ws) try{this.ws.close();}catch(e){} return; }
    if (msg.setupComplete) { try{this._beginMic();}catch(e){} return; }
    // Model speech / interruption.
    var sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) {
        this._aiText = ''; this._clearPlayback();
        this.onModelInterrupted(); this._emit('listening');
      }
      if (sc.modelTurn && sc.modelTurn.parts) {
        var parts = sc.modelTurn.parts;
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].text) { this._aiText += parts[i].text; this.onModelText(this._aiText); }
          if (parts[i].inlineData && parts[i].inlineData.data) this._enqueueAudio(parts[i].inlineData);
        }
        this._emit('talking'); this.onModelTurnStart();
      }
      // output_transcription lives inside serverContent in some API versions.
      var scot = sc.outputTranscription || (sc.outputTranscripts && sc.outputTranscripts[0]);
      if (scot && scot.text) {
        var scText = (String(scot.text)).replace(/^\s+/, '').trim();
        if (scText) { this._aiText = scText; this.onModelText(scText); }
      }
      if (sc.turnComplete) {
        var full = (this._aiText||'').trim(); this._aiText = '';
        if (full) this.onModelTurn(full);
        this._emit('listening');
      }
    }
    // Candidate speech, transcribed server-side (server VAD).
    // The wire shape varies across API versions:
    //   { inputAudioTranscription: { transcription: { text, partial } } }
    //   { inputAudioTranscription: { text, partial } }
    if (msg.inputAudioTranscription) {
      var wrap = msg.inputAudioTranscription;
      var tt = wrap.transcription || wrap;
      var t = (tt && tt.text) || '';
      var partial = tt ? (tt.partial !== false) : true;
      if (t) { if (partial) this.onUserTranscript(t); else this.onUserUtterance(t); }
    }
    // Interviewer speech, transcribed server-side.
    var otWrap = msg.outputAudioTranscription;
    if (otWrap) {
      var otText = (otWrap.text || (otWrap.transcription && otWrap.transcription.text) || '').trim();
      if (otText) { this._aiText = otText; this.onModelText(otText); }
    }
  }

  /* ----- audio output (playback) ----- */

  _enqueueAudio(inline) {
    if (!this.playerPort && !this._fp) return;
    var m = /rate=(\d+)/.exec(inline.mimeType || '');
    var rate = m ? parseInt(m[1],10) : 24000;
    var bin = '';
    try { bin = atob(inline.data); } catch(e) { return; }
    var n = Math.floor(bin.length / 2);
    if (!n) return;
    var f = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = (bin.charCodeAt(i*2) & 0xff) | ((bin.charCodeAt(i*2+1) & 0xff) << 8);
      f[i] = (s << 16 >> 16) / 32768;
    }
    if (this.playerPort) {
      try { this.playerPort.postMessage({type:'audio',pcm:f.buffer,rate:rate},[f.buffer]); }
      catch(e){}
    } else if (this._fp && this._fq) {
      this._fq.push({arr:f, rate:rate});
    }
  }

  _clearPlayback() {
    if (this.playerPort) try { this.playerPort.postMessage({type:'clear'}); } catch(e){}
    if (this._fq) this._fq.length = 0;
  }

  /* ----- audio input (mic capture) ----- */

  async _initAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.gumStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true }
    });
    var src = this.ctx.createMediaStreamSource(this.gumStream);
    var self = this;
    // Try AudioWorklet first; fall back to ScriptProcessor.
    var workletOk = false;
    var micCode = '(function(){var M=('+_micProcessorSource.toString()+')();registerProcessor("clm",M);})()';
    var playerCode = '(function(){var P=('+_playerProcessorSource.toString()+')();registerProcessor("clp",P);})()';
    var blobUrl = URL.createObjectURL(new Blob([micCode+';'+playerCode],{type:'text/javascript'}));
    try { await this.ctx.audioWorklet.addModule(blobUrl); workletOk = true; } catch(e) { workletOk = false; }

    if (workletOk) {
      var micNode = new AudioWorkletNode(this.ctx,'clm');
      micNode.port.onmessage = function(e) {
        var d = e.data;
        if (d && d.type==='chunk') self._sendMicChunk(d.data);
      };
      var zero = this.ctx.createGain(); zero.gain.value = 0;
      src.connect(micNode); micNode.connect(zero); zero.connect(this.ctx.destination);
      this.micNode = micNode;
      var playerNode = new AudioWorkletNode(this.ctx,'clp');
      this.playerPort = playerNode.port;
      playerNode.connect(this.ctx.destination);
    } else {
      // ScriptProcessor fallback for capture.
      var spIn = this.ctx.createScriptProcessor(4096,1,1);
      var ratio = this.ctx.sampleRate / 16000;
      var acc = 0, pcmAcc = [];
      spIn.onaudioprocess = function(e) {
        var ch = e.inputBuffer.getChannelData(0);
        for (var i=0;i<ch.length;i++){ acc+=1; if(acc>=ratio){acc-=ratio;
          var s=Math.max(-1,Math.min(1,ch[i])); pcmAcc.push(s<0?(s*0x8000)|0:(s*0x7fff)|0); }}
        while(pcmAcc.length>=1600){ var chunk=pcmAcc.splice(0,1600);
          var bytes=new Int8Array(chunk.length*2);
          for(var i=0;i<chunk.length;i++){var v=chunk[i];bytes[i*2]=v&0xff;bytes[i*2+1]=(v>>8)&0xff;}
          var b='';for(var i=0;i<bytes.length;i++) b+=String.fromCharCode(bytes[i]);
          self._sendMicChunk(btoa(b)); }
      };
      src.connect(spIn); spIn.connect(this.ctx.destination);
      this.micNode = spIn;
      // ScriptProcessor playback fallback.
      this._fq = []; var spOut = this.ctx.createScriptProcessor(4096,0,1);
      var fq = this._fq, fpPos = 0;
      this._fp = { fq:fq, spOut:spOut };
      spOut.onaudioprocess = function(e) {
        var out=e.outputBuffer.getChannelData(0); var wi=0;
        while(wi<out.length){ var chunk=fq[0]; if(!chunk){out[wi++]=0;continue;}
          var step=chunk.rate/self.ctx.sampleRate;
          while(wi<out.length&&fpPos<chunk.arr.length){out[wi++]=chunk.arr[Math.floor(fpPos)];fpPos+=step;}
          if(fpPos>=chunk.arr.length){fq.shift();fpPos=0;} }
      };
      spOut.connect(this.ctx.destination);
    }
    setTimeout(function(){try{self._beginMic();}catch(e){}},0);
  }

  _sendMicChunk(base64) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this._setupDone) return;
    try {
      this.ws.send(JSON.stringify({realtimeInput:{mediaChunks:[{mimeType:'audio/pcm;rate=16000',data:base64}]}}));
    } catch(e){}
  }

  /** Force-interrupt: drop the current model turn at once. */
  interrupt() {
    this._clearPlayback();
    if (this.ws && this.ws.readyState===WebSocket.OPEN)
      try{this.ws.send(JSON.stringify({clientContent:{interrupt:true}}));}catch(e){}
  }

  /** Send a text message into the conversation. */
  sendText(text, turnComplete) {
    if (!this.ws || this.ws.readyState!==WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({clientContent:{
      turns:[{role:'user',parts:[{text:String(text)}]}],
      turnComplete: turnComplete !== false
    }}));
  }

  stop() { this._shutdown(); }

  _shutdown() {
    if (this.ws) {
      try{this.ws.onmessage=null;this.ws.onerror=null;this.ws.onclose=null;}catch(e){}
      try{this.ws.close();}catch(e){}
      this.ws = null;
    }
    this._teardownAudio();
  }

  _teardownAudio() {
    try {
      if (this.micNode) try{this.micNode.port&&this.micNode.port.postMessage('stop');}catch(e){}
      if (this.gumStream) {this.gumStream.getTracks().forEach(function(t){t.stop();});this.gumStream=null;}
      if (this.ctx&&this.ctx.state!=='closed') try{this.ctx.close();}catch(e){}
    } catch(e){}
    this.ctx=null; this.micNode=null; this.playerPort=null;
    this._fp=null; this._fq=null;
  }
}

if (typeof window!=='undefined') window.GeminiLive = GeminiLive;