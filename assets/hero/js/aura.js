/* Music light ("Pulse core"): a soft glow behind the music island, like a TV backlight.
   It shows while I am listening (the island says so) and while a visitor hears music, takes its colours from the
   cover, and throbs gently at the song's tempo.
   A page cannot hear the sound inside YouTube or Spotify players, so the beat is simulated at the song's tempo
   (128 BPM until the island sends one). Motion is kept safe: no flashing, brightness changes slowly.
   The island announces playback with the "zi:playback" event; this file never touches the island itself. */
(function () {
  "use strict";
  var bgEl = document.getElementById("bg");
  if (!bgEl) return;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var S = { playing: false, energy: 0 };

  /* ---------- Simulated spectrum: smooth noise per band plus a soft beat ---------- */
  var BANDS = 32, bands = new Float32Array(BANDS), seeds = [];
  for (var q = 0; q < BANDS; q++) { seeds.push({ p1: Math.random() * 10, p2: Math.random() * 10, s1: 1.6 + Math.random() * 2.4, s2: 3.5 + Math.random() * 4 }); bands[q] = 0.5; }
  var BEAT = 60 / 128, beatPh = 0, beatT = 0, lastT = 0;
  function setBpm(bpm) {
    /* Tempo detection often reports half or double speed; fold into 80 to 160 so the light never crawls or races. */
    var v = +bpm; if (!(v > 0)) v = 128;
    while (v > 160) v /= 2; while (v < 80) v *= 2;
    BEAT = 60 / v;
  }
  function spectrum(t, dt) {
    beatT += Math.max(0, t - lastT); lastT = t;
    var ph = (beatT % BEAT) / BEAT; beatPh = ph;
    var pulse = Math.exp(-ph * 5.5), off = Math.exp(-Math.abs(ph - 0.5) * 14);
    for (var i = 0; i < BANDS; i++) {
      var f = i / (BANDS - 1), sd = seeds[i];
      var n = 0.55 + 0.25 * Math.sin(t * sd.s1 + sd.p1) + 0.2 * Math.sin(t * sd.s2 + sd.p2);
      var v = 0.3 + 0.7 * Math.max(0, Math.min(1, n * (1 - f * 0.4) * 0.6 + pulse * (1 - f) * 0.75 + off * f * 0.3));   /* never goes dark */
      bands[i] += (v - bands[i]) * Math.min(1, dt * (v > bands[i] ? 16 : 5));                                              /* fast rise, slow fall */
    }
  }

  /* ---------- Colours: kept as HSL so a new cover glides in, never jumps ---------- */
  function hexToHsl(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; }
    return [h, s * 100, l * 100];
  }
  function parseColor(v) {
    if (typeof v !== "string") return null;
    if (/^#[0-9a-f]{6}$/i.test(v)) return hexToHsl(v);
    var m = v.match(/hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i);
    return m ? [parseFloat(m[1]) % 360, parseFloat(m[2]), parseFloat(m[3])] : null;
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return [f(0), f(8), f(4)];
  }
  function lerpHue(a, b, t) { var d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; }
  function paletteFrom(base) {
    var l = Math.max(52, Math.min(66, base[2]));
    return [[base[0], base[1], l], [(base[0] + 28) % 360, base[1], l], [(base[0] + 332) % 360, base[1], l]];
  }
  var target = paletteFrom(hexToHsl("#a855f7")), cur = target.map(function (x) { return x.slice(); });

  /* ---------- Canvas: drawn at a third of the size and blurred, which keeps it soft and cheap ---------- */
  var glc = document.createElement("canvas");
  glc.className = "aura";
  glc.setAttribute("aria-hidden", "true");
  glc.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;filter:blur(6px);display:none";
  bgEl.parentNode.insertBefore(glc, bgEl.nextSibling);
  var gl = null;
  try { gl = glc.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }); } catch (e) { gl = null; }
  var ctx2d = gl ? null : glc.getContext("2d");
  var SCALE = 0.35, W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    glc.width = Math.max(1, Math.round(W * SCALE)); glc.height = Math.max(1, Math.round(H * SCALE));
    if (gl) gl.viewport(0, 0, glc.width, glc.height);
  }
  window.addEventListener("resize", resize);
  resize();

  /* Follow the island's centre smoothly, including when its panel opens. */
  var islX = W / 2, islAt = 0, islTo = null;
  function islandX(now) {
    if (now - islAt < 120) return;
    islAt = now;
    var b = document.querySelector(".zi .zi-body"), r = b && b.getBoundingClientRect();
    islTo = r && r.width ? r.left + r.width / 2 : W / 2;
  }

  var G = null;
  function initGL() {
    var vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fs = [
      "precision mediump float;",
      "uniform vec2 uRes;uniform float uT,uE,uIx,uHw,uBp;uniform vec3 uC1,uC2,uC3;uniform sampler2D uB;",
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
      "float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}",
      "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*1.9+vec2(17.,9.);a*=.5;}return v/.875;}",
      "vec3 pal(float k){k=fract(k);return k<.3333?mix(uC1,uC2,k*3.):(k<.6667?mix(uC2,uC3,(k-.3333)*3.):mix(uC3,uC1,(k-.6667)*3.));}",
      "float band(float sx){return texture2D(uB,vec2(clamp(sx*.5+.5+.06*sin(uT*.35),0.,1.)*.92+.04,.5)).r;}",
      "void main(){",
      " vec2 uv=gl_FragCoord.xy/uRes;float x=uv.x,y=1.-uv.y,asp=uRes.x/uRes.y;",
      " float sx=(x-uIx)/uHw,d=abs(sx),centre=exp(-d*d*1.9),b=band(sx);",
      " float kick=exp(-uBp*6.),hat=exp(-abs(uBp-.5)*16.);",
      " float sp=.38;vec2 q=vec2(x*asp*.8,y*1.2);",
      " vec2 w=vec2(fbm(q+vec2(0.,-uT*sp*.55)),fbm(q+vec2(5.2,-uT*sp*.45)));",
      " float nn=fbm(q+w*.8+vec2(uT*.04,-uT*sp));",
      " float reach=(.09+.17*b)*centre*(.88+.24*nn)*(1.+kick*.4+hat*.1);",
      " float a=exp(-y/max(reach*.34,.008))*smoothstep(0.,.15,centre);",
      " float core=exp(-y*10.)*(.35+.65*b)*centre*(1.+kick*.35);",
      " float al=clamp(pow(a,1.05)*1.15+core*.4,0.,1.)*uE;",
      " vec3 c=pal(nn*1.25+x*.55+uT*.025);c*=.55+.6*nn;c=mix(c,c*1.35,core*.5);",
      " gl_FragColor=vec4(c*al,al);",
      "}"
    ].join("\n");
    function sh(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var u = {}; ["uRes", "uT", "uE", "uIx", "uHw", "uBp", "uC1", "uC2", "uC3", "uB"].forEach(function (k) { u[k] = gl.getUniformLocation(pr, k); });
    gl.uniform1i(u.uB, 0);
    gl.clearColor(0, 0, 0, 0);
    return { u: u, data: new Uint8Array(16) };
  }
  function colours() { return cur.map(function (x) { return hslToRgb(x[0], Math.min(100, x[1] + 12), Math.max(38, Math.min(52, x[2] - 6))); }); }
  function drawGL(t) {
    if (!G) G = initGL();
    if (!G) return false;
    for (var i = 0; i < 16; i++) G.data[i] = Math.round(bands[i * 2] * 255);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 16, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, G.data);
    var c = colours();
    gl.uniform2f(G.u.uRes, glc.width, glc.height);
    gl.uniform1f(G.u.uT, t); gl.uniform1f(G.u.uE, S.energy); gl.uniform1f(G.u.uIx, islX / W);
    gl.uniform1f(G.u.uBp, beatPh);
    gl.uniform1f(G.u.uHw, W < 720 ? 0.32 : 0.17);   /* about a third of the width around the island; a bit wider on phones */
    gl.uniform3fv(G.u.uC1, c[0]); gl.uniform3fv(G.u.uC2, c[1]); gl.uniform3fv(G.u.uC3, c[2]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
  /* Without WebGL: one soft glow under the island, breathing with the beat. */
  function draw2D() {
    if (!ctx2d) return;
    var w = glc.width, h = glc.height, x = islX * SCALE, r = Math.max(60, w * (W < 720 ? 0.32 : 0.17));
    var c = colours()[0], e = S.energy * (0.75 + 0.25 * Math.exp(-beatPh * 6));
    ctx2d.setTransform(1, 0, 0, 1, 0, 0); ctx2d.clearRect(0, 0, w, h);
    ctx2d.translate(x, 0); ctx2d.scale(1, 0.55);
    var g = ctx2d.createRadialGradient(0, 0, 0, 0, 0, r);
    var rgb = c.map(function (v) { return Math.round(v * 255); }).join(",");
    g.addColorStop(0, "rgba(" + rgb + "," + (0.85 * e).toFixed(3) + ")");
    g.addColorStop(0.5, "rgba(" + rgb + "," + (0.35 * e).toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx2d.fillStyle = g; ctx2d.beginPath(); ctx2d.arc(0, 0, r, 0, Math.PI * 2); ctx2d.fill();
  }

  /* ---------- Loop: runs only while music plays or the light is fading out ---------- */
  var raf = 0, last = performance.now();
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    S.energy += ((S.playing ? 1 : 0) - S.energy) * Math.min(1, dt * 1.1);   /* about a second to fade in or out */
    for (var i = 0; i < 3; i++) {                                             /* a new cover's colours glide in over ~2 s */
      cur[i][0] = lerpHue(cur[i][0], target[i][0], Math.min(1, dt * 1.2));
      cur[i][1] += (target[i][1] - cur[i][1]) * Math.min(1, dt * 1.2);
      cur[i][2] += (target[i][2] - cur[i][2]) * Math.min(1, dt * 1.2);
    }
    islandX(now);
    if (islTo !== null) islX += (islTo - islX) * Math.min(1, dt * 4);
    if (!reduced) spectrum(now / 1000, dt);
    glc.style.display = S.energy > 0.005 ? "" : "none";
    if (!gl || !drawGL(reduced ? 0 : now / 1000)) draw2D();
    var moving = S.playing ? (!reduced || S.energy < 0.995) : S.energy > 0.005;   /* reduced motion: stop once the glow is still */
    if (moving && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) wake(); });

  /* Two reasons to glow: I am listening right now (the island marks itself data-state="playing"),
     or the visitor hears music on this page ("zi:playback" with playing: true). */
  var mine = false, heard = false, heardColour = false;
  function update() {
    S.playing = mine || heard;
    if (reduced) cur = target.map(function (x) { return x.slice(); });   /* reduced motion: a still glow, no pulsing */
    wake();
  }
  document.addEventListener("zi:playback", function (ev) {
    var d = ev.detail || {}, base = parseColor(d.accent) || parseColor(d.color);
    if (base) { target = paletteFrom(base); heardColour = true; }
    if (d.playing) setBpm(d.bpm);
    heard = !!d.playing;
    if (!heard) heardColour = false;
    update();
  });
  function watchIsland(root) {
    function read() {
      mine = root.getAttribute("data-state") === "playing";
      /* While the visitor's own player sets the colours, keep them; otherwise follow the island's cover colour. */
      if (!heardColour) {
        var cs = root.style, base = parseColor(cs.getPropertyValue("--art").trim()) || parseColor(cs.getPropertyValue("--zi-tint").trim());
        if (base) target = paletteFrom(base);
      }
      update();
    }
    new MutationObserver(read).observe(root, { attributes: true, attributeFilter: ["data-state", "style"] });
    read();
  }
  /* The island script loads deferred, so wait for its root to appear. */
  (function find(n) {
    var root = document.querySelector(".zi");
    if (root) return watchIsland(root);
    if (n < 60) setTimeout(function () { find(n + 1); }, 500);
  })(0);
})();
