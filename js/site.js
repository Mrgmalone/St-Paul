/* ==========================================================================
   St. Paul Apostolic Church of Jesus Christ — site script
   Reads ALL text from content/site.json and fills the pages.
   You should not need to edit this file to change content.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Icons (simple line icons, 24x24) ---------- */
  var ICONS = {
    cross: '<path d="M12 2v20M6.5 8h11"/>',
    crossSolid: '<path fill="currentColor" stroke="none" d="M10.6 1h2.8v6.1h6.1v2.8h-6.1V23h-2.8V9.9H4.5V7.1h6.1z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M12 7v6M9.5 9.2h5"/>',
    pray: '<path d="M12 21V9.5L9.6 4.2a1.3 1.3 0 0 0-2.4.9l1.3 6.4-3.7 4.9V21"/><path d="M12 21V9.5l2.4-5.3a1.3 1.3 0 0 1 2.4.9l-1.3 6.4 3.7 4.9V21"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-4.4-3.6-6.5-4.4-10.4-2.3 1.6-3.2 3.8-3 6-1.3-.8-2.1-2.2-2.3-3.7C7.4 9.3 5 11.6 5 15.4 5 19.3 8 22 12 22z"/><path d="M12 22c-1.7 0-3-1.2-3-3 0-2 1.6-2.8 2.2-4.6 1.5 1 3.8 2.4 3.8 4.6 0 1.8-1.3 3-3 3z"/>',
    worship: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    people: '<circle cx="9" cy="7.5" r="3.2"/><path d="M2.5 20.5c.6-3.9 3.2-6 6.5-6s5.9 2.1 6.5 6"/><circle cx="17" cy="8.5" r="2.6"/><path d="M16.5 14.3c2.7.1 4.5 1.9 5 5"/>',
    heartHand: '<path d="M12 11.5 8.6 8.2a2.3 2.3 0 0 1 3.3-3.2l.1.1.1-.1a2.3 2.3 0 0 1 3.3 3.2z"/><path d="M2 15h3l4.2 2.6c.8.5 1.8.4 2.5-.3L15 14"/><path d="M5 21l3-1.8h6.4c1 0 1.9-.4 2.5-1.1L22 12.5a1.6 1.6 0 0 0-2.3-2.2L16 13.5"/>',
    steps: '<path d="M7 3.5c1.6 0 2.5 1.6 2.5 3.6S8.6 11 7 11 4.5 9.5 4.5 7.3 5.4 3.5 7 3.5zM5 13.5h4"/><path d="M17 9.5c1.6 0 2.5 1.6 2.5 3.6S18.6 17 17 17s-2.5-1.5-2.5-3.7 1-3.8 2.5-3.8zM15 19.5h4"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1z"/><path d="M7 15v4.5M18.5 9a4 4 0 0 1 0 6"/>',
    home: '<path d="M3 11 12 3.5 21 11"/><path d="M5 9.5V21h14V9.5"/><path d="M12 9v6M9.5 11h5"/>',
    pillar: '<path d="M3 21h18M5 18h14M4 7h16L12 2.5z"/><path d="M6.5 7v11M10 7v11M14 7v11M17.5 7v11"/>',
    sunrise: '<path d="M3 18h18M5.5 18a6.5 6.5 0 0 1 13 0"/><path d="M12 3v4M4.2 8.2l2.2 2.2M19.8 8.2l-2.2 2.2M2 13.5h2.5M19.5 13.5H22"/><path d="M7 21.5h10"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.8 3 4 6 4 9.5s-1.2 6.5-4 9.5c-2.8-3-4-6-4-9.5s1.2-6.5 4-9.5z"/>',
    door: '<path d="M5 21V3.5h11V21M3 21h18"/><circle cx="13" cy="12.5" r=".9" fill="currentColor"/><path d="M16 5.5l3 1.2V21"/>',
    scroll: '<path d="M8 3h11a2 2 0 0 1 2 2v1h-4"/><path d="M17 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1h12"/><path d="M8 3a2 2 0 0 0-2 2v13M9.5 8h4.5M9.5 11.5h4.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 12 20 4M17 4h3v3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2.2"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>',
    phone: '<path d="M21 16.6v3a2 2 0 0 1-2.2 2A19.6 19.6 0 0 1 2.4 5.2 2 2 0 0 1 4.4 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.4 10.8a16 16 0 0 0 4.8 4.8l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 7 9-7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    menu: '<path d="M3 6.5h18M3 12h18M3 17.5h18"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2.5h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.8"/>',
    person: '<circle cx="12" cy="8" r="4.2"/><path d="M3.5 21.5c.8-4.6 4.2-7 8.5-7s7.7 2.4 8.5 7"/>',
    dove: '<path d="M21 6.5c-1.6-.2-3 .4-4 1.5-1-2.6-3.6-4.5-6.8-4.5 0 3 1.5 5.4 3.8 6.6L4 10.5 2 14c3.2 0 4.8.8 6 2.8 1.2 2 3 3.2 5.5 3.2 4 0 6.5-3.2 6.5-7v-2.5z"/><circle cx="17.6" cy="8.4" r=".6" fill="currentColor"/>',
    drop: '<path d="M12 2.5s7 7.3 7 12.2a7 7 0 0 1-14 0C5 9.8 12 2.5 12 2.5z"/><path d="M8.6 14.6a3.4 3.4 0 0 0 3.4 3.4"/>',
    facebook: '<path fill="currentColor" stroke="none" d="M14 8.5V6.8c0-.8.5-1.3 1.4-1.3H17V2.2h-2.6c-3 0-4.4 1.8-4.4 4.4v1.9H7.5v3.4H10V22h4V11.9h2.7l.4-3.4z"/>',
    youtube: '<path fill="currentColor" stroke="none" d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.8 12 4.8 12 4.8s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2C1.1 8.9 1.1 12 1.1 12s0 3.1.4 4.8a2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM9.8 15.1V8.9L15.5 12z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'
  };
  function svgIcon(name, cls) {
    var body = ICONS[name] || ICONS.cross;
    return '<span class="icon ' + (cls || "") + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg></span>";
  }

  /* Ornamental cross used in heroes, banners, dividers */
  var BIG_CROSS = '<svg viewBox="0 0 120 200" aria-hidden="true"><defs><linearGradient id="gx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5e6bd"/><stop offset=".5" stop-color="#d8b462"/><stop offset="1" stop-color="#a8822f"/></linearGradient></defs><path fill="url(#gx)" d="M52 0h16v52h40v16H68v132H52V68H12V52h40z"/><path fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" d="M55 4h10v51h40v10H65v131H55V65H15V55h40z"/></svg>';

  /* ---------- Helpers ---------- */
  var DATA = null;
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function get(path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, DATA);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* Escape text and softly highlight any [placeholder] so it is easy to spot */
  function t(s) { return esc(s).replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>'); }
  function isPh(s) { return !s || /^\s*\[.*\]\s*$/.test(s); }

  /* Image with designed placeholder fallback.
     If the file does not exist yet, a labelled slot is shown instead. */
  function media(src, alt, label, opts) {
    opts = opts || {};
    var slot = '<div class="slot' + (opts.dark ? " slot--dark" : "") + '">' + svgIcon(opts.icon || "camera") +
      '<span class="slot-label">' + esc(label || "[Image goes here]") + "</span>" +
      (src ? '<span class="slot-file">' + esc(src) + "</span>" : "") + "</div>";
    if (!src) return slot;
    return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="' + (opts.eager ? "eager" : "lazy") + '" decoding="async"' +
      (opts.w ? ' width="' + opts.w + '" height="' + opts.h + '"' : "") +
      ' data-slot="' + esc(slot) + '" onerror="this.onerror=null;this.outerHTML=this.dataset.slot">';
  }
  /* swap any image that fails to load for its slot */
  function wireSlots(root) {
    $all("img[data-slot]", root).forEach(function (img) {
      function swap() { var d = document.createElement("div"); d.innerHTML = img.getAttribute("data-slot"); img.replaceWith(d.firstChild); }
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) swap();
      img.addEventListener("error", swap, { once: true });
    });
  }

  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function parseDate(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dateBlock(ev, lg) {
    var d = parseDate(ev.date);
    return '<div class="date-block' + (lg ? " date-block--lg" : "") + '" aria-hidden="true"><span class="d">' + String(d.getDate()).padStart(2, "0") + '</span><span class="m">' + MONTHS[d.getMonth()] + "</span></div>";
  }
  function longDate(ev) {
    var d = parseDate(ev.date);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function sortedEvents() {
    return (get("events.items") || []).slice().sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });
  }
  function upcomingEvents() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var list = sortedEvents().filter(function (e) { return parseDate(e.date) >= today; });
    return list.length ? list : sortedEvents();
  }
  function addr() {
    var c = DATA.church;
    return { line1: c.street, line2: c.city + ", " + c.state + " " + c.zip };
  }
  function telHref(p) { return isPh(p) ? "#" : "tel:" + p.replace(/[^\d+]/g, ""); }
  function mailHref(e) { return isPh(e) ? "#" : "mailto:" + e; }
  function btn(b, extra) {
    return '<a class="btn btn--' + (b.style || "gold") + (extra ? " " + extra : "") + '" href="' + esc(b.href) + '">' + esc(b.label) + "</a>";
  }

  /* ---------- Header ---------- */
  function renderHeader() {
    var host = $("#site-header"); if (!host) return;
    var page = (location.pathname.split("/").pop() || "index.html");
    var c = DATA.church;
    var items = DATA.navigation.map(function (n) {
      var cur = n.href === page ? ' aria-current="page"' : "";
      return '<li><a href="' + esc(n.href) + '"' + cur + ">" + esc(n.label) + "</a></li>";
    }).join("");
    host.className = "site-header";
    host.innerHTML =
      '<div class="container header-inner">' +
        '<a class="brand" href="index.html" aria-label="' + esc(c.name) + ', home">' +
          '<img src="' + esc(DATA.images.logo) + '" alt="" width="62" height="62">' +
          '<span class="brand-text"><span class="brand-name"><span>' + esc(c.nameLine1) + "</span><span>" + esc(c.nameLine2) + '</span></span><span class="brand-loc">' + esc(c.location) + "</span></span>" +
        "</a>" +
        '<nav class="main-nav" id="main-nav" aria-label="Main"><ul>' + items +
          '<li class="mobile-cta">' + btn({ label: DATA.planVisit.label, href: DATA.planVisit.href, style: "gold" }, "btn--block") + "</li>" +
        "</ul></nav>" +
        '<div class="header-cta">' + btn({ label: DATA.planVisit.label, href: DATA.planVisit.href, style: "gold" }, "btn--sm") + "</div>" +
        '<button class="nav-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu">' + svgIcon("menu") + "</button>" +
      "</div>";
    var toggle = $(".nav-toggle", host), nav = $("#main-nav", host);
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.innerHTML = svgIcon(open ? "close" : "menu");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { toggle.click(); toggle.focus(); } });
    var onScroll = function () { host.classList.toggle("is-scrolled", window.scrollY > 10); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- Footer ---------- */
  function serviceDl(list) {
    return list.map(function (s) { return "<dt>" + t(s.label) + "</dt><dd>" + t(s.time) + "</dd>"; }).join("");
  }
  function renderFooter() {
    var host = $("#site-footer"); if (!host) return;
    var c = DATA.church, a = addr(), st = DATA.serviceTimes;
    var socials = DATA.social.map(function (s) {
      var href = s.url || "#";
      return '<li><a href="' + esc(href) + '" aria-label="' + esc(s.name) + (s.url ? "" : " (link to be added)") + '"' + (s.url ? ' target="_blank" rel="noopener"' : "") + ">" + svgIcon(s.icon) + "</a></li>";
    }).join("");
    var anyMissing = DATA.social.some(function (s) { return !s.url; });
    host.className = "site-footer on-dark";
    host.innerHTML =
      '<div class="container footer-main">' +
        '<div class="footer-brand">' +
          '<img class="seal" src="' + esc(DATA.images.logo) + '" alt="' + esc(DATA.images.logoAlt) + '" width="96" height="96" loading="lazy">' +
          '<div class="brand-name">' + esc(c.nameLine1) + "<br>" + esc(c.nameLine2) + '</div><div class="brand-loc">' + esc(c.location) + "</div>" +
          '<div class="inc-slot">' + media(DATA.images.incorporationLogo, "Incorporation logo", DATA.images.incorporationLogoLabel, { dark: true, icon: "pillar" }) + "</div>" +
        "</div>" +
        '<div><h2>Quick Links</h2><ul>' + DATA.navigation.map(function (n) { return '<li><a href="' + esc(n.href) + '">' + esc(n.label) + "</a></li>"; }).join("") +
          '<li><a href="' + esc(DATA.planVisit.href) + '">' + esc(DATA.planVisit.label) + "</a></li></ul></div>" +
        '<div><h2>Service Times</h2><dl>' + serviceDl(st.sunday.concat(st.weekday)) + "</dl></div>" +
        '<div><h2>Contact</h2><address style="font-style:normal"><ul>' +
          "<li>" + t(a.line1) + "<br>" + t(a.line2) + "</li>" +
          '<li><a href="' + telHref(c.phone) + '">' + t(c.phone) + "</a></li>" +
          '<li><a href="' + mailHref(c.email) + '">' + t(c.email) + "</a></li>" +
        "</ul></address></div>" +
        '<div><h2>Follow Us</h2><ul class="socials">' + socials + "</ul>" +
          (anyMissing ? '<p class="socials-note">[Social media links to be provided]</p>' : "") + "</div>" +
      "</div>" +
      '<div class="container footer-bottom">' +
        "<span>" + svgIcon("crossSolid", "footer-cross") + "© " + new Date().getFullYear() + " " + esc(c.copyright) + "</span>" +
        '<span class="footer-tag">' + esc(c.tagline) + "</span>" +
      "</div>";
  }

  /* ---------- Generic binding ---------- */
  function bindAll() {
    $all("[data-bind]").forEach(function (el) {
      var v = get(el.getAttribute("data-bind"));
      if (v != null) el.innerHTML = t(v);
    });
    $all("[data-icon]").forEach(function (el) { el.innerHTML = svgIcon(el.getAttribute("data-icon")); });
    $all("[data-cross]").forEach(function (el, i) { el.innerHTML = BIG_CROSS.replace(/gx/g, "gx" + i); });
    $all("[data-divider]").forEach(function (el) { el.classList.add("divider"); el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.8 2h2.4v6h5.8v2.4h-5.8V22h-2.4V10.4H5V8h5.8z"/></svg>'; });
    $all("[data-quote]").forEach(function (el) {
      var q = get(el.getAttribute("data-quote"));
      if (q) el.innerHTML = '<blockquote class="scripture"><p>“' + esc(q.text) + '”</p><cite>' + esc(q.ref) + "</cite></blockquote>";
    });
    $all("[data-hero]").forEach(function (el) {
      var h = get(el.getAttribute("data-hero"));
      if (!h || !h.image) return;
      el.innerHTML = '<img src="' + esc(h.image) + '" srcset="' + esc(h.imageSmall) + " 960w, " + esc(h.image) + ' 1920w" sizes="100vw" alt="" fetchpriority="high" decoding="async">';
    });
    $all("[data-media]").forEach(function (el) {
      var src = get(el.getAttribute("data-media")), label = el.getAttribute("data-label") || "[Image goes here]";
      el.innerHTML = media(src, el.getAttribute("data-alt") || "", isPh(label) ? label : get(label) || label);
    });
  }
  function heroWave() {
    var w = '<svg viewBox="0 0 2880 120" preserveAspectRatio="none" aria-hidden="true">' +
      '<g class="drift slow"><path class="w1" fill="currentColor" d="M0 60 Q 360 10 720 60 T 1440 60 T 2160 60 T 2880 60 V120 H0z"/></g>' +
      '<g class="drift"><path class="w2" fill="currentColor" d="M0 80 Q 360 40 720 80 T 1440 80 T 2160 80 T 2880 80 V120 H0z"/></g>' +
      '<path fill="currentColor" d="M0 100 Q 720 78 1440 100 T 2880 100 V120 H0z"/></svg>';
    $all(".hero-wave").forEach(function (el) {
      el.innerHTML = w;
      el.querySelectorAll("svg").forEach(function (s) { s.style.width = "200%"; });
    });
  }

  /* ---------- Shared renderers ---------- */
  function eventCard(ev) {
    return '<article class="event-card card-lift reveal"><div class="event-card-body">' + dateBlock(ev) +
      "<h3>" + t(ev.title) + '</h3><p class="event-meta">' + t(ev.time) + "</p>" +
      '<p class="event-meta">' + t(ev.description) + "</p>" +
      '<span class="event-loc">' + svgIcon("pin") + t(ev.location) + "</span>" +
      '<a class="btn btn--outline btn--sm" href="events.html#event-' + esc(ev.date) + '">' + esc(get("events.learnMoreLabel")) + '<span class="visually-hidden"> about ' + esc(ev.title) + ", " + esc(longDate(ev)) + "</span></a>" +
      "</div></article>";
  }

  /* ---------- HOME ---------- */
  function pageHome() {
    var h = get("home.hero");
    $("#hero-buttons").innerHTML = h.buttons.map(function (b) { return btn(b); }).join("");
    // optional background video
    var v = get("video.home");
    if (v && v.enabled && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var holder = $("#home-hero-media");
      holder.innerHTML = '<video autoplay muted loop playsinline preload="metadata" poster="' + esc(v.poster) + '">' +
        (v.webm ? '<source src="' + esc(v.webm) + '" type="video/webm">' : "") +
        '<source src="' + esc(v.mp4) + '" type="video/mp4"></video>';
    }
    $("#service-times .btn").href = get("home.services.buttonHref");
    var st = DATA.serviceTimes;
    $("#svc-sunday").innerHTML = serviceDl(st.sunday);
    $("#svc-weekday").innerHTML = serviceDl(st.weekday);
    $("#home-events").innerHTML = upcomingEvents().slice(0, 3).map(eventCard).join("");

    var L = DATA.leadership;
    $("#home-leaders").innerHTML = [L.pastor, L.overseer].map(function (p) {
      return '<div class="leader-mini"><div class="media">' + media(p.photo, p.role + " " + p.name, p.photoLabel, { icon: "person" }) + "</div>" +
        '<span class="leader-role">' + esc(p.role) + '</span><span class="leader-name">' + esc(p.name) + '</span><p class="leader-bio">' + t(p.bio) + "</p></div>";
    }).join("");
    $("#identity-grid").innerHTML = get("home.identity.items").map(function (i) { return "<li>" + svgIcon(i.icon) + esc(i.label) + "</li>"; }).join("");
  }

  /* ---------- ABOUT ---------- */
  function pageAbout() {
    $("#about-sections").innerHTML = get("about.sections").map(function (s, i) {
      return '<article class="about-item reveal"' + (i === 0 ? ' id="story"' : "") + '><div class="about-icon">' + svgIcon(s.icon) + "</div><div><h3>" + esc(s.title) + "</h3><p>" + t(s.text) + "</p></div></article>";
    }).join("");
    $("#timeline").innerHTML = get("about.timeline.items").map(function (i) {
      return '<li class="reveal"><span class="year">' + t(i.year) + '</span><span class="tl-text">' + t(i.text) + "</span></li>";
    }).join("");
    $("#history-photos").innerHTML = get("about.photos.items").map(function (p) {
      return '<figure class="photo-tile card-lift reveal"><div class="media">' + media(p.image, p.alt, "[" + p.label + " photo goes here]") + "</div><figcaption>" + esc(p.label) + "</figcaption></figure>";
    }).join("");
    var hx = get("about.hero");
    $("#exterior").innerHTML = '<div class="media" style="height:100%">' + media(hx.exteriorPhoto, "Exterior of St. Paul Apostolic Church of Jesus Christ", hx.exteriorLabel, { dark: true, icon: "home" }) + "</div>";
    var b = $("#history-button"); b.textContent = get("about.photos.button"); b.href = get("about.photos.buttonHref");
  }

  /* ---------- LEADERSHIP ---------- */
  function pageLeadership() {
    var L = DATA.leadership;
    $("#lead-pair").innerHTML = [L.pastor, L.overseer].map(function (p) {
      return '<article class="card lead-card reveal"><div class="media">' + media(p.photo, p.role + " " + p.name, p.photoLabel, { icon: "person" }) + "</div>" +
        '<div><span class="leader-role">' + esc(p.role) + '</span><h3 class="leader-name">' + esc(p.name) + '</h3><p class="leader-bio">' + t(p.bio) + "</p></div></article>";
    }).join("");
    var f = L.pastor.feature;
    if (f && f.image) {
      $("#feature-crest").innerHTML = '<div class="feature-crest reveal"><img src="' + esc(f.image) + '" alt="' + esc(f.alt) + '" width="900" height="900" loading="lazy" decoding="async">' +
        '<div><span class="eyebrow">' + esc(L.pastor.role) + "</span><h3>" + esc(L.pastor.name) + "</h3>" +
        '<p>' + t(f.caption) + '</p></div></div>';
    }
    $("#ministry-grid").innerHTML = L.categories.map(function (cat) {
      var people = L.people.filter(function (p) { return (p.categories || []).indexOf(cat.id) > -1; });
      var list = people.length
        ? '<ul class="people-list">' + people.map(function (p) {
            return '<li class="person"><span class="avatar">' + media(p.photo, p.name, "", { icon: "person" }) + '</span><span><span class="person-name">' + t(p.name) + '</span><br><span class="person-role">' + t(p.role) + "</span></span></li>";
          }).join("") + "</ul>"
        : '<p class="ministry-empty">' + t(L.emptyText) + "</p>";
      return '<article class="ministry-card card-lift reveal"><div class="media">' + media("assets/img/ministries/" + cat.id + ".webp", cat.name, "[" + cat.name + " photo goes here]", { icon: cat.icon }) + "</div>" +
        '<div class="ministry-body"><h3>' + esc(cat.name) + "</h3>" + list + "</div></article>";
    }).join("");
  }

  /* ---------- EVENTS ---------- */
  function eventRow(ev) {
    return '<article class="event-row reveal" id="event-' + esc(ev.date) + '">' + dateBlock(ev) +
      "<div><h3>" + t(ev.title) + '</h3><p class="event-meta"><strong>' + esc(longDate(ev)) + "</strong> · " + t(ev.time) + "</p>" +
      '<p class="event-meta">Speaker: ' + t(ev.speaker) + "</p>" +
      '<p class="event-meta">' + t(ev.description) + "</p>" +
      '<span class="event-loc">' + svgIcon("pin") + t(ev.location) + "</span></div>" +
      '<div class="media">' + media(ev.image, ev.title, "[Event image goes here]", { icon: "calendar" }) + "</div></article>";
  }
  function pageEvents() {
    var E = get("events"), all = sortedEvents();
    var fe = all.filter(function (e) { return e.featured; })[0] || upcomingEvents()[0];
    if (fe) {
      $("#featured").innerHTML = dateBlock(fe, true) +
        "<div><h3>" + t(fe.title) + '</h3><p class="event-meta"><strong>' + esc(longDate(fe)) + "</strong> · " + t(fe.time) + "</p><p>" + t(fe.description) + "</p>" +
        "<dl><dt>Speaker:</dt><dd>" + t(fe.speaker) + "</dd><dt>Location:</dt><dd>" + t(fe.location) + "</dd></dl>" +
        '<a class="btn btn--gold" href="' + esc(fe.registerUrl || "contact.html") + '">' + esc(E.registerLabel) + "</a></div>" +
        '<div class="media">' + media(fe.image, fe.title, "[Event image goes here]", { icon: "calendar" }) + "</div>";
    }
    var up = upcomingEvents();
    $("#panel-upcoming").innerHTML = up.length ? '<div class="event-rows">' + up.map(eventRow).join("") + "</div>" : '<p class="cal-empty">' + t(E.emptyText) + "</p>";
    $("#panel-list").innerHTML = '<table class="event-table"><caption class="visually-hidden">All events</caption><thead><tr><th scope="col">Date</th><th scope="col">Event</th><th scope="col">Time</th><th scope="col">Speaker</th><th scope="col">Location</th></tr></thead><tbody>' +
      all.map(function (e) { return "<tr><td>" + esc(longDate(e)) + "</td><td>" + t(e.title) + "</td><td>" + t(e.time) + "</td><td>" + t(e.speaker) + "</td><td>" + t(e.location) + "</td></tr>"; }).join("") + "</tbody></table>";
    // month calendar starts on the month of the next upcoming event
    var start = up[0] ? parseDate(up[0].date) : new Date();
    var view = { y: start.getFullYear(), m: start.getMonth() };
    function drawMonth() {
      var first = new Date(view.y, view.m, 1), startDow = first.getDay();
      var days = new Date(view.y, view.m + 1, 0).getDate();
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var cells = "";
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (d) { cells += '<div class="cal-dow" role="columnheader">' + d + "</div>"; });
      var total = Math.ceil((startDow + days) / 7) * 7;
      for (var i = 0; i < total; i++) {
        var date = new Date(view.y, view.m, i - startDow + 1);
        var out = date.getMonth() !== view.m;
        var iso = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
        var evs = out ? [] : all.filter(function (e) { return e.date === iso; });
        cells += '<div class="cal-day' + (out ? " is-out" : "") + (+date === +today ? " is-today" : "") + '" role="gridcell"><span class="cal-num">' + date.getDate() + "</span>" +
          evs.map(function (e) { return '<button type="button" class="cal-event" data-date="' + iso + '" aria-label="' + esc(e.title + ", " + longDate(e)) + '">' + esc(e.title) + "</button>"; }).join("") + "</div>";
      }
      var inMonth = all.filter(function (e) { var d = parseDate(e.date); return d.getFullYear() === view.y && d.getMonth() === view.m; });
      $("#panel-month").innerHTML = '<div class="calendar"><div class="cal-head"><button class="cal-nav" type="button" data-step="-1" aria-label="Previous month">' + svgIcon("arrowLeft") + '</button><h3 aria-live="polite">' + MONTHS_LONG[view.m] + " " + view.y + '</h3><button class="cal-nav" type="button" data-step="1" aria-label="Next month">' + svgIcon("arrow") + "</button></div>" +
        '<div class="cal-grid" role="grid">' + cells + "</div>" +
        (inMonth.length ? "" : '<p class="cal-empty">No events listed this month.</p>') +
        '<div class="cal-detail" aria-live="polite"></div></div>';
      $all(".cal-nav", $("#panel-month")).forEach(function (b) {
        b.addEventListener("click", function () { view.m += +b.dataset.step; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } drawMonth(); $(".cal-nav[data-step='" + b.dataset.step + "']").focus(); });
      });
      $all(".cal-event", $("#panel-month")).forEach(function (b) {
        b.addEventListener("click", function () {
          var e = all.filter(function (x) { return x.date === b.dataset.date; })[0];
          $(".cal-detail", $("#panel-month")).innerHTML = "<h3>" + t(e.title) + '</h3><p class="event-meta"><strong>' + esc(longDate(e)) + "</strong> · " + t(e.time) + " · " + t(e.location) + '</p><p class="event-meta">Speaker: ' + t(e.speaker) + "</p><p>" + t(e.description) + "</p>";
        });
      });
    }
    drawMonth();
    // accessible tabs
    var tabs = $all('[role="tab"]');
    function select(tab, focus) {
      tabs.forEach(function (x) { var on = x === tab; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; $("#" + x.getAttribute("aria-controls")).hidden = !on; });
      if (focus) tab.focus();
      revealNow();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (n) { e.preventDefault(); select(tabs[(i + n + tabs.length) % tabs.length], true); }
      });
    });
    if (location.hash.indexOf("#event-") === 0) { var target = $(location.hash); if (target) setTimeout(function () { target.scrollIntoView(); }, 50); }
  }

  /* ---------- CONTACT ---------- */
  function pageContact() {
    var c = DATA.church, a = addr(), L = get("contact.labels");
    $("#contact-list").innerHTML =
      '<li><span class="ci">' + svgIcon("pin") + "</span><span><strong>" + esc(L.address) + "</strong><span>" + esc(c.name) + "<br>" + t(a.line1) + "<br>" + t(a.line2) + "</span></span></li>" +
      '<li><span class="ci">' + svgIcon("phone") + "</span><span><strong>" + esc(L.phone) + '</strong><a href="' + telHref(c.phone) + '">' + t(c.phone) + "</a></span></li>" +
      '<li><span class="ci">' + svgIcon("mail") + "</span><span><strong>" + esc(L.email) + '</strong><a href="' + mailHref(c.email) + '">' + t(c.email) + "</a></span></li>" +
      '<li><span class="ci">' + svgIcon("clock") + "</span><span><strong>" + esc(L.hours) + "</strong><span>" + t(c.officeHours) + "</span></span></li>";
    var q = encodeURIComponent(c.mapQuery);
    $("#map-frame").innerHTML = media("", "", "[Interactive map: " + c.mapQuery + "]", { icon: "pin" }) + '<iframe title="Map showing ' + esc(c.name) + ", " + esc(c.mapQuery) + '" src="https://www.google.com/maps?q=' + q + '&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
    var dir = $("#directions"); dir.href = "https://www.google.com/maps/dir/?api=1&destination=" + q; dir.querySelector("span").textContent = get("contact.directionsLabel");
    var dlg = $("#praise-dialog");
    $("#open-praise").addEventListener("click", function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); });
    $all("[data-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Forms ---------- */
  function wireForms() {
    $all("form[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var cfg = DATA.forms, kind = form.getAttribute("data-form");
        var status = $(".form-status", form);
        status.className = "form-status"; status.textContent = "";
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (form.querySelector(".hp input").value) return; // spam honeypot
        var button = form.querySelector('[type="submit"]'); button.disabled = true;
        var fd = new FormData(form);
        var ok = function (preview) {
          status.className = "form-status is-success";
          status.innerHTML = esc(kind === "praise" ? cfg.praiseSuccess : cfg.prayerSuccess) + (preview ? "<small>" + esc(cfg.previewNote) + "</small>" : "");
          form.reset(); button.disabled = false; status.focus();
        };
        var fail = function () { status.className = "form-status is-error"; status.textContent = cfg.errorMessage; button.disabled = false; status.focus(); };
        var p = cfg.provider;
        if (p === "netlify") {
          fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fd).toString() })
            .then(function (r) { r.ok ? ok() : fail(); }).catch(fail);
        } else if ((p === "formspree" || p === "php") && cfg.endpoint) {
          fetch(cfg.endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } })
            .then(function (r) { r.ok ? ok() : fail(); }).catch(fail);
        } else {
          setTimeout(function () { ok(true); }, 500); // preview mode — nothing is sent
        }
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var io = null;
  function revealNow() {
    var els = $all(".reveal:not(.is-visible)");
    if (!io || matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach(function (e) { e.classList.add("is-visible"); }); return; }
    els.forEach(function (e) { io.observe(e); });
  }
  function setupReveal() {
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    revealNow();
  }

  /* ---------- Boot ---------- */
  function showLoadError() {
    var m = document.getElementById("main") || document.body;
    m.insertAdjacentHTML("afterbegin", '<div class="load-error" role="alert"><strong>The page content could not be loaded.</strong><p>This website reads its text from <code>content/site.json</code>. Browsers block that when a page is opened directly from your computer. Preview it with a small local server instead — see <strong>README.md → “Preview on your computer”</strong>. Once the site is uploaded to a web host, this message will not appear.</p></div>');
  }
  fetch("content/site.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (json) {
      DATA = json;
      renderHeader();
      bindAll();
      heroWave();
      var page = document.body.getAttribute("data-page");
      ({ home: pageHome, about: pageAbout, leadership: pageLeadership, events: pageEvents, contact: pageContact }[page] || function () {})();
      renderFooter();
      wireSlots(document);
      wireForms();
      setupReveal();
      document.documentElement.classList.add("is-ready");
    })
    .catch(function (err) { console.error(err); showLoadError(); });
})();
