/* Zetwin hero: shared engine. Video, clock, language, toast and motion helpers. */
(function () {
  "use strict";
  var D = window.HERO_DATA;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var H = (window.HERO = { D: D, lang: "en", reduced: reduced });

  /* ---------- Words. Content stays as on the live page; the interface is translated. ---------- */
  var WORDS = {
    en: {
      work: "Work", skills: "Skills", contact: "Contact", close: "Close", all: "All", projects: "Projects",
      next: "Next scene", dubai: "Dubai", archived: "Archived", open: "Open", copy: "Copy", copied: "Copied",
      lead: "Lead Software Engineer", places: "Ukraine, Cyprus, Dubai", designWork: "Design work",
      write: "Write", message: "Message", follow: "Follow", view: "View", inDubai: "in Dubai now",
      core: "Core stack", groups: "groups", images: "images", prev: "Previous image", nextImg: "Next image",
      email: "Email", reach: "Fastest reply on Telegram", skillsN: "skills", allSkills: "All skills",
      firstVersion: "First version", firstNote: "The original site I built by hand. Kept as it was."
    },
    uk: {
      work: "Роботи", skills: "Навички", contact: "Контакти", close: "Закрити", all: "Усе", projects: "Проєкти",
      next: "Наступна сцена", dubai: "Дубай", archived: "Архів", open: "Відкрити", copy: "Копіювати", copied: "Скопійовано",
      lead: "Lead Software Engineer", places: "Україна, Кіпр, Дубай", designWork: "Дизайн",
      write: "Написати", message: "Написати", follow: "Підписатися", view: "Переглянути", inDubai: "зараз у Дубаї",
      core: "Основний стек", groups: "груп", images: "зображень", prev: "Попереднє зображення", nextImg: "Наступне зображення",
      email: "Пошта", reach: "Найшвидше відповідаю в Telegram", skillsN: "навичок", allSkills: "Усі навички",
      firstVersion: "Перша версія", firstNote: "Оригінальний сайт, який я зробив власноруч. Залишено як було."
    }
  };
  H.t = function (k) { return (WORDS[H.lang] && WORDS[H.lang][k]) || WORDS.en[k] || k; };
  H.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  H.host = function (u) { try { return new URL(u).host.replace(/^www\./, ""); } catch (e) { return ""; } };
  H.letters = function (text) {
    return Array.from(text).map(function (ch, i) { return '<span class="ltr" style="--i:' + i + '">' + H.esc(ch) + "</span>"; }).join("");
  };

  /* ---------- Springs from real physics, as CSS linear() easings ---------- */
  function spring(stiffness, damping) {
    var w0 = Math.sqrt(stiffness), z = damping / (2 * Math.sqrt(stiffness)), wd = w0 * Math.sqrt(1 - z * z);
    var f = function (t) { return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); };
    var T = 0.1, t, i, pts = [];
    for (t = 0; t < 3; t += 0.01) { if (Math.abs(f(t) - 1) > 0.003) T = t; }
    T += 0.02;
    for (i = 0; i <= 48; i++) pts.push(+f((T * i) / 48).toFixed(4));
    pts[48] = 1;
    return { e: "linear(" + pts.join(",") + ")", d: Math.round(T * 1000) };
  }
  var linearOk = window.CSS && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)");
  /* Damping must stay below critical (2 x sqrt(stiffness)), or the curve is invalid and browsers fall back to a 0.1 s ease. */
  H.springs = { pop: spring(240, 24), glide: spring(170, 24), snap: spring(380, 36) };
  (function () {
    var r = document.documentElement.style;
    Object.keys(H.springs).forEach(function (k) {
      r.setProperty("--" + k, linearOk ? H.springs[k].e : "cubic-bezier(.2,.9,.25,1)");
      r.setProperty("--" + k + "-d", (reduced ? 1 : H.springs[k].d) + "ms");
    });
  })();

  /* ---------- Background video: two players, so one scene dissolves into the next ---------- */
  var bg = document.getElementById("bg");
  var frames = bg.querySelectorAll(".frame");
  var V = (H.video = { ids: null, index: 0, total: 0, players: [null, null], active: 0, busy: false, started: false });
  var FADE = reduced ? 10 : 1800;

  /* A scene is { id, start?, end? }: a slice of a YouTube video, in seconds. */
  function makePlayer(slot, sc, autoplay) {
    frames[slot].innerHTML = '<div id="yt' + slot + '"></div>';
    var vars = { autoplay: autoplay ? 1 : 0, mute: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, disablekb: 1, fs: 0, modestbranding: 1 };
    if (sc.start) vars.start = sc.start;
    if (sc.end) vars.end = sc.end;
    return new YT.Player("yt" + slot, {
      width: "100%", height: "100%", videoId: sc.id,
      playerVars: vars,
      events: {
        onReady: function (e) { e.target.mute(); if (autoplay) e.target.playVideo(); },
        onStateChange: function (e) { onState(slot, e); },
        /* A video that was deleted or can no longer be embedded is skipped, never shown as a black screen. */
        onError: function () { onBroken(slot); }
      }
    });
  }
  var holdTimer;
  function onState(slot, e) {
    var s = e.data;
    if (slot === V.active) {
      clearTimeout(holdTimer);
      if (s === 1) {
        /* YouTube flashes a play icon as a video starts; show the footage just after it. */
        holdTimer = setTimeout(function () {
          frames[slot].classList.add("on");
          bg.classList.add("live");
          bg.classList.remove("hold", "poster-on");
          V.started = true;
        }, V.started ? 0 : 900);
      } else if (s === 2 || s === 3) {
        holdTimer = setTimeout(function () { bg.classList.add("hold"); }, 400);
      } else if (s === 0 && !V.busy) go(1);
    } else if (V.busy && s === 1) {
      setTimeout(crossfade, reduced ? 0 : 700);
    }
  }
  function onBroken(slot) {
    /* Only the scene on screen, or the one being loaded next, counts; the idle second player is ignored. */
    var showing = slot === V.active && !V.busy, loading = slot !== V.active && V.busy;
    if (!V.ids || !(showing || loading)) return;
    if (V.total < 2) { bg.classList.add("poster-on"); return; }
    V.ids.splice(V.index, 1);
    V.total = V.ids.length;
    V.index = (V.index - 1 + V.total) % V.total;
    if (loading) { V.busy = false; clearTimeout(safety); }
    go(1);
  }
  var safety;
  function go(dir) {
    if (!V.ids || V.busy) return;
    V.busy = true;
    V.index = (V.index + dir + V.total) % V.total;
    var next = 1 - V.active;
    var sc = V.ids[V.index];
    V.players[next].loadVideoById({ videoId: sc.id, startSeconds: sc.start || 0, endSeconds: sc.end });
    clearTimeout(safety);
    safety = setTimeout(function () { if (V.busy) crossfade(); }, 7000);
  }
  function crossfade() {
    if (!V.busy) return;
    clearTimeout(safety);
    var cur = V.active, next = 1 - cur;
    frames[next].classList.add("on");
    frames[cur].classList.remove("on");
    V.active = next;
    bg.classList.remove("hold");
    setTimeout(function () {
      try { V.players[cur].pauseVideo(); } catch (e) {}
      V.busy = false;
    }, FADE);
  }
  H.nextScene = function () { go(1); };
  /* Start the next scene a moment before this one ends, so the cut is a dissolve.
     Long videos end with YouTube's end screen (subscribe button, channel links) over the last 20 seconds: leave before it. */
  setInterval(function () {
    var p = V.players[V.active];
    if (!p || !p.getDuration || V.busy || document.hidden) return;
    try {
      var d = p.getDuration(), c = p.getCurrentTime(), sc = V.ids[V.index] || {};
      var left = (sc.end || d) - c;
      if (d > 8 && left < (sc.end ? 3 : d > 45 ? 22 : 3)) go(1);
    } catch (e) {}
  }, 500);

  function begin(scenes) {
    V.ids = scenes;
    /* Shuffle, and shuffle again if two slices of the same film would play back to back. */
    var clash = function () { for (var a = 1; a < V.ids.length; a++) if (V.ids[a].id === V.ids[a - 1].id) return true; return false; };
    var tries = 0;
    do {
      for (var i = V.ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = V.ids[i]; V.ids[i] = V.ids[j]; V.ids[j] = x; }
    } while (clash() && ++tries < 30);
    V.total = V.ids.length;
    V.players[0] = makePlayer(0, V.ids[0], true);
    V.players[1] = makePlayer(1, V.ids[1 % V.total], false);
  }
  window.onYouTubeIframeAPIReady = function () {
    /* A fixed list of scenes in content.js wins; otherwise the YouTube playlist is read. */
    var fixed = (D.scenes || []).filter(function (x) { return x && /^[\w-]{11}$/.test(x.id); });
    if (fixed.length) { begin(fixed.map(function (x) { return { id: x.id, start: x.start, end: x.end }; })); return; }
    /* Read the playlist once with a throwaway player, then run two single-video players (no YouTube buttons on top). */
    frames[0].innerHTML = '<div id="ytlist"></div>';
    var reader = new YT.Player("ytlist", {
      width: "100%", height: "100%",
      playerVars: { listType: "playlist", list: D.playlist, autoplay: 0, mute: 1, controls: 0 },
      events: {
        onReady: function () {
          var tries = 0;
          (function wait() {
            var list = reader.getPlaylist && reader.getPlaylist();
            if (list && list.length) {
              try { reader.destroy(); } catch (e) {}
              begin(list.map(function (id) { return { id: id }; }));
            } else if (++tries < 24) setTimeout(wait, 250);
            else bg.classList.add("poster-on");
          })();
        }
      }
    });
  };
  /* Light mode: with Data Saver, a 2G connection, 2 GB of memory or less, or 2 CPU cores or fewer, the page keeps the still
     poster and never loads YouTube (two players are the heaviest part of the page). The "next scene" button still starts it. */
  var conn = navigator.connection || {};
  H.light = !!(conn.saveData || /2g$/.test(conn.effectiveType || "") || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  var videoAsked = false;
  function startVideo() {
    if (videoAsked) return;
    videoAsked = true;
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = function () { bg.classList.add("poster-on"); };
    document.head.appendChild(s);
    setTimeout(function () { if (!V.started) bg.classList.add("poster-on"); }, 7000);
  }
  var nextScene = H.nextScene;
  H.nextScene = function () { if (!videoAsked) { bg.classList.add("poster-on"); startVideo(); } else nextScene(); };
  if (H.light) bg.classList.add("poster-on");
  else {
    /* YouTube waits until the page itself has loaded and the browser is idle, so the name and buttons come first. */
    var later = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(startVideo, { timeout: 1500 }); };
    if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    document.addEventListener(ev, function () {
      var p = V.players[V.active];
      if (p && p.playVideo && !V.started) { p.mute(); p.playVideo(); }
    }, { once: true, passive: true });
  });
  /* A hidden tab does not need to stream or decode video. */
  document.addEventListener("visibilitychange", function () {
    var p = V.players[V.active];
    if (!p || !p.pauseVideo || !V.started) return;
    try { if (document.hidden) p.pauseVideo(); else { p.mute(); p.playVideo(); } } catch (e) {}
  });

  /* ---------- Page state: the video dims and steps back while a page is open ---------- */
  H.setOpen = function (on) { document.body.classList.toggle("is-open", !!on); };

  /* ---------- Clock, toast, copy ---------- */
  H.clock = function () {
    try { return new Intl.DateTimeFormat(H.lang === "uk" ? "uk-UA" : "en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }).format(new Date()); } catch (e) { return ""; }
  };
  setInterval(function () { document.querySelectorAll("[data-clock]").forEach(function (n) { n.textContent = H.clock(); }); }, 10000);
  var toastTimer;
  H.toast = function (msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("on"); }, 1800);
  };
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) {
      e.preventDefault();
      var v = c.getAttribute("data-copy");
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { H.toast(H.t("copied") + ": " + v); }, function () { H.toast(v); });
    }
    if (e.target.closest("[data-next]")) H.nextScene();
  });

  H.topbar = function () {
    return '<div class="tb" data-in style="--d:7">' +
      '<span class="tb-clock"><span>' + H.esc(H.t("dubai")) + '</span> <b data-clock>' + H.clock() + "</b></span>" +
      '<div class="tb-lang" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="' + (H.lang === "en") + '">EN</button><button type="button" data-lang="uk" aria-pressed="' + (H.lang === "uk") + '">UA</button></div>' +
      '<button class="tb-scene" type="button" data-next aria-label="' + H.esc(H.t("next")) + '"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4.5v11l8-5.5zM15 4.5v11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
  };
})();
