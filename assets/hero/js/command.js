/* Zetwin hero (Command): one calm screen. Three pages, each shaped for its job:
   Work is a full canvas you scroll, Skills is a bento sheet that rises from the bottom, Contact is a card of one-tap actions. */
(function () {
  "use strict";
  var H = window.HERO, D = H.D, esc = H.esc, t = H.t;
  var ui = document.getElementById("ui");
  var cur = null, trigger = null, workFilter = "all", lb = null;

  var IC = {
    work: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    skills: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V11M10 19V5M16 19v-6M22 19H2"/></svg>',
    contact: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/></svg>',
    close: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    left: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5"/></svg>',
    right: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.7 3.6 2.9 10.5c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.4c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8L22 5c.3-1.3-.5-1.9-1.3-1.4zM8.3 13.1l9.6-6.1c.5-.3.9-.1.5.2l-8 7.3-.3 3.3-1.8-4.7z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6zM8 19H5V9.5h3V19zM6.5 8.2a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5zM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5S12.8 13 12.8 14.3V19h-3V9.5h2.9v1.3c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.6 2 3.6 4.7V19z"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z"/></svg>'
  };
  /* Skill group icons, in the order of the live page's skill groups. */
  var GI = [
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5"/>',
    '<rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01"/>',
    '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    '<path d="M13 3L5 13.5h6.5L11 21l8-10.5h-6.5z"/>',
    '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.5 3.8 3.8 0 0 1-.5 7.5z"/>',
    '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.3-7.5 9.5-4.3-1.2-7.5-5-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5l3 8.5M16 7.5l-3 8.5M8.5 6h7"/>',
    '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
    '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'
  ];
  function gi(i) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (GI[i] || GI[0]) + "</svg>"; }
  var contact = {};
  D.contacts.forEach(function (c) { contact[c.id] = c; });

  /* ---------- Home ---------- */
  function home() {
    var p = D.person;
    return H.topbar() +
      '<div class="home">' +
      '<img class="ava" src="' + esc(p.avatar) + '" alt="" data-in style="--d:0">' +
      '<h1 class="name-h" aria-label="' + esc(p.name) + '">' + H.letters(p.name) + "</h1>" +
      '<p class="name-sub" data-in style="--d:3">' + esc(t("lead")) + "</p>" +
      '<p class="name-places" data-in style="--d:3.6"><i class="live-dot"></i>' + esc(t("places")) + "</p>" +
      '<nav class="home-nav" aria-label="Sections">' + ["work", "skills", "contact"].map(function (s, i) {
        return '<button class="hn-btn" type="button" data-page="' + s + '" aria-expanded="false" data-in style="--d:' + (4.6 + i * 0.5) + '">' + IC[s] + "<span>" + esc(t(s)) + "</span></button>";
      }).join("") + "</nav>" +
      '<div class="quick" data-in style="--d:6.4">' +
      '<a class="q-btn" href="' + esc(contact.telegram.url) + '" target="_blank" rel="noopener" aria-label="Telegram ' + esc(contact.telegram.value) + '">' + IC.telegram + "</a>" +
      '<a class="q-btn" href="' + esc(contact.linkedin.url) + '" target="_blank" rel="noopener" aria-label="LinkedIn">' + IC.linkedin + "</a>" +
      '<a class="q-btn" href="' + esc(contact.github.url) + '" target="_blank" rel="noopener" aria-label="GitHub">' + IC.github + "</a>" +
      '<button class="q-btn q-mail" type="button" data-copy="' + esc(contact.email.value) + '" aria-label="' + esc(t("copy") + " " + contact.email.value) + '">' + IC.email + "<span>" + esc(contact.email.value) + "</span></button>" +
      "</div></div>" +
      '<div class="veil" aria-hidden="true"></div>' +
      '<section class="page page-work" hidden role="dialog" aria-modal="true" aria-labelledby="pg-work"></section>' +
      '<section class="page page-skills" hidden role="dialog" aria-modal="true" aria-labelledby="pg-skills"></section>' +
      '<section class="page page-contact" hidden role="dialog" aria-modal="true" aria-labelledby="pg-contact"></section>' +
      '<div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Image viewer"></div>';
  }
  function head(id, extra) {
    return '<header class="pg-head"><div class="pg-title-row"><h2 class="pg-title" id="pg-' + id + '" tabindex="-1">' + esc(t(id)) + "</h2>" + (extra || "") +
      '<button class="pg-close" type="button" data-close aria-label="' + esc(t("close")) + '">' + IC.close + "</button></div>";
  }

  /* ---------- Work: everything on one canvas, filters instead of extra clicks ---------- */
  function workFilters() {
    var f = [{ id: "all", label: t("all") }, { id: "projects", label: t("projects") }].concat(D.works.map(function (w, i) { return { id: "w" + i, label: w.name }; }));
    return '<div class="filters" role="group" aria-label="Filter">' + f.map(function (x) {
      return '<button class="flt" type="button" data-filter="' + x.id + '" aria-pressed="' + (x.id === workFilter) + '">' + esc(x.label) + "</button>";
    }).join("") + "</div>";
  }
  function workBody() {
    var out = "";
    if (workFilter === "all" || workFilter === "projects") {
      out += '<section class="wk-sec"><h3 class="wk-h">' + esc(t("projects")) + '</h3><div class="proj-grid">' + D.projects.map(function (p, i) {
        var note = p.live ? p.note : t("archived");
        var inner = '<img src="' + esc(p.icon) + '" alt=""><span class="pj-name">' + esc(p.name) + "</span>" + (note ? '<span class="pj-note">' + esc(note) + "</span>" : "") +
          (p.live ? '<span class="pj-host">' + esc(H.host(p.url)) + "</span>" : "");
        return p.live ? '<a class="pj" style="--i:' + i + '" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + inner + "</a>" : '<div class="pj is-off" style="--i:' + i + '">' + inner + "</div>";
      }).join("") + "</div></section>";
    }
    D.works.forEach(function (w, wi) {
      if (workFilter !== "all" && workFilter !== "w" + wi) return;
      out += '<section class="wk-sec"><div class="wk-sec-head"><h3 class="wk-h">' + esc(w.name) + '</h3><span class="wk-n">' + w.images.length + " " + esc(t("images")) + "</span></div>" +
        (w.desc ? '<p class="wk-desc">' + esc(w.desc) + "</p>" : "") +
        '<div class="tile-grid">' + w.images.map(function (im, ii) {
          return '<button class="tile" type="button" style="--i:' + Math.min(ii, 12) + '" data-lb="' + wi + ":" + ii + '" aria-label="' + esc(w.name + " " + (ii + 1)) + '"><img src="' + esc(im.thumb) + '" alt="" loading="lazy"></button>';
        }).join("") + "</div></section>";
    });
    if (workFilter === "all") {
      out += '<section class="wk-sec"><h3 class="wk-h">' + esc(t("firstVersion")) + '</h3><div class="proj-grid"><a class="pj" href="' + (H.lang === "uk" ? "/v1/ua/" : "/v1/") + '">' +
        '<img src="/assets/images/zetwin-ava.png" alt=""><span class="pj-name">zetwin.github.io</span><span class="pj-note">' + esc(t("firstNote")) + "</span></a></div></section>";
    }
    return out;
  }
  function renderWork() {
    var total = D.works.reduce(function (n, w) { return n + w.images.length; }, 0);
    return head("work", '<span class="pg-count">' + D.projects.length + " " + esc(t("projects")).toLowerCase() + ", " + total + " " + esc(t("images")) + "</span>") + workFilters() + "</header>" +
      '<div class="pg-scroll"><div class="wk-body">' + workBody() + "</div></div>";
  }
  function setFilter(f) {
    workFilter = f;
    var page = ui.querySelector(".page-work"), body = page.querySelector(".wk-body"), sc = page.querySelector(".pg-scroll");
    page.querySelectorAll("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === f)); });
    body.classList.add("is-out");
    setTimeout(function () {
      body.innerHTML = workBody();
      sc.scrollTop = 0;
      body.classList.remove("is-out");
    }, H.reduced ? 0 : 160);
  }

  /* ---------- Skills: the core stack as real logos, then every group as a clean grouped list ---------- */
  var LOGOS = [
    ["React", "react", "#61DAFB"], ["TypeScript", "typescript", "#3178C6"], ["JavaScript", "javascript", "#F7DF1E"],
    ["Node.js", "nodedotjs", "#5FA04E"], ["Next.js", "nextdotjs", "ink"], ["Python", "python", "#3776AB"],
    ["FastAPI", "fastapi", "#009688"], ["PHP", "php", "#777BB4"], ["PostgreSQL", "postgresql", "#4169E1"],
    ["MySQL", "mysql", "#4479A1"], ["Redis", "redis", "#FF4438"], ["GraphQL", "graphql", "#E10098"],
    ["Docker", "docker", "#2496ED"], ["NGINX", "nginx", "#009639"], ["Linux", "linux", "ink"],
    ["Cloudflare", "cloudflare", "#F38020"], ["Git", "git", "#F05032"], ["Figma", "figma", "#F24E1E"], ["Tailwind CSS", "tailwindcss", "#06B6D4"]
  ];
  /* iOS Settings style colours, one per skill group. */
  var GROUP_COLORS = ["#0a84ff", "#5e5ce6", "#30b158", "#ff9f0a", "#ff375f", "#64d2ff", "#ff453a", "#bf5af2", "#32d7c4", "#8e8e93"];
  function renderSkills() {
    var known = {};
    D.drum.concat.apply(D.drum, D.skills.map(function (g) { return g.tags; })).forEach(function (x) { known[x.toLowerCase()] = true; });
    var logos = LOGOS.filter(function (l) { return known[l[0].toLowerCase()]; });
    var total = D.skills.reduce(function (n, g) { return n + g.tags.length; }, 0);
    return head("skills", '<span class="pg-count">' + total + " " + esc(t("skillsN")) + ", " + D.skills.length + " " + esc(t("groups")) + "</span>") + "</header>" +
      '<div class="pg-scroll"><div class="sk">' +
      '<section class="sk-sec"><h3 class="sk-h">' + esc(t("core")) + '</h3><div class="logo-grid">' + logos.map(function (l, i) {
        return '<div class="lg" style="--i:' + i + '"><span class="lg-tile"><span class="lg-ic" style="-webkit-mask-image:url(/assets/hero/img/logos/' + l[1] + '.svg);mask-image:url(/assets/hero/img/logos/' + l[1] + ".svg);" + (l[2] === "ink" ? "" : "--c:" + l[2]) + '"></span></span><span class="lg-name">' + esc(l[0]) + "</span></div>";
      }).join("") + "</div></section>" +
      '<section class="sk-sec"><h3 class="sk-h">' + esc(t("allSkills")) + '</h3><div class="groups">' + D.skills.map(function (g, i) {
        return '<article class="grp" style="--i:' + i + ";--gc:" + GROUP_COLORS[i % GROUP_COLORS.length] + '"><header class="grp-head"><span class="grp-ic">' + gi(i) + '</span><h4>' + esc(g.name) + '</h4><span class="grp-n">' + g.tags.length + "</span></header>" +
          "<ul>" + g.tags.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></article>";
      }).join("") + "</div></section></div></div>";
  }

  /* ---------- Contact: one card, every action one tap ---------- */
  function renderContact() {
    var p = D.person, e = contact.email, tg = contact.telegram, li = contact.linkedin, gh = contact.github, fb = contact.facebook;
    return head("contact") + "</header>" +
      '<div class="ct-id"><img class="ava" src="' + esc(p.avatar) + '" alt=""><div><p class="ct-name">' + esc(p.name) + '</p><p class="ct-role">' + esc(t("lead")) + '</p>' +
      '<p class="ct-time"><i class="live-dot"></i><b data-clock>' + H.clock() + "</b> " + esc(t("inDubai")) + "</p></div></div>" +
      '<div class="ct-grid">' +
      '<div class="ct-tile ct-mail" style="--i:0"><span class="ct-ic">' + IC.email + '</span><span class="ct-k">' + esc(t("email")) + '</span><span class="ct-v">' + esc(e.value) + "</span>" +
      '<span class="ct-acts"><a class="ct-btn ct-btn-main" href="' + esc(e.url) + '">' + esc(t("write")) + '</a><button class="ct-btn" type="button" data-copy="' + esc(e.value) + '">' + esc(t("copy")) + "</button></span></div>" +
      '<a class="ct-tile ct-tg" style="--i:1" href="' + esc(tg.url) + '" target="_blank" rel="noopener"><span class="ct-ic">' + IC.telegram + '</span><span class="ct-k">Telegram</span><span class="ct-v">' + esc(tg.value) + "</span></a>" +
      '<a class="ct-tile ct-li" style="--i:2" href="' + esc(li.url) + '" target="_blank" rel="noopener"><span class="ct-ic">' + IC.linkedin + '</span><span class="ct-k">LinkedIn</span><span class="ct-v">' + esc(li.value) + "</span></a>" +
      '<a class="ct-tile ct-gh" style="--i:3" href="' + esc(gh.url) + '" target="_blank" rel="noopener"><span class="ct-ic">' + IC.github + '</span><span class="ct-k">GitHub</span><span class="ct-v">' + esc(gh.value) + "</span></a>" +
      '<a class="ct-tile ct-fb" style="--i:4" href="' + esc(fb.url) + '" target="_blank" rel="noopener"><span class="ct-ic">' + IC.facebook + '</span><span class="ct-k">Facebook</span><span class="ct-v">' + esc(fb.value) + "</span></a>" +
      "</div>";
  }

  var RENDER = { work: renderWork, skills: renderSkills, contact: renderContact };

  /* ---------- Open and close, App Store style: the button grows into the page.
     Only the frame animates (size, corners, colour); the content is pinned at its final size and fades in, so nothing reflows. ---------- */
  function box(el, r, radius, bg) {
    el.style.left = r.left + "px"; el.style.top = r.top + "px";
    el.style.width = r.width + "px"; el.style.height = r.height + "px";
    el.style.right = "auto"; el.style.bottom = "auto"; el.style.margin = "0"; el.style.translate = "none";
    el.style.borderRadius = radius;
    if (bg) el.style.backgroundColor = bg;
  }
  function clearBox(el) { ["left", "top", "width", "height", "right", "bottom", "margin", "translate", "borderRadius", "backgroundColor", "transition"].forEach(function (k) { el.style[k] = ""; }); }
  var morphTimer;
  function morph(page, fromRect, toRect, r0, r1, bg0, bg1, sp, done, fade, source) {
    var inner = page.querySelector(".pg-in");
    var pin = toRect.width >= fromRect.width ? toRect : fromRect;
    inner.style.width = pin.width + "px"; inner.style.height = pin.height + "px";
    page.classList.add("morphing");
    page.style.transition = "none";
    box(page, fromRect, r0, bg0);
    void page.offsetWidth;
    var tr = sp.d + "ms " + (H.reduced ? "linear" : getComputedStyle(document.documentElement).getPropertyValue(sp === H.springs.pop ? "--pop" : "--snap"));
    page.style.transition = ["left", "top", "width", "height", "border-radius"].map(function (p) { return p + " " + tr; }).join(", ") + ", background-color " + Math.round(sp.d * 0.6) + "ms ease";
    box(page, toRect, r1, bg1);
    /* Blend with the button instead of cutting: opening, the button fades as the frame appears;
       closing, the frame fades out over the last part while the button fades back in under it. */
    page.getAnimations().forEach(function (a) { if (a.id === "blend") a.cancel(); });
    if (!H.reduced && page.animate) {
      var a = page.animate(fade === "in" ? [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }],
        { duration: sp.d, easing: "linear", fill: "forwards" });
      a.id = "blend";
    }
    if (source && fade === "out") setTimeout(function () { source.classList.remove("is-source"); }, H.reduced ? 0 : sp.d * 0.35);
    clearTimeout(morphTimer);
    morphTimer = setTimeout(function () {
      page.classList.remove("morphing");
      inner.style.width = inner.style.height = "";
      done();
    }, H.reduced ? 10 : sp.d + 30);
  }
  function openPage(id, from) {
    if (cur === id) return closePage();
    if (cur) closePage(true);
    cur = id; trigger = from;
    var page = ui.querySelector(".page-" + id);
    page.innerHTML = '<div class="pg-in">' + RENDER[id]() + "</div>";
    page.hidden = false;
    clearBox(page);
    var cs = getComputedStyle(page), finalRect = page.getBoundingClientRect(), r1 = cs.borderRadius, bg1 = cs.backgroundColor;
    var fs = getComputedStyle(from), startRect = from.getBoundingClientRect();
    from.classList.add("is-source");
    ui.classList.add("has-page");
    H.setOpen(true);
    ui.querySelectorAll("[data-page]").forEach(function (b) { b.setAttribute("aria-expanded", String(b.getAttribute("data-page") === id)); });
    page.classList.add("is-on");
    morph(page, startRect, finalRect, fs.borderRadius, r1, "rgb(28, 31, 38)", bg1, H.springs.pop, function () {
      if (cur === id) { clearBox(page); page.getAnimations().forEach(function (a) { if (a.id === "blend") a.cancel(); }); }
    }, "in", from);
    setTimeout(function () { var title = page.querySelector(".pg-title"); if (title && cur === id) title.focus({ preventScroll: true }); }, 60);
  }
  function closePage(swap) {
    if (!cur) return;
    var page = ui.querySelector(".page-" + cur), from = trigger;
    cur = null;
    ui.querySelectorAll("[data-page]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    var cs = getComputedStyle(page), startRect = page.getBoundingClientRect();
    var endRect = from.getBoundingClientRect(), r0 = cs.borderRadius;
    page.classList.remove("is-on");
    if (!swap) { ui.classList.remove("has-page"); H.setOpen(false); }
    morph(page, startRect, endRect, r0, getComputedStyle(from).borderRadius, cs.backgroundColor, "rgb(28, 31, 38)", H.springs.snap, function () {
      if (page.classList.contains("is-on")) return;
      page.hidden = true; page.innerHTML = ""; clearBox(page);
      page.getAnimations().forEach(function (a) { if (a.id === "blend") a.cancel(); });
      from.classList.remove("is-source");
      if (!swap) from.focus({ preventScroll: true });
    }, "out", from);
  }

  /* ---------- Lightbox for design work ---------- */
  function openLb(wi, ii) {
    lb = { wi: wi, ii: ii };
    var box = ui.querySelector(".lightbox");
    box.hidden = false;
    paintLb(true);
    void box.offsetWidth;
    box.classList.add("is-on");
    box.querySelector(".lb-close").focus({ preventScroll: true });
  }
  function paintLb(first) {
    var w = D.works[lb.wi], im = w.images[lb.ii], box = ui.querySelector(".lightbox");
    if (first) {
      box.innerHTML = '<button class="lb-close" type="button" data-lb-close aria-label="' + esc(t("close")) + '">' + IC.close + "</button>" +
        '<button class="lb-nav lb-prev" type="button" data-lb-step="-1" aria-label="' + esc(t("prev")) + '">' + IC.left + "</button>" +
        '<figure class="lb-fig"><img class="lb-img" alt=""><figcaption><b class="lb-name"></b><span class="lb-n"></span></figcaption></figure>' +
        '<button class="lb-nav lb-next" type="button" data-lb-step="1" aria-label="' + esc(t("nextImg")) + '">' + IC.right + "</button>";
    }
    var img = box.querySelector(".lb-img");
    img.classList.add("is-swap");
    var pre = new Image();
    pre.onload = pre.onerror = function () { img.src = im.full; img.alt = w.name + " " + (lb.ii + 1); img.classList.remove("is-swap"); };
    pre.src = im.full;
    box.querySelector(".lb-name").textContent = w.name;
    box.querySelector(".lb-n").textContent = lb.ii + 1 + " / " + w.images.length;
  }
  function stepLb(n) { var w = D.works[lb.wi]; lb.ii = (lb.ii + n + w.images.length) % w.images.length; paintLb(false); }
  function closeLb() {
    var box = ui.querySelector(".lightbox"), back = ui.querySelector('[data-lb="' + lb.wi + ":" + lb.ii + '"]');
    box.classList.remove("is-on");
    lb = null;
    setTimeout(function () { if (!box.classList.contains("is-on")) { box.hidden = true; box.innerHTML = ""; } }, 300);
    if (back) back.focus({ preventScroll: true });
  }

  /* ---------- Events ---------- */
  ui.addEventListener("click", function (e) {
    var pg = e.target.closest("[data-page]");
    if (pg) return openPage(pg.getAttribute("data-page"), pg);
    if (e.target.closest("[data-close]")) return closePage();
    if (e.target.classList.contains("veil")) return closePage();
    var f = e.target.closest("[data-filter]");
    if (f) return setFilter(f.getAttribute("data-filter"));
    var tile = e.target.closest("[data-lb]");
    if (tile) { var p = tile.getAttribute("data-lb").split(":"); return openLb(+p[0], +p[1]); }
    if (e.target.closest("[data-lb-close]") || e.target.classList.contains("lightbox")) return closeLb();
    var st = e.target.closest("[data-lb-step]");
    if (st) stepLb(+st.getAttribute("data-lb-step"));
    var l = e.target.closest("[data-lang]");
    /* Like the real site (/ and /ua/), a language is its own page load, so the island loads in that language too. */
    if (l && l.getAttribute("data-lang") !== H.lang) { location.href = l.getAttribute("data-lang") === "uk" ? "/ua/" : "/"; }
  });
  document.addEventListener("keydown", function (e) {
    if (lb) {
      if (e.key === "Escape") { e.preventDefault(); closeLb(); }
      if (e.key === "ArrowRight") stepLb(1);
      if (e.key === "ArrowLeft") stepLb(-1);
      return;
    }
    if (e.key === "Escape" && cur) { e.preventDefault(); closePage(); }
  });

  function mount(keepIntro) {
    cur = null; lb = null;
    H.setOpen(false);
    ui.className = "ui ui-command" + (keepIntro ? "" : " intro");
    ui.innerHTML = home();
    if (!keepIntro) setTimeout(function () { ui.classList.remove("intro"); }, 2400);
  }
  H.lang = /^uk/.test(document.documentElement.lang) ? "uk" : "en";
  mount(false);

})();
