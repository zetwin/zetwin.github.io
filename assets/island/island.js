/* Music island for zetwin.github.io.
   Shows what Stanislav is playing now, his playlists, and lets visitors play any track on the page.
   Data comes from the island worker (see island-worker/ in the portfolio workspace).
   Without a data-endpoint, or when the worker cannot be reached, the island stays hidden. Nothing is ever invented. */
(function () {
  "use strict";
  var script = document.currentScript;
  var ENDPOINT = ((script && script.getAttribute("data-endpoint")) || "").replace(/\/+$/, "");
  if (!ENDPOINT || !window.fetch || !document.querySelector) return;

  var LANG = /^uk/.test((script.getAttribute("data-lang") || document.documentElement.lang || "en")) ? "uk" : "en";
  var TEXT = {
    en: {
      listeningOn: "Listening on", on: "On", listening: "Listening now", lastPlayed: "Last played",
      open: "Open music panel", close: "Close music panel", playlists: "Playlists", position: "Track position",
      nowPlaying: "Now playing", nothing: "Nothing playing right now", play: "Play", stop: "Stop",
      music: "Music", history: "Full history on Last.fm", follow: "Follow on Spotify",
      along: "Listen with me", alongOn: "Listening with me", alongNote: "Each song plays to the end, then your player switches to what I am playing.",
      next: "Next", nextMine: "Up next, my song", pressPlay: "Your browser blocked autoplay. Press play in the player.",
      previewNote: "Sign in to Spotify in this browser for full songs.",
      openIn: "Open in",
      playMine: "Play my music", mineOn: "Playing my music", mineNote: "My playlists, shuffled. Keeps playing while you look around.",
      pause: "Pause", resume: "Resume", mute: "Mute", silentNote: "Playing my song silently. Press play on the notch to hear it.",
      viaLastfm: "via Last.fm", sameAsMine: "Same song as me", myLast: "My last song", fromLists: "From my playlists", srcFull: "Full song · YouTube",
      previewLabel: "30-second preview, no ads", fullSong: "Full song", playingHere: "Playing here", fullHere: "Full song on YouTube", fullNote: "Full songs play on YouTube and may start with an ad. Its Skip button is in the player.",
      noPreview: "No preview for this song.", playPreview: "Play preview", pausePreview: "Pause preview",
      artist: "Artist", releases: "Releases", Single: "Single", EP: "EP", Album: "Album"
    },
    uk: {
      listeningOn: "Слухаю в", on: "У", listening: "Слухаю зараз", lastPlayed: "Востаннє грало",
      open: "Відкрити музику", close: "Закрити музику", playlists: "Плейлисти", position: "Позиція треку",
      nowPlaying: "Зараз грає", nothing: "Зараз нічого не грає", play: "Слухати", stop: "Зупинити",
      music: "Музика", history: "Уся історія на Last.fm", follow: "Підписатися в Spotify",
      along: "Слухати разом", alongOn: "Слухаємо разом", alongNote: "Кожна пісня грає до кінця, далі плеєр перемикається на те, що слухаю я.",
      next: "Далі", nextMine: "Далі моя пісня", pressPlay: "Браузер заблокував автозапуск. Натисніть play у плеєрі.",
      previewNote: "Увійдіть у Spotify в цьому браузері, щоб слухати повністю.",
      openIn: "Відкрити в",
      playMine: "Увімкнути мою музику", mineOn: "Грає моя музика", mineNote: "Мої плейлисти вперемішку. Грають, поки ви гортаєте сторінку.",
      pause: "Пауза", resume: "Продовжити", mute: "Вимкнути звук", silentNote: "Моя пісня грає беззвучно. Натисніть play на острові, щоб почути.",
      viaLastfm: "через Last.fm", sameAsMine: "Та сама пісня, що в мене", myLast: "Моя остання пісня", fromLists: "З моїх плейлистів", srcFull: "Повна пісня · YouTube",
      previewLabel: "Уривок 30 секунд, без реклами", fullSong: "Повна пісня", playingHere: "Грає тут", fullHere: "Повна пісня на YouTube", fullNote: "Повні пісні грають на YouTube і можуть почати з реклами. Кнопка «Пропустити» є у плеєрі.",
      noPreview: "Для цієї пісні немає уривка.", playPreview: "Слухати уривок", pausePreview: "Пауза",
      artist: "Виконавець", releases: "Релізи", Single: "Сингл", EP: "EP", Album: "Альбом"
    }
  }[LANG];
  var SOURCE = { spotify: "Spotify", ytm: "YouTube Music" };

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = matchMedia("(hover: hover)").matches;
  var POLL_MS = 30000, ALONG_POLL_MS = 10000;

  var S = { now: null, lists: [], profile: {}, tab: 0, view: "compact", fetchedAt: 0, key: "", playing: null, k: 1 };
  var el = {};
  var hoverTimer = null;
  var pollTimer = null;
  var colorCache = {};

  /* ---------- Helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return typeof u === "string" && /^https:\/\//.test(u) ? u : ""; }
  function mmss(ms) { var n = Math.max(0, Math.floor(ms / 1000)); return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0"); }
  function ago(ts, style) {
    var s = Math.round((ts - Date.now()) / 1000), a = Math.abs(s);
    var unit = a < 3600 ? "minute" : a < 86400 ? "hour" : "day";
    var v = unit === "minute" ? Math.max(1, Math.round(a / 60)) : unit === "hour" ? Math.round(a / 3600) : Math.round(a / 86400);
    try { return new Intl.RelativeTimeFormat(LANG, { numeric: "auto", style: style || "long" }).format(-v, unit); } catch (e) { return ""; }
  }
  function spotifyId(t) { return t && /^[A-Za-z0-9]{22}$/.test(t.spotifyId || "") ? t.spotifyId : ""; }
  function videoId(t) { return t && /^[\w-]{11}$/.test(t.videoId || "") ? t.videoId : ""; }
  /* YouTube marks some label videos "embeddable" but refuses them on other sites (error 150). Remember those for this visit. */
  var failed = {};
  try { failed = JSON.parse(sessionStorage.getItem("zi-failed") || "{}") || {}; } catch (e) { failed = {}; }
  function markFailed(id) { failed[id] = 1; try { sessionStorage.setItem("zi-failed", JSON.stringify(failed)); } catch (e) {} }
  /* Songs with no preview found (Deezer and iTunes both missed). */
  var noPreview = {};
  function hasFull(t) { return !!(spotifyId(t) || (videoId(t) && !failed[videoId(t)])); }
  function playable(t) { return !!t && (!noPreview[trackKey(t)] || hasFull(t)); }
  function previewable(t) { return !!t && !noPreview[trackKey(t)]; }
  function trackUrl(t) {
    var u = safeUrl(t.url);
    if (u) return u;
    var q = encodeURIComponent((t.artist || "") + " " + (t.title || ""));
    return "https://music.youtube.com/search?q=" + q;
  }
  function trackKey(t) { return t ? (t.title || "") + "|" + (t.artist || "") : ""; }
  function isPlaying() { return !!(S.now && S.now.playing && S.now.track); }
  function current() { return S.now && S.now.track; }
  /* What the notch shows: my track while I play, otherwise the visitor's song if they started my music. */
  function shown() { return isPlaying() ? current() : (S.playing && S.playing.track) || current(); }
  /* True only while the visitor can actually hear music. */
  function visitorPlaying() { return !!(S.playing && !S.playing.paused && !S.playing.muted); }

  /* ---------- Spring easing, from real physics, as CSS linear() ---------- */
  (function () {
    function spring(stiffness, damping) {
      var w0 = Math.sqrt(stiffness), z = damping / (2 * Math.sqrt(stiffness)), wd = w0 * Math.sqrt(1 - z * z);
      var f = function (t) { return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); };
      var T = 0.1, t, i, pts = [];
      for (t = 0; t < 3; t += 0.01) { if (Math.abs(f(t) - 1) > 0.004) T = t; }
      T += 0.02;
      for (i = 0; i <= 40; i++) pts.push(+f((T * i) / 40).toFixed(4));
      pts[40] = 1;
      return { e: "linear(" + pts.join(",") + ")", d: Math.round(T * 1000) };
    }
    var root = document.documentElement.style;
    var ok = window.CSS && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)");
    var open = spring(210, 19), close = spring(320, 30);
    root.setProperty("--zi-open", ok ? open.e : "cubic-bezier(.3,1.3,.5,1)");
    root.setProperty("--zi-close", ok ? close.e : "cubic-bezier(.3,1,.4,1)");
    root.setProperty("--zi-open-d", (reduced ? 1 : open.d) + "ms");
    root.setProperty("--zi-close-d", (reduced ? 1 : close.d) + "ms");
  })();

  /* ---------- Colour from a cover: a light accent for the bars and a dark tint for the panel ---------- */
  function colorFor(t) {
    var src = t && safeUrl(t.art);
    if (!src) return Promise.resolve(GREY);
    if (colorCache[src]) return Promise.resolve(colorCache[src]);
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          var c = document.createElement("canvas"); c.width = c.height = 24;
          var x = c.getContext("2d"); x.drawImage(img, 0, 0, 24, 24);
          var px = x.getImageData(0, 0, 24, 24).data, best = [], i;
          for (i = 0; i < px.length; i += 4) {
            var r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
            var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
            if (d) {
              s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
              h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
            }
            best.push({ h: h, s: s, w: s * (1 - Math.abs(l - 0.5) * 2) });
          }
          best.sort(function (a, b2) { return b2.w - a.w; });
          var top = best.slice(0, 60), sx = 0, sy = 0, ss = 0;
          top.forEach(function (p) { var a = (p.h * Math.PI) / 180; sx += Math.cos(a); sy += Math.sin(a); ss += p.s; });
          var hue = Math.round(((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360), sat = ss / top.length;
          colorCache[src] = sat < 0.14 ? GREY : {
            art: "hsl(" + hue + " " + Math.round(Math.max(sat, 0.6) * 100) + "% 68%)",
            /* Dark enough that white text keeps at least 7:1 contrast. */
            tint: "hsl(" + hue + " " + Math.round(Math.min(sat, 0.62) * 100) + "% 23%)"
          };
        } catch (e) { colorCache[src] = GREY; }
        resolve(colorCache[src]);
      };
      img.onerror = function () { colorCache[src] = GREY; resolve(GREY); };
      img.src = src;
    });
  }
  function applyColor() {
    var t = shown();
    colorFor(t).then(function (c) { if (shown() === t) setColor(c); });
  }

  /* ---------- Playback event, so the page can move in time with the visitor's music.
     document.addEventListener("zi:playback", e => e.detail) -> { playing, muted, title, artist, art, color, accent, bpm }
     playing is true only while the visitor can hear music. The silent in-sync player sends playing:false, muted:true. ---------- */
  var lastEmit = "", emitSeq = 0, bpmCache = {};
  function emit(playing) {
    var t = S.playing && S.playing.track, seq = ++emitSeq;
    if (!t) { if (lastEmit && lastEmit.charAt(0) === "1") { lastEmit = "0"; fire({ playing: false, muted: false }); } return; }
    var muted = !!S.playing.muted, audible = !!playing && !muted, bpm = bpmCache[trackKey(t)] || null;
    var key = (audible ? "1" : "0") + (muted ? "m" : "") + (bpm || "") + trackKey(t);
    if (key === lastEmit) return;
    lastEmit = key;
    /* Colours resolve asynchronously; only the newest emit may fire, so a stale "playing" never wins. */
    colorFor(t).then(function (c) {
      if (seq !== emitSeq) return;
      fire({ playing: audible, muted: muted, title: t.title, artist: t.artist, art: safeUrl(t.art) || "", color: c.tint, accent: c.art, bpm: bpm });
    });
  }
  function fire(detail) {
    try { document.dispatchEvent(new CustomEvent("zi:playback", { detail: detail })); } catch (e) {}
  }
  var GREY = { art: "#e8e8ea", tint: "hsl(220 6% 17%)" };
  function setColor(c) {
    if (!el.root) return;
    el.root.style.setProperty("--art", c.art);
    el.root.style.setProperty("--zi-tint", c.tint);
  }

  /* ---------- Templates ---------- */
  var GLYPH = {
    spotify: '<svg class="zi-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1ed760"/><path d="M5.8 9.1c4.1-1.2 8.7-.8 12.3 1.3M6.7 12.4c3.4-1 7.2-.6 10.2 1.1M7.6 15.6c2.7-.8 5.7-.5 8.1.9" fill="none" stroke="#000" stroke-width="1.9" stroke-linecap="round"/></svg>',
    ytm: '<svg class="zi-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#f03"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M10 8.9v6.2l5.2-3.1z" fill="#fff"/></svg>'
  };
  var NOTE = '<svg class="zi-art zi-art-xs" viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="8" fill="#1d1f24"/><path d="M11 17.5V8.5l7-1.5v9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.3" cy="17.6" r="1.9" fill="#fff"/><circle cx="16.3" cy="16.1" r="1.9" fill="#fff"/></svg>';
  var PLAY = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 2.2v9.6L11.6 7z" fill="currentColor"/></svg>';
  var STOP = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/></svg>';
  var CHECK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.4 6.3l2.4 2.4 4.8-5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PAUSE = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="2.5" width="2.8" height="9" rx="1" fill="currentColor"/><rect x="8.2" y="2.5" width="2.8" height="9" rx="1" fill="currentColor"/></svg>';

  function art(t, cls) {
    var src = t && safeUrl(t.art);
    return src ? '<img class="zi-art ' + cls + '" src="' + esc(src) + '" alt="" loading="lazy" draggable="false">' : '<span class="zi-art ' + cls + '" aria-hidden="true"></span>';
  }
  function bars() { return '<span class="zi-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'; }
  function playBtn(t, ref) {
    if (!playable(t)) return "";
    var on = S.playing && S.playing.ref === ref;
    return '<button class="zi-play" type="button" data-play="' + esc(ref) + '" aria-pressed="' + on + '" aria-label="' + esc((on ? TEXT.stop : TEXT.play) + ": " + t.title + ", " + t.artist) + '">' + (on ? STOP : PLAY) + "</button>";
  }
  function compactHtml() {
    var t = shown(), moving = isPlaying() || visitorPlaying();
    if (!t) return NOTE + '<span class="zi-ttl">' + esc(TEXT.music) + "</span>";
    /* Song and artist. When space runs out the artist is cut first, then the song. */
    return art(t, "zi-art-xs") + '<span class="zi-ttl"><span class="zi-ttl-t">' + esc(t.title) + "</span>" +
      (t.artist ? '<span class="zi-ttl-a">' + esc(t.artist) + "</span>" : "") + "</span>" +
      (moving ? bars() : S.now && S.now.at && t === current() ? '<span class="zi-ago">' + esc(ago(S.now.at, "narrow")) + "</span>" : "");
  }
  /* My music for visitors when I am not listening: every playable song from my playlists. */
  function pool() {
    var out = [], seen = {};
    S.lists.forEach(function (l) { l.tracks.forEach(function (t) { var k = trackKey(t); if (previewable(t) && !seen[k]) { seen[k] = 1; out.push(t); } }); });
    return out;
  }
  /* The one-tap control on the closed notch. */
  function quickState() {
    if (S.playing && S.playing.paused) return { icon: PLAY, label: TEXT.resume };
    if (S.playing && S.playing.muted) return { icon: PLAY, label: TEXT.along };
    if (S.playing && S.playing.along) return { icon: PAUSE, label: TEXT.mute };
    if (S.playing) return S.playing.paused ? { icon: PLAY, label: TEXT.resume } : { icon: PAUSE, label: TEXT.pause };
    if (isPlaying() && previewable(current())) return { icon: PLAY, label: TEXT.along };
    if (pool().length) return { icon: PLAY, label: TEXT.playMine };
    return null;
  }
  function syncQuick() {
    if (!el.quick) return;
    var q = quickState();
    el.quick.hidden = !q;
    el.root.classList.toggle("has-quick", !!q);
    if (!q) return;
    el.quick.innerHTML = q.icon;
    el.quick.setAttribute("aria-label", q.label);
    el.quick.title = q.label;
    el.quick.setAttribute("aria-pressed", String(visitorPlaying()));
    el.root.classList.toggle("is-listening", visitorPlaying());
  }
  function statusHtml() {
    if (!isPlaying()) return '<span class="zi-status">' + esc(S.now && S.now.at ? TEXT.lastPlayed + " " + ago(S.now.at) : TEXT.nothing) + "</span>";
    var src = S.now.source;
    /* Last.fm does not say which app is playing, so say where the song comes from instead of guessing. */
    if (!SOURCE[src]) return '<span class="zi-status">' + esc(TEXT.listening + " · " + TEXT.viaLastfm) + "</span>";
    var label = el.root && el.root.classList.contains("is-phone") ? TEXT.on : TEXT.listeningOn;
    return '<span class="zi-status">' + GLYPH[src] + esc(label + " " + SOURCE[src]) + "</span>";
  }
  function progressHtml() {
    /* Only Spotify reports a play position, so the bar shows only when it is real. */
    if (!isPlaying() || S.now.position == null || !S.now.duration) return "";
    return '<div class="zi-prog"><span class="zi-time zi-now">0:00</span><div class="zi-track-bar" role="progressbar" aria-label="' + esc(TEXT.position) +
      '" aria-valuemin="0" aria-valuemax="100"><b></b></div><span class="zi-time zi-end">' + mmss(S.now.duration) + "</span></div>";
  }
  function alongHtml() {
    var t = current(), on;
    if (isPlaying() && playable(t)) {
      on = !!(S.playing && S.playing.along && !S.playing.muted);
      return '<button class="zi-along" type="button" data-along aria-pressed="' + on + '">' + (on ? STOP : PLAY) + "<span>" + esc(on ? TEXT.alongOn : TEXT.along) + "</span></button>";
    }
    if (!pool().length) return "";
    on = !!(S.playing && S.playing.mode === "shuffle");
    return '<button class="zi-along" type="button" data-mine aria-pressed="' + on + '">' + (on ? STOP : PLAY) + "<span>" + esc(on ? TEXT.mineOn : TEXT.playMine) + "</span></button>";
  }
  function headerHtml() {
    var t = current();
    if (!t) return '<div class="zi-hd">' + NOTE.replace("zi-art-xs", "zi-art-lg") + '<div class="zi-hd-text"><span class="zi-hd-title">' + esc(TEXT.music) + '</span><span class="zi-hd-artist">' + esc(TEXT.nothing) + "</span></div></div>" + alongHtml();
    return '<div class="zi-hd">' + art(t, "zi-art-lg") + '<div class="zi-hd-text">' + statusHtml() +
      '<a class="zi-hd-title" href="' + esc(trackUrl(t)) + '" target="_blank" rel="noopener">' + esc(t.title) + "</a>" +
      '<span class="zi-hd-artist">' + esc(t.artist) + "</span></div>" + (isPlaying() ? bars() : "") + "</div>" + progressHtml() + alongHtml();
  }
  function listName(l) { return (LANG === "uk" && l.name_uk) || l.name; }
  /* An artist I like: picture, links to the real artist pages, and the releases as a row of covers. */
  function artistHtml(l) {
    var links = l.links || {}, out = [];
    if (safeUrl(links.apple)) out.push('<a href="' + esc(links.apple) + '" target="_blank" rel="noopener">Apple Music</a>');
    if (safeUrl(links.spotify)) out.push('<a href="' + esc(links.spotify) + '" target="_blank" rel="noopener">Spotify</a>');
    if (safeUrl(links.ytm)) out.push('<a href="' + esc(links.ytm) + '" target="_blank" rel="noopener">YouTube Music</a>');
    var rel = (l.releases || []).map(function (r) {
      return '<a class="zi-release" href="' + esc(safeUrl(r.url) || "#") + '" target="_blank" rel="noopener">' + art(r, "zi-art-rel") +
        '<span class="zi-release-t">' + esc(r.title) + '</span><span class="zi-release-m">' + esc((TEXT[r.type] || r.type || "") + (r.year ? ", " + r.year : "")) + "</span></a>";
    }).join("");
    return '<div class="zi-artist">' + (safeUrl(l.picture) ? '<img class="zi-artist-pic" src="' + esc(l.picture) + '" alt="" loading="lazy">' : "") +
      '<div class="zi-artist-text"><span class="zi-artist-name">' + esc(l.name) + '</span><span class="zi-artist-meta">' + esc(TEXT.artist + (l.genre ? ", " + l.genre : "")) + "</span></div></div>" +
      (out.length ? '<div class="zi-artist-links">' + out.join("") + "</div>" : "") +
      (rel ? '<div class="zi-releases" role="list" aria-label="' + esc(TEXT.releases) + '">' + rel + "</div>" : "");
  }
  function rowsHtml(list, li) {
    return list.tracks.map(function (t, i) {
      return '<div class="zi-row">' + art(t, "zi-art-sm") +
        '<a class="zi-row-text" href="' + esc(trackUrl(t)) + '" target="_blank" rel="noopener"><span class="zi-row-t">' + esc(t.title) + '</span><span class="zi-row-a">' + esc(t.artist) + "</span></a>" +
        (GLYPH[list.source] || "") + playBtn(t, li + ":" + i) + "</div>";
    }).join("");
  }
  /* ---------- Visitor player: a queue, so music keeps going.
     Row Play: plays through that playlist. Listen with me: each song plays to the end, then my current track,
     or the next song of my playlist while I am still on the same one. ---------- */
  var sp = { loading: null, ctrl: null, ended: false };
  var yt = { loading: null, player: null, hintTimer: null };

  function loadSpotifyApi() {
    if (sp.loading) return sp.loading;
    sp.loading = new Promise(function (resolve, reject) {
      var prev = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = function (api) { if (typeof prev === "function") { try { prev(api); } catch (e) {} } resolve(api); };
      var s = document.createElement("script");
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      s.onerror = reject;
      document.head.appendChild(s);
      setTimeout(function () { reject(new Error("timeout")); }, 8000);
    });
    sp.loading.catch(function () { sp.loading = null; });
    return sp.loading;
  }
  /* The site's hero already uses the YouTube IFrame API, so reuse it if loaded and chain its ready callback. */
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (yt.loading) return yt.loading;
    yt.loading = new Promise(function (resolve, reject) {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (typeof prev === "function") { try { prev(); } catch (e) {} } if (window.YT && YT.Player) resolve(window.YT); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        var s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      }
      var waited = 0, poll = setInterval(function () {
        waited += 200;
        if (window.YT && YT.Player) { clearInterval(poll); resolve(window.YT); }
        else if (waited > 10000) { clearInterval(poll); reject(new Error("timeout")); }
      }, 200);
    });
    yt.loading.catch(function () { yt.loading = null; });
    return yt.loading;
  }

  function slot() { return el.full.querySelector(".zi-player-slot"); }
  function note(text, cls) { return text ? '<p class="zi-player-note' + (cls ? " " + cls : "") + '">' + esc(text) + "</p>" : ""; }
  /* What the visitor hears, from where, and whether it is the song I am on right now. */
  function matchHtml(t) {
    var k = trackKey(t), cur = current();
    if (cur && k === trackKey(cur)) return isPlaying() ? '<span class="zi-match is-same">' + CHECK + esc(TEXT.sameAsMine) + "</span>" : '<span class="zi-match">' + esc(TEXT.myLast) + "</span>";
    var mine = S.lists.some(function (l) { return l.source !== "artist" && l.tracks.some(function (x) { return trackKey(x) === k; }); });
    return mine ? '<span class="zi-match">' + esc(TEXT.fromLists) + "</span>" : "";
  }
  function srcInner(p) { return matchHtml(p.track) + "<span>" + esc(p.source === "full" ? TEXT.srcFull : TEXT.previewLabel) + "</span>"; }
  function srcHtml(p) { return '<div class="zi-src">' + srcInner(p) + "</div>"; }
  function syncHere() {
    var box = slot(), p = S.playing;
    if (!p) return;
    var src = box.querySelector(".zi-src");
    if (src) src.innerHTML = srcInner(p);
    /* The full-song player is reused between songs, so its title follows the song. */
    var fb = box.querySelector(".zi-fullbox-meta");
    if (fb) { fb.querySelector(".zi-pv-title").textContent = p.track.title; fb.querySelector(".zi-pv-artist").textContent = p.track.artist; }
  }
  function setNotes() {
    var box = slot(), p = S.playing;
    syncHere();
    box.querySelectorAll(".zi-player-note").forEach(function (n) { n.remove(); });
    if (!p) return;
    var html = "";
    if (p.blocked) html += note(TEXT.pressPlay, "zi-player-warn");
    if (p.along && p.muted) html += note(TEXT.silentNote);
    else if (p.along) html += note(TEXT.alongNote);
    if (p.mode === "shuffle") html += note(TEXT.mineNote);
    var next = upNext();
    if (next) html += note((next === current() && isPlaying() ? TEXT.nextMine : TEXT.next) + ": " + next.title + ", " + next.artist);
    if (p.source === "full") html += note(TEXT.fullNote);
    if (p.missing) html += note(TEXT.noPreview, "zi-player-warn");
    box.insertAdjacentHTML("beforeend", html);
  }
  function destroyPlayers(keep) {
    if (keep !== "spotify" && sp.ctrl) { try { sp.ctrl.destroy(); } catch (e) {} sp.ctrl = null; }
    if (keep !== "youtube" && yt.player) { try { yt.player.destroy(); } catch (e) {} yt.player = null; }
    clearTimeout(yt.hintTimer);
  }
  function stopPlayer() {
    emit(false);
    destroyPlayers();
    stopAudio();
    S.playing = null;
    S.alongMine = "";
    S.shuffle = null;
    slot().innerHTML = "";
    syncButtons();
    refreshCompact();
  }
  function pausePlayer() {
    if (!S.playing) return;
    if (S.playing.source === "preview") { if (au) au.pause(); }
    else { try { if (yt.player && yt.player.pauseVideo) yt.player.pauseVideo(); else if (sp.ctrl) sp.ctrl.pause(); } catch (e) {} }
    setPaused(true);
  }
  function resumePlayer() {
    if (!S.playing) return;
    if (S.playing.source === "preview") { if (au && au.src) playAudio(); }
    else { try { if (yt.player && yt.player.playVideo) yt.player.playVideo(); else if (sp.ctrl) sp.ctrl.resume(); } catch (e) {} }
    setPaused(false);
  }
  function setPaused(paused) {
    if (!S.playing || S.playing.paused === paused) return;
    S.playing.paused = paused;
    emit(!paused);
    refreshCompact();
  }
  /* Repaint only the closed notch and its control; the panel and the player are left alone. */
  function refreshCompact() {
    if (!el.root || el.root.hidden) return;
    el.compact.innerHTML = compactHtml();
    syncQuick();
    syncButtons();
    applyColor();
    size();
  }

  /* "Play my music": my playlists, shuffled, looping. */
  function shuffled(list) {
    var a = list.slice(), i, j, x;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function refFor(t) { var at = locate(t); return at ? at.li + ":" + at.i : "shuffle"; }
  function peekShuffle() {
    var q = S.shuffle, i;
    if (!q) return null;
    for (i = S.shuffleAt; i < q.length; i++) if (previewable(q[i])) return q[i];
    return null;
  }
  function nextShuffle() {
    var t = peekShuffle(), last = S.playing && S.playing.track;
    if (!t) {
      S.shuffle = shuffled(pool());
      S.shuffleAt = 0;
      if (S.shuffle.length > 1 && last && trackKey(S.shuffle[0]) === trackKey(last)) S.shuffle.push(S.shuffle.shift());
      t = peekShuffle();
    }
    if (t) S.shuffleAt = S.shuffle.indexOf(t) + 1;
    return t;
  }
  function startShuffle() {
    S.shuffle = shuffled(pool());
    S.shuffleAt = 0;
    var t = nextShuffle();
    if (t) playPreview(t, refFor(t), "shuffle", false, false);
  }

  /* Where a track sits in my playlists, so the queue can continue from it. */
  function locate(t) {
    var k = trackKey(t), li, i;
    for (li = 0; li < S.lists.length; li++) {
      for (i = 0; i < S.lists[li].tracks.length; i++) if (trackKey(S.lists[li].tracks[i]) === k) return { li: li, i: i };
    }
    return null;
  }
  function nextInList(t) {
    var at = locate(t);
    if (!at) at = S.lists.length && S.lists[0].tracks.length ? { li: 0, i: -1 } : null;
    if (!at) return null;
    var list = S.lists[at.li].tracks, n, j;
    for (n = 1; n <= list.length; n++) {
      j = (at.i + n) % list.length;
      if (previewable(list[j]) && trackKey(list[j]) !== trackKey(t)) return { track: list[j], ref: at.li + ":" + j };
    }
    return null;
  }
  function upNext() {
    var p = S.playing;
    if (!p) return null;
    if (p.along && mineIsNew()) return current();
    if (switchToMine(p)) return current();
    if (p.mode === "shuffle") return peekShuffle();
    var n = nextInList(p.track);
    return n && n.track;
  }
  /* A visitor on "Play my music" or a song they picked moves over to what I am playing once their song ends. */
  function switchToMine(p) {
    return !!p && !p.along && !p.muted && isPlaying() && previewable(current()) && trackKey(current()) !== trackKey(p.track);
  }
  /* True when I have moved on to a song this visitor has not been given yet. */
  function mineIsNew() {
    return isPlaying() && previewable(current()) && trackKey(current()) !== S.alongMine;
  }
  /* When a preview (or a full song) ends:
     along: my new song if I moved on, otherwise keep going through my playlist until I do;
     shuffle: the next shuffled song; a list: the next song in that list. */
  function onEnded() {
    var p = S.playing;
    if (!p) return;
    if (p.along && mineIsNew()) { playPreview(current(), "now", "along", p.muted, false); return; }
    /* I started listening: the visitor's song has finished, so now they listen with me. */
    if (switchToMine(p)) { playPreview(current(), "now", "along", false, false); return; }
    if (p.muted) { S.autoDone = trackKey(p.track); stopPlayer(); return; }
    if (p.along || p.mode === "shuffle") {
      var s2 = nextShuffle();
      if (s2) playPreview(s2, p.along ? "now" : refFor(s2), p.along ? "along" : "shuffle", false, false); else stopPlayer();
      return;
    }
    var n = nextInList(p.track);
    if (n) playPreview(n.track, n.ref, "list", false, false);
    else stopPlayer();
  }

  /* ---------- Ad-free previews in one <audio> element ----------
     iOS only allows sound that starts inside a tap. Every tap calls unlock() first, which plays a silent clip on the
     same element right away; the real preview URL arrives a moment later and plays on the already-unlocked element. */
  var au = null, previewCache = {}, missRun = 0;
  var SILENT = (function () {
    var n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer), i;
    var w = function (o, str) { for (i = 0; i < str.length; i++) b[o + i] = str.charCodeAt(i); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, "data"); v.setUint32(40, n, true); for (i = 0; i < n; i++) b[44 + i] = 128;
    var bin = ""; for (i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return "data:audio/wav;base64," + btoa(bin);
  })();
  function audioEl() {
    if (au) return au;
    au = new Audio();
    au.preload = "auto";
    au.setAttribute("playsinline", "");
    au.addEventListener("playing", function () {
      if (!S.playing || S.playing.source !== "preview" || au.src === SILENT) return;
      missRun = 0;
      S.playing.blocked = false;
      if (S.playing.paused) setPaused(false); else emit(true);
      setNotes(); syncPv(); refreshCompact();
      measureBpm(S.playing.track, au.src);
    });
    au.addEventListener("pause", function () {
      if (S.switching || au.ended || au.src === SILENT || !S.playing || S.playing.source !== "preview") return;
      setPaused(true); syncPv();
    });
    au.addEventListener("ended", function () { if (au.src !== SILENT && S.playing && S.playing.source === "preview") onEnded(); });
    au.addEventListener("error", function () {
      if (au.src === SILENT || !au.getAttribute("src") || !S.playing || S.playing.source !== "preview") return;
      noPreview[trackKey(S.playing.track)] = 1;
      skipMissing();
    });
    au.addEventListener("timeupdate", tickPreview);
    return au;
  }
  function unlock() {
    var a = audioEl();
    if (!a.paused && a.src !== SILENT) return;
    try { S.switching = true; a.muted = true; a.src = SILENT; var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    S.switching = false;
  }
  function stopAudio() {
    if (!au) return;
    S.switching = true;
    try { au.pause(); au.removeAttribute("src"); au.load(); } catch (e) {}
    S.switching = false;
  }
  function playAudio() {
    var pr = au.play();
    if (pr && pr.catch) pr.catch(function () {
      if (!S.playing || S.playing.source !== "preview") return;
      /* Autoplay refused: show our own play button in the panel instead of staying silent. */
      S.playing.blocked = true; S.playing.paused = true;
      setNotes(); syncPv(); refreshCompact();
      if (!S.playing.muted && S.view !== "full") { S.byHover = false; setView("full"); }
    });
  }
  function previewOf(t) {
    if (t.preview && safeUrl(t.preview)) return Promise.resolve(t.preview);
    var k = trackKey(t);
    if (!previewCache[k]) {
      previewCache[k] = getJSON("/preview?artist=" + encodeURIComponent(t.artist || "") + "&title=" + encodeURIComponent(t.title || ""))
        .then(function (d) { return (d && safeUrl(d.preview)) || ""; }, function () { delete previewCache[k]; return ""; });
    }
    return previewCache[k];
  }
  function skipMissing() {
    if (!S.playing) return;
    missRun++;
    paint(false);
    if (S.playing.single || missRun > 8) {
      /* A song the visitor picked has no preview: say so and offer the full song. */
      S.playing.missing = true; S.playing.paused = true;
      renderPv(); setNotes(); refreshCompact();
      return;
    }
    onEnded();
  }
  /* mode: "along" (my song), "shuffle", "list". single: the visitor picked exactly this song. */
  function playPreview(t, ref, mode, muted, single) {
    destroyPlayers();
    S.playing = { ref: ref, track: t, along: mode === "along", mode: mode, muted: !!muted, paused: false, blocked: false, source: "preview", single: !!single, missing: false };
    if (mode !== "shuffle" && mode !== "along") S.shuffle = null;
    if (mode === "along" && trackKey(t) === trackKey(current())) S.alongMine = trackKey(t);
    if (mode !== "along") S.alongMine = "";
    var token = S.token = (S.token || 0) + 1;
    renderPv(); setNotes(); refreshCompact();
    previewOf(t).then(function (url) {
      if (token !== S.token || !S.playing) return;
      if (!url) { noPreview[trackKey(t)] = 1; skipMissing(); return; }
      var a = audioEl();
      S.switching = true;
      a.muted = !!S.playing.muted;
      a.src = url;
      S.switching = false;
      playAudio();
      prefetchNext();
    });
  }
  /* Look the next preview up early so the change between songs is instant. */
  function prefetchNext() {
    var n = upNext();
    if (n && previewable(n)) previewOf(n);
  }
  function renderPv() {
    var p = S.playing, box = slot();
    if (!p || p.source !== "preview") return;
    var full = hasFull(p.track) ? '<button class="zi-full-btn" type="button" data-fullsong>' + esc(TEXT.fullSong) + "</button>" : "";
    /* The visitor's own player, labelled so it is never mistaken for what I am listening to. */
    box.innerHTML = '<div class="zi-pv" role="group" aria-label="' + esc(TEXT.playingHere) + '">' + art(p.track, "zi-art-pv") +
      '<div class="zi-pv-meta"><span class="zi-here">' + esc(TEXT.playingHere) + '</span><span class="zi-pv-title">' + esc(p.track.title) + '</span><span class="zi-pv-artist">' + esc(p.track.artist) + "</span></div>" +
      '<button class="zi-pv-btn" type="button" data-pv></button>' + full +
      '<div class="zi-pv-bar" aria-hidden="true"><b></b></div></div>' + srcHtml(p);
    syncPv();
    size();
  }
  function syncPv() {
    var b = slot().querySelector("[data-pv]");
    if (!b || !S.playing) return;
    var on = !S.playing.paused && !S.playing.missing;
    b.innerHTML = on ? PAUSE : PLAY;
    b.setAttribute("aria-label", on ? TEXT.pausePreview : TEXT.playPreview);
    b.disabled = !!S.playing.missing;
  }
  function tickPreview() {
    var bar = slot().querySelector(".zi-pv-bar b");
    if (bar && au && au.duration) bar.style.width = Math.min(100, (au.currentTime / au.duration) * 100) + "%";
  }
  /* The full song: YouTube (or Spotify) in the panel, visible, so its own Skip ad button can be pressed. */
  function playFull(t) {
    stopAudio();
    var p = S.playing || {};
    var startSec = p.along && trackKey(t) === trackKey(current()) ? alongStartSec() : 0;
    S.playing = { ref: p.ref || "full", track: t, along: !!p.along, mode: p.mode || "list", muted: false, paused: false, blocked: false, source: "full" };
    if (S.view !== "full") { S.byHover = false; setView("full"); }
    startPlayer(t, S.playing.ref, S.playing.along, startSec, S.playing.mode, false);
  }

  /* ---------- Tempo, measured from the preview while the visitor hears it ---------- */
  function measureBpm(t, url) {
    var k = trackKey(t);
    if (k in bpmCache || !url || !window.OfflineAudioContext || (S.playing && S.playing.muted)) return;
    bpmCache[k] = 0;
    fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      return new OfflineAudioContext(1, 1, 44100).decodeAudioData(buf);
    }).then(function (audio) {
      var sr = 11025, oc = new OfflineAudioContext(1, Math.floor(audio.duration * sr), sr);
      var src = oc.createBufferSource(), lp = oc.createBiquadFilter();
      src.buffer = audio; lp.type = "lowpass"; lp.frequency.value = 160;
      src.connect(lp); lp.connect(oc.destination); src.start();
      return oc.startRendering();
    }).then(function (r) {
      var d = r.getChannelData(0), hop = 128, fps = r.sampleRate / hop, n = Math.floor(d.length / hop), env = new Float32Array(n), on = new Float32Array(n), i, j, m = 0;
      for (i = 0; i < n; i++) { var s2 = 0; for (j = 0; j < hop; j++) { var v = d[i * hop + j]; s2 += v * v; } env[i] = Math.sqrt(s2 / hop); }
      for (i = 1; i < n; i++) { on[i] = Math.max(0, env[i] - env[i - 1]); m += on[i]; }
      m /= n; for (i = 0; i < n; i++) on[i] -= m;
      var ac = function (lag) { var l0 = Math.floor(lag), f = lag - l0, s3 = 0; for (var q = 0; q + l0 + 1 < n; q++) s3 += on[q] * (on[q + l0] * (1 - f) + on[q + l0 + 1] * f); return s3; };
      var best = 0, bestScore = -Infinity, scores = {};
      for (var b = 60; b <= 200; b += 0.5) { var lag = fps * 60 / b, sc = ac(lag) + 0.5 * ac(lag * 2) + 0.25 * ac(lag * 4); scores[b] = sc; if (sc > bestScore) { bestScore = sc; best = b; } }
      /* Fold into the usual dance range when the double or half tempo scores almost as well. */
      if (best < 85 && scores[best * 2] > 0.5 * bestScore) best *= 2;
      if (best > 175 && scores[best / 2] > 0.5 * bestScore) best /= 2;
      bpmCache[k] = Math.round(best);
      if (S.playing && trackKey(S.playing.track) === k) emit(!S.playing.paused);
    }).catch(function () { bpmCache[k] = 0; });
  }

  function startPlayer(t, ref, along, startSec, mode, muted) {
    var sid = spotifyId(t), vid = videoId(t), box = slot();
    S.playing = { ref: ref, track: t, along: along, blocked: false, paused: false, muted: !!muted, mode: mode || (along ? "along" : "list"), source: "full" };
    if (S.playing.mode !== "shuffle") S.shuffle = null;
    if (along && trackKey(t) === trackKey(current())) S.alongMine = trackKey(t);
    if (!along) S.alongMine = "";
    /* YouTube first: it plays full songs for everyone. */
    if (vid) {
      destroyPlayers("youtube");
      if (yt.player && box.querySelector(".zi-player-youtube")) {
        try { if (muted) yt.player.mute(); else { yt.player.unMute(); yt.player.setVolume(100); } } catch (e) {}
        yt.player.loadVideoById({ videoId: vid, startSeconds: Math.floor(startSec || 0) });
        watchStart();
      } else {
        box.innerHTML = '<div class="zi-fullbox" role="group" aria-label="' + esc(TEXT.fullHere) + '"><div class="zi-player zi-player-youtube"><div class="zi-yt-mount"></div></div>' +
          '<div class="zi-fullbox-meta"><span class="zi-here">' + esc(TEXT.playingHere) + '</span><span class="zi-pv-title">' + esc(t.title) + '</span><span class="zi-pv-artist">' + esc(t.artist) + "</span>" + srcHtml(S.playing) +
          '<button class="zi-stop-btn" type="button" data-stop>' + STOP + "<span>" + esc(TEXT.stop) + "</span></button></div></div>";
        var mount = box.querySelector(".zi-yt-mount");
        var createYT = function (YT) {
          if (!mount.isConnected) return;
          yt.player = new YT.Player(mount, {
            host: "https://www.youtube-nocookie.com",
            videoId: vid,
            width: "200",
            height: "200",
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, mute: muted ? 1 : 0, start: Math.floor(startSec || 0), origin: location.origin },
            events: {
              onReady: function (e) { try { if (S.playing && S.playing.muted) e.target.mute(); e.target.playVideo(); } catch (x) {} watchStart(); },
              onStateChange: function (e) {
                if (e.data === 1 && S.playing && S.playing.blocked) { S.playing.blocked = false; setNotes(); size(); }
                if (e.data === 1) { if (S.playing && S.playing.paused) setPaused(false); else emit(true); }
                if (e.data === 2) setPaused(true);
                if (e.data === 0) onEnded();
              },
              /* 101 and 150: the owner blocked playing on other sites. Remember it, drop its play button, skip on. */
              onError: function () {
                var bad = S.playing && videoId(S.playing.track);
                if (bad) { markFailed(bad); paint(false); }
                onEnded();
              }
            }
          });
          size();
        };
        /* iOS Safari only allows sound when playback starts inside the tap itself. The site's hero has usually
           loaded the YouTube API already, so the player is created right here, in the same click. */
        var ytFallback = function () {
          if (!mount.isConnected) return;
          mount.outerHTML = '<iframe title="YouTube: ' + esc(t.title) + '" src="https://www.youtube-nocookie.com/embed/' + vid +
            "?autoplay=1&playsinline=1&rel=0" + (startSec ? "&start=" + Math.floor(startSec) : "") + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
          emit(true);
          size();
        };
        if (window.YT && window.YT.Player) createYT(window.YT);
        else loadYouTubeApi().then(createYT, ytFallback);
      }
    } else if (sid) {
      var uri = "spotify:track:" + sid;
      destroyPlayers("spotify");
      sp.ended = false;
      if (sp.ctrl && box.querySelector(".zi-player-spotify")) {
        sp.ctrl.loadUri(uri, false, startSec || 0);
        sp.ctrl.play();
      } else {
        box.innerHTML = '<div class="zi-player zi-player-spotify"><div class="zi-sp-mount"></div></div>';
        var spMount = box.querySelector(".zi-sp-mount");
        loadSpotifyApi().then(function (api) {
          if (!spMount.isConnected) return;
          api.createController(spMount, { uri: uri, width: "100%", height: 80 }, function (c) {
            sp.ctrl = c;
            var started = false;
            c.addListener("ready", function () {
              if (started) return;
              started = true;
              c.play();
              if (startSec) c.seek(startSec);
            });
            /* Spotify has no "ended" event; treat reaching the end of the track (or preview) as the end. */
            c.addListener("playback_update", function (e) {
              var d = e && e.data;
              if (!d) return;
              if (typeof d.isPaused === "boolean" && S.playing) {
                if (d.isPaused && !S.playing.paused && d.position > 0) setPaused(true);
                else if (!d.isPaused) { if (S.playing.paused) setPaused(false); else emit(true); }
              }
              if (!d.duration) return;
              if (d.position >= d.duration - 400 && !sp.ended) { sp.ended = true; onEnded(); }
              else if (d.position < d.duration - 2000) sp.ended = false;
            });
            size();
          });
        }).catch(function () {
          if (!spMount.isConnected) return;
          spMount.outerHTML = '<iframe title="Spotify: ' + esc(t.title) + '" src="https://open.spotify.com/embed/track/' + sid + '?utm_source=zetwin" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';
          emit(true);
          size();
        });
      }
    }
    setNotes();
    refreshCompact();
  }
  /* Some browsers (Safari) block sound-on autoplay. If the song has not started, say so instead of staying silent. */
  function watchStart() {
    clearTimeout(yt.hintTimer);
    yt.hintTimer = setTimeout(function () {
      if (!yt.player || !S.playing || typeof yt.player.getPlayerState !== "function") return;
      /* The full-song player is in view with its own play and Skip ad buttons, and YouTube reports
         "not started" (-1) during its ads, so a warning here would be wrong. */
      if (S.playing.source === "full") return;
      var st = yt.player.getPlayerState();
      if (st !== 1 && st !== 3) {
        S.playing.blocked = true;
        setNotes();
        if (S.view !== "full" && !S.playing.muted) { S.byHover = false; setView("full"); }
        size();
      }
    }, 3000);
  }
  function syncButtons() {
    el.full.querySelectorAll("[data-play]").forEach(function (b) {
      var on = !!(S.playing && !S.playing.along && S.playing.ref === b.getAttribute("data-play"));
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", b.getAttribute("aria-label").replace(/^[^:]+:/, (on ? TEXT.stop : TEXT.play) + ":"));
      b.innerHTML = on ? STOP : PLAY;
    });
    var a = el.full.querySelector("[data-along]");
    if (a) {
      var on = !!(S.playing && S.playing.along && !S.playing.muted);
      a.setAttribute("aria-pressed", String(on));
      a.innerHTML = (on ? STOP : PLAY) + "<span>" + esc(on ? TEXT.alongOn : TEXT.along) + "</span>";
    }
    var m = el.full.querySelector("[data-mine]");
    if (m) {
      var onM = !!(S.playing && S.playing.mode === "shuffle");
      m.setAttribute("aria-pressed", String(onM));
      m.innerHTML = (onM ? STOP : PLAY) + "<span>" + esc(onM ? TEXT.mineOn : TEXT.playMine) + "</span>";
    }
  }
  function alongStartSec() {
    /* Spotify gives the real position; YouTube Music via Last.fm does not, so it starts from the top. */
    if (!isPlaying() || S.now.position == null) return 0;
    return Math.max(0, (S.now.position + (Date.now() - S.fetchedAt)) / 1000);
  }
  function footHtml() {
    var lf = safeUrl(S.profile.lastfm), spUrl = safeUrl(S.profile.spotify);
    if (!lf && !spUrl) return "";
    return '<div class="zi-foot">' + (lf ? '<a href="' + esc(lf) + '" target="_blank" rel="noopener">' + esc(TEXT.history) + "</a>" : "<span></span>") +
      (spUrl ? '<a href="' + esc(spUrl) + '" target="_blank" rel="noopener">' + esc(TEXT.follow) + "</a>" : "") + "</div>";
  }
  function fullTopHtml() {
    return '<button class="zi-close" type="button" aria-label="' + esc(TEXT.close) + '"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>' + headerHtml();
  }
  function fullBottomHtml() {
    var lists = S.lists.filter(function (l) { return l.tracks && l.tracks.length; });
    if (S.tab >= lists.length) S.tab = 0;
    var tabs = lists.length > 1 ? '<div class="zi-sleeves" role="tablist" aria-label="' + esc(TEXT.playlists) + '">' + lists.map(function (l, i) {
      return '<button class="zi-sleeve" role="tab" type="button" data-tab="' + i + '" aria-selected="' + (i === S.tab) + '"><span class="zi-fan" aria-hidden="true">' +
        l.tracks.slice(0, 3).map(function (t) { return art(t, "zi-art-fan"); }).join("") + '</span><span class="zi-sleeve-name">' + esc(listName(l)) + "</span></button>";
    }).join("") + "</div>" : "";
    var list = lists[S.tab];
    var listUrl = list && safeUrl(list.url);
    var head = list && list.kind === "artist" ? artistHtml(list) : list && (lists.length === 1 || listUrl) ? '<div class="zi-list-hd">' + (lists.length === 1 ? '<span class="zi-list-name"><span class="zi-fan zi-fan-sm" aria-hidden="true">' + list.tracks.slice(0, 3).map(function (t) { return art(t, "zi-art-fan"); }).join("") + "</span>" + esc(listName(list)) + "</span>" : "<span></span>") +
      (listUrl ? '<a href="' + esc(listUrl) + '" target="_blank" rel="noopener">' + esc(TEXT.openIn + " " + (SOURCE[list.source] || "")) + "</a>" : "") + "</div>" : "";
    return tabs + head + (list ? '<div class="zi-list" role="tabpanel">' + rowsHtml(list, S.lists.indexOf(list)) + "</div>" : "") + footHtml();
  }

  /* ---------- Mount and paint ---------- */
  function mount() {
    var root = document.createElement("div");
    root.className = "zi no-anim";
    root.hidden = true;
    root.dataset.view = "compact";
    root.setAttribute("lang", LANG);
    root.innerHTML = '<div class="zi-body"><button class="zi-hit" type="button" aria-expanded="false"></button>' +
      '<button class="zi-quick" type="button" hidden></button>' +
      '<div class="zi-layer zi-compact"></div>' +
      '<div class="zi-layer zi-full" inert><div class="zi-full-top"></div><div class="zi-player-slot"></div><div class="zi-full-bottom"></div></div></div><span class="zi-sr" aria-live="polite"></span>';
    document.body.appendChild(root);
    el = { root: root, body: root.querySelector(".zi-body"), hit: root.querySelector(".zi-hit"), compact: root.querySelector(".zi-compact"), full: root.querySelector(".zi-full"),
      top: root.querySelector(".zi-full-top"), bottom: root.querySelector(".zi-full-bottom"), live: root.querySelector(".zi-sr"),
      quick: root.querySelector(".zi-quick") };

    el.hit.addEventListener("click", function () { clearTimeout(hoverTimer); S.byHover = false; setView("full"); var f = el.full.querySelector(".zi-along, .zi-sleeve, .zi-play, .zi-row-text"); if (f) f.focus({ preventScroll: true }); });
    root.addEventListener("click", onClick);
    if (canHover) {
      /* Hover opens the panel after a short intent delay; a panel opened by hover closes when the pointer leaves. */
      /* The play control on the notch never opens the panel, so a visitor can reach it without the panel jumping open. */
      root.addEventListener("pointermove", function (e) {
        if (S.view === "full") { clearTimeout(hoverTimer); hoverTimer = null; return; }
        if (e.target.closest && e.target.closest(".zi-quick")) { clearTimeout(hoverTimer); hoverTimer = null; return; }
        if (!hoverTimer) hoverTimer = setTimeout(function () { hoverTimer = null; S.byHover = true; setView("full"); }, 160);
      });
      root.addEventListener("pointerleave", function () {
        clearTimeout(hoverTimer);
        hoverTimer = null;
        if (S.view === "full" && S.byHover) hoverTimer = setTimeout(function () { hoverTimer = null; setView("compact"); }, 360);
      });
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && S.view === "full") { setView("compact"); el.hit.focus({ preventScroll: true }); } });
    document.addEventListener("pointerdown", function (e) { if (S.view === "full" && !root.contains(e.target)) setView("compact"); });
    window.addEventListener("resize", function () { pin(); size(); });
    if (window.visualViewport) { visualViewport.addEventListener("resize", function () { pin(); size(); }); visualViewport.addEventListener("scroll", pin); }
  }

  function paint(changed) {
    el.compact.innerHTML = compactHtml();
    syncQuick();
    /* The player slot is never re-rendered here, so a visitor's song keeps playing through refreshes. */
    el.top.innerHTML = fullTopHtml();
    el.bottom.innerHTML = fullBottomHtml();
    syncButtons();
    var t = current();
    el.hit.setAttribute("aria-label", (t ? (isPlaying() ? TEXT.nowPlaying : TEXT.lastPlayed) + ": " + t.title + ", " + t.artist + ". " : "") + TEXT.open);
    if (changed) el.live.textContent = t && isPlaying() ? TEXT.nowPlaying + ": " + t.title + ", " + t.artist : "";
    el.root.dataset.state = isPlaying() ? "playing" : "idle";
    tick();
    size();
    applyColor();
  }
  function size() {
    if (!el.root || el.root.hidden) return;
    var l = S.view === "full" ? el.full : el.compact;
    el.body.style.width = l.offsetWidth + "px";
    el.body.style.height = l.offsetHeight + "px";
  }
  function setView(v) {
    if (v === S.view || !el.root) return;
    el.root.dataset.motion = v === "full" ? "open" : "close";
    if (v !== "full") S.byHover = false;
    S.view = v;
    el.root.dataset.view = v;
    el.full.inert = v !== "full";
    el.hit.setAttribute("aria-expanded", String(v === "full"));
    el.hit.tabIndex = v === "full" ? -1 : 0;
    size();
  }
  function setMuted(m) {
    if (!S.playing) return;
    if (S.playing.source === "preview" && au) {
      au.muted = m;
      if (!m && au.paused && au.getAttribute("src")) playAudio();
    } else try {
      if (yt.player) {
        if (m) yt.player.mute(); else { yt.player.unMute(); yt.player.setVolume(100); }
        if (!m && yt.player.getPlayerState && yt.player.getPlayerState() !== 1) yt.player.playVideo();
      }
    } catch (e) {}
    S.playing.muted = m;
    S.playing.paused = false;
    if (!m) { S.optOut = false; if (S.playing.source === "full") watchStart(); else measureBpm(S.playing.track, au && au.src); }
    emit(true);
    setNotes();
    refreshCompact();
  }
  function quickToggle() {
    /* With me playing, my song already plays silently: the notch only switches the sound. */
    if (S.playing && S.playing.along && !S.playing.paused) { setMuted(!S.playing.muted); return; }
    if (S.playing) { if (S.playing.paused) resumePlayer(); else pausePlayer(); return; }
    unlock();
    if (isPlaying() && previewable(current())) playPreview(current(), "now", "along", false, false);
    else startShuffle();
    schedule();
  }
  function onClick(e) {
    if (e.target.closest(".zi-quick")) { clearTimeout(hoverTimer); hoverTimer = null; quickToggle(); return; }
    S.byHover = false;
    if (e.target.closest("[data-mine]")) {
      if (S.playing && S.playing.mode === "shuffle") stopPlayer(); else { unlock(); startShuffle(); }
      return;
    }
    if (e.target.closest("[data-fullsong]")) { if (S.playing) playFull(S.playing.track); schedule(); return; }
    if (e.target.closest("[data-stop]")) { stopPlayer(); return; }
    if (e.target.closest("[data-pv]")) {
      if (!S.playing) return;
      if (S.playing.paused || S.playing.blocked) { if (au && au.getAttribute("src")) { au.muted = false; S.playing.muted = false; playAudio(); } }
      else pausePlayer();
      return;
    }
    if (e.target.closest(".zi-close")) { setView("compact"); el.hit.focus({ preventScroll: true }); return; }
    var tab = e.target.closest("[data-tab]");
    if (tab) {
      S.tab = +tab.getAttribute("data-tab");
      paint(false);
      var sel = el.full.querySelector('[data-tab="' + S.tab + '"]'); if (sel) sel.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest("[data-along]")) {
      if (S.playing && S.playing.along && S.playing.muted) setMuted(false);
      else if (S.playing && S.playing.along) { S.optOut = true; stopPlayer(); }
      else if (isPlaying() && playable(current())) { unlock(); playPreview(current(), "now", "along", false, true); }
      schedule();
      return;
    }
    var play = e.target.closest("[data-play]");
    if (play) {
      var ref = play.getAttribute("data-play");
      if (S.playing && !S.playing.along && S.playing.ref === ref) { stopPlayer(); return; }
      var p = ref.split(":"), t = S.lists[+p[0]] && S.lists[+p[0]].tracks[+p[1]];
      if (t) {
        if (previewable(t)) { unlock(); playPreview(t, ref, "list", false, true); }
        else { S.playing = { ref: ref, track: t, mode: "list" }; playFull(t); }
      }
      schedule();
    }
  }

  /* ---------- Keep the island visible and true-size when the page is zoomed out (the site lays out at 1000px on phones) ---------- */
  function pin() {
    var vv = window.visualViewport;
    if (!vv || !el.root) return;
    var k = 1 / vv.scale, vw = vv.width * vv.scale, vh = vv.height * vv.scale;
    var scaled = Math.abs(vv.scale - 1) > 0.001 || vv.offsetLeft !== 0 || vv.offsetTop !== 0 || Math.abs(document.documentElement.clientWidth - vv.width) > 1;
    S.k = k;
    el.root.style.setProperty("--zi-vw", vw + "px");
    el.root.style.setProperty("--zi-vh", vh + "px");
    el.root.classList.toggle("is-phone", vw <= 720);
    if (!scaled) { el.root.style.left = el.root.style.top = el.root.style.transform = el.root.style.transformOrigin = ""; return; }
    el.root.style.left = vv.offsetLeft + vv.width / 2 + "px";
    el.root.style.top = vv.offsetTop + "px";
    el.root.style.transform = "translateX(-50%) scale(" + k + ")";
    el.root.style.transformOrigin = "50% 0";
  }

  /* ---------- Play position, interpolated between polls ---------- */
  function tick() {
    if (!el.root || !isPlaying() || S.now.position == null) return;
    var pos = Math.min(S.now.duration, S.now.position + (Date.now() - S.fetchedAt));
    var now = el.root.querySelector(".zi-now"), fill = el.root.querySelector(".zi-track-bar b");
    if (now) now.textContent = mmss(pos);
    if (fill) { var pct = (pos / S.now.duration) * 100; fill.style.width = pct + "%"; fill.parentNode.setAttribute("aria-valuenow", Math.round(pct)); }
  }
  setInterval(tick, 1000);

  /* ---------- Data ---------- */
  function getJSON(path) {
    return fetch(ENDPOINT + path, { credentials: "omit", cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function loadNow() {
    return getJSON("/now").then(function (d) {
      if (!d || typeof d !== "object") return;
      var key = trackKey(d.track) + (d.playing ? ">" : "");
      var changed = key !== S.key;
      var trackChanged = trackKey(d.track) !== trackKey(current());
      S.now = d; S.fetchedAt = Date.now(); S.key = key;
      if (el.root.hidden) {
        el.root.hidden = false;
        pin(); paint(true);
        autoStart();
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.root.classList.remove("no-anim"); }); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
        return;
      }
      /* Listening along: an audible song is never cut (my new track plays next). The silent player follows me at once. */
      if (S.playing && S.playing.along && S.playing.muted) {
        if (!isPlaying()) stopPlayer();
        else if (trackChanged && previewable(current())) playPreview(current(), "now", "along", true, false);
      } else if (changed && S.playing) { setNotes(); prefetchNext(); }
      autoStart();
      if (S.view === "full" && !changed) { tick(); return; }
      paint(changed);
      if (trackChanged && !reduced) { el.body.classList.remove("bump"); void el.body.offsetWidth; el.body.classList.add("bump"); }
    }).catch(function () { /* keep whatever is shown; stay hidden if nothing loaded yet */ });
  }
  /* When I am playing, start the visitor's player muted and in sync, so one tap on the notch gives sound.
     Not when the tab is hidden, the visitor asked to save data, or they switched listening off. */
  function autoStart() {
    if (S.playing || S.optOut || document.hidden || !isPlaying()) return;
    var t = current();
    if (!previewable(t) || trackKey(t) === S.autoDone) return;
    try { if (navigator.connection && navigator.connection.saveData) return; } catch (e) {}
    playPreview(t, "now", "along", true, false);
    schedule();
  }
  function loadLists() {
    return getJSON("/lists").then(function (d) {
      if (!d || !Array.isArray(d.lists)) return;
      S.lists = d.lists.filter(function (l) { return l && Array.isArray(l.tracks); });
      S.profile = d.profile || {};
      if (!el.root.hidden) paint(false);
    }).catch(function () {});
  }
  function schedule() {
    clearTimeout(pollTimer);
    if (document.hidden) return;
    /* While a visitor is listening, check more often, so a change on my side reaches them quickly. */
    pollTimer = setTimeout(function () { loadNow().then(schedule); }, S.playing ? ALONG_POLL_MS : POLL_MS);
  }
  document.addEventListener("visibilitychange", function () {
    var silent = S.playing && S.playing.muted && S.playing.source === "preview" && au;
    if (document.hidden) {
      clearTimeout(pollTimer);
      if (silent) { S.switching = true; au.pause(); S.switching = false; }
      return;
    }
    if (silent && au.getAttribute("src")) playAudio();
    loadNow().then(schedule);
  });

  function start() {
    mount();
    loadNow().then(function () { schedule(); loadLists(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
