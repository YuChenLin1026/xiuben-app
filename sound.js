// 岫本 sound: gentle background music, small effects and recorded voice lines.
// Uses generated files in sounds/ and voice/ when present; otherwise plays a soft music-box lullaby made in the browser.
(function () {
  let ac = null, master = null, musicGain = null, timer = null, nextT = 0, step = 0, bgmSrc = null, musicOn = false;
  const buf = {}, loading = {};
  function ctx() {
    if (!ac) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iPhone: play even with the silent switch on
      ac = new A(); master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function load(k) {
    if (buf[k] || loading[k]) return loading[k] || Promise.resolve(buf[k]);
    if (!ctx()) return Promise.resolve(null);
    loading[k] = fetch(k + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => new Promise((ok, no) => ac.decodeAudioData(a, ok, no))).then(b => (buf[k] = b)).catch(() => (buf[k] = null));
    return loading[k];
  }
  function playBuf(b, vol, dest) { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(dest || master); s.start(); return s; }
  // one music-box note: sine + soft octave, quick attack, long fade
  function note(f, t, vol, dest) {
    [[1, 1], [2, .22], [3, .06]].forEach(([m, a]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + 2.4 / m);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 2.6);
    });
  }
  function pad(fs, t, dur, dest) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(dest);
    fs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (i - 1) * 4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + 1.2); g.gain.setValueAtTime(.05, t + dur - 1); g.gain.linearRampToValueAtTime(0, t + dur + .4);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + .5); });
  }
  // C – Am – F – G, 60 BPM, pentatonic melody
  const CH = [[130.81, 196, 261.63], [110, 164.81, 220], [87.31, 130.81, 174.61], [98, 146.83, 196]];
  const MEL = [[523.25, 0, 659.25, 783.99], [880, 0, 783.99, 659.25], [698.46, 0, 659.25, 523.25], [587.33, 659.25, 783.99, 0],
               [659.25, 0, 523.25, 587.33], [523.25, 0, 440, 0], [440, 523.25, 587.33, 0], [783.99, 0, 587.33, 0]];
  function sched() {
    while (nextT < ac.currentTime + .4) {
      const bar = Math.floor(step / 4) % 8, beat = step % 4;
      if (beat === 0) pad(CH[bar % 4], nextT, 4, musicGain);
      const f = MEL[bar][beat]; if (f) note(f, nextT, .07, musicGain);
      nextT += 1; step++;
    }
  }
  const XB = {
    unlock() { ctx(); },
    music(on, vol) {
      if (!ctx()) return; musicOn = on;
      if (!musicGain) { musicGain = ac.createGain(); musicGain.connect(master); }
      musicGain.gain.cancelScheduledValues(ac.currentTime);
      musicGain.gain.setTargetAtTime(on ? (vol || .8) : 0, ac.currentTime, .4);
      if (!on) { clearInterval(timer); timer = null; if (bgmSrc) { const s = bgmSrc; bgmSrc = null; setTimeout(() => { try { s.stop(); } catch (e) {} }, 1500); } return; }
      if (timer || bgmSrc) return;
      load('sounds/bgm').then(b => {
        if (!musicOn || timer || bgmSrc) return;
        if (b) { bgmSrc = ac.createBufferSource(); bgmSrc.buffer = b; bgmSrc.loop = true; bgmSrc.connect(musicGain); bgmSrc.start(); }
        else { nextT = ac.currentTime + .1; step = 0; sched(); timer = setInterval(sched, 150); }
      });
    },
    // small effects: star, pop, win, tap
    fx(kind) {
      if (!ctx()) return;
      load('sounds/' + kind).then(b => {
        if (b) return playBuf(b, .8);
        const t = ac.currentTime + .01, g = ac.createGain(); g.gain.value = 1; g.connect(master);
        if (kind === 'star') [1046.5, 1318.5, 1568, 2093].forEach((f, i) => note(f, t + i * .07, .09, g));
        else if (kind === 'win') [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => note(f, t + i * .12, .1, g));
        else if (kind === 'pop') note(392, t, .07, g);
        else note(1318.5, t, .04, g);
      });
    },
    // recorded voice lines in voice/
    say(k, vol) { if (!ctx()) return Promise.resolve(); return load('voice/' + k).then(b => { if (b) { if (XB._v) try { XB._v.stop(); } catch (e) {} XB._v = playBuf(b, vol || 1.4); } }); },
    preload(keys) { if (ctx()) keys.forEach(load); },
    get ctx() { return ac; }
  };
  window.XB = XB;
  // first touch anywhere wakes audio up (browsers need a tap before sound)
  addEventListener('pointerdown', () => ctx(), { once: true, capture: true });
})();
